"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import {
  DEMO_STUDENT_NEW,
  formatUsdc,
  planOptionsOf,
  quoteTermsFor,
  settlementOptionsOf,
  toMicro,
  type Micro,
  type Quote,
  type TierIndex,
} from "@/lib/cuotas";
import {
  featuredMerchants,
  getCategory,
  type CategoryId,
  type DemoMerchant,
} from "@/lib/merchants";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { landingSections } from "@/i18n/dictionaries/landing-sections";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { useLocale, useT, type Locale } from "@/i18n/locale";
import { ChangingNumber, MotionLink, SPECTRUM } from "./hero";
import { REFERENCE } from "./reference";
import { cfteaTotalCost, splitPurchase } from "./split";
import { AnimatedSteps, ComparisonBars, type ComparisonBar } from "@/components/ui/visual-primitives";
import { BigNumber } from "@/components/ui/count-up-number";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";
import { QuienesSomos } from "./quienes-somos";
import { Probalo } from "./probalo";

const EXAMPLE_PRICE = toMicro(1000);
const TIERS: TierIndex[] = [0, 1, 2, 3];
/** Decimales justos para un porcentaje grande: 0%, 4,5%, 5,25%. */
const decimalsOf = (v: number) => (Number.isInteger(v) ? 0 : Number.isInteger(v * 10) ? 1 : 2);

/** Matiz por categoría del directorio (misma paleta del mundo Prisma). */
const CATEGORY_HUE: Record<CategoryId, string> = {
  electronics: "#9945FF",
  peripherals: "#6C63FF",
  books: "#00C2FF",
  tools: "#19FB9B",
  courses: "#FFB36B",
  service: "#FF6B8B",
};

function TierIndicator() {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? <span className={styles.tierIndicator} aria-hidden="true" /> : (
    <motion.span className={styles.tierIndicator} aria-hidden="true" layoutId="ladder-active-tier" transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} />
  );
}

export function LandingSections() {
  return (
    <div className={`${styles.landing}`}>
      <Audiences />
      <Installments />
      <Tiers />
      <Guarantor />
      <Merchants />
      <Comparison />
      <Benefits />
      <Roadmap />
      <Honest />
      <Probalo />
      <QuienesSomos />
      <Close />
    </div>
  );
}

