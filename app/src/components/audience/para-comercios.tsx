"use client";

// Contenido de /para-comercios (ticket 10): propuesta, cuánto cobra y cuándo
// (tabla por plazo desde `settlementOptionsOf` + `quote()`), cómo opera,
// comparación con referencias, marketplace, riesgos y FAQ. Ningún número de
// negocio está hardcodeado: sale de la config del protocolo y de la
// cotización; las cifras de terceros son REFERENCE_FIGURES con la etiqueta
// "referencia" y sin marcas.
import Link from "next/link";
import { EstadoConsulta } from "@/components/cuenta/consulta";
import { useProtocolConfig } from "@/components/landing/use-config";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { paraComercios } from "@/i18n/dictionaries/para-comercios";
import { useLocale, useT } from "@/i18n/locale";
import {
  DEMO_STUDENT_NEW,
  formatUsdc,
  planOptionsOf,
  payoutSchedule,
  REFERENCE_FIGURES,
  settlementAvailable,
  settlementOptionsOf,
  type Micro,
  type ProtocolConfig,
  type Quote,
  type SettlementOption,
} from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import {
  AudienceHero,
  AudienceSection,
  Callout,
  Faq,
  StatCard,
} from "./primitives";

type Locale = "es" | "en";
type Dict = (typeof paraComercios)["es"];

/** bps → porcentaje con hasta 2 decimales: 625 → "6,25%". */
const fmtBps = (bps: number, locale: Locale) =>
  `${new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(bps / 100)}%`;

/** Porcentaje ya en puntos (REFERENCE_FIGURES) con hasta 2 decimales. */
const fmtPct = (pct: number, locale: Locale) =>
  `${new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  }).format(pct)}%`;

/** "30, 60 o 90" / "30, 60 or 90" según el idioma. */
const joinNums = (nums: number[], locale: Locale) => {
  if (nums.length <= 1) return String(nums[0] ?? "");
  return `${nums.slice(0, -1).join(", ")} ${locale === "es" ? "o" : "or"} ${
    nums[nums.length - 1]
  }`;
};

/** Etiqueta del plazo de cobro: "Hoy" o "A {dias} días". */
const plazoLabel = (option: SettlementOption, t: Dict) =>
  option.days === 0 ? t.plazoHoy : t.plazoDias.replace("{dias}", String(option.days));

interface CobroRow {
  option: SettlementOption;
  quote: Quote | null;
}

