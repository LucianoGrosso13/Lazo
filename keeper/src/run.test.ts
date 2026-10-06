import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockAdapter, StubAdapter } from "./adapter.ts";
import type { KeeperEnv } from "./config.ts";
import type { ChargeResult, Gateway } from "./gateway.ts";
import { Journal } from "./journal.ts";
import { ExecuteError, executeProposal, runOnce } from "./run.ts";
import type { PlanView, PolicyConfig } from "./policy.ts";

const NOW = 1_800_000_000;
const OPENED = NOW - 100 * 86_400;
const CONFIG: PolicyConfig = {
  graceDays: 5,
  guarantorNoticeDay: 3,
  guarantorChargeDay: 15,
  secondsPerDay: 86_400,
  penaltyBps: 500,
};

const freshDir = (): string => mkdtempSync(join(tmpdir(), "lazo-run-test-"));

const env = (over: Partial<KeeperEnv> = {}): KeeperEnv => ({
  rpcUrl: "https://api.devnet.solana.com",
  dataDir: freshDir(),
  pollSeconds: 15,
  fiadorDataDir: null,
  mobbexApiKey: "k",
  mobbexAccessToken: "t",
  mobbexSubscriptionId: "s",
  mobbexArsPerUsdc: 1000,
  allowSimulatedRecovery: false,
  keeperKeypairPath: null,
  ...over,
});

const overduePlan = (days: number, over: Partial<PlanView> = {}): PlanView => ({
  id: "plan-1",
  student: "student-1",
  openedAt: OPENED,
  withGuarantee: true,
  status: "Active",
  installments: [{ index: 0, amount: 233_330_000, penalty: 11_666_500, dueAt: NOW - days * 86_400, status: "Due", markedLate: false }],
  ...over,
});

const bigCap = { "student-1": { coverageMax: 1_000_000_000, mandateHash: "m".repeat(64), acceptedAt: NOW - 200 } };

const okGateway = (calls: Array<{ reference: string; totalArs: number }>): Gateway => ({
  charge: async (req) => {
    calls.push({ reference: req.reference, totalArs: req.totalArs });
    return {
      simulated: false,
      approved: true,
      executionUid: "exe-1",
      paymentId: "pay-1",
      totalArs: req.totalArs,
      statusCode: "200",
      receiptHash: "receipt-hash-1",
    } satisfies ChargeResult;
  },
});

describe("runOnce", () => {
  it("proposes nothing while the chain client is pending (no fabricated plans)", async () => {
    const e = env();
    const report = await runOnce({
      adapter: new StubAdapter(),
      gateway: okGateway([]),
      journal: new Journal(e.dataDir),
      env: e,
      now: NOW,
    });
    assert.equal(report.ready, false);
    assert.match(report.reason, /pending_client/);
    assert.deepEqual(report.proposed, []);
  });

  it("proposes each action once across polls (no proposal spam)", async () => {
    const e = env();
    const deps = {
      adapter: new MockAdapter({
        config: CONFIG,
        plans: [overduePlan(20)],
        bindings: { "student-1": { subscriberId: "sid", cardLabel: "Visa •••• 1", linked: true } },
      }),
      gateway: okGateway([]),
      journal: new Journal(e.dataDir),
      env: e,
      now: NOW,
    };
    const first = await runOnce(deps);
    assert.equal(first.proposed.length, 1);
    assert.equal(first.proposed[0].kind, "charge");
    assert.equal(first.proposed[0].amountMicro, 244_996_500);
    const second = await runOnce(deps);
    assert.equal(second.proposed.length, 0);
    assert.equal(second.open.length, 1);
  });

  it("proposes recovery follow-ups for verified charges lacking registration", async () => {
    const e = env();
    const journal = new Journal(e.dataDir);
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "prop-old",
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: "r1",
      detail: "charged",
    });
    const report = await runOnce({
      adapter: new MockAdapter({ config: CONFIG, plans: [], bindings: {} }),
      gateway: okGateway([]),
      journal,
      env: e,
      now: NOW,
    });
    assert.equal(report.proposed.length, 1);
    assert.equal(report.proposed[0].kind, "recover");
  });

  it("treats a reopened PDA as a fresh generation (no cross-generation skip)", async () => {
    const e = env();
    const journal = new Journal(e.dataDir);
    // Generation 1 fully terminal (charged + recovered).
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "prop-gen1",
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: "r1",
      detail: "gen1",
    });
    journal.append({
      kind: "RECOVERY_REGISTERED",
      key: `recovery:plan-1:${OPENED}:0`,
      proposalId: "prop-gen1r",
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: "r1",
      detail: "gen1",
    });
    // Same PDA, new generation, overdue again: must propose fresh.
    const gen2 = overduePlan(20, { openedAt: OPENED + 10_000 });
    const report = await runOnce({
      adapter: new MockAdapter({ config: CONFIG, plans: [gen2], bindings: {} }),
      gateway: okGateway([]),
      journal,
      env: e,
      now: NOW,
    });
    assert.equal(report.proposed.length, 1);
    assert.equal(report.proposed[0].kind, "charge");
    assert.equal(report.proposed[0].key, `charge:plan-1:${OPENED + 10_000}:0`);
  });
});

