// Server-only environment access for the off-chain guarantor flow.
// Reads env names; NEVER logs or returns secret values. Importing this module
// from client code throws at first access (defense in depth; the real guard
// is that only route handlers under app/api import it).
import os from "node:os";
import path from "node:path";

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("server_env_client_import: this module is server-only");
  }
}

/** Name of the variable that is missing/invalid. Values are never exposed. */
export class ServerEnvError extends Error {
  constructor(
    public readonly code: "missing_env" | "invalid_env",
    public readonly envName: string,
    message?: string,
  ) {
    super(message ?? `${code}: ${envName}`);
    this.name = "ServerEnvError";
  }
}

function raw(name: string): string | null {
  assertServer();
  const v = process.env[name];
  if (v == null || v === "") return null;
  return v;
}

/** Required secret. Returns the value; callers must never log it. */
export function requiredEnv(name: string): string {
  const v = raw(name);
  if (!v) throw new ServerEnvError("missing_env", name);
  return v;
}

/** Optional value with a fallback. */
export function optionalEnv(name: string, fallback: string): string {
  return raw(name) ?? fallback;
}

/** True only when the variable is exactly "true". */
export function flagEnv(name: string, fallback = false): boolean {
  const v = raw(name);
  if (v == null) return fallback;
  return v === "true";
}

function positiveInt(name: string, fallback: number): number {
  const v = raw(name);
  if (v == null) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new ServerEnvError("invalid_env", name, `invalid_env: ${name} must be a positive integer`);
  }
  return n;
}

// --- Invitations (HMAC, stateless, cross-browser) ----------------------------

/** HMAC secret for invitation tokens. No default: missing secret fails closed. */
export function inviteSecret(): string {
  return requiredEnv("FIADOR_INVITE_SECRET");
}

/** Technical security expiry for invitations. Default 72h per coordinator decision. */
export function invitationTtlSeconds(): number {
  return positiveInt("INVITATION_TTL_SECONDS", 72 * 3600);
}

// --- Local demo store -------------------------------------------------------

/** Directory for the file-backed demo store (invitations, KYC, cards, journal). */
export function fiadorDataDir(): string {
  assertServer();
  return raw("FIADOR_DATA_DIR") ?? path.join(os.tmpdir(), "lazo-fiador");
}

// --- Didit (KYC) ------------------------------------------------------------

export function diditApiKey(): string {
  return requiredEnv("DIDIT_API_KEY");
}

export function diditWorkflowId(): string {
  return requiredEnv("DIDIT_WORKFLOW_ID");
}

/** Per-destination signing secret (Didit's `secret_shared_key`). */
export function diditWebhookSecret(): string {
  return requiredEnv("DIDIT_WEBHOOK_SECRET");
}

export function diditBaseUrl(): string {
  return optionalEnv("DIDIT_BASE_URL", "https://verification.didit.me").replace(/\/$/, "");
}

// --- Mobbex (sandbox card rail) ---------------------------------------------

export function mobbexApiKey(): string {
  return requiredEnv("MOBBEX_API_KEY");
}

export function mobbexAccessToken(): string {
  return requiredEnv("MOBBEX_ACCESS_TOKEN");
}

/** UID of the single manual subscription that holds every guarantor subscriber. */
export function mobbexSubscriptionId(): string {
  return requiredEnv("MOBBEX_SUBSCRIPTION_ID");
}

export function mobbexBaseUrl(): string {
  return optionalEnv("MOBBEX_BASE_URL", "https://api.mobbex.com").replace(/\/$/, "");
}

/**
 * Sandbox-only test mode switch. Anything but exactly "true" refuses to run:
 * live charges are forbidden during the hackathon.
 */
export function requireMobbexTestMode(): void {
  assertServer();
  if ((raw("MOBBEX_TEST_MODE") ?? "true") !== "true") {
    throw new ServerEnvError("invalid_env", "MOBBEX_TEST_MODE", "mobbex_live_refused: only sandbox test mode is allowed");
  }
}

/**
 * Demo ARS per USDC rate for sandbox charges. NO default: charging without an
 * explicitly configured, human-reviewed rate is refused. Sandbox only; there
 * is no production conversion.
 */
export function mobbexArsPerUsdc(): number {
  const v = raw("MOBBEX_ARS_PER_USDC");
  if (v == null) throw new ServerEnvError("missing_env", "MOBBEX_ARS_PER_USDC");
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ServerEnvError("invalid_env", "MOBBEX_ARS_PER_USDC", "invalid_env: MOBBEX_ARS_PER_USDC must be a positive number");
  }
  return n;
}

// --- Plan C (explicit simulated recovery) ------------------------------------

/**
 * MVP plan C from 03-mvp.md: a declared-simulated processor screen when neither
 * Mobbex nor Mercado Pago sandbox is reachable. Default OFF; when off and no
 * gateway credentials exist, charging fails closed instead of faking success.
 */
export function allowSimulatedRecovery(): boolean {
  return flagEnv("FIADOR_ALLOW_SIMULATED_RECOVERY", false);
}
