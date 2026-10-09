// Tests de borde del cliente real: RPC y firmantes mockeados, sin red.
// Cubren validación de entorno, guardia devnet, mapeos onchain→tipos,
// matemática del cotizador y el pipeline propuesta→simulación→envío.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  address,
  generateKeyPairSigner,
  getBase64Decoder,
  getBase64Encoder,
  type Address,
  type ReadonlyUint8Array,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import {
  CUOTAS_PROGRAM_ADDRESS,
  getGuaranteeEncoder,
  getInstallmentPaidEventEncoder,
  getMerchantEncoder,
  getPlanDecoder,
  getPlanEncoder,
  getPlanOpenedEventEncoder,
  getPoolEncoder,
  getProtocolConfigEncoder,
  getReputationEncoder,
  getStudentInitReputationInstruction,
  ProtocolState as GeneratedProtocolState,
} from "../../generated";
import { createAccountCuotas } from "./accounts";
import type { AccountBaseHooks } from "./accounts-types";
import { toMicro } from "./format";
import {
  __resetGenesisCacheForTests,
  bindRealTransport,
  computeRealQuote,
  configureRealTransport,
  createRealCuotas,
  DEVNET_GENESIS_HASH,
  explorerTxUrl,
  loadRealEnv,
  mapPlan,
  parseCuotasEventsFromLogs,
  programDaysLate,
  proposeAndSend,
  proposeTransaction,
  proposalToJson,
  type RealRpc,
  type RealTransport,
} from "./real";
import { CuotasError, type CuotasClient, type ProtocolConfig, type TxProgress } from "./types";

const PROGRAM = CUOTAS_PROGRAM_ADDRESS;
const MINT = "8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y";
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";

const ENV = {
  NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.devnet.solana.com",
  NEXT_PUBLIC_CUOTAS_PROGRAM_ID: PROGRAM,
  NEXT_PUBLIC_CUOTAS_USDC_MINT: MINT,
};

let student: Address;
let merchantOwner: Address;
let admin: Address;

beforeEach(async () => {
  __resetGenesisCacheForTests();
  configureRealTransport(null);
  student = (await generateKeyPairSigner()).address;
  merchantOwner = (await generateKeyPairSigner()).address;
  admin = (await generateKeyPairSigner()).address;
});

/** RPC mockeado: cada método devuelve lo programado, sin red. */
function mockRpc(parts: Record<string, unknown>): RealRpc {
  const call =
    (name: string) =>
    (..._args: unknown[]) => ({
      send: async () => {
        const v = parts[name];
        if (v instanceof Error) throw v;
        if (typeof v === "function") return (v as (...a: unknown[]) => unknown)(..._args);
        return v;
      },
    });
  return new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (!(prop in parts)) throw new Error(`RPC mock sin programar: ${prop}`);
        return call(prop);
      },
    },
  ) as unknown as RealRpc;
}

const devnetRpc = (parts: Record<string, unknown> = {}) =>
  mockRpc({ getGenesisHash: DEVNET_GENESIS_HASH, ...parts });

const b64 = (bytes: ReadonlyUint8Array) => getBase64Decoder().decode(bytes);

function accountInfo(dataB64: string, owner: string = PROGRAM) {
  return { value: { data: [dataB64, "base64"], executable: false, lamports: 1, owner } };
}

const tier = (downPaymentBps: number, maxPurchase: number, coverage = 0) => ({
  downPaymentBps,
  maxPurchase: BigInt(maxPurchase),
  interestBps: 0,
  guarantorCoverageBps: coverage,
});

function configData(over: Record<string, unknown> = {}) {
  return b64(
    getProtocolConfigEncoder().encode({
      admin,
      keeper: admin,
      usdcMint: address(MINT),
      treasury: admin,
      feeBps: 700,
      penaltyBps: 500,
      graceDays: 5,
      guarantorChargeDay: 15,
      guarantorNoticeDay: 3,
      secondsPerDay: 86_400,
      installmentIntervalDays: 30,
      minFinancedToCount: BigInt(toMicro(100)),
      guaranteedTiers: [
        tier(3000, toMicro(1000), 10_000),
        tier(2000, toMicro(1000), 10_000),
        tier(1000, toMicro(1250), 10_000),
        tier(0, toMicro(1500), 10_000),
      ],
      planOptions: [
        { installments: 3, interestTotalBps: 0, minPrice: BigInt(0), enabled: true },
        { installments: 6, interestTotalBps: 300, minPrice: BigInt(toMicro(350)), enabled: true },
      ],
      settlementOptions: [
        { days: 0, tranches: 0, feeBps: 700, enabled: true },
        { days: 30, tranches: 1, feeBps: 625, enabled: true },
        { days: 60, tranches: 2, feeBps: 575, enabled: true },
        { days: 90, tranches: 3, feeBps: 525, enabled: true },
      ],
      state: GeneratedProtocolState.Normal,
      bump: 1,
      ...over,
    }),
  );
}

function mockSigner(addr: Address, fail?: Error): TransactionSigner {
  return {
    address: addr,
    signTransactions: async (txs: readonly unknown[]) => {
      if (fail) throw fail;
      return txs.map(() => ({ [addr]: new Uint8Array(64) }));
    },
  } as unknown as TransactionSigner;
}

function transportFor(rpc: RealRpc, signer: TransactionSigner): RealTransport {
  return { rpc, getSigner: async () => ({ signer, supportedVersions: new Set([0, 1]) }) };
}

