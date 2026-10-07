import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { DEMO_MERCHANT, DEMO_STUDENT_TIER3, toMicro } from "./format";
import { REFERENCE_FIGURES } from "./reference-figures";
import type { CuotasClient } from "./types";

const W = "WalletEstudianteNueva11111111111111111111111";

let c: CuotasClient;
beforeEach(() => {
  c = createMockCuotas();
});

describe("estado sembrado", () => {
  it("getConfig devuelve la tabla de escalones y el protocolo Normal en devnet", async () => {
    const config = await c.getConfig();
    expect(config.state).toBe("Normal");
    expect(config.cluster).toBe("devnet");
    expect(config.feeBps).toBe(700);
    expect(config.penaltyBps).toBe(500);
    expect(config.guaranteedTiers).toHaveLength(4);
    expect(config.guaranteedTiers[0].downPaymentBps).toBe(3000);
    expect(config.guaranteedTiers[3].downPaymentBps).toBe(0);
  });

  it("getClock arranca sin días adelantados", async () => {
    const clock = await c.getClock();
    expect(clock.daysAdvanced).toBe(0);
    expect(clock.secondsPerDay).toBe(86_400);
    expect(clock.now).toBeGreaterThan(0);
  });

  it("siembra Kroma activa y sin ventas", async () => {
    const m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.name).toBe("Kroma");
    expect(m.active).toBe(true);
    expect(m.settlementBalance).toBe(0);
    expect(m.plansCount).toBe(0);
    expect(m.sales).toEqual([]);
  });

  it("siembra el pool con junior y senior y dos depósitos", async () => {
    const pool = await c.getPool();
    expect(pool.juniorCapital).toBeGreaterThan(0);
    expect(pool.seniorCapital).toBeGreaterThan(0);
    expect(pool.available).toBe(pool.juniorCapital + pool.seniorCapital);
    expect(pool.outstandingCredit).toBe(0);
    expect(pool.accruedFees).toBe(0);
    expect(pool.nav).toBe(pool.available + pool.outstandingCredit);
    const deposits = pool.events.filter((e) => e.kind === "Deposit");
    expect(deposits.map((d) => d.tranche).sort()).toEqual(["junior", "senior"]);
  });

  it("siembra un estudiante de ejemplo en escalón 3 con fiador", async () => {
    const rep = await c.getReputation(DEMO_STUDENT_TIER3);
    expect(rep.tier).toBe(3);
    expect(rep.blockedFromNewPlans).toBe(false);
    const g = await c.getGuarantee(DEMO_STUDENT_TIER3);
    expect(g).not.toBeNull();
    expect(g!.active).toBe(true);
  });
});

describe("reputación y fiador", () => {
  it("getReputation crea la reputación en escalón 0 si no existe", async () => {
    const rep = await c.getReputation(W);
    expect(rep.student).toBe(W);
    expect(rep.tier).toBe(0);
    expect(rep.plansCompleted).toBe(0);
    expect(rep.lateCount).toBe(0);
    expect(rep.activeExposure).toBe(0);
  });

  it("una wallet nueva arranca con un fiador de ejemplo", async () => {
    await c.getReputation(W);
    const g = await c.getGuarantee(W);
    expect(g).not.toBeNull();
    expect(g!.active).toBe(true);
    expect(g!.maxPurchase).toBe(toMicro(1000));
    expect(g!.coverageMax).toBe(toMicro(1000));
    expect(g!.display?.guarantorName).toBe("Fiador de ejemplo");
    expect(g!.display?.cardLabel).toBe("Visa •••• 4242");
  });

  it("initReputation es idempotente", async () => {
    const first = await c.initReputation(W);
    expect(first.value.tier).toBe(0);
    expect(first.signature.length).toBeGreaterThan(0);
    const again = await c.initReputation(W);
    expect(again.value.tier).toBe(0);
    expect(await c.getPlans(W)).toEqual([]);
  });

  it("registerGuarantee y revokeGuarantee funcionan y registran actividad", async () => {
    const reg = await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(500),
      coverageMax: toMicro(400),
      mandateHash: "ab".repeat(32),
    });
    expect(reg.value.maxPurchase).toBe(toMicro(500));
    expect(reg.value.active).toBe(true);

    const revoked = await c.revokeGuarantee(W);
    expect(revoked.value.active).toBe(false);
    const g = await c.getGuarantee(W);
    expect(g!.active).toBe(false);

    const acts = await c.getActivity({ student: W });
    expect(acts.map((a) => a.kind)).toEqual([
      "GuaranteeRegistered",
      "GuaranteeRevoked",
    ]);
  });

  it("getActivity filtra por estudiante", async () => {
    await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(500),
      coverageMax: toMicro(400),
      mandateHash: "cd".repeat(32),
    });
    expect(await c.getActivity({ student: "otra-wallet" })).toEqual([]);
    expect((await c.getActivity({ student: W })).length).toBe(1);
  });

  it("subscribe notifica en cada mutación y la desuscripción corta", async () => {
    let calls = 0;
    const unsub = c.subscribe(() => calls++);
    await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(500),
      coverageMax: toMicro(400),
      mandateHash: "ef".repeat(32),
    });
    expect(calls).toBeGreaterThan(0);
    const prev = calls;
    unsub();
    await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(600),
      coverageMax: toMicro(500),
      mandateHash: "ef".repeat(32),
    });
    expect(calls).toBe(prev);
  });
});

