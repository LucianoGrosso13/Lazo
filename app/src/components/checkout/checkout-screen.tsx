"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useClient } from "@solana/react";
import { useWalletStatus } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import {
  CuotasError,
  DEMO_MERCHANT,
  formatUsdc,
  getCuotas,
  type DemoClock,
  type Guarantee,
  type Merchant,
  type Micro,
  type Plan,
  type Quote,
  type Reputation,
} from "@/lib/cuotas";
import type { Product } from "@/lib/catalog";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { useLocale, useT } from "@/i18n/locale";
import { useWalletAddress } from "@/components/wallet-button";
import { useProtocolConfig } from "@/components/landing/use-config";
import { splitPurchase } from "@/components/landing/split";
import { PrismStage, type StageBand } from "@/components/landing/prism-stage";
import { SPECTRUM } from "@/components/landing/hero";
import { REFERENCE } from "@/components/landing/reference";
import { GlassPanel } from "@/components/ui/glass";
import { BigNumber } from "@/components/ui/big-number";
import { ReferenceTag } from "@/components/ui/badges";
import { Breakdown, type BreakdownData, type WalletStatus } from "./breakdown";
import styles from "./checkout.module.css";

const noopSubscribe = () => () => {};

interface BaseSlice {
  clock: DemoClock;
  merchant: Merchant;
}

interface WalletSlice {
  quote: Quote;
  guarantee: Guarantee | null;
  reputation: Reputation;
  plans: Plan[];
}

