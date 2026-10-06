// POST /api/fiador/mobbex/webhook — Mobbex subscription notifications.
// Mobbex documents NO webhook signature, so this endpoint trusts nothing in
// the payload: it dedupes by execution/payment id and re-verifies every
// claimed payment via GET /p/operations before touching charge state.
// Unknown references are acknowledged but never create state.
import { apiError, isRecord, mapError } from "@/lib/server/http";
import { getMobbexOperation } from "@/lib/server/mobbex";
import { getStore } from "@/lib/server/store";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("bad_json", "bad_json: request body is not valid JSON", 400);
    }
    if (!isRecord(body) || !isRecord(body.data)) {
      return apiError("bad_webhook", "bad_webhook: missing data object", 400);
    }
    const data = body.data;
    const payment = isRecord(data.payment) ? data.payment : null;
    const execution = isRecord(data.execution) ? data.execution : null;
    const subscriber = isRecord(data.subscriber) ? data.subscriber : null;
    const paymentId = payment && typeof payment.id === "string" ? payment.id : null;
    const reference = payment && typeof payment.reference === "string" ? payment.reference : null;
    const executionUid = execution && typeof execution.uid === "string" ? execution.uid : null;
    const dedupeKey = executionUid ?? paymentId ?? reference;
    if (!dedupeKey) {
      return apiError("bad_webhook", "bad_webhook: no execution/payment/reference id", 400);
    }
    const store = getStore();
    if (store.read().webhooks[`mobbex:${dedupeKey}`]) {
      return Response.json({ ok: true, deduped: true });
    }
    const now = Math.floor(Date.now() / 1000);
    store.update((d) => {
      d.webhooks[`mobbex:${dedupeKey}`] = { receivedAt: now, key: dedupeKey };
    });
    // Only keeper-issued charge references can advance state, and only after
    // the operations API confirms them. Anything else is notification noise.
    const known = reference ? (store.read().charges[reference] ?? null) : null;
    if (!known) {
      return Response.json({ ok: true, ignored: true });
    }
    const op = await getMobbexOperation(paymentId ?? reference as string);
    store.update((d) => {
      const c = d.charges[reference as string];
      if (c) {
        c.status = op.approved ? "approved" : "failed";
        c.executionUid = executionUid ?? c.executionUid;
        c.paymentId = paymentId ?? c.paymentId;
        if (typeof op.total === "number") c.amountArs = op.total;
        c.updatedAt = now;
      }
    });
    void subscriber;
    return Response.json({ ok: true, approved: op.approved });
  } catch (e) {
    return mapError(e);
  }
}
