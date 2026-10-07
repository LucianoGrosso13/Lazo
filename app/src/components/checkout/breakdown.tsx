"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  formatUsdc,
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
  merchantReceives: Micro;
  /** Lo que el comercio cobra al abrir (todo si la liquidación es inmediata). */
  merchantAdvance: Micro;
  /** Lo que el comercio cobra a `settlementDays` días (0 si es inmediata). */
  merchantPending: Micro;
  /** Días hasta el cobro diferido del comercio (0 = cobra hoy). */
  settlementDays: number;
  /** Cuotas de la opción elegida (3 ó 6 en la demo). */
  installmentsCount: number;
  /** Alguna opción cotizada es provisional: se rotula. */
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
  clock,
  config,
  walletStatus,
  onConfirm,
  merchantName,
  planPicker,
}: {
  data: BreakdownData;
  guarantee: Guarantee | null;
  clock: DemoClock | undefined;
  config: ProtocolConfig | undefined;
  walletStatus: WalletStatus;
  onConfirm?: () => void;
  merchantName: string;
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
        <Chip on>{t.tierChip(data.tier)}</Chip>
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
          {data.provisional ? <Chip>{t.plans.provisional}</Chip> : null}
        </span>
      </div>
      <p className={styles.merchant}>
        {data.settlementDays === 0
          ? t.merchantToday(merchantName, fmt(data.merchantReceives))
          : t.merchantDeferred(
              merchantName,
              fmt(data.merchantAdvance),
              fmt(data.merchantPending),
              data.settlementDays,
            )}
      </p>

      {blocked ? (
        <BlockedReasons reasons={data.reasons} data={data} guarantee={guarantee} config={config} />
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
  config,
}: {
  reasons: QuoteBlockReason[];
  data: BreakdownData;
  guarantee: Guarantee | null;
  config: ProtocolConfig | undefined;
}) {
  const t = useT(checkout);
  const shown: QuoteBlockReason[] = reasons.includes("no_guarantee")
    ? ["no_guarantee"]
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
          <Reason key={r} reason={r} data={data} guarantee={guarantee} config={config} />
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
  config,
}: {
  reason: QuoteBlockReason;
  data: BreakdownData;
  guarantee: Guarantee | null;
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
      // Mismo tierParams que computeQuote: maxPurchase del escalón = línea total.
      const params = data.withGuarantee
        ? config?.guaranteedTiers[data.tier]
        : config?.unguaranteedTiers[
            Math.min(data.tier, config.unguaranteedTiers.length - 1)
          ];
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