describe("quote", () => {
  it("PC de 1.000 en escalón 0: anticipo 300, financiado 700, 3 cuotas, comercio 951", async () => {
    const q = await c.quote(toMicro(1000), W);
    expect(q.eligible).toBe(true);
    expect(q.reasons).toEqual([]);
    expect(q.tier).toBe(0);
    expect(q.withGuarantee).toBe(true);
    expect(q.downPayment).toBe(toMicro(300));
    expect(q.financed).toBe(toMicro(700));
    expect(q.installments).toEqual([233_333_333, 233_333_333, 233_333_334]);
    expect(q.interest).toBe(0);
    expect(q.total).toBe(toMicro(1000));
    expect(q.merchantFee).toBe(toMicro(49));
    expect(q.merchantReceives).toBe(toMicro(951));
    expect(q.requiredCoverage).toBe(toMicro(700));
  });

  it("escalón 3: anticipo 0 y tope 1.500", async () => {
    const q = await c.quote(toMicro(1500), DEMO_STUDENT_TIER3);
    expect(q.eligible).toBe(true);
    expect(q.tier).toBe(3);
    expect(q.downPayment).toBe(0);
    expect(q.financed).toBe(toMicro(1500));
    expect(q.installments).toEqual([toMicro(500), toMicro(500), toMicro(500)]);
    expect(q.requiredCoverage).toBe(toMicro(1500));
  });

  it("los cuatro escalones con fiador piden cobertura del 100% del financiado", async () => {
    // Escalón 0 (wallet nueva) y escalón 3 (sembrado) directos; 1 y 2 salen de
    // saldar planes a tiempo (700 financiados ≥ mínimo, sin pasar la gracia).
    const price = toMicro(500);
    const expectFull = async (wallet: string, tier: number, downBps: number) => {
      const q = await c.quote(price, wallet);
      expect(q.tier).toBe(tier);
      expect(q.eligible).toBe(true);
      expect(q.downPayment).toBe((price * downBps) / 10_000);
      expect(q.requiredCoverage).toBe(q.financed);
    };
    await expectFull(W, 0, 3000);
    for (let t = 1; t <= 3; t++) {
      const { value: p } = await c.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price,
      });
      for (let i = 0; i < 3; i++) await c.payInstallment(W, p.id);
      await expectFull(
        W,
        t,
        [2000, 1000, 0][t - 1],
      );
    }
    await expectFull(DEMO_STUDENT_TIER3, 3, 0);
  });

  it("cotiza 6 cuotas al 3% total sobre lo financiado", async () => {
    const q = await c.quote(toMicro(1000), W, { installments: 6 });
    expect(q.eligible).toBe(true);
    expect(q.installmentsCount).toBe(6);
    expect(q.interestTotalBps).toBe(300);
    expect(q.interest).toBe(toMicro(21));
    expect(q.total).toBe(toMicro(1021));
    expect(q.provisional).toBe(false);
    expect(q.installments).toHaveLength(6);
    expect(q.installments.reduce((a, b) => a + b, 0)).toBe(toMicro(721));
  });

  it("cotiza con plazo de cobro del comercio (30 días, 6,25%)", async () => {
    const q = await c.quote(toMicro(1000), W, { settlement: "deferred_30" });
    expect(q.eligible).toBe(true);
    expect(q.settlementId).toBe("deferred_30");
    expect(q.settlementDays).toBe(30);
    expect(q.merchantFee).toBe(toMicro(43.75));
    expect(q.merchantReceives).toBe(toMicro(956.25));
    expect(q.merchantAdvance).toBe(toMicro(300));
    expect(q.merchantPending).toBe(toMicro(656.25));
    expect(q.provisional).toBe(false);
  });

  it("por defecto cotiza 3 cuotas y cobro inmediato, sin provisional", async () => {
    const q = await c.quote(toMicro(1000), W);
    expect(q.installmentsCount).toBe(3);
    expect(q.settlementId).toBe("immediate");
    expect(q.settlementDays).toBe(0);
    expect(q.provisional).toBe(false);
    expect(q.merchantAdvance).toBe(toMicro(951));
    expect(q.merchantPending).toBe(0);
  });

  it("1 cuota → option_unavailable", async () => {
    const q = await c.quote(toMicro(1000), W, { installments: 1 });
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("option_unavailable");
  });

  it("opción de cobro deshabilitada o con tarifa null → option_unavailable", async () => {
    const disabled = createMockCuotas({
      config: {
        settlementOptions: [
          { id: "immediate", days: 0, feeBps: 700, tranches: 0, enabled: true, provisional: false },
          { id: "deferred_30", days: 30, feeBps: 625, tranches: 1, enabled: false, provisional: false },
        ],
      },
    });
    const q1 = await disabled.quote(toMicro(1000), W, { settlement: "deferred_30" });
    expect(q1.eligible).toBe(false);
    expect(q1.reasons).toContain("option_unavailable");

    const nullFee = createMockCuotas({
      config: {
        settlementOptions: [
          { id: "immediate", days: 0, feeBps: 700, tranches: 0, enabled: true, provisional: false },
          { id: "deferred_30", days: 30, feeBps: null, tranches: 1, enabled: true, provisional: false },
        ],
      },
    });
    const q2 = await nullFee.quote(toMicro(1000), W, { settlement: "deferred_30" });
    expect(q2.eligible).toBe(false);
    expect(q2.reasons).toContain("option_unavailable");

    await expect(
      nullFee.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(1000),
        settlement: "deferred_30",
      }),
    ).rejects.toMatchObject({ code: "option_unavailable" });
  });

  it("opción de plan deshabilitada → option_unavailable en quote y openPlan", async () => {
    const disabled = createMockCuotas({
      config: {
        planOptions: [
          { installments: 3, interestTotalBps: 0, enabled: true, minPrice: 0, provisional: false },
          { installments: 6, interestTotalBps: 300, enabled: false, minPrice: toMicro(350), provisional: false },
        ],
      },
    });
    const q = await disabled.quote(toMicro(1000), W, { installments: 6 });
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("option_unavailable");
    await expect(
      disabled.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(1000),
        installments: 6,
      }),
    ).rejects.toMatchObject({ code: "option_unavailable" });
    await expect(
      c.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(1000),
        installments: 1,
      }),
    ).rejects.toMatchObject({ code: "option_unavailable" });
  });

  it("precio por encima del tope del escalón → exceeds_tier_max", async () => {
    const q = await c.quote(toMicro(1200), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("exceeds_tier_max");
  });

  it("precio por encima del tope del fiador → exceeds_guarantor_max_purchase", async () => {
    await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(500),
      coverageMax: toMicro(1500),
      mandateHash: "ab".repeat(32),
    });
    const q = await c.quote(toMicro(800), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toEqual(["exceeds_guarantor_max_purchase"]);
  });

  it("cobertura del fiador insuficiente → exceeds_guarantee_coverage", async () => {
    await c.registerGuarantee({
      student: W,
      maxPurchase: toMicro(2000),
      coverageMax: toMicro(100),
      mandateHash: "ab".repeat(32),
    });
    const q = await c.quote(toMicro(1000), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toEqual(["exceeds_guarantee_coverage"]);
  });

  it("sin fiador → guarantor_required", async () => {
    await c.getReputation(W);
    await c.revokeGuarantee(W);
    const q = await c.quote(toMicro(100), W);
    expect(q.withGuarantee).toBe(false);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toEqual(["guarantor_required"]);
  });

  it("protocolo pausado → protocol_halted", async () => {
    const halted = createMockCuotas({ config: { state: "Halted" } });
    const q = await halted.quote(toMicro(1000), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("protocol_halted");
  });
});

