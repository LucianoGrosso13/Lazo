// Helpers puros de términos del plan: opciones de cuotas y de liquidación del
// comercio con fallback a la config histórica (3 cuotas + cobro inmediato con
// `feeBps`), y el desglose D8 de una cotización (tabla de
// `proyecto/09-alcance-opcion-h-y-mejoras.md` § "Economía de Lazo y del pool").
// La UI y el mock los comparten; ningún número de negocio vive acá.
import type {
  Bps,
  InstallmentsOption,
  Micro,
  PlanOption,
  ProtocolConfig,
  Quote,
  SettlementId,
  SettlementOption,
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
      // La config vieja declara su propia cantidad; el casteo es solo forma.
      installments: config.installmentsCount as InstallmentsOption,
      interestTotalBps: 0,
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
export function settlementAvailable(option: SettlementOption | undefined): boolean {
  return option !== undefined && option.enabled && option.feeBps !== null;
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

export function d8Breakdown(config: ProtocolConfig, quote: Quote): D8Breakdown {
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
