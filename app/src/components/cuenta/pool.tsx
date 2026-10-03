"use client";

// /pool: panel público del pool — NAV, tramos junior/senior, utilización,
// liquidez y movimientos. Sin wallet. En mock todo se declara simulado y
// ningún comprobante enlaza al Explorer; en real, solo firmas verdaderas.
import { ReferenceTag } from "@/components/ui/badges";
import { BigNumber } from "@/components/ui/big-number";
import { Chip } from "@/components/ui/chip";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { poolCuenta } from "@/i18n/dictionaries/pool-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import { formatUsdc, getCuotas, type Pool, type PoolEventKind } from "@/lib/cuotas";
import { REFERENCE_FIGURES } from "@/lib/cuotas/reference-figures";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { EvidenceMark, ModeBadge } from "./evidencia";
import { Consulta, fmtFecha, fmtPct01, shortAddr } from "./consulta";

/** El estado es una marca: depósito/pago quedan grabados, el adelanto sale
 *  encendido, el recupero lo rellena la luz de atrás (fiador), la pérdida raja. */
const MARCA_EVENTO: Record<PoolEventKind, MarkState> = {
  Deposit: "etched",
  Advance: "lit",
  Repayment: "etched",
  Recovery: "refilled",
  Loss: "cracked",
};

const SIGNO_EVENTO: Record<PoolEventKind, "+" | "-"> = {
  Deposit: "+",
  Advance: "-",
  Repayment: "+",
  Recovery: "+",
  Loss: "-",
};

function BandaTramos({ pool, locale }: { pool: Pool; locale: "es" | "en" }) {
  const t = useT(poolCuenta);
  const total = pool.juniorCapital + pool.seniorCapital;
  const wJunior = total > 0 ? (pool.juniorCapital / total) * 100 : 0;
  return (
    <GlassPanel className="px-5 py-5">
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-beam/5"
        role="img"
        aria-label={`${t.tramoJunior} ${formatUsdc(pool.juniorCapital, locale)} · ${t.tramoSenior} ${formatUsdc(pool.seniorCapital, locale)}`}
      >
        {total > 0 && (
          <>
            <div className="h-full bg-violet" style={{ width: `${wJunior}%` }} />
            <div
              className="h-full bg-gradient-to-r from-cyan to-green"
              style={{ width: `${100 - wJunior}%` }}
            />
          </>
        )}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-baseline gap-2 text-sm text-ink">
            <span aria-hidden className="size-2.5 self-center rounded-sm bg-violet" />
            {t.tramoJunior}
            <span className="ml-auto font-num tabular-nums text-beam">
              {formatUsdc(pool.juniorCapital, locale)}
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-ghost">{t.tramoJuniorHint}</p>
        </div>
        <div>
          <p className="flex items-baseline gap-2 text-sm text-ink">
            <span
              aria-hidden
              className="size-2.5 self-center rounded-sm bg-gradient-to-r from-cyan to-green"
            />
            {t.tramoSenior}
            <span className="ml-auto font-num tabular-nums text-beam">
              {formatUsdc(pool.seniorCapital, locale)}
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-ghost">{t.tramoSeniorHint}</p>
        </div>
      </div>
    </GlassPanel>
  );
}

