// Card-charge gateway for the keeper. Standalone Mobbex sandbox client using
// the same verified endpoints as the app server module (mobbex.dev):
//   POST /p/subscriptions/{id}/subscriber/{sid}/execution {total, reference, description}
//   GET  /p/operations/{uid}  -> payment.status.code "200" = approved
// Webhooks are unsigned, so every charge is verified via the operations API
// before the keeper acts on it. Test mode is enforced; live is refused.
//
// Plan C (FIADOR_ALLOW_SIMULATED_RECOVERY=true): when no gateway credentials
// exist, charges resolve as explicitly SIMULATED: no receipt hash is produced
// and no recovery is ever registered from them. Default off -> fail closed.
import { createHash } from "node:crypto";
import type { KeeperEnv } from "./config.ts";
import { requireMobbexCreds } from "./config.ts";

export type GatewayCode =
  | "gateway_not_configured"
  | "gateway_live_refused"
  | "gateway_request_failed"
  | "gateway_unreachable"
  | "gateway_bad_response";

export class GatewayError extends Error {
  readonly code: GatewayCode;
  readonly status?: number;
  constructor(code: GatewayCode, message?: string, status?: number) {
    super(message ?? code);
    this.name = "GatewayError";
    this.code = code;
    this.status = status;
  }
}

type FetchFn = typeof fetch;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export interface ChargeRequest {
  subscriberId: string;
  totalArs: number;
  reference: string;
  description: string;
}

export interface ChargeResult {
  simulated: false;
  approved: boolean;
  executionUid: string | null;
  paymentId: string | null;
  totalArs: number | null;
  statusCode: string | null;
  /** SHA-256 over the verified operation fields. Only set when approved. */
  receiptHash: string | null;
}

export interface SimulatedCharge {
  simulated: true;
  reason: string;
}

/** Unique charge reference per plan generation+installment+attempt. */
export function chargeReference(planId: string, openedAt: number, installment: number, attempt = 1): string {
  return `lazo-${planId}-${openedAt}-i${installment}-a${attempt}`;
}

export function receiptHashFor(op: { paymentId: string; total: number; reference: string; statusCode: string }): string {
  return createHash("sha256")
    .update(`mobbex-sandbox|${op.paymentId}|${op.total}|${op.reference}|${op.statusCode}`, "utf8")
    .digest("hex");
}

export function microUsdcToArs(microUsdc: number, arsPerUsdc: number): number {
  if (!Number.isSafeInteger(microUsdc) || microUsdc <= 0) {
    throw new GatewayError("gateway_bad_response", "gateway_bad_response: microUsdc must be a positive integer");
  }
  if (!Number.isFinite(arsPerUsdc) || arsPerUsdc <= 0) {
    throw new GatewayError("gateway_bad_response", "gateway_bad_response: arsPerUsdc must be positive");
  }
  return Math.round((microUsdc * arsPerUsdc) / 1e4) / 100;
}

export interface Gateway {
  charge(req: ChargeRequest): Promise<ChargeResult | SimulatedCharge>;
}

export class MobbexGateway implements Gateway {
  private env: KeeperEnv;
  private fetchFn: FetchFn;
  private baseUrl: string;
  constructor(env: KeeperEnv, fetchFn: FetchFn = fetch, baseUrl = "https://api.mobbex.com") {
    this.env = env;
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl;
  }

  private async call(path: string, method: string, body?: unknown): Promise<Record<string, unknown>> {
    const creds = requireMobbexCreds(this.env);
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "x-api-key": creds.apiKey,
          "x-access-token": creds.accessToken,
          "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch (e) {
      throw new GatewayError("gateway_unreachable", `gateway_unreachable: ${e instanceof Error ? e.message : "fetch failed"}`);
    }
    const parsed: unknown = await res.json().catch(() => null);
    if (!res.ok || !isRecord(parsed) || parsed.result !== true) {
      throw new GatewayError("gateway_request_failed", `gateway_request_failed: ${method} ${path} -> ${res.status}`, res.status);
    }
    return parsed;
  }

  async charge(req: ChargeRequest): Promise<ChargeResult | SimulatedCharge> {
    let creds: { subscriptionId: string };
    try {
      creds = requireMobbexCreds(this.env);
    } catch {
      if (this.env.allowSimulatedRecovery) {
        return { simulated: true, reason: "plan_c: no gateway credentials; declared-simulated charge, no receipt" };
      }
      throw new GatewayError("gateway_not_configured", "gateway_not_configured: set MOBBEX_API_KEY/MOBBEX_ACCESS_TOKEN/MOBBEX_SUBSCRIPTION_ID");
    }
    if (!Number.isFinite(req.totalArs) || req.totalArs <= 0) {
      throw new GatewayError("gateway_bad_response", "gateway_bad_response: totalArs must be positive");
    }
    const exec = await this.call(
      `/p/subscriptions/${creds.subscriptionId}/subscriber/${encodeURIComponent(req.subscriberId)}/execution`,
      "POST",
      { total: req.totalArs, reference: req.reference, description: req.description },
    );
    const data = isRecord(exec.data) ? exec.data : {};
    const executionUid =
      (isRecord(data.execution) && typeof data.execution.uid === "string" && data.execution.uid) ||
      (typeof data.uid === "string" && data.uid) ||
      null;
    const paymentId =
      (isRecord(data.payment) && typeof data.payment.id === "string" && data.payment.id) ||
      (typeof data.paymentId === "string" && data.paymentId) ||
      null;
    // Trust anchor: re-query the operation; the execution response alone
    // does not prove the money moved.
    const op = await this.getOperation(paymentId ?? req.reference);
    const receiptHash =
      op.approved && op.paymentId && op.total != null && op.reference && op.statusCode
        ? receiptHashFor({ paymentId: op.paymentId, total: op.total, reference: op.reference, statusCode: op.statusCode })
        : null;
    return {
      simulated: false,
      approved: op.approved,
      executionUid,
      paymentId: op.paymentId ?? paymentId,
      totalArs: op.total,
      statusCode: op.statusCode,
      receiptHash,
    };
  }

  private async getOperation(uidOrReference: string): Promise<{
    approved: boolean;
    statusCode: string | null;
    total: number | null;
    reference: string | null;
    paymentId: string | null;
  }> {
    const body = await this.call(`/p/operations/${encodeURIComponent(uidOrReference)}`, "GET");
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
}
