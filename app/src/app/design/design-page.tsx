"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { toMicro, formatUsdc, type TierIndex } from "@/lib/cuotas";
import { CATALOG } from "@/lib/catalog";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { design } from "@/i18n/dictionaries/design";
import { useLocale, useT } from "@/i18n/locale";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { BigNumber } from "@/components/ui/big-number";
import { Button } from "@/components/ui/button";
import { Chip, ChipButton, SegmentedControl } from "@/components/ui/chip";
import { DevnetBadge, ExplorerLink, ReferenceTag } from "@/components/ui/badges";
import { Prism } from "@/components/prism/prism";
import type { BandMark } from "@/components/prism/layout";
import { demoSplit } from "./split";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-beam/8 py-14 first:border-0 first:pt-4">
      <h2 className="text-3xl font-medium tracking-[-0.015em] text-beam sm:text-4xl">{title}</h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Swatch({ name, className = "", style }: { name: string; className?: string; style?: CSSProperties }) {
  return (
    <div>
      <div
        className={`h-16 rounded-xl border border-beam/10 shadow-[inset_0_1px_0_rgb(244_241_255/0.15)] ${className}`}
        style={style}
      />
      <p className="mt-2 font-num text-measure uppercase text-ink-3">{name}</p>
    </div>
  );
}

const MARKS: MarkState[] = ["dim", "lit", "etched", "cracked", "refilled"];
const MOCK_SIG = "5uHGv8sP3xLazoDemoFakeSignature9kQmNw4rTy2";
/** Cifra de terceros (PRODUCT.md): ~1.290 por cada 1.000. Va con ReferenceTag. */
const MP_TOTAL_FACTOR = 1.29;

