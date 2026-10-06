// Chain adapters: the keeper polls plans and sends keeper transactions
// through this interface. The generated Codama client is pending with the
// client worker, so the default adapter is an explicit stub: it reports
// "pending_client" and the loop proposes nothing (no fabricated plans).
// Tests and future real implementations inject their own adapter.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PlanView, PolicyConfig } from "./policy.ts";

export type { PlanView, PolicyConfig };

export interface SubscriberBinding {
  subscriberId: string;
  cardLabel: string | null;
  linked: boolean;
}

export interface CoverageCap {
  coverageMax: number;
  mandateHash: string;
  acceptedAt: number;
}

/** Thrown when the program reports ReceiptAlreadyUsed (6043): the receipt is on-chain. */
export class ReceiptAlreadyUsedError extends Error {
  constructor(message?: string) {
    super(message ?? "ReceiptAlreadyUsed: receipt already recorded on the plan");
    this.name = "ReceiptAlreadyUsedError";
  }
}

export interface ChainAdapter {
  readonly name: string;
  /** False while the adapter cannot read or write the chain. */
  ready(): Promise<{ ready: boolean; reason: string }>;
  getConfig(): Promise<PolicyConfig>;
  /** Active/Late plans with their installments. */
  listPlans(): Promise<PlanView[]>;
  /** Guarantor subscriber binding for a student (off-chain store). */
  getBinding(student: string): Promise<SubscriberBinding | null>;
  /**
   * Accepted surety cap for a student (immutable acceptance record).
   * Optional: adapters without it fall back to the fiador store file.
   */
  getCoverageCap?(student: string): Promise<CoverageCap | null>;
  /** Keeper USDC source (ATA) balance, base units. Pre-funding check. */
  getKeeperUsdcBalance(): Promise<number>;
  /** crank_mark_late. Returns a signature or a pending reason. */
  markLate(planId: string, installment: number): Promise<{ signature: string } | { pending: string }>;
  /**
   * keeper_register_recovery: funds `amountMicro` from the keeper USDC
   * source and records `receiptHash` (SHA-256 of the verified processor
   * receipt; fresh and nonzero per call). Returns a signature or a pending
   * reason. Never invents a signature. Throws ReceiptAlreadyUsedError when
   * the program reports the receipt is already recorded (idempotent sync).
   */
  registerRecovery(
    planId: string,
    installment: number,
    amountMicro: number,
    receiptHash: string,
  ): Promise<{ signature: string } | { pending: string }>;
}

/** Default adapter: explicit "pending client", zero chain access. */
export class StubAdapter implements ChainAdapter {
  readonly name = "stub:pending-client";
  async ready(): Promise<{ ready: boolean; reason: string }> {
    return { ready: false, reason: "pending_client: the Codama client is pending with the client worker" };
  }
  async getConfig(): Promise<PolicyConfig> {
    throw new Error("pending_client: no chain config without the generated client");
  }
  async listPlans(): Promise<PlanView[]> {
    throw new Error("pending_client: no chain reads without the generated client");
  }
  async getBinding(_student: string): Promise<SubscriberBinding | null> {
    return null;
  }
  async getKeeperUsdcBalance(): Promise<number> {
    throw new Error("pending_client: no chain reads without the generated client");
  }
  async markLate(_planId: string, _installment: number): Promise<{ pending: string }> {
    return { pending: "pending_client: crank_mark_late is pending with the program worker" };
  }
  async registerRecovery(
    _planId: string,
    _installment: number,
    _amountMicro: number,
    _receiptHash: string,
  ): Promise<{ pending: string }> {
    return { pending: "pending_client: keeper_register_recovery is pending with the program worker" };
  }
}

export interface MockAdapterScript {
  config: PolicyConfig;
  plans: PlanView[];
  bindings: Record<string, SubscriberBinding>;
  coverageCaps?: Record<string, CoverageCap>;
  /** Keeper USDC source balance. Defaults to 0 (fail closed). */
  keeperBalance?: number;
  /** When set, effect calls return these instead of signatures. */
  pendingMarkLate?: string;
  pendingRecovery?: string;
  failMarkLate?: string;
  failRecovery?: string;
  /** When true, registerRecovery throws ReceiptAlreadyUsedError. */
  receiptAlreadyUsed?: boolean;
}