describe("loadRealEnv", () => {
  it("usa el RPC público de devnet por defecto", () => {
    const env = loadRealEnv({ ...ENV, NEXT_PUBLIC_SOLANA_RPC_URL: undefined });
    expect(env.rpcUrl).toBe("https://api.devnet.solana.com");
  });

  it("rechaza URLs mainnet sin tocar la red", () => {
    expect(() =>
      loadRealEnv({ ...ENV, NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com" }),
    ).toThrowError(CuotasError);
    try {
      loadRealEnv({ ...ENV, NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.mainnet-beta.solana.com" });
    } catch (e) {
      expect((e as CuotasError).code).toBe("wrong_cluster");
    }
  });

  it("falla cerrado sin programa o mint", () => {
    expect(() => loadRealEnv({})).toThrowError(CuotasError);
  });
});

describe("guardia devnet", () => {
  it("rechaza un RPC cuyo génesis no es devnet", async () => {
    const c = createRealCuotas({ env: ENV, transport: { rpc: mockRpc({ getGenesisHash: MAINNET_GENESIS }), getSigner: async () => { throw new Error("no debe pedir firma"); } } });
    await expect(c.getConfig()).rejects.toMatchObject({ code: "wrong_cluster" });
  });
});

describe("lecturas con RPC mockeado", () => {
  it("getConfig mapea ProtocolConfig onchain incl. admin/keeper", async () => {
    const rpc = devnetRpc({ getAccountInfo: () => accountInfo(configData()) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const config = await c.getConfig();
    expect(config.feeBps).toBe(700);
    expect(config.guarantorNoticeDay).toBe(3);
    expect(config.guaranteedTiers).toHaveLength(4);
    expect(config.guaranteedTiers[0].maxPurchase).toBe(toMicro(1000));
    expect(config.planOptions?.map(({ installments, interestTotalBps, minPrice }) => [installments, interestTotalBps, minPrice])).toEqual([
      [3, 0, 0], [6, 300, toMicro(350)],
    ]);
    expect(config.settlementOptions?.map(({ days, tranches, feeBps }) => [days, tranches, feeBps])).toEqual([
      [0, 0, 700], [30, 1, 625], [60, 2, 575], [90, 3, 525],
    ]);
    expect(config.admin).toBe(String(admin));
    expect(config.keeper).toBe(String(admin));
    expect(config.cluster).toBe("devnet");
  });

  it("getConfig sin inicializar → not_found honesto", async () => {
    const rpc = devnetRpc({ getAccountInfo: () => ({ value: null }) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getConfig()).rejects.toMatchObject({ code: "not_found" });
  });

  it("getReputation mapea tier y contadores", async () => {
    const data = b64(
      getReputationEncoder().encode({
        tier: 2,
        plansCompleted: 2,
        lateCount: 0,
        activeExposure: BigInt(toMicro(500)),
        plansOpened: BigInt(2),
        bump: 1,
      }),
    );
    const byAddress = new Map<string, string>();
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        byAddress.has(String(addr)) ? accountInfo(byAddress.get(String(addr))!) : { value: null },
    });
    // La config vive en su PDA y la reputación en la suya: el mock resuelve
    // por dirección llamando al mismo handler.
    const { findConfigPda, findReputationPda } = await import("../../generated");
    const [configPda] = await findConfigPda({ programAddress: address(PROGRAM) });
    const [repPda] = await findReputationPda(
      { student },
      { programAddress: address(PROGRAM) },
    );
    byAddress.set(String(configPda), configData());
    byAddress.set(String(repPda), data);
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const rep = await c.getReputation(String(student));
    expect(rep.tier).toBe(2);
    expect(rep.plansCompleted).toBe(2);
    expect(rep.activeExposure).toBe(toMicro(500));
    expect(rep.blockedFromNewPlans).toBe(false);
  });

  it("getGuarantee ausente → null (no inventa fiador)", async () => {
    const rpc = devnetRpc({ getAccountInfo: () => ({ value: null }) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getGuarantee(String(student))).resolves.toBeNull();
  });

  it("getGuarantee mapea hash en hex", async () => {
    const data = b64(
      getGuaranteeEncoder().encode({
        maxPurchase: BigInt(toMicro(1000)),
        coverageMax: BigInt(toMicro(800)),
        mandateHash: new Uint8Array(32).fill(0xab),
        active: true,
        registeredAt: BigInt(1_700_000_000),
        bump: 1,
      }),
    );
    const rpc = devnetRpc({ getAccountInfo: () => accountInfo(data) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const g = await c.getGuarantee(String(student));
    expect(g?.mandateHash).toBe("ab".repeat(32));
    expect(g?.maxPurchase).toBe(toMicro(1000));
    expect(g?.display).toBeUndefined();
  });

  it("getPool combina cuenta + balance real del vault + historial vacío", async () => {
    const poolB64 = b64(
      getPoolEncoder().encode({
        juniorShares: BigInt(1000),
        seniorShares: BigInt(4000),
        juniorCapital: BigInt(toMicro(1000)),
        seniorCapital: BigInt(toMicro(4000)),
        outstandingCredit: BigInt(toMicro(700)),
        accruedFees: BigInt(toMicro(49)),
        committedPayouts: BigInt(0),
        bump: 1,
      }),
    );
    const { findPoolPda, findVaultPda } = await import("../../generated");
    const [poolPda] = await findPoolPda(
      { usdcMint: address(MINT) },
      { programAddress: address(PROGRAM) },
    );
    const [vault] = await findVaultPda({ pool: poolPda }, { programAddress: address(PROGRAM) });
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(poolPda)
          ? accountInfo(poolB64)
          : String(addr) === String(vault)
            ? accountInfo("eA==") // existe, contenido irrelevante (el balance sale de getTokenAccountBalance)
            : { value: null },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(4500)), decimals: 6 } }),
      getSignaturesForAddress: () => [],
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const pool = await c.getPool();
    expect(pool.juniorCapital).toBe(toMicro(1000));
    expect(pool.available).toBe(toMicro(4500));
    // NAV = capital reconocido (1000+4000): los 200 donados al vault no son NAV.
    expect(pool.nav).toBe(toMicro(5000));
    expect(pool.events).toEqual([]);
  });

  it("getMerchant trae balance real del settlement ATA", async () => {
    const ata = (await (await import("@solana-program/token")).findAssociatedTokenPda({
      mint: address(MINT),
      owner: merchantOwner,
      tokenProgram: (await import("@solana-program/token")).TOKEN_PROGRAM_ADDRESS,
    }))[0];
    const data = b64(
      getMerchantEncoder().encode({
        owner: merchantOwner,
        settlementAta: ata,
        active: true,
        plansCount: BigInt(3),
        bump: 1,
      }),
    );
    const { findMerchantPda } = await import("../../generated");
    const [pda] = await findMerchantPda(
      { merchantWallet: merchantOwner },
      { programAddress: address(PROGRAM) },
    );
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(pda)
          ? accountInfo(data)
          : String(addr) === String(ata)
            ? accountInfo("eA==")
            : { value: null },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(951)), decimals: 6 } }),
      getSignaturesForAddress: () => [],
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const m = await c.getMerchant(String(merchantOwner));
    expect(m.settlementBalance).toBe(toMicro(951));
    expect(m.plansCount).toBe(3);
    expect(m.name).toContain(String(merchantOwner).slice(0, 4));
  });

  it("getPlans sin plan → lista vacía (el programa cierra al saldar)", async () => {
    const rpc = devnetRpc({ getAccountInfo: () => ({ value: null }) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getPlans(String(student))).resolves.toEqual([]);
  });

  it("getPlans mapea el plan activo con estados por reloj", async () => {
    const { findConfigPda, findPlanPda } = await import("../../generated");
    const [configPda] = await findConfigPda({ programAddress: address(PROGRAM) });
    const [planPda] = await findPlanPda({ student }, { programAddress: address(PROGRAM) });
    const now = 1_700_000_000;
    const data = planData({ openedAt: BigInt(now) });
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(configPda)
          ? accountInfo(configData())
          : String(addr) === String(planPda)
            ? accountInfo(data)
            : { value: null },
      getSlot: () => 1000,
      getBlockTime: () => now,
      getSignaturesForAddress: () => [],
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const plans = await c.getPlans(String(student));
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe(String(planPda));
    expect(plans[0].price).toBe(toMicro(1000));
    expect(plans[0].downPayment).toBe(toMicro(300));
    expect(plans[0].status).toBe("Active");
    expect(plans[0].installments.map((i) => i.status)).toEqual(["Upcoming", "Upcoming", "Upcoming"]);
  });

  it("plan cerrado (System, 0 bytes) → lista vacía", async () => {
    const rpc = devnetRpc({
      getAccountInfo: () => ({
        value: { data: ["", "base64"], executable: false, lamports: 1, owner: "11111111111111111111111111111111" },
      }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getPlans(String(student))).resolves.toEqual([]);
  });

  it("reputación con mora bloquea planes nuevos (regla de open_plan)", async () => {
    const data = b64(
      getReputationEncoder().encode({
        tier: 0,
        plansCompleted: 0,
        lateCount: 1,
        activeExposure: BigInt(0),
        plansOpened: BigInt(1),
        bump: 1,
      }),
    );
    const rpc = devnetRpc({ getAccountInfo: () => accountInfo(data) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const rep = await c.getReputation(String(student));
    expect(rep.blockedFromNewPlans).toBe(true);
  });
});

const OPENED_AT = 1_700_000_000;

function installmentFixture(over: Record<string, unknown> = {}) {
  return {
    amount: BigInt(233_333_333),
    dueAt: BigInt(OPENED_AT + 30 * 86_400),
    penalty: BigInt(0),
    paid: false,
    charged: false,
    markedLate: false,
    receiptHash: new Uint8Array(32),
    ...over,
  };
}

function planData(over: Record<string, unknown> = {}) {
  const { installments: providedInstallments, installmentCount, ...rest } = over;
  const activeInstallments = (providedInstallments as ReturnType<typeof installmentFixture>[] | undefined) ?? [
    installmentFixture(),
    installmentFixture({ dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
    installmentFixture({ amount: BigInt(233_333_334), dueAt: BigInt(OPENED_AT + 90 * 86_400) }),
  ];
  const emptyInstallment = installmentFixture({ amount: BigInt(0), dueAt: BigInt(0), paid: true });
  return b64(
    getPlanEncoder().encode({
      student,
      merchant: merchantOwner,
      price: BigInt(toMicro(1000)),
      downPayment: BigInt(toMicro(300)),
      financed: BigInt(toMicro(700)),
      interest: BigInt(0),
      merchantFee: BigInt(toMicro(49)),
      openedAt: BigInt(OPENED_AT),
      tier: 0,
      withGuarantee: true,
      counts: true,
      installmentCount: (installmentCount as number | undefined) ?? activeInstallments.length,
      installments: [...activeInstallments, ...Array.from({ length: 6 - activeInstallments.length }, () => emptyInstallment)],
      generation: BigInt(1),
      bump: 1,
      ...rest,
    }),
  );
}

function decodedPlan(dataB64: string) {
  return getPlanDecoder().decode(getBase64Encoder().encode(dataB64));
}

function quoteConfig(): ProtocolConfig {
  return {
    feeBps: 700,
    penaltyBps: 500,
    graceDays: 5,
    guarantorNoticeDay: 3,
    guarantorChargeDay: 15,
    secondsPerDay: 86_400,
    installmentsCount: 3,
    installmentIntervalDays: 30,
    guaranteedTiers: [
      { downPaymentBps: 3000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1000), interestBps: 0 },
      { downPaymentBps: 2000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1000), interestBps: 0 },
      { downPaymentBps: 1000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1250), interestBps: 0 },
      { downPaymentBps: 0, guarantorCoverageBps: 10000, maxPurchase: toMicro(1500), interestBps: 0 },
    ],
    planOptions: [
      { installments: 3, interestTotalBps: 0, minPrice: 0, enabled: true, provisional: false },
      { installments: 6, interestTotalBps: 300, minPrice: toMicro(350), enabled: true, provisional: false },
    ],
    settlementOptions: [
      { id: "immediate", days: 0, tranches: 0, feeBps: 700, enabled: true, provisional: false },
      { id: "deferred_30", days: 30, tranches: 1, feeBps: 625, enabled: true, provisional: false },
      { id: "deferred_60", days: 60, tranches: 2, feeBps: 575, enabled: true, provisional: false },
      { id: "deferred_90", days: 90, tranches: 3, feeBps: 525, enabled: true, provisional: false },
    ],
    minFinancedToCount: toMicro(100),
    state: "Normal",
    usdcMint: MINT,
    cluster: "devnet",
  };
}

describe("mapPlan y días de atraso", () => {
  it("espeja days_late del programa (negativo crudo, piso si positivo)", () => {
    const due = 1_700_000_000;
    expect(programDaysLate(due - 1, due, 86_400)).toBeLessThan(0);
    expect(programDaysLate(due, due, 86_400)).toBe(0);
    expect(programDaysLate(due + 5 * 86_400, due, 86_400)).toBe(5);
    expect(programDaysLate(due + 6 * 86_400 - 1, due, 86_400)).toBe(5);
    expect(programDaysLate(due + 6 * 86_400, due, 86_400)).toBe(6);
  });

  it("cuota vencida en gracia → plan Active; pasada la gracia → Late", () => {
    const config = quoteConfig();
    const data = decodedPlan(planData());
    const due0 = OPENED_AT + 30 * 86_400;
    const grace = mapPlan(address(PROGRAM), data, config, due0 + 3 * 86_400, "");
    expect(grace.installments[0].status).toBe("Grace");
    expect(grace.status).toBe("Active");
    const late = mapPlan(address(PROGRAM), data, config, due0 + 6 * 86_400, "");
    expect(late.installments[0].status).toBe("Late");
    expect(late.status).toBe("Late");
  });

  it("mapea los términos del programa (3 cuotas, cobro inmediato) desde los montos grabados", () => {
    const config = quoteConfig();
    const plan = mapPlan(
      address(PROGRAM),
      decodedPlan(planData()),
      config,
      OPENED_AT,
      "firma-apertura",
    );
    expect(plan.terms).toEqual({
      termsVersion: 1,
      installmentsCount: 3,
      interestTotalBps: 0,
      downPaymentBps: 3000,
      coverageBps: 10_000, // escalón 0 con fiador del fixture
      settlementId: "immediate",
      settlementDays: 0,
      settlementFeeBps: 700, // derivado de merchant_fee 49 sobre financiado 700
      provisional: false,
    });
  });

  it("paid/charged son terminales sin importar el reloj", () => {
    const config = quoteConfig();
    const data = decodedPlan(
      planData({
        installments: [
          installmentFixture({ paid: true }),
          installmentFixture({ charged: true, dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
          installmentFixture({ amount: BigInt(233_333_334), dueAt: BigInt(OPENED_AT + 90 * 86_400) }),
        ],
      }),
    );
    const plan = mapPlan(address(PROGRAM), data, config, OPENED_AT + 365 * 86_400, "");
    expect(plan.installments[0].status).toBe("Paid");
    expect(plan.installments[1].status).toBe("ChargedToGuarantor");
    expect(plan.installments[2].status).toBe("Late");
  });

  it("mapea 6 cuotas y el plazo diferido desde los términos on-chain del plan", () => {
    const six = Array.from({ length: 6 }, (_, index) => installmentFixture({
      amount: BigInt(116_666_666),
      dueAt: BigInt(OPENED_AT + (index + 1) * 30 * 86_400),
    }));
    six[5] = installmentFixture({ amount: BigInt(116_666_670), dueAt: BigInt(OPENED_AT + 180 * 86_400) });
    const data = decodedPlan(planData({
      price: BigInt(toMicro(1000)),
      downPayment: BigInt(toMicro(300)),
      financed: BigInt(toMicro(700)),
      interest: BigInt(toMicro(21)),
      merchantFee: BigInt(36_750_000),
      installmentCount: 6,
      installments: six,
    }));
    const plan = mapPlan(address(PROGRAM), data, quoteConfig(), OPENED_AT, "firma-6x90");
    expect(plan.installments).toHaveLength(6);
    expect(plan.terms.installmentsCount).toBe(6);
    expect(plan.terms.interestTotalBps).toBe(300);
    expect(plan.terms.settlementId).toBe("deferred_90");
    expect(plan.terms.settlementDays).toBe(90);
    expect(plan.terms.settlementFeeBps).toBe(525);
  });
});

describe("parseCuotasEventsFromLogs", () => {
  it("extrae PlanOpened con montos exactos e ignora ruido", async () => {
    const { findPlanPda } = await import("../../generated");
    const [planPda] = await findPlanPda({ student }, { programAddress: address(PROGRAM) });
    const bytes = getPlanOpenedEventEncoder().encode({
      plan: planPda,
      student,
      merchant: merchantOwner,
      price: BigInt(toMicro(1000)),
      downPayment: BigInt(toMicro(300)),
      financed: BigInt(toMicro(700)),
      interest: BigInt(0),
      merchantFee: BigInt(toMicro(49)),
      installments: [BigInt(233_333_333), BigInt(233_333_333), BigInt(233_333_334)],
      tier: 0,
      withGuarantee: true,
      counts: true,
    });
    const logs = [
      "Program E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ invoke [1]",
      "Program log: Instruction: OpenPlan",
      `Program data: ${b64(bytes)}`,
      "Program data: !!!no-es-base64!!!",
      "Program log: otra línea",
      "Program E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ success",
    ];
    const parsed = parseCuotasEventsFromLogs(logs, PROGRAM);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("PlanOpened");
    if (parsed[0].name === "PlanOpened") {
      expect(parsed[0].event.price).toBe(BigInt(toMicro(1000)));
      expect(String(parsed[0].event.merchant)).toBe(String(merchantOwner));
    }
  });

  it("ignora datos emitidos por otros programas (atribución por pila)", async () => {
    const bytes = getPlanOpenedEventEncoder().encode({
      plan: address(PROGRAM),
      student,
      merchant: merchantOwner,
      price: BigInt(toMicro(1)),
      downPayment: BigInt(0),
      financed: BigInt(toMicro(1)),
      interest: BigInt(0),
      merchantFee: BigInt(0),
      installments: [BigInt(1), BigInt(0), BigInt(0)],
      tier: 0,
      withGuarantee: false,
      counts: false,
    });
    // Mismo discriminador pero emitido bajo un CPI al token program: ajeno.
    const logs = [
      `Program ${PROGRAM} invoke [1]`,
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      `Program data: ${b64(bytes)}`,
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      `Program ${PROGRAM} success`,
      `Program data: ${b64(bytes)}`,
    ];
    expect(parseCuotasEventsFromLogs(logs, PROGRAM)).toEqual([]);
  });
});

describe("historial sin eventos atribuidos", () => {
  const txSinEventos = () => ({
    meta: {
      err: null,
      logMessages: [
        `Program ${PROGRAM} invoke [1]`,
        "Program log: Instruction: LpDeposit",
        `Program ${PROGRAM} success`,
      ],
      preTokenBalances: [{ accountIndex: 1, uiTokenAmount: { amount: "0" } }],
      postTokenBalances: [{ accountIndex: 1, uiTokenAmount: { amount: String(toMicro(100)) } }],
    },
    transaction: { message: { accountKeys: [{ pubkey: PROGRAM }, { pubkey: PROGRAM }] } },
  });

  it("getPool: nombre de instrucción + delta sin evento → sin eventos", async () => {
    const poolB64 = b64(
      getPoolEncoder().encode({
        juniorShares: BigInt(1000),
        seniorShares: BigInt(4000),
        juniorCapital: BigInt(toMicro(1000)),
        seniorCapital: BigInt(toMicro(4000)),
        outstandingCredit: BigInt(0),
        accruedFees: BigInt(0),
        committedPayouts: BigInt(0),
        bump: 1,
      }),
    );
    const { findPoolPda, findVaultPda } = await import("../../generated");
    const [poolPda] = await findPoolPda(
      { usdcMint: address(MINT) },
      { programAddress: address(PROGRAM) },
    );
    const [vault] = await findVaultPda({ pool: poolPda }, { programAddress: address(PROGRAM) });
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(poolPda)
          ? accountInfo(poolB64)
          : String(addr) === String(vault)
            ? accountInfo("eA==")
            : { value: null },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(5000)), decimals: 6 } }),
      getSignaturesForAddress: () => [
        { signature: "d".repeat(87), slot: 100, blockTime: OPENED_AT, err: null },
      ],
      getTransaction: txSinEventos,
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    expect((await c.getPool()).events).toEqual([]);
  });

  it("getActivity: tx sin evento → sin actividad; con evento filtra por planId", async () => {
    const { findPlanPda } = await import("../../generated");
    const [planPda] = await findPlanPda({ student }, { programAddress: address(PROGRAM) });
    const opened = b64(
      getPlanOpenedEventEncoder().encode({
        plan: planPda,
        student,
        merchant: merchantOwner,
        price: BigInt(toMicro(1000)),
        downPayment: BigInt(toMicro(300)),
        financed: BigInt(toMicro(700)),
        interest: BigInt(0),
        merchantFee: BigInt(toMicro(49)),
        installments: [BigInt(233_333_333), BigInt(233_333_333), BigInt(233_333_334)],
        tier: 0,
        withGuarantee: true,
        counts: true,
      }),
    );
    const rpc = devnetRpc({
      getSignaturesForAddress: () => [
        { signature: "e".repeat(87), slot: 100, blockTime: OPENED_AT, err: null },
        { signature: "f".repeat(87), slot: 101, blockTime: OPENED_AT + 1, err: null },
      ],
      getTransaction: (sig: string) =>
        sig === "e".repeat(87)
          ? txSinEventos()
          : {
              meta: {
                err: null,
                logMessages: [
                  `Program ${PROGRAM} invoke [1]`,
                  `Program data: ${opened}`,
                  `Program ${PROGRAM} success`,
                ],
              },
            },
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const all = await c.getActivity();
    expect(all).toHaveLength(1);
    expect(all[0].kind).toBe("PlanOpened");
    expect(all[0].planId).toBe(String(planPda));
    expect(await c.getActivity({ planId: String(planPda) })).toHaveLength(1);
    expect(await c.getActivity({ planId: String(merchantOwner) })).toEqual([]);
  });
});

describe("computeRealQuote", () => {
  const base: ProtocolConfig = {
    feeBps: 700,
    penaltyBps: 500,
    graceDays: 5,
    guarantorNoticeDay: 3,
    guarantorChargeDay: 15,
    secondsPerDay: 86_400,
    installmentsCount: 3,
    guaranteedTiers: [
      { downPaymentBps: 3000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1000), interestBps: 0 },
      { downPaymentBps: 2000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1000), interestBps: 0 },
      { downPaymentBps: 1000, guarantorCoverageBps: 10000, maxPurchase: toMicro(1250), interestBps: 0 },
      { downPaymentBps: 0, guarantorCoverageBps: 10000, maxPurchase: toMicro(1500), interestBps: 0 },
    ],
    planOptions: [
      { installments: 3, interestTotalBps: 0, minPrice: 0, enabled: true, provisional: false },
      { installments: 6, interestTotalBps: 300, minPrice: toMicro(350), enabled: true, provisional: false },
    ],
    settlementOptions: [
      { id: "immediate", days: 0, tranches: 0, feeBps: 700, enabled: true, provisional: false },
      { id: "deferred_30", days: 30, tranches: 1, feeBps: 625, enabled: true, provisional: false },
      { id: "deferred_60", days: 60, tranches: 2, feeBps: 575, enabled: true, provisional: false },
      { id: "deferred_90", days: 90, tranches: 3, feeBps: 525, enabled: true, provisional: false },
    ],
    minFinancedToCount: toMicro(100),
    state: "Normal",
    usdcMint: MINT,
    cluster: "devnet",
  };
  const rep = (over = {}) => ({
    student: "s",
    tier: 0 as const,
    plansCompleted: 0,
    lateCount: 0,
    activeExposure: 0,
    blockedFromNewPlans: false,
    ...over,
  });
  const guarantee = (over = {}) => ({
    student: "s",
    maxPurchase: toMicro(1000),
    coverageMax: toMicro(1000),
    mandateHash: "00",
    active: true,
    registeredAt: 0,
    ...over,
  });

  it("PC de 1000 en escalón 0: 300 + 3×233,33, comercio recibe 951", () => {
    const q = computeRealQuote(base, toMicro(1000), "s", rep(), guarantee(), false);
    expect(q.eligible).toBe(true);
    expect(q.downPayment).toBe(toMicro(300));
    expect(q.financed).toBe(toMicro(700));
    expect(q.installments).toHaveLength(3);
    expect(q.installments.reduce((a, b) => a + b, 0)).toBe(toMicro(700));
    expect(q.merchantFee).toBe(toMicro(49));
    expect(q.merchantReceives).toBe(toMicro(951));
  });

  it("6 cuotas aplica 3% total, fiador cubre capital + interés y 90 días crea tres tramos", () => {
    const q = computeRealQuote(base, toMicro(1000), "s", rep(), guarantee(), false, {
      installments: 6,
      settlement: "deferred_90",
    });
    expect(q.eligible).toBe(true);
    expect(q.installmentsCount).toBe(6);
    expect(q.interest).toBe(toMicro(21));
    expect(q.total).toBe(toMicro(1021));
    expect(q.requiredCoverage).toBe(toMicro(721));
    expect(q.settlementId).toBe("deferred_90");
    expect(q.payoutTranches).toEqual([
      { index: 0, amount: 221_083_333, releaseAt: 30 * 86_400, released: false },
      { index: 1, amount: 221_083_333, releaseAt: 60 * 86_400, released: false },
      { index: 2, amount: 221_083_334, releaseAt: 90 * 86_400, released: false },
    ]);
  });

  it("6 cuotas requiere precio mínimo y fiador activo", () => {
    const belowMin = computeRealQuote(base, toMicro(300), "s", rep(), guarantee(), false, { installments: 6 });
    expect(belowMin.reasons).toContain("below_option_min");
    const noGuarantor = computeRealQuote(base, toMicro(1000), "s", rep(), null, false, { installments: 6 });
    expect(noGuarantor.reasons).toContain("guarantor_required");
  });

  it("bloquea sin garantía, con plan activo, bloqueado o pausado", () => {
    expect(computeRealQuote(base, toMicro(1000), "s", rep(), null, false).reasons).toContain(
      "guarantor_required",
    );
    expect(computeRealQuote(base, toMicro(1000), "s", rep(), guarantee(), true).reasons).toContain(
      "has_active_plan",
    );
    expect(
      computeRealQuote(base, toMicro(1000), "s", rep({ blockedFromNewPlans: true }), guarantee(), false)
        .reasons,
    ).toContain("blocked_after_default");
    expect(
      computeRealQuote({ ...base, state: "Halted" }, toMicro(1000), "s", rep(), guarantee(), false)
        .reasons,
    ).toContain("protocol_halted");
    expect(
      computeRealQuote(base, toMicro(2000), "s", rep(), guarantee(), false).reasons,
    ).toContain("exceeds_tier_max");
  });

  it("opciones por defecto explícitas cotizan igual que sin opciones", () => {
    const q = computeRealQuote(base, toMicro(1000), "s", rep(), guarantee(), false, {
      installments: 3,
      settlement: "immediate",
    });
    expect(q.eligible).toBe(true);
    expect(q.installmentsCount).toBe(3);
    expect(q.settlementId).toBe("immediate");
    expect(q.installments).toEqual([233_333_333, 233_333_333, 233_333_334]);
    expect(q.merchantReceives).toBe(toMicro(951));
  });

  it("rechaza una cantidad de cuotas que no está configurada", () => {
    const q = computeRealQuote(base, toMicro(1000), "s", rep(), guarantee(), false, { installments: 1 });
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("option_unavailable");
  });
});

describe("límites del cliente real", () => {
  // RPC/firmanante que explotan si el código llega a tocarlos: la guardia de
  // opciones tiene que rechazar antes de leer la cadena o pedir la wallet.
  const deadTransport = (): RealTransport => ({
    rpc: mockRpc({}),
    getSigner: async () => {
      throw new Error("no debe pedir firma");
    },
  });

  it("setMerchantSettlement → option_unavailable sin tocar RPC ni firmar", async () => {
    const c = createRealCuotas({ env: ENV, transport: deadTransport() });
    await expect(
      c.setMerchantSettlement(String(merchantOwner), "deferred_30"),
    ).rejects.toMatchObject({ code: "option_unavailable" });
    await expect(
      c.setMerchantSettlement(String(merchantOwner), "immediate"),
    ).rejects.toMatchObject({ code: "option_unavailable" });
  });

  it("openPlan falla cerrado si no hay respuesta del RPC", async () => {
    const c = createRealCuotas({ env: ENV, transport: deadTransport() });
    await expect(c.openPlan({
      student: String(student),
      merchant: String(merchantOwner),
      price: toMicro(1000),
    })).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("propuestas y envío", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function studentIx(signer: TransactionSigner) {
    const { findConfigPda, findReputationPda } = await import("../../generated");
    const [config] = await findConfigPda({ programAddress: address(PROGRAM) });
    const [reputation] = await findReputationPda(
      { student: signer.address },
      { programAddress: address(PROGRAM) },
    );
    return getStudentInitReputationInstruction({ student: signer, config, reputation });
  }

  it("proposeTransaction simula antes de pedir firmas y propone el mensaje exacto", async () => {
    const signer = mockSigner(student);
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: ["ok"], unitsConsumed: BigInt(5000) } }),
    });
    const env = loadRealEnv(ENV);
    const proposal = await proposeTransaction(rpc, env, {
      label: "student_init_reputation",
      version: 0,
      feePayer: student,
      instructions: [
        { ix: await studentIx(signer), name: "StudentInitReputation", summary: "alta" },
      ],
    });
    expect(proposal.cluster).toBe("devnet");
    expect(proposal.simulation.ok).toBe(true);
    expect(proposal.instructions[0].name).toBe("StudentInitReputation");
    expect(proposal.messageBase64.length).toBeGreaterThan(100);
    expect(() => JSON.parse(proposalToJson(proposal))).not.toThrow();
  });

  it("simulación fallida → simulation_failed sin firma", async () => {
    let calls = 0;
    const raw = {
      address: student,
      signTransactions: async (txs: readonly unknown[]) => {
        calls++;
        return txs.map(() => ({ [student]: new Uint8Array(64) }));
      },
    };
    const signer = raw as unknown as TransactionSigner;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: { InstructionError: [0, "Custom"] }, logs: ["falló"] } }),
    });
    await expect(
      proposeTransaction(rpc, loadRealEnv(ENV), {
        label: "x",
        version: 0,
      feePayer: student,
        instructions: [{ ix: await studentIx(signer), name: "X", summary: "x" }],
      }),
    ).rejects.toMatchObject({ code: "simulation_failed" });
    expect(calls).toBe(0);
  });

  it("proposeAndSend confirma y devuelve la firma", async () => {
    const signer = mockSigner(student);
    const sig = "5".repeat(87) as Signature;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => sig,
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const { signature } = await proposeAndSend(
      rpc,
      loadRealEnv(ENV),
      {
        label: "x",
        version: 0,
        feePayer: student,
        signer,
        instructions: [{ ix: await studentIx(signer), name: "X", summary: "x" }],
      },
      { reviewer: () => true },
    );
    expect(signature).toBe(sig);
    expect(explorerTxUrl(signature)).toContain("cluster=devnet");
  });

  it("rechazo en wallet → wallet_required", async () => {
    const signer = mockSigner(student, new Error("user rejected"));
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
    });
    await expect(
      proposeAndSend(
        rpc,
        loadRealEnv(ENV),
        {
          label: "x",
          version: 0,
          feePayer: student,
          signer,
          instructions: [{ ix: await studentIx(signer), name: "X", summary: "x" }],
        },
        { reviewer: () => true },
      ),
    ).rejects.toMatchObject({ code: "wallet_required" });
  });

  it("sin revisor en Node → unavailable sin firmar ni enviar", async () => {
    const signer = mockSigner(student);
    let sends = 0;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "5".repeat(87);
      },
    });
    await expect(
      proposeAndSend(rpc, loadRealEnv(ENV), {
        label: "x",
        version: 0,
        feePayer: student,
        signer,
        instructions: [{ ix: await studentIx(signer), name: "X", summary: "x" }],
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(sends).toBe(0);
  });

  it("revisor rechaza → review_rejected sin firmar ni enviar", async () => {
    const signer = mockSigner(student);
    let sends = 0;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "5".repeat(87);
      },
    });
    await expect(
      proposeAndSend(
        rpc,
        loadRealEnv(ENV),
        {
          label: "x",
          version: 0,
          feePayer: student,
          signer,
          instructions: [{ ix: await studentIx(signer), name: "X", summary: "x" }],
        },
        { reviewer: () => false },
      ),
    ).rejects.toMatchObject({ code: "review_rejected" });
    expect(sends).toBe(0);
  });
});

