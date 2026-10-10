"use client";

// Contenido de /para-comercios (ticket 10, rediseño ticket 09): hero con la
// figura de cobros en el tiempo (un carril por plazo sobre el eje 0–90 días),
// pasos con AnimatedSteps, neto grande con count-up + tarjetas por plazo,
// comparativas con ComparisonBars, garantías con íconos, destinos, FAQ en
// Accordion y cierre con el aviso de devnet. Acento cyan (data-role merchant).
// Ningún número de negocio está hardcodeado: sale de la config del protocolo
// y de quote(); las cifras de terceros son REFERENCE_FIGURES con la etiqueta
// "referencia" y sin marcas.
import Link from "next/link";
import { EstadoConsulta } from "@/components/cuenta/consulta";
import { useProtocolConfig } from "@/components/landing/use-config";
import { ReferenceTag } from "@/components/ui/badges";
import { buttonClasses } from "@/components/ui/button";
import { useInView } from "@/components/ui/use-in-view";
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
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  Accordion,
  AnimatedSteps,
  AudienceHero,
  AudienceSection,
  BigNumber,
  Callout,
  ComparisonBars,
} from "./primitives";
import styles from "./para-comercios.module.css";

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

/** "3 o 6" / "3 or 6" según el idioma. */
const joinNums = (nums: number[], locale: Locale) => {
  if (nums.length <= 1) return String(nums[0] ?? "");
  return `${nums.slice(0, -1).join(", ")} ${locale === "es" ? "o" : "or"} ${
    nums[nums.length - 1]
  }`;
};

/** Etiqueta del plazo de cobro: "Hoy" o "A {dias} días". */
const plazoLabel = (option: SettlementOption, t: Dict) =>
  option.days === 0 ? t.plazoHoy : t.plazoDias.replace("{dias}", String(option.days));

/** Posición sobre la línea de un carril: el día 0 y el último quedan adentro. */
const ejePos = (dia: number, maxDia: number) =>
  `calc(var(--edge) + (100% - var(--edge) * 2) * ${maxDia > 0 ? dia / maxDia : 0})`;

interface CobroRow {
  option: SettlementOption;
  quote: Quote | null;
}

interface Punto {
  dia: number;
  amount: Micro;
  /** Punto lleno (entra al confirmar); hueco = tramo garantizado. */
  hoy: boolean;
}

/** Los puntos de un carril: anticipo al confirmar + cada tramo en su fecha. */
function puntosDe({ option, quote }: CobroRow, secondsPerDay: number): Punto[] {
  if (!quote) return [];
  if (option.days === 0)
    return [{ dia: 0, amount: quote.merchantReceives, hoy: true }];
  return [
    { dia: 0, amount: quote.merchantAdvance, hoy: true },
    ...payoutSchedule(quote.merchantPending, option, 0, secondsPerDay).map((tr) => ({
      dia: tr.releaseAt / secondsPerDay,
      amount: tr.amount,
      hoy: false,
    })),
  ];
}

/**
 * Figura del hero: una venta partida en cobros a lo largo de 0–90 días.
 * Cada carril es un plazo de cobro con sus puntos (tamaño ∝ monto) y el neto.
 */
