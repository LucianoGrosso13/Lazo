// Server-side chain reads via the generated Codama client (read-only).
// Used to recompute quotes server-side from ProtocolConfig: the accept flow
// never trusts client-attested coverage numbers.
//
// Safety: devnet genesis is verified (localhost excepted for local testing;
// mainnet is refused by URL). Bigints are range-checked into safe integers.
// The notice-day field is mapped only when the chain actually carries it
// — never hardcoded; null skips notify actions.
import { address, createSolanaRpc, type Address } from "@solana/kit";
import { fetchMaybeProtocolConfig } from "@/generated/accounts/protocolConfig";
import { fetchMaybeReputation } from "@/generated/accounts/reputation";
import { findConfigPda, findReputationPda } from "@/generated/pdas";

export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

export type ChainCode =
  | "chain_not_configured"
  | "chain_unreachable"
  | "chain_bad_data"
  | "wrong_cluster";

export class ChainError extends Error {
  constructor(
    public readonly code: ChainCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ChainError";
  }
}

export type QuoteCode = "exceeds_tier_max" | "invalid_price";

export class QuoteError extends Error {
  constructor(
    public readonly code: QuoteCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "QuoteError";
  }
}

export interface ChainTier {
  downPaymentBps: number;
  guarantorCoverageBps: number;
  maxPurchase: number;
}

export interface ServerProtocolConfig {
  keeper: string;
  state: "Normal" | "Halted" | "WithdrawsOnly";
  penaltyBps: number;
  graceDays: number;
  guarantorChargeDay: number;
  /** Null until the chain field lands; notify actions skip meanwhile. */
  guarantorNoticeDay: number | null;
  secondsPerDay: number;
  installmentIntervalDays: number;
  minFinancedToCount: number;
  guaranteedTiers: [ChainTier, ChainTier, ChainTier, ChainTier];
}

export interface StudentTier {
  tier: number;
  source: "chain" | "default";
  lateCount: number;
  /** late_count > 0 gates new plans on-chain. */
  canOpenPlan: boolean;
}

export interface ServerQuote {
  tier: number;
  tierSource: "chain" | "default";
  downPayment: number;
  financed: number;
  requiredCoverage: number;
  canOpenPlan: boolean;
}

export type RpcLike = ReturnType<typeof createSolanaRpc>;

function rpcUrlFromEnv(): string {
  if (typeof window !== "undefined") throw new ChainError("chain_not_configured", "server-only");
  const url = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEVNET_RPC_URL;
  if (/mainnet/i.test(url)) {
    throw new ChainError("wrong_cluster", `wrong_cluster: RPC refused, devnet only`);
  }
  return url;
}

function programFromEnv(): Address {
  const raw = process.env.NEXT_PUBLIC_CUOTAS_PROGRAM_ID;
  if (!raw) throw new ChainError("chain_not_configured", "chain_not_configured: set NEXT_PUBLIC_CUOTAS_PROGRAM_ID");
  try {
    return address(raw);
  } catch {
    throw new ChainError("chain_not_configured", "chain_not_configured: NEXT_PUBLIC_CUOTAS_PROGRAM_ID is invalid");
  }
}

const genesisChecked = new Set<string>();

async function assertDevnetGenesis(rpc: RpcLike, rpcUrl: string): Promise<void> {
  if (genesisChecked.has(rpcUrl)) return;
  if (/localhost|127\.0\.0\.1/.test(rpcUrl)) return; // local testing carries no real funds
  let hash: string;
  try {
    hash = await rpc.getGenesisHash().send();
  } catch (e) {
    throw new ChainError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
  }
  if (hash !== DEVNET_GENESIS_HASH) {
    throw new ChainError("wrong_cluster", "wrong_cluster: RPC genesis is not devnet");
  }
  genesisChecked.add(rpcUrl);
}

export function __resetGenesisCacheForTests(): void {
  genesisChecked.clear();
}

