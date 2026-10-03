"use client";

import {
  CuotasError,
  formatUsdc,
  getCuotas,
  type DemoClock,
  type Merchant,
  type Micro,
  type Quote,
} from "@/lib/cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { design } from "@/i18n/dictionaries/design";
import { useLocale, useT } from "@/i18n/locale";
import { GlassPanel } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { StateMark } from "@/components/ui/state-mark";
import { ReferenceTag } from "@/components/ui/badges";
import styles from "./checkout.module.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Lo que se firma: destino, anticipo, token, red, cuotas y lo que cobra el comercio. */
export function ConfirmPanel({
  quote,
  merchant,
  clock,
  opening,
  error,
  onBack,
  onSign,
}: {
  quote: Quote;
  merchant: Merchant | undefined;
  clock: DemoClock | undefined;
  opening: boolean;
  error: CuotasError | null;
  onBack: () => void;
  onSign: () => void;
}) {
  const t = useT(checkout).confirm;
  const d = useT(design);
  const { locale } = useLocale();
  const fmt = (m: Micro, dd = 2) => formatUsdc(m, locale, dd);
  const mock = getCuotas().mode === "mock";

  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
  });
  const dates = clock
    ? quote.installments.map((_, i) =>
        dateFmt.format(new Date((clock.now + (i + 1) * 30 * clock.secondsPerDay) * 1000)),
      )
    : [];

  const errMsg = error
    ? error.code in t.errors
      ? t.errors[error.code as keyof typeof t.errors]
      : t.errors.generic
    : null;

  return (
    <GlassPanel className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t.title}</h2>
        {mock ? <ReferenceTag>{d.chrome.simulated}</ReferenceTag> : null}
      </div>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.rowKey}>{t.rows.dest}</dt>
          <dd className={styles.rowVal}>
            {merchant?.name ?? t.merchantFallback}{" "}
            <span className={styles.due}>{short(merchant?.owner ?? "")}</span>
          </dd>
        </div>
        <div className={`${styles.row} ${styles.rowFirst}`}>
          <dt className={styles.rowKey}>{t.rows.payToday}</dt>
          <dd className={styles.rowVal}>US$ {fmt(quote.downPayment)}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.rowKey}>{t.rows.token}</dt>
          <dd className={styles.rowVal}>{t.tokenValue}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.rowKey}>{t.rows.network}</dt>
          <dd className={styles.rowVal}>{t.networkValue}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.rowKey}>{t.rows.merchant}</dt>
          <dd className={styles.rowVal}>
            US$ {fmt(quote.merchantReceives)}{" "}
            <span className={styles.due}>{t.instantly}</span>
          </dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.rowKey}>{t.rows.after}</dt>
          <dd className={styles.rowVal}>
            {t.installmentsLine(quote.installments.length, fmt(quote.installments[0] ?? 0))}
            {dates.length ? <span className={styles.due}>{dates.join(" · ")}</span> : null}
          </dd>
        </div>
      </dl>

      {mock ? <p className={styles.previewNote}>{t.mockNote}</p> : null}

      {errMsg ? (
        <div className={styles.blocked} role="alert">
          <p className={styles.blockedTitle}>{t.errorTitle}</p>
          <div className={styles.reason}>
            <StateMark state="cracked" title={t.errorTitle} />
            <div>
              <p className={styles.reasonD}>{errMsg}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.confirmCtas}>
        <Button variant="ghost" disabled={opening} onClick={onBack}>
          {t.back}
        </Button>
        <Button disabled={opening} onClick={onSign} aria-busy={opening}>
          {opening ? t.opening : t.sign}
        </Button>
      </div>
    </GlassPanel>
  );
}
