// Mobbex sandbox client (server-only): saved card rail for guarantor charges.
// Official sources (mobbex.dev):
// - Manual subscriptions: ONE manual subscription for all subscribers; the per
//   subscription amount is a default, each execution carries its own amount.
//   POST /p/subscriptions/ {type:"manual", test:true, ...}
//   https://mobbex.dev/ckn4-suscripciones
// - Subscriber: POST /p/subscriptions/{id}/subscriber {customer, reference} ->
//   {sourceUrl (send the user here to add their card), subscriberUrl}
// - Variable charge: POST /p/subscriptions/{id}/subscriber/{sid}/execution
//   {total, reference, description}
// - Verify: GET /p/operations/{uid} -> payment.status.code "200" = approved
//   https://mobbex.dev/consulta-de-operaciones-y-childs
// - Webhooks: {type:"subscription:execution", data:{payment, subscriber,
//   subscription, execution}} with NO documented signature -> webhooks are
//   notifications only; every state change re-verifies via the API.
//   https://mobbex.dev/webhooks
// - Test cards (test mode only): https://mobbex.dev/medios-de-pago-para-pruebas
//
// Card entry always happens on Mobbex-hosted pages (sourceUrl). This module
// never sends, receives, or stores PAN/CVV: only masked labels + references.
import { ServerEnvError, mobbexAccessToken, mobbexApiKey, mobbexBaseUrl, mobbexSubscriptionId, requireMobbexTestMode } from "./env";

export type MobbexCode =
  | "mobbex_not_configured"
  | "mobbex_live_refused"
  | "mobbex_request_failed"
  | "mobbex_unreachable"
  | "mobbex_bad_response";

export class MobbexError extends Error {
  constructor(
    public readonly code: MobbexCode,
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? code);
    this.name = "MobbexError";
  }
}

type FetchFn = typeof fetch;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

interface MobbexAuth {
  base: string;
  apiKey: string;
  accessToken: string;
  subscriptionId: string;
}

function auth(): MobbexAuth {
  try {
    requireMobbexTestMode();
    return {
      base: mobbexBaseUrl(),
      apiKey: mobbexApiKey(),
      accessToken: mobbexAccessToken(),
      subscriptionId: mobbexSubscriptionId(),
    };
  } catch (e) {
    if (e instanceof ServerEnvError && e.envName === "MOBBEX_TEST_MODE") {
      throw new MobbexError("mobbex_live_refused", e.message);
    }
    if (e instanceof ServerEnvError) {
      throw new MobbexError("mobbex_not_configured", `mobbex_not_configured: set ${e.envName}`);
    }
    throw e;
  }
}

async function mobbexFetch(
  fetchFn: FetchFn,
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetchFn(url, init);
  } catch (e) {
    throw new MobbexError("mobbex_unreachable", `mobbex_unreachable: ${e instanceof Error ? e.message : "fetch failed"}`);
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok || !isRecord(body) || body.result !== true) {
    const detail = isRecord(body) && typeof body.error === "string" ? `: ${body.error}` : "";
    throw new MobbexError(
      "mobbex_request_failed",
      `mobbex_request_failed: ${init.method} -> ${res.status}${detail}`,
      res.status,
    );
  }
  return body;
}

const headers = (a: MobbexAuth): Record<string, string> => ({
  "x-api-key": a.apiKey,
  "x-access-token": a.accessToken,
  "Content-Type": "application/json",
});

export interface MobbexSubscriber {
  subscriberId: string;
  /** Hosted Mobbex page where the guarantor enters their card. */
  sourceUrl: string;
  subscriberUrl: string;
}

export async function createMobbexSubscriber(
  args: { name: string; email?: string; identification?: string; reference: string },
  deps?: { fetchFn?: FetchFn },
): Promise<MobbexSubscriber> {
  const a = auth();
  const body = await mobbexFetch(deps?.fetchFn ?? fetch, `${a.base}/p/subscriptions/${a.subscriptionId}/subscriber`, {
    method: "POST",
    headers: headers(a),
    body: JSON.stringify({
      customer: {
        name: args.name,
        ...(args.email ? { email: args.email } : {}),
        ...(args.identification ? { identification: args.identification } : {}),
      },
      reference: args.reference,
    }),
  });
  const data = isRecord(body.data) ? body.data : {};
  // Response shape per docs: sourceUrl + subscriberUrl; uid variants guarded.
  const sid = typeof data.uid === "string" ? data.uid : typeof data.sid === "string" ? data.sid : null;
  const sourceUrl = typeof data.sourceUrl === "string" ? data.sourceUrl : null;
  if (!sid || !sourceUrl) {
    throw new MobbexError("mobbex_bad_response", "mobbex_bad_response: subscriber uid/sourceUrl missing");
  }
  return {
    subscriberId: sid,
    sourceUrl,
    subscriberUrl: typeof data.subscriberUrl === "string" ? data.subscriberUrl : "",
  };
}

// --- Saved-card detection (fail-closed) --------------------------------------
// The GET-subscriber response shape is not pinned by the public docs, so card
// presence is detected defensively: only masked numbers (containing "*") are
// accepted for display. Anything shaped like a full PAN is refused, never stored.

const last4Of = (masked: string): string | null => {
  const m = masked.replace(/[^0-9*]/g, "").match(/(\d{4})$/);
  return m ? m[1] : null;
};

