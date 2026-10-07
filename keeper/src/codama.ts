// Real chain adapter using the generated Codama client (final IDL).
// Runs under tsx (the generated client uses extensionless imports).
// Reads work with RPC access alone; every send needs the keeper keypair
// (KEEPER_KEYPAIR_PATH, loaded lazily, never logged) and goes through
// simulate -> send -> confirm. Devnet genesis is verified (localhost
// excepted for local testing); mainnet URLs never reach this module.
import { readFileSync } from "node:fs";
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { fetchMaybeGuarantee } from "../../app/src/generated/accounts/guarantee";
import { decodePlan, fetchMaybePlan, getPlanSize } from "../../app/src/generated/accounts/plan";
import { decodePayoutSchedule, fetchMaybePayoutSchedule, getPayoutScheduleSize } from "../../app/src/generated/accounts/payoutSchedule";
import { fetchMaybeProtocolConfig } from "../../app/src/generated/accounts/protocolConfig";
import { getCrankMarkLateInstruction } from "../../app/src/generated/instructions/crankMarkLate";
import { getKeeperRegisterGuaranteeInstruction } from "../../app/src/generated/instructions/keeperRegisterGuarantee";
import { getKeeperRegisterRecoveryInstruction } from "../../app/src/generated/instructions/keeperRegisterRecovery";
import { getReleasePayoutInstruction } from "../../app/src/generated/instructions/releasePayout";
// Direct per-file imports: the pdas barrel (index.ts) loads as CJS under tsx
// and loses its named exports, so the barrel must not be imported here.
import { findConfigPda } from "../../app/src/generated/pdas/config.ts";
import { findGuaranteePda } from "../../app/src/generated/pdas/guarantee.ts";
import { findLpJuniorMintPda } from "../../app/src/generated/pdas/lpJuniorMint.ts";
import { findLpSeniorMintPda } from "../../app/src/generated/pdas/lpSeniorMint.ts";
import { findMerchantPda } from "../../app/src/generated/pdas/merchant.ts";
import { findPayoutSchedulePda } from "../../app/src/generated/pdas/payoutSchedule.ts";
import { findPoolPda } from "../../app/src/generated/pdas/pool.ts";
import { findReputationPda } from "../../app/src/generated/pdas/reputation.ts";
import { findVaultPda } from "../../app/src/generated/pdas/vault.ts";
import { ReceiptAlreadyUsedError } from "./adapter.ts";
import type { ChainAdapter, CoverageCap, SubscriberBinding } from "./adapter.ts";
import { readAcceptanceForStudent, readBindingFromStore } from "./adapter.ts";
import { daysPastDue } from "./policy.ts";
import type { InstallmentState, InstallmentView, PayoutScheduleView, PlanView, PolicyConfig } from "./policy.ts";

export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

type Rpc = ReturnType<typeof createSolanaRpc>;

export interface CodamaOptions {
  rpcUrl: string;
  program: string;
  keeperKeypairPath: string | null;
  fiadorDataDir: string | null;
  rpc?: Rpc;
  confirmTimeoutMs?: number;
}

export class CodamaError extends Error {
  readonly code: "chain_unreachable" | "chain_bad_data" | "wrong_cluster" | "keeper_key_missing" | "keeper_key_invalid" | "simulation_failed" | "send_failed" | "confirm_timeout" | "stale_guard";
  constructor(code: CodamaError["code"], message?: string) {
    super(message ?? code);
    this.name = "CodamaError";
    this.code = code;
  }
}

const toSafeInt = (v: bigint | number, field: string): number => {
  const n = typeof v === "bigint" ? Number(v) : v;
  if (!Number.isSafeInteger(n)) throw new CodamaError("chain_bad_data", `chain_bad_data: ${field} overflows`);
  return n;
};

const genesisChecked = new Set<string>();

