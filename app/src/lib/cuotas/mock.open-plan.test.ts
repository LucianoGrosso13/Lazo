import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { DEMO_MERCHANT, toMicro } from "./format";
import { CuotasError, type CuotasClient } from "./types";

const W = "WalletCompradora1111111111111111111111111111";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{60,90}$/;

let c: CuotasClient;
beforeEach(() => {
  c = createMockCuotas();
});

describe("openPlan", () => {
  it("compra de 1.000 en escalón 0: plan activo, comercio 951, pool adelanta 651", async () => {
    const before = await c.getPool();
    const { value: plan, signature } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      productId: "pc-1000",
    });

    expect(plan.status).toBe("Active");
    expect(plan.student).toBe(W);
    expect(plan.merchant).toBe(DEMO_MERCHANT);
    expect(plan.productId).toBe("pc-1000");
    expect(plan.price).toBe(toMicro(1000));
    expect(plan.downPayment).toBe(toMicro(300));
    expect(plan.financed).toBe(toMicro(700));
    expect(plan.merchantFee).toBe(toMicro(49));
    expect(plan.counts).toBe(true); // 700 financiados ≥ mínimo
    expect(plan.signature).toMatch(BASE58);
    expect(signature).toMatch(BASE58);

    // Cuotas a 30/60/90 días del reloj de demo
    const day = 86_400;
    expect(plan.installments.map((i) => i.amount)).toEqual([
      233_333_333, 233_333_333, 233_333_334,
    ]);
    expect(plan.installments.map((i) => i.status)).toEqual([
      "Upcoming",
      "Upcoming",
      "Upcoming",
    ]);
    for (const [idx, inst] of plan.installments.entries()) {
      expect(inst.dueAt).toBe(plan.openedAt + (idx + 1) * 30 * day);
    }

    // Comercio: cobra el precio menos el fee sobre lo financiado
    const merchant = await c.getMerchant(DEMO_MERCHANT);
    expect(merchant.settlementBalance).toBe(toMicro(951));
    expect(merchant.plansCount).toBe(1);
    expect(merchant.sales).toHaveLength(1);
    expect(merchant.sales[0]).toMatchObject({
      planId: plan.id,
      price: toMicro(1000),
      downPayment: toMicro(300),
      financed: toMicro(700),
      fee: toMicro(49),
      received: toMicro(951),
    });
    expect(merchant.sales[0].signature).toMatch(BASE58);

    // Pool: adelanta financiado − fee, queda el crédito entero pendiente
    const pool = await c.getPool();
    expect(pool.outstandingCredit).toBe(toMicro(700));
    expect(pool.accruedFees).toBe(toMicro(49));
    expect(pool.available).toBe(before.available - toMicro(651));
    expect(pool.nav).toBe(pool.available + pool.outstandingCredit);
    const advance = pool.events.find((e) => e.kind === "Advance");
    expect(advance).toMatchObject({ amount: toMicro(651), planId: plan.id });

    const rep = await c.getReputation(W);
    expect(rep.activeExposure).toBe(toMicro(700));

    const acts = await c.getActivity({ student: W });
    expect(acts.map((a) => a.kind)).toContain("PlanOpened");
    expect(
      (await c.getActivity({ planId: plan.id })).map((a) => a.kind),
    ).toContain("PlanOpened");

    expect(await c.getPlans(W)).toHaveLength(1);
  });

  it("rechaza con el motivo de la cotización cuando no es elegible", async () => {
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1200) }),
    ).rejects.toMatchObject({ code: "exceeds_tier_max" });

    // Una compra abierta bloquea la siguiente (un plan activo por estudiante)
    await c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1000) });
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(200) }),
    ).rejects.toMatchObject({ code: "has_active_plan" });
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(200) }),
    ).rejects.toBeInstanceOf(CuotasError);
  });

  it("rechaza si el comercio no existe", async () => {
    await expect(
      c.openPlan({ student: W, merchant: "ComercioFantasma", price: toMicro(100) }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("quote del estudiante con plan activo incluye has_active_plan", async () => {
    await c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(500) });
    const q = await c.quote(toMicro(300), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("has_active_plan");
  });
});
