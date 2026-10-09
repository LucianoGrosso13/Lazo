"use client";

import { formatUsdc } from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";
import { BigNumber as StaticBigNumber } from "./big-number";
import { useInView } from "./use-in-view";
import { useCountUp } from "./use-count-up";

export type BigNumberProps = Parameters<typeof StaticBigNumber>[0] & {
  /** Finite entrance animation; disable for rapidly changing/live balances. */
  countUp?: boolean;
  duration?: number;
};

/** Reuses the original formatter and visual contract without changing legacy callers. */
export function BigNumber({ countUp = true, duration = 900, ...props }: BigNumberProps) {
  const { ref, entered } = useInView<HTMLSpanElement>();
  const { locale } = useLocale();
  const amount = useCountUp(props.amount, entered, countUp, duration);
  const finalText = [
    props.currency === "none" ? "" : props.currency ?? "US$",
    formatUsdc(props.amount, locale, props.decimals ?? 2),
    props.suffix,
  ].filter(Boolean).join(" ");
  return <span ref={ref} role="group" aria-label={finalText} data-count-up={entered && countUp ? "entered" : "idle"}>
    <span aria-hidden="true"><StaticBigNumber {...props} amount={Math.round(amount)} /></span>
  </span>;
}
