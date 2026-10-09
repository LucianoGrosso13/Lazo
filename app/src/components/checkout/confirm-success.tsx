"use client";

import Link from "next/link";
import {
  formatUsdc,
  getCuotas,
  type Micro,
  type Plan,
  type ProtocolConfig,
  type UnixSeconds,
} from "@/lib/cuotas";
import { useEffect, useRef, useState } from "react";
import { checkout } from "@/i18n/dictionaries/checkout";
import { useLocale, useT } from "@/i18n/locale";
import { BigNumber } from "@/components/ui/big-number";
import { Chip } from "@/components/ui/chip";
import { ExplorerLink } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { PlanCalendar, pendingAmount, unpaidInstallments } from "./plan-calendar";
import { usePayInstallment } from "./pay-installment";
import styles from "./checkout.module.css";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/**
 * Éxito del plan: la luz del pago sale de la wallet, atraviesa el vidrio y
 * entra al comercio, que se llena por detrás (como la marca "refilled").
 * Solo se declara tras la confirmación + lectura del plan; debajo va el
 * calendario con las fechas reales del `Plan` (no del reloj de demo).
 * `plan: null` es el borde `confirmed` sin cuenta legible: el comprobante
 * queda y el panel del estudiante muestra el estado.
 */
export function ConfirmSuccess({
  plan,
  signature,
  reconciled,
  merchantName,
  config,
  now,
  secondsPerDay,
}: {
  plan: Plan | null;
  signature: string;
  /** true cuando el éxito se recuperó reconciliando la firma original. */
  reconciled: boolean;
  merchantName: string;
  config: ProtocolConfig | undefined;
  now: UnixSeconds;
  secondsPerDay: number;
}) {
  const t = useT(checkout).confirm.success;
  const { locale } = useLocale();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  // El plan mostrado se actualiza si se paga una cuota desde acá (ticket 02):
  // la cuota queda `Paid`, la siguiente pasa a ser la próxima y el saldo
  // pendiente baja — mismas fechas, mismo plan.
  const [paidPlan, setPaidPlan] = useState<Plan | null>(null);
  const shown = paidPlan ?? plan;
  const pay = usePayInstallment({
    plan: shown,
    student: shown?.student ?? null,
    onPaid: (p) => {
      if (p) setPaidPlan(p);
    },
  });
  const received = shown ? shown.price - shown.merchantFee : 0;
  // Cobro diferido: hoy entra el anticipo y el resto a `settlementDays`;
  // inmediato = todo al abrir (misma regla que `quote()`).
  const settleDays = shown?.terms?.settlementDays ?? 0;
  const advance = settleDays === 0 ? received : (shown?.downPayment ?? 0);
  const pendingMerchant = received - advance;
  // Interés firmado = lo que se repaga menos lo financiado (datos del plan).
  const repaid = shown ? shown.installments.reduce((a, i) => a + i.amount, 0) : 0;
  const interest = shown ? Math.max(0, repaid - shown.financed) : 0;
  const owed = shown ? pendingAmount(shown) : 0;
  const unpaid = shown ? unpaidInstallments(shown) : [];
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);

  return (
    <div className={styles.success}>
      <svg
        viewBox="0 0 760 190"
        className={styles.successSvg}
        role="img"
        aria-label={t.beamAria(fmt(advance))}
      >
        <defs>
          <radialGradient id="succ-fill" cx="50%" cy="118%" r="95%">
            <stop offset="0" stopColor="#19fb9b" stopOpacity="0.4" />
            <stop offset="0.55" stopColor="#9945ff" stopOpacity="0.22" />
            <stop offset="1" stopColor="#9945ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="succ-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9945ff" />
            <stop offset="0.5" stopColor="#00c2ff" />
            <stop offset="1" stopColor="#19fb9b" />
          </linearGradient>
          <filter id="succ-soft" x="-40%" y="-300%" width="180%" height="700%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Vos */}
        <circle cx="42" cy="95" r="6" fill="#fff" />
        <circle cx="42" cy="95" r="13" fill="none" stroke="rgba(255,255,255,0.35)" />
        <text x="42" y="132" textAnchor="middle" className={styles.sNodeText}>
          {t.beamYou}
        </text>

        {/* El anticipo viaja como haz blanco */}
        <line x1="62" y1="95" x2="298" y2="95" className={styles.sBeamGlow} filter="url(#succ-soft)" />
        <line x1="62" y1="95" x2="298" y2="95" className={styles.sBeamSolid} />
        <line x1="62" y1="95" x2="298" y2="95" className={styles.sPhotons} />

        {/* El vidrio lo parte */}
        <polygon points="312,60 346,130 278,130" className={styles.sPrism} />

        {/* Espectro hacia el comercio */}
        <g className={styles.sFan}>
          <line x1="346" y1="95" x2="558" y2="68" pathLength={1} stroke="#9945ff" />
          <line x1="346" y1="95" x2="558" y2="95" pathLength={1} stroke="#00c2ff" />
          <line x1="346" y1="95" x2="558" y2="122" pathLength={1} stroke="#19fb9b" />
        </g>

        {/* El comercio se llena de luz */}
        <g className={styles.sGlow}>
          <rect x="560" y="55" width="150" height="80" rx="16" fill="url(#succ-fill)" />
          <line x1="580" y1="128" x2="690" y2="128" stroke="url(#succ-edge)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <rect x="560" y="55" width="150" height="80" rx="16" className={styles.sTile} />
        <text x="635" y="99" textAnchor="middle" className={styles.sTileText}>
          {merchantName}
        </text>
      </svg>

      <h2 ref={headingRef} tabIndex={-1} className={styles.successTitle}>{t.title}</h2>
      <p className={styles.successLead}>
        {t.merchantPaidLead(merchantName)}{" "}
        <BigNumber amount={advance} size="lg" className={styles.savingsNum} />{" "}
        {t.merchantPaidTail(settleDays)}
      </p>
      <div className={styles.receiptRow}>
        {getCuotas().mode === "real" ? (
          <ExplorerLink signature={signature} />
        ) : (
          <p className={styles.receipt}>{t.receipt(short(signature))}</p>
        )}
        {reconciled ? <Chip>{t.reconciled}</Chip> : null}
      </div>

      {shown ? (
        <div className={styles.successFacts}>
          <span>{t.youPaid(fmt(shown.downPayment))}</span>
          <span data-testid="pending-fact">{t.pendingFact(fmt(owed))}</span>
          {unpaid.length ? (
            <span>
              {t.installments(unpaid.length, fmt(unpaid[0]?.amount ?? 0))}
            </span>
          ) : null}
          {interest > 0 ? <span>{t.interestFact(fmt(interest))}</span> : null}
          {pendingMerchant > 0 ? (
            <span>
              {t.merchantLaterFact(merchantName, fmt(pendingMerchant), settleDays)}
            </span>
          ) : null}
        </div>
      ) : null}

      {shown ? (
        <>
          <PlanCalendar
            plan={shown}
            config={config}
            now={now}
            secondsPerDay={secondsPerDay}
            nextAction={pay.cta}
          />
          {pay.panel}
        </>
      ) : null}

      <div className={styles.successCtas}>
        <Link href="/panel" className={buttonClasses("primary")}>
          {t.ctaPanel}
        </Link>
        {shown ? (
          <Link
            href={`/comercio/${shown.merchant}`}
            className={buttonClasses("secondary")}
          >
            {t.ctaStore}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
