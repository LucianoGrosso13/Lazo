import type { Bps } from "@/lib/cuotas";

/** 300 bps → "3" ("3%" lo arma el copy; "2,5" en es-AR). */
export function pctOfBps(bps: Bps, locale: "es" | "en"): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(bps / 100);
}
