import Link from "next/link";
import { marketplace } from "@/i18n/dictionaries/marketplace";
import { useLocale, useT } from "@/i18n/locale";
import { getCategory, type DemoMerchant } from "@/lib/merchants";
import { MerchantMonogram } from "./monogram";
import styles from "./marketplace.module.css";

/**
 * Tarjeta de comercio del marketplace: monograma con el gradiente de su
 * categoría, nombre, rubro y ciudad, y cantidad de
 * productos. Toda la tarjeta es el enlace al perfil.
 */
export function MerchantCard({ merchant: m }: { merchant: DemoMerchant }) {
  const t = useT(marketplace);
  const { locale } = useLocale();
  const category = getCategory(m.category);
  const products = t.productsCount(m.products.length);

  return (
    <Link
      href={`/comercio/${m.address}`}
      className={`glass ${styles.card}`}
      data-featured={m.featured || undefined}
      aria-label={t.cardAria(m.name, category?.label[locale] ?? "", m.city, products)}
    >
      <MerchantMonogram name={m.name} category={m.category} />
      <span className={styles.cardBody}>
        <span className={styles.cardHead}>
          <span className={styles.cardName}>{m.name}</span>
          {m.featured ? (
            <span className={`${styles.merchantMark} ${styles.featuredMark}`}>
              {t.featuredTag}
            </span>
          ) : null}
        </span>
        <span className={styles.cardMeta}>
          {category?.label[locale]}
          <span aria-hidden className={styles.sep}>
            ·
          </span>
          {m.city}
        </span>
        <span className={styles.cardFoot}>{products}</span>
      </span>
    </Link>
  );
}