describe("openPlan y payInstallment", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function pdas() {
    const gen = await import("../../generated");
    const token = await import("@solana-program/token");
    const [configPda] = await gen.findConfigPda({ programAddress: address(PROGRAM) });
    const [planPda] = await gen.findPlanPda({ student }, { programAddress: address(PROGRAM) });
    const [repPda] = await gen.findReputationPda({ student }, { programAddress: address(PROGRAM) });
    const [guaranteePda] = await gen.findGuaranteePda(
      { student },
      { programAddress: address(PROGRAM) },
    );
    const [merchantPda] = await gen.findMerchantPda(
      { merchantWallet: merchantOwner },
      { programAddress: address(PROGRAM) },
    );
    const [studentAta] = await token.findAssociatedTokenPda({
      mint: address(MINT),
      owner: student,
      tokenProgram: token.TOKEN_PROGRAM_ADDRESS,
    });
    const [merchantAta] = await token.findAssociatedTokenPda({
      mint: address(MINT),
      owner: merchantOwner,
      tokenProgram: token.TOKEN_PROGRAM_ADDRESS,
    });
    return { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta };
  }

  function reputationData(over: Record<string, unknown> = {}) {
    return b64(
      getReputationEncoder().encode({
        tier: 0,
        plansCompleted: 0,
        lateCount: 0,
        activeExposure: BigInt(0),
        plansOpened: BigInt(1),
        bump: 1,
        ...over,
      }),
    );
  }

  function guaranteeData() {
    return b64(
      getGuaranteeEncoder().encode({
        maxPurchase: BigInt(toMicro(1000)),
        coverageMax: BigInt(toMicro(1000)),
        mandateHash: new Uint8Array(32).fill(1),
        active: true,
        registeredAt: BigInt(OPENED_AT),
        bump: 1,
      }),
    );
  }

  it("openPlan compra con elegibilidad local, simula, envía y relee", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let plan: string | null = null;
    const sig = "6".repeat(87) as Signature;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) {
          return accountInfo(
            b64(
              getMerchantEncoder().encode({
                owner: merchantOwner,
                settlementAta: merchantAta,
                active: true,
                plansCount: BigInt(0),
                bump: 1,
              }),
            ),
          );
        }
        if (s === String(planPda)) return plan ? accountInfo(plan) : { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        plan = planData({ openedAt: BigInt(OPENED_AT) });
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)), reviewer: () => true });
    const res = await c.openPlan({
      student: String(student),
      merchant: String(merchantOwner),
      price: toMicro(1000),
    });
    expect(res.signature).toBe(sig);
    expect(res.value.id).toBe(String(planPda));
    expect(res.value.downPayment).toBe(toMicro(300));
    expect(res.value.installments).toHaveLength(3);
  });

  it("openPlan sin reputación bundla init+open en UNA transacción (una firma)", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let plan: string | null = null;
    const sig = "9".repeat(87) as Signature;
    let simulations = 0;
    let sends = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        // Sin Reputation PDA: la primera compra la crea en la misma tx.
        if (s === String(repPda)) return { value: null };
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) {
          return accountInfo(
            b64(
              getMerchantEncoder().encode({
                owner: merchantOwner,
                settlementAta: merchantAta,
                active: true,
                plansCount: BigInt(0),
                bump: 1,
              }),
            ),
          );
        }
        if (s === String(planPda)) return plan ? accountInfo(plan) : { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => {
        simulations++;
        return { value: { err: null, logs: [] } };
      },
      sendTransaction: () => {
        sends++;
        plan = planData({ openedAt: BigInt(OPENED_AT) });
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    let proposed: string[] = [];
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: (p) => {
        proposed = p.instructions.map((i) => i.name);
        return true;
      },
    });
    // Tier 0 garantizado: la primera compra cotiza como post-initReputation.
    const res = await c.openPlan({
      student: String(student),
      merchant: String(merchantOwner),
      price: toMicro(1000),
    });
    expect(res.signature).toBe(sig);
    // initReputation va PRIMERO que openPlan en la misma propuesta.
    expect(proposed).toEqual(["StudentInitReputation", "OpenPlan"]);
    // Una simulación y un envío: una sola transacción, una sola firma.
    expect(simulations).toBe(1);
    expect(sends).toBe(1);
    expect(res.value.id).toBe(String(planPda));
  });

  it("openPlan con reputación existente NO bundla initReputation", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let plan: string | null = null;
    const sig = "a".repeat(87) as Signature;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) {
          return accountInfo(
            b64(
              getMerchantEncoder().encode({
                owner: merchantOwner,
                settlementAta: merchantAta,
                active: true,
                plansCount: BigInt(0),
                bump: 1,
              }),
            ),
          );
        }
        if (s === String(planPda)) return plan ? accountInfo(plan) : { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        plan = planData({ openedAt: BigInt(OPENED_AT) });
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    let proposed: string[] = [];
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: (p) => {
        proposed = p.instructions.map((i) => i.name);
        return true;
      },
    });
    await c.openPlan({
      student: String(student),
      merchant: String(merchantOwner),
      price: toMicro(1000),
    });
    expect(proposed).toEqual(["OpenPlan"]);
  });

  it("openPlan bloqueado por elegibilidad no toca la wallet", async () => {
    const { configPda, repPda } = await pdas();
    let calls = 0;
    const raw = {
      address: student,
      signTransactions: async (txs: readonly unknown[]) => {
        calls++;
        return txs.map(() => ({ [student]: new Uint8Array(64) }));
      },
    };
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData({ lateCount: 1 }));
        return { value: null };
      },
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, raw as unknown as TransactionSigner),
    });
    await expect(
      c.openPlan({ student: String(student), merchant: String(merchantOwner), price: toMicro(1000) }),
    ).rejects.toMatchObject({ code: "blocked_after_default" });
    expect(calls).toBe(0);
  });

  it("payInstallment paga la primera impaga y relee el plan", async () => {
    const { configPda, planPda } = await pdas();
    let paid0 = false;
    const sig = "7".repeat(87) as Signature;
    const current = () =>
      planData({
        installments: [
          installmentFixture({ paid: paid0 }),
          installmentFixture({ dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
          installmentFixture({ amount: BigInt(233_333_334), dueAt: BigInt(OPENED_AT + 90 * 86_400) }),
        ],
      });
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(planPda)) return accountInfo(current());
        if (s !== String(planPda) && s !== String(configPda)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(1000)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        paid0 = true;
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)), reviewer: () => true });
    const res = await c.payInstallment(String(student), String(planPda));
    expect(res.signature).toBe(sig);
    expect(res.value.installments[0].status).toBe("Paid");
    expect(res.value.status).toBe("Active");
  });

  it("payInstallment saldando devuelve imagen Settled con punitorio del evento", async () => {
    const { configPda, planPda } = await pdas();
    let closed = false;
    const sig = "8".repeat(87) as Signature;
    const paidEvent = b64(
      getInstallmentPaidEventEncoder().encode({
        plan: planPda,
        student,
        index: 2,
        amount: BigInt(233_333_334),
        penalty: BigInt(11_666_666),
      }),
    );
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(planPda)) {
          if (closed) return { value: null };
          return accountInfo(
            planData({
              installments: [
                installmentFixture({ paid: true }),
                installmentFixture({ paid: true, dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
                installmentFixture({
                  amount: BigInt(233_333_334),
                  dueAt: BigInt(OPENED_AT + 90 * 86_400),
                }),
              ],
            }),
          );
        }
        return accountInfo("eA==");
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(1000)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        closed = true;
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
      getTransaction: () => ({
        meta: {
          err: null,
          logMessages: [
            `Program ${PROGRAM} invoke [1]`,
            `Program data: ${paidEvent}`,
            `Program ${PROGRAM} success`,
          ],
        },
      }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)), reviewer: () => true });
    const res = await c.payInstallment(String(student), String(planPda));
    expect(res.value.status).toBe("Settled");
    expect(res.value.installments[2].status).toBe("Paid");
    expect(res.value.installments[2].penalty).toBe(11_666_666);
  });

  it("payInstallment sin plan → not_found; todo resuelto → nothing_due", async () => {
    const { configPda, planPda } = await pdas();
    const missing = devnetRpc({ getAccountInfo: () => ({ value: null }) });
    const c1 = createRealCuotas({ env: ENV, transport: transportFor(missing, mockSigner(student)) });
    await expect(c1.payInstallment("11111111111111111111111111111111", "x")).rejects.toMatchObject({
      code: "wallet_required",
    });
    const resolved = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(configPda)
          ? accountInfo(configData())
          : String(addr) === String(planPda)
          ? accountInfo(
              planData({
                installments: [
                  installmentFixture({ paid: true }),
                  installmentFixture({ paid: true, dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
                  installmentFixture({
                    paid: true,
                    amount: BigInt(233_333_334),
                    dueAt: BigInt(OPENED_AT + 90 * 86_400),
                  }),
                ],
              }),
            )
          : { value: null },
    });
    const c2 = createRealCuotas({ env: ENV, transport: transportFor(resolved, mockSigner(student)) });
    await expect(c2.payInstallment(String(student), String(planPda))).rejects.toMatchObject({
      code: "nothing_due",
    });
  });
});