describe("decisiones de producto y mock (Ticket 01)", () => {
  it("1.000 en tier 1 (índice 0), 6 cuotas → interés 21, total 1.021, requiredCoverage 721", async () => {
    const q = await c.quote(toMicro(1000), W, { installments: 6 });
    expect(q.eligible).toBe(true);
    expect(q.tier).toBe(0);
    expect(q.downPayment).toBe(toMicro(300));
    expect(q.financed).toBe(toMicro(700));
    expect(q.interest).toBe(toMicro(21));
    expect(q.total).toBe(toMicro(1021));
    expect(q.requiredCoverage).toBe(toMicro(721));
    expect(q.installments).toEqual([
      120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_670,
    ]);
  });

  it("300 con 6 cuotas → below_option_min", async () => {
    const q = await c.quote(toMicro(300), W, { installments: 6 });
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("below_option_min");
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(300), installments: 6 }),
    ).rejects.toMatchObject({ code: "below_option_min" });
  });

  it("sin garantía en openPlan rechaza con guarantor_required", async () => {
    await c.getReputation(W);
    await c.revokeGuarantee(W);
    await expect(
      c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(500) }),
    ).rejects.toMatchObject({ code: "guarantor_required" });
  });

  it("90 días: tramos a 30/60/90 días liberados una sola vez, independiente de mora", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      settlement: "deferred_90",
    });
    let m = await c.getMerchant(DEMO_MERCHANT);
    const sale = m.sales.find((s) => s.planId === plan.id)!;
    expect(sale.payoutTranches).toHaveLength(3);
    expect(sale.payoutTranches?.map((t) => t.amount)).toEqual([
      221_083_333, 221_083_333, 221_083_334,
    ]);
    expect(sale.payoutTranches?.reduce((acc, t) => acc + t.amount, 0)).toBe(toMicro(663.25));
    expect(m.settlementBalance).toBe(toMicro(300));
    expect(m.pendingSettlement).toBe(toMicro(663.25));

    // Día 30: vence primera cuota del estudiante y primer tramo del comercio.
    // Aunque el estudiante no haya pagado nada aún, el tramo se libera.
    await c.advanceDays(30);
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300) + 221_083_333);
    expect(m.pendingSettlement).toBe(toMicro(663.25) - 221_083_333);

    // Avanzamos hasta día 100 de golpe (adelantar de más).
    await c.advanceDays(70);
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300) + toMicro(663.25));
    expect(m.pendingSettlement).toBe(0);
    const updatedSale = m.sales.find((s) => s.planId === plan.id)!;
    expect(updatedSale.settled).toBe(true);
    expect(updatedSale.payoutTranches?.every((t) => t.released)).toBe(true);

    // Actividad PayoutReleased registrada
    const acts = await c.getActivity({ merchant: DEMO_MERCHANT });
    expect(acts.filter((a) => a.kind === "PayoutReleased")).toHaveLength(3);

    // Adelantar aún más no duplica pagos
    await c.advanceDays(30);
    m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.settlementBalance).toBe(toMicro(300) + toMicro(663.25));
  });

  it("60 días → 2 tramos de 329,875 (= (700 − 5,75%) / 2)", async () => {
    const q = await c.quote(toMicro(1000), W, { settlement: "deferred_60" });
    expect(q.payoutTranches).toHaveLength(2);
    expect(q.payoutTranches.map((t) => t.amount)).toEqual([329_875_000, 329_875_000]);
    expect(q.merchantFee).toBe(toMicro(40.25));
    expect(q.merchantAdvance).toBe(toMicro(300));
    expect(q.merchantPending).toBe(toMicro(659.75));

    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      settlement: "deferred_60",
    });
    const m = await c.getMerchant(DEMO_MERCHANT);
    const sale = m.sales.find((s) => s.planId === plan.id)!;
    expect(sale.payoutTranches?.map((t) => t.amount)).toEqual([329_875_000, 329_875_000]);
  });

  it("pool sin liquidez libre disponible → pool_liquidity", async () => {
    const lowLiquidity = createMockCuotas({
      pool: {
        available: toMicro(100),
        juniorCapital: toMicro(50),
        seniorCapital: toMicro(50),
      },
    });
    const q = await lowLiquidity.quote(toMicro(1000), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("pool_liquidity");

    await expect(
      lowLiquidity.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(1000),
      }),
    ).rejects.toMatchObject({ code: "pool_liquidity" });
  });

  it("orden de mostrador: crear -> pagar -> paid y venta en comercio; reusar o vencida -> order_unavailable", async () => {
    const order = await c.createCounterOrder(DEMO_MERCHANT, {
      amount: toMicro(500),
      description: "Laptop mostrador",
    });
    expect(order.id).toMatch(/^ord_/);
    expect(order.status).toBe("open");
    expect(order.merchant).toBe(DEMO_MERCHANT);
    expect(order.amount).toBe(toMicro(500));
    expect(order.description).toBe("Laptop mostrador");

    const fetched = await c.getCounterOrder(order.id);
    expect(fetched).toEqual(order);

    const list = await c.listCounterOrders(DEMO_MERCHANT);
    expect(list.some((o) => o.id === order.id)).toBe(true);

    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(500),
      orderId: order.id,
    });
    expect(plan.id).toBeDefined();

    const paidOrder = await c.getCounterOrder(order.id);
    expect(paidOrder?.status).toBe("paid");

    const m = await c.getMerchant(DEMO_MERCHANT);
    expect(m.sales.some((s) => s.planId === plan.id)).toBe(true);

    await expect(
      c.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(500),
        orderId: order.id,
      }),
    ).rejects.toMatchObject({ code: "order_unavailable" });

    const expiredOrder = await c.createCounterOrder(DEMO_MERCHANT, {
      amount: toMicro(400),
      description: "Vence pronto",
    });
    await c.advanceDays(2);
    await expect(
      c.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(400),
        orderId: expiredOrder.id,
      }),
    ).rejects.toMatchObject({ code: "order_unavailable" });
  });

  it("caso por defecto idéntico: 3 cuotas con cobro inmediato deja 951 al comercio", async () => {
    const q = await c.quote(toMicro(1000), W);
    expect(q.installmentsCount).toBe(3);
    expect(q.settlementId).toBe("immediate");
    expect(q.merchantFee).toBe(toMicro(49));
    expect(q.merchantReceives).toBe(toMicro(951));
    expect(q.merchantAdvance).toBe(toMicro(951));
    expect(q.merchantPending).toBe(0);
    expect(q.payoutTranches).toEqual([]);
  });
});

describe("REFERENCE_FIGURES", () => {
  it("exporta las cifras de terceros con la nota de referencia", () => {
    expect(REFERENCE_FIGURES.note).toContain("referencia");
    expect(REFERENCE_FIGURES.mercadoPagoCfteaPct.min).toBe(76);
    expect(REFERENCE_FIGURES.mercadoPagoCfteaPct.max).toBe(1376);
    expect(REFERENCE_FIGURES.cuotaMipymeMerchantPct).toBeCloseTo(6.91);
    expect(REFERENCE_FIGURES.mercadoPagoMerchantPct).toBeCloseTo(12.49);
    expect(REFERENCE_FIGURES.gocuotasSettlementBusinessDays).toBe(22);
    expect(REFERENCE_FIGURES.lazoSeniorTargetYieldPct).toBe(8);
  });
});
