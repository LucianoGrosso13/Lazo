"use client";

// Credencial de Tier del comprador: el nivel con su color del espectro,
// los beneficios desbloqueados (anticipo y tope del escalón, cobertura del
// garante) y el progreso honesto al próximo Tier. Todo sale de la config
// del protocolo y de la reputación: ningún número de negocio acá.
import Image from "next/image";
import { GlassPanel } from "@/components/ui/glass";
import { useInView } from "@/components/ui/use-in-view";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { TIERS } from "@/i18n/dictionaries/tiers";
import { useLocale, useT } from "@/i18n/locale";
import {
  formatUsdc,
  type Plan,
  type TierIndex,
  type WalletAddress,
} from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { shortAddr } from "../consulta";
import styles from "./comprador.module.css";
import { tierProgress } from "./tier-progress";

/** Color del escalón dentro del espectro del prisma: violeta → luz de atrás → cyan → verde. */
const TIER_COLOR = [
  "var(--color-violet)",
  "var(--color-backlight)",
  "var(--color-cyan)",
  "var(--color-green)",
] as const;

const pctOf = (bps: number, locale: "es" | "en") =>
  new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(bps / 10_000);

export function TierCard({
  student,
  plans,
}: {
  student: WalletAddress;
  /** Planes ya cargados por la pantalla (undefined = todavía cargando). */
  plans: Plan[] | undefined;
}) {
  const t = useT(cuentas).student;
  const { locale } = useLocale();
  const { ref, entered } = useInView<HTMLElement>();
  const reduced = useReducedMotion();

  const reputationQ = useCuotasQuery(["reputation", student], (c) =>
    c.getReputation(student),
  );
  const configQ = useCuotasQuery(["config"], (c) => c.getConfig());

  const reputation = reputationQ.data;
  const config = configQ.data;
  const ready = reputation !== undefined && config !== undefined && plans !== undefined;

  if (!ready) {
    return (
      <GlassPanel
        className="animate-pulse p-6"
        role="status"
        aria-busy="true"
        aria-label={t.tierCardLabel}
      >
        <div className="h-3 w-40 rounded bg-beam/10" />
        <div className="mt-5 h-10 w-52 rounded bg-beam/10" />
        <div className="mt-6 h-3 w-full rounded bg-beam/5" />
        <div className="mt-3 h-3 w-2/3 rounded bg-beam/5" />
      </GlassPanel>
    );
  }

  // Sin reputación todavía (cuenta sin primera acción): es el Tier inicial,
  // el mismo con el que el programa la crea al primer plan.
  const progress = tierProgress(
    reputation ?? { tier: 0 as TierIndex },
    plans,
    config,
  );
  const tierDef = TIERS[progress.tier] ?? TIERS[0];
  const nextDef =
    progress.nextTier !== null ? (TIERS[progress.nextTier] ?? null) : null;
  const tierParams = config.guaranteedTiers[progress.tier];
  const min = formatUsdc(progress.minFinanced, locale, 0);
  const pct = Math.round(progress.ratio * 100);

  return (
    <section
      ref={ref}
      data-entered={entered && !reduced ? "" : undefined}
      data-testid="tier-card"
      data-tier={tierDef.number}
      aria-label={t.tierCardLabel}
      className={styles.card}
      style={
        {
          "--tier": TIER_COLOR[progress.tier],
          "--tier-next": TIER_COLOR[progress.nextTier ?? progress.tier],
        } as React.CSSProperties
      }
    >
      <span aria-hidden className={styles.stripe} />

      <div className={styles.cardHead}>
        <span className={styles.issuer}>
          {/* Marca del emisor; decorativa, el nombre va en texto */}
          <Image
            src="/brand/logo-prisma.png"
            alt=""
            aria-hidden
            width={480}
            height={320}
          />
          Lazo · {t.tierIssuer}
        </span>
        <span className={styles.tierChip}>{tierDef.label}</span>
      </div>

      <div className={styles.tierRow}>
        <p className={styles.tierNum}>Tier {tierDef.number}</p>
        <p className={styles.tierName}>{tierDef.name}</p>
      </div>

      <dl className={styles.benefits}>
        <div className={styles.benefit}>
          <dt className={styles.benefitKey}>{t.benefitDown}</dt>
          <dd className={styles.benefitVal}>
            {pctOf(tierParams.downPaymentBps, locale)}
          </dd>
        </div>
        <div className={styles.benefit}>
          <dt className={styles.benefitKey}>{t.benefitCap}</dt>
          <dd className={styles.benefitVal}>
            <small>US$</small> {formatUsdc(tierParams.maxPurchase, locale, 0)}
          </dd>
        </div>
        <div className={styles.benefit}>
          <dt className={styles.benefitKey}>{t.benefitCover}</dt>
          <dd className={styles.benefitVal}>
            {pctOf(tierParams.guarantorCoverageBps, locale)}
          </dd>
        </div>
      </dl>

      <div className={styles.next}>
        <div className={styles.nextHead}>
          <p className={styles.nextTitle}>
            {progress.atMax ? t.tierAtMax : t.nextTierTitle}
          </p>
          <p className={styles.nextStep} aria-hidden="true">
            {progress.atMax || !nextDef ? (
              <b>{tierDef.label}</b>
            ) : (
              <>
                <b>{tierDef.short}</b>
                <i>→</i>
                <b>{nextDef.label}</b>
              </>
            )}
          </p>
        </div>
        <div
          className={styles.track}
          role="progressbar"
          aria-label={progress.atMax ? t.tierAtMax : t.nextTierTitle}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={
            progress.atMax ? t.tierAtMax : `${pct}%`
          }
        >
          <div
            className={styles.fill}
            style={{ "--p": progress.ratio } as React.CSSProperties}
          />
        </div>
        <p className={styles.nextCaption}>
          {progress.atMax ? (
            t.tierMaxedBody
          ) : (
            <>
              <strong>{t.progressNeed(min)}</strong>
              {progress.inFlight ? ` ${t.progressInFlight(progress.inFlight.paid, progress.inFlight.total)}` : ""}
            </>
          )}
        </p>
      </div>

      <p className={styles.credNo}>
        <span>{t.paidPlans(reputation?.plansCompleted ?? 0)}</span>
        <b title={student}>{shortAddr(student)}</b>
      </p>
    </section>
  );
}
