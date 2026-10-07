// Helpers puros de términos del plan: opciones de cuotas y de liquidación del
// comercio con fallback a la config histórica (3 cuotas + cobro inmediato con
// `feeBps`), y el desglose D8 de una cotización (tabla de
// `proyecto/09-alcance-opcion-h-y-mejoras.md` § "Economía de Lazo y del pool").
// La UI y el mock los comparten; ningún número de negocio vive acá.
import type {
  Bps,
  InstallmentsOption,
  Micro,
  PayoutTranche,
  PlanOption,
  ProtocolConfig,
  Quote,
  SettlementId,
  SettlementOption,
  TierIndex,
  TierParams,
  UnixSeconds,
} from "./types";

/** Versión del formato de `PlanTerms` guardado en cada plan. */
export const PLAN_TERMS_VERSION = 1;

/** Misma convención del mock: bps redondeados al micro más cercano. */
const bpsOf = (amount: Micro, bps: Bps): Micro => Math.round((amount * bps) / 10_000);

/**
 * Opciones de plan de la config. Fallback: una sola opción de
 * `installmentsCount` cuotas sin interés propio (el interés histórico vive en
 * el escalón) — así el estado persistido viejo cotiza igual que antes.
 */
export function planOptionsOf(config: ProtocolConfig): PlanOption[] {
  if (config.planOptions) return config.planOptions;
  return [
    {
      installments: (config.installmentsCount === 6 ? 6 : 3) as 3 | 6,
      interestTotalBps: 0,
      minPrice: 0,
      enabled: true,
      provisional: false,
    },
  ];
}

/**
 * Opciones de liquidación del comercio. Fallback: solo cobro inmediato con la
 * comisión histórica `feeBps`.
 */
export function settlementOptionsOf(config: ProtocolConfig): SettlementOption[] {
  if (config.settlementOptions) return config.settlementOptions;
  return [
    {
      id: "immediate",
      days: 0,
      tranches: 0,
      feeBps: config.feeBps,
      enabled: true,
      provisional: false,
    },
  ];
}

export function planOptionOf(
  config: ProtocolConfig,
  installments: InstallmentsOption,
): PlanOption | undefined {
  return planOptionsOf(config).find((o) => o.installments === installments);
}

export function settlementOptionOf(
  config: ProtocolConfig,
  id: SettlementId,
): SettlementOption | undefined {
  return settlementOptionsOf(config).find((o) => o.id === id);
}

/** Opción de plan por defecto: la primera habilitada (mock: 3 cuotas). */
export function defaultPlanOption(config: ProtocolConfig): PlanOption | undefined {
  return planOptionsOf(config).find((o) => o.enabled);
}

/** Una opción de liquidación se puede usar si está habilitada y tiene tarifa. */
export function settlementAvailable(
  option: SettlementOption | undefined,
): option is SettlementOption & { feeBps: Bps } {
  return option !== undefined && option.enabled && option.feeBps !== null;
}

/** Comisión del cobro inmediato: la opción "immediate" de la config o la histórica `feeBps`. */
export function immediateFeeBps(config: ProtocolConfig): Bps {
  return settlementOptionOf(config, "immediate")?.feeBps ?? config.feeBps;
}

/**
 * Genera el calendario de tramos de cobro para el comercio:
 * divide `financedNet` en `tranches` cuotas iguales a intervalos regulares
 * de 30 días hasta `days`, absorbiendo el redondeo en el último tramo.
 */
export function payoutSchedule(
  financedNet: Micro,
  option: Pick<SettlementOption, "tranches" | "days">,
  openedAt: UnixSeconds,
  secondsPerDay = 86_400,
): PayoutTranche[] {
  if (!option.tranches || option.tranches <= 0 || !option.days || option.days <= 0) {
    return [];
  }
  const n = option.tranches;
  const base = Math.floor(financedNet / n);
  return Array.from({ length: n }, (_, i) => ({
    index: i,
    amount: i === n - 1 ? financedNet - base * (n - 1) : base,
    releaseAt: openedAt + Math.round(((i + 1) * option.days) / n) * secondsPerDay,
    released: false,
  }));
}

/**
 * Resultado del cálculo puro de la cotización: anticipo, financiado,
 * interés, cuotas con redondeo en la última, comisión por plazo y
 * adelanto/pendiente del comercio. Es exactamente la cuenta de
 * `computeQuote` del mock — las pantallas sin wallet y el mock la
 * comparten para que ninguna la reescriba a mano.
 */
