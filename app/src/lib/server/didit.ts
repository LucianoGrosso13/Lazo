// Didit hosted KYC client (server-only). Official sources:
// - Create session: POST /v3/session/ -> 201 {session_id, session_token, url, status}
//   https://docs.didit.me/sessions-api/create-session
// - Retrieve decision: GET /v3/session/{session_id}/decision/
//   https://docs.didit.me/sessions-api/retrieve-session
// - Webhooks: X-Signature-V2 (HMAC-SHA256 over sorted, Unicode-preserved
//   compact JSON), X-Signature (raw bytes), X-Timestamp (reject if older than
//   300s), idempotency on event_id or session_id+status+webhook_type.
//   https://docs.didit.me/integration/webhooks
//
// Only statuses are ever persisted. KYC documents, biometrics, decision
// payloads and presigned media URLs are never stored or logged.
import { createHmac, timingSafeEqual } from "node:crypto";
import { ServerEnvError, diditApiKey, diditBaseUrl, diditWebhookSecret, diditWorkflowId } from "./env";

export type DiditCode =
  | "didit_not_configured"
  | "didit_request_failed"
  | "didit_unreachable"
  | "didit_bad_response"
  | "didit_bad_signature"
  | "didit_stale_webhook"
  | "didit_bad_webhook";

export class DiditError extends Error {
  constructor(
    public readonly code: DiditCode,
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? code);
    this.name = "DiditError";
  }
}

/** Lifecycle statuses from Retrieve Session docs. */
export const DIDIT_FINAL = ["Approved", "Declined", "In Review", "Expired", "Kyc Expired", "Abandoned"] as const;

export interface DiditSession {
  sessionId: string;
  url: string;
  status: string;
}

export interface DiditDecision {
  sessionId: string;
  status: string;
  approved: boolean;
}

type FetchFn = typeof fetch;

function configError(e: unknown): DiditError {
  if (e instanceof ServerEnvError) {
    return new DiditError("didit_not_configured", `didit_not_configured: set ${e.envName}`);
  }
  throw e;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function createDiditSession(
  args: { vendorData: string; callback?: string; metadata?: Record<string, string> },
  deps?: { fetchFn?: FetchFn },
): Promise<DiditSession> {
  let apiKey: string;
  let workflowId: string;
  let base: string;
  try {
    apiKey = diditApiKey();
    workflowId = diditWorkflowId();
    base = diditBaseUrl();
  } catch (e) {
    throw configError(e);
  }
  const fetchFn = deps?.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(`${base}/v3/session/`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: args.vendorData,
        ...(args.callback ? { callback: args.callback } : {}),
        ...(args.metadata ? { metadata: args.metadata } : {}),
      }),
    });
  } catch (e) {
    throw new DiditError("didit_unreachable", `didit_unreachable: ${e instanceof Error ? e.message : "fetch failed"}`);
  }
  if (res.status !== 201) {
    throw new DiditError("didit_request_failed", `didit_request_failed: create session -> ${res.status}`, res.status);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!isRecord(body) || typeof body.session_id !== "string" || typeof body.url !== "string") {
    throw new DiditError("didit_bad_response", "didit_bad_response: missing session_id/url");
  }
  return {
    sessionId: body.session_id,
    url: body.url,
    status: typeof body.status === "string" ? body.status : "Not Started",
  };
}

/** Canonical read: top-level `status` only. The decision body is not retained. */
export async function getDiditDecision(
  sessionId: string,
  deps?: { fetchFn?: FetchFn },
): Promise<DiditDecision> {
  let apiKey: string;
  let base: string;
  try {
    apiKey = diditApiKey();
    base = diditBaseUrl();
  } catch (e) {
    throw configError(e);
  }
  const fetchFn = deps?.fetchFn ?? fetch;
  let res: Response;
  try {
    res = await fetchFn(`${base}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
      headers: { "x-api-key": apiKey },
    });
  } catch (e) {
    throw new DiditError("didit_unreachable", `didit_unreachable: ${e instanceof Error ? e.message : "fetch failed"}`);
  }
  if (!res.ok) {
    throw new DiditError("didit_request_failed", `didit_request_failed: decision -> ${res.status}`, res.status);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!isRecord(body) || typeof body.status !== "string") {
    throw new DiditError("didit_bad_response", "didit_bad_response: missing status");
  }
  return { sessionId, status: body.status, approved: body.status === "Approved" };
}

// --- Webhook verification ----------------------------------------------------

/**
 * Canonical JSON for X-Signature-V2: sorted keys (recursive), compact
 * separators, Unicode preserved (plain JSON.stringify behavior).
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export interface DiditWebhook {
  webhookType: string;
  sessionId: string | null;
  status: string | null;
  timestamp: number;
  eventKey: string;
  body: Record<string, unknown>;
}

function hexEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && ab.length > 0 && timingSafeEqual(ab, bb);
}

/**
 * Verifies a Didit webhook per the official recommended order:
 * X-Signature-V2 first, X-Signature (raw bytes) second. The deprecated
 * X-Signature-Simple envelope-only fallback is NOT accepted: it does not
 * authenticate the decision body.
 */
export function verifyDiditWebhook(
  rawBody: string,
  headers: { signatureV2?: string | null; signature?: string | null; timestamp?: string | null },
  opts?: { secret?: string; now?: number },
): DiditWebhook {
  let secret: string;
  try {
    secret = opts?.secret ?? diditWebhookSecret();
  } catch (e) {
    if (e instanceof ServerEnvError) {
      throw new DiditError("didit_not_configured", `didit_not_configured: set ${e.envName}`);
    }
    throw e;
  }
  const ts = Number(headers.timestamp);
  if (!Number.isSafeInteger(ts) || ts <= 0) {
    throw new DiditError("didit_bad_webhook", "didit_bad_webhook: missing X-Timestamp");
  }
  const now = opts?.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    throw new DiditError("didit_stale_webhook", "didit_stale_webhook: older than 300s (replay)");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new DiditError("didit_bad_webhook", "didit_bad_webhook: body is not JSON");
  }
  if (!isRecord(parsed)) {
    throw new DiditError("didit_bad_webhook", "didit_bad_webhook: body is not an object");
  }
  const v2 = headers.signatureV2 ? createHmac("sha256", secret).update(canonicalJson(parsed), "utf8").digest("hex") : null;
  const v2ok = v2 != null && headers.signatureV2 != null && hexEqual(headers.signatureV2, v2);
  const v1 = headers.signature ? createHmac("sha256", secret).update(rawBody, "utf8").digest("hex") : null;
  const v1ok = v1 != null && headers.signature != null && hexEqual(headers.signature, v1);
  if (!v2ok && !v1ok) {
    throw new DiditError("didit_bad_signature", "didit_bad_signature: HMAC mismatch");
  }
  const webhookType = parsed.webhook_type;
  if (typeof webhookType !== "string" || !webhookType) {
    throw new DiditError("didit_bad_webhook", "didit_bad_webhook: missing webhook_type");
  }
  const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : null;
  const status = typeof parsed.status === "string" ? parsed.status : null;
  const eventId = typeof parsed.event_id === "string" && parsed.event_id ? parsed.event_id : null;
  const eventKey = eventId ?? `${sessionId ?? ""}:${status ?? ""}:${webhookType}`;
  return { webhookType, sessionId, status, timestamp: ts, eventKey, body: parsed };
}
