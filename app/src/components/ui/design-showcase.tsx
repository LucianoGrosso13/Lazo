"use client";

import { design } from "@/i18n/dictionaries/design";
import { useLocale, useT } from "@/i18n/locale";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { ComparisonBars, Gauge, CollapsibleHistory, AnimatedSteps, Accordion } from "./visual-primitives";
import { BigNumber } from "./count-up-number";

/** Sample values are protocol settings, not claimed usage or traction. */
export function DesignShowcase() {
  const t = useT(design).primitives;
  const { locale } = useLocale();
  const { data: config } = useCuotasQuery(["config"], c => c.getConfig());
  const number = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: 2 });
  if (!config) return <section className="page-shell py-12"><h2 className="text-3xl">{t.title}</h2><p className="mt-4 text-ink-2">{t.loading}</p></section>;
  const pct = (value: number) => `${number.format(value)}%`;
  const tier = config.guaranteedTiers[0];
  const roleNames = [t.buyer, t.merchant, t.pool];
  const roles = ["buyer", "merchant", "pool"] as const;
  return <section aria-label={t.title} className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
    <h2 className="text-4xl font-medium text-balance">{t.title}</h2>
    <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2">{t.intro}</p>
    <p className="mt-3 text-sm text-ink-2">{t.sampleNote}</p>
    <div className="mt-10 grid gap-12">
      {roles.map((role, i) => <section key={role} data-role={role} aria-label={roleNames[i]} className="border-t border-accent pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-3xl text-accent">{roleNames[i]}</h3><span className="rounded-full border border-accent bg-accent-soft px-4 py-2 text-sm text-accent">{t.chip}</span></div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div><h4 className="mb-5 text-lg font-medium">{t.comparison}</h4><ComparisonBars label={t.comparison} items={config.guaranteedTiers.map((item, index) => ({ label: `${t.tier} ${index + 1}`, value: item.downPaymentBps / 100, formattedValue: pct(item.downPaymentBps / 100), winner: index === config.guaranteedTiers.length - 1, winnerLabel: t.preferred }))} /></div>
          <div className="flex min-w-0 flex-wrap items-center justify-around gap-8 bg-accent-soft p-6 rounded-xl">
            <div className="min-w-0"><h4 className="mb-3 text-base">{t.bigNumber}</h4><BigNumber amount={tier.maxPurchase} size="lg" /><p className="mt-3 text-sm text-ink-2">{t.limit}</p></div>
            <Gauge value={tier.guarantorCoverageBps / 100} label={t.gauge} valueLabel={pct(tier.guarantorCoverageBps / 100)} />
          </div>
        </div>
        <div className="mt-10"><h4 className="mb-5 text-lg font-medium">{t.stepsTitle}</h4><AnimatedSteps label={t.stepsTitle} steps={t.steps} /></div>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div><h4 className="mb-3 text-lg font-medium">{t.history}</h4><CollapsibleHistory label={t.history} visibleCount={3} expandLabel={`${t.expand} (${config.guaranteedTiers.length})`} collapseLabel={t.collapse} items={config.guaranteedTiers.map((item, index) => <div key={index} className="flex flex-wrap justify-between gap-2"><span>{t.tier} {index + 1}</span><span>{t.downPayment}: {pct(item.downPaymentBps / 100)}</span></div>)} /></div>
          <div><h4 className="mb-3 text-lg font-medium">{t.accordion}</h4><Accordion label={t.accordion} items={t.faq} /></div>
        </div>
      </section>)}
    </div>
  </section>;
}
