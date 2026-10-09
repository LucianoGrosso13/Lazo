import { describe, expect, it } from "vitest";
import type { Installment, Plan } from "@/lib/cuotas";
import { classifyPlan, summarizePlans } from "./overview-metrics";

const inst = (status: Installment["status"], amount = 100, penalty = 0): Installment => ({
  index: 0,
  amount,
  dueAt: 0,
  penalty,
  status,
});

const plan = (
  id: string,
  status: Plan["status"],
  installments: Installment[],
  financed = 1_000,
): Plan =>
  ({ id, student: `s-${id}`, status, installments, financed }) as unknown as Plan;

describe("overview-metrics", () => {
  it("clasifica por el peor estado de las cuotas", () => {
    expect(classifyPlan(plan("a", "Active", [inst("Upcoming")]))).toBe("ok");
    expect(classifyPlan(plan("b", "Active", [inst("Grace"), inst("Upcoming")]))).toBe("grace");
    expect(classifyPlan(plan("c", "Late", [inst("Late", 100, 5)]))).toBe("late");
    expect(classifyPlan(plan("d", "Active", [inst("ChargedToGuarantor"), inst("Upcoming")]))).toBe("charged");
    expect(classifyPlan(plan("e", "Recovered", [inst("ChargedToGuarantor")]))).toBe("charged");
    expect(classifyPlan(plan("f", "Settled", [inst("Paid")]))).toBeNull();
  });

  it("resume conteos, volumen y atención (mora antes que cobrado)", () => {
    const m = summarizePlans([
      plan("a", "Active", [inst("Upcoming")]),
      plan("b", "Settled", [inst("Paid")]),
      plan("c", "Late", [inst("Late", 200, 10)]),
      plan("d", "Recovered", [inst("ChargedToGuarantor", 500)]),
    ]);
    expect(m.opened).toBe(4);
    expect(m.active).toBe(2);
    expect(m.financed).toBe(4_000);
    expect(m.buckets).toEqual({ ok: 1, grace: 0, late: 1, charged: 1 });
    expect(m.delinquent).toBe(2);
    expect(m.attention.map((a) => [a.planId, a.bucket, a.amount])).toEqual([
      ["c", "late", 210],
      ["d", "charged", 500],
    ]);
  });

  it("sin planes devuelve ceros", () => {
    const m = summarizePlans([]);
    expect(m.opened).toBe(0);
    expect(m.attention).toEqual([]);
  });
});