export function CheckoutScreen({
  product,
  demoWallet,
}: {
  product: Product;
  /** Solo modo mock: trata esa dirección como la wallet conectada (capturas y demo sin Phantom). */
  demoWallet?: string | null;
}) {
  const t = useT(checkout);
  const { locale } = useLocale();
  const config = useProtocolConfig();
  const client = useClient<AppClient>();
  // La wallet solo existe en el navegador: hasta montar se muestra "pending"
  // para que el HTML del servidor y la hidratación coincidan.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const status = useWalletStatus(client);
  const liveWallet = useWalletAddress();
  const connected = mounted ? liveWallet : null;
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);

  const wallet = connected ?? (getCuotas().mode === "mock" ? (demoWallet ?? null) : null);
  const walletStatus: WalletStatus =
    !connected && wallet ? "connected" : mounted ? status : "pending";

  const { data: base } = useCuotasQuery<BaseSlice>(["checkout-base"], async (c) => {
    const [clock, merchant] = await Promise.all([c.getClock(), c.getMerchant(DEMO_MERCHANT)]);
    return { clock, merchant };
  });

  const { data: mine } = useCuotasQuery<WalletSlice>(
    wallet ? ["checkout-wallet", wallet, product.id] : null,
    async (c) => {
      if (!wallet) throw new CuotasError("not_found", "sin wallet");
      const [quote, guarantee, reputation, plans] = await Promise.all([
        c.quote(product.price, wallet),
        c.getGuarantee(wallet),
        c.getReputation(wallet),
        c.getPlans(wallet),
      ]);
      return { quote, guarantee, reputation, plans };
    },
  );

  const data: BreakdownData | null = useMemo(() => {
    if (mine) {
      const q = mine.quote;
      return {
        price: q.price,
        tier: q.tier,
        downPayment: q.downPayment,
        installments: q.installments,
        total: q.total,
        merchantReceives: q.merchantReceives,
        eligible: q.eligible,
        reasons: q.reasons,
        withGuarantee: q.withGuarantee,
      };
    }
    if (config) {
      const s = splitPurchase(config, product.price, 0);
      return {
        price: s.price,
        tier: s.tier,
        downPayment: s.downPayment,
        installments: s.installments,
        total: s.price,
        merchantReceives: s.merchantReceives,
        eligible: s.withinTier,
        reasons: s.withinTier ? [] : ["exceeds_tier_max"],
        withGuarantee: true,
      };
    }
    return null;
  }, [mine, config, product.price]);

  const bands: StageBand[] = data
    ? [
        {
          id: "down",
          label: t.stageDown,
          value: `US$ ${fmt(data.downPayment)}`,
          amount: data.downPayment,
          color: SPECTRUM[0],
        },
        ...data.installments.map((amount, i) => ({
          id: `c${i + 1}`,
          label: t.installment(i + 1),
          value: `US$ ${fmt(amount)}`,
          amount,
          color: SPECTRUM[i + 1] ?? SPECTRUM[3],
        })),
      ]
    : [];

  const cracked = walletStatus === "connected" && !!mine && !mine.quote.eligible;
  const mpTotal = Math.round(product.price * (1 + REFERENCE.mpInstallmentMarkup));
  const lazoTotal = data?.total ?? product.price;
  const savings = Math.max(0, mpTotal - lazoTotal);

  return (
    <section className={styles.page}>
      <div className={styles.wrap}>
        <Link href="/tienda" className={styles.back}>
          <svg
            aria-hidden
            viewBox="0 0 14 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-2.5 w-3.5"
          >
            <path d="M13 5H1.5M6 1 1.5 5 6 9" />
          </svg>
          {t.back}
        </Link>

        <header className={styles.head}>
          <div>
            <h1 className={styles.headTitle}>{product.name[locale]}</h1>
            <p className={styles.headBlurb}>{product.blurb[locale]}</p>
          </div>
          <div className={styles.headPrice}>
            <span className={styles.headKey}>{t.price}</span>
            <BigNumber amount={product.price} size="lg" decimals={0} />
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.stageCol}>
            {data ? (
              <div className={styles.stageCrop}>
                <div className={styles.stageWide}>
                  <PrismStage
                    inputLabel={t.price}
                    inputValue={`US$ ${fmt(product.price, 0)}`}
                    bands={bands}
                    cracked={cracked}
                    ariaLabel={t.stageAria(
                      fmt(product.price, 0),
                      fmt(data.downPayment),
                      fmt(data.installments[0] ?? 0),
                    )}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.stageSkeleton} />
            )}
            <p className={styles.stageNote}>{t.demoNote}</p>
          </div>

          {data ? (
            <Breakdown
              data={data}
              guarantee={mine?.guarantee ?? null}
              clock={base?.clock}
              config={config}
              walletStatus={walletStatus}
            />
          ) : (
            <GlassPanel className={styles.panel} aria-busy>
              <div className={styles.sk} style={{ height: "1.1rem", width: "42%" }} />
              <div className={styles.sk} style={{ height: "0.85rem" }} />
              <div className={styles.sk} style={{ height: "0.85rem" }} />
              <div className={styles.sk} style={{ height: "0.85rem", width: "70%" }} />
              <div className={styles.sk} style={{ height: "2.4rem" }} />
            </GlassPanel>
          )}
        </div>

        <section className={styles.compare} aria-label={t.compareTitle}>
          <h2 className={styles.compareTitle}>{t.compareTitle}</h2>
          <div className={styles.compareRows}>
            <div className={styles.compareRow}>
              <span className={styles.compareWho}>{t.lazo}</span>
              <span className={styles.compareTrack} aria-hidden>
                <span
                  className={styles.beamLazo}
                  style={{ width: `${(lazoTotal / mpTotal) * 100}%` }}
                />
              </span>
              <span className={styles.compareNum}>
                US$ {fmt(lazoTotal, 0)} <small>· {t.interestFree}</small>
              </span>
            </div>
            <div className={styles.compareRow}>
              <span className={styles.compareWho}>{t.mp}</span>
              <span className={styles.compareTrack} aria-hidden>
                <span className={styles.beamAlt} />
              </span>
              <span className={styles.compareNum}>
                ~US$ {fmt(mpTotal, 0)}{" "}
                <small>
                  <ReferenceTag>{t.reference}</ReferenceTag>
                </small>
              </span>
            </div>
          </div>
          <p className={styles.savings}>
            {t.savingsLead}{" "}
            <BigNumber
              amount={savings}
              size="lg"
              decimals={0}
              className={styles.savingsNum}
            />
          </p>
        </section>
      </div>
    </section>
  );
}
