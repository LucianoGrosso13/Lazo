"use client";

// Estudiante: cuenta propia (/app/estudiante, con rol student del contexto de
// cuenta). Resumen de un vistazo → planes → detalles del fiador.
// Falla cerrado si el rol resuelto no es student.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { WalletButton } from "@/components/wallet-button";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useLocale, useT } from "@/i18n/locale";
import { formatUsdc, type Micro } from "@/lib/cuotas";
import { DEMO_ACCOUNT_IDS, DEMO_ROUTES, type DemoAccountId } from "@/lib/roles";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useAccount } from "./account-context";
import { ModeBadge } from "./evidencia";
import { InviteGuarantor } from "./invitar-fiador";
import { DetalleCuenta, PlanCard, ResumenCuenta } from "./mock-account";
import { EstadoConsulta, shortAddr } from "./consulta";

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

export function EstudianteCuenta() {
  const t = useT(cuentas).student;
  const roles = useT(cuentas).roles;
  const entry = useT(cuentas).entry;
  const { account, status, errorCode, refresh } = useAccount();

  const student = account?.role === "student" ? account.address : null;

  const plansQ = useCuotasQuery(student ? ["plans", student] : null, (c) =>
    c.getPlans(student!),
  );
  const guaranteeQ = useCuotasQuery(student ? ["guarantee", student] : null, (c) =>
    c.getGuarantee(student!),
  );
  const quoteQ = useCuotasQuery(
    guaranteeQ.data ? ["quote", guaranteeQ.data.maxPurchase, student] : null,
    (c) => c.quote(guaranteeQ.data!.maxPurchase, student!),
  );

  if (status === "error") {
    return (
      <EstadoConsulta
        testId="estudiante-cuenta-error"
        tono="error"
        title={entry.errorTitle}
        body={errorCode ?? ""}
        onRetry={refresh}
        reintentar={entry.errorRetry}
      />
    );
  }
  if (status === "ready" && account && account.role !== "student") {
    return (
      <div className="space-y-4">
        <EstadoConsulta
          testId="estudiante-no-es-estudiante"
          tono="vacio"
          title={t.notStudentTitle}
          body={t.notStudentBody.replace("{rol}", roles[account.role])}
          reintentar=""
        />
        <Link href="/app" className={buttonClasses("secondary", "sm")}>
          {t.goEntry}
        </Link>
      </div>
    );
  }
  if (status === "ready" && account?.role === "student") {
    const plans = plansQ.data ?? [];
    const guarantee = guaranteeQ.data;
    return (
      <div className="max-w-3xl space-y-6" data-testid="estudiante-cuenta">
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">
              {t.title}
            </h1>
            <ModeBadge />
          </div>
          <p className="mt-3 text-ink-2">{t.subtitle}</p>
          <p className="mt-1 font-mono text-xs text-ink-ghost" title={account.address}>
            {shortAddr(account.address)}
          </p>
        </header>

        <ResumenCuenta student={account.address} />

        <section aria-label={t.plansTitle} className="space-y-4">
          <h2 className="text-lg font-semibold text-beam">{t.plansTitle}</h2>
          {plansQ.data && plans.length === 0 && (
            <GlassPanel className="p-6">
              <p className="text-sm text-ink-2">{t.plansEmpty}</p>
              <Link
                href="/tienda"
                className={`${buttonClasses("secondary", "sm")} mt-4 inline-flex`}
              >
                {t.plansCta}
              </Link>
            </GlassPanel>
          )}
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </section>

        <section aria-label={t.details} className="space-y-3">
          <h2 className="text-lg font-semibold text-beam">{t.details}</h2>
          <DetalleCuenta title={t.guaranteeTitle}>
            {guaranteeQ.isLoading || guarantee === undefined ? (
              <div className="h-16 animate-pulse rounded-2xl bg-beam/5" />
            ) : guarantee === null ? (
              <p className="text-sm text-ink-2">{t.guaranteeEmpty}</p>
            ) : (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Monto label={t.maxPurchase} value={guarantee.maxPurchase} />
                <Monto
                  label={t.coverageToBuy}
                  value={quoteQ.data?.requiredCoverage ?? null}
                  tone="beam"
                />
                <Monto label={t.maxCoverage} value={guarantee.coverageMax} />
              </dl>
            )}
          </DetalleCuenta>
        </section>

        <InviteGuarantor student={account.address} />
      </div>
    );
  }
  // idle: sin wallet ni selección demo. resolving: detectando el rol.
  if (status === "resolving") {
    return (
      <EstadoConsulta
        testId="estudiante-resolviendo"
        tono="vacio"
        title={entry.resolving}
        body=""
        reintentar=""
      />
    );
  }
  return <PickerEntrada />;
}

function PickerEntrada() {
  const t = useT(cuentas).student;
  const shell = useT(cuentas).shell;
  const router = useRouter();
  const { demoId, selectDemo } = useAccount();

  const elegir = (id: DemoAccountId) => {
    const next = demoId === id ? null : id;
    selectDemo(next);
    if (next) router.push(DEMO_ROUTES[next]);
  };

  return (
    <div className="max-w-2xl" data-testid="estudiante-entrada">
      <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">
        {t.pickTitle}
      </h1>
      <p className="mt-3 max-w-prose text-ink-2">{t.pickBlurb}</p>

      <div className="mt-8" role="list" aria-label={t.pickDemo}>
        {DEMO_ACCOUNT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="listitem"
            data-testid={`estudiante-pick-${id}`}
            onClick={() => elegir(id)}
            className="flex w-full items-baseline justify-between gap-4 border-t border-hairline py-4 text-left last:border-b"
          >
            <span>
              <span className="block font-medium text-ink">{shell.demoOptions[id]}</span>
              <span className="mt-0.5 block text-sm text-ink-2">{t.personas[id]}</span>
            </span>
            <span aria-hidden className="shrink-0 text-ink-ghost">
              <svg viewBox="0 0 20 20" width="18" height="18">
                <path
                  d="M7 4l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <span className="text-sm text-ink-2">{t.pickWallet}</span>
        <WalletButton />
      </div>
    </div>
  );
}