function BandaUtilizacion({ pool, locale }: { pool: Pool; locale: "es" | "en" }) {
  const t = useT(poolCuenta);
  const capital = pool.juniorCapital + pool.seniorCapital;
  const uso = capital > 0 ? pool.outstandingCredit / capital : 0;
  const filas: [string, string][] = [
    [t.creditoVigente, formatUsdc(pool.outstandingCredit, locale)],
    [t.disponible, formatUsdc(pool.available, locale)],
    [t.comisiones, formatUsdc(pool.accruedFees, locale)],
  ];
  return (
    <GlassPanel className="px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-beam">{t.utilizacion}</h2>
        <span className="font-num text-sm tabular-nums text-ink">{fmtPct01(uso, locale)}</span>
      </div>
      <div
        className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-beam/8"
        role="img"
        aria-label={`${t.utilizacion} ${fmtPct01(uso, locale)}`}
      >
        <div
          className="h-full bg-gradient-to-r from-violet to-cyan"
          style={{ width: `${Math.min(uso * 100, 100)}%` }}
        />
      </div>
      <dl className="mt-4 space-y-2">
        {filas.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-ink-3">{k}</dt>
            <dd className="font-num tabular-nums text-ink">
              {v} <span className="text-xs text-ink-ghost">devUSDC</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-ink-ghost">{t.comisionesHint}</p>
    </GlassPanel>
  );
}

function Movimientos({ pool, locale }: { pool: Pool; locale: "es" | "en" }) {
  const t = useT(poolCuenta);
  const eventos = [...pool.events].sort((a, b) => b.at - a.at);
  return (
    <GlassPanel className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.movimientosTitle}</h2>
      {eventos.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.movimientosVacio}</p>
      ) : (
        <ul className="mt-3 divide-y divide-beam/8">
          {eventos.map((e, i) => (
            <li key={`${e.signature}-${i}`} className="py-3 first:pt-2 last:pb-1">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink">
                  <StateMark state={MARCA_EVENTO[e.kind]} title={t.evento[e.kind]} />
                  <span className="truncate">{t.evento[e.kind]}</span>
                  {e.tranche && (
                    <Chip className="normal-case">
                      {e.tranche === "junior" ? t.junior : t.senior}
                    </Chip>
                  )}
                </span>
                <span
                  className={`shrink-0 font-num text-sm tabular-nums ${
                    SIGNO_EVENTO[e.kind] === "+" ? "text-green" : e.kind === "Loss" ? "text-crack" : "text-ink"
                  }`}
                >
                  {SIGNO_EVENTO[e.kind]}
                  {formatUsdc(e.amount, locale)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1 text-xs text-ink-ghost">
                <span>{fmtFecha(e.at, locale)}</span>
                {e.planId && (
                  <span className="font-num" title={e.planId}>
                    {t.plan} {shortAddr(e.planId)}
                  </span>
                )}
                <EvidenceMark evidence={{ kind: "signature", signature: e.signature }} />
                {e.receiptHash && (
                  <EvidenceMark evidence={{ kind: "receipt", hash: e.receiptHash }} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

function DatosPool({ pool }: { pool: Pool }) {
  const t = useT(poolCuenta);
  const { locale } = useLocale();
  const capital = pool.juniorCapital + pool.seniorCapital;
  return (
    <div data-testid="pool-datos" className="space-y-6">
      <GlassSlab>
        <div className="px-6 py-7 sm:px-8">
          <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
            {t.navLabel}
          </p>
          <p className="mt-3">
            <BigNumber amount={pool.nav} currency="US$" size="display" />
            <span className="ml-2 align-middle font-num text-sm text-ink-ghost">devUSDC</span>
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">{t.navHint}</p>
          <p className="mt-4 text-sm text-ink-2">
            {t.capitalTotal}:{" "}
            <span className="font-num tabular-nums text-beam">{formatUsdc(capital, locale)}</span>
          </p>
        </div>
      </GlassSlab>
      <BandaTramos pool={pool} locale={locale} />
      <BandaUtilizacion pool={pool} locale={locale} />
      <Movimientos pool={pool} locale={locale} />
    </div>
  );
}

/** /pool: panel público del pool — NAV, tramos, utilización y movimientos. */
export function PoolView() {
  const t = useT(poolCuenta);
  const pool = useCuotasQuery(["pool"], (c) => c.getPool());
  const esMock = getCuotas().mode === "mock";

  return (
    <div data-testid="pool-panel" className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-beam sm:text-3xl">
            {t.titulo}
          </h1>
          <ModeBadge />
        </div>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{t.subtitulo}</p>
        {esMock && <p className="mt-2 text-xs leading-relaxed text-ink-ghost">{t.datosSimuladosHint}</p>}
      </header>

      <Consulta
        res={pool}
        pendienteTestId="pool-pendiente"
        textos={{
          pendienteTitle: t.leerTitle,
          pendienteBody: t.leerBody,
          errorTitle: t.errorTitle,
          errorBody: t.errorBody,
          reintentar: t.reintentar,
        }}
      >
        {(p) => <DatosPool pool={p} />}
      </Consulta>

      <GlassPanel className="px-5 py-5">
        <h2 className="text-base font-semibold text-beam">{t.refsTitle}</h2>
        <ul className="mt-4 space-y-3">
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink">{t.refsObjetivo}</span>
            <span className="font-num text-sm tabular-nums text-green">
              ~{REFERENCE_FIGURES.lazoSeniorTargetYieldPct}%
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-3">
              {t.refKamino} <ReferenceTag>{t.referenciaTag}</ReferenceTag>
            </span>
            <span className="font-num text-sm tabular-nums text-ink-3">
              ~{REFERENCE_FIGURES.kaminoYieldPct}%
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-ink-3">
              {t.refJupiter} <ReferenceTag>{t.referenciaTag}</ReferenceTag>
            </span>
            <span className="font-num text-sm tabular-nums text-ink-3">
              ~{REFERENCE_FIGURES.jupiterYieldPct}%
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-ink-ghost">{t.refsBody}</p>
      </GlassPanel>

      <p className="max-w-prose text-sm leading-relaxed text-ink-2">{t.garantiaLinea}</p>
    </div>
  );
}