describe("cuentas reales (accounts.ts)", () => {
  const fakeBase = (over: Partial<CuotasClient & AccountBaseHooks> = {}) =>
    ({
      mode: "real",
      getConfig: async () => ({ admin: String(admin), keeper: String(admin) }) as ProtocolConfig,
      subscribe: () => () => {},
      ...over,
    }) as unknown as CuotasClient;

  it("la autoridad sale de la config real, sin fixture", async () => {
    const accounts = createAccountCuotas(fakeBase());
    const config = await accounts.getAccountConfig();
    expect(config.authority).toMatchObject({ admin: String(admin), source: "config" });
    expect(config.demo).toBeNull();
  });

  it("getBalance usa el hook onchain de la base", async () => {
    const accounts = createAccountCuotas(
      fakeBase({ getDevUsdcBalance: (async () => toMicro(12)) as never }),
    );
    const balance = await accounts.getBalance(String(student));
    expect(balance).toMatchObject({ available: toMicro(12), simulated: false, source: "onchain" });
  });

  it("sin admin onchain nadie es admin (falla cerrado)", async () => {
    const accounts = createAccountCuotas(
      fakeBase({ getConfig: async () => ({}) as ProtocolConfig }),
    );
    await expect(accounts.adminSetState(String(admin), "Halted")).rejects.toMatchObject({
      code: "unauthorized",
    });
  });
});

