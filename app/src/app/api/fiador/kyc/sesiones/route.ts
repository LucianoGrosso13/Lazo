// POST /api/fiador/kyc/sesiones — creates a Didit hosted verification session
// for an invitation. Body: {token}. Returns {sessionId, url, status}: the
// guarantor opens `url` (Didit-hosted) to verify. Idempotent per invitation:
// stable vendor_data lets Didit return the existing unfinished session.
import { createDiditSession } from "@/lib/server/didit";
import { optionalEnv } from "@/lib/server/env";
import { apiError, isRecord, mapError, readJson } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { getStore, sha256hex, tokenKey } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    const token = isRecord(body) && typeof body.token === "string" ? body.token : "";
    const verified = verifyInvitation(token);
    const key = tokenKey(token);
    const store = getStore();
    if (store.read().completions[key]) {
      return apiError("invitation_completed", "invitation_completed: this invitation already has a guarantee", 409);
    }
    const hash8 = sha256hex(token).slice(0, 8);
    const student8 = sha256hex(verified.student).slice(0, 8);
    const origin = optionalEnv("DIDIT_CALLBACK_BASE", new URL(req.url).origin);
    const session = await createDiditSession({
      vendorData: `fiador:${student8}:${hash8}`,
      callback: `${origin}/fiador/${token}?kyc=callback`,
      metadata: { student: verified.student, invite: hash8 },
    });
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      d.kyc[session.sessionId] = {
        tokenKey: key,
        student: verified.student,
        sessionId: session.sessionId,
        status: session.status,
        approvedConfirmed: false,
        updatedAt: now,
      };
    });
    return Response.json({ sessionId: session.sessionId, url: session.url, status: session.status }, { status: 201 });
  } catch (e) {
    return mapError(e);
  }
}
