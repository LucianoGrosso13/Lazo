// Vista previa de un plan para mostrar "desde N cuotas de X" sin wallet ni
// consulta: `quoteTerms` de `lib/cuotas/terms.ts`, la misma cuenta que
// `computeQuote` del mock para un estudiante nuevo con fiador (Tier 1 de
// `guaranteedTiers`). Es solo presentación — el checkout cotiza de verdad
// con `quote()`. Ningún número vive acá: todo sale de la `ProtocolConfig`.
import {
  immediateFeeBps,
  planOptionsOf,
  quoteTerms,
  type Micro,
  type PlanOption,
  type ProtocolConfig,
} from "@/lib/cuotas";

export interface PlanPreview {
  /** Cuotas de la opción (mock: 3 ó 6). */
  installments: number;
  /** Anticipo del Tier inicial con fiador. */
  downPayment: Micro;
  /** Interés total del plan (0 si la opción es sin interés). */
  interest: Micro;
  /** Monto de cada cuota; la última absorbe el redondeo, como en `quote()`. */
  installmentAmounts: Micro[];
  /** Cuota típica (todas menos la última). */
  perInstallment: Micro;
  /** Precio + interés: lo que paga el estudiante en total. */
  total: Micro;
  /** Interés total aplicado (opción + Tier), en bps. */
  interestTotalBps: number;
}

/** Una opción de plan cotizada como la vería una cuenta nueva con fiador. */
export function previewPlan(
  config: ProtocolConfig,
  price: Micro,
  option: PlanOption,
): PlanPreview {
  const terms = quoteTerms({
    price,
    tier: config.guaranteedTiers[0],
    plan: option,
    // El plazo del comercio no cambia lo que paga el estudiante; la
    // inmediata resuelve la comisión sin esperar nada.
    settlement: { days: 0, feeBps: immediateFeeBps(config) },
  });
  return {
    installments: option.installments,
    downPayment: terms.downPayment,
    interest: terms.interest,
    installmentAmounts: terms.installments,
    perInstallment: terms.installments[0] ?? 0,
    total: terms.total,
    interestTotalBps: terms.interestTotalBps,
  };
}

/** Todas las opciones de plan habilitadas de la config, en orden. */
export function planPreviews(
  config: ProtocolConfig,
  price: Micro,
): { option: PlanOption; preview: PlanPreview }[] {
  return planOptionsOf(config)
    .filter((o) => o.enabled)
    .map((option) => ({ option, preview: previewPlan(config, price, option) }));
}