describe("resolveTxVersion", () => {
  it("prefiere v0 (v1 no ejecuta en devnet), rechaza legacy-only", async () => {
    const { resolveTxVersion } = await import("./real");
    expect(resolveTxVersion(new Set([0, 1]))).toBe(0);
    expect(resolveTxVersion(new Set([0]))).toBe(0);
    expect(resolveTxVersion(new Set([1]))).toBe(1);
    expect(() => resolveTxVersion(new Set(["legacy"]))).toThrowError(CuotasError);
    try {
      resolveTxVersion(new Set(["legacy"]));
    } catch (e) {
      expect((e as CuotasError).code).toBe("unsupported_version");
    }
  });
});

describe("validación de cuentas", () => {
  it("dueño inesperado → unavailable", async () => {
    const rpc = devnetRpc({
      getAccountInfo: () => accountInfo(configData(), "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getConfig()).rejects.toMatchObject({ code: "unavailable" });
  });

  it("discriminador inesperado → unavailable", async () => {
    const raw = getBase64Encoder().encode(configData());
    const tampered = new Uint8Array(raw);
    tampered[0] ^= 0xff;
    const rpc = devnetRpc({ getAccountInfo: () => accountInfo(getBase64Decoder().decode(tampered)) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getConfig()).rejects.toMatchObject({ code: "unavailable" });
  });

  it("bytes truncados → unavailable", async () => {
    const raw = getBase64Encoder().encode(configData());
    const short = getBase64Decoder().decode(raw.slice(0, 10));
    const rpc = devnetRpc({ getAccountInfo: () => accountInfo(short) });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    await expect(c.getConfig()).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("puente keeper de garantías", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function keeperSetup() {
    const keeper = (await generateKeyPairSigner()).address;
    const gen = await import("../../generated");
    const [configPda] = await gen.findConfigPda({ programAddress: address(PROGRAM) });
    const [guaranteePda] = await gen.findGuaranteePda(
      { student },
      { programAddress: address(PROGRAM) },
    );
    return { keeper, configPda, guaranteePda };
  }

  function guaranteeBytes(active: boolean) {
    return b64(
      getGuaranteeEncoder().encode({
        maxPurchase: BigInt(toMicro(1000)),
        coverageMax: BigInt(toMicro(700)),
        mandateHash: new Uint8Array(32).fill(9),
        active,
        registeredAt: BigInt(OPENED_AT),
        bump: 1,
      }),
    );
  }

  it("sin wallet keeper → unauthorized sin firmar", async () => {
    const { keeper, configPda } = await keeperSetup();
    let calls = 0;
    const raw = {
      address: student,
      signTransactions: async (txs: readonly unknown[]) => {
        calls++;
        return txs.map(() => ({ [student]: new Uint8Array(64) }));
      },
    };
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(configPda)
          ? accountInfo(configData({ keeper, admin }))
          : { value: null },
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, raw as unknown as TransactionSigner),
    });
    await expect(
      c.registerGuarantee({
        student: String(student),
        maxPurchase: toMicro(1000),
        coverageMax: toMicro(700),
        mandateHash: "ab".repeat(32),
      }),
    ).rejects.toMatchObject({ code: "unauthorized" });
    await expect(c.revokeGuarantee(String(student))).rejects.toMatchObject({ code: "unauthorized" });
    expect(calls).toBe(0);
  });

  it("keeper registra garantía nueva", async () => {
    const { keeper, configPda, guaranteePda } = await keeperSetup();
    const sig = "9".repeat(87) as Signature;
    let createdNow = false;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData({ keeper, admin }));
        if (s === String(guaranteePda)) {
          return createdNow ? accountInfo(guaranteeBytes(true)) : { value: null };
        }
        return { value: null };
      },
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        createdNow = true;
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(keeper)), reviewer: () => true });
    const res = await c.registerGuarantee({
      student: String(student),
      maxPurchase: toMicro(1000),
      coverageMax: toMicro(700),
      mandateHash: "09".repeat(32),
    });
    expect(res.signature).toBe(sig);
    expect(res.value.coverageMax).toBe(toMicro(700));
  });

  it("garantía existente → el puente no actualiza (CLI del keeper)", async () => {
    const { keeper, configPda, guaranteePda } = await keeperSetup();
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData({ keeper, admin }));
        if (s === String(guaranteePda)) return accountInfo(guaranteeBytes(true));
        return { value: null };
      },
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(keeper)) });
    await expect(
      c.registerGuarantee({
        student: String(student),
        maxPurchase: toMicro(1000),
        coverageMax: toMicro(700),
        mandateHash: "09".repeat(32),
      }),
    ).rejects.toMatchObject({ code: "unavailable" });
  });

  it("keeper revoca; sin garantía → not_found", async () => {
    const { keeper, configPda, guaranteePda } = await keeperSetup();
    const sig = "a".repeat(87) as Signature;
    let active = true;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData({ keeper, admin }));
        if (s === String(guaranteePda)) return accountInfo(guaranteeBytes(active));
        return { value: null };
      },
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        active = false;
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(keeper)), reviewer: () => true });
    const res = await c.revokeGuarantee(String(student));
    expect(res.value.active).toBe(false);

    const missing = devnetRpc({
      getAccountInfo: (addr: Address) =>
        String(addr) === String(configPda) ? accountInfo(configData({ keeper, admin })) : { value: null },
    });
    const c2 = createRealCuotas({ env: ENV, transport: transportFor(missing, mockSigner(keeper)) });
    await expect(c2.revokeGuarantee(String(student))).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("envío exacto de lo revisado", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function studentIxFor(addr: Address, signer: TransactionSigner) {
    const { findConfigPda, findReputationPda } = await import("../../generated");
    const [config] = await findConfigPda({ programAddress: address(PROGRAM) });
    const [reputation] = await findReputationPda({ student: addr }, { programAddress: address(PROGRAM) });
    return getStudentInitReputationInstruction({ student: signer, config, reputation });
  }

  function simOkRpc() {
    return devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => "5".repeat(87),
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
  }

  it("el revisor ve la propuesta simulada antes del envío", async () => {
    const { proposeAndSend } = await import("./real");
    const seen: string[] = [];
    const signer = mockSigner(student);
    const { proposal } = await proposeAndSend(
      simOkRpc(),
      loadRealEnv(ENV),
      {
        label: "x",
        version: 0,
        feePayer: student,
        signer,
        instructions: [{ ix: await studentIxFor(student, signer), name: "X", summary: "x" }],
      },
      {
        reviewer: (p) => {
          seen.push(p.label);
          expect(p.simulation.ok).toBe(true);
          return true;
        },
      },
    );
    expect(seen).toEqual(["x"]);
    expect(proposal.label).toBe("x");
  });

  it("instrucción distinta a la revisada → envío abortado sin firmar", async () => {
    const { proposeTransaction, sendReviewedProposal } = await import("./real");
    const other = (await generateKeyPairSigner()).address;
    const signer = mockSigner(student);
    let sendCalls = 0;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sendCalls++;
        return "5".repeat(87);
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const proposal = await proposeTransaction(rpc, loadRealEnv(ENV), {
      label: "x",
      version: 0,
      feePayer: student,
      instructions: [{ ix: await studentIxFor(student, signer), name: "X", summary: "x" }],
    });
    // Mismo nombre pero otra cuenta (otro estudiante): la huella difiere.
    await expect(
      sendReviewedProposal(
        rpc,
        proposal,
        [{ ix: await studentIxFor(other, signer), name: "X", summary: "x" }],
        signer,
      ),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(sendCalls).toBe(0);
  });

  it("firmante distinto al revisado → unauthorized", async () => {
    const { proposeTransaction, sendReviewedProposal } = await import("./real");
    const other = (await generateKeyPairSigner()).address;
    const signer = mockSigner(student);
    const rpc = simOkRpc();
    const proposal = await proposeTransaction(rpc, loadRealEnv(ENV), {
      label: "x",
      version: 0,
      feePayer: student,
      instructions: [{ ix: await studentIxFor(student, signer), name: "X", summary: "x" }],
    });
    await expect(
      sendReviewedProposal(
        rpc,
        proposal,
        [{ ix: await studentIxFor(student, signer), name: "X", summary: "x" }],
        mockSigner(other),
      ),
    ).rejects.toMatchObject({ code: "unauthorized" });
  });
});