function CobroFigura({
  rows,
  price,
  t,
  locale,
  secondsPerDay,
}: {
  rows: CobroRow[];
  price: Micro;
  t: Dict;
  locale: Locale;
  secondsPerDay: number;
}) {
  const { ref, entered } = useInView<HTMLElement>();
  const reduced = useReducedMotion();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const maxDia = Math.max(1, ...rows.map((r) => r.option.days));
  const marcas = [...new Set(rows.map((r) => r.option.days))].sort((a, b) => a - b);
  const puntosPorFila = rows.map((r) => puntosDe(r, secondsPerDay));
  const maxPunto = Math.max(1, ...puntosPorFila.flat().map((p) => p.amount));

  return (
    <figure
      ref={ref}
      className={`glass ${styles.figure}`}
      data-entered={entered && !reduced || undefined}
    >
      <figcaption className={styles.figHead}>
        <span className={styles.figTitle}>
          {t.figTitle.replace("{precio}", `US$ ${fmt(price, 0)}`)}
        </span>
        <span className={styles.figAxisTag}>{t.figAxisDias}</span>
      </figcaption>

      {/* Regla del eje: las marcas del día caen sobre la línea de cada carril. */}
      <div className={`${styles.laneGrid} ${styles.ruler}`} aria-hidden="true">
        <span />
        <div className={styles.rulerTrack}>
          {marcas.map((dia) => (
            <span
              key={dia}
              className={styles.rulerTick}
              data-edge={dia === 0 ? "start" : dia === maxDia ? "end" : undefined}
              style={{ left: ejePos(dia, maxDia) }}
            >
              {dia === 0 ? t.figHoy : dia}
            </span>
          ))}
        </div>
        <span />
      </div>

      <ul className={styles.lanes}>
        {rows.map((row, i) => {
          const { option, quote } = row;
          const puntos = puntosPorFila[i];
          const aria = quote
            ? option.days === 0
              ? t.figLaneHoy
                  .replace("{plazo}", plazoLabel(option, t))
                  .replace("{neto}", `US$ ${fmt(quote.merchantReceives)}`)
              : t.figLanePlazo
                  .replace("{plazo}", plazoLabel(option, t))
                  .replace("{anticipo}", `US$ ${fmt(quote.merchantAdvance)}`)
                  .replace(
                    "{tramos}",
                    puntos
                      .filter((p) => !p.hoy)
                      .map((p) =>
                        t.figTramo
                          .replace("{monto}", `US$ ${fmt(p.amount)}`)
                          .replace("{dia}", String(p.dia)),
                      )
                      .join(", "),
                  )
            : plazoLabel(option, t);
          return (
            <li
              key={option.id}
              className={`${styles.laneGrid} ${styles.lane}`}
              style={{ ["--lane-delay" as string]: `${i * 90}ms` }}
            >
              <span className={styles.laneLabel}>{plazoLabel(option, t)}</span>
              <span className={styles.laneTrack} aria-hidden="true">
                <span className={styles.laneBeam} />
                {marcas
                  .filter((d) => d > 0)
                  .map((d) => (
                    <span key={d} className={styles.laneMid} style={{ left: ejePos(d, maxDia) }} />
                  ))}
                {puntos.map((p, j) => {
                  const lado = 10 + 18 * Math.sqrt(p.amount / maxPunto);
                  return (
                    <span
                      key={j}
                      className={`${styles.dot} ${p.hoy ? styles.dotNow : styles.dotTramo}`}
                      style={{ left: ejePos(p.dia, maxDia), width: lado, height: lado }}
                    />
                  );
                })}
              </span>
              <span className={styles.laneValue}>
                <span className={styles.laneAmount}>
                  {quote ? `US$ ${fmt(quote.merchantReceives)}` : "—"}
                </span>
                {option.feeBps !== null ? (
                  <small>{t.figComision.replace("{pct}", fmtBps(option.feeBps, locale))}</small>
                ) : null}
              </span>
              <span className="sr-only">{aria}</span>
            </li>
          );
        })}
      </ul>

      <p className={styles.figLegend} aria-hidden="true">
        <span>
          <i className={`${styles.legendDot} ${styles.legendNow}`} />
          {t.figLegendHoy}
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.legendTramo}`} />
          {t.figLegendTramo}
        </span>
      </p>
      <p className={styles.figCaption}>{t.figCaption}</p>
    </figure>
  );
}

/** Íconos dibujados, un solo trazo y peso, tintados con el acento del rol. */
const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const IconQr = () => (
  <svg {...ICON}>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" />
    <path d="M14 14.2h.01M17.3 14.2h.01M20.4 14.2h.01M14 17.4h.01M14 20.4h.01M17.3 17.4h.01M20.4 17.4h.01M17.3 20.4h.01M20.4 20.4h.01" />
  </svg>
);
const IconPanel = () => (
  <svg {...ICON}>
    <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
    <path d="M8.5 15.5v-3M12 15.5V8.5M15.5 15.5v-5" />
  </svg>
);
const IconTienda = () => (
  <svg {...ICON}>
    <path d="M4.8 9.6 6.2 4.8h11.6l1.4 4.8" />
    <path d="M4.8 9.6v8.9a1 1 0 0 0 1 1h12.4a1 1 0 0 0 1-1V9.6" />
    <path d="M4.8 9.6c0 1.3 1.05 2.4 2.4 2.4s2.4-1.1 2.4-2.4c0 1.3 1.05 2.4 2.4 2.4s2.4-1.1 2.4-2.4c0 1.3 1.05 2.4 2.4 2.4s2.4-1.1 2.4-2.4" />
    <path d="M9.8 19.5v-5h4.4v5" />
  </svg>
);
const IconRegistro = () => (
  <svg {...ICON}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="2.2" />
    <path d="M8.2 8.2h7.6M8.2 12h7.6M8.2 15.8h4.6" />
  </svg>
);
const IconEscudo = () => (
  <svg {...ICON}>
    <path d="M12 3.2 19 5.8v5.1c0 4.5-2.9 7.8-7 9.3-4.1-1.5-7-4.8-7-9.3V5.8z" />
    <path d="m8.8 11.6 2.2 2.2 4.2-4.4" />
  </svg>
);
const IconGota = () => (
  <svg {...ICON}>
    <path d="M12 3.6c3.1 3.6 5.8 6.6 5.8 9.7a5.8 5.8 0 1 1-11.6 0c0-3.1 2.7-6.1 5.8-9.7z" />
    <path d="M9.2 13.6a2.9 2.9 0 0 0 2.2 3.5" />
  </svg>
);
const IconFlecha = ({ className = "" }: { className?: string }) => (
  <svg {...ICON} viewBox="0 0 20 20" className={className} width="18" height="18">
    <path d="M4 10h11M11 5l5 5-5 5" />
  </svg>
);

export function ParaComercios() {
  const common = useT(audienceCommon);
  const t = useT(paraComercios);
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);

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

  const cuotasValue = planes
    .map((o) => o.installments)
    .join(locale === "es" ? " o " : " or ");

  // La figura se dibuja apenas hay config; los puntos llegan con la cotización.
  const figRows: CobroRow[] | null =
    cobroQ.data?.rows ??
    (config ? settlements.map((option) => ({ option, quote: null })) : null);
  const figPrice = cobroQ.data?.price ?? config?.guaranteedTiers[0].maxPurchase ?? 0;

  const rows = cobroQ.data?.rows ?? [];
  const inmediato = rows.find((r) => r.option.days === 0) ?? null;
  const diferidos = rows.filter((r) => r.option.days > 0);
  const mejor = diferidos.reduce<CobroRow | null>(
    (acc, r) =>
      acc === null || (r.option.feeBps ?? Infinity) < (acc.option.feeBps ?? Infinity)
        ? r
        : acc,
    null,
  );
  const feeHoyBps =
    settlements.find((o) => o.id === "immediate")?.feeBps ?? config?.feeBps ?? null;
  const pctInmediato = feeHoyBps !== null ? fmtBps(feeHoyBps, locale) : "…";

  const cftea = REFERENCE_FIGURES.mercadoPagoCfteaPct;
  const refs = REFERENCE_FIGURES;

  return (
    <div className="page-shell py-12 sm:py-16" data-role="merchant">
      {/* Hero: propuesta + figura de cobros en el tiempo */}
      <div className="grid items-center gap-9 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,30rem)] lg:gap-12">
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

        {figRows === null ? (
          <div className="glass animate-pulse px-5 py-6" role="status" aria-busy="true">
            <p className="text-sm text-ink-3">{t.figCargando}</p>
            <div className="mt-5 space-y-3.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded bg-beam/8" />
              ))}
            </div>
          </div>
        ) : (
          <CobroFigura
            rows={figRows}
            price={figPrice}
            t={t}
            locale={locale}
            secondsPerDay={config?.secondsPerDay ?? 86_400}
          />
        )}
      </div>

      {/* Pasos de una venta */}
      <AudienceSection title={t.pasosTitle}>
        <AnimatedSteps
          label={t.pasosTitle}
          steps={t.pasos.map((p) => ({
            title: p.title,
            body: p.body.replace("{cuotas}", cuotasValue || "…"),
          }))}
        />
      </AudienceSection>

      {/* Cuánto cobrás: número grande + detalle por plazo */}
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
            <div className={`glass ${styles.netoBand}`}>
              <div>
                <BigNumber
                  amount={inmediato?.quote?.merchantReceives ?? 0}
                  currency="US$"
                  size="display"
                />
                <p className={styles.netoLabel}>
                  {t.netoGrandeLabel.replace("{precio}", `US$ ${fmt(cobroQ.data.price, 0)}`)}
                </p>
              </div>
              {mejor?.quote ? (
                <p className={styles.netoNote}>
                  {t.netoGrandeNote
                    .replace("{dias}", String(mejor.option.days))
                    .replace("{neto}", `US$ ${fmt(mejor.quote.merchantReceives)}`)
                    .replace("{max}", fmtBps(feeHoyBps ?? 0, locale))
                    .replace("{min}", fmtBps(mejor.option.feeBps ?? 0, locale))}
                </p>
              ) : null}
            </div>

            <p className="mt-6 font-num text-sm text-ink-2">
              {inmediato?.quote
                ? t.cobroEjemplo
                    .replace("{precio}", `US$ ${fmt(cobroQ.data.price, 0)}`)
                    .replace("{anticipo}", `US$ ${fmt(inmediato.quote.downPayment)}`)
                    .replace("{financiado}", `US$ ${fmt(inmediato.quote.financed)}`)
                : null}
            </p>

            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map(({ option, quote }) => {
                const tramos = quote
                  ? payoutSchedule(quote.merchantPending, option, 0, config?.secondsPerDay ?? 86_400)
                  : [];
                const iguales =
                  tramos.length > 0 && tramos.every((tr) => tr.amount === tramos[0].amount);
                const detalle = !quote
                  ? "—"
                  : option.days === 0
                    ? t.cobroInmediatoTodo
                    : iguales
                      ? t.tramosResumen
                          .replace("{anticipo}", `US$ ${fmt(quote.merchantAdvance)}`)
                          .replace("{n}", String(tramos.length))
                          .replace("{monto}", `US$ ${fmt(tramos[0].amount)}`)
                      : t.tramosResumenVarios
                          .replace("{anticipo}", `US$ ${fmt(quote.merchantAdvance)}`)
                          .replace("{n}", String(tramos.length))
                          .replace("{montos}", tramos.map((tr) => `US$ ${fmt(tr.amount)}`).join(", "));
                const hoyPct = quote && quote.merchantReceives > 0
                  ? (quote.merchantAdvance / quote.merchantReceives) * 100
                  : 0;
                return (
                  <li key={option.id} className={`glass ${styles.plazoCard}`}>
                    <div className={styles.plazoHead}>
                      <p className={styles.plazoName}>{plazoLabel(option, t)}</p>
                      {option.feeBps !== null ? (
                        <p className={styles.plazoFee}>
                          {t.figComision.replace("{pct}", fmtBps(option.feeBps, locale))}
                        </p>
                      ) : null}
                    </div>
                    {quote ? (
                      <>
                        <p className={styles.plazoNeto}>
                          US$ {fmt(quote.merchantReceives)} <small>{t.netoLabel.toLowerCase()}</small>
                        </p>
                        <div className={styles.plazoSplit} aria-hidden="true">
                          <i className={styles.hoy} style={{ width: `${hoyPct}%` }} />
                          <i className={styles.tramo} style={{ width: `${100 - hoyPct}%` }} />
                        </div>
                        <p className={styles.plazoDetalle}>{detalle}</p>
                      </>
                    ) : (
                      <p className={styles.plazoNeto}>—</p>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">{t.cobroGarantia}</p>
            {planConInteres ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
                {t.cobroSeis
                  .replace("{seis}", String(planConInteres.installments))
                  .replace("{pct}", fmtBps(planConInteres.interestTotalBps, locale))
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

      {/* Comparativas: comisión del comercio y costo para el cliente */}
      <AudienceSection title={t.cmpTitle} intro={t.cmpIntro}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass p-4 sm:p-5">
            <h3 className="text-base font-medium text-beam">{t.cmpComercioTitle}</h3>
            <ComparisonBars
              className="mt-5"
              label={t.cmpComercioLabel}
              items={[
                {
                  label: t.cmpLazoHoy,
                  value: (feeHoyBps ?? 0) / 100,
                  formattedValue: feeHoyBps !== null ? fmtBps(feeHoyBps, locale) : "…",
                  winner: !mejor,
                  winnerLabel: !mejor ? t.cmpGanadorComercio : undefined,
                },
                ...(mejor
                  ? [
                      {
                        label: t.cmpLazoPlazo.replace("{dias}", String(mejor.option.days)),
                        value: (mejor.option.feeBps ?? 0) / 100,
                        formattedValue: fmtBps(mejor.option.feeBps ?? 0, locale),
                        winner: true,
                        winnerLabel: t.cmpGanadorComercio,
                      },
                    ]
                  : []),
                {
                  label: (
                    <>
                      {t.cmpPublico} <ReferenceTag />
                    </>
                  ),
                  value: refs.cuotaMipymeMerchantPct,
                  formattedValue: fmtPct(refs.cuotaMipymeMerchantPct, locale),
                  note: t.cmpPublicoNote.replace(
                    "{pct}",
                    fmtPct(refs.cuotaMipymeMerchantPct, locale),
                  ),
                },
                {
                  label: (
                    <>
                      {t.cmpBilletera} <ReferenceTag />
                    </>
                  ),
                  value: refs.mercadoPagoMerchantPct,
                  formattedValue: fmtPct(refs.mercadoPagoMerchantPct, locale),
                  note: t.cmpBilleteraNote.replace(
                    "{pct}",
                    fmtPct(refs.mercadoPagoMerchantPct, locale),
                  ),
                },
              ]}
            />
            <p className="mt-5 text-sm leading-relaxed text-ink-3">
              {t.cmpDiasNote.replace(
                "{dias}",
                String(refs.gocuotasSettlementBusinessDays),
              )}
            </p>
          </div>

          <div className="glass p-4 sm:p-5">
            <h3 className="text-base font-medium text-beam">{t.cmpClienteTitle}</h3>
            <ComparisonBars
              className="mt-5"
              label={t.cmpClienteLabel}
              items={[
                {
                  label: t.cmpLazoCuotas.replace(
                    "{n}",
                    joinNums(
                      planesSinInteres.map((o) => o.installments),
                      locale,
                    ),
                  ),
                  value: 0,
                  formattedValue: "0%",
                  winner: true,
                  winnerLabel: t.cmpGanadorCliente,
                },
                ...(planConInteres
                  ? [
                      {
                        label: t.cmpLazoCuotas.replace("{n}", String(planConInteres.installments)),
                        value: planConInteres.interestTotalBps / 100,
                        formattedValue: fmtBps(planConInteres.interestTotalBps, locale),
                      },
                    ]
                  : []),
                {
                  label: (
                    <>
                      {t.cmpCompetencia} <ReferenceTag />
                    </>
                  ),
                  value: cftea.max,
                  formattedValue: fmtPct(cftea.max, locale),
                  note: t.cmpCompetenciaNote
                    .replace("{min}", fmtPct(cftea.min, locale))
                    .replace("{max}", fmtPct(cftea.max, locale)),
                },
              ]}
            />
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-ghost">{t.cmpNote}</p>
      </AudienceSection>

      {/* Garantías: compromiso onchain, garante y liquidez */}
      <AudienceSection title={t.riesgosTitle}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: <IconRegistro />, title: t.riesgoCompromisoTitle, body: t.riesgoCompromisoBody },
            { icon: <IconEscudo />, title: t.riesgoFiadorTitle, body: t.riesgoFiadorBody },
            { icon: <IconGota />, title: t.riesgoLiquidezTitle, body: t.riesgoLiquidezBody },
          ].map((item) => (
            <li key={item.title} className={`glass ${styles.riskCard}`}>
              <span className={styles.riskIcon}>{item.icon}</span>
              <h3 className={styles.riskTitle}>{item.title}</h3>
              <p className={styles.riskBody}>{item.body}</p>
            </li>
          ))}
        </ul>
      </AudienceSection>

      {/* Destinos: dónde se vende ya */}
      <AudienceSection title={t.destinosTitle} intro={t.destinosIntro}>
        <ul className="grid gap-3">
          {[
            {
              href: "/app/comercio/mostrador",
              icon: <IconQr />,
              title: t.operarMostradorTitle,
              body: t.operarMostradorBody,
            },
            {
              href: "/app/comercio",
              icon: <IconPanel />,
              title: t.operarPanelTitle,
              body: t.operarPanelBody,
            },
            {
              href: "/comercio",
              icon: <IconTienda />,
              title: t.operarMarketplaceTitle,
              body: t.operarMarketplaceBody,
              tag: t.ejemploTag,
            },
          ].map((row) => (
            <li key={row.href}>
              <Link href={row.href} className={`glass ${styles.destRow}`}>
                <span className={styles.riskIcon}>{row.icon}</span>
                <span className="min-w-0">
                  <span className={styles.destTitle}>
                    {row.title}
                    {row.tag ? <span className={styles.destTag}>{row.tag}</span> : null}
                  </span>
                  <span className={styles.destBody}>{row.body}</span>
                </span>
                <IconFlecha className={styles.destArrow} />
              </Link>
            </li>
          ))}
        </ul>
      </AudienceSection>

      {/* FAQ en acordeón accesible */}
      <AudienceSection title={t.faqTitle}>
        <Accordion
          label={t.faqTitle}
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
              {t.ctaHeroMostrador}
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
