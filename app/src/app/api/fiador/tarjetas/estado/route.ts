// GET /api/fiador/tarjetas/estado?token=... — live saved-card state for an
// invitation. Re-queries the Mobbex subscriber and reports only a masked
// label. Fails closed when the API shape is unrecognized.
import { apiError, mapError } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { getMobbexSubscriber } from "@/lib/server/mobbex";
import { getStore, tokenKey } from "@/lib/server/store";

export const runtime = "nodejs";

export async function GET(req: Request): Promise<Response> {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const verified = verifyInvitation(token);
    const store = getStore();
    const record = store.read().cards[verified.student] ?? null;
    if (!record || record.tokenKey !== tokenKey(token)) {
      return Response.json({ linked: false, cardLabel: null, reason: "no_subscriber" });
    }
    const live = await getMobbexSubscriber(record.subscriberId);
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      const r = d.cards[verified.student];
      if (r) {
        r.linked = live.linked;
        r.cardLabel = live.cardLabel;
        r.updatedAt = now;
      }
    });
    return Response.json({ linked: live.linked, cardLabel: live.cardLabel, reason: live.reason });
  } catch (e) {
    return mapError(e);
  }
}