export interface SavedCard {
  linked: boolean;
  cardLabel: string | null;
  reason: string | null;
}

export function extractSavedCard(raw: unknown): SavedCard {
  const candidates: unknown[] = [];
  if (isRecord(raw)) {
    const data = isRecord(raw.data) ? raw.data : raw;
    for (const key of ["source", "card", "paymentSource", "payment_source"]) {
      if (key in data) candidates.push(data[key]);
    }
    if (Array.isArray(data.sources)) candidates.push(...data.sources);
  }
  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const number = typeof c.number === "string" ? c.number : null;
    const name = typeof c.name === "string" ? c.name : "Card";
    if (!number) continue;
    if (!number.includes("*")) {
      // Looks like an unmasked PAN: refuse to persist it.
      return { linked: false, cardLabel: null, reason: "card_data_refused" };
    }
    const last4 = last4Of(number);
    return { linked: true, cardLabel: last4 ? `${name} •••• ${last4}` : name, reason: null };
  }
  return { linked: false, cardLabel: null, reason: "no_card_source" };
}

export async function getMobbexSubscriber(
  subscriberId: string,
  deps?: { fetchFn?: FetchFn },
): Promise<SavedCard & { raw: unknown }> {
  const a = auth();
  const body = await mobbexFetch(
    deps?.fetchFn ?? fetch,
    `${a.base}/p/subscriptions/${a.subscriptionId}/subscriber/${encodeURIComponent(subscriberId)}`,
    { method: "GET", headers: headers(a) },
  );
  return { ...extractSavedCard(body), raw: body };
}

// --- Variable manual charge ---------------------------------------------------

export interface MobbexCharge {
  executionUid: string | null;
  paymentId: string | null;
  /** Amount echoed by the gateway. Trust only after getOperation confirms. */
  total: number | null;
  reference: string;
}

/**
 * Executes a manual charge with a differentiated amount (the keeper's day-15
 * collection). `totalArs` is the exact ARS figure the operator reviewed.
 * `reference` must be unique per operation (Mobbex rejects duplicates).
 */
export async function executeMobbexCharge(
  args: { subscriberId: string; totalArs: number; reference: string; description: string },
  deps?: { fetchFn?: FetchFn },
): Promise<MobbexCharge> {
  const a = auth();
  if (!Number.isFinite(args.totalArs) || args.totalArs <= 0) {
    throw new MobbexError("mobbex_bad_response", "mobbex_bad_response: totalArs must be positive");
  }
  const body = await mobbexFetch(
    deps?.fetchFn ?? fetch,
    `${a.base}/p/subscriptions/${a.subscriptionId}/subscriber/${encodeURIComponent(args.subscriberId)}/execution`,
    {
      method: "POST",
      headers: headers(a),
      body: JSON.stringify({ total: args.totalArs, reference: args.reference, description: args.description }),
    },
  );
  const data = isRecord(body.data) ? body.data : {};
  const executionUid =
    (isRecord(data.execution) && typeof data.execution.uid === "string" && data.execution.uid) ||
    (typeof data.uid === "string" && data.uid) ||
    null;
  const paymentId =
    (isRecord(data.payment) && typeof data.payment.id === "string" && data.payment.id) ||
    (typeof data.paymentId === "string" && data.paymentId) ||
    null;
  const total = typeof data.total === "number" ? data.total : null;
  return { executionUid, paymentId, total, reference: args.reference };
}

export interface MobbexOperation {
  approved: boolean;
  statusCode: string | null;
  total: number | null;
  reference: string | null;
  paymentId: string | null;
}

/** Trust anchor: re-query the operation before acting on any charge/webhook. */
export async function getMobbexOperation(
  uidOrReference: string,
  deps?: { fetchFn?: FetchFn },
): Promise<MobbexOperation> {
  const a = auth();
  const body = await mobbexFetch(deps?.fetchFn ?? fetch, `${a.base}/p/operations/${encodeURIComponent(uidOrReference)}`, {
    method: "GET",
    headers: headers(a),
  });
  const data = isRecord(body.data) ? body.data : {};
  const tx = isRecord(data.transaction) ? data.transaction : null;
  const payment = tx && isRecord(tx.payment) ? tx.payment : isRecord(data.payment) ? data.payment : null;
  const status = payment && isRecord(payment.status) ? payment.status : null;
  const code = status && typeof status.code === "string" ? status.code : null;
  return {
    approved: code === "200",
    statusCode: code,
    total: payment && typeof payment.total === "number" ? payment.total : null,
    reference: payment && typeof payment.reference === "string" ? payment.reference : null,
    paymentId: payment && typeof payment.id === "string" ? payment.id : null,
  };
}

// --- Sandbox ARS conversion (demo only, no production equivalent) -------------

/** micro-USDC * rate -> ARS with 2 decimals. Rate has no default (env). */
export function microUsdcToArs(microUsdc: number, arsPerUsdc: number): number {
  if (!Number.isSafeInteger(microUsdc) || microUsdc <= 0) {
    throw new MobbexError("mobbex_bad_response", "mobbex_bad_response: microUsdc must be a positive integer");
  }
  if (!Number.isFinite(arsPerUsdc) || arsPerUsdc <= 0) {
    throw new MobbexError("mobbex_bad_response", "mobbex_bad_response: arsPerUsdc must be positive");
  }
  return Math.round((microUsdc * arsPerUsdc) / 1e4) / 100;
}
