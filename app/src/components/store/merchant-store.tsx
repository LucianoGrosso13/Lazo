"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useClient } from "@solana/react";
import { useWalletStatus } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import { productsByMerchant } from "@/lib/catalog";
import {
  CuotasError,
  defaultPlanOption,
  formatUsdc,
  getCuotas,
  settlementOptionOf,
  type Guarantee,
  type Micro,
  type ProtocolConfig,
  type Quote,
  type Reputation,
} from "@/lib/cuotas";
import { DEMO_CONFIG } from "@/lib/cuotas/demo-config";
import {
  DEMO_ACCOUNT_ADDRESSES,
  readDemoSelection,
  subscribeDemoSelection,
} from "@/lib/roles";
import { splitPurchase } from "@/components/landing/split";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { tienda } from "@/i18n/dictionaries/tienda";
import { marketplace } from "@/i18n/dictionaries/marketplace";
import { useLocale, useT } from "@/i18n/locale";
import { useWalletAddress, WalletButton } from "@/components/wallet-button";
import { GlassPanel } from "@/components/ui/glass";
import { ReferenceTag } from "@/components/ui/badges";
import { Chip } from "@/components/ui/chip";
import { Button, buttonClasses } from "@/components/ui/button";
import { StateMark } from "@/components/ui/state-mark";
import { getCategory, type DemoMerchant } from "@/lib/merchants";
import { ProductCard, type ProductTerms } from "./product-card";
import { altPlanOption, formatBps, installmentsForOption } from "./plan-alt";
import { CATEGORY_MONOGRAM } from "@/components/marketplace/monogram";
import styles from "./store.module.css";

const noopSubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

// La tienda de cada comercio del directorio: se entra desde /comercio y
// muestra solo los productos de ese comercio con la cotización real de la
// wallet (o la del escalón 0 si no hay wallet). Direcciones fuera del
// directorio las atiende `ComercioPublico` (la página decide, acá no).

interface WalletView {
  guarantee: Guarantee | null;
  reputation: Reputation | null;
  quotes: Record<string, Quote>;
  /** Cotización de la opción alternativa por producto (null si no se pidió). */
  quotesAlt: Record<string, Quote | null>;
}

type Dict = (typeof tienda)["es"];

/** Texto del badge de bloqueo: el motivo de `quote()` traducido. */
function badgeText(
  quote: Quote | null,
  withinTier: boolean,
  guarantee: Guarantee | null,
  exposure: Micro,
  config: ProtocolConfig,
  t: Dict,
  fmt: (m: Micro, d?: number) => string,
): string | null {
  const reason = quote?.reasons[0] ?? (withinTier ? null : "exceeds_tier_max");
  switch (reason) {
    case null:
      return null;
    case "exceeds_tier_max": {
      const tier = quote?.tier ?? 0;
      return t.reasons.exceeds_tier_max(fmt(config.guaranteedTiers[tier].maxPurchase, 0));
    }
    case "exceeds_credit_limit": {
      // Misma cuenta que computeQuote: el maxPurchase del escalón cotizado
      // es la línea de crédito total; `exposure` es lo que ya está en uso.
      const tier = quote?.tier ?? 0;
      const params =
        quote?.withGuarantee === false
          ? config.unguaranteedTiers[
              Math.min(tier, config.unguaranteedTiers.length - 1)
            ]
          : config.guaranteedTiers[tier];
      return t.reasons.exceeds_credit_limit(
        fmt(exposure, 0),
        fmt(params.maxPurchase, 0),
      );
    }
    case "exceeds_guarantor_max_purchase":
      return guarantee
        ? t.reasons.exceeds_guarantor_max_purchase(fmt(guarantee.maxPurchase, 0))
        : t.reasons.exceeds_guarantee_coverage;
    case "exceeds_guarantee_coverage":
      return t.reasons.exceeds_guarantee_coverage;
    case "no_guarantee":
      return t.reasons.no_guarantee;
    case "blocked_after_default":
      return t.reasons.blocked_after_default;
    case "has_active_plan":
      return t.reasons.has_active_plan;
    case "protocol_halted":
      return t.reasons.protocol_halted;
    case "option_unavailable":
      return t.reasons.option_unavailable;
  }
}

