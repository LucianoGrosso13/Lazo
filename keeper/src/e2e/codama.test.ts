import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
// Local codec-level end-to-end: the real CodamaAdapter against a scripted RPC
// transport serving REAL codec-encoded accounts (generated encoders), driving
// the real policy + journal + gateway through full propose/execute cycles.
// No network, no validator: validator e2e stays in the sandbox checklist.
import { address, createKeyPairSignerFromPrivateKeyBytes, generateKeyPairSigner, getAddressEncoder } from "@solana/kit";
import { getGuaranteeEncoder } from "../../../app/src/generated/accounts/guarantee";
import { getPlanEncoder } from "../../../app/src/generated/accounts/plan";
import { getProtocolConfigEncoder } from "../../../app/src/generated/accounts/protocolConfig";
import { findGuaranteePda } from "../../../app/src/generated/pdas/guarantee.ts";
import { ProtocolState } from "../../../app/src/generated/types/protocolState";
import { ReceiptAlreadyUsedError } from "../adapter.ts";
import { CodamaAdapter, CodamaError, __resetCodamaGenesisCacheForTests } from "../codama.ts";
import type { KeeperEnv } from "../config.ts";
import type { Gateway } from "../gateway.ts";
import { Journal } from "../journal.ts";
import { executeProposal, runOnce } from "../run.ts";

const PROGRAM = "E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ";
const KEEPER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";
// Valid on-curve addresses, generated fresh per run.
const STUDENT = (await generateKeyPairSigner()).address;
const PLAN_ADDR = (await generateKeyPairSigner()).address;
// Real clock: the adapter derives installment status from Date.now().
const NOW = Math.floor(Date.now() / 1000);
const OPENED = NOW - 100 * 86_400;
const DEVNET_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

const freshDir = (): string => mkdtempSync(join(tmpdir(), "lazo-e2e-"));

const env = (over: Partial<KeeperEnv> = {}): KeeperEnv => ({
  rpcUrl: "http://localhost:8899",
  dataDir: freshDir(),
  pollSeconds: 15,
  fiadorDataDir: null,
  mobbexApiKey: "k",
  mobbexAccessToken: "t",
  mobbexSubscriptionId: "s",
  mobbexArsPerUsdc: 1000,
  allowSimulatedRecovery: false,
  keeperKeypairPath: null,
  ...over,
});

const tier = (downPaymentBps: number, maxPurchase: number, guarantorCoverageBps: number) => ({
  downPaymentBps,
  maxPurchase,
  interestBps: 0,
  guarantorCoverageBps,
});

const configBytes = (): Uint8Array =>
  new Uint8Array(
    getProtocolConfigEncoder().encode({
      admin: address(KEEPER),
      keeper: address(KEEPER),
      usdcMint: address(KEEPER),
      treasury: address(KEEPER),
      feeBps: 700,
      penaltyBps: 500,
      graceDays: 5,
      guarantorChargeDay: 15,
      secondsPerDay: 86_400,
      installmentIntervalDays: 30,
      minFinancedToCount: 100_000_000,
      guaranteedTiers: [tier(3000, 1_000_000_000, 10_000), tier(2000, 1_000_000_000, 9000), tier(1000, 1_250_000_000, 8000), tier(0, 1_500_000_000, 7000)],
      unguaranteedTiers: [tier(5000, 150_000_000, 0), tier(3000, 300_000_000, 0)],
      state: ProtocolState.Normal,
      bump: 1,
    }),
  );

const installment = (over: { amount?: number; dueAt?: number; penalty?: number; paid?: boolean; charged?: boolean; markedLate?: boolean }) => ({
  amount: over.amount ?? 233_330_000,
  dueAt: over.dueAt ?? NOW - 20 * 86_400,
  penalty: over.penalty ?? 0,
  paid: over.paid ?? false,
  charged: over.charged ?? false,
  markedLate: over.markedLate ?? false,
  receiptHash: new Uint8Array(32),
});

