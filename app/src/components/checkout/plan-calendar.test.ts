// Helpers del calendario del plan: montos exactos (6 dec), días restantes
// con el reloj de referencia y selección de la primera cuota impaga.
import { describe, expect, it } from "vitest";
import type { Plan } from "@/lib/cuotas";
import {
  daysUntil,
  isRounded,
  pendingAmount,
  unpaidInstallments,
} from "./plan-calendar";

const base: Plan = {
  id: "p1",
  student: "s",
  merchant: "m",
  price: 1_000_000_000,
  downPayment: 300_000_000,
  financed: 700_000_000,
  merchantFee: 0,
  installments: [
    { index: 0, amount: 233_333_333, dueAt: 2_592_000, penalty: 0, status: "Upcoming" },
    { index: 1, amount: 233_333_333, dueAt: 5_184_000, penalty: 0, status: "Upcoming" },
    { index: 2, amount: 233_333_334, dueAt: 7_776_000, penalty: 0, status: "Upcoming" },
  ],
  openedAt: 0,
  status: "Active",
  counts: true,
  terms: {
    termsVersion: 1,
    installmentsCount: 3,
    interestTotalBps: 0,
    downPaymentBps: 3000,
    coverageBps: 10_000,
    settlementId: "immediate",
    settlementDays: 0,
    settlementFeeBps: 0,
    provisional: false,
  },
  signature: "sig",
};

describe("plan-calendar helpers", () => {
  it("días restantes con el reloj de referencia (86400 s/día)", () => {
    expect(daysUntil(2_592_000, 0)).toBe(30);
    expect(daysUntil(2_592_000, 2_592_000)).toBe(0);
    expect(daysUntil(2_592_000, 2_592_000 + 1)).toBe(0); // vencida hace <1 día
    expect(daysUntil(2_592_000, 2_592_000 + 86_400)).toBe(-1);
    expect(daysUntil(100, 50, 10)).toBe(5); // reloj comprimido del mock
  });

  it("isRounded detecta montos con más de 2 decimales", () => {
    expect(isRounded(233_333_333)).toBe(true); // 233.333333
    expect(isRounded(233_333_334)).toBe(true);
    expect(isRounded(300_000_000)).toBe(false); // 300.00
  });

  it("primera impaga = la de menor vencimiento entre las no pagadas", () => {
    const p = unpaidInstallments(base);
    expect(p.map((i) => i.index)).toEqual([0, 1, 2]);
    const paid = {
      ...base,
      installments: base.installments.map((i, k) =>
        k === 0 ? { ...i, status: "Paid" as const } : i,
      ),
    };
    expect(unpaidInstallments(paid)[0].index).toBe(1);
  });

  it("pendingAmount suma cuotas impagas + punitorio de las atrasadas", () => {
    expect(pendingAmount(base)).toBe(700_000_000);
    const late = {
      ...base,
      installments: base.installments.map((i, k) =>
        k === 0 ? { ...i, status: "Late" as const, penalty: 11_666_667 } : i,
      ),
    };
    expect(pendingAmount(late)).toBe(700_000_000 + 11_666_667);
  });
});
