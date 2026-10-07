import { describe, expect, it } from "vitest";
import { DEMO_CONFIG } from "./demo-config";
import { toMicro } from "./format";
import { createMockCuotas } from "./mock";
import {
  d8Breakdown,
  defaultPlanOption,
  immediateFeeBps,
  planOptionOf,
  planOptionsOf,
  quoteTerms,
  quoteTermsFor,
  settlementAvailable,
  settlementDateOf,
  settlementOptionOf,
  settlementOptionsOf,
} from "./terms";
import type { ProtocolConfig, Quote } from "./types";

/** Config histórica: sin las opciones ni los campos D8 (estado viejo). */
function legacyConfig(): ProtocolConfig {
  const c = { ...DEMO_CONFIG };
  delete c.planOptions;
  delete c.settlementOptions;
  delete c.originationBps;
  delete c.adminFeeAnnualBps;
  return c;
}

const baseQuote = (over: Partial<Quote> = {}): Quote => ({
  price: toMicro(1000),
  tier: 0,
  withGuarantee: true,
  downPayment: toMicro(300),
  financed: toMicro(700),
  installments: [233_333_333, 233_333_333, 233_333_334],
  interest: 0,
  total: toMicro(1000),
  merchantFee: toMicro(49),
  merchantReceives: toMicro(951),
  merchantAdvance: toMicro(951),
  merchantPending: 0,
  requiredCoverage: toMicro(700),
  installmentsCount: 3,
  interestTotalBps: 0,
  settlementId: "immediate",
  settlementDays: 0,
  provisional: false,
  eligible: true,
  reasons: [],
  ...over,
});

describe("planOptionsOf", () => {
  it("cae a una opción de `installmentsCount` cuotas si la config no las trae", () => {
    const config = legacyConfig();
    expect(planOptionsOf(config)).toEqual([
      { installments: 3, interestTotalBps: 0, enabled: true, provisional: false },
    ]);
    expect(defaultPlanOption(config)?.installments).toBe(3);
  });

  it("devuelve las opciones de la DEMO_CONFIG (3 sin interés, 6 al 3% provisional)", () => {
    const opts = planOptionsOf(DEMO_CONFIG);
    expect(opts).toEqual([
      { installments: 3, interestTotalBps: 0, enabled: true, provisional: false },
      { installments: 6, interestTotalBps: 300, enabled: true, provisional: true },
    ]);
    expect(planOptionOf(DEMO_CONFIG, 6)?.interestTotalBps).toBe(300);
    expect(planOptionOf(DEMO_CONFIG, 1)).toBeUndefined();
  });
});

describe("settlementOptionsOf", () => {
  it("cae a cobro inmediato con `feeBps` si la config no las trae", () => {
    const config = legacyConfig();
    expect(settlementOptionsOf(config)).toEqual([
      { id: "immediate", days: 0, feeBps: 700, enabled: true, provisional: false },
    ]);
  });

  it("devuelve los cuatro plazos de la DEMO_CONFIG con sus comisiones", () => {
    const opts = settlementOptionsOf(DEMO_CONFIG);
    expect(opts.map((o) => [o.id, o.days, o.feeBps])).toEqual([
      ["immediate", 0, 700],
      ["deferred_30", 30, 625],
      ["deferred_60", 60, 550],
      ["deferred_90", 90, 525],
    ]);
    expect(opts[0].provisional).toBe(false);
    expect(opts.slice(1).every((o) => o.provisional && o.enabled)).toBe(true);
  });
});

describe("settlementAvailable", () => {
  it("rechaza opción ausente, deshabilitada o con tarifa null", () => {
    expect(settlementAvailable(undefined)).toBe(false);
    expect(
      settlementAvailable({
        id: "deferred_30",
        days: 30,
        feeBps: 625,
        enabled: false,
        provisional: true,
      }),
    ).toBe(false);
    expect(
      settlementAvailable({
        id: "deferred_30",
        days: 30,
        feeBps: null,
        enabled: true,
        provisional: true,
      }),
    ).toBe(false);
    expect(settlementAvailable(settlementOptionOf(DEMO_CONFIG, "deferred_30"))).toBe(true);
  });
});