/** Scripted adapter for tests and local demos (no chain). */
export class MockAdapter implements ChainAdapter {
  readonly name = "mock";
  readonly calls: Array<{ method: string; args: unknown[] }> = [];
  private script: MockAdapterScript;
  constructor(script: MockAdapterScript) {
    this.script = script;
  }
  async ready(): Promise<{ ready: boolean; reason: string }> {
    return { ready: true, reason: "mock" };
  }
  async getConfig(): Promise<PolicyConfig> {
    return this.script.config;
  }
  async listPlans(): Promise<PlanView[]> {
    return structuredClone(this.script.plans);
  }
  async getBinding(student: string): Promise<SubscriberBinding | null> {
    return this.script.bindings[student] ?? null;
  }
  async getCoverageCap(student: string): Promise<CoverageCap | null> {
    return this.script.coverageCaps?.[student] ?? null;
  }
  async getKeeperUsdcBalance(): Promise<number> {
    return this.script.keeperBalance ?? 0;
  }
  async markLate(planId: string, installment: number): Promise<{ signature: string } | { pending: string }> {
    this.calls.push({ method: "markLate", args: [planId, installment] });
    if (this.script.failMarkLate) throw new Error(this.script.failMarkLate);
    if (this.script.pendingMarkLate) return { pending: this.script.pendingMarkLate };
    return { signature: `mock-mark-late-${planId}-${installment}` };
  }
  async registerRecovery(
    planId: string,
    installment: number,
    amountMicro: number,
    receiptHash: string,
  ): Promise<{ signature: string } | { pending: string }> {
    this.calls.push({ method: "registerRecovery", args: [planId, installment, amountMicro, receiptHash] });
    if (this.script.failRecovery) throw new Error(this.script.failRecovery);
    if (this.script.receiptAlreadyUsed) throw new ReceiptAlreadyUsedError();
    if (this.script.pendingRecovery) return { pending: this.script.pendingRecovery };
    return { signature: `mock-recovery-${planId}-${installment}` };
  }
}

// --- Fiador store reader ------------------------------------------------------
// Read-only view of the Next.js file store (app data dir, schema version 1):
// maps students to their Mobbex subscriber. The keeper never writes it.

interface FiadorStoreFile {
  version: number;
  cards: Record<string, { subscriberId?: unknown; cardLabel?: unknown; linked?: unknown }>;
  acceptances: Record<
    string,
    { student?: unknown; coverageMax?: unknown; mandateHash?: unknown; acceptedAt?: unknown }
  >;
}

export interface AcceptanceRecord {
  id: string;
  student: string;
  maxPurchase: number;
  coverageMax: number;
  mandateHash: string;
}

/** Full acceptance record by id (for the guarantee CLI). */
export function readAcceptanceById(fiadorDataDir: string | null, id: string): AcceptanceRecord | null {
  if (!fiadorDataDir) return null;
  const file = join(fiadorDataDir, "fiador-store.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<FiadorStoreFile>;
    if (parsed.version !== 1 || !parsed.acceptances) return null;
    const a = parsed.acceptances[id] as
      | { id?: unknown; student?: unknown; maxPurchase?: unknown; coverageMax?: unknown; mandateHash?: unknown }
      | undefined;
    if (!a || typeof a.student !== "string" || typeof a.mandateHash !== "string") return null;
    if (typeof a.maxPurchase !== "number" || typeof a.coverageMax !== "number") return null;
    if (!Number.isSafeInteger(a.maxPurchase) || !Number.isSafeInteger(a.coverageMax)) return null;
    return { id, student: a.student, maxPurchase: a.maxPurchase, coverageMax: a.coverageMax, mandateHash: a.mandateHash };
  } catch {
    return null;
  }
}

/** Latest accepted surety cap for a student (immutable acceptance binding). */
export function readAcceptanceForStudent(fiadorDataDir: string | null, student: string): CoverageCap | null {
  if (!fiadorDataDir) return null;
  const file = join(fiadorDataDir, "fiador-store.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<FiadorStoreFile>;
    if (parsed.version !== 1 || !parsed.acceptances) return null;
    let best: CoverageCap | null = null;
    for (const a of Object.values(parsed.acceptances)) {
      if (a.student !== student) continue;
      if (typeof a.coverageMax !== "number" || !Number.isSafeInteger(a.coverageMax) || a.coverageMax <= 0) continue;
      if (typeof a.mandateHash !== "string" || !a.mandateHash) continue;
      if (typeof a.acceptedAt !== "number") continue;
      if (!best || a.acceptedAt > best.acceptedAt) {
        best = { coverageMax: a.coverageMax, mandateHash: a.mandateHash, acceptedAt: a.acceptedAt };
      }
    }
    return best;
  } catch {
    return null;
  }
}

export function readBindingFromStore(fiadorDataDir: string | null, student: string): SubscriberBinding | null {
  if (!fiadorDataDir) return null;
  const file = join(fiadorDataDir, "fiador-store.json");
  if (!existsSync(file)) return null;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<FiadorStoreFile>;
    if (parsed.version !== 1 || !parsed.cards) return null;
    const card = parsed.cards[student];
    if (!card || typeof card.subscriberId !== "string" || !card.subscriberId) return null;
    return {
      subscriberId: card.subscriberId,
      cardLabel: typeof card.cardLabel === "string" ? card.cardLabel : null,
      linked: card.linked === true,
    };
  } catch {
    return null;
  }
}
