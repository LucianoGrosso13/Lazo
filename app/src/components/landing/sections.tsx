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
import { useLocale, useT, type Locale } from "@/i18n/locale";
import { ChangingNumber, MotionLink, SPECTRUM } from "./hero";
import { REFERENCE } from "./reference";
import { merchantFeeOfPrice, splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";

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
      <Ladder />
      <Guarantor />
      <Merchants />
      <Benefits />
      <Roadmap />
      <Honest />
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
  // Ejemplo con la cotización real: el estudiante nuevo de la demo (escalón 0).
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
                {o.provisional ? <span className={styles.tagBand}>{t.provisional}</span> : null}
              </div>
              <p className={styles.planInterest}>
                {o.interestTotalBps === 0
                  ? t.interestFree
                  : t.interestTotal(nf(o.interestTotalBps / 100))}
              </p>
              <p className={styles.planExample}>{t.example(fmt(EXAMPLE_PRICE, 0))}</p>
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

function Ladder() {
  const t = useT(landingSections).ladder;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const [active, setActive] = useState<TierIndex>(0);
  if (!config) return null;
  const pct = (bps: number) => `${bps / 100}%`;
  const ex = splitPurchase(config, EXAMPLE_PRICE, active);

  return (
    <section className={styles.section} aria-labelledby="ladder-title">
      <div className={styles.sectionHead}>
        <h2 id="ladder-title" className={styles.h2}>
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
                  {t.coverage} <b>{pct(tier.guarantorCoverageBps)}</b>
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
      <p className={styles.coverageNote}>{t.coverageNote}</p>
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
    { day: 0, label: t.events.due, kind: "due" },
    { day: config.guarantorNoticeDay, label: t.events.notice, kind: "notice" },
    { day: config.graceDays + 1, label: t.events.penalty(`${config.penaltyBps / 100}%`), kind: "penalty" },
    { day: end, label: t.events.charge, kind: "charge" },
  ];

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
        <div className={styles.timelineLayout}>
          <div className={styles.timelineEvents} aria-label={t.rulerTitle}>
            {marks.map((m) => (
              <button
                key={m.kind}
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
          <div className={styles.timelineTrack} data-grace={t.events.grace}>
            <motion.span className={styles.timelineProgress} animate={{ scaleX: (marks.find((m) => m.kind === activeMark)?.day ?? 0) / end }} transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }} />
            <span className={styles.timelineGrace} style={{ width: at(config.graceDays) }} />
            {Array.from({ length: end + 1 }, (_, d) => (
              <span key={d} className={styles.tick} style={{ left: at(d) }} data-major={marks.some((m) => m.day === d) || undefined} />
            ))}
          </div>
        </div>
        <div className={styles.timelineDetail} aria-live="polite">
          <p className={styles.rulerFoot}>{t.receipt}</p>
          <p className={styles.timelineSelected}>
            <b>{t.day(marks.find((m) => m.kind === activeMark)?.day ?? 0)} · {marks.find((m) => m.kind === activeMark)?.label}</b>
          </p>
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
          {t.title} <span className={styles.tag}>{t.demoTag}</span>
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div className={styles.merchantGrid} role="list">
        {featured.map((m) => (
          <MerchantCard key={m.address} merchant={m} locale={locale} productsLabel={t.products(m.products.length)} demoTag={t.demoTag} />
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
  demoTag,
}: {
  merchant: DemoMerchant;
  locale: Locale;
  productsLabel: string;
  demoTag: string;
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
        <span className={styles.merchantTags}>
          <span className={styles.tag}>{demoTag}</span>
          <span className={styles.merchantCount}>{productsLabel}</span>
        </span>
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
  // La comisión del comercio hoy depende del plazo de cobro que elige: el
  // rango sale de las opciones habilitadas con tarifa de la config.
  const feePctOfPrice = (bps: number) =>
    (bps * (10_000 - config.guaranteedTiers[0].downPaymentBps)) / 10_000 / 100;
  const fees = settlementOptionsOf(config)
    .filter((o) => o.enabled && o.feeBps !== null)
    .map((o) => feePctOfPrice(o.feeBps ?? 0));
  const feeMax = fees.length > 0 ? Math.max(...fees) : merchantFeeOfPrice(config, 0);
  const feeMin = fees.length > 0 ? Math.min(...fees) : feeMax;
  const feeValue = feeMin === feeMax ? `${nf(feeMax)}%` : `${nf(feeMin)}–${nf(feeMax)}%`;
  const R = REFERENCE;

  const rows = [
    {
      who: t.rows.student.who,
      value: t.rows.student.value,
      label: t.rows.student.label,
      ours: 0,
      theirs: R.mpInstallmentMarkup * 100,
      max: R.mpInstallmentMarkup * 100,
      vs: t.rows.student.vs(nf(R.mpInstallmentMarkup * 100, 0)),
    },
    {
      who: t.rows.merchant.who,
      value: feeValue,
      label: t.rows.merchant.label,
      ours: feeMax,
      theirs: R.merchantFeePct.mercadoPago,
      max: R.merchantFeePct.mercadoPago,
      vs: t.rows.merchant.vs(nf(R.merchantFeePct.cuotaMipyme, 2), nf(R.merchantFeePct.mercadoPago, 2)),
    },
    {
      who: t.rows.pool.who,
      value: `~${R.apyPct.lazoSeniorTarget}%`,
      label: t.rows.pool.label,
      ours: R.apyPct.lazoSeniorTarget,
      theirs: R.apyPct.kamino,
      max: R.apyPct.lazoSeniorTarget,
      vs: t.rows.pool.vs(String(R.apyPct.kamino), String(R.apyPct.jupiter)),
    },
  ];

  return (
    <section className={`${styles.section} ${styles.sectionQuiet}`} aria-labelledby="benefits-title">
      <h2 id="benefits-title" className={`${styles.h2} ${styles.h2Wide}`}>
        {t.title}
      </h2>
      <div className={styles.ledger}>
        {rows.map((r, i) => (
          <div key={r.who} className={styles.ledgerRow} style={{ ["--band" as string]: SPECTRUM[i + 1] }}>
            <span className={styles.ledgerWho}>{r.who}</span>
            <span className={styles.ledgerValue}>{r.value}</span>
            <span className={styles.ledgerLabel}>{r.label}</span>
            <span className={styles.ledgerBeams} aria-hidden>
              <span className={styles.ledgerBeamOurs} style={{ transform: `scaleX(${Math.max(0.015, r.ours / r.max)})`, ["--beam-scale" as string]: Math.max(0.015, r.ours / r.max) }} />
              <span className={styles.ledgerBeamTheirs} style={{ transform: `scaleX(${r.theirs / r.max})`, ["--beam-scale" as string]: r.theirs / r.max }} />
            </span>
            <span className={styles.ledgerVs}>
              {r.vs} <small className={styles.refTag}>{s.reference}</small>
            </span>
          </div>
        ))}
      </div>
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
      <MotionLink href="/tienda" className={styles.ctaPrimary} whileHover={reduceMotion ? undefined : { scale: 1.018 }} whileTap={reduceMotion ? undefined : { scale: 0.985 }}>
        {t.cta}
      </MotionLink>
      <p className={styles.closeFoot}>{t.foot}</p>
    </footer>
  );
}
