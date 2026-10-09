"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatUsdc,
  planOptionsOf,
  type Bps,
  type DemoClock,
  type Guarantee,
  type InstallmentsOption,
  type Micro,
  type PlanOption,
  type ProtocolConfig,
  type Quote,
  type QuoteBlockReason,
  type TierIndex,
} from "@/lib/cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { useLocale, useT } from "@/i18n/locale";
import { GlassPanel } from "@/components/ui/glass";
import { Chip } from "@/components/ui/chip";
import { Button, buttonClasses } from "@/components/ui/button";
import { StateMark } from "@/components/ui/state-mark";
import { BigNumber } from "@/components/ui/big-number";
import { WalletButton } from "@/components/wallet-button";
import { PlanSelector } from "./plan-selector";
import { pctOfBps } from "./format";
import styles from "./checkout.module.css";

export type WalletStatus = "connected" | "connecting" | "disconnected" | "disconnecting" | "pending" | "reconnecting";

/** Desglose normalizado: viene de `quote()` (wallet o vista previa) o de
 * `splitPurchase` (modo real sin wallet ni opciones de plan). */
export interface BreakdownData {
  price: Micro;
  tier: TierIndex;
  downPayment: Micro;
  installments: Micro[];
  /** Interés total del plan (0 en 3 cuotas). */
  interest: Micro;
  /** Interés total de la opción elegida, en bps sobre lo financiado. */
  interestTotalBps: Bps;
  total: Micro;
  /** Cuotas de la opción elegida (3 ó 6 en la demo). */
  installmentsCount: number;
  /** Campo de compatibilidad del cliente. */
  provisional: boolean;
  eligible: boolean;
  reasons: QuoteBlockReason[];
  withGuarantee: boolean;
  /** Margen en uso (`reputation.activeExposure`) al momento de cotizar. */
  activeExposure?: Micro;
}

/** Datos del selector de plan para el panel (visible solo con >1 opción). */
export interface PlanPickerProps {
  options: PlanOption[];
  quotes: Quote[] | undefined;
  value: InstallmentsOption;
  onChange: (n: InstallmentsOption) => void;
}

const warming = (s: WalletStatus) => s !== "connected" && s !== "disconnected";

