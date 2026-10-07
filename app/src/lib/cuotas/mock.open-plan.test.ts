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

describe("términos del plan y cobro del comercio", () => {
  it("plan de 6 cuotas: interés 21, seis cuotas que suman 721 y términos guardados", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      installments: 6,
    });

    expect(plan.installments).toHaveLength(6);
    // 721 repartido en 6: la última cuota absorbe el redondeo.
    expect(plan.installments.map((i) => i.amount)).toEqual([
      120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_670,
    ]);
    expect(plan.installments.reduce((a, i) => a + i.amount, 0)).toBe(toMicro(721));
    // Vencimientos mensuales: 30, 60, …, 180 días del reloj de demo.
    const day = 86_400;
    for (const [idx, inst] of plan.installments.entries()) {
      expect(inst.dueAt).toBe(plan.openedAt + (idx + 1) * 30 * day);
    }

    // Copia inmutable de términos con los que se abrió.
    expect(plan.terms).toEqual({
      termsVersion: 1,
      installmentsCount: 6,
      interestTotalBps: 300,
      downPaymentBps: 3000,
      coverageBps: 10_000,
      settlementId: "immediate",
      settlementDays: 0,
      settlementFeeBps: 700,
      provisional: true,
    });
    // La comisión del comercio no cambia por el interés del comprador.
    expect(plan.merchantFee).toBe(toMicro(49));
    expect((await c.getReputation(W)).activeExposure).toBe(toMicro(721));
  });

  it("cobro a 30 días: +300 al abrir y +656,25 en la fecha de cobro, una sola vez", async () => {
    const day = 86_400;
    const pool0 = await c.getPool();
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      settlement: "deferred_30",
    });
    expect(plan.terms.settlementId).toBe("deferred_30");
    expect(plan.terms.settlementDays).toBe(30);
    expect(plan.terms.settlementFeeBps).toBe(625);

    // Al abrir: solo entra el anticipo (300); lo financiado queda pendiente.
    let m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300));
    expect(m.pendingSettlement).toBe(toMicro(656.25));
    const sale = m.sales[0];
    expect(sale.settlementId).toBe("deferred_30");
    expect(sale.settlementDays).toBe(30);
    expect(sale.settlementAt).toBe(plan.openedAt + 30 * day);
    expect(sale.pendingSettlement).toBe(toMicro(656.25));
    expect(sale.settled).toBe(false);
    expect(sale.received).toBe(toMicro(956.25));

    // El pool todavía no adelanta nada (a diferencia del cobro inmediato).
    let pool = await c.getPool();
    expect(pool.available).toBe(pool0.available);
    expect(pool.outstandingCredit).toBe(toMicro(700));
    expect(pool.accruedFees).toBe(toMicro(43.75));
    expect(pool.events.filter((e) => e.kind === "Advance")).toHaveLength(0);

    // Antes de la fecha no liquida; al llegar, una sola vez.
    await c.advanceDays(29);
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300));
    expect(m.pendingSettlement).toBe(toMicro(656.25));

    await c.advanceDays(1); // día 30: fecha de cobro
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(956.25));
    expect(m.pendingSettlement).toBe(0);
    expect(m.sales[0].settled).toBe(true);
    expect(m.sales[0].pendingSettlement).toBe(0);

    pool = await c.getPool();
    const advances = pool.events.filter((e) => e.kind === "Advance");
    expect(advances).toHaveLength(1);
    expect(advances[0].amount).toBe(toMicro(656.25));
    expect(advances[0].at).toBe(plan.openedAt + 30 * day);
    expect(pool.available).toBe(pool0.available - toMicro(656.25));

    // Adelantar de nuevo no paga dos veces.
    await c.advanceDays(60);
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(956.25));
    pool = await c.getPool();
    expect(pool.events.filter((e) => e.kind === "Advance")).toHaveLength(1);
  });

  it("openPlan sin plazo usa el predeterminado del comercio", async () => {
    await c.setMerchantSettlement(DEMO_MERCHANT, "deferred_60");
    expect((await c.getMerchant(DEMO_MERCHANT)).settlementId).toBe("deferred_60");

    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    // 60 días → comisión 5,5%: pendiente 700 − 38,50 = 661,50
    expect(plan.terms.settlementId).toBe("deferred_60");
    expect(plan.terms.settlementDays).toBe(60);
    expect(plan.merchantFee).toBe(toMicro(38.5));
    const m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300));
    expect(m.pendingSettlement).toBe(toMicro(661.5));
    expect(m.sales[0].settlementAt).toBe(plan.openedAt + 60 * 86_400);
  });

  it("el plazo de la venta y los términos del plan no cambian si el predeterminado cambia después", async () => {
    await c.setMerchantSettlement(DEMO_MERCHANT, "deferred_30");
    const { value: first } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(400),
    });
    expect(first.terms.settlementId).toBe("deferred_30");

    // El comercio cambia su predeterminado: la venta ya abierta no se toca.
    await c.setMerchantSettlement(DEMO_MERCHANT, "immediate");
    const { value: second } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(200),
    });
    expect(second.terms.settlementId).toBe("immediate");

    const savedFirst = (await c.getPlans(W)).find((p) => p.id === first.id)!;
    expect(savedFirst.terms.settlementId).toBe("deferred_30");
    expect(savedFirst.terms.settlementDays).toBe(30);
    const sale = (await c.getMerchant(DEMO_MERCHANT)).sales.find(
      (s) => s.planId === first.id,
    )!;
    expect(sale.settlementId).toBe("deferred_30");
    expect(sale.pendingSettlement).toBeGreaterThan(0);
    expect(sale.settled).toBe(false);
  });
});
