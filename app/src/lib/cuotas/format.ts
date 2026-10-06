import type { Micro, WalletAddress } from "./types";

export const MICRO_PER_USDC = 1_000_000;

export const toMicro = (usdc: number): Micro => Math.round(usdc * MICRO_PER_USDC);
export const fromMicro = (micro: Micro): number => micro / MICRO_PER_USDC;

/** "1.000,00" en es-AR, "1,000.00" en en-US. Sin símbolo: la UI decide "US$" o "USDC". */
export function formatUsdc(micro: Micro, locale: "es" | "en" = "es", decimals = 2): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(fromMicro(micro));
}

/** Comercio de la tienda demo «Voltia»: address fake de demo (fixture; no es una cuenta devnet real). */
export const DEMO_MERCHANT: WalletAddress = "GQ6U8joxnXmYhbYhdDTpy8QtxAHxQ8kV5MCKBjYzF7CD";
/** Estudiante de ejemplo en el escalón 3 (datos de ejemplo, paso 5 del guion). */
export const DEMO_STUDENT_TIER3: WalletAddress = "LazoEstudianteEscalon3111111111111111111111";
