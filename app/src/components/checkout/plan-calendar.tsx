"use client";

// Calendario del plan recién abierto (ticket 01): cada cuota con su fecha
// exacta onchain, la primera impaga destacada con días restantes, montos
// exactos consultables (6 decimales) y el desplegable «qué pasa si me
// atraso» alimentado por la config vigente — sin ejecutar ni prometer mora.
// La acción sobre la próxima cuota (pago, ticket 02) entra por `nextAction`.
import type { ReactNode } from "react";
import {
  formatUsdc,
  type Installment,
  type Micro,
  type Plan,
  type ProtocolConfig,
  type UnixSeconds,
} from "@/lib/cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { useLocale, useT } from "@/i18n/locale";
import { StateMark, installmentMark } from "@/components/ui/state-mark";
import { Chip } from "@/components/ui/chip";
import { pctOfBps } from "./format";
import styles from "./checkout.module.css";

/** Cuotas todavía adeudadas (ni pagadas ni derivadas al fiador), por vencimiento. */
export function unpaidInstallments(plan: Plan): Installment[] {
  return plan.installments
    .filter((i) => i.status !== "Paid" && i.status !== "ChargedToGuarantor")
    .sort((a, b) => a.dueAt - b.dueAt || a.index - b.index);
}

/** Deuda pendiente del plan: cuotas impagas + punitorio ya vencido (a cargo del estudiante). */
export function pendingAmount(plan: Plan): Micro {
  return unpaidInstallments(plan).reduce(
    (s, i) => s + i.amount + (i.status === "Late" ? i.penalty : 0),
    0,
  );
}

/**
 * Días hasta el vencimiento con el tiempo de referencia dado (en real es el
 * reloj real: 86.400 s/día — nunca el reloj acelerado de la demo). Positivo =
 * faltan; 0 = vence hoy; negativo = ya pasó.
 */
export function daysUntil(
  dueAt: UnixSeconds,
  now: UnixSeconds,
  secondsPerDay = 86_400,
): number {
  const d = Math.ceil((dueAt - now) / secondsPerDay);
  return d === 0 ? 0 : d; // normaliza -0
}

/** ¿El monto en micro-USDC entra justo en 2 decimales? Si no, se marca «≈». */
export function isRounded(micro: Micro): boolean {
  return micro % 10_000 !== 0;
}

export function PlanCalendar({
  plan,
  config,
  now,
  secondsPerDay,
  nextAction,
}: {
  plan: Plan;
  /** Config vigente (parámetros de mora). Si falta, el desplegable no se muestra. */
  config: ProtocolConfig | undefined;
  /** Tiempo de referencia en segundos unix (reloj real en modo real). */
  now: UnixSeconds;
  /** Duración del día para "días restantes" (86.400 en real). */
  secondsPerDay: number;
  /** Acción opcional sobre la próxima cuota (p. ej. el CTA de pago del ticket 02). */
  nextAction?: ReactNode;
}) {
  const t = useT(checkout).calendar;
  const { locale } = useLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "medium",
  });
  const fmtDate = (at: UnixSeconds) => dateFmt.format(new Date(at * 1000));
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);

  const pending = unpaidInstallments(plan);
  const nextUp = pending[0];
  const nextDays = nextUp ? daysUntil(nextUp.dueAt, now, secondsPerDay) : 0;
  const exactTotal = plan.installments.reduce((s, i) => s + i.amount, 0);

  return (
    <section className={styles.cal} aria-label={t.title} data-testid="plan-calendar">
      <div className={styles.calHead}>
        <h3 className={styles.calTitle}>{t.title}</h3>
        <Chip>{t.count(plan.installments.length)}</Chip>
      </div>

      {nextUp ? (
        <div className={styles.calNext} data-testid="next-installment">
          <StateMark state="lit" title={t.nextUp} />
          <div className={styles.calNextBody}>
            <p className={styles.calNextLabel}>{t.nextUp}</p>
            <p className={styles.calNextAmt}>
              {isRounded(nextUp.amount) ? "≈ " : ""}US$ {fmt(nextUp.amount)}
            </p>
            <p className={styles.calNextDue}>
              {t.dueOn(fmtDate(nextUp.dueAt))} ·{" "}
              {nextDays > 0
                ? t.inDays(nextDays)
                : nextDays === 0
                  ? t.dueToday
                  : t.overdueDays(-nextDays)}
            </p>
            {nextAction ? (
              <div className={styles.calNextCta}>{nextAction}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ol className={styles.calList}>
        {plan.installments.map((i) => {
          const isNext = nextUp?.index === i.index;
          return (
            <li
              key={i.index}
              className={styles.calRow}
              data-next={isNext || undefined}
            >
              <StateMark
                state={installmentMark(i.status)}
                title={t.status[i.status]}
              />
              <span className={styles.calName}>
                {t.installment(i.index + 1)}
                {isNext ? (
                  <span className={styles.calNextTag}>{t.nextTag}</span>
                ) : null}
              </span>
              <span className={styles.calDue}>
                {i.status === "Paid" || i.status === "ChargedToGuarantor"
                  ? t.status[i.status]
                  : t.dueOn(fmtDate(i.dueAt))}
              </span>
              <span
                className={styles.calAmt}
                title={isRounded(i.amount) ? fmt(i.amount, 6) : undefined}
              >
                {isRounded(i.amount) ? "≈ " : ""}US$ {fmt(i.amount)}
              </span>
            </li>
          );
        })}
      </ol>

      {plan.installments.some((i) => isRounded(i.amount)) ? (
        <details className={styles.calDetails} data-testid="exact-amounts">
          <summary>{t.exactToggle}</summary>
          <ol className={styles.calExactList}>
            {plan.installments.map((i) => (
              <li key={i.index}>
                <span>{t.installment(i.index + 1)}</span>
                <span className={styles.calAmt}>US$ {fmt(i.amount, 6)}</span>
              </li>
            ))}
            <li className={styles.calExactTotal}>
              <span>{t.exactTotal}</span>
              <span className={styles.calAmt}>US$ {fmt(exactTotal, 6)}</span>
            </li>
          </ol>
          <p className={styles.calApprox}>{t.approxNote}</p>
        </details>
      ) : null}

      {config ? <LateDetails config={config} /> : null}
    </section>
  );
}

/**
 * «¿Qué pasa si me atraso?»: parámetros verificados de `ProtocolConfig`
 * (gracia, aviso al fiador, recargo único, solicitud de cobro) + efecto del
 * recupero registrado. La fianza NO cubre el recargo: política vigente.
 */
function LateDetails({ config }: { config: ProtocolConfig }) {
  const t = useT(checkout).calendar.late;
  const { locale } = useLocale();
  return (
    <details className={styles.calDetails} data-testid="late-details">
      <summary>{t.title}</summary>
      <ul className={styles.lateList}>
        <li>{t.grace(config.graceDays)}</li>
        {config.guarantorNoticeDay > 0 ? (
          <li>{t.notice(config.guarantorNoticeDay)}</li>
        ) : null}
        <li>{t.penalty(pctOfBps(config.penaltyBps, locale))}</li>
        <li>{t.charge(config.guarantorChargeDay)}</li>
        <li>{t.recovery}</li>
      </ul>
    </details>
  );
}
