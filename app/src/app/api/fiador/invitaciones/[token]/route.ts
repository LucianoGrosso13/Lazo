// GET /api/fiador/invitaciones/[token] — server-side invite verification.
// The token bearer learns the student, expiry, and completion state.
import { getStore, tokenKey } from "@/lib/server/store";
import { apiError, mapError } from "@/lib/server/http";
import { InviteTokenError, verifyInvitation } from "@/lib/server/invite-tokens";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/fiador/invitaciones/[token]">): Promise<Response> {
  try {
    const { token } = await ctx.params;
    let verified;
    try {
      verified = verifyInvitation(token);
    } catch (e) {
      if (e instanceof InviteTokenError) return mapError(e);
      throw e;
    }
    const store = getStore().read();
    const key = tokenKey(token);
    const completion = store.completions[key] ?? null;
    const acceptance = completion ? (store.acceptances[completion.acceptanceId] ?? null) : null;
    if (!completion || !acceptance) {
      return Response.json({
        student: verified.student,
        issuedAt: verified.issuedAt,
        expiresAt: verified.expiresAt,
        completed: false,
        acceptance: null,
      });
    }
    return Response.json({
      student: verified.student,
      issuedAt: verified.issuedAt,
      expiresAt: verified.expiresAt,
      completed: true,
      acceptance: {
        id: acceptance.id,
        maxPurchase: acceptance.maxPurchase,
        coverageMax: acceptance.coverageMax,
        requiredCoverage: acceptance.requiredCoverage,
        mandateHash: acceptance.mandateHash,
        guarantorName: acceptance.guarantorName,
        cardLabel: acceptance.cardLabel,
        acceptedAt: acceptance.acceptedAt,
        registeredSignature: acceptance.registeredSignature,
      },
    });
  } catch (e) {
    return mapError(e);
  }
}

export async function POST(): Promise<Response> {
  return apiError("method_not_allowed", "method_not_allowed: use GET", 405);
}