async function assertDevnet(rpc: Rpc, rpcUrl: string): Promise<void> {
  if (genesisChecked.has(rpcUrl)) return;
  if (/localhost|127\.0\.0\.1/.test(rpcUrl)) return;
  let hash: string;
  try {
    hash = await rpc.getGenesisHash().send();
  } catch (e) {
    throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
  }
  if (hash !== DEVNET_GENESIS_HASH) throw new CodamaError("wrong_cluster", "wrong_cluster: RPC genesis is not devnet");
  genesisChecked.add(rpcUrl);
}

export function __resetCodamaGenesisCacheForTests(): void {
  genesisChecked.clear();
}

export class CodamaAdapter implements ChainAdapter {
  readonly name = "codama:generated-client";
  private rpc: Rpc;
  private rpcUrl: string;
  private program: Address;
  private keypairPath: string | null;
  private fiadorDataDir: string | null;
  private confirmTimeoutMs: number;
  private signerCache: TransactionSigner | null = null;

  constructor(opts: CodamaOptions) {
    this.rpc = opts.rpc ?? createSolanaRpc(opts.rpcUrl);
    this.rpcUrl = opts.rpcUrl;
    this.program = address(opts.program);
    this.keypairPath = opts.keeperKeypairPath;
    this.fiadorDataDir = opts.fiadorDataDir;
    this.confirmTimeoutMs = opts.confirmTimeoutMs ?? 60_000;
  }

  private async genesisGuarded(): Promise<Rpc> {
    await assertDevnet(this.rpc, this.rpcUrl);
    return this.rpc;
  }

