"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
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
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { BigNumber } from "@/components/ui/big-number";
import { ReferenceTag } from "@/components/ui/badges";
import { Breakdown, type BreakdownData, type WalletStatus } from "./breakdown";
import { ConfirmPanel } from "./confirm-panel";
import { ConfirmSuccess } from "./confirm-success";
import styles from "./checkout.module.css";

const noopSubscribe = () => () => {};

interface BaseSlice {
  clock: DemoClock;
  merchant: Merchant;
}

interface WalletSlice {
  quote: Quote;
  guarantee: Guarantee | null;
  reputation: Reputation | null;
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
      // Estudiante sin Reputation on-chain: primera compra. No es error de
      // la query — openPlan la crea en la misma transacción.
      const [quote, guarantee, reputation, plans] = await Promise.all([
        c.quote(product.price, wallet),
        c.getGuarantee(wallet),
        c.getReputation(wallet).catch((e) => {
          if (e instanceof CuotasError && e.code === "not_found") return null;
          throw e;
        }),
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

  // Flujo del panel: desglose → confirmación → éxito.
  const [step, setStep] = useState<"review" | "confirm" | "success">("review");
  const [opening, setOpening] = useState(false);
  const [signError, setSignError] = useState<CuotasError | null>(null);
  const [opened, setOpened] = useState<{ plan: Plan; signature: string } | null>(null);

  // Si cambia la wallet, el flujo vuelve al desglose.
  const [prevWallet, setPrevWallet] = useState(wallet);
  if (prevWallet !== wallet) {
    setPrevWallet(wallet);
    setStep("review");
    setOpened(null);
    setSignError(null);
  }

  const sign = async () => {
    if (!wallet || opening) return;
    setOpening(true);
    setSignError(null);
    try {
      const res = await getCuotas().openPlan({
        student: wallet,
        merchant: DEMO_MERCHANT,
        price: product.price,
        productId: product.id,
      });
      setOpened({ plan: res.value, signature: res.signature });
      setStep("success");
    } catch (e) {
      setSignError(e instanceof CuotasError ? e : new CuotasError("not_found"));
    } finally {
      setOpening(false);
    }
  };

  const cracked = walletStatus === "connected" && !!mine && !mine.quote.eligible;
  const mpTotal = Math.round(product.price * (1 + REFERENCE.mpInstallmentMarkup));
  const lazoTotal = data?.total ?? product.price;
  const savings = Math.max(0, mpTotal - lazoTotal);

  return (
    <Fade className={styles.page} initialOpacity={0.96} transition={{ duration: 0.24 }}>
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

        {step === "success" && opened ? (
          <div className={styles.enter}>
            <ConfirmSuccess
              plan={opened.plan}
              signature={opened.signature}
              merchantName={base?.merchant.name ?? t.confirm.merchantFallback}
            />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              <div>
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

              {step === "confirm" && mine ? (
                <div className={styles.enter}>
                  <ConfirmPanel
                    quote={mine.quote}
                    merchant={base?.merchant}
                    clock={base?.clock}
                    opening={opening}
                    error={signError}
                    onBack={() => {
                      setStep("review");
                      setSignError(null);
                    }}
                    onSign={sign}
                  />
                </div>
              ) : data ? (
                <Breakdown
                  data={data}
                  guarantee={mine?.guarantee ?? null}
                  clock={base?.clock}
                  config={config}
                  walletStatus={walletStatus}
                  onConfirm={mine ? () => setStep("confirm") : undefined}
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
                      style={{ transform: `scaleX(${lazoTotal / mpTotal})` }}
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
          </>
        )}
      </div>
    </Fade>
  );
}
