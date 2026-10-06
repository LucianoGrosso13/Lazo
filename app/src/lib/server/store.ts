// File-backed demo store for off-chain guarantor state. Single JSON document,
// atomic writes (tmp + rename). Tokens are bearer credentials: only their
// SHA-256 is ever stored. Never stores PAN/CVV, API keys, or KYC documents —
// only statuses, references, and display labels (brand + last4).
//
// Local demo durability only (default dir is the OS temp dir; FIADOR_DATA_DIR
// overrides). Production needs durable KV; the interface is injectable so
// routes and tests share it.
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fiadorDataDir } from "./env";

export type StoreCode = "corrupt_store" | "store_busy" | "ephemeral_store_refused";

export class StoreError extends Error {
  constructor(
    public readonly code: StoreCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "StoreError";
  }
}

export const sha256hex = (s: string): string => createHash("sha256").update(s, "utf8").digest("hex");

/** Opaque store key for a bearer token. The token itself is never stored. */
export const tokenKey = (token: string): string => `sha256:${sha256hex(token)}`;

export interface CompletionRecord {
  student: string;
  completedAt: number;
  acceptanceId: string;
}

export interface KycRecord {
  tokenKey: string;
  student: string;
  sessionId: string;
  /** Last status reported by Didit (decision API or verified webhook). */
  status: string;
  /** True only after GET decision confirms Approved (webhook-then-fetch). */
  approvedConfirmed: boolean;
  updatedAt: number;
}

export interface CardRecord {
  student: string;
  tokenKey: string;
  subscriberId: string;
  /** Hosted Mobbex card-entry URL (not a secret; idempotent retries need it). */
  sourceUrl: string | null;
  /** Display only, e.g. "Visa •••• 0010". Never a full number. */
  cardLabel: string | null;
  linked: boolean;
  updatedAt: number;
}

export interface AcceptanceRecord {
  id: string;
  student: string;
  tokenKey: string;
  maxPurchase: number;
  coverageMax: number;
  /** Client-attested required coverage the accepted cap was checked against. */
  requiredCoverage: number;
  mandateHash: string;
  mandateText: string;
  guarantorName: string;
  kycSessionId: string;
  subscriberId: string;
  cardLabel: string | null;
  acceptedAt: number;
  /** On-chain registration state. Never pretends a tx that was not sent. */
  registeredSignature: string | null;
}

export interface WebhookRecord {
  receivedAt: number;
  key: string;
}

export interface ChargeRecord {
  reference: string;
  student: string;
  subscriberId: string;
  amountArs: number;
  status: "pending" | "approved" | "failed";
  executionUid: string | null;
  paymentId: string | null;
  updatedAt: number;
}

export interface FiadorStoreData {
  version: 1;
  completions: Record<string, CompletionRecord>;
  kyc: Record<string, KycRecord>;
  cards: Record<string, CardRecord>;
  acceptances: Record<string, AcceptanceRecord>;
  webhooks: Record<string, WebhookRecord>;
  charges: Record<string, ChargeRecord>;
}

export const emptyStore = (): FiadorStoreData => ({
  version: 1,
  completions: {},
  kyc: {},
  cards: {},
  acceptances: {},
  webhooks: {},
  charges: {},
});

export interface FiadorStore {
  read(): FiadorStoreData;
  /** Mutate a draft in place; the store persists it atomically. */
  update(fn: (draft: FiadorStoreData) => void): FiadorStoreData;
}

export function createMemoryStore(seed?: FiadorStoreData): FiadorStore {
  let data: FiadorStoreData = seed ?? emptyStore();
  return {
    read: () => structuredClone(data),
    update: (fn) => {
      const draft = structuredClone(data);
      fn(draft);
      data = draft;
      return structuredClone(data);
    },
  };
}

const FILE_NAME = "fiador-store.json";
const LOCK_NAME = "fiador-store.lock";
/** A lock older than this is stale (crashed holder) and may be broken. */
const LOCK_STALE_MS = 10_000;

