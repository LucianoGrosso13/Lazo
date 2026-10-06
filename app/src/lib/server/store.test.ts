import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileStore, createMemoryStore, getStore, tokenKey } from "./store";

describe("fiador store", () => {
  it("stores completions, kyc, cards, and acceptances in memory", () => {
    const store = createMemoryStore();
    const key = tokenKey("v1.secret-token");
    store.update((d) => {
      d.completions[key] = { student: "S", completedAt: 1, acceptanceId: "a1" };
      d.kyc["sess-1"] = { tokenKey: key, student: "S", sessionId: "sess-1", status: "Approved", approvedConfirmed: true, updatedAt: 2 };
      d.cards["S"] = { student: "S", tokenKey: key, subscriberId: "sid", sourceUrl: null, cardLabel: "Visa •••• 1", linked: true, updatedAt: 3 };
      d.webhooks["evt-1"] = { receivedAt: 4, key: "evt-1" };
    });
    const data = store.read();
    expect(data.completions[key]?.acceptanceId).toBe("a1");
    expect(data.kyc["sess-1"]?.approvedConfirmed).toBe(true);
    expect(data.cards["S"]?.linked).toBe(true);
    expect(data.webhooks["evt-1"]?.receivedAt).toBe(4);
  });

  it("never stores the bearer token itself", () => {
    const token = "v1.very-secret-bearer-token.xyz";
    const key = tokenKey(token);
    expect(key).not.toContain("secret");
    expect(key).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(tokenKey(token)).toBe(key);
  });

  it("persists the file store across restarts", () => {
    const dir = mkdtempSync(join(tmpdir(), "lazo-store-test-"));
    const a = createFileStore(dir);
    a.update((d) => {
      d.charges["ref-1"] = { reference: "ref-1", student: "S", subscriberId: "sid", amountArs: 10, status: "approved", executionUid: "e", paymentId: "p", updatedAt: 5 };
    });
    // A new store on the same dir (a "restart") sees the same data.
    const b = createFileStore(dir);
    expect(b.read().charges["ref-1"]?.status).toBe("approved");
  });

  it("starts empty on a missing file", () => {
    const dir = mkdtempSync(join(tmpdir(), "lazo-store-test-"));
    expect(createFileStore(dir).read().version).toBe(1);
  });

  it("fails closed on a corrupt file instead of silently resetting", () => {
    const dir = mkdtempSync(join(tmpdir(), "lazo-store-test-"));
    writeFileSync(join(dir, "fiador-store.json"), "{not json", "utf8");
    expect(() => createFileStore(dir).read()).toThrowError(expect.objectContaining({ code: "corrupt_store" }));
    expect(() => createFileStore(dir).update(() => {})).toThrowError(
      expect.objectContaining({ code: "corrupt_store" }),
    );
    writeFileSync(join(dir, "fiador-store.json"), JSON.stringify({ version: 99 }), "utf8");
    expect(() => createFileStore(dir).read()).toThrowError(expect.objectContaining({ code: "corrupt_store" }));
  });

  it("refuses concurrent writers and breaks stale locks", () => {
    const dir = mkdtempSync(join(tmpdir(), "lazo-store-test-"));
    // A live lock held by "another process" fails closed.
    writeFileSync(join(dir, "fiador-store.lock"), JSON.stringify({ pid: 99999, at: Date.now() }), "utf8");
    expect(() => createFileStore(dir).update(() => {})).toThrowError(expect.objectContaining({ code: "store_busy" }));
    // A stale lock (crashed holder) is broken and the write proceeds.
    writeFileSync(join(dir, "fiador-store.lock"), JSON.stringify({ pid: 99999, at: Date.now() - 60_000 }), "utf8");
    const data = createFileStore(dir).update((d) => {
      d.webhooks["k"] = { receivedAt: 1, key: "k" };
    });
    expect(data.webhooks["k"]?.receivedAt).toBe(1);
  });

  it("refuses the ephemeral store on Vercel", () => {
    const saved = process.env.VERCEL;
    process.env.VERCEL = "1";
    try {
      expect(() => getStore()).toThrowError(expect.objectContaining({ code: "ephemeral_store_refused" }));
    } finally {
      if (saved === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = saved;
    }
  });
});