function Audiences() {
  const t = useT(landingSections).audiences;
  const a = useT(audienceCommon);
  const reduceMotion = useReducedMotion();
  const cards = [
    { href: "/para-estudiantes", name: a.pages.estudiantes.nav, ...t.cards.estudiantes, band: SPECTRUM[0] },
    { href: "/para-comercios", name: a.pages.comercios.nav, ...t.cards.comercios, band: SPECTRUM[2] },
    { href: "/para-inversores", name: a.pages.inversores.nav, ...t.cards.inversores, band: SPECTRUM[3] },
  ];

  return (
    <section id="how" className={styles.section} aria-labelledby="audiences-title">
      <div className={styles.sectionHead}>
        <h2 id="audiences-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.audienceGrid}>
        {cards.map((card) => (
          <MotionLink
            key={card.href}
            href={card.href}
            className={styles.audienceCard}
            style={{ ["--band" as string]: card.band }}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            whileTap={reduceMotion ? undefined : { y: -1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.audienceBeam} aria-hidden />
            <span className={styles.audienceName}>{card.name}</span>
            <span className={styles.audienceBlurb}>{card.blurb}</span>
            <span className={styles.audienceCta}>
              {card.cta}
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
                <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </MotionLink>
        ))}
      </div>
    </section>
  );
}

function Installments() {
  const t = useT(landingSections).installments;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const options = config ? planOptionsOf(config).filter((o) => o.enabled) : [];
  // Ejemplo con la cotización real para quien empieza en Tier 1.
  const key = options.map((o) => o.installments).join("-");
  const quotesQ = useCuotasQuery(
    options.length > 0 ? ["landing-plan-example", key] : null,
    async (c) => {
      const quotes = await Promise.all(
        options.map((o) =>
          c.quote(EXAMPLE_PRICE, DEMO_STUDENT_NEW, { installments: o.installments }),
        ),
      );
      return Object.fromEntries(options.map((o, i) => [o.installments, quotes[i]]));
    },
  );
  if (!config || options.length === 0) return null;
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const nf = (v: number, d = 2) =>
    new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: d }).format(v);
  const quotes = (quotesQ.data ?? {}) as Record<number, Quote>;

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="installments-title">
      <div className={styles.sectionHead}>
        <h2 id="installments-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.planGrid} role="list">
        {options.map((o, i) => {
          const q = quotes[o.installments];
          return (
            <div key={o.installments} role="listitem" className={styles.planCard} style={{ ["--band" as string]: SPECTRUM[(i + 1) % SPECTRUM.length] }}>
              <div className={styles.planHead}>
                <span className={styles.planCount}>
                  {o.installments}
                  <span className={styles.planUnit}>{t.unit(o.installments)}</span>
                </span>
              </div>
              <p className={styles.planInterest}>
                {o.interestTotalBps === 0
                  ? t.interestFree
                  : t.interestTotal(nf(o.interestTotalBps / 100))}
              </p>
              <p className={styles.planExample}>{t.example(fmt(EXAMPLE_PRICE, 0), tierLabel(0))}</p>
              {o.minPrice > 0 ? <p className={styles.planExample}>{t.minPriceNote(fmt(o.minPrice, 0))}</p> : null}
              <dl className={styles.planRows}>
                <div className={styles.planRow}>
                  <dt>{t.down}</dt>
                  <dd>{q ? `US$ ${fmt(q.downPayment, 0)}` : "···"}</dd>
                </div>
                <div className={styles.planRow}>
                  <dt>{t.installments}</dt>
                  <dd>{q ? t.each(q.installmentsCount, fmt(q.installments[0])) : "···"}</dd>
                </div>
                <div className={styles.planRow}>
                  <dt>{t.interest}</dt>
                  <dd>{q ? `US$ ${fmt(q.interest)}` : "···"}</dd>
                </div>
                <div className={styles.planRow} data-total>
                  <dt>{t.total}</dt>
                  <dd>{q ? `US$ ${fmt(q.total, 0)}` : "···"}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
      <p className={styles.planFoot}>{t.footnote}</p>
    </section>
  );
}

function Tiers() {
  const t = useT(landingSections).tiers;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const [active, setActive] = useState<TierIndex>(0);
  if (!config) return null;
  const pct = (bps: number) => `${bps / 100}%`;
  const ex = splitPurchase(config, EXAMPLE_PRICE, active);

  return (
    <section className={styles.section} aria-labelledby="tiers-title">
      <div className={styles.sectionHead}>
        <h2 id="tiers-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.ladder} role="radiogroup" aria-label={t.title}>
        {TIERS.map((n) => {
          const tier = config.guaranteedTiers[n];
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active === n}
              className={styles.step}
              style={{ ["--rise" as string]: n, ["--band" as string]: SPECTRUM[n] }}
              onClick={() => setActive(n)}
              onMouseEnter={() => setActive(n)}
              onFocus={() => setActive(n)}
            >
              {active === n ? <TierIndicator /> : null}
              <span className={styles.stepTier}>{t.tier(n)}</span>
              <span className={styles.stepBig}>{pct(tier.downPaymentBps)}</span>
              <span className={styles.stepKey}>{t.down}</span>
              <span className={styles.stepFacts}>
                <span>
                  {t.cap} <b>US$ {formatUsdc(tier.maxPurchase, locale, 0)}</b>
                </span>
                <span>
                  {t.coverage} <b>{t.coverageValue(pct(tier.guarantorCoverageBps))}</b>
                </span>
              </span>
              {n === 0 ? <span className={styles.stepFlag}>{t.start}</span> : null}
              {tier.downPaymentBps === 0 ? <span className={styles.stepFlag}>{t.top}</span> : null}
            </button>
          );
        })}
      </div>
      <p className={styles.ladderExample} aria-live="polite">
        <ChangingNumber value={t.example(formatUsdc(EXAMPLE_PRICE, locale, 0), formatUsdc(ex.downPayment, locale))} />
      </p>
      <div className={styles.tierRules}>
        <h3 className={styles.h3}>{t.rulesTitle}</h3>
        <p className={styles.sectionLede}>{t.rulesSubtitle}</p>
        <dl className={styles.tierRulesList}>
          <div><dt>{t.ruleUp.title}</dt><dd>{t.ruleUp.desc(formatUsdc(config.minFinancedToCount, locale, 0), config.graceDays)}</dd></div>
          <div><dt>{t.ruleNeutral.title}</dt><dd>{t.ruleNeutral.desc(config.graceDays, config.guarantorChargeDay)}</dd></div>
          <div><dt>{t.ruleDown.title}</dt><dd>{t.ruleDown.desc(config.guarantorChargeDay)}</dd></div>
          <div><dt>{t.ruleGuarantor.title}</dt><dd>{t.ruleGuarantor.desc}</dd></div>
        </dl>
      </div>
    </section>
  );
}

