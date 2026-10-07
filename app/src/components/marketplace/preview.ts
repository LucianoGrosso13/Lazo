// Vista previa de un plan para mostrar "desde N cuotas de X" sin wallet ni
// consulta: la misma cuenta que `computeQuote` del mock para un estudiante
// nuevo con fiador (escalón 0 de `guaranteedTiers`). Es solo presentación —
// el checkout cotiza de verdad con `quote()`. Ningún número vive acá: todo
// sale de la `ProtocolConfig` y de los helpers de términos.
import {
  planOptionsOf,
  type Micro,
  type PlanOption,
  type ProtocolConfig,
} from "@/lib/cuotas";

export interface PlanPreview {
  /** Cuotas de la opción (mock: 3 ó 6). */
  installments: number;
  /** Anticipo del escalón inicial con fiador. */
  downPayment: Micro;
  /** Interés total del plan (0 si la opción es sin interés). */
  interest: Micro;
  /** Monto de cada cuota; la última absorbe el redondeo, como en `quote()`. */
  installmentAmounts: Micro[];
  /** Cuota típica (todas menos la última). */
  perInstallment: Micro;
  /** Precio + interés: lo que paga el estudiante en total. */
  total: Micro;
  /** La opción lleva términos provisionales: la UI la rotula. */
  provisional: boolean;
  /** Interés total aplicado (opción + escalón), en bps. */
  interestTotalBps: number;
}

/** Una opción de plan cotizada como la vería una cuenta nueva con fiador. */
export function previewPlan(
  config: ProtocolConfig,
  price: Micro,
  option: PlanOption,
): PlanPreview {
  const tier = config.guaranteedTiers[0];
  const downPayment = Math.round((price * tier.downPaymentBps) / 10_000);
  const financed = price - downPayment;
  const interestTotalBps = option.interestTotalBps + tier.interestBps;
  const interest = Math.round((financed * interestTotalBps) / 10_000);
  const repayable = financed + interest;
  const n = option.installments;
  const base = Math.floor(repayable / n);
  const installmentAmounts = Array.from({ length: n }, (_, i) =>
    i === n - 1 ? repayable - base * (n - 1) : base,
  );
  return {
    installments: n,
    downPayment,
    interest,
    installmentAmounts,
    perInstallment: base,
    total: price + interest,
    provisional: option.provisional,
    interestTotalBps,
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
