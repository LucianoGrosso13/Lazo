import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { DEMO_MERCHANT, toMicro } from "./format";
import type { CuotasClient } from "./types";

const W = "WalletQuePaga11111111111111111111111111111";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{60,90}$/;

let c: CuotasClient;
beforeEach(() => {
  c = createMockCuotas();
});

const openPlan = (price: number) =>
  c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(price) });

describe("payInstallment", () => {
  it("paga la próxima cuota impaga y devuelve la plata al pool", async () => {
    const { value: plan } = await openPlan(1000);
    const poolBefore = await c.getPool();

    const { value: after, signature } = await c.payInstallment(W, plan.id);
    expect(signature).toMatch(BASE58);

    const inst = after.installments[0];
    expect(inst.status).toBe("Paid");
    expect(inst.paidAt).toBeGreaterThan(0);
    expect(inst.signature).toMatch(BASE58);
    expect(after.status).toBe("Active");

    const pool = await c.getPool();
    expect(pool.outstandingCredit).toBe(toMicro(700) - 233_333_333);
    expect(pool.available).toBe(poolBefore.available + 233_333_333);
    expect(pool.nav).toBe(pool.available + pool.outstandingCredit);
    expect(pool.events.find((e) => e.kind === "Repayment")).toMatchObject({
      amount: 233_333_333,
      planId: plan.id,
    });

    const rep = await c.getReputation(W);
    expect(rep.activeExposure).toBe(toMicro(700) - 233_333_333);

    const acts = await c.getActivity({ planId: plan.id });
    expect(acts.map((a) => a.kind)).toContain("InstallmentPaid");
  });

  it("al pagar las 3 cuotas el plan queda Settled y el estudiante sube de escalón", async () => {
    const { value: plan } = await openPlan(1000);
    await c.payInstallment(W, plan.id);
    await c.payInstallment(W, plan.id);
    const { value: settled } = await c.payInstallment(W, plan.id);

    expect(settled.status).toBe("Settled");
    expect(settled.installments.every((i) => i.status === "Paid")).toBe(true);

    const rep = await c.getReputation(W);
    expect(rep.tier).toBe(1);
    expect(rep.plansCompleted).toBe(1);
    expect(rep.activeExposure).toBe(0);
    expect(
      (await c.getActivity({ student: W })).map((a) => a.kind),
    ).toContain("TierUp");

    const pool = await c.getPool();
    expect(pool.outstandingCredit).toBe(0);

    // Pagar una cuarta vez no duplica la subida ni mueve plata
    await expect(c.payInstallment(W, plan.id)).rejects.toMatchObject({
      code: "nothing_due",
    });
    expect((await c.getReputation(W)).plansCompleted).toBe(1);
  });

  it("un plan con financiado menor al mínimo se salda pero no sube de escalón", async () => {
    const { value: plan } = await openPlan(120); // financiado 84 < 100
    expect(plan.counts).toBe(false);
    for (let i = 0; i < 3; i++) await c.payInstallment(W, plan.id);

    const plans = await c.getPlans(W);
    expect(plans[0].status).toBe("Settled");
    const rep = await c.getReputation(W);
    expect(rep.tier).toBe(0);
    expect(rep.plansCompleted).toBe(0);
    expect(
      (await c.getActivity({ student: W })).map((a) => a.kind),
    ).not.toContain("TierUp");
  });

  it("plan inexistente o ajeno → not_found", async () => {
    await expect(c.payInstallment(W, "plan-99")).rejects.toMatchObject({
      code: "not_found",
    });
    const { value: plan } = await openPlan(500);
    await expect(
      c.payInstallment("OtroEstudiante", plan.id),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