/** El reparto del neto: anticipo hoy y cada tramo garantizado en su fecha. */
function BandaCobro({
  quote,
  option,
  t,
  locale,
}: {
  quote: Quote;
  option: SettlementOption;
  t: Dict;
  locale: Locale;
}) {
  const total = quote.merchantReceives;
  if (total <= 0) return null;
  const hoy = quote.merchantAdvance;
  const fecha = quote.merchantPending;
  const schedule = payoutSchedule(fecha, option, 0);
  return (
    <div className="mt-auto">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-beam/8"
        role="img"
        aria-label={t.cobroBarraAria
          .replace("{anticipo}", formatUsdc(hoy, locale))
          .replace("{tramos}", schedule.map((tramo) => formatUsdc(tramo.amount, locale)).join(", "))}
      >
        <div
          className="h-full bg-gradient-to-r from-cyan to-green"
          style={{ width: `${(hoy / total) * 100}%` }}
        />
        {fecha > 0 ? <div className="h-full bg-violet/70" style={{ width: `${(fecha / total) * 100}%` }} /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 flex-none rounded-full bg-green" />
          <span className="font-num tabular-nums">{formatUsdc(hoy, locale)}</span>
          {t.cobroHoyLabel}
        </span>
        {schedule.length > 0 ? (
          <span className="inline-flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2 flex-none rounded-full bg-violet" />{t.tramosGarantizados}</span>
            {schedule.map((tramo) => (
              <span key={tramo.index} className="font-num tabular-nums">
                {t.tramoItem.replace("{dia}", String(tramo.releaseAt / 86_400)).replace("{monto}", formatUsdc(tramo.amount, locale))}
              </span>
            ))}
          </span>
        ) : <span>{t.cobroInmediatoTodo}</span>}
      </div>
    </div>
  );
}

/** Una línea de comparación: Lazo en espectro, las alternativas en gris. */
function FilaComparacion({
  nombre,
  detalle,
  referencia,
  valorPct,
  rangoMin,
  maxPct,
  espectro,
}: {
  nombre: string;
  detalle: string;
  referencia?: boolean;
  /** % para la barra y el número de la derecha. */
  valorPct: number;
  /** Si hay rango (Lazo por plazo), el extremo inferior. */
  rangoMin?: number;
  maxPct: number;
  espectro?: boolean;
}) {
  return (
    <li>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-ink">
          {nombre}
          {referencia ? (
            <>
              {" "}
              <ReferenceTag />
            </>
          ) : null}
        </p>
        <p className="font-num text-sm tabular-nums text-beam">{detalle}</p>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-beam/8">
        {espectro && rangoMin !== undefined ? (
          <div
            className="absolute inset-y-0 rounded-full bg-gradient-to-r from-violet via-cyan to-green"
            style={{
              left: `${(rangoMin / maxPct) * 100}%`,
              width: `${((valorPct - rangoMin) / maxPct) * 100}%`,
            }}
          />
        ) : (
          <div
            className={`h-full rounded-full ${
              espectro ? "bg-gradient-to-r from-violet via-cyan to-green" : "bg-ash/50"
            }`}
            style={{ width: `${Math.min((valorPct / maxPct) * 100, 100)}%` }}
          />
        )}
      </div>
    </li>
  );
}

export function ParaComercios() {
  const common = useT(audienceCommon);
  const t = useT(paraComercios);
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const fmt = (m: Micro) => formatUsdc(m, locale);

  // La tabla de cobro: cada plazo habilitado cotiza el mismo ejemplo
  // (tope del escalón 0) con `quote()`, así el neto es el real del cliente.
  const cobroQ = useCuotasQuery(["para-comercios", "cobro"], async (c) => {
    const cfg: ProtocolConfig = await c.getConfig();
    const options = settlementOptionsOf(cfg).filter(settlementAvailable);
    const price = cfg.guaranteedTiers[0].maxPurchase;
    const rows: CobroRow[] = await Promise.all(
      options.map(async (option) => ({
        option,
        quote: await c
          .quote(price, DEMO_STUDENT_NEW, { settlement: option.id })
          .catch(() => null),
      })),
    );
    return { price, rows };
  });

  const planes = config ? planOptionsOf(config).filter((o) => o.enabled) : [];
  const planConInteres = planes.find((o) => o.interestTotalBps > 0);
  const planesSinInteres = planes.filter((o) => o.interestTotalBps === 0);
  const settlements = config
    ? settlementOptionsOf(config).filter(settlementAvailable)
    : [];
  const coberturaBps = config?.guaranteedTiers[0].guarantorCoverageBps;

  const cuotasValue = planes.map((o) => o.installments).join(locale === "es" ? " o " : " or ");
  const cuotasNote = planConInteres
    ? t.cuotasNote
        .replace("{tres}", joinNums(planesSinInteres.map((o) => o.installments), locale))
        .replace("{seis}", String(planConInteres.installments))
        .replace("{pct}", fmtBps(planConInteres.interestTotalBps, locale))
    : t.cuotasNoteBase.replace("{lista}", cuotasValue);
  const cobroNote =
    settlements.filter((o) => o.days > 0).length > 0
      ? t.cobroNote.replace(
          "{dias}",
          joinNums(
            settlements.filter((o) => o.days > 0).map((o) => o.days),
            locale,
          ),
        )
      : t.cobroNoteHoy;

  const ejemplo = cobroQ.data?.rows[0]?.quote ?? null;
  const feeBpsInmediato =
    settlements.find((o) => o.id === "immediate")?.feeBps ?? config?.feeBps ?? null;
  const pctInmediato = feeBpsInmediato !== null ? fmtBps(feeBpsInmediato, locale) : "…";

  const cftea = REFERENCE_FIGURES.mercadoPagoCfteaPct;
  const maxRef = cftea.max;
  const interesCliente = planConInteres ? planConInteres.interestTotalBps / 100 : 0;

  return (
    <div className="page-shell py-12 sm:py-16">
      <AudienceHero
        eyebrow={common.pages.comercios.eyebrow}
        title={common.pages.comercios.title}
        lede={common.pages.comercios.lede}
      >
        <Link href="/app/comercio/mostrador" className={buttonClasses("primary")}>
          {t.ctaHeroMostrador}
        </Link>
        <Link href="/comercio" className={buttonClasses("secondary")}>
          {t.ctaMarketplace}
        </Link>
      </AudienceHero>

      {/* Propuesta */}
      <AudienceSection title={t.propuestaTitle} intro={t.propuestaIntro}>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            value={planes.length ? cuotasValue : "…"}
            label={t.cuotasLabel}
            note={planes.length ? cuotasNote : undefined}
          />
          <StatCard
            value={coberturaBps !== undefined ? fmtBps(coberturaBps, locale) : "…"}
            label={t.respaldoLabel}
            note={t.respaldoNote}
          />
          <StatCard value={t.cobroValue} label={t.cobroLabel} note={cobroNote} />
        </div>
      </AudienceSection>

      {/* Cuánto cobrás y cuándo */}
      <AudienceSection title={t.cobroTitle} intro={t.cobroIntro}>
        {cobroQ.error ? (
          <EstadoConsulta
            testId="comercios-cobro-error"
            tono="error"
            title={t.cobroErrorTitle}
            body={t.cobroErrorBody}
            onRetry={() => void cobroQ.mutate()}
            reintentar={t.cobroReintentar}
          />
        ) : !cobroQ.data ? (
          <div className="glass animate-pulse px-5 py-6" role="status" aria-busy="true">
            <p className="text-sm text-ink-3">{t.cobroCargando}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-hairline p-4">
                  <div className="h-3 w-16 rounded bg-beam/10" />
                  <div className="mt-3 h-7 w-24 rounded bg-beam/10" />
                  <div className="mt-4 h-2.5 rounded-full bg-beam/5" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {ejemplo ? (
              <p className="mb-4 font-num text-sm text-ink-2">
                {t.cobroEjemplo
                  .replace("{precio}", fmt(cobroQ.data.price))
                  .replace("{anticipo}", fmt(ejemplo.downPayment))
                  .replace("{financiado}", fmt(ejemplo.financed))}
              </p>
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {cobroQ.data.rows.map(({ option, quote }) => (
                <li key={option.id} className="glass flex flex-col gap-2 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-beam">{plazoLabel(option, t)}</p>
                  </div>
                  {quote ? (
                    <>
                      <p className="font-num text-2xl tabular-nums text-beam sm:text-3xl">
                        {fmt(quote.merchantReceives)}
                        <span className="ml-1.5 text-xs font-normal text-ink-ghost">
                          {t.netoLabel.toLowerCase()}
                        </span>
                      </p>
                      <p className="text-sm leading-relaxed text-ink-3">
                        {t.comisionLabel.replace("{pct}", fmtBps(option.feeBps ?? 0, locale))}
                        {" · "}
                        <span className="font-num tabular-nums text-ink-2">
                          {fmt(quote.merchantFee)}
                        </span>
                      </p>
                      <BandaCobro quote={quote} option={option} t={t} locale={locale} />
                    </>
                  ) : (
                    <p className="font-num text-2xl text-ink-ghost">—</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">{t.cobroGarantia}</p>
            {planConInteres ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
                {t.cobroSeis
                  .replace("{seis}", String(planConInteres.installments))
                  .replace(
                    "{tres}",
                    joinNums(
                      planesSinInteres.map((o) => o.installments),
                      locale,
                    ),
                  )}
              </p>
            ) : null}
          </>
        )}
      </AudienceSection>

      {/* Cómo se opera */}
      <AudienceSection title={t.operarTitle}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass p-4 sm:p-5">
            <p className="font-medium text-beam">{t.operarOnlineTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.operarOnlineBody}</p>
            <Link href="/comercio" className={`${buttonClasses("secondary")} mt-4`}>{t.operarOnlineCta}</Link>
          </div>
          <div className="glass p-4 sm:p-5">
            <p className="flex flex-wrap items-center gap-2 font-medium text-beam">
              {t.operarMostradorTitle}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.operarMostradorBody}</p>
            <Link href="/app/comercio/mostrador" className={`${buttonClasses("primary")} mt-4`}>{t.operarMostradorCta}</Link>
          </div>
          <div className="glass p-4 sm:p-5">
            <p className="font-medium text-beam">{t.operarPanelTitle}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{t.operarPanelBody}</p>
            <Link href="/app/comercio" className={`${buttonClasses("secondary")} mt-4`}>{t.operarPanelCta}</Link>
          </div>
        </div>
      </AudienceSection>

      {/* Frente a otras formas de vender en cuotas */}
      <AudienceSection title={t.comparacionTitle} intro={t.comparacionIntro
        .replace("{tres}", joinNums(planesSinInteres.map((o) => o.installments), locale))
        .replace("{seis}", planConInteres ? String(planConInteres.installments) : "")
        .replace("{pct}", fmtBps(planConInteres?.interestTotalBps ?? 0, locale))}>
        <div className="glass p-4 sm:p-5">
          <ul className="space-y-5">
            <FilaComparacion
              nombre={t.comparacionLazo}
              detalle={t.comparacionLazoDetalle
                .replace("{tres}", String(planesSinInteres.map((o) => o.installments).join("/")))
                .replace("{seis}", planConInteres ? String(planConInteres.installments) : "")
                .replace("{pct}", fmtBps(planConInteres?.interestTotalBps ?? 0, locale))}
              valorPct={interesCliente}
              maxPct={maxRef}
              espectro
            />
            <FilaComparacion
              nombre={t.comparacionCfteaTitle}
              detalle={t.comparacionCfteaDetalle.replace("{min}", fmtPct(cftea.min, locale)).replace("{max}", fmtPct(cftea.max, locale))}
              valorPct={cftea.max}
              rangoMin={cftea.min}
              maxPct={maxRef}
              referencia
            />
          </ul>
          <p className="mt-2 text-sm leading-relaxed text-ink-ghost">{t.comparacionNote}</p>
        </div>
      </AudienceSection>

      {/* Marketplace */}
      <AudienceSection title={t.marketplaceTitle} intro={t.marketplaceBody}>
        <div className="flex flex-col items-start gap-4">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-2">{t.marketplaceExampleNote}</p>
          <Link href="/comercio" className={buttonClasses("secondary")}>
            {t.marketplaceCta}
          </Link>
        </div>
      </AudienceSection>

      {/* Riesgos */}
      <AudienceSection title={t.riesgosTitle}>
        <ul>
          {[
            { title: t.riesgoCompromisoTitle, body: t.riesgoCompromisoBody },
            { title: t.riesgoFiadorTitle, body: t.riesgoFiadorBody },
            { title: t.riesgoLiquidezTitle, body: t.riesgoLiquidezBody },
          ].map((item) => (
            <li
              key={item.title}
              className="border-t border-hairline py-5 first:border-t-0 first:pt-0 last:pb-0"
            >
              <h3 className="font-medium text-beam">{item.title}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </AudienceSection>

      {/* FAQ */}
      <AudienceSection title={t.faqTitle}>
        <Faq
          items={t.faq.map((item) => ({
            q: item.q,
            a: item.a.replace("{pctEj}", pctInmediato),
          }))}
        />
      </AudienceSection>

      {/* Cierre: CTAs + declaración devnet */}
      <AudienceSection title={t.cierreTitle} intro={t.cierreBody}>
        <div className="flex flex-col items-start gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app/comercio/mostrador" className={buttonClasses("primary")}>
              {t.operarMostradorCta}
            </Link>
            <Link href="/comercio" className={buttonClasses("secondary")}>
              {t.ctaMarketplace}
            </Link>
          </div>
          <Callout variant="devnet">{t.devnetCallout}</Callout>
        </div>
      </AudienceSection>
    </div>
  );
}
