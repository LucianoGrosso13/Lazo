"use client";

import { useSyncExternalStore } from "react";
import { useClient } from "@solana/react";
import { useWalletStatus } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import { productsByMerchant } from "@/lib/catalog";
import {
  CuotasError,
  DEMO_MERCHANT,
  formatUsdc,
  getCuotas,
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
import { useLocale, useT } from "@/i18n/locale";
import { useWalletAddress, WalletButton } from "@/components/wallet-button";
import { GlassPanel } from "@/components/ui/glass";
import { ReferenceTag } from "@/components/ui/badges";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { StateMark } from "@/components/ui/state-mark";
import { ProductCard, type ProductTerms } from "./product-card";
import styles from "./store.module.css";

const noopSubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

// La tienda muestra solo los productos de Voltia (comercio del guion de
// la demo). El resto del catálogo se descubre en el marketplace /comercio.
const TIENDA_PRODUCTS = productsByMerchant(DEMO_MERCHANT);

interface WalletView {
  guarantee: Guarantee | null;
  reputation: Reputation | null;
  quotes: Record<string, Quote>;
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
  }
}

export function TiendaPage() {
  const t = useT(tienda);
  const { locale } = useLocale();
  const client = useClient<AppClient>();
  const status = useWalletStatus(client);
  const address = useWalletAddress();
  const mounted = useMounted();
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);

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

  const merchantQ = useCuotasQuery(["merchant"], (c) => c.getMerchant(DEMO_MERCHANT));

  const walletQ = useCuotasQuery(
    mounted && student ? ["tienda", student] : null,
    async (c): Promise<WalletView> => {
      // La key solo se activa con un estudiante efectivo: student no es null acá.
      const who = student ?? "";
      const [guarantee, reputation, ...quotes] = await Promise.all([
        c.getGuarantee(who),
        // Estudiante sin Reputation on-chain todavía: primera compra, margen intacto.
        c.getReputation(who).catch((e) => {
          if (e instanceof CuotasError && e.code === "not_found") return null;
          throw e;
        }),
        ...TIENDA_PRODUCTS.map((p) => c.quote(p.price, who)),
      ]);
      return {
        guarantee,
        reputation,
        quotes: Object.fromEntries(TIENDA_PRODUCTS.map((p, i) => [p.id, quotes[i]])),
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
      return {
        terms: { tier: q.tier, downPayment: q.downPayment, installments: q.installments, blocked: q.reasons[0] ?? null },
        badge: badgeText(q, true, walletQ.data.guarantee, exposure, config, t, fmt),
      };
    }
    // Sin wallet: cotiza el escalón 0 (la misma cuenta que `quote()`).
    const s = splitPurchase(config, price, 0);
    return {
      terms: { tier: 0, downPayment: s.downPayment, installments: s.installments, blocked: s.withinTier ? null : "exceeds_tier_max" },
      badge: badgeText(null, s.withinTier, null, 0, config, t, fmt),
    };
  };

  const [featured, ...rest] = TIENDA_PRODUCTS;
  const featuredQuote = walletQ.data?.quotes[featured.id];
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

  return (
    <div className={styles.page}>
      <p className={styles.banner} role="note">
        {t.demoBanner}
        <span className={styles.merchant}>
          {t.merchantLabel} <b>{merchantQ.data?.name ?? "…"}</b>
          <ReferenceTag>{t.simulated}</ReferenceTag>
        </span>
      </p>

      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.lede}>{t.lede}</p>
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
            <b>{t.guestTier}</b>
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
      ) : (
        <div className={styles.grid}>
          {(() => {
            const f = termsFor(featured.id, featured.price);
            return f ? (
              <ProductCard product={featured} terms={f.terms} badge={f.badge} featured t={t} />
            ) : null;
          })()}
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