  async ready(): Promise<{ ready: boolean; reason: string }> {
    try {
      await this.getConfig();
      return { ready: true, reason: "codama" };
    } catch (e) {
      return { ready: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }

  private async configAccount(): Promise<{
    data: {
      keeper: Address;
      usdcMint: Address;
      penaltyBps: number;
      graceDays: number;
      guarantorChargeDay: number;
      secondsPerDay: number;
    } & Record<string, unknown>;
    address: Address;
  }> {
    const rpc = await this.genesisGuarded();
    const [configPda] = await findConfigPda({ programAddress: this.program });
    let account;
    try {
      account = await fetchMaybeProtocolConfig(rpc, configPda);
    } catch (e) {
      throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
    }
    if (!account.exists) throw new CodamaError("chain_bad_data", "chain_bad_data: ProtocolConfig not initialized");
    return { data: account.data as unknown as Record<string, never> as never, address: configPda };
  }

  async getConfig(): Promise<PolicyConfig> {
    const { data } = await this.configAccount();
    const noticeRaw = (data as Record<string, unknown>).guarantorNoticeDay;
    return {
      graceDays: data.graceDays,
      guarantorNoticeDay: typeof noticeRaw === "number" && Number.isSafeInteger(noticeRaw) ? noticeRaw : null,
      guarantorChargeDay: data.guarantorChargeDay,
      secondsPerDay: data.secondsPerDay,
      penaltyBps: data.penaltyBps,
    };
  }

  async listPlans(): Promise<PlanView[]> {
    const rpc = await this.genesisGuarded();
    const config = await this.getConfig();
    const now = Math.floor(Date.now() / 1000);
    // Discovery: all program accounts with the Plan size; the Plan decoder
    // rejects any other account kind by discriminator.
    let discovered;
    try {
      discovered = await rpc.getProgramAccounts(this.program, { encoding: "base64", filters: [{ dataSize: BigInt(getPlanSize()) }] } as never).send();
    } catch (e) {
      throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
    }
    const out: PlanView[] = [];
    for (const entry of (discovered as unknown as Array<{ pubkey: string; account: { data: [string, string] } }>)) {
      let decoded;
      try {
        const bytes = new Uint8Array(Buffer.from(entry.account.data[0], "base64"));
        decoded = decodePlan({ address: entry.pubkey, data: bytes } as never);
      } catch {
        continue; // Not a Plan account (discriminator mismatch).
      }
      if (!("data" in decoded) || !decoded.data || typeof decoded.data !== "object" || !("student" in decoded.data)) continue;
      const entryAddress = entry.pubkey;
      out.push(((): PlanView => {
        const d = decoded.data as {
          student: Address;
          openedAt: bigint;
          withGuarantee: boolean;
          installments: Array<{ amount: bigint; dueAt: bigint; penalty: bigint; paid: boolean; charged: boolean; markedLate: boolean }>;
        };
        const installments: InstallmentView[] = d.installments.map((inst, index): InstallmentView => {
          const amount = toSafeInt(inst.amount, "amount");
          const penalty = toSafeInt(inst.penalty, "penalty");
          const dueAt = toSafeInt(inst.dueAt, "dueAt");
          let status: InstallmentState;
          if (inst.paid) status = "Paid";
          else if (inst.charged) status = "ChargedToGuarantor";
          else {
            const day = daysPastDue(dueAt, now, config.secondsPerDay);
            status = day < 0 ? "Upcoming" : day === 0 ? "Due" : day <= config.graceDays ? "Grace" : "Late";
          }
          return { index, amount, penalty, dueAt, status, markedLate: inst.markedLate };
        });
        const late = installments.some(
          (i) =>
            i.markedLate ||
            (i.status !== "Paid" && i.status !== "ChargedToGuarantor" && i.status !== "Upcoming" && daysPastDue(i.dueAt, now, config.secondsPerDay) > config.graceDays),
        );
        return {
          id: String(entryAddress),
          student: String(d.student),
          openedAt: toSafeInt(d.openedAt, "openedAt"),
          withGuarantee: d.withGuarantee,
          status: late ? "Late" : "Active",
          installments,
        };
      })());
    }
    return out;
  }

  async listPayoutSchedules(): Promise<PayoutScheduleView[]> {
    const rpc = await this.genesisGuarded();
    let discovered;
    try {
      discovered = await rpc.getProgramAccounts(this.program, {
        encoding: "base64",
        filters: [{ dataSize: BigInt(getPayoutScheduleSize()) }],
      } as never).send();
    } catch (e) {
      throw new CodamaError("chain_unreachable", `chain_unreachable: payout schedules (${e instanceof Error ? e.message : "rpc failed"})`);
    }
    const out: PayoutScheduleView[] = [];
    for (const entry of discovered as unknown as Array<{ pubkey: string; account: { data: [string, string] } }>) {
      try {
        const data = new Uint8Array(Buffer.from(entry.account.data[0], "base64"));
        const decoded = decodePayoutSchedule({ address: entry.pubkey, data } as never);
        if (!("data" in decoded) || !decoded.data) continue;
        out.push({
          address: entry.pubkey,
          planId: String(decoded.data.plan),
          merchant: String(decoded.data.merchant),
          tranches: decoded.data.tranches.slice(0, decoded.data.trancheCount).map((tranche, index) => ({
            index,
            amountMicro: toSafeInt(tranche.amount, "payout.amount"),
            releaseAt: toSafeInt(tranche.releaseAt, "payout.release_at"),
            released: tranche.released,
          })),
        });
      } catch {
        continue;
      }
    }
    return out;
  }

  /** Builds the permissionless crank instruction without signing or sending. */
  async buildReleasePayoutInstruction(planId: string, index: number, caller: TransactionSigner): Promise<Instruction> {
    if (!Number.isInteger(index) || index < 0 || index > 2) {
      throw new CodamaError("chain_bad_data", "chain_bad_data: payout index must be 0, 1, or 2");
    }
    const rpc = await this.genesisGuarded();
    const plan = address(planId);
    const [scheduleAddress] = await findPayoutSchedulePda({ plan }, { programAddress: this.program });
    const schedule = await fetchMaybePayoutSchedule(rpc, scheduleAddress).catch((e: unknown) => {
      throw new CodamaError("chain_unreachable", `chain_unreachable: payout schedule (${e instanceof Error ? e.message : "rpc failed"})`);
    });
    if (!schedule.exists) throw new CodamaError("chain_bad_data", `chain_bad_data: payout schedule for ${planId} not found`);
    if (index >= schedule.data.trancheCount) throw new CodamaError("chain_bad_data", "chain_bad_data: payout index is outside the schedule");
    const { data: config, address: configAddress } = await this.configAccount();
    const [pool] = await findPoolPda({ usdcMint: config.usdcMint }, { programAddress: this.program });
    const [vault] = await findVaultPda({ pool }, { programAddress: this.program });
    const [merchant] = await findMerchantPda({ merchantWallet: schedule.data.merchant }, { programAddress: this.program });
    const [merchantAta] = await findAssociatedTokenPda({
      mint: config.usdcMint,
      owner: schedule.data.merchant,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    return getReleasePayoutInstruction({
      caller,
      config: configAddress,
      pool,
      vault,
      usdcMint: config.usdcMint,
      merchantWallet: schedule.data.merchant,
      merchant,
      schedule: scheduleAddress,
      merchantAta,
      index,
    }, { programAddress: this.program });
  }

  async getBinding(student: string): Promise<SubscriberBinding | null> {
    return readBindingFromStore(this.fiadorDataDir, student);
  }

  async getCoverageCap(student: string): Promise<CoverageCap | null> {
    return readAcceptanceForStudent(this.fiadorDataDir, student);
  }

  async getKeeperUsdcBalance(): Promise<number> {
    const rpc = await this.genesisGuarded();
    const { data } = await this.configAccount();
    const keeper = await this.keeperAddress();
    const [ata] = await findAssociatedTokenPda({ mint: data.usdcMint, owner: keeper, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    let res;
    try {
      res = await rpc.getTokenAccountBalance(ata).send();
    } catch {
      return 0; // Missing/unfunded ATA reads as zero.
    }
    const amount = BigInt(res.value.amount);
    if (amount > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new CodamaError("chain_bad_data", "chain_bad_data: keeper balance overflows");
    }
    return Number(amount);
  }

  private async keeperSigner(): Promise<TransactionSigner> {
    if (this.signerCache) return this.signerCache;
    if (!this.keypairPath) {
      throw new CodamaError("keeper_key_missing", "keeper_key_missing: set KEEPER_KEYPAIR_PATH to sign");
    }
    let raw: string;
    try {
      raw = readFileSync(this.keypairPath, "utf8");
    } catch {
      throw new CodamaError("keeper_key_missing", `keeper_key_missing: cannot read keypair file`);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new CodamaError("keeper_key_invalid", "keeper_key_invalid: keypair file is not JSON");
    }
    if (!Array.isArray(parsed) || parsed.length !== 64 || !parsed.every((n) => typeof n === "number")) {
      throw new CodamaError("keeper_key_invalid", "keeper_key_invalid: expected 64 secret-key bytes");
    }
    this.signerCache = await createKeyPairSignerFromBytes(new Uint8Array(parsed));
    return this.signerCache;
  }

  private async keeperAddress(): Promise<Address> {
    return (await this.keeperSigner()).address;
  }

  private async sendInstructions(ixs: Instruction[], label: string): Promise<string> {
    const rpc = await this.genesisGuarded();
    const signer = await this.keeperSigner();
    const { value: latest } = await rpc.getLatestBlockhash().send().catch((e: unknown) => {
      throw new CodamaError("chain_unreachable", `chain_unreachable: no blockhash (${e instanceof Error ? e.message : "rpc failed"})`);
    });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latest, m),
      (m) => appendTransactionMessageInstructions(ixs, m),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const wire = getBase64EncodedWireTransaction(signed);
    const sim = await rpc
      .simulateTransaction(wire, { encoding: "base64", sigVerify: true, replaceRecentBlockhash: false, innerInstructions: false })
      .send()
      .catch((e: unknown) => {
        throw new CodamaError("chain_unreachable", `chain_unreachable: simulation failed (${e instanceof Error ? e.message : "rpc failed"})`);
      });
    if (sim.value.err) {
      const logs = (sim.value.logs ?? []).join("\n");
      if (/ReceiptAlreadyUsed|6043/.test(logs)) throw new ReceiptAlreadyUsedError();
      throw new CodamaError("simulation_failed", `${label}: simulation failed (${JSON.stringify(sim.value.err)}). Logs: ${logs.slice(-800)}`);
    }
    const signature = await rpc
      .sendTransaction(wire, { encoding: "base64", preflightCommitment: "confirmed" })
      .send()
      .catch((e: unknown) => {
        throw new CodamaError("send_failed", `${label}: send failed (${e instanceof Error ? e.message : "rpc failed"})`);
      });
    await this.confirm(String(signature));
    return String(signature);
  }

  private async confirm(signature: string): Promise<void> {
    const deadline = Date.now() + this.confirmTimeoutMs;
    for (;;) {
      const res = await this.rpc.getSignatureStatuses([signature as never]).send().catch(() => null);
      const status = (res as { value?: Array<{ err?: unknown; confirmationStatus?: string } | null> } | null)?.value?.[0] ?? null;
      if (status?.err) {
        const logs = JSON.stringify(status.err);
        if (/ReceiptAlreadyUsed|6043/.test(logs)) throw new ReceiptAlreadyUsedError();
        throw new CodamaError("send_failed", `transaction failed on-chain: ${logs}`);
      }
      if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") return;
      if (Date.now() > deadline) {
        throw new CodamaError("confirm_timeout", `confirm_timeout: ${signature} unconfirmed after ${this.confirmTimeoutMs}ms`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  private async fetchPlanOrThrow(planId: string): Promise<{ address: Address; student: Address }> {
    const rpc = await this.genesisGuarded();
    const planAddress = address(planId);
    const account = await fetchMaybePlan(rpc, planAddress).catch((e: unknown) => {
      throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
    });
    if (!account.exists) throw new CodamaError("chain_bad_data", `chain_bad_data: plan ${planId} not found`);
    return { address: planAddress, student: account.data.student };
  }

  async markLate(planId: string, installment: number): Promise<{ signature: string } | { pending: string }> {
    const { address: planAddress, student } = await this.fetchPlanOrThrow(planId);
    const { address: configPda } = await this.configAccount();
    const ix = getCrankMarkLateInstruction(
      { crank: await this.keeperSigner(), config: configPda, student, plan: planAddress, installmentIndex: installment },
      { programAddress: this.program },
    );
    const signature = await this.sendInstructions([ix], `crank_mark_late plan=${planId} ix=${installment}`);
    return { signature };
  }

  async registerRecovery(
    planId: string,
    installment: number,
    amountMicro: number,
    receiptHash: string,
  ): Promise<{ signature: string } | { pending: string }> {
    if (!/^[0-9a-f]{64}$/.test(receiptHash) || receiptHash === "00".repeat(32)) {
      throw new CodamaError("chain_bad_data", "chain_bad_data: receipt must be a fresh nonzero 32-byte hash");
    }
    void amountMicro;
    // Stale guard: the program accepts the FIRST unpaid index only.
    const rpc = await this.genesisGuarded();
    const planAddress = address(planId);
    const planAccount = await fetchMaybePlan(rpc, planAddress).catch((e: unknown) => {
      throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
    });
    if (!planAccount.exists) throw new CodamaError("chain_bad_data", `chain_bad_data: plan ${planId} not found`);
    const firstUnpaid = planAccount.data.installments.findIndex((i) => !i.paid && !i.charged);
    if (firstUnpaid === -1) throw new CodamaError("stale_guard", "stale_guard: plan has no unpaid installment");
    if (firstUnpaid !== installment) {
      throw new CodamaError("stale_guard", `stale_guard: first unpaid is ${firstUnpaid}, proposal targets ${installment}`);
    }
    const { data: config, address: configPda } = await this.configAccount();
    const student = planAccount.data.student;
    const [poolPda] = await findPoolPda({ usdcMint: config.usdcMint }, { programAddress: this.program });
    const [vaultPda] = await findVaultPda({ pool: poolPda }, { programAddress: this.program });
    const [lpJunior] = await findLpJuniorMintPda({ pool: poolPda }, { programAddress: this.program });
    const [lpSenior] = await findLpSeniorMintPda({ pool: poolPda }, { programAddress: this.program });
    const [reputationPda] = await findReputationPda({ student }, { programAddress: this.program });
    const keeper = await this.keeperAddress();
    const [keeperAta] = await findAssociatedTokenPda({ mint: config.usdcMint, owner: keeper, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const receiptBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) receiptBytes[i] = parseInt(receiptHash.slice(i * 2, i * 2 + 2), 16);
    const ix = getKeeperRegisterRecoveryInstruction(
      {
        keeper: await this.keeperSigner(),
        config: configPda,
        pool: poolPda,
        vault: vaultPda,
        usdcMint: config.usdcMint,
        lpJuniorMint: lpJunior,
        lpSeniorMint: lpSenior,
        keeperUsdcAta: keeperAta,
        student,
        reputation: reputationPda,
        plan: planAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
        installmentIndex: installment,
        receiptHash: receiptBytes,
      },
      { programAddress: this.program },
    );
    const signature = await this.sendInstructions([ix], `keeper_register_recovery plan=${planId} ix=${installment}`);
    return { signature };
  }

  /** Public for the guarantee CLI: does a Guarantee account already exist? */
  async guaranteeState(student: string): Promise<{ exists: boolean }> {
    const rpc = await this.genesisGuarded();
    const [pda] = await findGuaranteePda({ student: address(student) }, { programAddress: this.program });
    const account = await fetchMaybeGuarantee(rpc, pda).catch((e: unknown) => {
      throw new CodamaError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
    });
    return { exists: account.exists };
  }

  /** Public for the guarantee CLI: simulate + send keeper_register_guarantee. */
  async sendGuaranteeRegistration(student: string, args: GuaranteeArgs): Promise<{ signature: string } | { alreadyRegistered: true }> {
    if ((await this.guaranteeState(student)).exists) return { alreadyRegistered: true };
    if (!/^[0-9a-f]{64}$/.test(args.mandateHash) || args.mandateHash === "00".repeat(32)) {
      throw new CodamaError("chain_bad_data", "chain_bad_data: mandate hash must be a nonzero 32-byte hash");
    }
    const { address: configPda } = await this.configAccount();
    const [guaranteePda] = await findGuaranteePda({ student: address(student) }, { programAddress: this.program });
    const hashBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) hashBytes[i] = parseInt(args.mandateHash.slice(i * 2, i * 2 + 2), 16);
    const ix = getKeeperRegisterGuaranteeInstruction(
      {
        keeper: await this.keeperSigner(),
        config: configPda,
        student: address(student),
        guarantee: guaranteePda,
        systemProgram: address(SYSTEM_PROGRAM),
        maxPurchase: args.maxPurchase,
        coverageMax: args.coverageMax,
        mandateHash: hashBytes,
      },
      { programAddress: this.program },
    );
    const signature = await this.sendInstructions([ix], `keeper_register_guarantee student=${student}`);
    return { signature };
  }
}

export interface GuaranteeArgs {
  maxPurchase: number;
  coverageMax: number;
  mandateHash: string;
}

export interface GuaranteeChain {
  fetchGuarantee(student: string): Promise<{ exists: boolean }>;
  registerGuarantee(student: string, args: GuaranteeArgs): Promise<{ signature: string } | { alreadyRegistered: true }>;
}

export class KitGuaranteeChain implements GuaranteeChain {
  private adapter: CodamaAdapter;
  constructor(opts: CodamaOptions) {
    this.adapter = new CodamaAdapter(opts);
  }

  async fetchGuarantee(student: string): Promise<{ exists: boolean }> {
    return this.adapter.guaranteeState(student);
  }

  async registerGuarantee(student: string, args: GuaranteeArgs): Promise<{ signature: string } | { alreadyRegistered: true }> {
    return this.adapter.sendGuaranteeRegistration(student, args);
  }
}
