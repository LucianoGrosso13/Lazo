// POST /api/fiador/kyc/webhook — Didit destination endpoint.
// Verifies X-Signature-V2 (X-Signature raw fallback), enforces the 300s
// timestamp window, dedupes deliveries, and follows webhook-then-fetch: an
// Approved event is only trusted after GET decision confirms it.
import { getDiditDecision, verifyDiditWebhook } from "@/lib/server/didit";
import { mapError } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.text();
    const webhook = verifyDiditWebhook(raw, {
      signatureV2: req.headers.get("x-signature-v2"),
      signature: req.headers.get("x-signature"),
      timestamp: req.headers.get("x-timestamp"),
    });
    const store = getStore();
    if (store.read().webhooks[`didit:${webhook.eventKey}`]) {
      return Response.json({ ok: true, deduped: true });
    }
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      d.webhooks[`didit:${webhook.eventKey}`] = { receivedAt: now, key: webhook.eventKey };
    });
    if (webhook.webhookType !== "status.updated" || !webhook.sessionId || !webhook.status) {
      return Response.json({ ok: true, ignored: true });
    }
    const record = store.read().kyc[webhook.sessionId] ?? null;
    if (!record) {
      // Unknown session: acknowledge (avoid retries) but store nothing.
      return Response.json({ ok: true, ignored: true });
    }
    let confirmed = false;
    if (webhook.status === "Approved") {
      try {
        confirmed = (await getDiditDecision(webhook.sessionId)).approved;
      } catch {
        // Decision fetch failed: keep unconfirmed; the status endpoint re-polls.
        confirmed = false;
      }
    }
    store.update((d) => {
      const r = d.kyc[webhook.sessionId as string];
      if (r) {
        r.status = webhook.status as string;
        r.approvedConfirmed = confirmed;
        r.updatedAt = now;
      }
    });
    return Response.json({ ok: true, confirmed });
  } catch (e) {
    return mapError(e);
  }
}
