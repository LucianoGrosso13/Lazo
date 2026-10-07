// La alternativa de plan de la vidriera (hoy: 6 cuotas con interés).
// Todo sale de la config: si no hay segunda opción habilitada, la línea
// "O N cuotas…" se oculta en vez de inventarse.
import type { Bps, Micro, PlanOption, ProtocolConfig, TierIndex } from "@/lib/cuotas";
import {
  defaultPlanOption,
  immediateFeeBps,
  planOptionsOf,
  quoteTerms,
} from "@/lib/cuotas";

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
 * Cuotas de una opción para el Tier cotizado sin wallet (Tier 1 con
 * fiador). `quoteTerms` de `lib/cuotas/terms.ts`: la misma cuenta que
 * `computeQuote` del mock — anticipo del Tier, interés total de la
 * opción sobre lo financiado y la última cuota absorbiendo el redondeo.
 */
export function installmentsForOption(
  config: ProtocolConfig,
  price: Micro,
  tier: TierIndex,
  option: PlanOption,
): Micro[] {
  return quoteTerms({
    price,
    tier: config.guaranteedTiers[tier],
    plan: option,
    settlement: { days: 0, feeBps: immediateFeeBps(config) },
  }).installments;
}

/** % legible desde bps (300 → "3%", 625 → "6,25%"): la convención de /para-estudiantes. */
export function formatBps(bps: Bps, locale: "es" | "en"): string {
  const nf = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  });
  return `${nf.format(bps / 100)}%`;
}
