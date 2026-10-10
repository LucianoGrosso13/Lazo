"use client";

// Plan del comprador como tarjeta con anillo de cuotas: el anillo muestra
// pagadas/total de un vistazo (la luz del rol lo rellena), al lado el
// comercio y el estado; abajo los montos y la lista compacta de cuotas.
// Replica la info del PlanCard genérico sin tocar `mock-account.tsx`.
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark, installmentMark } from "@/components/ui/state-mark";
import { useInView } from "@/components/ui/use-in-view";
import { usePayInstallment } from "@/components/checkout/pay-installment";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { account } from "@/i18n/dictionaries/account";
import { useLocale, useT } from "@/i18n/locale";
import {
  formatUsdc,
  type Installment,
  type Micro,
  type Plan,
  type PlanTerms,
  type WalletAddress,
} from "@/lib/cuotas";
import { getDirectoryMerchant } from "@/lib/merchants";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { fmtPct } from "../consulta";
import styles from "./comprador.module.css";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

const fmtFecha = (at: number, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", {
    dateStyle: "medium",
  }).format(at * 1000);

const isPaid = (i: Pick<Installment, "status" | "paidAt">) =>
  i.status === "Paid" || i.paidAt !== undefined;

/** Anillo de progreso del plan: pagadas sobre total, con la luz del rol. */
function RingProgreso({ paid, total }: { paid: number; total: number }) {
  const t = useT(cuentas).student;
  const { ref, entered } = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const ratio = total > 0 ? paid / total : 0;
  return (
    <span
      ref={ref}
      className={styles.ring}
      data-entered={entered && !reduced ? "" : undefined}
      role="img"
      aria-label={t.paidRing(paid, total)}
    >
      <svg viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="20" pathLength={100} className={styles.ringTrack} />
        <circle
          cx="24"
          cy="24"
          r="20"
          pathLength={100}
          strokeDasharray={`${ratio * 100} 100`}
          transform="rotate(-90 24 24)"
          className={styles.ringArc}
        />
      </svg>
      <span className={styles.ringText} aria-hidden>
        {paid}/{total}
        <small>{t.paidRingShort}</small>
      </span>
    </span>
  );
}

/** Comercio del plan: nombre del directorio demo o del cliente; nunca inventado. */
function PlanMerchant({ address }: { address: WalletAddress }) {
  const t = useT(account);
  const demo = getDirectoryMerchant(address);
  const nameQ = useCuotasQuery(demo ? null : ["plan-merchant", address], async (c) => {
    try {
      return (await c.getMerchant(address)).name;
    } catch {
      return null;
    }
  });
  const name = demo?.name ?? nameQ.data ?? null;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-medium text-beam">{name ?? short(address)}</span>
      {demo && <Chip>{t.demoTag}</Chip>}
      {name && (
        <span className="font-mono text-xs text-ink-ghost" title={address}>
          {short(address)}
        </span>
      )}
    </span>
  );
}

function Monto({ label, value, tone }: { label: string; value: Micro | null; tone?: "beam" }) {
  const { locale } = useLocale();
  return (
    <div>
      <p className="text-xs text-ink-2">{label}</p>
      <p className={`mt-0.5 font-medium ${tone === "beam" ? "text-beam" : "text-ink"}`}>
        {value != null ? `US$${formatUsdc(value, locale)}` : "—"}
      </p>
    </div>
  );
}

function Cuota({ installment, index }: { installment: Installment; index: number }) {
  const t = useT(account);
  const { locale } = useLocale();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-hairline px-4 py-2.5">
      <span className="flex items-center gap-2 text-sm text-ink">
        <StateMark
          state={installmentMark(installment.status)}
          title={t.installmentStatus[installment.status]}
        />
        <span className="font-medium">
          {t.installment} {index + 1} · US${formatUsdc(installment.amount, locale)}
        </span>
        {installment.status === "Late" && installment.penalty > 0 && (
          <span className="text-xs text-ink-2">
            +US${formatUsdc(installment.penalty, locale)} {t.penalty}
          </span>
        )}
      </span>
      <span className="text-xs text-ink-2">
        {installment.status === "Paid" || installment.status === "Upcoming" ? (
          <>{t.installmentStatus[installment.status]} · {fmtFecha(installment.dueAt, locale)}</>
        ) : (
          <Chip on={installment.status !== "ChargedToGuarantor"}>
            {t.installmentStatus[installment.status]} · {fmtFecha(installment.dueAt, locale)}
          </Chip>
        )}
      </span>
    </li>
  );
}

export function PlanCardComprador({ plan }: { plan: Plan }) {
  const t = useT(account);
  const { locale } = useLocale();
  const pay = usePayInstallment({ plan, student: plan.student });

  const terms: PlanTerms | undefined = plan.terms;
  const installmentsCount = terms?.installmentsCount ?? plan.installments.length;
  const interestTotal = Math.max(
    0,
    plan.installments.reduce((a, i) => a + i.amount, 0) - plan.financed,
  );
  const interestBps =
    terms?.interestTotalBps ??
    (plan.financed > 0 ? Math.round((interestTotal * 10_000) / plan.financed) : 0);
  const paid = plan.installments.filter(isPaid).length;
  const total = plan.installments.length;

  return (
    <GlassPanel className="p-5 sm:p-6" data-testid="account-plan">
      <div className={styles.planTop}>
        <RingProgreso paid={paid} total={total} />
        <div className={styles.planInfo}>
          <div className={styles.planTitle}>
            <PlanMerchant address={plan.merchant} />
            <Chip on={plan.status === "Active"}>{t.planStatus[plan.status]}</Chip>
          </div>
          <p className={styles.planMeta}>
            <span className={styles.planId}>{plan.id}</span>
            <span aria-hidden> · </span>
            <span>{t.planTerms(installmentsCount)}</span>
            <span aria-hidden> · </span>
            <span>
              {interestTotal > 0
                ? t.planInterestMeta(fmtPct(interestBps / 10_000, locale))
                : t.planInterestFree}
            </span>
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Monto label={t.price} value={plan.price} />
        <Monto label={t.downPayment} value={plan.downPayment} />
        <Monto label={t.financed} value={plan.financed} tone="beam" />
        <div>
          <p className="text-xs text-ink-2">{t.planInterest}</p>
          <p className="mt-0.5 font-medium text-ink">
            {interestTotal > 0 ? `US$${formatUsdc(interestTotal, locale)}` : t.planInterestFree}
          </p>
        </div>
      </dl>

      <ol className="mt-4 space-y-2">
        {plan.installments.map((i) => (
          <Cuota key={i.index} installment={i} index={i.index} />
        ))}
      </ol>

      <p className="mt-3 text-xs text-ink-2">{plan.counts ? t.counts : t.countsNo}</p>
      {pay.cta ? <div className="mt-4">{pay.cta}</div> : null}
      {pay.panel ? <div className="mt-4">{pay.panel}</div> : null}
    </GlassPanel>
  );
}
