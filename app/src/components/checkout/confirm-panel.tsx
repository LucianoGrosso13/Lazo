"use client";

// Panel de confirmación del plan (ticket 01): revisión de lo firmado
// (destino, anticipo, token, red, cuotas, cobro del comercio, garantía y
// saldo reales), progreso observable mientras la operación corre, estado
// `uncertain` con reconciliación por firma original (nunca reenvío a
// ciegas) y error verificable. El éxito vive en `ConfirmSuccess`.
import Link from "next/link";
import {
  formatUsdc,
  getCuotas,
  type DemoClock,
  type Guarantee,
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
import { ExplorerLink, ReferenceTag } from "@/components/ui/badges";
import { TxProgressView } from "./tx-progress";
import type { OpenFlowState } from "./open-plan-flow";
import styles from "./checkout.module.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function ConfirmPanel({
  quote,
  merchant,
  clock,
  guarantee,
  balance,
  flow,
  onBack,
  onSign,
  onVerify,
  onAbandon,
}: {
  quote: Quote;
  merchant: Merchant | undefined;
  clock: DemoClock | undefined;
  /** Fianza vigente del estudiante (null = sin fiador). */
  guarantee: Guarantee | null | undefined;
  /** Saldo devUSDC disponible (null = no se pudo determinar). */
  balance: Micro | null | undefined;
  flow: OpenFlowState;
  onBack: () => void;
  onSign: () => void;
  /** `uncertain` → reconciliar la firma original (solo lectura). */
  onVerify: () => void;
  /** `uncertain`/`failed_onchain` → abandonar y volver al desglose. */
  onAbandon: () => void;
}) {
  const all = useT(checkout);
  const t = all.confirm;
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
  const settleDate =
    clock && quote.settlementDays > 0
      ? dateFmt.format(
          new Date((clock.now + quote.settlementDays * clock.secondsPerDay) * 1000),
        )
      : null;

  const busy = flow.kind === "running";

  return (
    <GlassPanel className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t.title}</h2>
        {mock ? <ReferenceTag>{d.chrome.simulated}</ReferenceTag> : null}
      </div>

      {flow.kind === "running" ? (
        <TxProgressView phase={flow.phase} signature={flow.signature} />
      ) : (
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
              {quote.settlementDays === 0 ? (
                <>
                  US$ {fmt(quote.merchantReceives)}{" "}
                  <span className={styles.due}>{t.instantly}</span>
                </>
              ) : (
                <>
                  {t.merchantLater(
                    fmt(quote.merchantAdvance),
                    fmt(quote.merchantPending),
                    settleDate ?? "…",
                  )}
                </>
              )}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.rows.after}</dt>
            <dd className={styles.rowVal}>
              {t.installmentsLine(quote.installments.length, fmt(quote.installments[0] ?? 0))}
              {dates.length ? <span className={styles.due}>{dates.join(" · ")}</span> : null}
            </dd>
          </div>
          {quote.interest > 0 ? (
            <div className={styles.row}>
              <dt className={styles.rowKey}>{t.rows.interest}</dt>
              <dd className={styles.rowVal}>+US$ {fmt(quote.interest)}</dd>
            </div>
          ) : null}
          <div className={styles.row}>
            <dt className={styles.rowKey}>{all.guarantorLabel}</dt>
            <dd className={styles.rowVal}>
              {guarantee
                ? all.guarantorLine(
                    guarantee.display?.cardLabel ?? null,
                    fmt(guarantee.maxPurchase, 0),
                  )
                : t.errors.no_guarantee}
            </dd>
          </div>
          <div className={styles.row}>
            <dt className={styles.rowKey}>{all.balanceLabel}</dt>
            <dd className={styles.rowVal}>
              {balance === null || balance === undefined
                ? all.balanceUnavailable
                : `US$ ${fmt(balance)}`}
            </dd>
          </div>
        </dl>
      )}

      {mock && flow.kind !== "running" ? (
        <p className={styles.previewNote}>{t.mockNote}</p>
      ) : null}

      {flow.kind === "uncertain" ? (
        <div
          className={`${styles.blocked} ${styles.pending}`}
          role="alert"
          data-testid="tx-uncertain"
        >
          <p className={styles.blockedTitle}>{t.uncertain.t}</p>
          <div className={styles.reason}>
            <StateMark state="lit" title={t.uncertain.t} />
            <div>
              <p className={styles.reasonD}>{t.uncertain.d}</p>
              {flow.signature ? (
                <p className={styles.reasonD}>
                  {t.uncertain.sigLabel}:{" "}
                  <ExplorerLink signature={flow.signature} />
                </p>
              ) : null}
              {flow.checked ? (
                <p className={styles.reasonNext}>{t.uncertain.stillPending}</p>
              ) : null}
            </div>
          </div>
          <div className={styles.confirmCtas}>
            <Button variant="ghost" onClick={onAbandon}>
              {t.uncertain.backCta}
            </Button>
            <Button onClick={onVerify}>{t.uncertain.verifyCta}</Button>
          </div>
          <p className={styles.ctaHint}>
            <Link href="/panel" className={styles.inlineLink}>
              {t.uncertain.panelCta}
            </Link>
          </p>
        </div>
      ) : null}

      {flow.kind === "failed_onchain" ? (
        <div className={styles.blocked} role="alert">
          <p className={styles.blockedTitle}>{t.errorTitle}</p>
          <div className={styles.reason}>
            <StateMark state="cracked" title={t.errorTitle} />
            <div>
              <p className={styles.reasonD}>{t.uncertain.failedOnchain}</p>
              <p className={styles.reasonD}>
                <ExplorerLink signature={flow.signature} />
              </p>
            </div>
          </div>
          <div className={styles.confirmCtas}>
            <Button onClick={onAbandon}>{t.uncertain.backCta}</Button>
          </div>
        </div>
      ) : null}

      {flow.kind === "failed" ? (
        <div className={styles.blocked} role="alert">
          <p className={styles.blockedTitle}>{t.errorTitle}</p>
          <div className={styles.reason}>
            <StateMark state="cracked" title={t.errorTitle} />
            <div>
              <p className={styles.reasonD}>
                {flow.error.code in t.errors
                  ? t.errors[flow.error.code as keyof typeof t.errors]
                  : t.errors.generic}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {flow.kind === "idle" || flow.kind === "failed" ? (
        <div className={styles.confirmCtas}>
          <Button variant="ghost" disabled={busy} onClick={onBack}>
            {t.back}
          </Button>
          <Button disabled={busy} onClick={onSign} aria-busy={busy}>
            {t.sign}
          </Button>
        </div>
      ) : null}
    </GlassPanel>
  );
}
