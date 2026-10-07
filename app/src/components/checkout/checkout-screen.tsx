"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useClient } from "@solana/react";
import { useWalletStatus } from "@solana/kit-plugin-wallet/react";
import type { AppClient } from "@/app/providers";
import {
  CuotasError,
  formatUsdc,
  getCuotas,
  planOptionsOf,
  type DemoClock,
  type Guarantee,
  type InstallmentsOption,
  type Merchant,
  type Micro,
  type Plan,
  type Quote,
  type Reputation,
  type SettlementId,
  type WalletAddress,
} from "@/lib/cuotas";
import type { Product } from "@/lib/catalog";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { checkout } from "@/i18n/dictionaries/checkout";
import { useLocale, useT } from "@/i18n/locale";
import { useWalletAddress } from "@/components/wallet-button";
import { useProtocolConfig } from "@/components/landing/use-config";
import { splitPurchase } from "@/components/landing/split";
import type { StageBand } from "@/components/landing/prism-stage";
import { PrismStage3D } from "@/components/landing/prism-stage-3d";
import { SPECTRUM } from "@/components/landing/hero";
import { REFERENCE } from "@/components/landing/reference";
import { GlassPanel } from "@/components/ui/glass";
import { BigNumber } from "@/components/ui/big-number";
import { ReferenceTag } from "@/components/ui/badges";
import { Breakdown, type BreakdownData, type WalletStatus } from "./breakdown";
import { ConfirmPanel } from "./confirm-panel";
import { ConfirmSuccess } from "./confirm-success";
import { bandColor } from "./band-color";
import { pctOfBps } from "./format";
import styles from "./checkout.module.css";

const noopSubscribe = () => () => {};

/**
 * Wallet de la vista previa (solo mock): al cotizar, el mock le crea el
 * escalón 0 con garante de ejemplo — el mismo desglose que anuncia la
 * landing. Nunca se conecta ni firma nada; solo existen cotizaciones.
 */
const PREVIEW_STUDENT: WalletAddress = "LazoVistaPreviaCheckout111111111111111";