export function Breakdown({
  data,
  guarantee,
  balance,
  clock,
  config,
  walletStatus,
  onConfirm,
  planPicker,
}: {
  data: BreakdownData;
  guarantee: Guarantee | null;
  /** Saldo devUSDC disponible del estudiante (null = indeterminado). */
  balance?: Micro | null;
  clock: DemoClock | undefined;
  config: ProtocolConfig | undefined;
  walletStatus: WalletStatus;
  onConfirm?: () => void;
  planPicker?: PlanPickerProps;
}) {
  const t = useT(checkout);
  const { locale } = useLocale();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
  });
  const dueDate = (i: number) =>
    clock
      ? dateFmt.format(new Date((clock.now + (i + 1) * 30 * clock.secondsPerDay) * 1000))
      : "…";

  const connected = walletStatus === "connected";
  const blocked = connected && !data.eligible;

  return (
    <GlassPanel className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>{t.breakdownTitle}</h2>
        <Chip on>{tierLabel(data.tier)}</Chip>
      </div>

      {planPicker ? <PlanSelector {...planPicker} /> : null}

      {connected && guarantee ? (
        <p className={styles.guarantor}>
          <StateMark state="refilled" title={t.guarantorLabel} />
          <span>
            {t.guarantorLine(
              guarantee.display?.cardLabel ?? null,
              fmt(guarantee.maxPurchase, 0),
            )}
          </span>
        </p>
      ) : null}
      {walletStatus === "disconnected" ? (
        <p className={styles.previewNote}>{t.previewNote}</p>
      ) : null}

      <dl className={styles.rows}>
        <div className={`${styles.row} ${styles.rowFirst}`}>
          <dt className={styles.rowKey}>{t.down}</dt>
          <dd className={styles.rowVal}>US$ {fmt(data.downPayment)}</dd>
        </div>
        {data.installments.map((amount, i) => (
          <div key={i} className={styles.row}>
            <dt className={styles.rowKey}>
              {t.installment(i + 1)}
              <span className={styles.due}>{t.dueOn(dueDate(i))}</span>
            </dt>
            <dd className={styles.rowVal}>US$ {fmt(amount)}</dd>
          </div>
        ))}
        {data.interest > 0 ? (
          <div className={styles.row}>
            <dt className={styles.rowKey}>
              {t.interestRow}
              <span className={styles.due}>
                {t.interestChip(pctOfBps(data.interestTotalBps, locale))}
              </span>
            </dt>
            <dd className={styles.rowVal}>+US$ {fmt(data.interest)}</dd>
          </div>
        ) : null}
        {connected ? (
          <div className={styles.row}>
            <dt className={styles.rowKey}>{t.balanceLabel}</dt>
            <dd className={styles.rowVal}>
              {balance === null || balance === undefined
                ? t.balanceUnavailable
                : `US$ ${fmt(balance)}`}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className={styles.totalRow}>
        <span className={styles.totalKey}>{t.total}</span>
        <span className={styles.totalVal}>
          <BigNumber amount={data.total} size="md" decimals={0} />
          {data.interestTotalBps > 0 ? (
            <Chip>{t.interestChip(pctOfBps(data.interestTotalBps, locale))}</Chip>
          ) : (
            <Chip>{t.interestFree}</Chip>
          )}
        </span>
      </div>
      {blocked ? (
        <BlockedReasons reasons={data.reasons} data={data} guarantee={guarantee} balance={balance} config={config} />
      ) : null}

      {warming(walletStatus) ? (
        <p className={styles.connectD}>{t.checking}</p>
      ) : !connected ? (
        <div className={styles.connect}>
          <p className={styles.connectT}>{t.connectTitle}</p>
          <p className={styles.connectD}>{t.connectBody}</p>
          <WalletButton />
        </div>
      ) : (
        <div className={styles.ctaWrap}>
          <Button disabled={!data.eligible || !onConfirm} onClick={onConfirm}>
            {data.downPayment > 0 ? t.cta : t.ctaNoDown}
          </Button>
          <p className={styles.ctaHint}>{t.ctaHint}</p>
        </div>
      )}

      <p className={styles.demoNote}>{t.demoNote}</p>
    </GlassPanel>
  );
}

/** Motivos de bloqueo traducidos a acción. Sin fiador domina: el resto es consecuencia. */
function BlockedReasons({
  reasons,
  data,
  guarantee,
  balance,
  config,
}: {
  reasons: QuoteBlockReason[];
  data: BreakdownData;
  guarantee: Guarantee | null;
  balance: Micro | null | undefined;
  config: ProtocolConfig | undefined;
}) {
  const t = useT(checkout);
  const shown: QuoteBlockReason[] =
    reasons.includes("no_guarantee") || reasons.includes("guarantor_required")
      ? [reasons.includes("guarantor_required") ? "guarantor_required" : "no_guarantee"]
      : reasons;
  return (
    <div className={styles.blocked} role="alert">
      <StateMark
        state="cracked"
        variant="bar"
        title={t.blockedTitle}
        className={styles.blockedBand}
      />
      <p className={styles.blockedTitle}>{t.blockedTitle}</p>
      <div className={styles.reasons}>
        {shown.map((r) => (
          <Reason key={r} reason={r} data={data} guarantee={guarantee} balance={balance} config={config} />
        ))}
      </div>
    </div>
  );
}

/** Medidor del margen: lo usado en espectro + lo que sumaría esta compra. */
function MarginMeter({
  used,
  needed,
  limit,
}: {
  used: Micro;
  needed: Micro;
  limit: Micro;
}) {
  const m = useT(checkout).margin;
  const { locale } = useLocale();
  const fmt = (v: Micro) => formatUsdc(v, locale, 0);
  const usedRatio = limit > 0 ? Math.min(1, used / limit) : 0;
  const needRatio = limit > 0 ? Math.max(0, Math.min(needed, limit - used) / limit) : 0;
  const over = used + needed > limit;
  return (
    <div
      className={styles.meter}
      role="meter"
      aria-label={m.label}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(used, limit)}
      aria-valuetext={m.used(fmt(used), fmt(limit))}
    >
      <div className={styles.meterHead}>
        <span className={styles.meterLabel}>{m.label}</span>
        <span className={styles.meterNums}>{m.used(fmt(used), fmt(limit))}</span>
      </div>
      <div className={styles.meterTrack} data-over={over || undefined} aria-hidden>
        <span className={styles.meterUsed} style={{ transform: `scaleX(${usedRatio})` }} />
        {needRatio > 0 ? (
          <span
            className={styles.meterNeed}
            style={{
              insetInlineStart: `${usedRatio * 100}%`,
              width: `${needRatio * 100}%`,
            }}
          />
        ) : null}
      </div>
      <p className={styles.meterLegend}>
        <span className={styles.meterSwatch} aria-hidden />
        {m.needed(fmt(needed))}
      </p>
      <p className={styles.meterFrees}>{m.frees}</p>
    </div>
  );
}