describe("settlementDateOf", () => {
  it("inmediata cae el mismo día de apertura; diferida suma los días del plazo", () => {
    const openedAt = 1_700_000_000;
    const spd = 86_400;
    expect(
      settlementDateOf(openedAt, settlementOptionOf(DEMO_CONFIG, "immediate")!, spd),
    ).toBe(openedAt);
    expect(
      settlementDateOf(openedAt, settlementOptionOf(DEMO_CONFIG, "deferred_30")!, spd),
    ).toBe(openedAt + 30 * spd);
    expect(settlementDateOf(openedAt, { days: 60 }, spd)).toBe(openedAt + 60 * spd);
  });
});

describe("immediateFeeBps", () => {
  it("devuelve la tarifa del cobro inmediato de la config o el `feeBps` histórico", () => {
    expect(immediateFeeBps(DEMO_CONFIG)).toBe(700);
    expect(immediateFeeBps(legacyConfig())).toBe(700);
  });
});

describe("quoteTerms", () => {
  const tier0 = DEMO_CONFIG.guaranteedTiers[0];

  it("ejemplo canónico 1.000/300/700 a 3 cuotas con cobro inmediato", () => {
    const t = quoteTerms({
      price: toMicro(1000),
      tier: tier0,
      plan: { installments: 3, interestTotalBps: 0 },
      settlement: { days: 0, feeBps: 700 },
    });
    expect(t.downPayment).toBe(toMicro(300));
    expect(t.financed).toBe(toMicro(700));
    expect(t.interest).toBe(0);
    expect(t.repayable).toBe(toMicro(700));
    expect(t.installments).toEqual([233_333_333, 233_333_333, 233_333_334]);
    expect(t.total).toBe(toMicro(1000));
    expect(t.merchantFee).toBe(toMicro(49));
    expect(t.merchantReceives).toBe(toMicro(951));
    expect(t.merchantAdvance).toBe(toMicro(951));
    expect(t.merchantPending).toBe(0);
    expect(t.requiredCoverage).toBe(toMicro(700));
  });

  it("cobro diferido: el comercio entra solo el anticipo y el resto queda pendiente", () => {
    const t = quoteTerms({
      price: toMicro(1000),
      tier: tier0,
      plan: { installments: 3, interestTotalBps: 0 },
      settlement: { days: 30, feeBps: 625 },
    });
    expect(t.merchantFee).toBe(toMicro(43.75));
    expect(t.merchantReceives).toBe(toMicro(956.25));
    expect(t.merchantAdvance).toBe(toMicro(300));
    expect(t.merchantPending).toBe(toMicro(656.25));
    expect(t.settlementDays).toBe(30);
  });
});

