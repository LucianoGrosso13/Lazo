// Persistencia del pago en duda: snapshot completo por wallet+plan, solo se
// recupera la operación de la identidad exacta (otra wallet u otro plan → null).
import { describe, expect, it } from "vitest";
import {
  clearPendingPay,
  loadPendingPay,
  savePendingPay,
  type PendingPayOp,
} from "./pending-pay";

const op: PendingPayOp = {
  operation: "pay_installment",
  student: "stu1",
  planId: "plan-1",
  signature: "sigPago",
  expectedInstallmentIndex: 0,
  expectedOpenedAt: 1_700_000_000,
};

const store = () => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: m,
  };
};

describe("pending-pay", () => {
  it("guarda y recupera el snapshot completo de la firma original", () => {
    const s = store();
    savePendingPay(s, op);
    expect(loadPendingPay(s, "stu1", "plan-1")).toEqual(op);
  });

  it("otra wallet u otro plan no recuperan la operación", () => {
    const s = store();
    savePendingPay(s, op);
    expect(loadPendingPay(s, "stu2", "plan-1")).toBeNull();
    expect(loadPendingPay(s, "stu1", "plan-2")).toBeNull();
  });

  it("estado corrupto o ajeno se ignora, no se reconstruye", () => {
    const s = store();
    s.setItem("lazo.pay.pending.stu1.plan-1", "{nope");
    expect(loadPendingPay(s, "stu1", "plan-1")).toBeNull();
    s.setItem(
      "lazo.pay.pending.stu1.plan-1",
      JSON.stringify({ operation: "open_plan", student: "stu1", signature: "s" }),
    );
    expect(loadPendingPay(s, "stu1", "plan-1")).toBeNull();
    // Falta el índice de cuota esperado: snapshot incompleto, no sirve.
    s.setItem(
      "lazo.pay.pending.stu1.plan-1",
      JSON.stringify({
        operation: "pay_installment",
        student: "stu1",
        planId: "plan-1",
        signature: "sigPago",
      }),
    );
    expect(loadPendingPay(s, "stu1", "plan-1")).toBeNull();
  });

  it("clear borra solo la operación de esa wallet+plan", () => {
    const s = store();
    savePendingPay(s, op);
    savePendingPay(s, { ...op, planId: "plan-2" });
    clearPendingPay(s, "stu1", "plan-1");
    expect(loadPendingPay(s, "stu1", "plan-1")).toBeNull();
    expect(loadPendingPay(s, "stu1", "plan-2")).not.toBeNull();
  });
});
