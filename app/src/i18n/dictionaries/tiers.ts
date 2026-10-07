import { defineDict } from "../locale";

export const TIERS = [
  { index: 0, number: 1, name: "Starter", label: "Tier 1 · Starter", short: "Tier 1" },
  { index: 1, number: 2, name: "Steady", label: "Tier 2 · Steady", short: "Tier 2" },
  { index: 2, number: 3, name: "Trusted", label: "Tier 3 · Trusted", short: "Tier 3" },
  { index: 3, number: 4, name: "Full", label: "Tier 4 · Full", short: "Tier 4" },
] as const;

export function tierLabel(index: number): string {
  const t = TIERS[index] ?? TIERS[Math.max(0, Math.min(index, TIERS.length - 1))];
  return t ? t.label : `Tier ${index + 1}`;
}

export function tierShort(index: number): string {
  const t = TIERS[index] ?? TIERS[Math.max(0, Math.min(index, TIERS.length - 1))];
  return t ? t.short : `Tier ${index + 1}`;
}

/** Diccionario de nombres y etiquetas de tiers (Tier 1 · Starter … Tier 4 · Full). */
export const tiers = defineDict({
  es: {
    tierLabel,
    tierShort,
    tiers: TIERS,
  },
  en: {
    tierLabel,
    tierShort,
    tiers: TIERS,
  },
});