const planBytes = (installments: ReturnType<typeof installment>[], over: { openedAt?: number; withGuarantee?: boolean } = {}): Uint8Array => {
  // The on-chain plan holds exactly 3 installments: pad with far-future
  // unpaid ones so short fixtures stay semantically neutral.
  const padded = [...installments];
  while (padded.length < 3) padded.push(installment({ dueAt: NOW + 400 * 86_400 }));
  return new Uint8Array(
    getPlanEncoder().encode({
      student: STUDENT,
      merchant: address(KEEPER),
      price: 700_000_000,
      downPayment: 0,
      financed: 700_000_000,
      interest: 0,
      merchantFee: 0,
      openedAt: over.openedAt ?? OPENED,
      tier: 0,
      withGuarantee: over.withGuarantee ?? true,
      counts: true,
      installments: padded,
      bump: 1,
    }),
  );
};

interface FakeOpts {
  plans?: Array<{ address: string; bytes: Uint8Array }>;
  /** Explicit per-address accounts (null = missing). Non-plan, non-explicit -> config fixture. */
  extra?: Record<string, Uint8Array | null>;
  simulateErr?: unknown;
  simulateLogs?: string[];
  sentWires?: string[];
  tokenBalance?: string;
}

const b64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

const accountValue = (bytes: Uint8Array | null) => ({
  context: { slot: 1 },
  value: bytes
    ? { data: [b64(bytes), "base64"], executable: false, lamports: 1, owner: PROGRAM, space: bytes.length }
    : null,
});

const fakeRpc = (opts: FakeOpts = {}) => {
  const cfg = configBytes();
  return {
    getGenesisHash: () => ({ send: async () => DEVNET_HASH }),
    getAccountInfo: (addr: unknown) => ({
      send: async () => {
        const key = String(addr);
        const hit = (opts.plans ?? []).find((p) => p.address === key);
        if (hit) return accountValue(hit.bytes);
        if (key in (opts.extra ?? {})) return accountValue((opts.extra ?? {})[key]);
        return accountValue(cfg);
      },
    }),
    getProgramAccounts: () => ({
      send: async () =>
        (opts.plans ?? []).map((p) => ({
          pubkey: p.address,
          account: { data: [b64(p.bytes), "base64"], executable: false, lamports: 1, owner: PROGRAM, space: p.bytes.length },
        })),
    }),
    getLatestBlockhash: () => ({
      send: async () => ({ value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1_000_000 } }),
    }),
    simulateTransaction: (wire: unknown) => ({
      send: async () => {
        void wire;
        return { value: { err: opts.simulateErr ?? null, logs: opts.simulateLogs ?? [], unitsConsumed: BigInt(1000) } };
      },
    }),
    sendTransaction: (wire: unknown) => ({
      send: async () => {
        opts.sentWires?.push(String(wire));
        return "5".repeat(88);
      },
    }),
    getSignatureStatuses: () => ({
      send: async () => ({ value: [{ err: null, confirmationStatus: "confirmed" }] }),
    }),
    getTokenAccountBalance: () => ({
      send: async () => ({ value: { amount: opts.tokenBalance ?? "1000000000", decimals: 6, uiAmount: 1000 } }),
    }),
  } as never;
};

const keypairFile = async (): Promise<string> => {
  // A real ed25519 keypair: createKeyPairSignerFromBytes rejects a secret
  // whose trailing half is not the matching public key.
  const seed = new Uint8Array(randomBytes(32));
  const signer = await createKeyPairSignerFromPrivateKeyBytes(seed);
  const secret = new Uint8Array(64);
  secret.set(seed);
  secret.set(getAddressEncoder().encode(signer.address), 32);
  const file = join(freshDir(), "keeper.json");
  writeFileSync(file, JSON.stringify([...secret]), "utf8");
  return file;
};

const E2E_RECEIPT = "e2".repeat(32);

const okGateway: Gateway = {
  charge: async (req) => ({
    simulated: false,
    approved: true,
    executionUid: "exe-e2e",
    paymentId: "pay-e2e",
    totalArs: req.totalArs,
    statusCode: "200",
    receiptHash: E2E_RECEIPT,
  }),
};

