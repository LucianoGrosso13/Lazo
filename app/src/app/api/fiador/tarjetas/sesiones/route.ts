// POST /api/fiador/tarjetas/sesiones — registers the guarantor as a Mobbex
// subscriber of the manual sandbox subscription. Body:
// {token, name, email?, identification?}. Returns the HOSTED card-entry URL
// (sourceUrl): card data is typed on Mobbex pages only. Any PAN/CVV-shaped
// field in the request is refused outright.
import { apiError, isRecord, mapError, readJson } from "@/lib/server/http";
import { verifyInvitation } from "@/lib/server/invite-tokens";
import { createMobbexSubscriber } from "@/lib/server/mobbex";
import { getStore, sha256hex, tokenKey } from "@/lib/server/store";

export const runtime = "nodejs";

/** Card-data keys that must never be sent to this API. */
const FORBIDDEN_KEYS = [
  "number",
  "cardnumber",
  "card_number",
  "pan",
  "cvv",
  "cvc",
  "expiry",
  "expiration",
  "expmonth",
  "expyear",
];

export async function POST(req: Request): Promise<Response> {
  try {
    const parsed = await readJson(req);
    if (!parsed.ok) return parsed.res;
    const body = parsed.body;
    if (!isRecord(body)) return apiError("bad_request", "bad_request: object body required", 400);
    for (const k of Object.keys(body)) {
      if (FORBIDDEN_KEYS.includes(k.toLowerCase().replace(/[^a-z]/g, ""))) {
        return apiError(
          "card_data_refused",
          "card_data_refused: card numbers are entered on Mobbex-hosted pages only, never here",
          400,
        );
      }
    }
    const token = typeof body.token === "string" ? body.token : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" && body.email ? body.email : undefined;
    const identification =
      typeof body.identification === "string" && body.identification ? body.identification : undefined;
    if (!name) return apiError("bad_request", "bad_request: name is required", 400);
    const verified = verifyInvitation(token);
    const key = tokenKey(token);
    const store = getStore();
    if (store.read().completions[key]) {
      return apiError("invitation_completed", "invitation_completed: this invitation already has a guarantee", 409);
    }
    const existing = store.read().cards[verified.student];
    if (existing && existing.tokenKey === key && existing.sourceUrl) {
      return Response.json(
        { subscriberId: existing.subscriberId, sourceUrl: existing.sourceUrl, resumed: true },
        { status: 200 },
      );
    }
    const reference = `lazo-fiador-${sha256hex(verified.student).slice(0, 8)}-${sha256hex(token).slice(0, 8)}`;
    const sub = await createMobbexSubscriber({ name, email, identification, reference });
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      d.cards[verified.student] = {
        student: verified.student,
        tokenKey: key,
        subscriberId: sub.subscriberId,
        sourceUrl: sub.sourceUrl,
        cardLabel: null,
        linked: false,
        updatedAt: now,
      };
    });
    return Response.json(
      { subscriberId: sub.subscriberId, sourceUrl: sub.sourceUrl, subscriberUrl: sub.subscriberUrl },
      { status: 201 },
    );
  } catch (e) {
    return mapError(e);
  }
}