function toSafeInt(v: bigint | number, field: string): number {
  const n = typeof v === "bigint" ? Number(v) : v;
  if (!Number.isSafeInteger(n)) {
    throw new ChainError("chain_bad_data", `chain_bad_data: ${field} overflows safe integer`);
  }
  return n;
}

/** Pure mapping from a decoded config account. Notice day only when present. */
export function mapProtocolConfig(data: Record<string, unknown>): ServerProtocolConfig {
  const num = (v: unknown, field: string): number => {
    if (typeof v !== "number" || !Number.isSafeInteger(v)) {
      throw new ChainError("chain_bad_data", `chain_bad_data: ${field} is not an integer`);
    }
    return v;
  };
  const stateRaw = num(data.state, "state");
  const state = stateRaw === 0 ? "Normal" : stateRaw === 1 ? "Halted" : stateRaw === 2 ? "WithdrawsOnly" : null;
  if (!state) throw new ChainError("chain_bad_data", "chain_bad_data: unknown protocol state");
  const tiersRaw = data.guaranteedTiers;
  if (!Array.isArray(tiersRaw) || tiersRaw.length !== 4) {
    throw new ChainError("chain_bad_data", "chain_bad_data: guaranteedTiers must have 4 entries");
  }
  const tiers = tiersRaw.map((t): ChainTier => {
    if (typeof t !== "object" || t === null) throw new ChainError("chain_bad_data", "chain_bad_data: bad tier");
    const r = t as Record<string, unknown>;
    return {
      downPaymentBps: num(r.downPaymentBps, "downPaymentBps"),
      guarantorCoverageBps: num(r.guarantorCoverageBps, "guarantorCoverageBps"),
      maxPurchase: toSafeInt(r.maxPurchase as bigint | number, "maxPurchase"),
    };
  }) as [ChainTier, ChainTier, ChainTier, ChainTier];
  // Defensive: the codec always carries it since the regen; absent stays null.
  const noticeRaw = (data as { guarantorNoticeDay?: unknown }).guarantorNoticeDay;
  const guarantorNoticeDay =
    typeof noticeRaw === "number" && Number.isSafeInteger(noticeRaw) ? noticeRaw : null;
  if (typeof data.keeper !== "string") throw new ChainError("chain_bad_data", "chain_bad_data: keeper");
  return {
    keeper: data.keeper,
    state,
    penaltyBps: num(data.penaltyBps, "penaltyBps"),
    graceDays: num(data.graceDays, "graceDays"),
    guarantorChargeDay: num(data.guarantorChargeDay, "guarantorChargeDay"),
    guarantorNoticeDay,
    secondsPerDay: num(data.secondsPerDay, "secondsPerDay"),
    installmentIntervalDays: num(data.installmentIntervalDays, "installmentIntervalDays"),
    minFinancedToCount: toSafeInt(data.minFinancedToCount as bigint | number, "minFinancedToCount"),
    guaranteedTiers: tiers,
  };
}

/**
 * Server quote for a purchase cap at the student's tier (guaranteed track).
 * Floor math mirrors the program; the cap must fit the tier maximum.
 */
export function serverQuoteForCap(config: ServerProtocolConfig, tier: number, maxPurchase: number): Omit<ServerQuote, "tierSource" | "canOpenPlan"> {
  if (!Number.isSafeInteger(tier) || tier < 0 || tier > 3) {
    throw new ChainError("chain_bad_data", `chain_bad_data: tier ${tier} out of range`);
  }
  if (!Number.isSafeInteger(maxPurchase) || maxPurchase <= 0) {
    throw new QuoteError("invalid_price", "invalid_price: maxPurchase must be a positive integer");
  }
  const t = config.guaranteedTiers[tier];
  if (maxPurchase > t.maxPurchase) {
    throw new QuoteError("exceeds_tier_max", `exceeds_tier_max: cap above the tier-${tier} maximum`);
  }
  const downPayment = Math.floor((maxPurchase * t.downPaymentBps) / 10_000);
  const financed = maxPurchase - downPayment;
  if (financed <= 0) throw new QuoteError("invalid_price", "invalid_price: financed must be positive");
  const requiredCoverage = Math.floor((financed * t.guarantorCoverageBps) / 10_000);
  return { tier, downPayment, financed, requiredCoverage };
}

