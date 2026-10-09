"use client";

// /pool: panel público del pool — NAV, tramos junior/senior, utilización,
// liquidez y movimientos. Sin wallet. En mock todo se declara simulado y
// ningún comprobante enlaza al Explorer; en real, solo firmas verdaderas.
import { ReferenceTag } from "@/components/ui/badges";
import { BigNumber } from "@/components/ui/count-up-number";
import { CollapsibleHistory, ComparisonBars, Gauge } from "@/components/ui/visual-primitives";
import { PoolOrb } from "@/components/pool-orb";
import { poolToOrbState } from "@/components/pool-orb/state";
import styles from "@/components/pool-orb/pool-orb.module.css";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { poolCuenta } from "@/i18n/dictionaries/pool-cuenta";
import { useLocale, useT } from "@/i18n/locale";
import { formatUsdc, type Pool, type PoolEventKind } from "@/lib/cuotas";
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
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.tramoJuniorHint}</p>
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
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.tramoSeniorHint}</p>
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
    <section className={styles.utilization}>
      <Gauge value={uso * 100} label={t.utilizacion} valueLabel={fmtPct01(uso, locale)} />
      <div>
        <dl className="space-y-3">
          {filas.map(([k, v]) => (
            <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <dt className="text-ink-2">{k}</dt>
              <dd className="font-num tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.comisionesHint}</p>
      </div>
    </section>
  );
}

function Movimientos({ pool, locale }: { pool: Pool; locale: "es" | "en" }) {
  const t = useT(poolCuenta);
  const eventos = [...pool.events].sort((a, b) => b.at - a.at);
  const items = eventos.map((e, i) => (
    <div key={`${e.signature}-${i}`} data-testid="pool-event" className="py-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
          <StateMark state={MARCA_EVENTO[e.kind]} title={t.evento[e.kind]} />
          {t.evento[e.kind]}
          {e.tranche && <Chip className="normal-case">{e.tranche === "junior" ? t.junior : t.senior}</Chip>}
        </span>
        <span className={`font-num text-sm tabular-nums ${SIGNO_EVENTO[e.kind] === "+" ? "text-accent" : e.kind === "Loss" ? "text-crack" : "text-ink"}`}>
          {SIGNO_EVENTO[e.kind]}{formatUsdc(e.amount, locale)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
        <span>{fmtFecha(e.at, locale)}</span>
        {e.planId && <span className="font-num" title={e.planId}>{t.plan} {shortAddr(e.planId)}</span>}
        <EvidenceMark evidence={{ kind: "signature", signature: e.signature }} />
        {e.receiptHash && <EvidenceMark evidence={{ kind: "receipt", hash: e.receiptHash }} />}
      </div>
    </div>
  ));
  return <section className={styles.history} data-testid="pool-history">
    <h2>{t.movimientosTitle}</h2>
    <CollapsibleHistory items={items} label={t.movimientosTitle}
      expandLabel={`${t.verTodos} (${items.length})`} collapseLabel={t.verMenos}
      empty={<p className="text-sm text-ink-2">{t.movimientosVacio}</p>} />
  </section>;
}

function DatosPool({ pool }: { pool: Pool }) {
  const t = useT(poolCuenta);
  const { locale } = useLocale();
  const capital = pool.juniorCapital + pool.seniorCapital;
  const orb = poolToOrbState(pool);
  return (
    <div data-testid="pool-datos" className="space-y-6">
      <section className={styles.hero}>
        <div className={styles.visual}>
          <div className={styles.yield}>
            <div className={styles.yieldNumber}>
              <span aria-hidden="true">~</span>
              <BigNumber amount={REFERENCE_FIGURES.lazoSeniorTargetYieldPct * 1_000_000} currency="none" size="display" suffix="%" decimals={0} />
              <span>{t.anual}</span>
            </div>
            <p>{t.yieldHeadline}</p>
            <p><ReferenceTag>{t.objetivoTag}</ReferenceTag> {t.yieldTarget}</p>
          </div>
          <PoolOrb state={orb} />
          <dl className={styles.legend}>
            <div><dt>{t.orbDisponible}</dt><dd>{fmtPct01(orb.disponibleRatio, locale)}</dd></div>
            <div><dt>{t.orbPrestado}</dt><dd>{fmtPct01(orb.prestadoRatio, locale)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-ink-2">{t.orbHint}</p>
        </div>
        <div className={styles.summary}>
          <h2>{t.navLabel}</h2>
          <div className="my-3">
            <BigNumber amount={pool.nav} size="lg" className="sm:text-figure" />
          </div>
          <p>{t.navHint}</p>
          <dl>
            <div><dt>{t.capitalTotal}</dt><dd className="font-num">{formatUsdc(capital, locale, 0)}</dd></div>
            <div><dt>{t.disponible}</dt><dd className="font-num text-accent">{formatUsdc(pool.available, locale, 0)}</dd></div>
          </dl>
          <p className="mt-3">{t.unitLabel}</p>
        </div>
      </section>
      <BandaTramos pool={pool} locale={locale} />
      <div className={styles.details}>
        <div><BandaUtilizacion pool={pool} locale={locale} /><Movimientos pool={pool} locale={locale} /></div>
        <Referencias />
      </div>
    </div>
  );
}

function Referencias() {
  const t = useT(poolCuenta);
  const { locale } = useLocale();
  const percentage = (value: number) => `~${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
  return <section className={styles.references}>
    <h2>{t.refsTitle}</h2>
    <ComparisonBars label={t.refsTitle} items={[
      { label: t.refLazo, value: REFERENCE_FIGURES.lazoSeniorTargetYieldPct, formattedValue: percentage(REFERENCE_FIGURES.lazoSeniorTargetYieldPct), note: t.refsObjetivo },
      { label: t.refKamino, value: REFERENCE_FIGURES.kaminoYieldPct, formattedValue: percentage(REFERENCE_FIGURES.kaminoYieldPct), note: <ReferenceTag>{t.referenciaTag}</ReferenceTag> },
      { label: t.refJupiter, value: REFERENCE_FIGURES.jupiterYieldPct, formattedValue: percentage(REFERENCE_FIGURES.jupiterYieldPct), note: <ReferenceTag>{t.referenciaTag}</ReferenceTag> },
    ]} />
    <p className={styles.referenceBody}>{t.refsBody}</p>
  </section>;
}

/** /pool: panel público del pool — NAV, tramos, utilización y movimientos. */
export function PoolView() {
  const t = useT(poolCuenta);
  const pool = useCuotasQuery(["pool"], (c) => c.getPool());

  return (
    <div data-testid="pool-panel" data-role="pool" className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-beam sm:text-3xl">
            {t.titulo}
          </h1>
          <ModeBadge />
        </div>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-2">{t.subtitulo}</p>
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

      <p className="max-w-prose text-sm leading-relaxed text-ink-2">{t.garantiaLinea}</p>
    </div>
  );
}
