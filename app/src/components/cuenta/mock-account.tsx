"use client";

// Tablero mock de `/account`: agrega los datos que deja el flujo de prueba
// (tienda → checkout → plan → paneles) para el comprador del recorrido.
// Jerarquía: resumen de un vistazo → planes → detalles colapsados.
// Todo sale del cliente compartido (`cuotas.ts`, mock en demo); nada se firma.
import Link from "next/link";
import useSWR from "swr";
import { useStudentAddress } from "@/components/cuenta/account-context";
import { ModeBadge } from "@/components/cuenta/evidencia";
import { BigNumber } from "@/components/ui/big-number";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark, installmentMark } from "@/components/ui/state-mark";
import { account } from "@/i18n/dictionaries/account";
import { useLocale, useT } from "@/i18n/locale";
import {
  DEMO_MERCHANT,
  formatUsdc,
  getAccountCuotas,
  type Installment,
  type Micro,
  type Plan,
  type PlanTerms,
  type WalletAddress,
} from "@/lib/cuotas";
import { getDirectoryMerchant } from "@/lib/merchants";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { fmtPct } from "./consulta";

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

const fmtFecha = (at: number, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-AR", {
    dateStyle: "medium",
  }).format(at * 1000);

/** Cuotas todavía no pagadas ni derivadas, ordenadas por vencimiento. */
function pendientes(plan: Plan): Installment[] {
  return plan.installments
    .filter((i) => i.status !== "Paid" && i.status !== "ChargedToGuarantor")
    .sort((a, b) => a.dueAt - b.dueAt);
}