function Reason({
  reason,
  data,
  guarantee,
  balance,
  config,
}: {
  reason: QuoteBlockReason;
  data: BreakdownData;
  guarantee: Guarantee | null;
  balance: Micro | null | undefined;
  config: ProtocolConfig | undefined;
}) {
  const b = useT(checkout).blocked;
  const { locale } = useLocale();
  const fmt = (m: Micro) => formatUsdc(m, locale, 0);

  let title: string;
  let desc: ReactNode = null;
  let meter: ReactNode = null;
  let next: string | null = null;
  let cta: { label: string; href: string } | null = null;
  switch (reason) {
    case "protocol_halted":
      title = b.protocol_halted.t;
      desc = b.protocol_halted.d;
      cta = b.protocol_halted.cta;
      break;
    case "blocked_after_default":
      title = b.blocked_after_default.t;
      desc = config ? b.blocked_after_default.d(config.guarantorChargeDay) : null;
      cta = b.blocked_after_default.cta;
      break;
    case "has_active_plan":
      title = b.has_active_plan.t;
      desc = b.has_active_plan.d;
      cta = b.has_active_plan.cta;
      break;
    case "no_guarantee":
    case "guarantor_required":
      title = b.no_guarantee.t;
      desc = b.no_guarantee.d;
      cta = b.no_guarantee.cta;
      break;
    case "exceeds_tier_max": {
      title = b.exceeds_tier_max.t;
      const tier = config?.guaranteedTiers[data.tier];
      desc = tier ? b.exceeds_tier_max.d(fmt(tier.maxPurchase)) : null;
      if (config && data.tier < 3) {
        const n = (data.tier + 1) as TierIndex;
        next = b.exceeds_tier_max.next(n, fmt(config.guaranteedTiers[n].maxPurchase));
      }
      cta = b.exceeds_tier_max.cta;
      break;
    }
    case "exceeds_credit_limit": {
      title = b.exceeds_credit_limit.t;
      // Mismo tierParams que computeQuote: maxPurchase del Tier = línea total.
      const params = config?.guaranteedTiers[data.tier];
      if (params) {
        const used = data.activeExposure ?? 0;
        // Lo que sumaría la compra al margen: repayable = Σ cuotas (como openPlan).
        const needed = data.installments.reduce((sum, i) => sum + i, 0);
        const missing = Math.max(0, used + needed - params.maxPurchase);
        desc = b.exceeds_credit_limit.d(fmt(missing));
        meter = <MarginMeter used={used} needed={needed} limit={params.maxPurchase} />;
      }
      cta = b.exceeds_credit_limit.cta;
      break;
    }
    case "exceeds_guarantor_max_purchase":
      title = b.exceeds_guarantor_max_purchase.t;
      desc = guarantee ? b.exceeds_guarantor_max_purchase.d(fmt(guarantee.maxPurchase)) : null;
      cta = b.exceeds_guarantor_max_purchase.cta;
      break;
    case "exceeds_guarantee_coverage":
      title = b.exceeds_guarantee_coverage.t;
      desc = guarantee ? b.exceeds_guarantee_coverage.d(fmt(guarantee.coverageMax)) : null;
      cta = b.exceeds_guarantee_coverage.cta;
      break;
    case "option_unavailable":
      title = b.option_unavailable.t;
      desc = b.option_unavailable.d;
      cta = b.option_unavailable.cta;
      break;
    case "below_option_min":
      {
        const option = config && planOptionsOf(config).find((o) => o.installments === data.installmentsCount);
        title = option ? b.below_option_min.t(option.installments, fmt(option.minPrice)) : b.below_option_min.fallback;
        desc = option ? b.below_option_min.d(option.installments, fmt(option.minPrice)) : b.below_option_min.fallback;
      }
      break;
    case "pool_liquidity":
      title = b.pool_liquidity.t;
      desc = b.pool_liquidity.d;
      break;
    case "insufficient_funds": {
      title = b.insufficient_funds.t;
      // Faltante para el anticipo: solo si el saldo se pudo leer.
      const missing =
        balance === null || balance === undefined
          ? null
          : Math.max(0, data.downPayment - balance);
      desc = b.insufficient_funds.d(missing === null ? null : fmt(missing));
      cta = b.insufficient_funds.cta;
      break;
    }
    default:
      title = "No disponible";
      desc = null;
      break;
  }

  return (
    <div className={styles.reason}>
      <StateMark state="cracked" title={title} />
      <div>
        <p className={styles.reasonT}>{title}</p>
        {desc ? <p className={styles.reasonD}>{desc}</p> : null}
        {next ? <p className={styles.reasonNext}>{next}</p> : null}
      </div>
      {meter}
      {cta ? (
        <div className={styles.reasonFoot}>
          <Link href={cta.href} className={buttonClasses("secondary", "sm")}>
            {cta.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
