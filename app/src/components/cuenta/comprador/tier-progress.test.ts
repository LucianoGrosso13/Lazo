import { describe, expect, it } from "vitest";
import { DEMO_CONFIG } from "@/lib/cuotas/demo-config";
import type { Plan } from "@/lib/cuotas";
import { tierProgress } from "./tier-progress";

// Plans de mentira: solo importa id, counts, status y las cuotas.
const plan = (
  id: string,
  status: Plan["status"],
  counts: boolean,
  installments: { status: "Paid" | "Upcoming"; paidAt?: number }[],
): Pick<Plan, "id" | "counts" | "status" | "installments"> => ({
  id,
  status,
  counts,
  installments: installments.map((i, index) => ({
    index,
    amount: 1,
    dueAt: 0,
    penalty: 0,
    ...i,
  })),
});

describe("tierProgress", () => {
  it("Tier 1 sin planes: falta 1 plan saldado ≥ el mínimo de la config", () => {
    const p = tierProgress({ tier: 0 }, [], DEMO_CONFIG);
    expect(p.atMax).toBe(false);
    expect(p.tier).toBe(0);
    expect(p.nextTier).toBe(1);
    expect(p.plansNeeded).toBe(1);
    expect(p.minFinanced).toBe(DEMO_CONFIG.minFinancedToCount);
    expect(p.inFlight).toBeNull();
    expect(p.ratio).toBe(0);
  });

  it("Tier intermedio con plan que cuenta en curso: la barra marca el avance", () => {
    const plans = [
      plan(
        "plan-1",
        "Active",
        true,
        [
          { status: "Paid", paidAt: 10 },
          { status: "Paid", paidAt: 20 },
          { status: "Upcoming" },
        ],
      ),
    ];
    const p = tierProgress({ tier: 1 }, plans, DEMO_CONFIG);
    expect(p.atMax).toBe(false);
    expect(p.nextTier).toBe(2);
    expect(p.plansNeeded).toBe(1);
    expect(p.inFlight).toEqual({ planId: "plan-1", paid: 2, total: 3, ratio: 2 / 3 });
    expect(p.ratio).toBeCloseTo(2 / 3);
  });

  it("Tier máximo: no hay próximo escalón y la barra queda llena", () => {
    const p = tierProgress({ tier: 3 }, [], DEMO_CONFIG);
    expect(p.atMax).toBe(true);
    expect(p.nextTier).toBeNull();
    expect(p.plansNeeded).toBe(0);
    expect(p.ratio).toBe(1);
  });

  it("ignora planes saldados, recuperados o que no cuentan", () => {
    const plans = [
      plan("saldo", "Settled", true, [{ status: "Paid", paidAt: 1 }]),
      plan("tarde", "Active", false, [
        { status: "Paid", paidAt: 1 },
        { status: "Upcoming" },
      ]),
      plan("recuperado", "Recovered", false, [{ status: "Upcoming" }]),
    ];
    const p = tierProgress({ tier: 0 }, plans, DEMO_CONFIG);
    expect(p.inFlight).toBeNull();
    expect(p.ratio).toBe(0);
  });

  it("con varios planes que cuentan elige el más avanzado", () => {
    const plans = [
      plan("a", "Active", true, [{ status: "Paid", paidAt: 1 }, { status: "Upcoming" }, { status: "Upcoming" }]),
      plan("b", "Active", true, [{ status: "Paid", paidAt: 1 }, { status: "Paid", paidAt: 2 }, { status: "Upcoming" }]),
    ];
    const p = tierProgress({ tier: 2 }, plans, DEMO_CONFIG);
    expect(p.inFlight?.planId).toBe("b");
    expect(p.ratio).toBeCloseTo(2 / 3);
  });
});
