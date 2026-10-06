// Route-level flow tests: invite lifecycle plus fail-closed behavior of every
// fiador endpoint without provider credentials. No network, no secrets.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { __resetChainImplForTests, __setChainImplForTests } from "@/lib/server/chain";
import { getStore, tokenKey } from "@/lib/server/store";
import { POST as createInvite } from "./invitaciones/route";
import { GET as resolveInvite } from "./invitaciones/[token]/route";
import { GET as cotizar } from "./fianza/cotizar/route";
import { POST as createKyc } from "./kyc/sesiones/route";
import { POST as diditWebhook } from "./kyc/webhook/route";
import { POST as createCard } from "./tarjetas/sesiones/route";
import { GET as cardState } from "./tarjetas/estado/route";
import { POST as mobbexWebhook } from "./mobbex/webhook/route";
import { POST as accept } from "./fianza/aceptar/route";
import { POST as register } from "./fianza/registrar/route";

const STUDENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";
const KEEPER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";

const fakeChain = () => ({
  getConfig: async () => ({
    keeper: KEEPER,
    state: "Normal" as const,
    penaltyBps: 500,
    graceDays: 5,
    guarantorChargeDay: 15,
    guarantorNoticeDay: null,
    secondsPerDay: 86_400,
    installmentIntervalDays: 30,
    minFinancedToCount: 100_000_000,
    guaranteedTiers: [
      { downPaymentBps: 3000, guarantorCoverageBps: 10_000, maxPurchase: 1_000_000_000 },
      { downPaymentBps: 2000, guarantorCoverageBps: 9000, maxPurchase: 1_000_000_000 },
      { downPaymentBps: 1000, guarantorCoverageBps: 8000, maxPurchase: 1_250_000_000 },
      { downPaymentBps: 0, guarantorCoverageBps: 7000, maxPurchase: 1_500_000_000 },
    ] as [
      { downPaymentBps: number; guarantorCoverageBps: number; maxPurchase: number },
      { downPaymentBps: number; guarantorCoverageBps: number; maxPurchase: number },
      { downPaymentBps: number; guarantorCoverageBps: number; maxPurchase: number },
      { downPaymentBps: number; guarantorCoverageBps: number; maxPurchase: number },
    ],
  }),
  getStudentTier: async () => ({ tier: 0, source: "default" as const, lateCount: 0, canOpenPlan: true }),
});

beforeAll(() => {
  process.env.FIADOR_INVITE_SECRET = "route-test-secret-0123456789abcdef";
  process.env.FIADOR_DATA_DIR = mkdtempSync(join(tmpdir(), "lazo-route-test-"));
  delete process.env.DIDIT_API_KEY;
  delete process.env.DIDIT_WORKFLOW_ID;
  delete process.env.MOBBEX_API_KEY;
  delete process.env.MOBBEX_ACCESS_TOKEN;
  delete process.env.MOBBEX_SUBSCRIPTION_ID;
});

afterEach(() => {
  __resetChainImplForTests();
  vi.unstubAllGlobals();
  delete process.env.FIADOR_COVERAGE_POLICY;
});

