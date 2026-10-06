// Shared HTTP helpers for the fiador route handlers. Error responses carry
// stable codes + human messages; secret VALUES never appear (env NAMES may,
// they are documented in docs/fiador-sandbox.md).
import { InviteTokenError } from "./invite-tokens";
import { ChainError, QuoteError } from "./chain";
import { CoverageError } from "./coverage-policy";
import { DiditError } from "./didit";
import { MobbexError } from "./mobbex";
import { SuretyError } from "./surety";
import { StoreError } from "./store";
import { ServerEnvError } from "./env";

export function apiError(code: string, message: string, status: number): Response {
  return Response.json({ code, message }, { status });
}

export function badJson(): Response {
  return apiError("bad_json", "bad_json: request body is not valid JSON", 400);
}

export async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  try {
    return { ok: true, body: await req.json() };
  } catch {
    return { ok: false, res: badJson() };
  }
}

/** Maps token verification failures: 404 invalid, 410 expired, 503 unconfigured. */
export function tokenError(e: InviteTokenError): Response {
  switch (e.code) {
    case "expired":
      return apiError("expired_token", "expired_token: the invitation expired; ask the student for a new link", 410);
    case "missing_secret":
      return apiError("invite_not_configured", "invite_not_configured: set FIADOR_INVITE_SECRET", 503);
    case "bad_student":
      return apiError("bad_student", e.message, 400);
    default:
      return apiError("invalid_token", "invalid_token: the invitation link is invalid", 404);
  }
}

export function mapError(e: unknown): Response {
  if (e instanceof InviteTokenError) return tokenError(e);
  if (e instanceof DiditError) {
    switch (e.code) {
      case "didit_not_configured":
        return apiError(e.code, e.message, 503);
      case "didit_bad_signature":
      case "didit_stale_webhook":
        return apiError(e.code, e.message, 401);
      case "didit_bad_webhook":
        return apiError(e.code, e.message, 400);
      default:
        return apiError(e.code, e.message, 502);
    }
  }
  if (e instanceof MobbexError) {
    switch (e.code) {
      case "mobbex_not_configured":
      case "mobbex_live_refused":
        return apiError(e.code, e.message, 503);
      default:
        return apiError(e.code, e.message, 502);
    }
  }
  if (e instanceof SuretyError) {
    switch (e.code) {
      case "coverage_below_required":
      case "coverage_invalid":
        return apiError(e.code, e.message, 422);
      default:
        return apiError(e.code, e.message, 400);
    }
  }
  if (e instanceof StoreError) {
    switch (e.code) {
      case "store_busy":
      case "ephemeral_store_refused":
        return apiError(e.code, e.message, 503);
      default:
        return apiError(e.code, e.message, 500);
    }
  }
  if (e instanceof ChainError) {
    switch (e.code) {
      case "chain_unreachable":
      case "chain_bad_data":
        return apiError(e.code, e.message, 502);
      default:
        return apiError(e.code, e.message, 503);
    }
  }
  if (e instanceof QuoteError) {
    return apiError(e.code, e.message, 422);
  }
  if (e instanceof CoverageError) {
    switch (e.code) {
      case "coverage_policy_pending":
        return apiError(e.code, e.message, 503);
      default:
        return apiError(e.code, e.message, 422);
    }
  }
  if (e instanceof ServerEnvError) {
    return apiError(e.code, `${e.code}: ${e.envName}`, 503);
  }
  console.error("fiador route error:", e instanceof Error ? e.message : e);
  return apiError("internal", "internal: unexpected error", 500);
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
