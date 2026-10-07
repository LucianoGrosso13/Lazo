"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  DEMO_STUDENT_NEW,
  formatUsdc,
  planOptionsOf,
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
import { splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";
import { QuienesSomos } from "./quienes-somos";
import { Probalo } from "./probalo";

const EXAMPLE_PRICE = toMicro(1000);
const TIERS: TierIndex[] = [0, 1, 2, 3];

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

function Guarantor() {
  const t = useT(landingSections).guarantor;
  const config = useProtocolConfig();
  const [activeMark, setActiveMark] = useState("due");
  const reduceMotion = useReducedMotion();
  if (!config) return null;
  const end = config.guarantorChargeDay;
  const at = (day: number) => `${(day / end) * 100}%`;
  const marks = [
    { day: 0, key: "day0", kind: "day0", label: t.marks.day0.label, what: t.marks.day0.what, who: t.marks.day0.who },
    { day: 0, key: "due", kind: "due", label: t.marks.due.label, what: t.marks.due.what, who: t.marks.due.who },
    { day: config.graceDays, key: "grace", kind: "grace", label: t.marks.grace.label(config.graceDays), what: t.marks.grace.what, who: t.marks.grace.who },
    { day: config.guarantorNoticeDay, key: "notice", kind: "notice", label: t.marks.notice.label(config.guarantorNoticeDay), what: t.marks.notice.what, who: t.marks.notice.who },
    { day: config.graceDays + 1, key: "penalty", kind: "penalty", label: t.marks.penalty.label(config.graceDays + 1, `${config.penaltyBps / 100}%`), what: t.marks.penalty.what(`${config.penaltyBps / 100}%`), who: t.marks.penalty.who },
    { day: end, key: "charge", kind: "charge", label: t.marks.charge.label(end), what: t.marks.charge.what, who: t.marks.charge.who },
  ].sort((a, b) => a.day - b.day);

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="guarantor-title">
      <div className={styles.split2}>
        <div>
          <h2 id="guarantor-title" className={styles.h2}>
            {t.title}
          </h2>
          <p className={styles.sectionLede}>{t.lede(config.guarantorChargeDay)}</p>
        </div>
        <ol className={styles.steps}>
          {t.steps.map((s) => (
            <li key={s.t} className={styles.stepItem}>
              <span className={styles.stepItemT}>{s.t}</span>
              <span className={styles.stepItemD}>{s.d}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.ruler}>
        <p className={styles.rulerTitle}>{t.rulerTitle}</p>
        <p className={styles.rulerFoot}>{t.rulerSubtitle}</p>
        <div className={styles.timelineLayout}>
          <div className={styles.timelineEvents} aria-label={t.rulerTitle}>
            {marks.map((m) => (
              <button
                key={m.key}
                type="button"
                data-kind={m.kind}
                data-active={activeMark === m.kind ? "true" : undefined}
                className={styles.timelineEvent}
                aria-pressed={activeMark === m.kind}
                onClick={() => setActiveMark(m.kind)}
                onFocus={() => setActiveMark(m.kind)}
              >
                <span className={styles.markDay}>{t.day(m.day)}</span>
                <span className={styles.markLabel} data-kind={m.kind}>{m.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.timelineTrack} data-grace={t.marks.grace.label(config.graceDays)}>
            <motion.span className={styles.timelineProgress} animate={{ scaleX: (marks.find((m) => m.kind === activeMark)?.day ?? 0) / end }} transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }} />
            <span className={styles.timelineGrace} style={{ width: at(config.graceDays) }} />
            {Array.from({ length: end + 1 }, (_, d) => (
              <span key={d} className={styles.tick} style={{ left: at(d) }} data-major={marks.some((m) => m.day === d) || undefined} />
            ))}
          </div>
        </div>
        <div className={styles.timelineDetail} aria-live="polite">
          <p className={styles.timelineSelected}>
            <b>{marks.find((m) => m.kind === activeMark)?.label}</b>
          </p>
          <p className={styles.rulerFoot}>{marks.find((m) => m.kind === activeMark)?.what}</p>
          <p className={styles.rulerFoot}>{marks.find((m) => m.kind === activeMark)?.who}</p>
        </div>
      </div>
    </section>
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
  const nf = (v: number, d = 1) =>
    new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: d }).format(v);
  const assumptions = REFERENCE.modelAssumptions;
  const settlement = settlementOptionsOf(config).filter((o) => o.enabled && o.feeBps !== null);
  const fees = settlement.map((option) => ({
    days: option.days,
    pct: (option.feeBps ?? 0) / 100,
    tranches: option.tranches,
  }));
  const poolTarget = REFERENCE.apyPct.lazoSeniorTarget;

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="benefits-title">
      <div className={styles.sectionHead}>
        <h2 id="benefits-title" className={`${styles.h2} ${styles.h2Wide}`}>{t.title}</h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.economicsRows}>
        <div className={styles.economicsRow}>
          <h3>{t.merchant.who}</h3>
          <p>{fees.map((fee) => `${fee.days === 0 ? (locale === "es" ? "Hoy" : "Today") : `${fee.days} ${locale === "es" ? "días" : "days"}`} ${nf(fee.pct, 2)}%`).join(" · ")}</p>
          <p className={styles.rulerFoot}>{t.merchant.detail}</p>
        </div>
        <div className={styles.economicsRow}>
          <h3>{t.pool.who}</h3>
          <p>{t.pool.target(poolTarget)} · {t.pool.label}</p>
          <p className={styles.rulerFoot}>{t.pool.detail}</p>
        </div>
      </div>
      <div className={styles.assumptions}>
        <h3>{t.assumptionsTitle}</h3>
        <p className={styles.rulerFoot}>{t.assumptionsSubtitle}</p>
        <dl className={styles.assumptionList}>
          <div><dt>{t.assumptions.downPayment.label}</dt><dd>{t.assumptions.downPayment.value(assumptions.downPaymentPct)}</dd></div>
          <div><dt>{t.assumptions.defaultRate.label}</dt><dd>{t.assumptions.defaultRate.value(assumptions.defaultRatePct)}</dd></div>
          <div><dt>{t.assumptions.recoveryRate.label}</dt><dd>{t.assumptions.recoveryRate.value(assumptions.recoveryRatePct)}</dd></div>
          <div><dt>{t.assumptions.capitalCost.label}</dt><dd>{t.assumptions.capitalCost.value(assumptions.costOfCapitalAnnualPct)}</dd></div>
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
  const three = splitPurchase(config, EXAMPLE_PRICE, 0);
  const sixOption = planOptionsOf(config).find((o) => o.installments === 6 && o.enabled);
  const tier = config.guaranteedTiers[0];
  const down = Math.round((EXAMPLE_PRICE * tier.downPaymentBps) / 10_000);
  const financed = EXAMPLE_PRICE - down;
  const sixInterest = sixOption ? Math.round((financed * sixOption.interestTotalBps) / 10_000) : 0;
  const sixBase = sixOption ? Math.floor((financed + sixInterest) / sixOption.installments) : 0;
  const sixInstallmentAmounts = sixOption ? Array.from({ length: sixOption.installments }, (_, i) => i === sixOption.installments - 1 ? financed + sixInterest - sixBase * (sixOption.installments - 1) : sixBase) : [];
  const total3 = three.downPayment + three.installments.reduce((a, b) => a + b, 0);
  const total6 = sixOption ? down + sixInstallmentAmounts.reduce((a, b) => a + b, 0) : 0;
  const referenceRange = REFERENCE.cfteaRangePct;
  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="comparison-title">
      <div className={styles.sectionHead}>
        <h2 id="comparison-title" className={styles.h2}>{t.title}</h2>
        <p className={styles.sectionLede}>{t.lede(fmt(EXAMPLE_PRICE, 0), fmt(down, 0), fmt(financed, 0))}</p>
      </div>
      <div className={styles.comparisonGrid}>
        <article className={styles.comparisonItem}>
          <h3>{t.lazo3.who}</h3><strong>US$ {fmt(total3, 0)}</strong>
          <p>{t.lazo3.interest(nf(0), fmt(0))}</p><p>{t.lazo3.terms(fmt(down, 0), three.installments.length, fmt(three.installments[0]))}</p>
        </article>
        {sixOption ? <article className={styles.comparisonItem}>
          <h3>{t.lazo6.who}</h3><strong>US$ {fmt(total6, 0)}</strong>
          <p>{t.lazo6.interest(nf((sixOption?.interestTotalBps ?? 0) / 100), fmt(sixInterest))}</p><p>{t.lazo6.terms(fmt(down, 0), sixInstallmentAmounts.length, fmt(sixInstallmentAmounts[0]))}</p>
        </article> : null}
        <article className={styles.comparisonItem}>
          <h3>{t.competition.who} <small className={styles.refTag}>{t.reference}</small></h3>
          <strong>{t.competition.rangeLabel(referenceRange.min, referenceRange.max)}</strong>
          <p>{t.competition.terms}</p>
          <p>{t.competition.detail}</p>
        </article>
      </div>
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