const post = (body: unknown): Request =>
  new Request("http://test/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const ctxFor = (params: Record<string, string>): never =>
  ({ params: Promise.resolve(params) }) as never;

describe("invite lifecycle", () => {
  it("mints and resolves a cross-browser token", async () => {
    const created = await createInvite(post({ student: STUDENT }));
    expect(created.status).toBe(201);
    const { token, path } = (await created.json()) as { token: string; path: string };
    expect(token.startsWith("v1.")).toBe(true);
    expect(path).toBe(`/fiador/${token}`);

    const resolved = await resolveInvite(new Request("http://test/api"), ctxFor({ token }));
    expect(resolved.status).toBe(200);
    const status = (await resolved.json()) as { student: string; completed: boolean };
    expect(status.student).toBe(STUDENT);
    expect(status.completed).toBe(false);
  });

  it("rejects bad students and unknown tokens", async () => {
    const bad = await createInvite(post({ student: "not a wallet!!" }));
    expect(bad.status).toBe(400);
    const unknown = await resolveInvite(new Request("http://test/api"), ctxFor({ token: "nope" }));
    expect(unknown.status).toBe(404);
    expect(((await unknown.json()) as { code: string }).code).toBe("invalid_token");
  });
});

describe("fail-closed without provider credentials", () => {
  it("kyc session creation needs Didit config", async () => {
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const res = await createKyc(post({ token }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("didit_not_configured");
  });

  it("card sessions refuse PAN input and need Mobbex config", async () => {
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const pan = await createCard(post({ token, name: "G", number: "4111111111111111" }));
    expect(pan.status).toBe(400);
    expect(((await pan.json()) as { code: string }).code).toBe("card_data_refused");
    const res = await createCard(post({ token, name: "Garante" }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("mobbex_not_configured");
  });

  it("card state reports no subscriber without touching the gateway", async () => {
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const res = await cardState(new Request(`http://test/api?token=${encodeURIComponent(token)}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ linked: false, cardLabel: null, reason: "no_subscriber" });
  });

  it("acceptance requires verified KYC first", async () => {
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const res = await accept(
      post({
        token,
        maxPurchase: 1_000_000_000,
        guarantorName: "G",
        kycSessionId: "sess-unknown",
        subscriberId: "sid-unknown",
      }),
    );
    expect(res.status).toBe(422);
    expect(((await res.json()) as { code: string }).code).toBe("kyc_not_approved");
  });

  it("acceptance recomputes coverage server-side (never trusts client numbers)", async () => {
    __setChainImplForTests(fakeChain());
    process.env.FIADOR_COVERAGE_POLICY = "A";
    process.env.MOBBEX_API_KEY = "k";
    process.env.MOBBEX_ACCESS_TOKEN = "t";
    process.env.MOBBEX_SUBSCRIPTION_ID = "s";
    // Stub only the Mobbex subscriber re-query (masked source, no PAN).
    vi.stubGlobal(
      "fetch",
      (async () =>
        new Response(JSON.stringify({ result: true, data: { source: { name: "Visa", number: "450799******0010" } } }))) as typeof fetch,
    );
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const key = tokenKey(token);
    getStore().update((d) => {
      d.kyc["sess-1"] = { tokenKey: key, student: STUDENT, sessionId: "sess-1", status: "Approved", approvedConfirmed: true, updatedAt: 1 };
      d.cards[STUDENT] = { student: STUDENT, tokenKey: key, subscriberId: "sid-1", sourceUrl: "u", cardLabel: null, linked: false, updatedAt: 1 };
    });
    const res = await accept(
      post({ token, maxPurchase: 1_000_000_000, guarantorName: "Garante", kycSessionId: "sess-1", subscriberId: "sid-1" }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      coverageMax: number;
      requiredCoverage: number;
      coveragePolicy: string;
      tier: number;
      proposal: { args: { max_purchase: number; coverage_max: number } };
    };
    // Policy A, tier 0, cap 1B: financed 700M, required 700M, cap 735M.
    expect(body.coveragePolicy).toBe("A");
    expect(body.requiredCoverage).toBe(700_000_000);
    expect(body.coverageMax).toBe(735_000_000);
    expect(body.tier).toBe(0);
    expect(body.proposal.args).toMatchObject({ max_purchase: 1_000_000_000, coverage_max: 735_000_000 });
    delete process.env.MOBBEX_API_KEY;
    delete process.env.MOBBEX_ACCESS_TOKEN;
    delete process.env.MOBBEX_SUBSCRIPTION_ID;
  });

  it("acceptance waits on the coverage policy (no default formula)", async () => {
    __setChainImplForTests(fakeChain());
    delete process.env.FIADOR_COVERAGE_POLICY;
    process.env.MOBBEX_API_KEY = "k";
    process.env.MOBBEX_ACCESS_TOKEN = "t";
    process.env.MOBBEX_SUBSCRIPTION_ID = "s";
    vi.stubGlobal(
      "fetch",
      (async () =>
        new Response(JSON.stringify({ result: true, data: { source: { name: "Visa", number: "450799******0010" } } }))) as typeof fetch,
    );
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const key = tokenKey(token);
    getStore().update((d) => {
      d.kyc["sess-1"] = { tokenKey: key, student: STUDENT, sessionId: "sess-1", status: "Approved", approvedConfirmed: true, updatedAt: 1 };
      d.cards[STUDENT] = { student: STUDENT, tokenKey: key, subscriberId: "sid-1", sourceUrl: "u", cardLabel: null, linked: false, updatedAt: 1 };
    });
    const res = await accept(
      post({ token, maxPurchase: 1_000_000_000, guarantorName: "G", kycSessionId: "sess-1", subscriberId: "sid-1" }),
    );
    expect(res.status).toBe(503);
    expect(((await res.json()) as { code: string }).code).toBe("coverage_policy_pending");
    delete process.env.MOBBEX_API_KEY;
    delete process.env.MOBBEX_ACCESS_TOKEN;
    delete process.env.MOBBEX_SUBSCRIPTION_ID;
  });

  it("cotizar quotes from chain config and policy", async () => {
    __setChainImplForTests(fakeChain());
    process.env.FIADOR_COVERAGE_POLICY = "B";
    const created = await createInvite(post({ student: STUDENT }));
    const { token } = (await created.json()) as { token: string };
    const res = await cotizar(new Request(`http://test/api?token=${encodeURIComponent(token)}&maxPurchase=1000000000`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { requiredCoverage: number; coverageMax: number; policy: string; tier: number };
    expect(body).toMatchObject({ requiredCoverage: 700_000_000, coverageMax: 1_050_000_000, policy: "B", tier: 0 });
  });

  it("registration verifies signatures, never signs", async () => {
    const noSig = await register(post({ acceptanceId: "a" }));
    expect(noSig.status).toBe(400);
    const unknown = await register(post({ acceptanceId: "acceptance-unknown", signature: "sig" }));
    expect(unknown.status).toBe(404);
    // Idempotent re-submission of an already-registered acceptance.
    getStore().update((d) => {
      d.acceptances["acc-1"] = {
        id: "acc-1",
        student: STUDENT,
        tokenKey: "k",
        maxPurchase: 1,
        coverageMax: 1,
        requiredCoverage: 1,
        mandateHash: "ab".repeat(32),
        mandateText: "t",
        guarantorName: "G",
        kycSessionId: "s",
        subscriberId: "sid",
        cardLabel: null,
        acceptedAt: 1,
        registeredSignature: "sig-registered",
      };
    });
    const deduped = await register(post({ acceptanceId: "acc-1", signature: "sig-registered" }));
    expect(deduped.status).toBe(200);
    expect(await deduped.json()).toEqual({ signature: "sig-registered", deduped: true });
  });

  it("unsigned webhooks are rejected or ignored, never trusted", async () => {
    process.env.DIDIT_WEBHOOK_SECRET = "route-test-didit-secret";
    const didit = await diditWebhook(
      new Request("http://test/api", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Timestamp": String(Math.floor(Date.now() / 1000)) },
        body: JSON.stringify({ webhook_type: "status.updated" }),
      }),
    );
    expect(didit.status).toBe(401);

    const mobbexBad = await mobbexWebhook(post({ nope: true }));
    expect(mobbexBad.status).toBe(400);
    const mobbexNoId = await mobbexWebhook(post({ data: { payment: {} } }));
    expect(mobbexNoId.status).toBe(400);
  });
});
