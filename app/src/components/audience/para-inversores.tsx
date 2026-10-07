"use client";

// /para-inversores: de dónde sale el rendimiento del pool, cómo se reparte
// cada compra (desglose D8), tramos, riesgos y qué es verificable. Ningún
// número de negocio está hardcodeado: salen de getConfig()/helpers y del pool
// en vivo. El objetivo se declara como supuesto del modelo; las cifras de terceros,
// "referencia".
import Link from "next/link";
import { Consulta } from "@/components/cuenta/consulta";
import { REFERENCE_FIGURES } from "@/lib/cuotas/reference-figures";
import { useProtocolConfig } from "@/components/landing/use-config";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { paraInversores } from "@/i18n/dictionaries/para-inversores";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { useLocale, useT } from "@/i18n/locale";
import {
  d8Breakdown,
  formatUsdc,
  planOptionsOf,
  quoteTermsFor,
  settlementOptionOf,
  settlementOptionsOf,
  toMicro,
  type Micro,
  type Pool,
  type ProtocolConfig,
  type QuoteTerms,
} from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import {
  AudienceHero,
  AudienceSection,
  Callout,
  Faq,
  StepList,
} from "./primitives";

/** Precio de ejemplo para calcular D8 desde la configuración del protocolo. */
const EXAMPLE_PRICE = toMicro(1000);

/**
 * Cotización del ejemplo con Tier 1 y fiador / 3 cuotas / cobro
 * inmediato: `quoteTermsFor` de `lib/cuotas/terms.ts`, la misma cuenta que
 * `quote()` sin consultar ni mutar estado del cliente — así el desglose D8
 * es idéntico en mock y en real.
 */
const exampleTerms = (config: ProtocolConfig, installments?: 3 | 6) =>
  quoteTermsFor(config, EXAMPLE_PRICE, { installments, settlement: "immediate" });

