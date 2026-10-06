import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DiditError,
  canonicalJson,
  createDiditSession,
  getDiditDecision,
  verifyDiditWebhook,
} from "./didit";

const SECRET = "didit-webhook-secret-for-tests-12345678";
const NOW = 1_800_000_000;

const envelope = (ts: number) => ({
  webhook_type: "status.updated",
  timestamp: ts,
  session_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  status: "Approved",
  event_id: "evt-123",
  decision: { status: "Approved" },
});

const signV2 = (body: unknown) =>
  createHmac("sha256", SECRET).update(canonicalJson(body), "utf8").digest("hex");

describe("didit webhook verification", () => {
  it("canonicalizes JSON deterministically with unicode preserved", () => {
    const a = canonicalJson({ b: 1, a: { y: [3, 2], x: "José" } });
    expect(a).toBe('{"a":{"x":"José","y":[3,2]},"b":1}');
    // Key order in the input object does not change the canonical form.
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });

  it("accepts a valid X-Signature-V2 webhook", () => {
    const body = envelope(NOW);
    const raw = JSON.stringify(body);
    const w = verifyDiditWebhook(
      raw,
      { signatureV2: signV2(body), timestamp: String(NOW) },
      { secret: SECRET, now: NOW },
    );
    expect(w.webhookType).toBe("status.updated");
    expect(w.sessionId).toBe(body.session_id);
    expect(w.status).toBe("Approved");
    expect(w.eventKey).toBe("evt-123");
  });

  it("accepts X-Signature raw-bytes fallback when V2 is absent", () => {
    const body = envelope(NOW);
    const raw = JSON.stringify(body);
    const sig = createHmac("sha256", SECRET).update(raw, "utf8").digest("hex");
    const w = verifyDiditWebhook(raw, { signature: sig, timestamp: String(NOW) }, { secret: SECRET, now: NOW });
    expect(w.eventKey).toBe("evt-123");
  });

  it("rejects forged bodies, wrong secrets, and stale timestamps", () => {
    const body = envelope(NOW);
    const raw = JSON.stringify(body);
    const good = signV2(body);
    // Attacker rewrites the decision but keeps the envelope: V2 must fail.
    const forged = { ...body, decision: { status: "Approved", forged: true }, status: "Approved" };
    expect(() =>
      verifyDiditWebhook(JSON.stringify(forged), { signatureV2: good, timestamp: String(NOW) }, { secret: SECRET, now: NOW }),
    ).toThrowError(expect.objectContaining({ code: "didit_bad_signature" }));
    // Wrong secret.
    expect(() =>
      verifyDiditWebhook(raw, { signatureV2: good, timestamp: String(NOW) }, { secret: "wrong-secret", now: NOW }),
    ).toThrowError(expect.objectContaining({ code: "didit_bad_signature" }));
    // Replay outside the 300s window, past and future.
    for (const now of [NOW - 301, NOW + 301]) {
      expect(() =>
        verifyDiditWebhook(raw, { signatureV2: good, timestamp: String(NOW) }, { secret: SECRET, now }),
      ).toThrowError(expect.objectContaining({ code: "didit_stale_webhook" }));
    }
    // Missing timestamp fails closed.
    expect(() => verifyDiditWebhook(raw, { signatureV2: good }, { secret: SECRET, now: NOW })).toThrowError(
      expect.objectContaining({ code: "didit_bad_webhook" }),
    );
  });

  it("builds a stable replay key without event_id", () => {
    const { event_id: _drop, ...body } = envelope(NOW);
    const w = verifyDiditWebhook(
      JSON.stringify(body),
      { signatureV2: signV2(body), timestamp: String(NOW) },
      { secret: SECRET, now: NOW },
    );
    expect(w.eventKey).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:Approved:status.updated");
  });
});

const withDiditEnv = (fn: () => void | Promise<void>) => async () => {
  const saved = { ...process.env };
  process.env.DIDIT_API_KEY = "test-key";
  process.env.DIDIT_WORKFLOW_ID = "wf-test";
  try {
    await fn();
  } finally {
    process.env = saved;
  }
};

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("didit sessions api", () => {
  it(
    "creates a session and reads its decision",
    withDiditEnv(async () => {
      const fetchFn = (async (url: string | URL | Request) => {
        const u = String(url);
        if (u.endsWith("/v3/session/")) {
          return jsonRes(201, { session_id: "sess-1", url: "https://verify.didit.me/session/x", status: "Not Started" });
        }
        return jsonRes(200, { status: "Approved" });
      }) as typeof fetch;
      const s = await createDiditSession({ vendorData: "v1" }, { fetchFn });
      expect(s).toEqual({ sessionId: "sess-1", url: "https://verify.didit.me/session/x", status: "Not Started" });
      const d = await getDiditDecision("sess-1", { fetchFn });
      expect(d).toEqual({ sessionId: "sess-1", status: "Approved", approved: true });
    }),
  );

  it(
    "maps gateway failures explicitly instead of faking success",
    withDiditEnv(async () => {
      const failing = (async () => jsonRes(500, { detail: "boom" })) as typeof fetch;
      await expect(createDiditSession({ vendorData: "v1" }, { fetchFn: failing })).rejects.toThrowError(
        expect.objectContaining({ code: "didit_request_failed", status: 500 }),
      );
      const down = (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch;
      await expect(createDiditSession({ vendorData: "v1" }, { fetchFn: down })).rejects.toThrowError(
        expect.objectContaining({ code: "didit_unreachable" }),
      );
      const badShape = (async () => jsonRes(201, { nope: true })) as typeof fetch;
      await expect(createDiditSession({ vendorData: "v1" }, { fetchFn: badShape })).rejects.toThrowError(
        expect.objectContaining({ code: "didit_bad_response" }),
      );
    }),
  );

  it("fails closed without credentials", async () => {
    const saved = { ...process.env };
    delete process.env.DIDIT_API_KEY;
    delete process.env.DIDIT_WORKFLOW_ID;
    try {
      const fetchFn = (async () => jsonRes(201, {})) as typeof fetch;
      await expect(createDiditSession({ vendorData: "v1" }, { fetchFn })).rejects.toThrowError(
        expect.objectContaining({ code: "didit_not_configured" }),
      );
    } finally {
      process.env = saved;
    }
  });
});

describe("DiditError", () => {
  it("carries code and status", () => {
    expect(new DiditError("didit_request_failed", "x", 500).status).toBe(500);
  });
});