export interface ChainImpl {
  getConfig(): Promise<ServerProtocolConfig>;
  getStudentTier(student: string): Promise<StudentTier>;
}

/** Injectable-transport config read (production passes a real RPC). */
export async function readProtocolConfigWithRpc(rpc: RpcLike, program: Address): Promise<ServerProtocolConfig> {
  const [configPda] = await findConfigPda({ programAddress: program });
  let account;
  try {
    account = await fetchMaybeProtocolConfig(rpc, configPda);
  } catch (e) {
    if (e instanceof ChainError) throw e;
    throw new ChainError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
  }
  if (!account.exists) {
    throw new ChainError("chain_bad_data", "chain_bad_data: ProtocolConfig not initialized on this cluster");
  }
  return mapProtocolConfig(account.data as unknown as Record<string, unknown>);
}

/** Injectable-transport tier read (production passes a real RPC). */
export async function readStudentTierWithRpc(rpc: RpcLike, program: Address, student: string): Promise<StudentTier> {
  let studentAddr: Address;
  try {
    studentAddr = address(student);
  } catch {
    throw new ChainError("chain_bad_data", "chain_bad_data: student is not an address");
  }
  const [reputationPda] = await findReputationPda({ student: studentAddr }, { programAddress: program });
  let account;
  try {
    account = await fetchMaybeReputation(rpc, reputationPda);
  } catch (e) {
    if (e instanceof ChainError) throw e;
    throw new ChainError("chain_unreachable", `chain_unreachable: ${e instanceof Error ? e.message : "rpc failed"}`);
  }
  if (!account.exists) {
    // No reputation yet: quotes as a new tier-0 student (what their first
    // plan would use after student_init). Explicitly marked, not hidden.
    return { tier: 0, source: "default", lateCount: 0, canOpenPlan: true };
  }
  const data = account.data;
  if (data.tier < 0 || data.tier > 3) {
    throw new ChainError("chain_bad_data", `chain_bad_data: tier ${data.tier} out of range`);
  }
  return { tier: data.tier, source: "chain", lateCount: data.lateCount, canOpenPlan: data.lateCount === 0 };
}

/** Genesis-checked RPC + program address for server chain access. */
export async function chainRpc(): Promise<{ rpc: RpcLike; program: Address }> {
  const rpcUrl = rpcUrlFromEnv();
  const rpc = createSolanaRpc(rpcUrl);
  await assertDevnetGenesis(rpc, rpcUrl);
  return { rpc, program: programFromEnv() };
}

const realImpl: ChainImpl = {
  async getConfig(): Promise<ServerProtocolConfig> {
    const { rpc, program } = await chainRpc();
    return readProtocolConfigWithRpc(rpc, program);
  },
  async getStudentTier(student: string): Promise<StudentTier> {
    const { rpc, program } = await chainRpc();
    return readStudentTierWithRpc(rpc, program, student);
  },
};

let impl: ChainImpl = realImpl;

/** Test seam: swap the chain implementation (vitest isolates per file). */
export function __setChainImplForTests(fake: ChainImpl): void {
  impl = fake;
}

export function __resetChainImplForTests(): void {
  impl = realImpl;
}

export function getChainConfig(): Promise<ServerProtocolConfig> {
  return impl.getConfig();
}

export function getStudentTier(student: string): Promise<StudentTier> {
  return impl.getStudentTier(student);
}

/** Full server quote: chain config + student tier + floor math. */
export async function serverQuote(student: string, maxPurchase: number): Promise<ServerQuote> {
  const [config, t] = await Promise.all([getChainConfig(), getStudentTier(student)]);
  const q = serverQuoteForCap(config, t.tier, maxPurchase);
  return { ...q, tierSource: t.source, canOpenPlan: t.canOpenPlan };
}
