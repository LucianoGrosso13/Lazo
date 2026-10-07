"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import {
  formatUsdc,
  type Bps,
  type Micro,
  type QuoteBlockReason,
  type TierIndex,
} from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";
import type { tienda } from "@/i18n/dictionaries/tienda";
import { BigNumber } from "@/components/ui/big-number";
import { Chip } from "@/components/ui/chip";
import { formatBps } from "./plan-alt";
import styles from "./store.module.css";

// Mismo espectro del hero: anticipo → cuota 1 → cuota 2 → cuota 3.
const SPECTRUM = ["#9945FF", "#6C63FF", "#00C2FF", "#19FB9B"] as const;

/** Lo que la card muestra: sale de `quote()` (con wallet) o del Tier inicial. */
export interface ProductTerms {
  tier: TierIndex;
  downPayment: Micro;
  installments: Micro[];
  /** Primer motivo de bloqueo de `quote()` (o tope del Tier sin wallet). */
  blocked: QuoteBlockReason | null;
  /**
   * Segunda opción de la config (hoy: 6 cuotas con interés), cotizada con
   * `quote(..., { installments })` o estimada en el Tier inicial sin wallet.
   * null cuando la config no la ofrece o está deshabilitada.
   */
  alt: {
    installments: Micro[];
    interestTotalBps: Bps;
    minPrice: Micro;
  } | null;
}

type Dict = (typeof tienda)["es"];

export function ProductCard({
  product: p,
  terms,
  badge,
  featured = false,
  t,
}: {
  product: Product;
  terms: ProductTerms;
  /** Texto del motivo de bloqueo ya resuelto (null = elegible). */
  badge: string | null;
  featured?: boolean;
  t: Dict;
}) {
  const { locale } = useLocale();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const bands = [terms.downPayment, ...terms.installments];
  const altText = terms.alt
    ? p.price < terms.alt.minPrice
      ? t.altMinimum(terms.alt.installments.length, fmt(terms.alt.minPrice, 0))
      : t.altOption(
        terms.alt.installments.length,
        fmt(terms.alt.installments[0]),
        formatBps(terms.alt.interestTotalBps, locale),
      )
    : null;

  return (
    <article
      className={`glass ${styles.card} ${featured ? styles.featured : styles.sideCard}`}
      data-blocked={badge ? true : undefined}
    >
      <Link
        href={`/checkout/${p.id}`}
        className={styles.cardLink}
        aria-label={`${t.cardAria(
          p.name[locale],
          fmt(p.price, 0),
          fmt(terms.downPayment),
          fmt(terms.installments[0]),
          terms.installments.length,
          altText,
        )}${badge ? ` ${badge}` : ""}`}
      >
        <div className={styles.media}>
          <Image
            src={p.image}
            alt=""
            width={1600}
            height={1200}
            sizes={featured ? "(min-width: 1024px) 56vw, 100vw" : "(min-width: 1024px) 18vw, 100vw"}
            priority={featured}
          />
          {badge ? <span className={styles.badge}>{badge}</span> : null}
        </div>

        <div className={styles.body}>
          <div className={styles.headRow}>
            <h2 className={styles.name}>{p.name[locale]}</h2>
            <Chip>{t.zeroInterest}</Chip>
          </div>
          <p className={styles.blurb}>{p.blurb[locale]}</p>
          <BigNumber amount={p.price} size={featured ? "lg" : "md"} className={styles.price} />

          <div className={styles.refract} aria-hidden>
            <span className={styles.refractIn} />
            <span className={styles.prismNotch} />
            <span className={styles.bandsOut}>
              {bands.map((amount, i) => (
                <span
                  key={i}
                  className={styles.band}
                  style={{ width: `${(amount / p.price) * 100}%`, background: SPECTRUM[i] }}
                />
              ))}
            </span>
          </div>

          <dl className={styles.terms}>
            <div className={styles.term} data-tone="down">
              <dt>{terms.downPayment > 0 ? t.down : t.noDown}</dt>
              <dd>
                {terms.downPayment > 0 ? <BigNumber amount={terms.downPayment} size="sm" /> : "—"}
              </dd>
            </div>
            <div className={styles.term} data-tone="inst">
              <dt>{t.installments(terms.installments.length)}</dt>
              <dd>
                <BigNumber amount={terms.installments[0]} size="sm" />
              </dd>
            </div>
          </dl>

          {altText ? <p className={styles.altLine}>{altText}</p> : null}

          <span className={styles.go}>
            {t.breakdown}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 10h11M11 5l5 5-5 5" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}
