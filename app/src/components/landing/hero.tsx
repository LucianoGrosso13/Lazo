"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUsdc, toMicro, type TierIndex } from "@/lib/cuotas";
import { CATALOG, type Product } from "@/lib/catalog";
import { landingHero } from "@/i18n/dictionaries/landing-hero";
import { useLocale, useT } from "@/i18n/locale";
import { PrismStage, type StageBand } from "./prism-stage";
import { REFERENCE } from "./reference";
import { splitPurchase } from "./split";
import { useProtocolConfig } from "./use-config";
import styles from "./landing.module.css";

// Espectro de Solana, de la luz que sale primero (anticipo) a la última cuota.
export const SPECTRUM = ["#9945FF", "#6C63FF", "#00C2FF", "#19FB9B"] as const;

const MIN_PRICE = 120;
const MAX_PRICE = 1500;
const TIERS: TierIndex[] = [0, 1, 2, 3];

export function LandingHero() {
  const t = useT(landingHero);
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const [price, setPrice] = useState(1000);
  const [productId, setProductId] = useState<Product["id"] | null>("pc");
  const [tier, setTier] = useState<TierIndex>(0);

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
              cracked={!split.withinTier}
              ariaLabel={t.stageAria(fmt(split.price, 0), fmt(split.downPayment), fmt(split.installments[0]))}
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
              <div className={styles.segmented} role="radiogroup" aria-label={t.tierLabel}>
                {TIERS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={tier === n}
                    className={styles.segment}
                    onClick={() => setTier(n)}
                  >
                    {t.tierName(n)}
                  </button>
                ))}
              </div>
            </div>
            <p className={styles.tierNote} aria-live="polite">
              {split && !split.withinTier ? t.overTier(fmt(split.maxPurchase, 0)) : " "}
            </p>
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
              {t.ctaPrimary}
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
              <span className={styles.beamLazo} style={{ width: `${(lazoTotal / mpTotal) * 100}%` }} />
            </span>
            <span className={styles.compareNum}>
              US$ {fmt(lazoTotal, 0)} <small>· 0% {t.interest}</small>
            </span>
          </div>
          <div className={styles.compareRow}>
            <span className={styles.compareWho}>{t.mp}</span>
            <span className={styles.compareTrack}>
              <span className={styles.beamAlt} style={{ width: "100%" }} />
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