describe("codama adapter e2e (scripted RPC, real codecs)", () => {
  it("discovers an overdue plan and proposes a charge for it", async () => {
    __resetCodamaGenesisCacheForTests();
    const e = env();
    const plan = planBytes([installment({}), installment({ dueAt: NOW + 10 * 86_400 }), installment({ dueAt: NOW + 40 * 86_400 })]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: null,
      fiadorDataDir: null,
      rpc: fakeRpc({ plans: [{ address: PLAN_ADDR, bytes: plan }] }),
    });
    const config = await adapter.getConfig();
    assert.equal(config.penaltyBps, 500);
    assert.equal(config.guarantorChargeDay, 15);
    const plans = await adapter.listPlans();
    assert.equal(plans.length, 1);
    assert.equal(plans[0].openedAt, OPENED);
    assert.equal(plans[0].status, "Late");
    assert.equal(plans[0].installments[0].status, "Late");
    assert.equal(plans[0].installments[0].markedLate, false);

    const journal = new Journal(e.dataDir);
    const report = await runOnce({ adapter, gateway: okGateway, journal, env: e, now: NOW });
    assert.equal(report.ready, true);
    assert.equal(report.plans, 1);
    assert.equal(report.proposed.length, 1);
    assert.equal(report.proposed[0].kind, "charge");
    // Skipped crank: penalty derived (11_666_500) on top of 233_330_000.
    assert.equal(report.proposed[0].amountMicro, 244_996_500);
  });

  it("marks late on-chain through simulate+send (wire recorded)", async () => {
    __resetCodamaGenesisCacheForTests();
    const sentWires: string[] = [];
    const e = env({ keeperKeypairPath: await keypairFile() });
    const plan = planBytes([installment({ dueAt: NOW - 8 * 86_400 })]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({ plans: [{ address: PLAN_ADDR, bytes: plan }], sentWires }),
    });
    const journal = new Journal(e.dataDir);
    const deps = { adapter, gateway: okGateway, journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    assert.equal(proposed[0].kind, "mark_late");
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "ok");
    assert.ok(report.signature);
    assert.equal(sentWires.length, 1);
    assert.ok(journal.hasTerminal(proposed[0].key));
  });

  it("charges, verifies funding, and registers the recovery end to end", async () => {
    __resetCodamaGenesisCacheForTests();
    const sentWires: string[] = [];
    const fiadorDir = freshDir();
    writeFileSync(
      join(fiadorDir, "fiador-store.json"),
      JSON.stringify({
        version: 1,
        cards: { [STUDENT]: { subscriberId: "sid-e2e", cardLabel: "Visa •••• 1", linked: true } },
        acceptances: { a1: { student: STUDENT, coverageMax: 1_000_000_000, mandateHash: "ab".repeat(32), acceptedAt: NOW - 10 } },
      }),
      "utf8",
    );
    const e = env({ keeperKeypairPath: await keypairFile(), fiadorDataDir: fiadorDir });
    const plan = planBytes([installment({})]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: e.fiadorDataDir,
      rpc: fakeRpc({ plans: [{ address: PLAN_ADDR, bytes: plan }], sentWires }),
    });
    const journal = new Journal(e.dataDir);
    const deps = { adapter, gateway: okGateway, journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const charge = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(charge.status, "ok");
    const follow = await runOnce(deps);
    const recover = follow.proposed.find((p) => p.kind === "recover");
    assert.ok(recover);
    const reg = await executeProposal(deps, { proposalId: recover.id, approvedBy: "operator" });
    assert.equal(reg.status, "ok");
    assert.ok(reg.signature);
    assert.equal(sentWires.length, 1);
    const terminal = journal.readAll().find((r) => r.kind === "RECOVERY_REGISTERED");
    assert.equal(terminal?.receipt, E2E_RECEIPT);
  });

  it("refuses recovery for a stale (non-first-unpaid) index without sending", async () => {
    __resetCodamaGenesisCacheForTests();
    const sentWires: string[] = [];
    const e = env({ keeperKeypairPath: await keypairFile() });
    const plan = planBytes([installment({}), installment({})]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({ plans: [{ address: PLAN_ADDR, bytes: plan }], sentWires }),
    });
    await assert.rejects(adapter.registerRecovery(PLAN_ADDR, 1, 100, "cd".repeat(32)), (err: unknown) => {
      assert.ok(err instanceof CodamaError && err.code === "stale_guard");
      return true;
    });
    assert.equal(sentWires.length, 0);
  });

  it("surfaces ReceiptAlreadyUsed from simulation logs for idempotent sync", async () => {
    __resetCodamaGenesisCacheForTests();
    const e = env({ keeperKeypairPath: await keypairFile() });
    const plan = planBytes([installment({})]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({
        plans: [{ address: PLAN_ADDR, bytes: plan }],
        simulateErr: { InstructionError: [0, { Custom: 6043 }] },
        simulateLogs: ["Program log: AnchorError caused by account: plan. Error Code: ReceiptAlreadyUsed."],
      }),
    });
    await assert.rejects(adapter.registerRecovery(PLAN_ADDR, 0, 100, "cd".repeat(32)), (err: unknown) => {
      assert.ok(err instanceof ReceiptAlreadyUsedError);
      return true;
    });
  });

  it("registers a guarantee once and syncs when it already exists", async () => {
    __resetCodamaGenesisCacheForTests();
    const sentWires: string[] = [];
    const e = env({ keeperKeypairPath: await keypairFile() });
    const { KitGuaranteeChain } = await import("../codama.ts");
    const { executeGuaranteeRegistration } = await import("../guarantee.ts");
    const [guaranteePda] = await findGuaranteePda({ student: STUDENT }, { programAddress: address(PROGRAM) });
    const acceptance = { id: "acc-e2e", student: STUDENT, maxPurchase: 1_000_000_000, coverageMax: 735_000_000, mandateHash: "ab".repeat(32) };

    // Missing guarantee -> simulates + sends exactly once.
    const missing = new KitGuaranteeChain({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({ extra: { [String(guaranteePda)]: null }, sentWires }),
    });
    const journal = new Journal(e.dataDir);
    const first = await executeGuaranteeRegistration({ chain: missing, journal }, { acceptance, approvedBy: "operator" });
    assert.equal(first.status, "ok");
    assert.ok(first.signature);
    assert.equal(sentWires.length, 1);

    // Re-run is a journal no-op (never a duplicate registration).
    const second = await executeGuaranteeRegistration({ chain: missing, journal }, { acceptance, approvedBy: "operator" });
    assert.equal(second.status, "synced");
    assert.equal(sentWires.length, 1);

    // Present guarantee -> synced without sending.
    const presentBytes = new Uint8Array(
      getGuaranteeEncoder().encode({ maxPurchase: 1, coverageMax: 1, mandateHash: new Uint8Array(32).fill(1), active: true, registeredAt: NOW, bump: 1 }),
    );
    const present = new KitGuaranteeChain({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({ extra: { [String(guaranteePda)]: presentBytes }, sentWires }),
    });
    const journal2 = new Journal(freshDir());
    const third = await executeGuaranteeRegistration({ chain: present, journal: journal2 }, { acceptance, approvedBy: "operator" });
    assert.equal(third.status, "synced");
    assert.equal(sentWires.length, 1);
  });

  it("reads the real keeper USDC source balance (zero when unfunded)", async () => {
    __resetCodamaGenesisCacheForTests();
    const e = env({ keeperKeypairPath: await keypairFile() });
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: e.keeperKeypairPath,
      fiadorDataDir: null,
      rpc: fakeRpc({}),
    });
    assert.equal(await adapter.getKeeperUsdcBalance(), 1_000_000_000);
  });

  it("fails closed without a keypair for sends (reads still work)", async () => {
    __resetCodamaGenesisCacheForTests();
    const e = env();
    const plan = planBytes([installment({ dueAt: NOW - 8 * 86_400 })]);
    const adapter = new CodamaAdapter({
      rpcUrl: e.rpcUrl,
      program: PROGRAM,
      keeperKeypairPath: null,
      fiadorDataDir: null,
      rpc: fakeRpc({ plans: [{ address: PLAN_ADDR, bytes: plan }] }),
    });
    assert.equal((await adapter.listPlans()).length, 1);
    await assert.rejects(adapter.markLate(PLAN_ADDR, 0), (err: unknown) => {
      assert.ok(err instanceof CodamaError && err.code === "keeper_key_missing");
      return true;
    });
  });
});

describe("unreachable RPC", () => {
  it("maps unreachable RPC as not-ready, not a crash", async () => {
    __resetCodamaGenesisCacheForTests();
    const e = env();
    const down = {
      getGenesisHash: () => ({ send: async () => { throw new Error("ECONNREFUSED"); } }),
    } as never;
    const adapter = new CodamaAdapter({
      rpcUrl: "https://api.devnet.solana.com",
      program: PROGRAM,
      keeperKeypairPath: null,
      fiadorDataDir: null,
      rpc: down,
    });
    const ready = await adapter.ready();
    assert.equal(ready.ready, false);
    assert.match(ready.reason, /chain_unreachable/);
  });
});
