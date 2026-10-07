"use client";

// Panel de seguimiento del fiador: fianza, deuda pendiente del estudiante,
// cobertura exigida vs máximo, avisos/cargos (Activity) y eventos del pool
// relacionados. Todo lee del cliente compartido; recibos declarados simulados
// y jamás enlaces al Explorer en mock.
import { ExplorerLink, ReferenceTag } from "@/components/ui/badges";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { garanteCuenta } from "@/i18n/dictionaries/fiador-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import { fmtPct } from "../consulta";
import {
  formatUsdc,
  type Activity,
  type Invitation,
  type Micro,
  type PoolEvent,
} from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

const KINDS_CON_FEE: ReadonlySet<Activity["kind"]> = new Set([
  "GuaranteeRegistered",
  "GuarantorNotified",
  "MarkedLate",
  "GuarantorCharged",
  "RecoveryRegistered",
]);

const fmtFecha = (at: number, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", {
    dateStyle: "medium",
  }).format(at * 1000);

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

export function PanelFiador({ invitation }: { invitation: Invitation }) {
  const t = useT(garanteCuenta);
  const { locale } = useLocale();
  const student = invitation.student;

  const guaranteeQ = useCuotasQuery(["guarantee", student], (c) => c.getGuarantee(student));
  const reputationQ = useCuotasQuery(["reputation", student], (c) => c.getReputation(student));
  const plansQ = useCuotasQuery(["plans", student], (c) => c.getPlans(student));
  const activityQ = useCuotasQuery(["activity", student], (c) => c.getActivity({ student }));
  const poolQ = useCuotasQuery(["pool"], (c) => c.getPool());
  const configQ = useCuotasQuery(["config"], (c) => c.getConfig());
  const quoteQ = useCuotasQuery(
    guaranteeQ.data ? ["quote", guaranteeQ.data.maxPurchase, student] : null,
    (c) => c.quote(guaranteeQ.data!.maxPurchase, student),
  );

  const guarantee = guaranteeQ.data;
  const plans = plansQ.data ?? [];
  const planIds = new Set(plans.map((p) => p.id));

  // Deuda pendiente: cuotas sin pagar ni derivadas al fiador (+ punitorio vencido).
  const deuda = plans.reduce<Micro>((acc, p) => {
    if (p.status === "Settled" || p.status === "Recovered") return acc;
    return (
      acc +
      p.installments
        .filter((i) => i.status !== "Paid" && i.status !== "ChargedToGuarantor")
        .reduce((s, i) => s + i.amount + (i.status === "Late" ? i.penalty : 0), 0)
    );
  }, 0);
  // Lo ya cargado a la tarjeta del fiador.
  const cargado = plans.reduce<Micro>(
    (acc, p) =>
      acc +
      p.installments
        .filter((i) => i.status === "ChargedToGuarantor")
        .reduce((s, i) => s + i.amount + i.penalty, 0),
    0,
  );

  const avisos = (activityQ.data ?? []).filter(
    (a) => KINDS_CON_FEE.has(a.kind) && (!a.student || a.student === student),
  );
  const poolEvents = (poolQ.data?.events ?? []).filter(
    (e): e is PoolEvent & { planId: string } => !!e.planId && planIds.has(e.planId),
  );
  const hayPendiente = plans.some((p) => p.status === "Active" || p.status === "Late");

  const chargeDay = configQ.data?.guarantorChargeDay;

  // Alcance de la fianza sobre el capital pendiente: mismo porcentaje en
  // todos los escalones si la config no los distingue; si no, el del escalón
  // cotizado. `null` mientras falten datos (no se inventa un número).
  const tierCoverage = configQ.data
    ? [...new Set(configQ.data.guaranteedTiers.map((x) => x.guarantorCoverageBps))]
    : [];
  const quoteCoverageBps =
    quoteQ.data?.withGuarantee && configQ.data
      ? (configQ.data.guaranteedTiers[quoteQ.data.tier]?.guarantorCoverageBps ?? null)
      : null;
  const coverageLine =
    tierCoverage.length === 1
      ? t.panel.coverageAllTiers.replace("{pct}", fmtPct(tierCoverage[0] / 10_000, locale))
      : quoteCoverageBps != null
        ? t.panel.coverageThisTier.replace("{pct}", fmtPct(quoteCoverageBps / 10_000, locale))
        : null;

  return (
    <div data-testid="fiador-panel" className="space-y-4">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-medium text-ink">{t.panel.title}</p>
            <p className="mt-1 text-sm text-ink-2">{t.panel.subtitle}</p>
            <p className="mt-1 text-xs text-ink-2">{t.panel.sameLink}</p>
          </div>
          <ReferenceTag>{t.common.simulatedTag}</ReferenceTag>
        </div>
      </GlassPanel>

      {/* Fianza registrada */}
      <GlassPanel className="p-6" aria-label={t.panel.guaranteeTitle}>
        <p className="text-xs uppercase tracking-wide text-ink-2">{t.panel.guaranteeTitle}</p>
        {guaranteeQ.isLoading || guarantee === undefined ? (
          <div className="mt-4 h-20 animate-pulse rounded-2xl bg-beam/5" />
        ) : guarantee === null ? (
          <p className="mt-4 text-sm text-ink-2">
            {t.panel.guaranteeTitle}: {t.invalid.title.toLowerCase()}
          </p>
        ) : (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guarantee.display?.guarantorName && (
              <div>
                <p className="text-xs text-ink-2">{t.panel.guarantorName}</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{guarantee.display.guarantorName}</p>
              </div>
            )}
            {guarantee.display?.cardLabel && (
              <div>
                <p className="text-xs text-ink-2">{t.panel.card}</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{guarantee.display.cardLabel}</p>
              </div>
            )}
            <Monto label={t.panel.tope} value={guarantee.maxPurchase} />
            <Monto label={t.panel.maxCoverage} value={guarantee.coverageMax} tone="beam" />
            <div>
              <p className="text-xs text-ink-2">{t.panel.registeredAt}</p>
              <p className="mt-0.5 text-sm text-ink">{fmtFecha(guarantee.registeredAt, locale)}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <p className="text-xs text-ink-2">
                {t.panel.docHash} <span className="text-ink-2/70">({t.common.simulatedTag})</span>
              </p>
              <p className="mt-0.5 break-all font-mono text-xs text-ink">{guarantee.mandateHash}</p>
            </div>
          </dl>
        )}
      </GlassPanel>

      {/* Estado del estudiante + deuda */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="min-w-0 p-6" aria-label={t.panel.studentTitle}>
          <p className="text-xs uppercase tracking-wide text-ink-2">{t.panel.studentTitle}</p>
          <p className="mt-3 font-mono text-sm text-ink" title={student}>
            {short(student)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {reputationQ.data && (
              <Chip on>
                {t.panel.studentTier} {reputationQ.data.tier}
              </Chip>
            )}
            {reputationQ.data?.blockedFromNewPlans && (
              <Chip className="whitespace-normal">{t.panel.studentBlocked}</Chip>
            )}
          </div>
          {chargeDay != null && hayPendiente && (
            <p className="mt-3 text-xs text-ink-2">
              {t.panel.nextChargeHint} {chargeDay}.
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="min-w-0 p-6" aria-label={t.panel.debtTitle}>
          <p className="text-xs uppercase tracking-wide text-ink-2">{t.panel.debtTitle}</p>
          <p className="mt-1 text-xs text-ink-2">{t.panel.debtBody}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Monto label={t.panel.debtTitle} value={plansQ.data ? deuda : null} />
            <Monto label={t.panel.chargedTitle} value={plansQ.data ? cargado : null} />
          </div>
          {plans.length === 0 && plansQ.data && (
            <p className="mt-3 text-sm text-ink-2">{t.panel.plansEmpty}</p>
          )}
        </GlassPanel>
      </div>

      {/* Cobertura: exigida por la compra vs máximo de la fianza */}
      {guarantee && (
        <GlassPanel className="p-6" aria-label={t.panel.coverageTitle}>
          <p className="text-xs uppercase tracking-wide text-ink-2">{t.panel.coverageTitle}</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Monto label={t.panel.coverageRequired} value={quoteQ.data?.requiredCoverage ?? null} />
            <Monto label={t.panel.coverageMax} value={guarantee.coverageMax} tone="beam" />
          </dl>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-2">
            {coverageLine ? `${coverageLine} ` : ""}
            {t.panel.coverageScope}
          </p>
        </GlassPanel>
      )}

      {/* Avisos, cargos y eventos del pool — recibos declarados simulados */}
      <GlassPanel className="p-6" aria-label={t.panel.noticesTitle}>
        <p className="text-xs uppercase tracking-wide text-ink-2">{t.panel.noticesTitle}</p>
        {avisos.length === 0 && poolEvents.length === 0 && !activityQ.isLoading ? (
          <p className="mt-4 text-sm text-ink-2">{t.panel.noticesEmpty}</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {avisos.map((a, i) => (
              <Aviso key={`a-${i}`} activity={a} />
            ))}
            {poolEvents.map((e, i) => (
              <PoolItem key={`p-${i}`} event={e} />
            ))}
          </ol>
        )}
      </GlassPanel>
    </div>
  );

  function Aviso({ activity }: { activity: Activity }) {
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <Chip on={activity.kind === "GuarantorCharged" || activity.kind === "MarkedLate"}>
            {(t.panel.kinds as Partial<Record<Activity["kind"], string>>)[activity.kind] ?? activity.kind}
          </Chip>
          {activity.amount != null && (
            <span className="text-sm font-medium text-ink">
              US${formatUsdc(activity.amount, locale)}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 text-xs text-ink-2">
          <span>{fmtFecha(activity.at, locale)}</span>
          {activity.signature && <ExplorerLink signature={activity.signature} />}
        </div>
      </li>
    );
  }

  function PoolItem({ event }: { event: PoolEvent }) {
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-hairline px-4 py-3">
        <div className="flex items-center gap-2">
          <Chip on={event.kind === "Loss"}>Pool · {event.kind}</Chip>
          <span className="text-sm font-medium text-ink">
            US${formatUsdc(event.amount, locale)}
          </span>
        </div>
        <div className="flex items-baseline gap-2 text-xs text-ink-2">
          <span>{fmtFecha(event.at, locale)}</span>
          {event.receiptHash ? (
            <span className="font-mono">
              {event.receiptHash.slice(0, 12)}…{" "}
              <ReferenceTag>{t.panel.receiptSimulated}</ReferenceTag>
            </span>
          ) : (
            <ExplorerLink signature={event.signature} />
          )}
        </div>
      </li>
    );
  }
}