export interface QuoteTerms {
  /** Precio cotizado (eco del input, como en `Quote`). */
  price: Micro;
  /** Anticipo = price × downPaymentBps del escalón. */
  downPayment: Micro;
  /** Capital financiado = price − anticipo. */
  financed: Micro;
  /** Interés total del plan = financed × (opción + escalón). */
  interest: Micro;
  /** Lo que repone el comprador = financed + interest. */
  repayable: Micro;
  /** Monto de cada cuota; la última absorbe el redondeo. */
  installments: Micro[];
  /** Lo que paga el comprador en total = price + interest. */
  total: Micro;
  /** Comisión del comercio = financed × feeBps del plazo elegido. */
  merchantFee: Micro;
  /** Neto del comercio = price − merchantFee. */
  merchantReceives: Micro;
  /** Entra al comercio al abrir: todo si cobra hoy, solo el anticipo si difiere. */
  merchantAdvance: Micro;
  /** Lo que el comercio cobra en la fecha (0 si es inmediata). */
  merchantPending: Micro;
  /** Tramos de cobro del comercio según la liquidación elegida. */
  payoutTranches: PayoutTranche[];
  /** Días hasta el cobro diferido del comercio (0 = inmediato). */
  settlementDays: number;
  /** Cobertura requerida del fiador = repayable (capital + interés) × guarantorCoverageBps. */
  requiredCoverage: Micro;
  /** Interés total aplicado (opción de plan + escalón), en bps. */
  interestTotalBps: Bps;
}

export interface QuoteTermsInput {
  /** Precio cotizado. */
  price: Micro;
  /** Escalón ya resuelto (guaranteed o unguaranteed, según el fiador). */
  tier: Pick<TierParams, "downPaymentBps" | "interestBps" | "guarantorCoverageBps">;
  /** Opción de plan ya resuelta (cantidad de cuotas + interés propio). */
  plan: { installments: number; interestTotalBps: Bps };
  /** Plazo de cobro ya resuelto (días hasta el cobro y comisión efectiva). */
  settlement: { days: number; feeBps: Bps; tranches?: number };
  openedAt?: UnixSeconds;
  secondsPerDay?: number;
}

/**
 * La cuenta de la cotización con las piezas ya elegidas. Es la de las
 * decisiones comerciales (06): `I = A × i(n)`; cuotas `(A+I)/n` con la
 * última absorbiendo el redondeo; comisión `F = A × f(liquidación)`; el
 * comercio recibe `P − F`: el anticipo al abrir y `A − F` en la fecha.
 */
export function quoteTerms({
  price,
  tier,
  plan,
  settlement,
  openedAt = 0,
  secondsPerDay = 86_400,
}: QuoteTermsInput): QuoteTerms {
  const downPayment = bpsOf(price, tier.downPaymentBps);
  const financed = price - downPayment;
  const interestTotalBps = plan.interestTotalBps + tier.interestBps;
  const interest = bpsOf(financed, interestTotalBps);
  const repayable = financed + interest;
  const n = plan.installments;
  const base = Math.floor(repayable / n);
  const installments = Array.from({ length: n }, (_, i) =>
    i === n - 1 ? repayable - base * (n - 1) : base,
  );
  const merchantFee = bpsOf(financed, settlement.feeBps);
  const merchantReceives = price - merchantFee;
  const merchantAdvance =
    settlement.days === 0 ? merchantReceives : downPayment;
  const merchantPending = merchantReceives - merchantAdvance;
  const payoutTranches = payoutSchedule(
    merchantPending,
    { tranches: settlement.tranches ?? 0, days: settlement.days },
    openedAt,
    secondsPerDay,
  );
  return {
    price,
    downPayment,
    financed,
    interest,
    repayable,
    installments,
    total: price + interest,
    merchantFee,
    merchantReceives,
    merchantAdvance,
    merchantPending,
    payoutTranches,
    settlementDays: settlement.days,
    requiredCoverage: bpsOf(repayable, tier.guarantorCoverageBps),
    interestTotalBps,
  };
}

export interface QuoteTermsForArgs {
  /** Escalón con fiador de la config (default 0: el de una cuenta nueva). */
  tier?: TierIndex;
  /** Opción de plan pedida; default: la primera habilitada. */
  installments?: InstallmentsOption;
  /** Plazo de cobro pedido; default "immediate". */
  settlement?: SettlementId;
  openedAt?: UnixSeconds;
  secondsPerDay?: number;
}

