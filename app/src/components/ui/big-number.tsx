"use client";

import { formatUsdc, type Micro } from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";

const SIZES = {
  display: "text-figure-lg",
  xl: "text-figure",
  lg: "text-[2.25rem]",
  md: "text-[1.5rem]",
  sm: "text-[1.125rem]",
} as const;

/**
 * Número a escala de titular: tabular (Azeret Mono), prefijo US$/USDC más
 * chico y sufijo opcional. El tamaño es la facturación del dato.
 */
export function BigNumber({
  amount,
  currency = "US$",
  suffix,
  size = "xl",
  decimals = 2,
  className = "",
}: {
  /** Monto en micro-USDC (6 decimales). */
  amount: Micro;
  currency?: "US$" | "USDC" | "none";
  suffix?: string;
  size?: keyof typeof SIZES;
  decimals?: number;
  className?: string;
}) {
  const { locale } = useLocale();
  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap font-num tracking-[-0.02em] text-beam ${SIZES[size]} ${className}`}
    >
      {currency !== "none" && (
        <span className="mr-[0.35em] text-[0.34em] font-normal tracking-[0.08em] text-ink-3">
          {currency}
        </span>
      )}
      <span>{formatUsdc(amount, locale, decimals)}</span>
      {suffix && <span className="ml-[0.3em] text-[0.3em] font-normal text-ink-3">{suffix}</span>}
    </span>
  );
}
