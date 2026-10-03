"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatUsdc, getCuotas, toMicro, type TierIndex } from "@/lib/cuotas";
import { landingSections } from "@/i18n/dictionaries/landing-sections";
import { useLocale, useT } from "@/i18n/locale";
import { SPECTRUM } from "./hero";
import { radioKeyDown } from "./radio";
import { REFERENCE } from "./reference";
import { merchantFeeOfPrice, splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";

const EXAMPLE_PRICE = toMicro(1000);
const TIERS: TierIndex[] = [0, 1, 2, 3];

/** Marca la sección cuando entra en pantalla (una sola vez). */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
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
    <section className={styles.section} aria-labelledby="ladder-title">
      <div className={styles.sectionHead}>
        <h2 id="ladder-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>
      <div
        className={styles.ladder}
        role="radiogroup"
        aria-label={t.title}
        onKeyDown={(e) => radioKeyDown(e, TIERS.length, active, (i) => setActive(i as TierIndex))}
      >
        {TIERS.map((n) => {
          const tier = config.guaranteedTiers[n];
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active === n}
              tabIndex={active === n ? 0 : -1}
              className={styles.step}
              style={{ ["--rise" as string]: n, ["--band" as string]: SPECTRUM[n] }}
              onClick={() => setActive(n)}
              onMouseEnter={() => setActive(n)}
              onFocus={() => setActive(n)}
            >
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
        {ex.downPayment > 0
          ? t.example(
              formatUsdc(EXAMPLE_PRICE, locale, 0),
              formatUsdc(ex.downPayment, locale),
              formatUsdc(ex.installments[0] ?? 0, locale),
              config.installmentsCount,
            )
          : t.exampleNoDown(
              formatUsdc(EXAMPLE_PRICE, locale, 0),
              formatUsdc(ex.installments[0] ?? 0, locale),
              config.installmentsCount,
            )}
      </p>
    </section>
  );
}

function Guarantor() {
  const t = useT(landingSections).guarantor;
  const config = useProtocolConfig();
  const [rulerRef, seen] = useInView<HTMLDivElement>();
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
          <p className={styles.sectionLede}>{t.lede}</p>
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

      <div ref={rulerRef} className={`${styles.ruler} ${seen ? styles.rulerLit : ""}`}>
        <p className={styles.rulerTitle}>{t.rulerTitle}</p>
        <div className={styles.rulerTrack}>
          <span className={styles.rulerGrace} style={{ left: at(0), width: at(config.graceDays) }}>
            <span>{t.events.grace}</span>
          </span>
          <span className={styles.rulerLight} />
          {Array.from({ length: end + 1 }, (_, d) => (
            <span key={d} className={styles.tick} style={{ left: at(d) }} data-major={marks.some((m) => m.day === d) || undefined} />
          ))}
          {marks.map((m, i) => (
            <span
              key={m.kind}
              className={styles.mark}
              data-kind={m.kind}
              data-side={i % 2 ? "below" : "above"}
              style={{ left: at(m.day), ["--delay" as string]: `${(m.day / end) * 1.6}s` }}
            >
              <span className={styles.markDay}>{t.day(m.day)}</span>
              <span className={styles.markLabel}>{m.label}</span>
            </span>
          ))}
        </div>
        <p className={styles.rulerFoot}>{t.receipt}</p>
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
      extra: null as string | null,
    },
    {
      who: t.rows.merchant.who,
      value: `${nf(feePct)}%`,
      label: t.rows.merchant.label,
      ours: feePct,
      theirs: R.merchantFeePct.mercadoPago,
      max: R.merchantFeePct.mercadoPago,
      vs: t.rows.merchant.vs(nf(R.merchantFeePct.cuotaSimple, 2), nf(R.merchantFeePct.mercadoPago, 2)),
      extra: t.rows.merchant.payout(R.goCuotasPayoutBusinessDays),
    },
    {
      who: t.rows.pool.who,
      value: `~${R.apyPct.lazoSeniorTarget}%`,
      label: t.rows.pool.label,
      ours: R.apyPct.lazoSeniorTarget,
      theirs: R.apyPct.kamino,
      max: R.apyPct.lazoSeniorTarget,
      vs: t.rows.pool.vs(String(R.apyPct.kamino), String(R.apyPct.jupiter)),
      extra: t.rows.pool.audit,
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
              <span className={styles.ledgerBeamOurs} style={{ width: `${Math.max(1.5, (r.ours / r.max) * 100)}%` }} />
              <span className={styles.ledgerBeamTheirs} style={{ width: `${(r.theirs / r.max) * 100}%` }} />
            </span>
            <span className={styles.ledgerVs}>
              {r.vs} <small className={styles.refTag}>{s.reference}</small>
              {r.extra ? <span className={styles.ledgerExtra}>{r.extra}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Honest() {
  const t = useT(landingSections).honest;
  const mode = getCuotas().mode;
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
      <p className={styles.modeNote}>{mode === "real" ? t.modeReal : t.modeMock}</p>
    </section>
  );
}

function Close() {
  const t = useT(landingSections).close;
  return (
    <footer className={styles.close}>
      <h2 className={styles.closeTitle}>{t.title}</h2>
      <Link href="/tienda" className={styles.ctaPrimary}>
        {t.cta}
      </Link>
      <p className={styles.closeFoot}>{t.foot}</p>
    </footer>
  );
}