const MARK_STEP_MS = 2500;

type Mark = { day: number; kind: string; label: string; what: string; who: string; dayLabel?: string };

/**
 * Línea de mora que avanza sola: un hito cada MARK_STEP_MS mientras está en
 * pantalla. Hover, foco o toque en un hito la detienen; con reduced-motion no
 * arranca y quedan visibles todos los hitos. Los días salen de la config.
 */
function useAutoAdvance(count: number, running: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!running || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), MARK_STEP_MS);
    return () => window.clearInterval(id);
  }, [running, count]);
  return [index, setIndex] as const;
}

/** True mientras el elemento está en pantalla (no se desconecta: pausa el loop fuera de vista). */
function useOnScreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function Guarantor() {
  const t = useT(landingSections).guarantor;
  const config = useProtocolConfig();
  if (!config) return null;
  const end = config.guarantorChargeDay;
  const penalty = `${config.penaltyBps / 100}%`;
  const marks: Mark[] = [
    { day: 0, kind: "day0", label: t.marks.day0.label, what: t.marks.day0.what, who: t.marks.day0.who },
    { day: 0, kind: "due", label: t.marks.due.label, what: t.marks.due.what, who: t.marks.due.who },
    { day: 1, dayLabel: t.days(1, config.graceDays), kind: "grace", label: t.marks.grace.label(config.graceDays), what: t.marks.grace.what, who: t.marks.grace.who },
    { day: config.guarantorNoticeDay, kind: "notice", label: t.marks.notice.label(config.guarantorNoticeDay), what: t.marks.notice.what, who: t.marks.notice.who },
    { day: config.graceDays + 1, kind: "penalty", label: t.marks.penalty.label(config.graceDays + 1, penalty), what: t.marks.penalty.what(penalty), who: t.marks.penalty.who },
    { day: end, kind: "charge", label: t.marks.charge.label(end), what: t.marks.charge.what, who: t.marks.charge.who },
  ];
  // Orden estable: los dos hitos del día 0 conservan su orden de arriba.
  const sorted = marks.map((m, i) => ({ m, i })).sort((a, b) => a.m.day - b.m.day || a.i - b.i).map(({ m }) => m);

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="guarantor-title" data-role="buyer">
      <div className={styles.guarantorHead}>
        <h2 id="guarantor-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede(config.guarantorChargeDay)}</p>
      </div>
      <div className={styles.guarantorSteps}>
        <AnimatedSteps label={t.stepsLabel} steps={t.steps.map((s) => ({ title: s.t, body: s.d }))} />
      </div>
      <MoraTimeline marks={sorted} end={end} graceDays={config.graceDays} />
    </section>
  );
}

