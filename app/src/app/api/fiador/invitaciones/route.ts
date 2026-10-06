// POST /api/fiador/invitaciones — the student mints a cross-browser invite link
// for their guarantor. Stateless HMAC token: any browser presenting it
// resolves the same invitation (completion state is server-side).
import { signInvitation } from "@/lib/server/invite-tokens";
import { apiError, isRecord, mapError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    const student = isRecord(body) && typeof body.student === "string" ? body.student : "";
    try {
      const { token, issuedAt, expiresAt } = signInvitation(student);
      return Response.json(
        { token, path: `/fiador/${token}`, student, issuedAt, expiresAt },
        { status: 201 },
      );
    } catch (e) {
      return mapError(e);
    }
  } catch (e) {
    return mapError(e);
  }
}

export async function GET(): Promise<Response> {
  return apiError("method_not_allowed", "method_not_allowed: use POST with {student}", 405);
}
