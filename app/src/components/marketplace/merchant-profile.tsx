"use client";

// /comercio/[direccion] para un comercio del directorio de ejemplo: encabezado
// con monograma, rubro y ciudad; opciones aceptadas desde la config y el plazo que el
// comercio eligió en el mock si existe; productos con el precio partido
// y CTA al checkout. Direcciones fuera del directorio las atiende
// `ComercioPublico` (la página decide, este componente no).
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { GlassPanel } from "@/components/ui/glass";
import { marketplace } from "@/i18n/dictionaries/marketplace";
import { useLocale, useT } from "@/i18n/locale";
import { planOptionsOf, settlementOptionOf } from "@/lib/cuotas";
import type { DemoMerchant } from "@/lib/merchants";
import { getCategory } from "@/lib/merchants";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { MerchantMonogram } from "./monogram";
import { ProductTile } from "./product-tile";
import { formatBps } from "@/components/store/plan-alt";
import styles from "./marketplace.module.css";

export function MerchantProfile({ merchant: m }: { merchant: DemoMerchant }) {
  const t = useT(marketplace);
  const { locale } = useLocale();
  const category = getCategory(m.category);
  const config = useCuotasQuery(["config"], (c) => c.getConfig());
  const account = useCuotasQuery(["merchant", m.address], (c) =>
    c.getMerchant(m.address),
  );

  // Plazo de cobro elegido por el comercio (el mock siembra "immediate").
  // Si la cuenta no existe en el modo activo, la línea simplemente no sale.
  const cfg = config.data;
  const settlement =
    cfg && account.data
      ? settlementOptionOf(cfg, account.data.settlementId ?? "immediate")
      : undefined;

  return (
    <div className={styles.profile} data-testid="merchant-profile">
      <Link href="/comercio" className={styles.back}>
        <span aria-hidden>←</span> {t.backToMarketplace}
      </Link>

      <header className={styles.profileHead}>
        <MerchantMonogram name={m.name} category={m.category} large />
        <div className={styles.profileText}>
          <h1 className={styles.profileName}>{m.name}</h1>
          <div className={styles.profileChips}>
            {category ? <Chip>{category.label[locale]}</Chip> : null}
            <Chip>{m.city}</Chip>
            {m.featured ? <Chip>{t.featuredTag}</Chip> : null}
          </div>
          <p className={styles.profileDesc}>{m.description[locale]}</p>
          <p className={styles.profileAddr} title={m.address}>
            {m.address}
          </p>
        </div>
      </header>

      {cfg ? (
        <GlassPanel className={styles.accepted}>
          <span className={styles.acceptedKey}>{t.acceptedPlans}</span>
          {planOptionsOf(cfg).filter((o) => o.enabled).map((o) => (
            <Chip key={o.installments} on>
              {t.planChip(o.installments)}
              {o.interestTotalBps === 0
                ? ` · ${t.zeroInterest}`
                : ` · ${formatBps(o.interestTotalBps, locale)} ${t.totalInterest}`}
            </Chip>
          ))}
          {settlement ? (
            <Chip>
              {settlement.days === 0
                ? t.settlementNow
                : t.settlementIn(settlement.days)}
            </Chip>
          ) : null}
        </GlassPanel>
      ) : null}

      <section aria-labelledby="merchant-products">
        <div className={styles.productsHead}>
          <h2 id="merchant-products" className={styles.productsTitle}>
            {t.productsTitle}
          </h2>
          <span className={styles.productsCount}>
            {t.productsCount(m.products.length)}
          </span>
        </div>
        {cfg ? (
          <div className={styles.products}>
            {m.products.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                category={m.category}
                config={cfg}
              />
            ))}
          </div>
        ) : (
          <p className={styles.tierNote} role="status">
            {t.loadingAria}…
          </p>
        )}
        <p className={styles.tierNote}>{t.tierNote}</p>
      </section>

    </div>
  );
}
