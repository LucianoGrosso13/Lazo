"use client";

// Comprador: cuenta propia (/app/estudiante, con rol student del contexto de
// cuenta). La credencial de Tier encabeza (identidad del comprador con sus
// beneficios y el progreso al próximo escalón), después accesos visuales,
// el resumen de plata, los planes con anillo de cuotas y el garante.
// Falla cerrado si el rol resuelto no es student.
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { WalletButton } from "@/components/wallet-button";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useLocale, useT } from "@/i18n/locale";
import { formatUsdc, type Micro } from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useAccount } from "./account-context";
import { AccesosComprador } from "./comprador/accesos";
import { PlanCardComprador } from "./comprador/plan-card";
import { TierCard } from "./comprador/tier-card";
import { DemoPersonaList } from "./demo-personas";
import { ModeBadge } from "./evidencia";
import { InviteGuarantor } from "./invitar-fiador";
import { DetalleCuenta, ResumenCuenta } from "./mock-account";
import { EstadoConsulta } from "./consulta";

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
      <div
        className="max-w-3xl space-y-6"
        data-testid="estudiante-cuenta"
        data-role="buyer"
      >
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">
              {t.title}
            </h1>
            <ModeBadge />
          </div>
          <p className="mt-3 text-ink-2">{t.subtitle}</p>
        </header>

        {/* Credencial de Tier: el nivel con sus beneficios y qué falta para
            el próximo. Es la identidad del comprador dentro del protocolo. */}
        <TierCard student={account.address} plans={plansQ.data} />

        <AccesosComprador />

        <ResumenCuenta student={account.address} />

        <section id="planes" aria-label={t.plansTitle} className="scroll-mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-beam">{t.plansTitle}</h2>
          {plansQ.data && plans.length === 0 && (
            <GlassPanel className="p-6">
              <p className="text-sm text-ink-2">{t.plansEmpty}</p>
              <Link
                href="/comercio"
                className={`${buttonClasses("secondary", "sm")} mt-4 inline-flex`}
              >
                {t.plansCta}
              </Link>
            </GlassPanel>
          )}
          {plans.map((p) => (
            <PlanCardComprador key={p.id} plan={p} />
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

  return (
    <div className="max-w-2xl" data-testid="estudiante-entrada">
      <h1 className="text-3xl font-semibold tracking-tight text-beam sm:text-4xl">
        {t.pickTitle}
      </h1>
      <p className="mt-3 max-w-prose text-ink-2">{t.pickBlurb}</p>

      <div className="mt-8">
        <DemoPersonaList testIdPrefix="estudiante-pick" />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <span className="text-sm text-ink-2">{t.pickWallet}</span>
        <WalletButton />
      </div>
    </div>
  );
}