export function DesignPage() {
  const t = useT(design);
  const { locale } = useLocale();
  const [tier, setTier] = useState<TierIndex>(0);
  const [priceUsd, setPriceUsd] = useState(1000);
  const [q2Mark, setQ2Mark] = useState<"none" | BandMark>("none");
  const [chipDemo, setChipDemo] = useState(false);
  const { data: config } = useCuotasQuery(["config"], (c) => c.getConfig());

  const price = toMicro(priceUsd);
  const split = config
    ? demoSplit(price, config.guaranteedTiers[tier], config.installmentsCount)
    : null;

  const prismBands = useMemo(
    () =>
      split
        ? [
            { id: "down", label: t.prism.down, amount: split.down, kind: "down" as const },
            ...split.installments.map((amount, i) => ({
              id: `q${i + 1}`,
              label: `${t.prism.installment} ${i + 1}`,
              amount,
              kind: "installment" as const,
            })),
          ]
        : [],
    [split, t],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <header className="max-w-3xl">
        <h1 className="text-5xl font-medium tracking-[-0.02em] text-beam sm:text-6xl">
          {t.title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">{t.intro}</p>
      </header>

      {/* ------------------------- Luz y suelo ------------------------- */}
      <Section title={t.sections.light}>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <Swatch name={t.light.abyss} className="bg-abyss" />
          <Swatch
            name={t.light.spectrum}
            style={{
              background:
                "linear-gradient(90deg, var(--color-violet), var(--color-cyan), var(--color-green))",
            }}
          />
          <Swatch name={t.light.beam} className="bg-beam" />
          <Swatch name={t.light.ash} className="bg-ash" />
          <Swatch
            name={t.light.inks}
            style={{
              background:
                "linear-gradient(90deg, var(--color-ink) 0 33%, var(--color-ink-2) 33% 66%, var(--color-ink-3) 66%)",
            }}
          />
          <Swatch
            name="crack · backlight"
            style={{
              background:
                "linear-gradient(90deg, var(--color-crack) 0 50%, var(--color-backlight) 50%)",
            }}
          />
        </div>
        <p className="mt-6 max-w-2xl text-ink-3">{t.light.note}</p>
      </Section>

      {/* ------------------------- Tipografías -------------------------- */}
      <Section title={t.sections.type}>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="p-7">
            <p className="font-display text-4xl leading-tight text-beam">{t.type.sample}</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">{t.type.display}</p>
          </GlassPanel>
          <GlassPanel className="flex flex-col justify-center p-7">
            <p className="font-num text-4xl tracking-[-0.02em] text-beam">0123456789,30%</p>
            <p className="mt-2 font-num text-measure uppercase text-cyan">{t.type.sampleNum}</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-2">{t.type.num}</p>
          </GlassPanel>
        </div>
      </Section>

      {/* --------------------------- Vidrio ----------------------------- */}
      <Section title={t.sections.glass}>
        <div className="grid gap-6 lg:grid-cols-5">
          <GlassPanel className="p-7 lg:col-span-2">
            <h3 className="font-num text-measure uppercase text-ink-3">{t.glass.panelTitle}</h3>
            <p className="mt-4 leading-relaxed text-ink-2">{t.glass.panelBody}</p>
          </GlassPanel>
          <GlassSlab className="min-h-44 lg:col-span-3">
            <div className="flex h-full flex-col justify-center p-8">
              <h3 className="font-num text-measure uppercase text-ink-3">{t.glass.slabTitle}</h3>
              <p className="mt-4 max-w-md leading-relaxed text-ink-2">{t.glass.slabBody}</p>
            </div>
          </GlassSlab>
        </div>
      </Section>

      {/* --------------------- Marcas de estado -------------------------- */}
      <Section title={t.sections.states}>
        <p className="mb-8 max-w-2xl text-ink-3">{t.states.caption}</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="p-6">
            <ul className="divide-y divide-beam/6">
              {MARKS.map((state) => (
                <li key={state} className="flex items-center gap-4 py-3.5">
                  <StateMark state={state} title={t.states[state]} />
                  <span className="w-32 shrink-0 text-beam sm:w-36">{t.states[state]}</span>
                  <StateMark state={state} variant="bar" className="min-w-0 flex-1" />
                </li>
              ))}
            </ul>
          </GlassPanel>
          <GlassPanel className="p-6" aria-label={t.states.noColor}>
            <p className="mb-2 font-num text-measure uppercase text-ink-3">{t.states.noColor}</p>
            <ul className="divide-y divide-beam/6 [filter:grayscale(1)]">
              {MARKS.map((state) => (
                <li key={state} className="flex items-center gap-4 py-3.5">
                  <StateMark state={state} title={t.states[state]} />
                  <span className="w-32 shrink-0 text-beam sm:w-36">{t.states[state]}</span>
                  <StateMark state={state} variant="bar" className="min-w-0 flex-1" />
                </li>
              ))}
            </ul>
          </GlassPanel>
        </div>
      </Section>

      {/* ------------------------- Números -------------------------------- */}
      <Section title={t.sections.numbers}>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-5">
            <BigNumber amount={price} size="display" />
            <div>
              <BigNumber amount={split?.installments[0] ?? 0} size="lg" />
              <span className="ml-3 font-num text-measure uppercase text-ink-3">
                × 3 {t.numbers.installment}
              </span>
            </div>
          </div>
          {split && (
            <GlassPanel className="min-w-0 p-6 font-num">
              <dl className="space-y-2.5 text-right text-[0.9375rem]">
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-3">{t.prism.input}</dt>
                  <dd className="text-beam">
                    <BigNumber amount={price} size="sm" />
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-ink-3">{t.prism.down}</dt>
                  <dd className="text-violet">
                    <BigNumber amount={split.down} size="sm" currency="none" />
                  </dd>
                </div>
                {split.installments.map((inst, i) => (
                  <div key={i} className="flex items-baseline justify-between">
                    <dt className="text-ink-3">
                      {t.prism.installment} {i + 1}
                    </dt>
                    <dd className="text-cyan">
                      <BigNumber amount={inst} size="sm" currency="none" />
                    </dd>
                  </div>
                ))}
              </dl>
              <hr className="beam-line my-4" />
              <p className="text-[0.8125rem] leading-relaxed text-ink-3">{t.numbers.totalNote}</p>
            </GlassPanel>
          )}
        </div>
        <div className="mt-8">
          <SegmentedControl
            label={t.prism.tier}
            value={String(tier)}
            onChange={(v) => setTier(Number(v) as TierIndex)}
            options={[
              { value: "0", label: "0 · 30%" },
              { value: "1", label: "1 · 20%" },
              { value: "2", label: "2 · 10%" },
              { value: "3", label: "3 · 0%" },
            ]}
          />
        </div>
      </Section>

      {/* ------------------------- Controles ------------------------------ */}
      <Section title={t.sections.controls}>
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button>{t.controls.primary}</Button>
            <Button variant="secondary">{t.controls.secondary}</Button>
            <Button variant="ghost">{t.controls.ghost}</Button>
            <Button variant="secondary" disabled>
              {t.controls.disabled}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {CATALOG.map((p, i) => (
              <Chip key={p.id} on={i === 0}>
                {p.name[locale]} · US${formatUsdc(p.price, locale, 0)}
              </Chip>
            ))}
            <ChipButton on={chipDemo} onClick={() => setChipDemo((v) => !v)}>
              {t.controls.chipToggle}
            </ChipButton>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <DevnetBadge />
            <ExplorerLink signature={MOCK_SIG} />
            <ReferenceTag />
          </div>
        </div>
      </Section>

      {/* -------------------------- El prisma --------------------------- */}
      <Section title={t.sections.prism}>
        <p className="mb-6 max-w-2xl text-ink-3">{t.prism.demoNote}</p>
        {split && (
          <>
            <Prism
              input={{ label: t.prism.input, amount: price }}
              bands={prismBands}
              comparison={{ label: t.prism.comparison, amount: Math.round(price * MP_TOTAL_FACTOR) }}
              state={q2Mark === "none" ? {} : { q2: q2Mark }}
              summary={t.prism.ariaSummary}
            />
            <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
              <label className="block min-w-0">
                <span className="font-num text-measure uppercase text-ink-3">{t.prism.price}</span>
                <span className="ml-3 font-num text-beam">US$ {formatUsdc(price, locale, 0)}</span>
                <input
                  type="range"
                  min={120}
                  max={1500}
                  step={10}
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(Number(e.target.value))}
                  aria-label={t.prism.price}
                  className="mt-3 block w-56 max-w-full accent-[#00C2FF]"
                />
              </label>
              <SegmentedControl
                label={t.prism.tier}
                value={String(tier)}
                onChange={(v) => setTier(Number(v) as TierIndex)}
                options={[
                  { value: "0", label: "0 · 30%" },
                  { value: "1", label: "1 · 20%" },
                  { value: "2", label: "2 · 10%" },
                  { value: "3", label: "3 · 0%" },
                ]}
              />
              <SegmentedControl
                label={t.prism.state}
                value={q2Mark}
                onChange={(v) => setQ2Mark(v as "none" | BandMark)}
                options={[
                  { value: "none", label: t.prism.marks.none },
                  { value: "cracked", label: t.prism.marks.cracked },
                  { value: "refilled", label: t.prism.marks.refilled },
                  { value: "etched", label: t.prism.marks.etched },
                ]}
              />
              <p className="max-w-xs text-[0.8125rem] leading-relaxed text-ink-3">
                {t.prism.comparisonNote} <ReferenceTag />
              </p>
            </div>
          </>
        )}
      </Section>

      <p className="mt-16 font-num text-measure uppercase text-ink-ghost">{t.footerNote}</p>
    </div>
  );
}