describe("invitaciones reales (backend)", () => {
  const fakeBase = (over: Partial<CuotasClient & AccountBaseHooks> = {}) =>
    ({
      mode: "real",
      getConfig: async () => ({ admin: String(admin), keeper: String(admin) }) as ProtocolConfig,
      subscribe: () => () => {},
      ...over,
    }) as unknown as CuotasClient;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(handler: (url: string, init?: { method?: string; body?: string }) => unknown) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        const out = handler(url, init) as { status: number; json: unknown };
        return { ok: out.status >= 200 && out.status < 300, status: out.status, json: async () => out.json };
      }),
    );
  }

  it("createInvitation emite token del backend", async () => {
    let seen: { url: string; method?: string; body?: string } | null = null;
    mockFetch((url, init) => {
      seen = { url, method: init?.method, body: init?.body };
      return { status: 201, json: { token: "v1.abc", student: String(student), issuedAt: 100, expiresAt: 200 } };
    });
    const accounts = createAccountCuotas(fakeBase());
    const inv = await accounts.createInvitation(String(student));
    expect(inv).toMatchObject({ token: "v1.abc", createdAt: 100, completedAt: null });
    expect(seen).toMatchObject({ url: "/api/fiador/invitaciones", method: "POST" });
    expect(JSON.parse((seen as unknown as { body: string }).body)).toEqual({ student: String(student) });
  });

  it("resolveInvitation mapea completed + errores del backend", async () => {
    mockFetch((url) => {
      if (url.endsWith("/t-ok")) {
        return {
          status: 200,
          json: { student: String(student), issuedAt: 100, expiresAt: 200, completed: true, acceptance: { acceptedAt: 150 } },
        };
      }
      if (url.endsWith("/t-bad")) return { status: 404, json: { code: "invalid_token" } };
      if (url.endsWith("/t-exp")) return { status: 410, json: { code: "expired_token" } };
      return { status: 503, json: { code: "invite_not_configured" } };
    });
    const accounts = createAccountCuotas(fakeBase());
    await expect(accounts.resolveInvitation("t-ok")).resolves.toMatchObject({ completedAt: 150 });
    await expect(accounts.resolveInvitation("t-bad")).rejects.toMatchObject({ code: "invalid_token" });
    await expect(accounts.resolveInvitation("t-exp")).rejects.toMatchObject({ code: "expired" });
    await expect(accounts.resolveInvitation("t-down")).rejects.toMatchObject({ code: "unavailable" });
  });

  it("backend caído → unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("conn refused");
      }),
    );
    const accounts = createAccountCuotas(fakeBase());
    await expect(accounts.createInvitation(String(student))).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("bindRealTransport", () => {
  it("sin wallet conectada las escrituras piden conectar", async () => {
    const rpc = devnetRpc({ getAccountInfo: () => ({ value: null }) });
    const unbind = bindRealTransport(rpc, { getState: () => ({ connected: null }) });
    try {
      const c = createRealCuotas({ env: ENV });
      await expect(c.initReputation(String(student))).rejects.toMatchObject({
        code: "wallet_required",
      });
    } finally {
      unbind();
    }
  });
});

