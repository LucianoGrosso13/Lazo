"use client";

import type { ReactNode } from "react";
import { audienceCommon } from "@/i18n/dictionaries/audience-common";
import { useT } from "@/i18n/locale";

/**
 * Primitivas de página por audiencia. Los tickets 09–11 las componen y solo
 * escriben textos (un diccionario por página en `i18n/dictionaries/`).
 *
 * Uso mínimo:
 *
 *   <div className="page-shell py-12">
 *     <AudienceHero eyebrow={t.eyebrow} title={t.title} lede={t.lede}>
 *       <Link className={buttonClasses("primary")} href="/comercio">…</Link>
 *     </AudienceHero>
 *     <AudienceSection title={t.secTitle}>
 *       <StepList steps={t.steps} />
 *       <Callout variant="provisional">{t.note}</Callout>
 *       <Faq items={t.faq} />
 *       <div className="grid gap-4 sm:grid-cols-3">
 *         <StatCard value="…" label="…" note="…" />
 *       </div>
 *     </AudienceSection>
 *   </div>
 */

/** Encabezado de página: etiqueta, título, bajada y los CTAs como children. */
export function AudienceHero({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children?: ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <p className="font-num text-measure uppercase tracking-[0.14em] text-cyan">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-beam sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-ink-2 sm:text-lg">
        {lede}
      </p>
      {children ? <div className="mt-7 flex flex-wrap items-center gap-3">{children}</div> : null}
    </header>
  );
}

/** Sección con título (y bajada opcional). El contenido va como children. */
export function AudienceSection({
  id,
  title,
  intro,
  children,
}: {
  id?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-14 scroll-mt-20 sm:mt-20">
      <h2 className="text-2xl font-semibold tracking-[-0.01em] text-beam sm:text-3xl">
        {title}
      </h2>
      {intro ? (
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2">{intro}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Lista de pasos numerados: orden y número los pone la primitiva. */
export function StepList({
  steps,
  label,
}: {
  steps: { title: ReactNode; body?: ReactNode }[];
  label?: string;
}) {
  const t = useT(audienceCommon);
  return (
    <ol aria-label={label ?? t.stepsLabel} className="grid gap-3">
      {steps.map((step, i) => (
        <li
          key={i}
          className="glass flex items-start gap-4 p-4 sm:p-5"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-hairline font-num text-xs text-cyan"
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-beam">{step.title}</p>
            {step.body ? (
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.body}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** FAQ accesible: <details> nativo, abre con teclado sin JS. */
export function Faq({
  items,
  label,
}: {
  items: { q: ReactNode; a: ReactNode }[];
  label?: string;
}) {
  const t = useT(audienceCommon);
  return (
    <div aria-label={label ?? t.faqLabel}>
      {items.map((item, i) => (
        <details key={i} className="group border-b border-hairline last:border-b-0">
          <summary className="tap flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-beam marker:hidden [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <svg
              aria-hidden
              viewBox="0 0 10 6"
              className="h-1.5 w-2.5 flex-none transition-transform duration-300 group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 1.2 5 4.8 9 1.2" />
            </svg>
          </summary>
          <div className="pb-5 pr-8 text-sm leading-relaxed text-ink-2">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

const CALLOUT_BANDS = {
  provisional: "#c4a3ff",
  demo: "#00c2ff",
  devnet: "#9945ff",
  supuestos: "#c4a3ff",
} as const;

/**
 * Callout de declaración: marca "supuestos" (hipótesis de modelo), "demo"
 * (dato o actor simulado), "devnet" (corre en la red de prueba) o
 * "provisional" (compatibilidad). La etiqueta sale del diccionario
 * compartido; el cuerpo lo escribe cada página.
 */
export function Callout({
  variant,
  title,
  children,
}: {
  variant: keyof typeof CALLOUT_BANDS;
  title?: ReactNode;
  children: ReactNode;
}) {
  const t = useT(audienceCommon);
  return (
    <aside className="glass p-4 sm:p-5">
      <p className="flex items-center gap-2">
        <span
          aria-hidden
          className="app-band-dot"
          style={{ ["--band" as string]: CALLOUT_BANDS[variant] }}
        />
        <span className="chip">{t.callout[variant]}</span>
        {title ? <span className="font-medium text-beam">{title}</span> : null}
      </p>
      <div className="mt-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </aside>
  );
}

/** Tarjeta de número: cifra de titular con su etiqueta y una nota al pie. */
export function StatCard({
  value,
  label,
  note,
}: {
  value: ReactNode;
  label: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col gap-1.5 p-4 sm:p-5">
      <p className="font-num text-2xl text-beam sm:text-3xl">{value}</p>
      <p className="text-sm font-medium text-ink-2">{label}</p>
      {note ? <p className="text-xs leading-relaxed text-ink-3">{note}</p> : null}
    </div>
  );
}
