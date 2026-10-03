"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUsdc, toMicro, type TierIndex } from "@/lib/cuotas";
import { CATALOG, type Product } from "@/lib/catalog";
import { landingHero } from "@/i18n/dictionaries/landing-hero";
import { useLocale, useT } from "@/i18n/locale";
import { PrismStage, type StageBand } from "./prism-stage";
import { radioKeyDown } from "./radio";
import { REFERENCE } from "./reference";
import { splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";

// Espectro de Solana, de la luz que sale primero (anticipo) a la última cuota.
export const SPECTRUM = ["#9945FF", "#6C63FF", "#00C2FF", "#19FB9B"] as const;

const MIN_PRICE = 120;
const MAX_PRICE = 1500;
const TIERS: TierIndex[] = [0, 1, 2, 3];

/** Id de la primera cuota: es la banda que marca la demo de mora/refill. */
const LATE_BAND = "c1";

export function LandingHero() {
  const t = useT(landingHero);
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const [price, setPrice] = useState(1000);
  const [productId, setProductId] = useState<Product["id"] | null>("pc");
  const [tier, setTier] = useState<TierIndex>(0);

  // Demostración visual de mora: una banda se apaga, el garante la repone.
  const [demo, setDemo] = useState<"idle" | "late" | "refill">("idle");
  const demoTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => demoTimers.current.forEach(clearTimeout), []);

  const runDemo = () => {
    if (demo !== "idle") return;
    setDemo("late");
    demoTimers.current.push(setTimeout(() => setDemo("refill"), 1100));
    demoTimers.current.push(setTimeout(() => setDemo("idle"), 2900));
  };

  const fmt = (micro: number, decimals = 2) => formatUsdc(micro, locale, decimals);
  const split = useMemo(() => (config ? splitPurchase(config, toMicro(price), tier) : null), [config, price, tier]);

  const bands: StageBand[] = split
    ? [
        { id: "down", label: t.down, value: `US$ ${fmt(split.downPayment)}`, amount: split.downPayment, color: SPECTRUM[0] },
        ...split.installments.map((amount, i) => ({
          id: `c${i + 1}`,
          label: t.installment(i + 1),
          value: `US$ ${fmt(amount)}`,
          amount,
          color: SPECTRUM[i + 1] ?? SPECTRUM[3],
        })),
      ]
    : [];

  const lazoTotal = toMicro(price);
  const mpTotal = Math.round(lazoTotal * (1 + REFERENCE.mpInstallmentMarkup));
  const checkoutHref = productId ? `/checkout/${productId}` : "/tienda";
  const instCount = split?.installments.length ?? config?.installmentsCount ?? null;

  const pickProduct = (p: Product) => {
    setProductId(p.id);
    setPrice(p.price / 1_000_000);
  };

  return (
    <section className={`${styles.landing} ${styles.hero}`}>
      <div className={styles.grain} aria-hidden />
      <div className={styles.heroGrid}>
        <div className={styles.heroStage}>
          {split ? (
            <PrismStage
              inputLabel={t.priceLabel}
              inputValue={`US$ ${fmt(split.price, 0)}`}
              bands={bands}
              state={{
                warning: !split.withinTier,
                late: demo === "late" ? LATE_BAND : undefined,
                refill: demo === "refill" ? LATE_BAND : undefined,
              }}
              ariaLabel={t.stageAria(
                fmt(split.price, 0),
                split.downPayment > 0 ? fmt(split.downPayment) : null,
                fmt(split.installments[0] ?? 0),
                split.installments.length,
              )}
            />
          ) : (
            <div className={styles.stageSkeleton} />
          )}

          <div className={styles.controls}>
            <div className={styles.controlRow}>
              <label htmlFor="lazo-price" className={styles.controlLabel}>
                {t.price}
              </label>
              <output htmlFor="lazo-price" className={styles.priceOut}>
                US$ {fmt(toMicro(price), 0)}
              </output>
            </div>
            <input
              id="lazo-price"
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={10}
              value={price}
              onChange={(e) => {
                setPrice(Number(e.target.value));
                setProductId(null);
              }}
              className={styles.range}
              style={{ ["--fill" as string]: `${((price - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100}%` }}
            />
            <div className={styles.chipRow}>
              <div className={styles.segmented} role="group" aria-label={t.priceLabel}>
                {CATALOG.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={productId === p.id}
                    className={styles.segment}
                    onClick={() => pickProduct(p)}
                  >
                    {t.products[p.id]} <span className={styles.segmentNum}>{fmt(p.price, 0)}</span>
                  </button>
                ))}
              </div>
              <div
                className={styles.segmented}
                role="radiogroup"
                aria-label={t.tierLabel}
                onKeyDown={(e) => radioKeyDown(e, TIERS.length, tier, (i) => setTier(i as TierIndex))}
              >
                {TIERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={tier === n}
                    tabIndex={tier === n ? 0 : -1}
                    className={styles.segment}
                    onClick={() => setTier(n)}
                  >
                    {t.tierName(n)}
                  </button>
                ))}
              </div>
            </div>
            {split ? (
              <>
                <p className={styles.payLine} aria-live="polite">
                  <span>
                    {split.downPayment > 0
                      ? t.paySplit(fmt(split.downPayment), fmt(split.installments[0] ?? 0), split.installments.length)
                      : t.payNoDown(fmt(split.installments[0] ?? 0), split.installments.length)}
                  </span>
                  <span className={styles.payTotal}>{t.payTotal(fmt(lazoTotal, 0))}</span>
                </p>
                <p className={styles.downNote}>{split.downPayment > 0 ? t.downNote : " "}</p>
                <p className={styles.tierNote} aria-live="polite">
                  {!split.withinTier ? t.overTier(fmt(split.maxPurchase, 0)) : " "}
                </p>
                <div className={styles.demoRow}>
                  <button type="button" className={styles.demoBtn} onClick={runDemo} disabled={demo !== "idle"}>
                    {t.demoBtn}
                  </button>
                  <span className={styles.demoNote}>{t.demoNote}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className={styles.heroCopy}>
          <h1 className={styles.title}>
            <span>{t.title1}</span>
            <span className={styles.titleZero}>{t.title2}</span>
            <span>{t.title3}</span>
          </h1>
          <p className={styles.lede}>{t.lede}</p>
          <div className={styles.ctaRow}>
            <Link href={checkoutHref} className={styles.ctaPrimary}>
              {instCount ? t.ctaPrimary(instCount) : t.ctaGeneric}
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
                <path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/tienda" className={styles.ctaSecondary}>
              {t.ctaSecondary}
            </Link>
          </div>
          <p className={styles.devnetNote}>
            <span className={styles.devnetDot} aria-hidden />
            {t.devnet}
          </p>
        </div>
      </div>

      <div className={styles.compare}>
        <p className={styles.compareTitle}>{t.compareTitle}</p>
        <div className={styles.compareRows}>
          <div className={styles.compareRow}>
            <span className={styles.compareWho}>{t.lazo}</span>
            <span className={styles.compareTrack}>
              <span className={styles.beamLazo} style={{ ["--k" as string]: lazoTotal / mpTotal }} />
            </span>
            <span className={styles.compareNum}>
              US$ {fmt(lazoTotal, 0)} <small>· 0% {t.interest}</small>
            </span>
          </div>
          <div className={styles.compareRow}>
            <span className={styles.compareWho}>{t.mp}</span>
            <span className={styles.compareTrack}>
              <span className={styles.beamAlt} />
            </span>
            <span className={styles.compareNum}>
              ~US$ {fmt(mpTotal, 0)} <small className={styles.refTag}>{t.reference}</small>
            </span>
          </div>
        </div>
        <p className={styles.savings}>{t.savings(fmt(mpTotal - lazoTotal, 0))}</p>
      </div>
    </section>
  );
}