export function MerchantStore({ merchant: m }: { merchant: DemoMerchant }) {
  const t = useT(tienda);
  const tm = useT(marketplace);
  const { locale } = useLocale();
  const client = useClient<AppClient>();
  const status = useWalletStatus(client);
  const address = useWalletAddress();
  const mounted = useMounted();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const products = productsByMerchant(m.address);
  const category = getCategory(m.category);

  // En mock, la identidad de ejemplo elegida en /app actúa como la wallet del
  // recorrido (mismo criterio que useStudentAddress: la selección manda).
  // Sin selección la tienda sigue en modo invitada — el fallback al estudiante
  // nuevo de useStudentAddress no aplica acá para no perder esa vista.
  const demoId = useSyncExternalStore(subscribeDemoSelection, readDemoSelection, () => null);
  const demoStudent =
    getCuotas().mode === "mock" && (demoId === "student-new" || demoId === "student-tier3")
      ? DEMO_ACCOUNT_ADDRESSES[demoId]
      : null;
  const student = demoStudent ?? address;

  const configQ = useCuotasQuery(["config"], (c) => c.getConfig());
  // En mock arranca con la config de demo para el primer render (como use-config).
  const config = configQ.data ?? (getCuotas().mode === "mock" ? DEMO_CONFIG : undefined);

  // La alternativa habilitada que no es la opción por defecto (hoy: 6 cuotas
  // con interés). Si la config no la trae, la vidriera no la menciona.
  const altOpt = config ? altPlanOption(config) : undefined;

  // La cuenta Merchant del modo activo: nombre en cadena y plazo de cobro
  // elegido. Fuera del mock puede no existir todavía: queda sin datos y la
  // página usa el nombre del directorio.
  const merchantQ = useCuotasQuery(["merchant", m.address], (c) =>
    c.getMerchant(m.address).catch((e) => {
      if (e instanceof CuotasError && e.code === "not_found") return null;
      throw e;
    }),
  );

  const walletQ = useCuotasQuery(
    mounted && student ? ["store", m.address, student, altOpt?.installments ?? 0] : null,
    async (c): Promise<WalletView> => {
      // La key solo se activa con un estudiante efectivo: student no es null acá.
      const who = student ?? "";
      const alt = altPlanOption(config ?? (await c.getConfig()));
      const [guarantee, reputation, quotes, quotesAlt] = await Promise.all([
        c.getGuarantee(who),
        // Estudiante sin Reputation on-chain todavía: primera compra, margen intacto.
        c.getReputation(who).catch((e) => {
          if (e instanceof CuotasError && e.code === "not_found") return null;
          throw e;
        }),
        Promise.all(products.map((p) => c.quote(p.price, who))),
        // La alternativa se cotiza con quote() igual que en el checkout.
        alt
          ? Promise.all(
              products.map((p) =>
                c.quote(p.price, who, { installments: alt.installments }),
              ),
            )
          : Promise.resolve(products.map((): Quote | null => null)),
      ]);
      return {
        guarantee,
        reputation,
        quotes: Object.fromEntries(products.map((p, i) => [p.id, quotes[i]])),
        quotesAlt: Object.fromEntries(
          products.map((p, i) => [p.id, quotesAlt[i] ?? null]),
        ),
      };
    },
  );

  const warming =
    status === "pending" || status === "connecting" || status === "reconnecting";
  const error = configQ.error ?? merchantQ.error ?? walletQ.error ?? null;
  const loading =
    !mounted ||
    warming ||
    !config ||
    (student != null && walletQ.data == null && walletQ.error == null);

  const retry = () => {
    void configQ.mutate();
    void merchantQ.mutate();
    void walletQ.mutate();
  };

  const termsFor = (id: string, price: Micro): { terms: ProductTerms; badge: string | null } | null => {
    if (!config) return null;
    if (student && walletQ.data) {
      const q = walletQ.data.quotes[id];
      if (!q) return null;
      const exposure = walletQ.data.reputation?.activeExposure ?? 0;
      const qa = walletQ.data.quotesAlt[id];
      return {
        terms: {
          tier: q.tier,
          downPayment: q.downPayment,
          installments: q.installments,
          blocked: q.reasons[0] ?? null,
          alt:
            altOpt && qa && !qa.reasons.includes("option_unavailable")
              ? {
                  installments: qa.installments,
                  interestTotalBps: qa.interestTotalBps,
                  provisional: qa.provisional,
                }
              : null,
        },
        badge: badgeText(q, true, walletQ.data.guarantee, exposure, config, t, fmt),
      };
    }
    // Sin wallet: cotiza el escalón 0 (la misma cuenta que `quote()`).
    const s = splitPurchase(config, price, 0);
    return {
      terms: {
        tier: 0,
        downPayment: s.downPayment,
        installments: s.installments,
        blocked: s.withinTier ? null : "exceeds_tier_max",
        alt: altOpt
          ? {
              installments: installmentsForOption(config, price, 0, altOpt),
              interestTotalBps:
                altOpt.interestTotalBps + config.guaranteedTiers[0].interestBps,
              provisional: altOpt.provisional,
            }
          : null,
      },
      badge: badgeText(null, s.withinTier, null, 0, config, t, fmt),
    };
  };

  const [featured, ...rest] = products;
  const featuredQuote = featured ? walletQ.data?.quotes[featured.id] : undefined;
  const tier = featuredQuote?.tier;
  const reputation = walletQ.data?.reputation ?? null;

  // Margen tipo tarjeta: la línea del escalón menos lo comprometido
  // (`reputation.activeExposure`). Misma cuenta que `computeQuote` en el mock.
  let margin: { used: Micro; limit: Micro } | null = null;
  if (reputation && config && featuredQuote) {
    const params = featuredQuote.withGuarantee
      ? config.guaranteedTiers[reputation.tier]
      : config.unguaranteedTiers[
          Math.min(reputation.tier, config.unguaranteedTiers.length - 1)
        ];
    margin = { used: reputation.activeExposure, limit: params.maxPurchase };
  }

  // La lede nombra la segunda opción con sus números solo si la config la trae.
  const defOpt = config ? defaultPlanOption(config) : undefined;
  const lede =
    altOpt && defOpt
      ? t.ledeAlt(
          defOpt.installments,
          altOpt.installments,
          formatBps(altOpt.interestTotalBps, locale),
          altOpt.provisional,
        )
      : t.lede;

  // Plazo de cobro elegido por el comercio (el mock siembra "immediate"); sin
  // cuenta en el modo activo el chip simplemente no sale.
  const settlement =
    config && merchantQ.data
      ? settlementOptionOf(config, merchantQ.data.settlementId ?? "immediate")
      : undefined;

  return (
    <div className={styles.page} data-testid="merchant-profile">
      <Link href="/comercio" className={styles.back}>
        <span aria-hidden>←</span> {tm.backToMarketplace}
      </Link>

      <p className={styles.banner} role="note">
        {t.demoBanner}
        <span className={styles.merchant}>
          {t.merchantLabel} <b>{merchantQ.data?.name ?? m.name}</b>
          <ReferenceTag>{t.simulated}</ReferenceTag>
        </span>
      </p>

      <header className={styles.head}>
        <div className={styles.headBrand}>
          <div className={styles.brandVisual}>
            <Image
              src={m.image}
              alt=""
              width={88}
              height={88}
              priority
              className={styles.brandPhoto}
            />
            <span
              aria-hidden
              className={styles.brandMonogram}
              style={{ ["--mg" as string]: category ? CATEGORY_MONOGRAM[category.id] : undefined }}
            >
              {m.name.trim().charAt(0).toUpperCase()}
            </span>
          </div>
          <div className={styles.headText}>
            <h1 className={styles.title}>{m.name}</h1>
            <div className={styles.merchantChips}>
              {category ? <Chip>{category.label[locale]}</Chip> : null}
              <Chip>{m.city}</Chip>
              {settlement ? (
                <Chip>
                  {settlement.days === 0
                    ? tm.settlementNow
                    : tm.settlementIn(settlement.days)}
                </Chip>
              ) : null}
              <Chip on>{tm.demoTag}</Chip>
              {m.featured ? <Chip>{tm.featuredTag}</Chip> : null}
            </div>
            <p className={styles.merchantDesc}>{m.description[locale]}</p>
            <p className={styles.lede}>{lede}</p>
          </div>
        </div>
        {mounted && student && (tier !== undefined || margin) ? (
          <div className={styles.headMeta}>
            {tier !== undefined ? <Chip on>{t.yourTier(tier)}</Chip> : null}
            {margin ? (
              <p className={styles.marginLine}>
                <span className={styles.marginTrack} aria-hidden>
                  <span
                    className={styles.marginFill}
                    style={{
                      transform: `scaleX(${
                        margin.limit > 0 ? Math.min(1, margin.used / margin.limit) : 0
                      })`,
                    }}
                  />
                </span>
                {t.marginLine(
                  fmt(Math.max(0, margin.limit - margin.used), 0),
                  fmt(margin.limit, 0),
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      {mounted && !warming && !student ? (
        <GlassPanel className={`glass-deep ${styles.guest}`}>
          <p className={styles.guestText}>
            <b>
              {t.guestTier(
                config
                  ? formatBps(config.guaranteedTiers[0].downPaymentBps, locale)
                  : "…",
              )}
            </b>
            <span>{t.guestHint}</span>
          </p>
          <span className={styles.guestCta}>
            <WalletButton />
          </span>
        </GlassPanel>
      ) : null}

      {error ? (
        <GlassPanel className={styles.error} role="alert">
          <StateMark state="cracked" />
          <h2 className={styles.errorTitle}>{t.errorTitle}</h2>
          <p className={styles.errorBody}>{t.errorBody}</p>
          <Button variant="secondary" onClick={retry}>
            {t.retry}
          </Button>
        </GlassPanel>
      ) : loading ? (
        <Skeleton t={t} />
      ) : products.length === 0 ? (
        <GlassPanel className={styles.empty} data-testid="merchant-empty-products">
          <StateMark state="dim" />
          <h2 className={styles.emptyTitle}>{t.emptyProductsTitle}</h2>
          <p className={styles.emptyBody}>{t.emptyProductsBody}</p>
          <Link href="/comercio" className={`${buttonClasses("secondary", "sm")} mt-3`}>
            <span aria-hidden>←</span> {tm.backToMarketplace}
          </Link>
        </GlassPanel>
      ) : (
        <div className={styles.grid}>
          {featured
            ? (() => {
                const f = termsFor(featured.id, featured.price);
                return f ? (
                  <ProductCard product={featured} terms={f.terms} badge={f.badge} featured t={t} />
                ) : null;
              })()
            : null}
          <div className={styles.side}>
            {rest.map((p) => {
              const v = termsFor(p.id, p.price);
              return v ? (
                <ProductCard key={p.id} product={p} terms={v.terms} badge={v.badge} t={t} />
              ) : null;
            })}
          </div>
        </div>
      )}

      <p className={styles.moreShops}>
        <span>{t.moreMerchantsLead(m.name)}</span>
        <Link href="/comercio" className={styles.moreLink}>
          {t.moreMerchants}
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
        </Link>
      </p>

      <p className={styles.foot}>{t.footer}</p>
    </div>
  );
}

/** Skeleton del mundo: paneles de vidrio esperando la luz. */
function Skeleton({ t }: { t: Dict }) {
  return (
    <div className={styles.grid} role="status" aria-label={t.loadingAria} aria-busy="true">
      <div className={`glass ${styles.card} ${styles.skel}`}>
        <div className={styles.skelMedia} />
        <div className={styles.skelBody}>
          <div className={styles.skelLine} style={{ width: "42%" }} />
          <div className={styles.skelNum} />
          <div className={styles.skelBeam} />
          <div className={styles.skelLine} style={{ width: "58%" }} />
        </div>
      </div>
      <div className={styles.side}>
        {[0, 1].map((i) => (
          <div key={i} className={`glass ${styles.card} ${styles.skel}`}>
            <div className={styles.skelBody}>
              <div className={styles.skelLine} style={{ width: "48%" }} />
              <div className={styles.skelNum} />
              <div className={styles.skelBeam} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
