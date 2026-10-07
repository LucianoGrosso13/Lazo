// La alternativa de plan de la vidriera (hoy: 6 cuotas con interés).
// Todo sale de la config: si no hay segunda opción habilitada, la línea
// "O N cuotas…" se oculta en vez de inventarse.
import type { Bps, Micro, PlanOption, ProtocolConfig, TierIndex } from "@/lib/cuotas";
import { defaultPlanOption, planOptionsOf } from "@/lib/cuotas";

/**
 * Opción habilitada distinta de la por defecto (mock: la de 6 cuotas).
 * Devuelve undefined cuando la config no la trae (o está deshabilitada):
 * con el fallback histórico de `planOptionsOf` (solo `installmentsCount`)
 * nunca hay alternativa.
 */
export function altPlanOption(config: ProtocolConfig): PlanOption | undefined {
  const def = defaultPlanOption(config);
  return planOptionsOf(config).find(
    (o) => o.enabled && o.installments !== def?.installments,
  );
}

/**
 * Cuotas de una opción para el escalón cotizado sin wallet (tier 0 con
 * fiador). Misma cuenta que `computeQuote` del mock y que `splitPurchase`:
 * anticipo del escalón, interés total de la opción sobre lo financiado y la
 * última cuota absorbiendo el redondeo.
 */
export function installmentsForOption(
  config: ProtocolConfig,
  price: Micro,
  tier: TierIndex,
  option: PlanOption,
): Micro[] {
  const t = config.guaranteedTiers[tier];
  const financed = price - Math.round((price * t.downPaymentBps) / 10_000);
  const interest = Math.round(
    (financed * (option.interestTotalBps + t.interestBps)) / 10_000,
  );
  const repayable = financed + interest;
  const base = Math.floor(repayable / option.installments);
  return Array.from({ length: option.installments }, (_, i) =>
    i === option.installments - 1 ? repayable - base * (option.installments - 1) : base,
  );
}

/** % legible desde bps (300 → "3%", 625 → "6,25%"): la convención de /para-estudiantes. */
export function formatBps(bps: Bps, locale: "es" | "en"): string {
  const nf = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  });
  return `${nf.format(bps / 100)}%`;
}