describe("executeProposal", () => {
  it("charges once: a duplicate execution is refused, the gateway sees one call", async () => {
    const e = env();
    const calls: Array<{ reference: string; totalArs: number }> = [];
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20)],
      bindings: { "student-1": { subscriberId: "sid", cardLabel: "Visa •••• 1", linked: true } },
      coverageCaps: bigCap,
      keeperBalance: 500_000_000,
    });
    const deps = { adapter, gateway: okGateway(calls), journal: new Journal(e.dataDir), env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const first = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(first.status, "ok");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].reference, `lazo-plan-1-${OPENED}-i0-a1`);
    // 244.9965 USDC * 1000 = ARS 244996.50
    assert.equal(calls[0].totalArs, 244996.5);
    await assert.rejects(executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" }), (err: unknown) => {
      assert.ok(err instanceof ExecuteError && err.code === "proposal_closed");
      return true;
    });
    assert.equal(calls.length, 1);
    // Registering the recovery is a separate proposal; the receipt is reused, never remade.
    const follow = await runOnce(deps);
    const recover = follow.proposed.find((p) => p.kind === "recover");
    assert.ok(recover);
    const reg = await executeProposal(deps, { proposalId: recover.id, approvedBy: "operator" });
    assert.equal(reg.status, "ok");
    assert.ok(reg.signature);
    const recoveryCall = adapter.calls.find((c) => c.method === "registerRecovery");
    assert.deepEqual(recoveryCall?.args, ["plan-1", 0, 244_996_500, "receipt-hash-1"]);
  });

  it("failed funding: decline journals loss, never registers, never fabricates a receipt", async () => {
    const e = env();
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20)],
      bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
      coverageCaps: bigCap,
    });
    const gateway: Gateway = {
      charge: async () => ({
        simulated: false,
        approved: false,
        executionUid: "exe-2",
        paymentId: "pay-2",
        totalArs: 1,
        statusCode: "410",
        receiptHash: null,
      }),
    };
    const journal = new Journal(e.dataDir);
    const deps = { adapter, gateway, journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "failed");
    assert.match(report.detail, /declined/);
    assert.equal(adapter.calls.filter((c) => c.method === "registerRecovery").length, 0);
    const kinds = journal.readAll().map((r) => r.kind);
    assert.ok(kinds.includes("CHARGE_FAILED"));
    assert.ok(kinds.includes("LOSS_PROPOSED"));
    assert.ok(!kinds.includes("RECOVERY_REGISTERED"));
    for (const r of journal.readAll()) {
      assert.equal(r.receipt, null);
    }
  });

  it("gateway errors are retryable with the SAME reference (server-side dedupe)", async () => {
    const e = env();
    const refs: string[] = [];
    let calls = 0;
    const gateway: Gateway = {
      charge: async (req) => {
        calls += 1;
        refs.push(req.reference);
        if (calls === 1) throw new Error("ECONNRESET");
        return {
          simulated: false,
          approved: true,
          executionUid: "exe-3",
          paymentId: "pay-3",
          totalArs: req.totalArs,
          statusCode: "200",
          receiptHash: "r3",
        };
      },
    };
    const deps = {
      adapter: new MockAdapter({
        config: CONFIG,
        plans: [overduePlan(20)],
        bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
        coverageCaps: bigCap,
      }),
      gateway,
      journal: new Journal(e.dataDir),
      env: e,
      now: NOW,
    };
    const { proposed } = await runOnce(deps);
    const first = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(first.status, "error");
    const second = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(second.status, "ok");
    assert.deepEqual(refs, [`lazo-plan-1-${OPENED}-i0-a1`, `lazo-plan-1-${OPENED}-i0-a1`]);
  });

  it("blocked without a linked card or an ARS rate (no charge attempted)", async () => {
    const e = env();
    let charged = false;
    const gateway: Gateway = {
      charge: async () => {
        charged = true;
        throw new Error("must not be called");
      },
    };
    const noCard = {
      adapter: new MockAdapter({ config: CONFIG, plans: [overduePlan(20)], bindings: {}, coverageCaps: bigCap }),
      gateway,
      journal: new Journal(e.dataDir),
      env: e,
      now: NOW,
    };
    const { proposed } = await runOnce(noCard);
    const blocked = await executeProposal(noCard, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.detail, /no linked guarantor card/);

    const noRate = env({ mobbexArsPerUsdc: null });
    const deps2 = {
      adapter: new MockAdapter({
        config: CONFIG,
        plans: [overduePlan(20)],
        bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
        coverageCaps: bigCap,
      }),
      gateway,
      journal: new Journal(noRate.dataDir),
      env: noRate,
      now: NOW,
    };
    const r2 = await runOnce(deps2);
    assert.equal(r2.proposed[0].amountArs, null);
    const blocked2 = await executeProposal(deps2, { proposalId: r2.proposed[0].id, approvedBy: "operator" });
    assert.equal(blocked2.status, "blocked");
    assert.match(blocked2.detail, /MOBBEX_ARS_PER_USDC/);
    assert.equal(charged, false);
  });

  it("blocked without an accepted surety cap (refusing uncapped charges)", async () => {
    const e = env();
    let charged = false;
    const gateway: Gateway = {
      charge: async () => {
        charged = true;
        throw new Error("must not be called");
      },
    };
    const deps = {
      adapter: new MockAdapter({
        config: CONFIG,
        plans: [overduePlan(20)],
        bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
      }),
      gateway,
      journal: new Journal(e.dataDir),
      env: e,
      now: NOW,
    };
    const { proposed } = await runOnce(deps);
    const blocked = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.detail, /no accepted surety cap/);
    assert.equal(charged, false);
  });

  it("refuses charges when the surety cap is exhausted (cumulative bound)", async () => {
    const e = env();
    const calls: Array<{ reference: string; totalArs: number }> = [];
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20)],
      bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
      coverageCaps: { "student-1": { coverageMax: 244_996_500, mandateHash: "m".repeat(64), acceptedAt: NOW - 1 } },
      keeperBalance: 500_000_000,
    });
    const journal = new Journal(e.dataDir);
    // A prior charge already consumed the whole cap for this generation.
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "prop-prior",
      planId: "plan-1",
      installment: 0,
      amountMicro: 244_996_500,
      amountArs: 244996.5,
      receipt: "prior-receipt",
      detail: "prior",
    });
    const deps = { adapter, gateway: okGateway(calls), journal, env: e, now: NOW };
    // Force a second charge proposal for another installment of the same plan.
    const p = journal.propose({
      kind: "charge",
      key: `charge:plan-1:${OPENED}:1`,
      planId: "plan-1",
      installment: 1,
      amountMicro: 100_000_000,
      amountArs: 100000,
      detail: "charge plan=plan-1 installment=1 amount=100000000 day=20",
    });
    const report = await executeProposal(deps, { proposalId: p.id, approvedBy: "operator" });
    assert.equal(report.status, "blocked");
    assert.match(report.detail, /cap exhausted/);
    assert.equal(calls.length, 0);
    const kinds = journal.readAll().map((r) => r.kind);
    assert.ok(kinds.includes("CHARGE_REFUSED"));
    assert.ok(kinds.includes("LOSS_PROPOSED"));
  });

  it("caps partial charges at remaining surety room and proposes the shortfall as loss", async () => {
    const e = env();
    const calls: Array<{ reference: string; totalArs: number }> = [];
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20)],
      bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
      coverageCaps: { "student-1": { coverageMax: 200_000_000, mandateHash: "m".repeat(64), acceptedAt: NOW - 1 } },
      keeperBalance: 500_000_000,
    });
    const deps = { adapter, gateway: okGateway(calls), journal: new Journal(e.dataDir), env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "ok");
    assert.match(report.detail, /partial/);
    // Charged 200 USDC (cap), not the 244.9965 due.
    assert.equal(calls[0].totalArs, 200000);
    const records = deps.journal.readAll();
    const ok = records.find((r) => r.kind === "CHARGE_OK");
    assert.equal(ok?.amountMicro, 200_000_000);
    const loss = records.find((r) => r.kind === "LOSS_PROPOSED");
    assert.equal(loss?.amountMicro, 44_996_500);
  });

  it("recover is blocked when the keeper USDC source cannot fund it", async () => {
    const e = env();
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [],
      bindings: {},
      keeperBalance: 10, // far below the 100 due
    });
    const journal = new Journal(e.dataDir);
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "prop-old",
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: "r1",
      detail: "charged",
    });
    const deps = { adapter, gateway: okGateway([]), journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const recover = proposed.find((p) => p.kind === "recover");
    assert.ok(recover);
    const report = await executeProposal(deps, { proposalId: recover.id, approvedBy: "operator" });
    assert.equal(report.status, "blocked");
    assert.match(report.detail, /keeper USDC source/);
    assert.equal(adapter.calls.length, 0);
  });

  it("syncs recoveries whose receipt is already on-chain (no new receipt)", async () => {
    const e = env();
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [],
      bindings: {},
      keeperBalance: 1_000_000,
      receiptAlreadyUsed: true,
    });
    const journal = new Journal(e.dataDir);
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-1:${OPENED}:0`,
      proposalId: "prop-old",
      planId: "plan-1",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: "r1",
      detail: "charged",
    });
    const deps = { adapter, gateway: okGateway([]), journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const recover = proposed.find((p) => p.kind === "recover");
    assert.ok(recover);
    const report = await executeProposal(deps, { proposalId: recover.id, approvedBy: "operator" });
    assert.equal(report.status, "ok");
    assert.match(report.detail, /already on-chain/);
    const terminal = journal.readAll().find((r) => r.kind === "RECOVERY_REGISTERED");
    assert.equal(terminal?.receipt, "r1");
  });

  it("simulated plan C is declared and never registers a recovery", async () => {
    const e = env({ allowSimulatedRecovery: true });
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20)],
      bindings: { "student-1": { subscriberId: "sid", cardLabel: null, linked: true } },
      coverageCaps: bigCap,
    });
    const gateway: Gateway = {
      charge: async () => ({ simulated: true, reason: "plan_c: declared-simulated" }),
    };
    const journal = new Journal(e.dataDir);
    const deps = { adapter, gateway, journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "simulated");
    assert.equal(adapter.calls.length, 0);
    assert.ok(journal.readAll().some((r) => r.kind === "CHARGE_SIMULATED"));
    // No recovery follow-up is proposed for simulated charges.
    const follow = await runOnce(deps);
    assert.equal(follow.proposed.filter((p) => p.kind === "recover").length, 0);
  });

  it("mark_late executes, and pending adapters keep the proposal open", async () => {
    const e = env();
    const adapter = new MockAdapter({ config: CONFIG, plans: [overduePlan(8)], bindings: {} });
    const deps = { adapter, gateway: okGateway([]), journal: new Journal(e.dataDir), env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    assert.equal(proposed[0].kind, "mark_late");
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "ok");
    assert.ok(report.signature);

    const e2 = env();
    const pending = new MockAdapter({ config: CONFIG, plans: [overduePlan(8)], bindings: {}, pendingMarkLate: "crank pending" });
    const deps2 = { adapter: pending, gateway: okGateway([]), journal: new Journal(e2.dataDir), env: e2, now: NOW };
    const r2 = await runOnce(deps2);
    const rep2 = await executeProposal(deps2, { proposalId: r2.proposed[0].id, approvedBy: "operator" });
    assert.equal(rep2.status, "pending");
    assert.equal(deps2.journal.openProposals().length, 1);
  });

  it("loss proposals execute for unguaranteed plans", async () => {
    const e = env();
    const adapter = new MockAdapter({
      config: CONFIG,
      plans: [overduePlan(20, { withGuarantee: false })],
      bindings: {},
    });
    const deps = { adapter, gateway: okGateway([]), journal: new Journal(e.dataDir), env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    assert.equal(proposed[0].kind, "loss");
    const report = await executeProposal(deps, { proposalId: proposed[0].id, approvedBy: "operator" });
    assert.equal(report.status, "ok");
    assert.ok(deps.journal.hasTerminal(proposed[0].key));
  });

  it("recover without a verified receipt is blocked (no fabrication)", async () => {
    const e = env();
    const adapter = new MockAdapter({ config: CONFIG, plans: [], bindings: {}, keeperBalance: 1_000_000 });
    const journal = new Journal(e.dataDir);
    journal.append({
      kind: "CHARGE_OK",
      key: `charge:plan-9:${OPENED}:0`,
      proposalId: "prop-old",
      planId: "plan-9",
      installment: 0,
      amountMicro: 100,
      amountArs: 1,
      receipt: null,
      detail: "synced without receipt",
    });
    const deps = { adapter, gateway: okGateway([]), journal, env: e, now: NOW };
    const { proposed } = await runOnce(deps);
    const recover = proposed.find((p) => p.kind === "recover");
    assert.ok(recover);
    const report = await executeProposal(deps, { proposalId: recover.id, approvedBy: "operator" });
    assert.equal(report.status, "blocked");
    assert.match(report.detail, /no verified receipt/);
    assert.equal(adapter.calls.length, 0);
  });
});