const numFmt = (locale: "es" | "en", opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", opts);

/** Datos vivos del pool: NAV, reparto junior/senior, utilización y liquidez. */
function PoolAhora({ pool }: { pool: Pool }) {
  const t = useT(paraInversores).pool;
  const { locale } = useLocale();
  const capital = pool.juniorCapital + pool.seniorCapital;
  const uso = capital > 0 ? pool.outstandingCredit / capital : 0;
  const wJunior = capital > 0 ? (pool.juniorCapital / capital) * 100 : 0;
  const usd = (m: Micro) => formatUsdc(m, locale);
  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-3">
          {t.liveTitle}
        </p>
        <Link
          href="/pool"
          className="tap inline-flex items-center gap-1 text-sm font-medium text-cyan transition-colors hover:text-beam"
        >
          {t.liveLink} →
        </Link>
      </div>
      <p className="mt-3 font-num text-2xl tabular-nums text-beam sm:text-3xl">
        {usd(pool.nav)}{" "}
        <span className="font-num text-sm text-ink-ghost">devUSDC</span>
      </p>
      <p className="mt-1 text-xs text-ink-3">{t.nav}</p>

      <div
        className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-beam/5"
        role="img"
        aria-label={`${t.junior} ${usd(pool.juniorCapital)} · ${t.senior} ${usd(pool.seniorCapital)}`}
      >
        <div className="h-full bg-violet" style={{ width: `${wJunior}%` }} />
        <div
          className="h-full bg-gradient-to-r from-cyan to-green"
          style={{ width: `${100 - wJunior}%` }}
        />
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-baseline gap-2 text-sm text-ink">
            <span aria-hidden className="size-2.5 self-center rounded-sm bg-violet" />
            {t.junior}
            <span className="ml-auto font-num tabular-nums text-beam">
              {usd(pool.juniorCapital)}
            </span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-ghost">{t.juniorHint}</p>
        </div>
        <div>
          <p className="flex items-baseline gap-2 text-sm text-ink">
            <span
              aria-hidden
              className="size-2.5 self-center rounded-sm bg-gradient-to-r from-cyan to-green"
            />
            {t.senior}
            <span className="ml-auto font-num tabular-nums text-beam">
              {usd(pool.seniorCapital)}
            </span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-ghost">{t.seniorHint}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 border-t border-hairline pt-3">
        {(
          [
            [t.uso, numFmt(locale, { style: "percent", maximumFractionDigits: 1 }).format(uso)],
            [t.credito, usd(pool.outstandingCredit)],
            [t.disponible, usd(pool.available)],
          ] as [string, string][]
        ).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="text-ink-3">{k}</dt>
            <dd className="font-num tabular-nums text-ink">
              {v}
              {k === t.uso ? "" : <span className="text-xs text-ink-ghost"> devUSDC</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-ink-ghost">{t.liveHint}</p>
    </div>
  );
}

/** El reparto D8 de la compra de ejemplo, calculado con la config vigente. */
function DesgloseD8({
  config,
  quote,
}: {
  config: ProtocolConfig;
  quote: QuoteTerms;
}) {
  const t = useT(paraInversores).compra;
  const { locale } = useLocale();
  const usd = (m: Micro) => formatUsdc(m, locale);
  const pct = (bps: number) => `${numFmt(locale, { maximumFractionDigits: 2 }).format(bps / 100)}%`;
  const d8 = d8Breakdown(config, quote);
  const feeBps = settlementOptionOf(config, "immediate")?.feeBps ?? config.feeBps;

  const rows: [string, Micro][] = [
    [t.rows.precio, quote.price],
    [t.rows.anticipo, quote.downPayment],
    [t.rows.financiado, quote.financed],
    [t.rows.comision(pct(feeBps)), d8.merchantFee],
    [t.rows.adelanto, d8.merchantAdvance],
    [t.rows.originacion(pct(config.originationBps ?? 0)), d8.origination],
    [t.rows.salida, d8.poolOutflow],
    [t.rows.principal, d8.principal],
    [t.rows.diferencia, d8.grossSpread],
    [t.rows.admin(pct(config.adminFeeAnnualBps ?? 0)), d8.adminIllustrative],
    [t.rows.resto, d8.poolRemainder],
  ];
  return (
    <GlassPanel className="mt-6 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-beam">{t.desgloseTitle}</h3>
      <dl className="mt-2 divide-y divide-beam/8">
        {rows.map(([label, v]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 py-2">
            <dt className="min-w-0 text-sm leading-relaxed text-ink-2">{label}</dt>
            <dd className="shrink-0 font-num text-sm tabular-nums text-beam">
              {usd(v)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-ink-ghost">{t.nota}</p>
    </GlassPanel>
  );
}

export function ParaInversores() {
  const t = useT(paraInversores);
  const common = useT(audienceCommon);
  const { locale } = useLocale();
  const page = common.pages.inversores;
  const config = useProtocolConfig();
  const poolQ = useCuotasQuery(["pool"], (c) => c.getPool());

  const usd = (m: Micro) => formatUsdc(m, locale);
  const pct = (bps: number) =>
    `${numFmt(locale, { maximumFractionDigits: 2 }).format(bps / 100)}%`;
  const refPct = (n: number) =>
    `~${numFmt(locale, { maximumFractionDigits: 2 }).format(n)}%`;
  const assumptions = REFERENCE_FIGURES.modelAssumptions;

  const planOptions = config ? planOptionsOf(config) : [];
  const plan6 = planOptions.find((option) => option.enabled && option.interestTotalBps > 0);
  const standardPlan = planOptions.find((option) => option.enabled && option.interestTotalBps === 0) ?? planOptions.find((option) => option.enabled);
  const quote = config ? exampleTerms(config, standardPlan?.installments) : undefined;
  const d8 = config && quote ? d8Breakdown(config, quote) : null;
  const settleOpts = config ? settlementOptionsOf(config) : [];
  // Interés y total de la opción con interés sobre la misma compra:
  // la cotización real, no una cuenta paralela.
  const terms6 = config
    ? quoteTermsFor(config, EXAMPLE_PRICE, { installments: plan6?.installments })
    : undefined;

  return (
    <div className="page-shell py-12 sm:py-16">
      <AudienceHero eyebrow={page.eyebrow} title={page.title} lede={page.lede}>
        <Link href="/pool" className={buttonClasses("primary")}>
          {t.ctas.pool}
        </Link>
        <Link href="/para-comercios" className={buttonClasses("secondary")}>
          {t.ctas.comercios}
        </Link>
      </AudienceHero>

      {/* De dónde sale el rendimiento: pool, tramos y datos en vivo */}
      <AudienceSection title={t.pool.title} intro={t.pool.intro}>
        <GlassPanel>
          <Consulta
            res={poolQ}
            pendienteTestId="inversores-pool-pendiente"
            textos={t.pool.consulta}
          >
            {(pool) => <PoolAhora pool={pool} />}
          </Consulta>
        </GlassPanel>
      </AudienceSection>

      {/* Una compra, paso a paso: el reparto D8 */}
      {config && quote && d8 && (
        <AudienceSection
          title={t.compra.title}
          intro={t.compra.intro(
            tierLabel(0),
            usd(quote.price),
            pct(config.guaranteedTiers[0].downPaymentBps),
            standardPlan?.installments ?? quote.installments.length,
          )}
        >
          <StepList
            steps={[
              {
                title: t.compra.steps.compra.title(usd(quote.price), usd(quote.downPayment)),
                body: t.compra.steps.compra.body,
              },
              {
                title: t.compra.steps.adelanto.title(
                  usd(d8.merchantAdvance),
                  usd(d8.origination),
                ),
                body: t.compra.steps.adelanto.body(usd(d8.poolOutflow)),
              },
              {
                title: t.compra.steps.cuotas.title(
                  quote.installments.length,
                  usd(quote.installments[0]),
                  usd(d8.principal),
                ),
                body: t.compra.steps.cuotas.body,
              },
              {
                title: t.compra.steps.reparto.title(usd(d8.grossSpread)),
                body: t.compra.steps.reparto.body(
                  usd(d8.adminIllustrative),
                  usd(d8.poolRemainder),
                ),
              },
            ]}
          />
          <DesgloseD8 config={config} quote={quote} />
        </AudienceSection>
      )}

      {/* Seis cuotas y cobro diferido */}
      {config && quote && (
        <AudienceSection title={t.seis.title} intro={t.seis.intro}>
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel className="p-4 sm:p-5">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-beam">
                {t.seis.planesTitle(plan6?.installments ?? 0)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                {t.seis.planesBody(
                  pct(plan6?.interestTotalBps ?? 0),
                  usd(terms6?.interest ?? 0),
                  usd(terms6?.total ?? quote.price),
                )}
              </p>
            </GlassPanel>
            <GlassPanel className="p-4 sm:p-5">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-beam">
                {t.seis.cobroTitle}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.seis.cobroBody}</p>
              <div className="mt-4 flex items-baseline justify-between gap-3 font-num text-[0.6875rem] uppercase tracking-[0.14em] text-ink-ghost">
                <span>{t.seis.comisionCol}</span>
                <span>{t.seis.netoCol}</span>
              </div>
              <dl className="divide-y divide-beam/8">
                {settleOpts.map((o) => {
                  // Comisión y neto por plazo con la misma cotización que
                  // `quote()`: plazo sin tarifa o deshabilitado → "—".
                  const q = quoteTermsFor(config, quote.price, {
                    installments: standardPlan?.installments,
                    settlement: o.id,
                  });
                  const fee = q?.merchantFee ?? null;
                  return (
                    <div
                      key={o.id}
                      className="flex items-baseline justify-between gap-3 py-2"
                    >
                      <dt className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                        {o.days === 0 ? t.seis.cobroHoy : t.seis.cobroDias(o.days)}
                      </dt>
                      <dd className="shrink-0 font-num text-sm tabular-nums text-ink">
                        {o.feeBps === null || fee === null ? "—" : pct(o.feeBps)}
                        {q && fee !== null && (
                          <>
                            <span className="text-ink-ghost"> · </span>
                            {usd(q.merchantReceives)}
                          </>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.seis.compromiso}</p>
              {settleOpts.filter((o) => o.tranches > 0).map((o) => {
                const q = quoteTermsFor(config, quote.price, { installments: standardPlan?.installments, settlement: o.id });
                return q ? (
                  <div key={`tranches-${o.id}`} className="mt-3 border-t border-hairline pt-3">
                    <p className="text-sm font-medium text-beam">{t.seis.calendario(o.days)}</p>
                    <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                      {q.payoutTranches.map((tranche) => (
                        <li key={tranche.index} className="flex justify-between gap-3 text-sm text-ink-2">
                          <span>{t.seis.tramo(tranche.index + 1, o.tranches)} · {t.seis.dia(Math.round((o.days / o.tranches) * (tranche.index + 1)))}</span>
                          <span className="font-num tabular-nums">{usd(tranche.amount)} devUSDC</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })}
            </GlassPanel>
          </div>
          <div className="mt-4">
            <Callout variant="demo">{t.seis.nota}</Callout>
          </div>
        </AudienceSection>
      )}

      {/* Riesgos y sensibilidad */}
      {config && (
        <AudienceSection title={t.riesgos.title} intro={t.riesgos.intro}>
          <ul className="grid gap-4">
            {[
              {
                title: t.riesgos.mora.title,
                body: t.riesgos.mora.body(
                  config.graceDays,
                  config.guarantorNoticeDay,
                  config.guarantorChargeDay,
                  pct(config.penaltyBps),
                ),
              },
              { title: t.riesgos.cobertura.title, body: t.riesgos.cobertura.body },
              { title: t.riesgos.liquidez.title, body: t.riesgos.liquidez.body },
            ].map((risk) => (
              <li key={risk.title} className="glass p-4 sm:p-5">
                <p className="font-medium text-beam">{risk.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{risk.body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Callout variant="supuestos" title={t.riesgos.supuestosTitle}>
              <p>{t.riesgos.supuestosIntro}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  [t.riesgos.anticipo, assumptions.downPaymentPct],
                  [t.riesgos.default, assumptions.defaultRatePct],
                  [t.riesgos.recupero, assumptions.recoveryRatePct],
                  [t.riesgos.costoCapital, assumptions.costOfCapitalAnnualPct],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-hairline py-2">
                    <dt>{label}</dt><dd className="font-num tabular-nums">{value}%</dd>
                  </div>
                ))}
              </dl>
            </Callout>
          </div>
        </AudienceSection>
      )}

      {/* Rendimiento: referencias declaradas, sin APY prometido */}
      <AudienceSection title={t.rendimiento.title} intro={t.rendimiento.intro}>
        <GlassPanel className="p-4 sm:p-5">
          <ul className="space-y-3">
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink">
                {t.rendimiento.lazo}
              </span>
              <span className="font-num text-sm tabular-nums text-green">
                {refPct(REFERENCE_FIGURES.lazoSeniorTargetYieldPct)}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink-3">
                Kamino <ReferenceTag>{t.rendimiento.referenciaTag}</ReferenceTag>
              </span>
              <span className="font-num text-sm tabular-nums text-ink-3">
                {refPct(REFERENCE_FIGURES.kaminoYieldPct)}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink-3">
                Jupiter Lend <ReferenceTag>{t.rendimiento.referenciaTag}</ReferenceTag>
              </span>
              <span className="font-num text-sm tabular-nums text-ink-3">
                {refPct(REFERENCE_FIGURES.jupiterYieldPct)}
              </span>
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink-ghost">{t.rendimiento.nota}</p>
        </GlassPanel>
      </AudienceSection>

      {/* Transparencia onchain */}
      <AudienceSection title={t.transparencia.title} intro={t.transparencia.body}>
        <p>
          <Link
            href="/pool"
            className="tap inline-flex items-center gap-1 text-sm font-medium text-cyan transition-colors hover:text-beam"
          >
            {t.transparencia.link} →
          </Link>
        </p>
      </AudienceSection>

      {/* Roadmap rotulado */}
      <AudienceSection title={t.roadmap.title}>
        <GlassPanel className="p-4 sm:p-5">
          <p className="flex items-center gap-2">
            <Chip>{t.roadmap.chip}</Chip>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">
            {t.roadmap.body}
          </p>
        </GlassPanel>
      </AudienceSection>

      {/* FAQ */}
      <AudienceSection title={t.faq.title}>
        <Faq items={t.faq.items} />
      </AudienceSection>

      {/* CTAs finales */}
      <div className="mt-14 flex flex-wrap items-center gap-3 sm:mt-20">
        <Link href="/pool" className={buttonClasses("primary")}>
          {t.ctas.pool}
        </Link>
        <Link href="/para-comercios" className={buttonClasses("secondary")}>
          {t.ctas.comercios}
        </Link>
        <Link href="/para-estudiantes" className={buttonClasses("ghost")}>
          {t.ctas.estudiantes}
        </Link>
      </div>
    </div>
  );
}