const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia("(max-width: 680px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const narrowNow = () => window.matchMedia("(max-width: 680px)").matches;

interface BaseSlice {
  clock: DemoClock;
  merchant: Merchant;
}

interface WalletSlice {
  /** Una cotización por opción de plan habilitada, con el plazo del comercio. */
  quotes: Quote[];
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
  const narrow = useSyncExternalStore(subscribeNarrow, narrowNow, () => false);
  const status = useWalletStatus(client);
  const liveWallet = useWalletAddress();
  const connected = mounted ? liveWallet : null;
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const mock = getCuotas().mode === "mock";

  const wallet = connected ?? (mock ? (demoWallet ?? null) : null);
  const walletStatus: WalletStatus =
    !connected && wallet ? "connected" : mounted ? status : "pending";

  // Opciones de plan de la config (mock: 3 y 6; real: solo la del programa).
  const options = useMemo(
    () => (config ? planOptionsOf(config) : undefined),
    [config],
  );
  const enabledOptions = useMemo(
    () => options?.filter((o) => o.enabled) ?? [],
    [options],
  );

  // El plazo de cobro lo fija el comercio en su cuenta; se muestra como dato
  // y se pasa igual a `quote` y a `openPlan` para que lo cotizado sea lo
  // que se abre (sin plazo, `openPlan` usa el predeterminado del comercio).
  const { data: base } = useCuotasQuery<BaseSlice>(
    ["checkout-base", product.merchant],
    async (c) => {
      const [clock, merchant] = await Promise.all([
        c.getClock(),
        c.getMerchant(product.merchant),
      ]);
      return { clock, merchant };
    },
  );
  const settlement: SettlementId = base?.merchant.settlementId ?? "immediate";

  const [picked, setPicked] = useState<InstallmentsOption>(3);
  // Si la opción elegida desaparece de la config, cae a la primera habilitada.
  const installments: InstallmentsOption = enabledOptions.some(
    (o) => o.installments === picked,
  )
    ? picked
    : enabledOptions[0]?.installments ?? 3;
  const optionsKey = enabledOptions.map((o) => o.installments).join(".");

  const { data: mine } = useCuotasQuery<WalletSlice>(
    wallet && enabledOptions.length
      ? ["checkout-wallet", wallet, product.id, settlement, optionsKey]
      : null,
    async (c) => {
      if (!wallet) throw new CuotasError("not_found", "sin wallet");
      // Estudiante sin Reputation on-chain: primera compra. No es error de
      // la query — openPlan la crea en la misma transacción.
      const [quotes, guarantee, reputation, plans] = await Promise.all([
        Promise.all(
          enabledOptions.map((o) =>
            c.quote(product.price, wallet, {
              installments: o.installments,
              settlement,
            }),
          ),
        ),
        c.getGuarantee(wallet),
        c.getReputation(wallet).catch((e) => {
          if (e instanceof CuotasError && e.code === "not_found") return null;
          throw e;
        }),
        c.getPlans(wallet),
      ]);
      return { quotes, guarantee, reputation, plans };
    },
  );

  // Vista previa sin wallet (solo mock): cotiza con una wallet de ejemplo —
  // escalón 0 con garante, igual que el split que mostraba la landing.
  const { data: preview } = useCuotasQuery<Quote[]>(
    !wallet && mock && enabledOptions.length
      ? ["checkout-preview", product.id, settlement, optionsKey]
      : null,
    (c) =>
      Promise.all(
        enabledOptions.map((o) =>
          c.quote(product.price, PREVIEW_STUDENT, {
            installments: o.installments,
            settlement,
          }),
        ),
      ),
  );

  const quotes = mine?.quotes ?? preview;

  const data: BreakdownData | null = useMemo(() => {
    const q = quotes?.find((x) => x.installmentsCount === installments);
    if (q) {
      return {
        price: q.price,
        tier: q.tier,
        downPayment: q.downPayment,
        installments: q.installments,
        interest: q.interest,
        interestTotalBps: q.interestTotalBps,
        total: q.total,
        merchantReceives: q.merchantReceives,
        merchantAdvance: q.merchantAdvance,
        merchantPending: q.merchantPending,
        settlementDays: q.settlementDays,
        installmentsCount: q.installmentsCount,
        provisional: q.provisional,
        eligible: q.eligible,
        reasons: q.reasons,
        withGuarantee: q.withGuarantee,
        activeExposure: mine?.reputation?.activeExposure ?? 0,
      };
    }
    // Modo real sin wallet: la config no trae opciones, cae al reparto de
    // siempre (3 cuotas, cobro inmediato con `feeBps`). En mock se espera la
    // cotización de la vista previa: `splitPurchase` no sabe de opciones.
    if (!wallet && !mock && config) {
      const s = splitPurchase(config, product.price, 0);
      return {
        price: s.price,
        tier: s.tier,
        downPayment: s.downPayment,
        installments: s.installments,
        interest: 0,
        interestTotalBps: 0,
        total: s.price,
        merchantReceives: s.merchantReceives,
        merchantAdvance: s.merchantReceives,
        merchantPending: 0,
        settlementDays: 0,
        installmentsCount: s.installments.length,
        provisional: false,
        eligible: s.withinTier,
        reasons: s.withinTier ? [] : ["exceeds_tier_max"],
        withGuarantee: true,
      };
    }
    return null;
  }, [quotes, installments, wallet, mock, config, product.price, mine?.reputation?.activeExposure]);

  const bands: StageBand[] = useMemo(() => {
    if (!data) return [];
    const n = 1 + data.installments.length;
    return [
      {
        id: "down",
        label: t.stageDown,
        value: `US$ ${fmt(data.downPayment)}`,
        amount: data.downPayment,
        color: bandColor(SPECTRUM, 0, n),
      },
      ...data.installments.map((amount, i) => ({
        id: `c${i + 1}`,
        label: t.installment(i + 1),
        value: `US$ ${fmt(amount)}`,
        amount,
        color: bandColor(SPECTRUM, i + 1, n),
      })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, t, locale]);

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
        merchant: product.merchant,
        price: product.price,
        productId: product.id,
        // Mismo plazo que la cotización mostrada: lo cotizado es lo abierto.
        installments,
        settlement,
      });
      setOpened({ plan: res.value, signature: res.signature });
      setStep("success");
    } catch (e) {
      setSignError(e instanceof CuotasError ? e : new CuotasError("not_found"));
    } finally {
      setOpening(false);
    }
  };

  const quoteSel = quotes?.find((x) => x.installmentsCount === installments);
  const cracked = walletStatus === "connected" && !!quoteSel && !quoteSel.eligible;
  const mpTotal = Math.round(product.price * (1 + REFERENCE.mpInstallmentMarkup));
  const lazoTotal = data?.total ?? product.price;
  const savings = Math.max(0, mpTotal - lazoTotal);
  const merchantName = base?.merchant.name ?? t.confirm.merchantFallback;

  return (
    <div className={styles.page}>
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
              merchantName={merchantName}
            />
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              <div>
                {data ? (
                  <>
                    <div className={styles.stageCrop}>
                      <div className={styles.stageWide}>
                        <PrismStage3D
                          inputLabel={t.price}
                          inputValue={`US$ ${fmt(product.price, 0)}`}
                          bands={bands}
                          cracked={cracked}
                          labelsPlacement={narrow ? "below" : "overlay"}
                          ariaLabel={t.stageAria(
                            fmt(product.price, 0),
                            fmt(data.downPayment),
                            fmt(data.installments[0] ?? 0),
                            data.installments.length,
                          )}
                        />
                      </div>
                    </div>
                    {narrow ? (
                      <ol className={styles.bandList} aria-hidden>
                        {bands.map((b) => (
                          <li
                            key={b.id}
                            className={styles.bandItem}
                            style={{ ["--band" as string]: b.color }}
                          >
                            <span className={styles.bandDot} aria-hidden />
                            <span className={styles.bandKey}>{b.label}</span>
                            <span className={styles.bandVal}>{b.value}</span>
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </>
                ) : (
                  <div className={styles.stageSkeleton} />
                )}
                <p className={styles.stageNote}>{t.demoNote}</p>
              </div>

              {step === "confirm" && quoteSel && mine ? (
                <div className={styles.enter}>
                  <ConfirmPanel
                    quote={quoteSel}
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
                  merchantName={merchantName}
                  planPicker={
                    options && options.length > 1
                      ? {
                          options,
                          quotes,
                          value: installments,
                          onChange: (n) => setPicked(n),
                        }
                      : undefined
                  }
                  onConfirm={quoteSel && mine ? () => setStep("confirm") : undefined}
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
                  <span className={styles.compareWho}>
                    {t.lazoPlan(data?.installmentsCount ?? installments)}
                  </span>
                  <span className={styles.compareTrack} aria-hidden>
                    <span
                      className={styles.beamLazo}
                      style={{ transform: `scaleX(${lazoTotal / mpTotal})` }}
                    />
                  </span>
                  <span className={styles.compareNum}>
                    US$ {fmt(lazoTotal, 0)}{" "}
                    <small>
                      ·{" "}
                      {data && data.interestTotalBps > 0
                        ? t.plans.interestTotal(pctOfBps(data.interestTotalBps, locale))
                        : t.interestFree}
                    </small>
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
    </div>
  );
}
