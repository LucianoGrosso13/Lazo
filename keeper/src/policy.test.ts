import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { daysPastDue, effectivePenalty, evaluatePlan } from "./policy.ts";
import type { InstallmentView, PlanView, PolicyConfig } from "./policy.ts";

const CONFIG: PolicyConfig = {
  graceDays: 5,
  guarantorNoticeDay: 3,
  guarantorChargeDay: 15,
  secondsPerDay: 86_400,
  penaltyBps: 500,
};
const NOW = 1_800_000_000;
const OPENED = NOW - 100 * 86_400;

const inst = (index: number, daysOverdue: number, status: InstallmentView["status"] = "Due", penalty = 0): InstallmentView => ({
  index,
  amount: 233_330_000,
  penalty,
  dueAt: NOW - daysOverdue * 86_400,
  status,
  markedLate: status === "Late" || status === "ChargedToGuarantor",
});

const planWith = (installments: InstallmentView[], over: Partial<PlanView> = {}): PlanView => ({
  id: "plan-1",
  student: "student-1",
  openedAt: OPENED,
  withGuarantee: true,
  status: "Active",
  installments,
  ...over,
});

const planAt = (daysOverdue: number, status: InstallmentView["status"] = "Due"): PlanView =>
  planWith([inst(0, daysOverdue, status)]);

describe("daysPastDue", () => {
  it("counts whole days, -1 before due", () => {
    assert.equal(daysPastDue(NOW - 1, NOW, 86_400), 0);
    assert.equal(daysPastDue(NOW - 86_400, NOW, 86_400), 1);
    assert.equal(daysPastDue(NOW + 1, NOW, 86_400), -1);
  });
});

describe("effectivePenalty", () => {
  it("uses the reported penalty, or derives the configured fixed one when the crank was skipped", () => {
    assert.equal(effectivePenalty(inst(0, 20, "Late", 11_666_500), NOW, CONFIG), 11_666_500);
    // Past grace with penalty 0 (crank never ran): floor(233330000 * 500 / 10000).
    assert.equal(effectivePenalty(inst(0, 20, "Due", 0), NOW, CONFIG), 11_666_500);
    // Within grace: no penalty.
    assert.equal(effectivePenalty(inst(0, 3, "Due", 0), NOW, CONFIG), 0);
    // Not yet overdue: no penalty.
    const future = inst(0, 0, "Due", 0);
    future.dueAt = NOW + 10 * 86_400;
    assert.equal(effectivePenalty(future, NOW, CONFIG), 0);
  });
});

