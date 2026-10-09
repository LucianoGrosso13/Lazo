// Flujo de pago de cuota sobre el runner de ticket01: paga la primera
// impaga con progreso, el plan releído baja la deuda (700 → 466,666667 y
// 2 pendientes), `uncertain` restaurado reconcilia la firma original y un
// veredicto `failed` habilita reintento — nunca un envío a ciegas.
import { describe, expect, it, vi } from "vitest";
import { CuotasError, type Plan, type TxProgress } from "@/lib/cuotas";
import { createOpenPlanRunner, type OpenPlanRun } from "./open-plan-flow";
import { pendingAmount, unpaidInstallments } from "./plan-calendar";

const plan: Plan = {
  id: "plan-1",
  student: "stu1",
  merchant: "merch1",
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
  signature: "sigA",
};

const paidPlan: Plan = {
  ...plan,
  installments: [
    { ...plan.installments[0], status: "Paid", paidAt: 1_000, signature: "sigPay" },
    plan.installments[1],
    plan.installments[2],
  ],
};

function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
  };
}

/** Run con forma de `payInstallment`: mismas fases del contrato. */
function payRun(
  impl: (onProgress: (p: TxProgress) => void) => Promise<{ value: Plan; signature: string }>,
  extra?: Partial<OpenPlanRun>,
): OpenPlanRun {
  return { call: impl, isCurrent: () => true, ...extra };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe("pago de cuota (runner + plan releído)", () => {
  it("paga la primera impaga: plan con cuota Paid, 2 pendientes y deuda exacta", async () => {
    const runner = createOpenPlanRunner({ ...fakeClock(), minPostSendMs: 2_000 });
    runner.start(
      payRun(async (onProgress) => {
        onProgress({ phase: "preparing" });
        onProgress({ phase: "awaiting_approval" });
        onProgress({ phase: "sending", signature: "sigPay" });
        onProgress({ phase: "confirming", signature: "sigPay" });
        onProgress({ phase: "syncing", signature: "sigPay" });
        return { value: paidPlan, signature: "sigPay" };
      }),
    );
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({ kind: "success", signature: "sigPay" }),
    );
    const out = runner.state();
    if (out.kind !== "success" || !out.plan) throw new Error("sin plan");
    expect(out.plan.installments[0].status).toBe("Paid");
    // Caso base del ticket: 700 - 233,333333 = 466,666667 exactos, 2 impagas.
    expect(pendingAmount(out.plan)).toBe(466_666_667);
    expect(unpaidInstallments(out.plan).map((i) => i.index)).toEqual([1, 2]);
    // El pago anticipado no movió las fechas de las cuotas 2 y 3.
    expect(out.plan.installments[1].dueAt).toBe(5_184_000);
    expect(out.plan.installments[2].dueAt).toBe(7_776_000);
  });

  it("insufficient_funds: falla antes de firmar, sin espera artificial", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    runner.start(
      payRun(async (onProgress) => {
        onProgress({ phase: "preparing" });
        throw new CuotasError("insufficient_funds");
      }),
    );
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "failed",
        error: { code: "insufficient_funds" },
      }),
    );
    expect(clock.now()).toBe(0);
  });

  it("uncertain restaurado (reload) reconcilia la firma original del pago", async () => {
    const runner = createOpenPlanRunner({ ...fakeClock(), minPostSendMs: 2_000 });
    let calls = 0;
    const run = payRun(
      async () => {
        calls += 1;
        return { value: paidPlan, signature: "sigNueva" };
      },
      {
        reconcile: async (sig) =>
          sig === "sigPay"
            ? { status: "confirmed", signature: "sigPay", plan: paidPlan }
            : { status: "pending", signature: sig ?? "" },
      },
    );
    runner.restore(run, "sigPay");
    expect(runner.state().kind).toBe("uncertain");
    // Ningún arranque nuevo mientras el pago está en duda.
    runner.start(run);
    await flush();
    expect(calls).toBe(0);
    runner.recheck();
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "success",
        reconciled: true,
        signature: "sigPay",
      }),
    );
    const out = runner.state();
    if (out.kind !== "success" || !out.plan) throw new Error("sin plan");
    expect(unpaidInstallments(out.plan)).toHaveLength(2);
  });

  it("uncertain con veredicto failed habilita un pago fresco (misma cuota)", async () => {
    const runner = createOpenPlanRunner({ ...fakeClock(), minPostSendMs: 2_000 });
    runner.start(
      payRun(
        async () => {
          throw new CuotasError("uncertain", "timeout", "sigPay");
        },
        {
          reconcile: async (sig) => ({ status: "failed", signature: sig ?? "" }),
        },
      ),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("uncertain"));
    runner.recheck();
    await vi.waitFor(() => expect(runner.state().kind).toBe("failed_onchain"));
    runner.start(payRun(async () => ({ value: paidPlan, signature: "sigPay2" })));
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({ kind: "success", signature: "sigPay2" }),
    );
  });
});