describe("quoteTermsFor", () => {
  it("devuelve undefined cuando la opción no está disponible, como quote()", async () => {
    const c = createMockCuotas();
    expect(
      quoteTermsFor(DEMO_CONFIG, toMicro(1000), { installments: 1 }),
    ).toBeUndefined();
    const q = await c.quote(toMicro(1000), "W-paridad", { installments: 1 });
    expect(q.reasons).toContain("option_unavailable");
  });

  it("usa la primera opción habilitada y el cobro inmediato por defecto", () => {
    const t = quoteTermsFor(DEMO_CONFIG, toMicro(1000));
    expect(t).toBeDefined();
    expect(t!.installments).toHaveLength(3);
    expect(t!.settlementDays).toBe(0);
    expect(t!.interest).toBe(0);
  });

  it("cotiza igual con la config histórica sin opciones (3 cuotas, inmediato)", () => {
    const config = legacyConfig();
    const t = quoteTermsFor(config, toMicro(1000));
    expect(t).toBeDefined();
    expect(t!.merchantFee).toBe(toMicro(49));
    // Y las opciones nuevas no existen en el estado viejo.
    expect(
      quoteTermsFor(config, toMicro(1000), { installments: 6 }),
    ).toBeUndefined();
    expect(
      quoteTermsFor(config, toMicro(1000), { settlement: "deferred_30" }),
    ).toBeUndefined();
  });

  // La garantía del ticket: el helper puro y `quote()` del mock hacen la
  // misma cuenta para un comprador nuevo con fiador en todas las
  // combinaciones habilitadas (3 y 6 cuotas × los cuatro plazos de cobro).
  describe("paridad con quote() del mock", () => {
    const W = "WalletParidadTerminos1111111111111111111";
    // Precio que no cierra redondo para ejercitar los redondeos en serio.
    const price = toMicro(987.65);
    const cases = ([3, 6] as const).flatMap((installments) =>
      settlementOptionsOf(DEMO_CONFIG).map(
        (o) => [installments, o.id] as const,
      ),
    );

    it.each(cases)("%i cuotas × %s", async (installments, settlement) => {
      const c = createMockCuotas();
      const q = await c.quote(price, W, { installments, settlement });
      expect(q.eligible).toBe(true);
      const t = quoteTermsFor(DEMO_CONFIG, price, { installments, settlement });
      expect(t).toMatchObject({
        downPayment: q.downPayment,
        financed: q.financed,
        interest: q.interest,
        installments: q.installments,
        total: q.total,
        merchantFee: q.merchantFee,
        merchantReceives: q.merchantReceives,
        merchantAdvance: q.merchantAdvance,
        merchantPending: q.merchantPending,
        settlementDays: q.settlementDays,
        requiredCoverage: q.requiredCoverage,
        interestTotalBps: q.interestTotalBps,
      });
    });
  });
});

describe("d8Breakdown", () => {
  it("reproduce la tabla de 09 con el ejemplo 1.000/300/700 a 3 cuotas", () => {
    const d8 = d8Breakdown(DEMO_CONFIG, baseQuote());
    expect(d8.merchantFee).toBe(toMicro(49));
    expect(d8.merchantNet).toBe(toMicro(951));
    expect(d8.origination).toBe(toMicro(28));
    expect(d8.merchantAdvance).toBe(toMicro(651));
    expect(d8.poolOutflow).toBe(toMicro(679));
    expect(d8.principal).toBe(toMicro(700));
    expect(d8.grossSpread).toBe(toMicro(21));
    // 2%/12 × (700 + 466,666667 + 233,333333) = 2,333333
    expect(d8.adminIllustrative).toBe(2_333_333);
    expect(d8.poolRemainder).toBe(18_666_667);
  });

  it("funciona con config vieja sin campos D8 (originación y administración 0)", () => {
    const d8 = d8Breakdown(legacyConfig(), baseQuote());
    expect(d8.origination).toBe(0);
    expect(d8.adminIllustrative).toBe(0);
    expect(d8.poolOutflow).toBe(toMicro(651));
    expect(d8.grossSpread).toBe(toMicro(49));
    expect(d8.poolRemainder).toBe(toMicro(49));
  });

  it("a 6 cuotas la administración suma los seis meses completos de saldo", () => {
    // Financiado 700 + interés 21 → cuotas de 120,166666…, última ajustada.
    const quote = baseQuote({
      financed: toMicro(700),
      interest: toMicro(21),
      total: toMicro(1021),
      installments: [120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_670],
      installmentsCount: 6,
      interestTotalBps: 300,
    });
    const d8 = d8Breakdown(DEMO_CONFIG, quote);
    // Saldos al inicio de cada mes: 721, 600,833334, 480,666668, 360,500002, 240,333336, 120,166670
    const outstandingSum = toMicro(721) + 600_833_334 + 480_666_668 + 360_500_002 + 240_333_336 + 120_166_670;
    expect(d8.adminIllustrative).toBe(Math.round((outstandingSum * 200) / 120_000));
    expect(d8.grossSpread).toBe(toMicro(700) - (toMicro(700) - toMicro(49) + toMicro(28)));
  });
});
