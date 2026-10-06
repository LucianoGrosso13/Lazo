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
    // Compra individual por encima del tope del escalón
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1200) }),
    ).rejects.toMatchObject({ code: "exceeds_tier_max" });
    expect((await c.quote(toMicro(1200), W)).reasons).toContain(
      "exceeds_tier_max",
    );

    // Una compra abierta no bloquea la siguiente: lo que bloquea es el
    // margen del escalón. PC 1.000 (financiado 700) + curso 120 (financiado
    // 84): 784 ≤ 1.000 → ambos planes activos en paralelo.
    await c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1000) });
    const { value: curso } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(120),
    });
    expect(curso.status).toBe("Active");
    expect(curso.financed).toBe(toMicro(84));
    expect((await c.getReputation(W)).activeExposure).toBe(toMicro(784));
    expect(
      (await c.getPlans(W)).filter((p) => p.status === "Active"),
    ).toHaveLength(2);

    // Notebook 650 (financiado 455): 784 + 455 = 1.239 > 1.000 → sin margen
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(650) }),
    ).rejects.toMatchObject({ code: "exceeds_credit_limit" });
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(650) }),
    ).rejects.toBeInstanceOf(CuotasError);
  });

  it("pagar cuotas libera margen y habilita la compra que no entraba", async () => {
    const { value: pc } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });

    // 700 en uso + 455 nuevos > 1.000: la notebook no entra
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(650) }),
    ).rejects.toMatchObject({ code: "exceeds_credit_limit" });

    // Pagar la cuota 1 baja la exposición a 466,666667 → +455 = 921,666667 ≤ 1.000
    await c.payInstallment(W, pc.id);
    expect((await c.getReputation(W)).activeExposure).toBe(
      toMicro(700) - 233_333_333,
    );

    const { value: nb } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(650),
    });
    expect(nb.status).toBe("Active");
    expect(
      (await c.getPlans(W)).filter((p) => p.status === "Active"),
    ).toHaveLength(2);
  });

  it("rechaza si el comercio no existe", async () => {
    await expect(
      c.openPlan({ student: W, merchant: "ComercioFantasma", price: toMicro(100) }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("quote con plan activo: dentro del margen es elegible, sin margen marca exceeds_credit_limit", async () => {
    // Financiado 350 en uso: nunca más has_active_plan
    await c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(500) });

    // 350 + 210 (financiado de 300) = 560 ≤ 1.000 → entra
    const dentro = await c.quote(toMicro(300), W);
    expect(dentro.eligible).toBe(true);
    expect(dentro.reasons).toEqual([]);

    // 350 + 665 (financiado de 950) = 1.015 > 1.000 → sin margen
    const over = await c.quote(toMicro(950), W);
    expect(over.eligible).toBe(false);
    expect(over.reasons).toContain("exceeds_credit_limit");
    expect(over.reasons).not.toContain("has_active_plan");
  });
});
