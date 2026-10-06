// GET /api/fiador/kyc/sesiones/[id]?token=... — live KYC status for an
// invitation. Re-reads the Didit decision API (the documented polling
// fallback) and exposes ONLY the status: no PII, documents, or media URLs.
import { getDiditDecision } from "@/lib/server/didit";
import { apiError, mapError } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { getStore, tokenKey } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: RouteContext<"/api/fiador/kyc/sesiones/[id]">): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const verified = verifyInvitation(token);
    const store = getStore();
    const record = store.read().kyc[id] ?? null;
    if (!record || record.tokenKey !== tokenKey(token) || record.student !== verified.student) {
      return apiError("not_found", "not_found: no KYC session for this invitation", 404);
    }
    const decision = await getDiditDecision(id);
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      const r = d.kyc[id];
      if (r) {
        r.status = decision.status;
        r.approvedConfirmed = decision.approved;
        r.updatedAt = now;
      }
    });
    return Response.json({ status: decision.status, approved: decision.approved, confirmedVia: "decision_api" });
  } catch (e) {
    return mapError(e);
  }
}
