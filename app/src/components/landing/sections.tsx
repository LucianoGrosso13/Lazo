"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { formatUsdc, toMicro, type TierIndex } from "@/lib/cuotas";
import { landingSections } from "@/i18n/dictionaries/landing-sections";
import { useLocale, useT } from "@/i18n/locale";
import { ChangingNumber, MotionLink, SPECTRUM } from "./hero";
import { REFERENCE } from "./reference";
import { merchantFeeOfPrice, splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";

const EXAMPLE_PRICE = toMicro(1000);
const TIERS: TierIndex[] = [0, 1, 2, 3];

function TierIndicator() {
  const reduceMotion = useReducedMotion();
  return reduceMotion ? <span className={styles.tierIndicator} aria-hidden="true" /> : (
    <motion.span className={styles.tierIndicator} aria-hidden="true" layoutId="ladder-active-tier" transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }} />
  );
}

export function LandingSections() {
  return (
    <div className={`${styles.landing}`}>
      <Ladder />
      <Guarantor />
      <Benefits />
      <Honest />
      <Close />
    </div>
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
    <section id="how" className={styles.section} aria-labelledby="ladder-title">
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

function Benefits() {
  const s = useT(landingSections);
  const t = s.benefits;
  const { locale } = useLocale();
  const config = useProtocolConfig();
  if (!config) return null;
  const nf = (v: number, d = 1) =>
    new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: d }).format(v);
  const feePct = merchantFeeOfPrice(config, 0);
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
      value: `${nf(feePct)}%`,
      label: t.rows.merchant.label,
      ours: feePct,
      theirs: R.merchantFeePct.mercadoPago,
      max: R.merchantFeePct.mercadoPago,
      vs: t.rows.merchant.vs(nf(R.merchantFeePct.cuotaSimple, 2), nf(R.merchantFeePct.mercadoPago, 2)),
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
    <section className={styles.section} aria-labelledby="benefits-title">
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