function MoraTimeline({ marks, end, graceDays }: { marks: Mark[]; end: number; graceDays: number }) {
  const t = useT(landingSections).guarantor;
  const reduceMotion = useReducedMotion();
  const { ref, visible } = useOnScreen<HTMLDivElement>();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const running = visible && !reduceMotion && !hovered && !focused && !stopped;
  const [index, setIndex] = useAutoAdvance(marks.length, running);
  const active = marks[index] ?? marks[0];
  const at = (day: number) => `${(day / end) * 100}%`;
  const select = (i: number) => {
    setIndex(i);
    setStopped(true);
  };

  return (
    <div ref={ref} className={styles.ruler} data-running={running || undefined}>
      <div className={styles.rulerHead}>
        <div>
          <p className={styles.rulerTitle}>{t.rulerTitle}</p>
          <p className={styles.rulerFoot}>{t.rulerSubtitle}</p>
        </div>
        {reduceMotion ? null : (
          <button
            type="button"
            className={styles.rulerToggle}
            aria-label={stopped ? t.playLabel : t.pauseLabel}
            onClick={() => setStopped(!stopped)}
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              {stopped ? <path d="M4 2.5v11l9-5.5z" fill="currentColor" /> : <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />}
            </svg>
            <span>{stopped ? t.play : t.pause}</span>
          </button>
        )}
      </div>
      <div className={styles.timelineLayout}>
        <div className={styles.timelineTrack} data-grace={t.marks.grace.label(graceDays)} aria-hidden="true">
          <span className={styles.timelineGrace} style={{ width: at(graceDays) }} />
          <span className={styles.timelineProgress} style={{ transform: `scaleX(${active.day / end})` }} />
          <span className={styles.timelineDot} data-kind={active.kind} style={{ left: at(active.day) }} />
          {Array.from({ length: end + 1 }, (_, d) => (
            <span key={d} className={styles.tick} style={{ left: at(d) }} data-major={marks.some((m) => m.day === d) || undefined} />
          ))}
        </div>
        <div
          className={styles.timelineEvents}
          aria-label={t.rulerTitle}
          role="group"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
        >
          {marks.map((m, i) => (
            <button
              key={m.kind}
              type="button"
              data-kind={m.kind}
              data-active={i === index ? "true" : undefined}
              data-past={i < index || undefined}
              className={styles.timelineEvent}
              aria-pressed={i === index}
              onClick={() => select(i)}
              onFocus={() => setIndex(i)}
            >
              <span className={styles.markDay}>{m.dayLabel ?? t.day(m.day)}</span>
              <span className={styles.markLabel}>{m.label}</span>
              {i === index && running ? <span key={`dwell-${index}`} className={styles.markDwell} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.timelineDetail} data-kind={active.kind} aria-live={running ? "off" : "polite"}>
        <div key={active.kind} className={styles.timelineDetailBody}>
          <span className={styles.timelinePosition}>{t.position(index + 1, marks.length)}</span>
          <p className={styles.timelineSelected}>{active.label}</p>
          <p className={styles.timelineWhat}>{active.what}</p>
          <p className={styles.rulerFoot}>{active.who}</p>
        </div>
      </div>
    </div>
  );
}

function Merchants() {
  const t = useT(landingSections).merchants;
  const { locale } = useLocale();
  const featured = featuredMerchants();

  return (
    <section className={styles.section} aria-labelledby="merchants-title">
      <div className={styles.sectionHead}>
        <h2 id="merchants-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.merchantGrid} role="list">
        {featured.map((m) => (
          <MerchantCard key={m.address} merchant={m} locale={locale} productsLabel={t.products(m.products.length)} />
        ))}
      </div>
      <div className={styles.merchantFoot}>
        <MotionLink href="/comercio" className={styles.seeAll}>
          {t.seeAll}
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden>
            <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </MotionLink>
        <p className={styles.merchantNote}>{t.footnote}</p>
      </div>
    </section>
  );
}

function MerchantCard({
  merchant: m,
  locale,
  productsLabel,
}: {
  merchant: DemoMerchant;
  locale: Locale;
  productsLabel: string;
}) {
  const reduceMotion = useReducedMotion();
  const [imgFailed, setImgFailed] = useState(false);
  const category = getCategory(m.category);
  const photo = m.products[0]?.image;

  return (
    <MotionLink
      href={`/comercio/${m.address}`}
      role="listitem"
      className={styles.merchantCard}
      style={{ ["--band" as string]: CATEGORY_HUE[m.category] }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      whileTap={reduceMotion ? undefined : { y: -1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className={styles.merchantMedia} aria-hidden>
        <span className={styles.merchantMonogram}>{m.name.slice(0, 1)}</span>
        {photo && !imgFailed ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(min-width: 1100px) 22rem, (min-width: 640px) 44vw, 88vw"
            className={styles.merchantPhoto}
            onError={() => setImgFailed(true)}
          />
        ) : null}
      </span>
      <span className={styles.merchantBody}>
        <span className={styles.merchantName}>{m.name}</span>
        <span className={styles.merchantMeta}>
          {category?.label[locale]} · {m.city}
        </span>
        <span className={styles.merchantCount}>{productsLabel}</span>
      </span>
    </MotionLink>
  );
}

function Benefits() {
  const s = useT(landingSections);
  const t = s.benefits;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  if (!config) return null;
  const nf = (v: number, d = 2) =>
    new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: d }).format(v);
  const pct = (v: number) => t.pct(nf(v));
  const ref = <small className={styles.refTag}>{t.reference}</small>;
  const fees = settlementOptionsOf(config)
    .filter((o) => o.enabled && o.feeBps !== null)
    .map((o) => ({ days: o.days, pct: (o.feeBps ?? 0) / 100 }));
  const lowestFee = Math.min(...fees.map((f) => f.pct));
  const feeRange = fees.length > 0 ? { min: lowestFee, max: Math.max(...fees.map((f) => f.pct)) } : null;
  const merchantBars: ComparisonBar[] = [
    ...fees.map((f) => ({
      label: t.merchant.settle(f.days),
      value: f.pct,
      formattedValue: pct(f.pct),
      winner: f.pct === lowestFee,
      winnerLabel: t.merchant.winnerLabel,
    })),
    { label: <>{t.merchant.countertop}{ref}</>, value: REFERENCE.merchantFeePct.countertop, formattedValue: pct(REFERENCE.merchantFeePct.countertop) },
    { label: <>{t.merchant.wallets}{ref}</>, value: REFERENCE.merchantFeePct.wallets, formattedValue: pct(REFERENCE.merchantFeePct.wallets) },
  ];
  const apy = REFERENCE.apyPct;
  const poolBars: ComparisonBar[] = [
    { label: <>{t.pool.lazo}{ref}</>, value: apy.lazoSeniorTarget, formattedValue: pct(apy.lazoSeniorTarget), winner: true, winnerLabel: t.pool.winnerLabel },
    { label: <>{t.pool.kamino}{ref}</>, value: apy.kamino, formattedValue: pct(apy.kamino) },
    { label: <>{t.pool.jupiter}{ref}</>, value: apy.jupiter, formattedValue: pct(apy.jupiter) },
  ];
  const a = REFERENCE.modelAssumptions;
  const assumptions = [
    { key: "downPayment", value: a.downPaymentPct, ...t.assumptions.downPayment },
    { key: "defaultRate", value: a.defaultRatePct, ...t.assumptions.defaultRate },
    { key: "recoveryRate", value: a.recoveryRatePct, ...t.assumptions.recoveryRate },
    { key: "capitalCost", value: a.costOfCapitalAnnualPct, ...t.assumptions.capitalCost },
  ];

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="benefits-title">
      <div className={styles.sectionHead}>
        <h2 id="benefits-title" className={styles.h2}>{t.title}</h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.economicsPanels}>
        <article className={styles.economicsPanel} data-role="merchant">
          <p className={styles.panelKicker}>{t.merchant.who}</p>
          <h3 className={styles.panelTitle}>{t.merchant.headline}</h3>
          {feeRange ? (
            <p className={styles.panelFigure}>
              <BigNumber amount={toMicro(feeRange.min)} currency="none" decimals={decimalsOf(feeRange.min)} size="lg" className={styles.panelNum} />
              <span className={styles.panelDash} aria-hidden="true">–</span>
              <BigNumber amount={toMicro(feeRange.max)} currency="none" decimals={decimalsOf(feeRange.max)} suffix="%" size="lg" className={styles.panelNum} />
            </p>
          ) : null}
          <ComparisonBars label={t.merchant.barsLabel} items={merchantBars} />
          <p className={styles.rulerFoot}>{t.merchant.detail}</p>
        </article>
        <article className={styles.economicsPanel} data-role="pool">
          <p className={styles.panelKicker}>{t.pool.who}</p>
          <h3 className={styles.panelTitle}>{t.pool.headline}</h3>
          <p className={styles.panelFigure}>
            <span className={styles.panelApprox} aria-hidden="true">~</span>
            <BigNumber amount={toMicro(apy.lazoSeniorTarget)} currency="none" decimals={decimalsOf(apy.lazoSeniorTarget)} suffix="%" size="lg" className={styles.panelNum} />
          </p>
          <ComparisonBars label={t.pool.barsLabel} items={poolBars} />
          <p className={styles.rulerFoot}>{t.pool.detail}</p>
        </article>
      </div>
      <div className={styles.assumptions}>
        <h3 className={styles.h3}>{t.assumptionsTitle}</h3>
        <p className={styles.rulerFoot}>{t.assumptionsSubtitle}</p>
        <dl className={styles.assumptionCards}>
          {assumptions.map((item) => (
            <div key={item.key} className={styles.assumptionCard}>
              <dt>{item.label}</dt>
              <dd className={styles.assumptionValue}>
                <BigNumber amount={toMicro(item.value)} currency="none" decimals={decimalsOf(item.value)} suffix={item.unit ? `% ${item.unit}` : "%"} size="lg" className={styles.assumptionNum} />
              </dd>
              <dd className={styles.assumptionDesc}>{item.desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Comparison() {
  const t = useT(landingSections).comparison;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  if (!config) return null;
  const nf = (value: number, digits = 2) => new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: digits }).format(value);
  const fmt = (micro: Micro, digits = 2) => formatUsdc(micro, locale, digits);
  const three = quoteTermsFor(config, EXAMPLE_PRICE, { installments: 3 });
  const six = quoteTermsFor(config, EXAMPLE_PRICE, { installments: 6 });
  const base = three ?? six;
  if (!base) return null;
  const { downPayment, financed } = base;
  const range = REFERENCE.cfteaRangePct;
  const competitionInstallments = three?.installments.length ?? base.installments.length;
  const competitionCost = (cfteaPct: number) => cfteaTotalCost({ downPayment, financed, cfteaPct, installments: competitionInstallments });
  const ref = <small className={styles.refTag}>{t.reference}</small>;
  const bars: ComparisonBar[] = [];
  if (three) bars.push({ label: t.lazo3.who, value: three.total, formattedValue: `US$ ${fmt(three.total, 0)}`, winner: true, winnerLabel: t.winnerLabel, note: t.lazo3.terms(fmt(downPayment, 0), three.installments.length, fmt(three.installments[0])) });
  if (six) bars.push({ label: t.lazo6.who(nf(six.interestTotalBps / 100)), value: six.total, formattedValue: `US$ ${fmt(six.total, 0)}`, winner: !three, winnerLabel: t.winnerLabel, note: t.lazo6.terms(fmt(downPayment, 0), six.installments.length, fmt(six.installments[0])) });
  for (const cftea of [range.min, range.max]) {
    const cost = competitionCost(cftea);
    bars.push({ label: <>{t.competition.who(nf(cftea, 0))}{ref}</>, value: cost, formattedValue: `US$ ${fmt(cost, 0)}`, note: t.competition.terms(competitionInstallments) });
  }

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="comparison-title" data-role="buyer">
      <div className={styles.sectionHead}>
        <h2 id="comparison-title" className={styles.h2}>{t.title}</h2>
        <p className={styles.sectionLede}>{t.lede(fmt(EXAMPLE_PRICE, 0), fmt(downPayment, 0), fmt(financed, 0))}</p>
      </div>
      <div className={styles.rateStrip}>
        {three ? (
          <div className={styles.rateItem} data-lazo>
            <span className={styles.rateWho}>{t.rates.lazo3}</span>
            <BigNumber amount={toMicro(three.interestTotalBps / 100)} currency="none" decimals={decimalsOf(three.interestTotalBps / 100)} suffix="%" size="display" className={styles.rateNum} />
            <span className={styles.rateCaption}>{t.rates.lazoCaption}</span>
          </div>
        ) : null}
        {six ? (
          <div className={styles.rateItem} data-lazo>
            <span className={styles.rateWho}>{t.rates.lazo6}</span>
            <BigNumber amount={toMicro(six.interestTotalBps / 100)} currency="none" decimals={decimalsOf(six.interestTotalBps / 100)} suffix="%" size="display" className={styles.rateNum} />
            <span className={styles.rateCaption}>{t.rates.lazoCaption}</span>
          </div>
        ) : null}
        <span className={styles.rateVs} aria-hidden="true">{t.vs}</span>
        <div className={styles.rateItem} data-competition>
          <span className={styles.rateWho}>{t.rates.competition}{ref}</span>
          <span className={styles.rateRange}>
            <BigNumber amount={toMicro(range.min)} currency="none" decimals={0} size="xl" className={styles.rateNum} />
            <span className={styles.panelDash} aria-hidden="true">–</span>
            <BigNumber amount={toMicro(range.max)} currency="none" decimals={0} suffix="%" size="xl" className={styles.rateNum} />
          </span>
          <span className={styles.rateCaption}>{t.rates.competitionCaption}</span>
        </div>
      </div>
      <div className={styles.costBars}>
        <h3 className={styles.h3}>{t.barsTitle(fmt(EXAMPLE_PRICE, 0))}</h3>
        <ComparisonBars label={t.barsLabel} items={bars} />
      </div>
      <p className={styles.planFoot}>{t.method}</p>
      <p className={styles.planFoot}>{t.sourceNote}</p>
    </section>
  );
}

function Roadmap() {
  const t = useT(landingSections).roadmap;

  return (
    <section className={styles.section} aria-labelledby="roadmap-title">
      <div className={styles.sectionHead}>
        <h2 id="roadmap-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <ol className={styles.roadmapRail}>
        {t.items.map((item, i) => (
          <li key={item.t} className={styles.roadmapStop} style={{ ["--band" as string]: SPECTRUM[i % SPECTRUM.length] }}>
            <span className={styles.roadmapTag}>{t.tag}</span>
            <span className={styles.roadmapT}>{item.t}</span>
            <span className={styles.roadmapD}>{item.d}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Honest() {
  const t = useT(landingSections).honest;
  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="honest-title">
      <h2 id="honest-title" className={styles.h2}>
        {t.title}
      </h2>
      <div className={styles.honest}>
        <div>
          <h3 className={styles.h3}>{t.realTitle}</h3>
          <ul className={styles.honestList} data-kind="real">
            {t.real.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.h3}>{t.simTitle}</h3>
          <ul className={styles.honestList} data-kind="sim">
            {t.sim.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Marca 3D renderizada (HyperFrames): loop de luz recorriendo la dispersión.
 * El video tiene fondo negro y se integra con mix-blend-mode: screen sobre el
 * fondo casi negro de la página; con prefers-reduced-motion cae al PNG fijo.
 */
function BrandMark({ animated }: { animated: boolean }) {
  if (!animated) {
    return (
      <Image
        src="/brand/logo-prisma.png"
        alt=""
        aria-hidden
        width={480}
        height={320}
        className={styles.closeMark}
      />
    );
  }
  return (
    <video
      className={`${styles.closeMark} ${styles.closeMarkVideo}`}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/brand/logo-prisma.png"
      aria-hidden="true"
    >
      <source src="/brand/logo-prisma-loop.webm" type="video/webm" />
      <source src="/brand/logo-prisma-loop.mp4" type="video/mp4" />
    </video>
  );
}

function Close() {
  const t = useT(landingSections).close;
  const reduceMotion = useReducedMotion();
  return (
    <footer className={styles.close}>
      <BrandMark animated={!reduceMotion} />
      <h2 className={styles.closeTitle}>{t.title}</h2>
      <MotionLink href="/comercio" className={styles.ctaPrimary} whileHover={reduceMotion ? undefined : { scale: 1.018 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
        {t.cta}
      </MotionLink>
    </footer>
  );
}
