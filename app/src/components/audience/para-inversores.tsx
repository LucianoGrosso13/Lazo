"use client";

// /para-inversores: de dónde sale el rendimiento del pool, cómo se reparte
// cada compra (desglose D8), tramos, riesgos y qué es verificable. Ningún
// número de negocio está hardcodeado: salen de getConfig()/helpers y del pool
// en vivo. Todo rendimiento se declara ilustrativo; las cifras de terceros,
// "referencia".
import Link from "next/link";
import { Consulta } from "@/components/cuenta/consulta";
import { REFERENCE } from "@/components/landing/reference";
import { splitPurchase } from "@/components/landing/split";
import { useProtocolConfig } from "@/components/landing/use-config";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { paraInversores } from "@/i18n/dictionaries/para-inversores";
import { useLocale, useT } from "@/i18n/locale";
import {
  d8Breakdown,
  formatUsdc,
  planOptionOf,
  settlementOptionOf,
  settlementOptionsOf,
  toMicro,
  type Micro,
  type Pool,
  type ProtocolConfig,
  type Quote,
} from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import {
  AudienceHero,
  AudienceSection,
  Callout,
  Faq,
  StatCard,
  StepList,
} from "./primitives";

/** Compra de ejemplo del doc 09: la PC de US$1.000 en escalón 0. */
const EXAMPLE_PRICE = toMicro(1000);

/**
 * Cotización del ejemplo 1.000 / escalón 0 con fiador / 3 cuotas / cobro
 * inmediato. Es la misma cuenta que `quote()` (vía `splitPurchase`, como la
 * landing) sin consultar ni mutar estado del cliente, así el desglose D8 es
 * idéntico en mock y en real — los campos que `d8Breakdown` no lee se
 * completan desde la config para mantener el tipo `Quote`.
 */
function exampleQuote(config: ProtocolConfig): Quote {
  const s = splitPurchase(config, EXAMPLE_PRICE, 0);
  return {
    price: s.price,
    tier: s.tier,
    withGuarantee: true,
    downPayment: s.downPayment,
    financed: s.financed,
    installments: s.installments,
    interest: 0,
    total: s.price,
    merchantFee: s.merchantFee,
    merchantReceives: s.merchantReceives,
    merchantAdvance: s.merchantReceives,
    merchantPending: 0,
    requiredCoverage: Math.round(
      (s.financed * config.guaranteedTiers[0].guarantorCoverageBps) / 10_000,
    ),
    installmentsCount: s.installments.length,
    interestTotalBps: 0,
    settlementId: "immediate",
    settlementDays: 0,
    provisional: false,
    eligible: true,
    reasons: [],
  };
}

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
function DesgloseD8({ config, quote }: { config: ProtocolConfig; quote: Quote }) {
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
  const signed = (n: number) =>
    numFmt(locale, { signDisplay: "exceptZero", maximumFractionDigits: 2 }).format(n);
  const refPct = (n: number) =>
    `~${numFmt(locale, { maximumFractionDigits: 2 }).format(n)}%`;

  const quote = config ? exampleQuote(config) : null;
  const d8 = config && quote ? d8Breakdown(config, quote) : null;
  const plan6 = config ? planOptionOf(config, 6) : undefined;
  const settleOpts = config ? settlementOptionsOf(config) : [];
  const interest6 =
    config && quote && plan6
      ? Math.round((quote.financed * plan6.interestTotalBps) / 10_000)
      : 0;

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
            usd(quote.price),
            pct(config.guaranteedTiers[0].downPaymentBps),
            quote.installments.length,
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
                {t.seis.planesTitle}
                {plan6?.provisional ? <Chip>{common.callout.provisional}</Chip> : null}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">
                {t.seis.planesBody(
                  pct(plan6?.interestTotalBps ?? 0),
                  usd(interest6),
                  usd(quote.price + interest6),
                )}
              </p>
            </GlassPanel>
            <GlassPanel className="p-4 sm:p-5">
              <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-beam">
                {t.seis.cobroTitle}
                {settleOpts.some((o) => o.provisional) ? (
                  <Chip>{common.callout.provisional}</Chip>
                ) : null}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.seis.cobroBody}</p>
              <div className="mt-4 flex items-baseline justify-between gap-3 font-num text-[0.6875rem] uppercase tracking-[0.14em] text-ink-ghost">
                <span>{t.seis.comisionCol}</span>
                <span>{t.seis.netoCol}</span>
              </div>
              <dl className="divide-y divide-beam/8">
                {settleOpts.map((o) => {
                  const fee =
                    o.feeBps === null
                      ? null
                      : Math.round((quote.financed * o.feeBps) / 10_000);
                  return (
                    <div
                      key={o.id}
                      className="flex items-baseline justify-between gap-3 py-2"
                    >
                      <dt className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                        {o.days === 0 ? t.seis.cobroHoy : t.seis.cobroDias(o.days)}
                        {o.provisional ? (
                          <Chip>{common.callout.provisional}</Chip>
                        ) : null}
                      </dt>
                      <dd className="shrink-0 font-num text-sm tabular-nums text-ink">
                        {o.feeBps === null || fee === null ? "—" : pct(o.feeBps)}
                        {fee !== null && (
                          <>
                            <span className="text-ink-ghost"> · </span>
                            {usd(quote.price - fee)}
                          </>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
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
            <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold text-beam">
              {t.riesgos.escenariosTitle}
              <Chip>{t.riesgos.hipotesisTag}</Chip>
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
              {t.riesgos.escenariosIntro}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {t.riesgos.escenarios.map((e) => (
                <StatCard
                  key={e.id}
                  value={`${signed(e.c)} US$`}
                  label={e.name}
                  note={t.riesgos.escenarioParams(e.d, e.r, e.h)}
                />
              ))}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">
              {t.riesgos.escenariosNote}
            </p>
          </div>
        </AudienceSection>
      )}

      {/* Rendimiento: referencias declaradas, sin APY prometido */}
      <AudienceSection title={t.rendimiento.title} intro={t.rendimiento.intro}>
        <GlassPanel className="p-4 sm:p-5">
          <ul className="space-y-3">
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink">
                {t.rendimiento.lazo}{" "}
                <Chip className="normal-case">{t.rendimiento.ilustrativoTag}</Chip>
              </span>
              <span className="font-num text-sm tabular-nums text-green">
                {refPct(REFERENCE.apyPct.lazoSeniorTarget)}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink-3">
                Kamino <ReferenceTag>{t.rendimiento.referenciaTag}</ReferenceTag>
              </span>
              <span className="font-num text-sm tabular-nums text-ink-3">
                {refPct(REFERENCE.apyPct.kamino)}
              </span>
            </li>
            <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-sm text-ink-3">
                Jupiter Lend <ReferenceTag>{t.rendimiento.referenciaTag}</ReferenceTag>
              </span>
              <span className="font-num text-sm tabular-nums text-ink-3">
                {refPct(REFERENCE.apyPct.jupiter)}
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