describe("evaluatePlan", () => {
  it("stays silent before the notice day", () => {
    assert.deepEqual(evaluatePlan(planAt(0), CONFIG, NOW, new Set()), []);
    assert.deepEqual(evaluatePlan(planAt(2), CONFIG, NOW, new Set()), []);
  });

  it("notifies on day 3 through day 5 (grace), never twice", () => {
    for (const day of [3, 4, 5]) {
      const actions = evaluatePlan(planAt(day), CONFIG, NOW, new Set());
      assert.equal(actions.length, 1);
      assert.equal(actions[0].kind, "notify");
      assert.equal(actions[0].day, day);
      assert.equal(actions[0].key, `notify:plan-1:${OPENED}:0`);
    }
    const done = new Set([`notify:plan-1:${OPENED}:0`]);
    assert.deepEqual(evaluatePlan(planAt(4), CONFIG, NOW, done), []);
  });

  it("skips notify while the notice-day config is pending (never hardcoded)", () => {
    const noNotice: PolicyConfig = { ...CONFIG, guarantorNoticeDay: null };
    assert.deepEqual(evaluatePlan(planAt(4), noNotice, NOW, new Set()), []);
  });

  it("marks late from day 6 to day 14", () => {
    for (const day of [6, 10, 14]) {
      const actions = evaluatePlan(planAt(day), CONFIG, NOW, new Set());
      assert.equal(actions.length, 1);
      assert.equal(actions[0].kind, "mark_late");
      assert.equal(actions[0].alreadyDone, false);
    }
  });

  it("still cranks derived-Late installments the program never marked", () => {
    const i = inst(0, 8, "Late", 0);
    i.markedLate = false;
    const actions = evaluatePlan(planWith([i]), CONFIG, NOW, new Set());
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, "mark_late");
    assert.equal(actions[0].alreadyDone, false);
  });

  it("syncs instead of re-sending when the chain already shows Late", () => {
    const actions = evaluatePlan(planAt(8, "Late"), CONFIG, NOW, new Set());
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, "mark_late");
    assert.equal(actions[0].alreadyDone, true);
  });

  it("charges from day 15 with amount + penalty", () => {
    const plan = planAt(15);
    plan.installments[0].penalty = 11_666_500;
    const actions = evaluatePlan(plan, CONFIG, NOW, new Set());
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, "charge");
    assert.equal(actions[0].amountMicro, 244_996_500);
    assert.equal(actions[0].accelerates, false);
  });

  it("targets the FIRST unpaid installment only (no parallel charges)", () => {
    // Two overdue rows: only the first unpaid gets a charge; the second is
    // still marked late individually so it carries its penalty.
    const plan = planWith([inst(0, 20, "Late", 11_666_500), inst(1, 16, "Due", 0)]);
    const actions = evaluatePlan(plan, CONFIG, NOW, new Set());
    const charges = actions.filter((a) => a.kind === "charge");
    assert.equal(charges.length, 1);
    assert.equal(charges[0].installment, 0);
    assert.ok(actions.some((a) => a.kind === "mark_late" && a.installment === 1));
  });

  it("accelerates on the second guarantor charge with the summed total", () => {
    const i0 = inst(0, 60, "ChargedToGuarantor", 11_666_500);
    const i1 = inst(1, 20, "Late", 11_666_500);
    const i2 = inst(2, 0, "Due", 0);
    i2.dueAt = NOW + 10 * 86_400; // not yet overdue: no penalty in the sum
    const plan = planWith([i0, i1, i2], { status: "Late" });
    const actions = evaluatePlan(plan, CONFIG, NOW, new Set());
    const charges = actions.filter((a) => a.kind === "charge");
    assert.equal(charges.length, 1);
    assert.equal(charges[0].installment, 1);
    assert.equal(charges[0].accelerates, true);
    // i1 (233330000 + 11666500) + i2 (233330000 + 0, future).
    assert.equal(charges[0].amountMicro, 244_996_500 + 233_330_000);
  });

  it("derives the configured penalty when the crank was skipped at day 15", () => {
    // Past grace, program reports penalty 0: the charge must still carry the
    // fixed 5% — never undercharge the processor.
    const plan = planAt(15, "Due");
    const actions = evaluatePlan(plan, CONFIG, NOW, new Set());
    assert.equal(actions[0].kind, "charge");
    assert.equal(actions[0].amountMicro, 233_330_000 + 11_666_500);
  });

  it("proposes a loss (never a charge) for unguaranteed plans past day 15", () => {
    const plan = planWith([inst(0, 20, "Late", 11_666_500)], { withGuarantee: false });
    const actions = evaluatePlan(plan, CONFIG, NOW, new Set());
    assert.equal(actions.length, 1);
    assert.equal(actions[0].kind, "loss");
    assert.equal(actions[0].amountMicro, 244_996_500);
  });

  it("skips paid, charged, upcoming, and settled plans", () => {
    assert.deepEqual(evaluatePlan(planAt(30, "Paid"), CONFIG, NOW, new Set()), []);
    assert.deepEqual(evaluatePlan(planAt(30, "ChargedToGuarantor"), CONFIG, NOW, new Set()), []);
    const future = planAt(0);
    future.installments[0].dueAt = NOW + 10 * 86_400;
    assert.deepEqual(evaluatePlan(future, CONFIG, NOW, new Set()), []);
    const settled = planAt(30);
    settled.status = "Settled";
    assert.deepEqual(evaluatePlan(settled, CONFIG, NOW, new Set()), []);
  });

  it("skips keys that already reached a terminal state", () => {
    const done = new Set([`charge:plan-1:${OPENED}:0`]);
    assert.deepEqual(evaluatePlan(planAt(20), CONFIG, NOW, done), []);
  });
});