const errnoOf = (e: unknown): string | null =>
  e && typeof e === "object" && "code" in e && typeof (e as { code: unknown }).code === "string"
    ? String((e as { code: unknown }).code)
    : null;

export function createFileStore(dir?: string): FiadorStore {
  const file = join(dir ?? fiadorDataDir(), FILE_NAME);
  const lock = join(dir ?? fiadorDataDir(), LOCK_NAME);
  // Fail closed on corruption: silently resetting to empty would LOSE charge
  // and recovery idempotence (double-charge risk). Only a missing file — a
  // store that never existed — starts empty.
  const load = (): FiadorStoreData => {
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch (e) {
      if (errnoOf(e) === "ENOENT") return emptyStore();
      throw new StoreError("corrupt_store", `corrupt_store: cannot read ${FILE_NAME} (${errnoOf(e) ?? "io error"})`);
    }
    let parsed: Partial<FiadorStoreData>;
    try {
      parsed = JSON.parse(raw) as Partial<FiadorStoreData>;
    } catch {
      throw new StoreError("corrupt_store", `corrupt_store: ${FILE_NAME} is not valid JSON`);
    }
    if (parsed.version !== 1 || typeof parsed !== "object" || parsed === null) {
      throw new StoreError("corrupt_store", `corrupt_store: ${FILE_NAME} has an unknown schema version`);
    }
    return { ...emptyStore(), ...parsed };
  };
  // Cross-process lock for read-modify-write: atomic rename alone does not
  // serialize two writers. Best-effort stale breaking; a live lock fails
  // closed (the caller retries) instead of interleaving writes.
  const acquire = (): void => {
    mkdirSync(join(file, ".."), { recursive: true });
    try {
      writeFileSync(lock, JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: "wx", encoding: "utf8" });
      return;
    } catch (e) {
      if (errnoOf(e) !== "EEXIST") {
        throw new StoreError("corrupt_store", `corrupt_store: cannot create lock (${errnoOf(e) ?? "io error"})`);
      }
    }
    let held: { at?: unknown } | null = null;
    try {
      held = JSON.parse(readFileSync(lock, "utf8")) as { at?: unknown };
    } catch {
      held = null;
    }
    const age = held && typeof held.at === "number" ? Date.now() - held.at : Number.POSITIVE_INFINITY;
    if (Number.isFinite(age) && age < LOCK_STALE_MS) {
      throw new StoreError("store_busy", "store_busy: another writer holds the store lock");
    }
    try {
      unlinkSync(lock);
    } catch {
      throw new StoreError("store_busy", "store_busy: another writer holds the store lock");
    }
    try {
      writeFileSync(lock, JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: "wx", encoding: "utf8" });
    } catch {
      throw new StoreError("store_busy", "store_busy: another writer holds the store lock");
    }
  };
  const release = (): void => {
    try {
      unlinkSync(lock);
    } catch {
      // Lock already gone (or never acquired): nothing to release.
    }
  };
  return {
    read: load,
    update: (fn) => {
      acquire();
      try {
        const draft = load();
        fn(draft);
        const tmp = `${file}.${process.pid}.${randomUUID()}.tmp`;
        writeFileSync(tmp, JSON.stringify(draft), "utf8");
        renameSync(tmp, file);
        return structuredClone(draft);
      } finally {
        release();
      }
    },
  };
}

let defaultStore: FiadorStore | null = null;

/**
 * Default file store for route handlers. Refuses Vercel: any filesystem
 * there is ephemeral, which cannot satisfy invite/KYC/card idempotence, so
 * live mode on Vercel stays off until durable persistence lands. Tests
 * inject their own store.
 */
export function getStore(): FiadorStore {
  if (process.env.VERCEL === "1") {
    throw new StoreError(
      "ephemeral_store_refused",
      "ephemeral_store_refused: file store is not durable on Vercel; live mode pending durable persistence",
    );
  }
  defaultStore ??= createFileStore();
  return defaultStore;
}