describe("progreso observable e incertidumbre (contrato ticket01)", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function studentIx(signer: TransactionSigner) {
    const { findConfigPda, findReputationPda } = await import("../../generated");
    const [config] = await findConfigPda({ programAddress: address(PROGRAM) });
    const [reputation] = await findReputationPda(
      { student: signer.address },
      { programAddress: address(PROGRAM) },
    );
    return getStudentInitReputationInstruction({ student: signer, config, reputation });
  }

  const propose = (rpc: RealRpc, signer: TransactionSigner, events: TxProgress[]) =>
    studentIx(signer).then((ix) =>
      proposeAndSend(
        rpc,
        loadRealEnv(ENV),
        {
          label: "x",
          version: 0,
          feePayer: student,
          signer,
          instructions: [{ ix, name: "X", summary: "x" }],
        },
        { reviewer: () => true, onProgress: (p) => events.push(p) },
      ),
    );

  it("emite awaiting_approval → sending → confirming; firma desde sending", async () => {
    const signer = mockSigner(student);
    const sig = "5".repeat(87) as Signature;
    const events: TxProgress[] = [];
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => sig,
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const res = await propose(rpc, signer, events);
    expect(res.signature).toBe(sig);
    expect(events.map((e) => e.phase)).toEqual(["awaiting_approval", "sending", "confirming"]);
    // Desde `sending` la firma es conocida (se deriva localmente antes del RPC);
    // la de `confirming` es la que devolvió el envío.
    expect(events[1].signature).toBeTruthy();
    expect(events[2].signature).toBe(sig);
  });

  it("rechazo de wallet → wallet_required tras awaiting_approval, sin envío", async () => {
    const signer = mockSigner(student, new Error("user rejected"));
    const events: TxProgress[] = [];
    let sends = 0;
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "5".repeat(87);
      },
    });
    await expect(propose(rpc, signer, events)).rejects.toMatchObject({
      code: "wallet_required",
    });
    expect(sends).toBe(0);
    expect(events.map((e) => e.phase)).toEqual(["awaiting_approval"]);
  });

  it("envío sin respuesta → uncertain CON firma (la tx pudo aterrizar)", async () => {
    const events: TxProgress[] = [];
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        throw new Error("network timeout");
      },
    });
    const err = await propose(rpc, mockSigner(student), events).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "uncertain" });
    expect((err as CuotasError).signature).toBeTruthy();
    // La fase `sending` ya emitió la misma firma que lleva el error.
    expect(events.map((e) => e.phase)).toEqual(["awaiting_approval", "sending"]);
    expect(events[1].signature).toBe((err as CuotasError).signature);
  });

  it("rechazo del preflight → unavailable definitivo (la tx nunca llegó)", async () => {
    const events: TxProgress[] = [];
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        throw new Error("Transaction simulation failed: custom program error");
      },
    });
    const err = await propose(rpc, mockSigner(student), events).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "unavailable" });
    expect((err as CuotasError).signature).toBeUndefined();
  });

  it("confirmación agotada → uncertain con firma, sin reenviar", async () => {
    let sends = 0;
    const events: TxProgress[] = [];
    const rpc = devnetRpc({
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "6".repeat(87);
      },
      getSignatureStatuses: () => ({ value: [null] }),
    });
    // Reloj adelantado: el deadline de confirmación vence en la primera
    // encuesta (sin esperar 60 s reales ni depender de fake timers).
    const t0 = Date.now();
    let nowCalls = 0;
    vi.spyOn(Date, "now").mockImplementation(() => t0 + nowCalls++ * 120_000);
    try {
      const err = await propose(rpc, mockSigner(student), events).catch((e: unknown) => e);
      expect(err).toMatchObject({ code: "uncertain", signature: "6".repeat(87) });
      expect(sends).toBe(1);
      expect(events.map((e) => e.phase)).toEqual(["awaiting_approval", "sending", "confirming"]);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("openPlan/payInstallment: progreso, fondos y dedup", () => {
  const blockhash = {
    blockhash: "EETubP5AKHgjPA9xUQYv5D4Vhb8v29TV8j6L4xQJ8G1aG" as never,
    lastValidBlockHeight: BigInt(1000),
  };

  async function pdas() {
    const gen = await import("../../generated");
    const token = await import("@solana-program/token");
    const [configPda] = await gen.findConfigPda({ programAddress: address(PROGRAM) });
    const [planPda] = await gen.findPlanPda({ student }, { programAddress: address(PROGRAM) });
    const [repPda] = await gen.findReputationPda({ student }, { programAddress: address(PROGRAM) });
    const [guaranteePda] = await gen.findGuaranteePda(
      { student },
      { programAddress: address(PROGRAM) },
    );
    const [merchantPda] = await gen.findMerchantPda(
      { merchantWallet: merchantOwner },
      { programAddress: address(PROGRAM) },
    );
    const [studentAta] = await token.findAssociatedTokenPda({
      mint: address(MINT),
      owner: student,
      tokenProgram: token.TOKEN_PROGRAM_ADDRESS,
    });
    const [merchantAta] = await token.findAssociatedTokenPda({
      mint: address(MINT),
      owner: merchantOwner,
      tokenProgram: token.TOKEN_PROGRAM_ADDRESS,
    });
    return { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta };
  }

  function reputationData(over: Record<string, unknown> = {}) {
    return b64(
      getReputationEncoder().encode({
        tier: 0,
        plansCompleted: 0,
        lateCount: 0,
        activeExposure: BigInt(0),
        plansOpened: BigInt(1),
        bump: 1,
        ...over,
      }),
    );
  }

  function guaranteeData() {
    return b64(
      getGuaranteeEncoder().encode({
        maxPurchase: BigInt(toMicro(1000)),
        coverageMax: BigInt(toMicro(1000)),
        mandateHash: new Uint8Array(32).fill(1),
        active: true,
        registeredAt: BigInt(OPENED_AT),
        bump: 1,
      }),
    );
  }

  const merchantData = (settlementAta: Address) =>
    accountInfo(
      b64(
        getMerchantEncoder().encode({
          owner: merchantOwner,
          settlementAta,
          active: true,
          plansCount: BigInt(0),
          bump: 1,
        }),
      ),
    );

  it("openPlan emite las cinco fases en orden con la firma del envío", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let plan: string | null = null;
    const sig = "6".repeat(87) as Signature;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) return merchantData(merchantAta);
        if (s === String(planPda)) return plan ? accountInfo(plan) : { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        plan = planData({ openedAt: BigInt(OPENED_AT) });
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const events: TxProgress[] = [];
    const res = await c.openPlan({
      student: String(student),
      merchant: String(merchantOwner),
      price: toMicro(1000),
      onProgress: (p) => events.push(p),
    });
    expect(res.signature).toBe(sig);
    expect(events.map((e) => e.phase)).toEqual([
      "preparing",
      "awaiting_approval",
      "sending",
      "confirming",
      "syncing",
    ]);
    expect(events[0].signature).toBeUndefined();
    expect(events[1].signature).toBeUndefined();
    expect(events[3].signature).toBe(sig);
    expect(events[4].signature).toBe(sig);
  });

  it("openPlan concurrente deduplica: misma promesa, un solo envío", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let plan: string | null = null;
    let sends = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) return merchantData(merchantAta);
        if (s === String(planPda)) return plan ? accountInfo(plan) : { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        plan = planData({ openedAt: BigInt(OPENED_AT) });
        return "6".repeat(87);
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const args = { student: String(student), merchant: String(merchantOwner), price: toMicro(1000) };
    const p1 = c.openPlan(args);
    const p2 = c.openPlan(args);
    // El segundo llamado comparte la operación en curso: cero envíos dobles.
    expect(p2).toBe(p1);
    const res = await p1;
    expect(sends).toBe(1);
    expect(res.value.id).toBe(String(planPda));
    // Terminada la operación, el siguiente llamado es una operación nueva.
    const p3 = c.openPlan(args);
    expect(p3).not.toBe(p1);
    await expect(p3).rejects.toMatchObject({ code: "has_active_plan" });
  });

  it("openPlan sin saldo para el anticipo → insufficient_funds antes de firmar", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    let sends = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) return merchantData(merchantAta);
        if (s === String(planPda)) return { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      // 100 devUSDC < anticipo 300: bloquea en preparación, no simula ni firma.
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(100)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "6".repeat(87);
      },
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const events: TxProgress[] = [];
    await expect(
      c.openPlan({
        student: String(student),
        merchant: String(merchantOwner),
        price: toMicro(1000),
        onProgress: (p) => events.push(p),
      }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
    expect(sends).toBe(0);
    expect(events.map((e) => e.phase)).toEqual(["preparing"]);
  });

  it("quote reporta insufficient_funds con el saldo real del ATA", async () => {
    const { configPda, planPda, repPda, guaranteePda, studentAta } = await pdas();
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(planPda)) return { value: null };
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(100)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
    });
    const c = createRealCuotas({ env: ENV, transport: transportFor(rpc, mockSigner(student)) });
    const q = await c.quote(toMicro(1000), String(student));
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("insufficient_funds");
  });

  it("plan que no aparece tras confirmar → uncertain con firma", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    const sig = "6".repeat(87) as Signature;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) return merchantData(merchantAta);
        if (s === String(planPda)) return { value: null }; // nunca indexa
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => sig,
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const err = await c
      .openPlan({ student: String(student), merchant: String(merchantOwner), price: toMicro(1000) })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "uncertain", signature: sig });
  });

  it("lectura del plan caída tras confirmar → uncertain con firma", async () => {
    const { configPda, planPda, repPda, guaranteePda, merchantPda, studentAta, merchantAta } =
      await pdas();
    const sig = "6".repeat(87) as Signature;
    let planReads = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(repPda)) return accountInfo(reputationData());
        if (s === String(guaranteePda)) return accountInfo(guaranteeData());
        if (s === String(merchantPda)) return merchantData(merchantAta);
        if (s === String(planPda)) {
          planReads++;
          // 1.ª lectura: elegibilidad (sin plan). 2.ª: sync post-confirmación → caída.
          if (planReads >= 2) throw new Error("RPC caído");
          return { value: null };
        }
        if (s === String(studentAta)) return accountInfo("eA==");
        return { value: null };
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(500)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => sig,
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const events: TxProgress[] = [];
    const err = await c
      .openPlan({
        student: String(student),
        merchant: String(merchantOwner),
        price: toMicro(1000),
        onProgress: (p) => events.push(p),
      })
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "uncertain", signature: sig });
    // Llegó a `syncing`: la compra pudo haber aterrizado; la UI reconcilia.
    expect(events.map((e) => e.phase)).toEqual([
      "preparing",
      "awaiting_approval",
      "sending",
      "confirming",
      "syncing",
    ]);
  });

  it("payInstallment emite la misma secuencia de fases", async () => {
    const { configPda, planPda } = await pdas();
    let paid0 = false;
    const sig = "7".repeat(87) as Signature;
    const current = () =>
      planData({
        installments: [
          installmentFixture({ paid: paid0 }),
          installmentFixture({ dueAt: BigInt(OPENED_AT + 60 * 86_400) }),
          installmentFixture({ amount: BigInt(233_333_334), dueAt: BigInt(OPENED_AT + 90 * 86_400) }),
        ],
      });
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(planPda)) return accountInfo(current());
        return accountInfo("eA==");
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(1000)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        paid0 = true;
        return sig;
      },
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const events: TxProgress[] = [];
    const res = await c.payInstallment(String(student), String(planPda), {
      onProgress: (p) => events.push(p),
    });
    expect(res.value.installments[0].status).toBe("Paid");
    expect(events.map((e) => e.phase)).toEqual([
      "preparing",
      "awaiting_approval",
      "sending",
      "confirming",
      "syncing",
    ]);
    expect(events[3].signature).toBe(sig);
    expect(events[4].signature).toBe(sig);
  });

  it("payInstallment sin saldo para la cuota → insufficient_funds antes de firmar", async () => {
    const { configPda, planPda } = await pdas();
    let sends = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(planPda)) return accountInfo(planData());
        return accountInfo("eA==");
      },
      // 100 devUSDC < cuota 233,33: corta en preparación.
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(100)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => {
        sends++;
        return "7".repeat(87);
      },
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const events: TxProgress[] = [];
    await expect(
      c.payInstallment(String(student), String(planPda), { onProgress: (p) => events.push(p) }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
    expect(sends).toBe(0);
    expect(events.map((e) => e.phase)).toEqual(["preparing"]);
  });

  it("payInstallment con lectura post-confirmación caída → uncertain con firma", async () => {
    const { configPda, planPda } = await pdas();
    const sig = "7".repeat(87) as Signature;
    let planReads = 0;
    const rpc = devnetRpc({
      getAccountInfo: (addr: Address) => {
        const s = String(addr);
        if (s === String(configPda)) return accountInfo(configData());
        if (s === String(planPda)) {
          planReads++;
          // 1.ª lectura: estado previo. 2.ª: sync post-confirmación → caída.
          if (planReads >= 2) throw new Error("RPC caído");
          return accountInfo(planData());
        }
        return accountInfo("eA==");
      },
      getTokenAccountBalance: () => ({ value: { amount: String(toMicro(1000)), decimals: 6 } }),
      getSlot: () => 1000,
      getBlockTime: () => OPENED_AT,
      getSignaturesForAddress: () => [],
      getLatestBlockhash: () => ({ value: blockhash }),
      simulateTransaction: () => ({ value: { err: null, logs: [] } }),
      sendTransaction: () => sig,
      getSignatureStatuses: () => ({ value: [{ confirmationStatus: "confirmed", err: null }] }),
    });
    const c = createRealCuotas({
      env: ENV,
      transport: transportFor(rpc, mockSigner(student)),
      reviewer: () => true,
    });
    const err = await c
      .payInstallment(String(student), String(planPda))
      .catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "uncertain", signature: sig });
  });
});
