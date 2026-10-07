"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { BigNumber } from "@/components/ui/big-number";
import { marketplace } from "@/i18n/dictionaries/marketplace";
import { useLocale, useT } from "@/i18n/locale";
import {
  defaultPlanOption,
  formatUsdc,
  type ProtocolConfig,
} from "@/lib/cuotas";
import type { CategoryId, DirectoryProduct } from "@/lib/merchants";
import { CATEGORY_MONOGRAM } from "./monogram";
import { planPreviews, previewPlan } from "./preview";
import styles from "./marketplace.module.css";

// Mismo espectro del hero/tienda: anticipo → cuotas. Con 6 cuotas los
// colores ciclan (son 4 para anticipo + 3; se repite el tramo final).
const SPECTRUM = ["#9945FF", "#6C63FF", "#00C2FF", "#19FB9B"] as const;

/**
 * Producto de un comercio del directorio: foto (o tile con gradiente +
 * inicial si falta), precio y el partido en cuotas que acepta el comercio
 * (3 sin interés / 6 con interés provisional, desde la config). El CTA va
 * al checkout de ese producto.
 */
export function ProductTile({
  product: p,
  category,
  config,
}: {
  product: DirectoryProduct;
  category: CategoryId;
  config: ProtocolConfig;
}) {
  const t = useT(marketplace);
  const { locale } = useLocale();
  const [imgFailed, setImgFailed] = useState(false);
  const previews = planPreviews(config, p.price);
  const first = defaultPlanOption(config);
  const refract = first ? previewPlan(config, p.price, first) : null;
  const bands: number[] = refract
    ? [refract.downPayment, ...refract.installmentAmounts]
    : [];

  return (
    <article className={`glass ${styles.prod}`}>
      <div className={styles.prodMedia}>
        {imgFailed ? (
          <span
            aria-hidden
            className={styles.prodFallback}
            style={{ ["--mg" as string]: CATEGORY_MONOGRAM[category] }}
          >
            {p.name[locale].trim().charAt(0).toUpperCase()}
          </span>
        ) : (
          <Image
            src={p.image}
            alt=""
            width={800}
            height={450}
            sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 100vw"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <div className={styles.prodBody}>
        <h3 className={styles.prodName}>{p.name[locale]}</h3>
        <p className={styles.prodBlurb}>{p.blurb[locale]}</p>
        <BigNumber amount={p.price} size="sm" decimals={p.price % 1_000_000 === 0 ? 0 : 2} />

        {refract && bands.length > 0 ? (
          <div className={styles.refract} aria-hidden>
            <span className={styles.refractIn} />
            <span className={styles.prismNotch} />
            <span className={styles.bandsOut}>
              {bands.map((amount, i) => (
                <span
                  key={i}
                  className={styles.band}
                  style={{
                    width: `${(amount / (p.price + refract.interest)) * 100}%`,
                    background: SPECTRUM[i % SPECTRUM.length],
                  }}
                />
              ))}
            </span>
          </div>
        ) : null}

        <ul className={styles.planLines}>
          {previews.map(({ option, preview }) => (
            <li key={option.installments} className={styles.planLine}>
              <span className={styles.per}>
                {t.planOptionLine(
                  preview.installments,
                  formatUsdc(preview.perInstallment, locale),
                )}
              </span>
              <span className="ref-tag">
                {preview.interest === 0 ? t.zeroInterest : t.provisionalTag}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href={`/checkout/${p.id}`}
          className={`${buttonClasses("secondary", "sm")} ${styles.buy}`}
          aria-label={`${t.buy} — ${t.productAria(p.name[locale], formatUsdc(p.price, locale, 0))}`}
        >
          {t.buy}
        </Link>
      </div>
    </article>
  );
}
