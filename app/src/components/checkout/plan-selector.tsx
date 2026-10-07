"use client";

import { useId } from "react";
import {
  formatUsdc,
  type InstallmentsOption,
  type PlanOption,
  type Quote,
} from "@/lib/cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { useLocale, useT } from "@/i18n/locale";
import { Chip } from "@/components/ui/chip";
import { pctOfBps } from "./format";
import styles from "./checkout.module.css";

/**
 * Selector de plan (radiogroup): cada opción muestra su interés total, el
 * monto de cada cuota según la cotización y la etiqueta "provisional" cuando
 * la opción lo declara. Una opción no elegible queda bloqueada con el motivo.
 * Con una sola opción (modo real, sin `planOptions`) no se muestra: el
 * checkout queda como siempre, a 3 cuotas.
 */
export function PlanSelector({
  options,
  quotes,
  value,
  onChange,
}: {
  options: PlanOption[];
  /** Una cotización por opción habilitada (indefinido mientras carga). */
  quotes: Quote[] | undefined;
  value: InstallmentsOption;
  onChange: (n: InstallmentsOption) => void;
}) {
  const t = useT(checkout).plans;
  const { locale } = useLocale();
  const labelId = useId();
  const fmt = (m: number) => formatUsdc(m, locale);
  const pct = (bps: number) => pctOfBps(bps, locale);
  if (options.length <= 1) return null;
  return (
    <div className={styles.planPicker}>
      <p className={styles.planPickerLabel} id={labelId}>
        {t.label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.planOpts}>
        {options.map((o) => {
          const q = quotes?.find((x) => x.installmentsCount === o.installments);
          const unavailable =
            !o.enabled || (q?.reasons.includes("option_unavailable") ?? false);
          const selected = o.installments === value;
          return (
            <button
              key={o.installments}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={unavailable || undefined}
              className={styles.planOpt}
              onClick={() => {
                if (!unavailable) onChange(o.installments);
              }}
            >
              <span className={styles.planOptTop}>
                <span className={styles.planDot} aria-hidden />
                <span className={styles.planOptName}>
                  {t.option(o.installments)}
                </span>
                {o.provisional ? <Chip>{t.provisional}</Chip> : null}
              </span>
              <span className={styles.planOptSub}>
                {unavailable ? (
                  t.unavailable
                ) : (
                  <>
                    {o.interestTotalBps > 0
                      ? t.interestTotal(pct(o.interestTotalBps))
                      : t.free}
                    {q ? ` · ${t.each(fmt(q.installments[0] ?? 0))}` : ""}
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