/**
 * Los mismos números que `quote()` para un comprador con fiador en el
 * escalón `tier` de `guaranteedTiers`: el caso canónico que muestran las
 * páginas públicas, que no tienen wallet para cotizar. `undefined` en los
 * mismos casos en que `quote()` marca `option_unavailable`: opción de
 * plan inexistente o deshabilitada; plazo inexistente, deshabilitado o
 * con tarifa sin definir.
 */
export function quoteTermsFor(
  config: ProtocolConfig,
  price: Micro,
  args: QuoteTermsForArgs = {},
): QuoteTerms | undefined {
  const plan =
    args.installments === undefined
      ? defaultPlanOption(config)
      : planOptionOf(config, args.installments);
  if (!plan?.enabled) return undefined;
  const settlement = settlementOptionOf(config, args.settlement ?? "immediate");
  if (!settlementAvailable(settlement)) return undefined;
  return quoteTerms({
    price,
    tier: config.guaranteedTiers[args.tier ?? 0],
    plan,
    settlement: {
      days: settlement.days,
      feeBps: settlement.feeBps,
      tranches: settlement.tranches,
    },
    openedAt: args.openedAt,
    secondsPerDay: args.secondsPerDay ?? config.secondsPerDay,
  });
}

/**
 * Fecha de cobro del comercio para una venta abierta en `openedAt` con la
 * opción elegida (inmediata → `openedAt`). Útil para mostrar el calendario.
 */
export function settlementDateOf(
  openedAt: UnixSeconds,
  option: Pick<SettlementOption, "days">,
  secondsPerDay: number,
): UnixSeconds {
  return openedAt + option.days * secondsPerDay;
}

/**
 * Reparto D8 de una cotización: cómo se distribuye el financiado entre
 * comercio, Lazo y pool. Reproduce la tabla de `proyecto/09-…` (ejemplo
 * 1.000/300/700 con 3 cuotas: 49 / 28 / 651 / 679 / 700 / 21 /
 * 2,333333 / 18,666667). Es contable-ilustrativo, no prueba de rentabilidad.
 */
export interface D8Breakdown {
  /** Comisión total del comercio sobre lo financiado (incluye la originación). */
  merchantFee: Micro;
  /** Neto del comercio = precio − comisión (anticipo + adelanto del pool). */
  merchantNet: Micro;
  /** Adelanto del pool al comercio = financiado − comisión. */
  merchantAdvance: Micro;
  /** Originación para Lazo = `originationBps` × financiado (sale de la comisión). */
  origination: Micro;
  /** Salida inicial del pool = adelanto al comercio + originación a Lazo. */
  poolOutflow: Micro;
  /** Principal a cobrar = capital financiado (lo que repone el comprador). */
  principal: Micro;
  /** Diferencia bruta del pool antes de administración/costos = principal − salida. */
  grossSpread: Micro;
  /**
   * Administración ilustrativa: `adminFeeAnnualBps`/12 × Σ saldo al inicio de
   * cada mes completo del plan (saldo = lo que resta pagar de cuotas).
   */
  adminIllustrative: Micro;
  /** Resto del pool antes de fondeo, pérdidas y demás costos. */
  poolRemainder: Micro;
}

/** Lo que el reparto D8 lee de una cotización: `Quote` y `QuoteTerms` sirven. */
export type D8Quote = Pick<
  Quote,
  "merchantFee" | "financed" | "merchantReceives" | "installments"
>;

export function d8Breakdown(config: ProtocolConfig, quote: D8Quote): D8Breakdown {
  const merchantFee = quote.merchantFee;
  const merchantAdvance = quote.financed - merchantFee;
  const origination = bpsOf(quote.financed, config.originationBps ?? 0);
  const poolOutflow = merchantAdvance + origination;
  const principal = quote.financed;
  const grossSpread = principal - poolOutflow;
  // Meses completos: el saldo de cada mes es lo que resta pagar al inicio.
  // 3 cuotas sobre 700 → 700 + 466,666667 + 233,333333 = 1.400.
  let outstandingSum = 0;
  let remaining = quote.installments.reduce((a, b) => a + b, 0);
  for (const inst of quote.installments) {
    outstandingSum += remaining;
    remaining -= inst;
  }
  const adminIllustrative = Math.round(
    (outstandingSum * (config.adminFeeAnnualBps ?? 0)) / (12 * 10_000),
  );
  return {
    merchantFee,
    merchantNet: quote.merchantReceives,
    merchantAdvance,
    origination,
    poolOutflow,
    principal,
    grossSpread,
    adminIllustrative,
    poolRemainder: grossSpread - adminIllustrative,
  };
}