/** Deuda pendiente de todos los planes abiertos (+ punitorio ya vencido). */
export function deudaDePlanes(plans: Plan[]): Micro {
  return plans.reduce<Micro>(
    (acc, p) =>
      acc +
      pendientes(p).reduce((s, i) => s + i.amount + (i.status === "Late" ? i.penalty : 0), 0),
    0,
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

/**
 * Detalle colapsado: título siempre visible, contenido a un clic.
 * Lo secundario (fiador, comercio, pool, actividad) vive acá.
 */
export function DetalleCuenta({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-3xl border border-hairline px-5 py-4">
      <summary className="cursor-pointer text-sm font-medium text-ink">{title}</summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

/**
 * Resumen de un vistazo para el comprador: saldo, deuda pendiente y próxima
 * cuota, más el escalón. Hace sus propias consultas (SWR las comparte).
 */
export function ResumenCuenta({ student }: { student: string }) {
  const t = useT(account);
  const { locale } = useLocale();

  const reputationQ = useCuotasQuery(["reputation", student], (c) => c.getReputation(student));
  const balanceQ = useSWR(["account-balance", student], () => getAccountCuotas().getBalance(student));
  const plansQ = useCuotasQuery(["plans", student], (c) => c.getPlans(student));

  const reputation = reputationQ.data;
  const plans = plansQ.data ?? [];
  const deuda = plansQ.data ? deudaDePlanes(plans) : null;
  const proxima = plans.flatMap((p) => pendientes(p).map((i) => ({ plan: p, cuota: i })))
    .sort((a, b) => a.cuota.dueAt - b.cuota.dueAt)[0];

  return (
    <GlassPanel className="p-6" aria-label={t.summaryTitle} data-testid="account-summary">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs uppercase tracking-wide text-ink-2">{t.summaryTitle}</p>
        {reputation && (
          <Chip on>
            {t.tier} {reputation.tier}
          </Chip>
        )}
        {reputation?.blockedFromNewPlans && <Chip>{t.blocked}</Chip>}
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-2">{t.balance}</p>
          {balanceQ.data?.available != null ? (
            <BigNumber amount={balanceQ.data.available} currency="none" size="md" />
          ) : (
            <p className="mt-0.5 text-sm text-ink-3">{t.balanceUnavailable}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-ink-2">{t.debt}</p>
          {deuda != null ? (
            deuda > 0 ? (
              <BigNumber amount={deuda} currency="none" size="md" />
            ) : (
              <p className="mt-1 text-sm text-ink-2">{t.noDebt}</p>
            )
          ) : (
            <div className="mt-2 h-8 w-32 animate-pulse rounded bg-beam/5" />
          )}
        </div>
        <div>
          <p className="text-xs text-ink-2">{t.next}</p>
          {plansQ.data ? (
            proxima ? (
              <p className="mt-1 text-sm font-medium text-ink">
                US${formatUsdc(proxima.cuota.amount, locale)} · {fmtFecha(proxima.cuota.dueAt, locale)}
                <span className="block font-mono text-xs font-normal text-ink-2">
                  {proxima.plan.id}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-2">{t.noUpcoming}</p>
            )
          ) : (
            <div className="mt-2 h-8 w-32 animate-pulse rounded bg-beam/5" />
          )}
        </div>
      </div>
    </GlassPanel>
  );
}

function Cuota({ installment, index }: { installment: Installment; index: number }) {
  const t = useT(account);
  const { locale } = useLocale();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border border-hairline px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-ink">
        <StateMark state={installmentMark(installment.status)} title={t.installmentStatus[installment.status]} />
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

/**
 * Comercio del plan: nombre del directorio demo (etiquetado "demo") o del
 * estado del cliente; sin datos, la dirección corta. Nunca inventa un nombre.
 */
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
    <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-ink-2">
      <span>
        {t.planMerchant}: <span className="font-medium text-ink">{name ?? short(address)}</span>
      </span>
      {demo && <Chip>{t.demoTag}</Chip>}
      {name && (
        <span className="font-mono text-xs text-ink-ghost" title={address}>
          {short(address)}
        </span>
      )}
    </p>
  );
}

export function PlanCard({ plan }: { plan: Plan }) {
  const t = useT(account);
  const { locale } = useLocale();
  // Planes anteriores a `plan.terms`: se leen como su lista efectiva de
  // cuotas sin interés propio (el mock ya los normaliza igual al cargar).
  const terms: PlanTerms | undefined = plan.terms;
  const installmentsCount = terms?.installmentsCount ?? plan.installments.length;
  const interestTotal = Math.max(
    0,
    plan.installments.reduce((a, i) => a + i.amount, 0) - plan.financed,
  );
  const interestBps =
    terms?.interestTotalBps ??
    (plan.financed > 0 ? Math.round((interestTotal * 10_000) / plan.financed) : 0);
  const provisional = terms?.provisional ?? false;
  return (
    <GlassPanel className="p-6" data-testid="account-plan">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-ink">{plan.id}</p>
        <Chip on={plan.status === "Active"}>{t.planStatus[plan.status]}</Chip>
      </div>
      <PlanMerchant address={plan.merchant} />
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
        <span>{t.planTerms(installmentsCount)}</span>
        <span aria-hidden>·</span>
        <span>
          {interestTotal > 0
            ? t.planInterestMeta(fmtPct(interestBps / 10_000, locale))
            : t.planInterestFree}
        </span>
        {provisional && <Chip>{t.planProvisional}</Chip>}
      </p>
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
    </GlassPanel>
  );
}

export function MockAccount() {
  const t = useT(account);
  const { locale } = useLocale();
  const student = useStudentAddress();

  const guaranteeQ = useCuotasQuery(student ? ["guarantee", student] : null, (c) =>
    c.getGuarantee(student!),
  );
  const plansQ = useCuotasQuery(student ? ["plans", student] : null, (c) =>
    c.getPlans(student!),
  );
  const merchantQ = useCuotasQuery(["merchant", DEMO_MERCHANT], (c) =>
    c.getMerchant(DEMO_MERCHANT),
  );
  const poolQ = useCuotasQuery(["pool"], (c) => c.getPool());
  const activityQ = useCuotasQuery(student ? ["activity", student] : null, (c) =>
    c.getActivity({ student: student! }),
  );

  const plans = plansQ.data ?? [];
  const guarantee = guaranteeQ.data;
  const merchant = merchantQ.data;
  const pool = poolQ.data;
  const activity = [...(activityQ.data ?? [])].reverse().slice(0, 8);
  const poolEvents = [...(pool?.events ?? [])].reverse().slice(0, 5);

  return (
    <div className="max-w-3xl space-y-6" data-testid="mock-account">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">
            {t.title}
          </h1>
          <ModeBadge />
        </div>
        <p className="mt-3 text-ink-2">{t.subtitle}</p>
        <p className="mt-2 text-xs text-ink-3">{t.mockTag}</p>
      </header>

      {student && <ResumenCuenta student={student} />}

      <section aria-label={t.plansTitle} className="space-y-4">
        <h2 className="text-lg font-semibold text-beam">{t.plansTitle}</h2>
        {plansQ.data && plans.length === 0 && (
          <GlassPanel className="p-6">
            <p className="text-sm text-ink-2">{t.plansEmpty}</p>
            <Link href="/comercio" className={`${buttonClasses("secondary", "sm")} mt-4 inline-flex`}>
              {t.plansCta}
            </Link>
          </GlassPanel>
        )}
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </section>

      <section aria-label={t.detailsTitle} className="space-y-3">
        <h2 className="text-lg font-semibold text-beam">{t.detailsTitle}</h2>

        <DetalleCuenta title={t.guaranteeTitle}>
          {guaranteeQ.isLoading || guarantee === undefined ? (
            <div className="h-16 animate-pulse rounded-2xl bg-beam/5" />
          ) : guarantee === null ? (
            <p className="text-sm text-ink-2">{t.guaranteeEmpty}</p>
          ) : (
            <>
              <Chip on={guarantee.active}>
                {guarantee.active ? t.guaranteeActive : t.guaranteeInactive}
              </Chip>
              {(guarantee.display?.guarantorName || guarantee.display?.cardLabel) && (
                <p className="mt-3 text-sm font-medium text-ink">
                  {[guarantee.display?.guarantorName, guarantee.display?.cardLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-2 gap-4">
                <Monto label={t.maxPurchase} value={guarantee.maxPurchase} />
                <Monto label={t.maxCoverage} value={guarantee.coverageMax} tone="beam" />
              </dl>
            </>
          )}
        </DetalleCuenta>

        <DetalleCuenta title={t.merchantTitle}>
          {merchant ? (
            <>
              <p className="text-sm font-medium text-ink">
                {merchant.name}{" "}
                <span className="font-mono text-xs font-normal text-ink-ghost" title={merchant.owner}>
                  {short(merchant.owner)}
                </span>
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-4">
                <Monto label={t.settlementBalance} value={merchant.settlementBalance} tone="beam" />
                <div>
                  <p className="text-xs text-ink-2">{t.plansCount}</p>
                  <p className="mt-0.5 font-medium text-ink">{merchant.plansCount}</p>
                </div>
              </dl>
              {merchant.sales.length > 0 && (
                <ol className="mt-3 space-y-2">
                  <p className="text-xs text-ink-2">{t.merchantSales}</p>
                  {merchant.sales.slice(-4).reverse().map((s) => (
                    <li
                      key={s.planId}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="font-mono text-xs text-ink-2">{s.planId}</span>
                      <span className="text-ink">
                        US${formatUsdc(s.received, locale)}{" "}
                        <span className="text-xs text-ink-2">{t.saleReceived}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <div className="h-16 animate-pulse rounded-2xl bg-beam/5" />
          )}
        </DetalleCuenta>

        <DetalleCuenta title={t.poolTitle}>
          {pool ? (
            <>
              <dl className="mt-1 grid grid-cols-2 gap-4">
                <Monto label={t.poolAvailable} value={pool.available} />
                <Monto label={t.poolOutstanding} value={pool.outstandingCredit} />
                <Monto label={t.poolFees} value={pool.accruedFees} />
                <Monto label={t.poolNav} value={pool.nav} tone="beam" />
              </dl>
              <p className="mt-4 text-xs text-ink-2">{t.poolEvents}</p>
              {poolEvents.length === 0 ? (
                <p className="mt-2 text-sm text-ink-2">{t.poolEventsEmpty}</p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {poolEvents.map((e, i) => (
                    <li
                      key={`${e.signature}-${i}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="text-ink-2">
                        {e.kind}
                        {e.planId && <span className="font-mono text-xs"> · {e.planId}</span>}
                      </span>
                      <span className="font-medium text-ink">US${formatUsdc(e.amount, locale)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <div className="h-16 animate-pulse rounded-2xl bg-beam/5" />
          )}
        </DetalleCuenta>

        <DetalleCuenta title={t.activityTitle}>
          {activity.length === 0 && !activityQ.isLoading ? (
            <p className="text-sm text-ink-2">{t.activityEmpty}</p>
          ) : (
            <ol className="space-y-2">
              {activity.map((a, i) => (
                <li
                  key={`${a.signature}-${i}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                >
                  <span className="text-ink">
                    {a.kind}
                    {a.planId && <span className="font-mono text-xs text-ink-2"> · {a.planId}</span>}
                  </span>
                  <span className="text-xs text-ink-2">
                    {a.amount != null && <>US${formatUsdc(a.amount, locale)} · </>}
                    {fmtFecha(a.at, locale)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </DetalleCuenta>
      </section>

      <section aria-label={t.linksTitle}>
        <div className="flex flex-wrap gap-3">
          <Link href="/app" className={buttonClasses("secondary", "sm")}>
            {t.links.entry}
          </Link>
          <Link href="/pool" className={buttonClasses("secondary", "sm")}>
            {t.links.pool}
          </Link>
          <Link href="/comercio" className={buttonClasses("secondary", "sm")}>
            {t.links.merchant}
          </Link>
        </div>
      </section>
    </div>
  );
}
