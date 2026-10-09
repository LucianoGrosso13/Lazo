"use client";

import Link from "next/link";
import {
  formatUsdc,
  immediateFeeBps,
  planOptionsOf,
  quoteTerms,
  toMicro,
  type Micro,
} from "@/lib/cuotas";
import { paraEstudiantes } from "@/i18n/dictionaries/para-estudiantes";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { useLocale, useT } from "@/i18n/locale";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useProtocolConfig } from "@/components/landing/use-config";
import { useInView } from "@/components/ui/use-in-view";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import styles from "./para-estudiantes.module.css";
import {
  Accordion,
  AnimatedSteps,
  AudienceHero,
  AudienceSection,
  BigNumber,
  Callout,
  ComparisonBars,
} from "./primitives";

// Precio del ejemplo (fixture, no un número de negocio): el caso canónico de
// las decisiones comerciales, una compra de US$ 1.000 en Tier 1 · Starter.
const EXAMPLE_PRICE = toMicro(1000);

/** % legible desde bps: 300 → "3", 625 → "6,25" (es) / "6.25" (en). */
function usePct() {
  const { locale } = useLocale();
  const nf = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: 2,
  });
  return (bps: number) => `${nf.format(bps / 100)}%`;
}

export function ParaEstudiantes() {
  const t = useT(paraEstudiantes);
  return (
    <div data-role="buyer" className="page-shell min-w-0 py-12 sm:py-16">
      <div className="grid min-w-0 grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
        <div className="min-w-0 lg:col-span-7">
          <AudienceHero
            eyebrow={t.hero.eyebrow}
            title={t.hero.title}
            lede={t.hero.lede}
          >
            <Link className={buttonClasses("primary")} href="/comercio">
              {t.hero.ctaMerchants}
            </Link>
            <Link className={buttonClasses("secondary")} href="/checkout/pc">
              {t.hero.ctaCheckout}
            </Link>
          </AudienceHero>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <BuyerHeroGraphic />
        </div>
      </div>
      <What />
      <HowToBuy />
      <Coverage />
      <Ladder />
      <Late />
      <Family />
      <Upcoming />
      <FaqSection />
      <Ctas />
    </div>
  );
}

/** Marca de entrada: data-entered solo si hay movimiento permitido. */
function useEntrance<T extends HTMLElement>() {
  const { ref, entered } = useInView<T>();
  const reduced = useReducedMotion();
  return { ref, entered: entered && !reduced ? true : undefined };
}

const delay = (ms: number) => ({ ["--delay" as string]: `${ms}ms` });

/**
 * Ilustración del hero: la compra de ejemplo partida en anticipo + cuotas
 * (montos de quoteTerms con la config), y el garante respaldando lo que falta.
 */
function BuyerHeroGraphic() {
  const t = useT(paraEstudiantes);
  const g = t.hero.graphic;
  const { locale } = useLocale();
  const pct = usePct();
  const config = useProtocolConfig();
  const { ref, entered } = useEntrance<HTMLDivElement>();
  const options = config ? planOptionsOf(config).filter((o) => o.enabled) : [];
  const plan = options.find((o) => o.interestTotalBps === 0) ?? options[0];
  if (!config || !plan) {
    return <div ref={ref} className="h-80 rounded-2xl border border-accent bg-abyss-2/60" />;
  }
  const tier = config.guaranteedTiers[0];
  const ex = quoteTerms({
    price: EXAMPLE_PRICE,
    tier,
    plan,
    settlement: { days: 0, feeBps: immediateFeeBps(config) },
  });
  const fmt = (m: Micro) => formatUsdc(m, locale, 2);
  const remaining = ex.installments.reduce((a, b) => a + b, 0);
  // Ancho proporcional al monto: flex-grow con base 0, así los gaps no lo desalinean.
  const share = (m: Micro) => ({ flex: `${m} 1 0px` });

  return (
    <div
      ref={ref}
      data-entered={entered}
      className={`${styles.halo} mx-auto w-full max-w-lg min-w-0`}
    >
      <figure className="glass min-w-0 border border-accent bg-abyss-2/80 p-5 sm:p-6">
        <figcaption className="flex flex-wrap items-center justify-between gap-2">
          <span className="chip border-accent bg-accent-soft text-accent">{g.tag}</span>
          <span className="font-num text-xs text-ink-3">
            {t.how.example.option(plan.installments)}
            {plan.interestTotalBps === 0 ? ` · ${t.how.example.interestFree}` : ""}
          </span>
        </figcaption>
        <p className="mt-4 text-sm text-ink-2">
          {g.purchase(formatUsdc(EXAMPLE_PRICE, locale, 0), tierLabel(0))}
        </p>

        {/* Barra segmentada: ancho proporcional a cada pago */}
        <div
          role="img"
          aria-label={g.scheduleLabel}
          className="mt-4 flex h-3 w-full gap-1 overflow-hidden rounded-full"
        >
          <span
            className={`${styles.segment} h-full rounded-full bg-backlight`}
            style={{ ...share(ex.downPayment), ...delay(0) }}
          />
          {ex.installments.map((m, i) => (
            <span
              key={i}
              className={`${styles.segment} h-full rounded-full bg-violet`}
              style={{
                ...share(m),
                opacity: 1 - i * 0.18,
                ...delay(250 + i * 180),
              }}
            />
          ))}
        </div>

        {/* Corchete del garante sobre las cuotas */}
        <div className="mt-2 flex w-full gap-1" aria-hidden="true">
          <span style={share(ex.downPayment)} />
          <span
            style={share(remaining)}
            className={`${styles.bracket} h-2 rounded-b-md border-x border-b border-dashed border-accent`}
          />
        </div>

        <dl className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className={`${styles.rise} min-w-0 rounded-lg bg-abyss-3/80 p-2.5`} style={delay(150)}>
            <dt className="font-num text-[11px] uppercase tracking-wider text-ink-3">{g.today}</dt>
            <dd className="mt-0.5 text-xs text-ink-2">{g.down}</dd>
            <dd className="font-num text-sm text-beam">{fmt(ex.downPayment)}</dd>
          </div>
          {ex.installments.map((m, i) => (
            <div
              key={i}
              className={`${styles.rise} min-w-0 rounded-lg bg-abyss-3/80 p-2.5`}
              style={delay(330 + i * 180)}
            >
              <dt className="font-num text-[11px] uppercase tracking-wider text-accent">
                {g.month(i + 1)}
              </dt>
              <dd className="mt-0.5 text-xs text-ink-2">{g.installment}</dd>
              <dd className="font-num text-sm text-beam">{fmt(m)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 grid min-w-0 gap-3 border-t border-hairline pt-5">
          <div className={`${styles.rise} flex min-w-0 items-start gap-3`} style={delay(700)}>
            <span
              aria-hidden="true"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border border-accent bg-accent-soft text-accent"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="13" rx="2.5" />
                <path d="M3 10h18M16 15h2" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-beam">{g.buyerTitle}</p>
              <p className="text-sm text-ink-2">{g.buyerSub}</p>
            </div>
          </div>
          <div className={`${styles.rise} flex min-w-0 items-start gap-3`} style={delay(950)}>
            <span
              aria-hidden="true"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-violet text-beam"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s7.5-3.6 7.5-9.5V5.2L12 2.5 4.5 5.2v6.3C4.5 17.4 12 21 12 21z" />
                <path d="m8.8 11.8 2.2 2.2 4.2-4.4" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-beam">
                {g.guarantorTitle}
                <span className="font-num text-xs font-normal text-accent">
                  US$ {fmt(remaining)}
                </span>
              </p>
              <p className="text-sm text-ink-2">
                {g.guarantorSub(pct(tier.guarantorCoverageBps))}
              </p>
              <p className="mt-2">
                <Chip>{g.guarantorBadge}</Chip>
              </p>
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}

/** Número grande: la cobertura del garante, sale de la config del Tier 1. */
function Coverage() {
  const t = useT(paraEstudiantes).ladder;
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;
  const bps = config.guaranteedTiers[0].guarantorCoverageBps;
  return (
    <section className={`${styles.halo} mt-14 sm:mt-20`}>
      <div className="glass grid min-w-0 items-center gap-6 border border-accent bg-accent-soft p-6 sm:p-10 md:grid-cols-[auto_1fr] md:gap-12">
        <div className="min-w-0">
          <p className="font-num text-measure uppercase tracking-[0.14em] text-accent">
            {t.coverageEyebrow}
          </p>
          <BigNumber
            amount={toMicro(bps / 100)}
            currency="none"
            suffix="%"
            decimals={0}
            size="display"
            className="mt-2"
          />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-beam sm:text-3xl">
            {t.coverageTitle}
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-2">
            {t.coverage(pct(bps))}
          </p>
        </div>
      </div>
    </section>
  );
}

function What() {
  const t = useT(paraEstudiantes).what;
  return (
    <section className="mt-14 grid min-w-0 gap-6 sm:mt-20 lg:grid-cols-12 lg:items-end lg:gap-10">
      <div className="min-w-0 lg:col-span-7">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-beam sm:text-3xl">
          {t.title}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2 sm:text-lg">
          {t.body}
        </p>
      </div>
      <div className="min-w-0 lg:col-span-5">
        <Callout variant="devnet">{t.devnet}</Callout>
      </div>
    </section>
  );
}

function ExampleRow({
  k,
  v,
  note,
  strong,
}: {
  k: string;
  v: string;
  note?: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-2 min-w-0 ${
        strong ? "border-t border-hairline pt-2 text-beam" : "text-ink-2"
      }`}
    >
      <dt className={strong ? "font-medium" : undefined}>{k}</dt>
      <dd className={`text-right font-num ${strong ? "font-medium" : ""}`}>
        {v}
        {note ? <span className="ml-1 text-xs text-ink-3">{note}</span> : null}
      </dd>
    </div>
  );
}

function HowToBuy() {
  const t = useT(paraEstudiantes).how;
  const { locale } = useLocale();
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;
  const fmt = (m: Micro, d = 2) => formatUsdc(m, locale, d);
  const options = planOptionsOf(config).filter((o) => o.enabled);

  return (
    <AudienceSection title={t.title}>
      <div className="min-w-0">
        <AnimatedSteps
          className={styles.steps4}
          label={t.stepsLabel}
          steps={t.steps.map((s) => ({ title: s.t, body: s.d }))}
        />
      </div>
      <div className="mt-10 min-w-0 rounded-2xl border border-accent bg-abyss-2/60 p-4 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <span className="chip border-accent bg-accent-soft text-accent">
              {t.example.tag}
            </span>
            <p className="mt-2 text-base font-semibold text-beam sm:text-lg">
              {t.example.title(fmt(EXAMPLE_PRICE, 0), tierLabel(0))}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-3 uppercase font-num tracking-wider">
              {t.example.purchaseLabel}
            </span>
            <BigNumber amount={EXAMPLE_PRICE} size="md" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 min-w-0">
          {options.map((o) => {
            const ex = quoteTerms({
              price: EXAMPLE_PRICE,
              tier: config.guaranteedTiers[0],
              plan: o,
              settlement: { days: 0, feeBps: immediateFeeBps(config) },
            });
            return (
              <div
                key={o.installments}
                className="rounded-xl border border-hairline bg-abyss-3/70 p-4 transition-colors sm:p-5 hover:border-accent min-w-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <span className="font-semibold text-beam">
                    {t.example.option(o.installments)}
                  </span>
                  {o.interestTotalBps === 0 ? (
                    <Chip on>{t.example.interestFree}</Chip>
                  ) : (
                    <Chip>
                      {t.example.optionBadge(
                        pct(o.interestTotalBps),
                        fmt(o.minPrice, 0),
                      )}
                    </Chip>
                  )}
                </div>
                <dl className="mt-4 grid gap-2 text-sm min-w-0">
                  <ExampleRow k={t.example.down} v={`US$ ${fmt(ex.downPayment)}`} />
                  <ExampleRow k={t.example.each} v={`US$ ${fmt(ex.installments[0])}`} />
                  <ExampleRow
                    k={t.example.interest}
                    v={`US$ ${fmt(ex.interest)}`}
                    note={
                      ex.interest > 0
                        ? t.example.interestNote(pct(o.interestTotalBps))
                        : undefined
                    }
                  />
                  <ExampleRow strong k={t.example.total} v={`US$ ${fmt(ex.total)}`} />
                </dl>
              </div>
            );
          })}
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-3">
          {t.example.note}
        </p>
      </div>
    </AudienceSection>
  );
}

function Ladder() {
  const t = useT(paraEstudiantes).ladder;
  const { locale } = useLocale();
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;

  return (
    <AudienceSection
      title={t.title}
      intro={t.intro(
        tierLabel(0),
        formatUsdc(config.minFinancedToCount, locale, 0),
        config.graceDays,
        config.guarantorChargeDay,
      )}
    >
      <div className="rounded-2xl border border-hairline bg-abyss-2/60 p-4 sm:p-6 min-w-0">
        <h3 className="text-lg font-semibold text-beam">{t.comparisonTitle}</h3>
        <p className="mt-1 text-sm text-ink-2">{t.comparisonIntro}</p>
        <div className="mt-6 min-w-0">
          <ComparisonBars
            label={t.comparisonTitle}
            items={config.guaranteedTiers.map((tier, n) => ({
              label: `${tierLabel(n)} · ${t.down}`,
              value: tier.downPaymentBps / 100,
              formattedValue: pct(tier.downPaymentBps),
              winner: n === config.guaranteedTiers.length - 1,
              winnerLabel: t.comparisonWinner,
              note: t.cap(formatUsdc(tier.maxPurchase, locale, 0)),
            }))}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 min-w-0">
        {t.rules.map((r) => (
          <div key={r.title} className="glass p-4 sm:p-5 min-w-0">
            <p className="font-medium text-beam">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {typeof r.body === "string"
                ? r.body
                : r.body(formatUsdc(config.minFinancedToCount, locale, 0), config.graceDays)}
            </p>
          </div>
        ))}
      </div>
    </AudienceSection>
  );
}

function Late() {
  const t = useT(paraEstudiantes).late;
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;
  const events = [
    { day: t.day(0), t1: t.events.due.t, d: t.events.due.d },
    {
      day: t.dayRange(1, config.graceDays),
      t1: t.events.grace.t,
      d: t.events.grace.d,
    },
    {
      day: t.day(config.guarantorNoticeDay),
      t1: t.events.notice.t,
      d: t.events.notice.d,
    },
    {
      day: t.day(config.graceDays + 1),
      t1: t.events.penalty.t,
      d: t.events.penalty.d(pct(config.penaltyBps)),
    },
    {
      day: t.day(config.guarantorChargeDay),
      t1: t.events.charge.t,
      d: t.events.charge.d,
    },
  ];
  return (
    <AudienceSection title={t.title} intro={t.intro}>
      <LateTimeline events={events} />
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink-2">
        {t.footnote}
      </p>
    </AudienceSection>
  );
}

/** Línea de tiempo vertical: se dibuja al entrar; el último hito va en rojo. */
function LateTimeline({
  events,
}: {
  events: { day: string; t1: string; d: string }[];
}) {
  const { ref, entered } = useEntrance<HTMLOListElement>();
  return (
    <ol ref={ref} data-entered={entered} className={`${styles.timeline} grid min-w-0 gap-3`}>
      {events.map((e, i) => {
        const last = i === events.length - 1;
        return (
          <li
            key={e.day}
            className={`${styles.rise} relative min-w-0 pl-10`}
            style={delay(150 + i * 200)}
          >
            <span
              aria-hidden="true"
              className={`${styles.dot} ${last ? styles.dotBad : ""}`}
            />
            <div
              className={`glass grid min-w-0 gap-1 p-4 sm:grid-cols-[8rem_1fr] sm:gap-5 sm:p-5 ${
                last ? "border border-bad/40" : ""
              }`}
            >
              <span
                className={`font-num text-sm ${last ? "text-bad" : "text-accent"}`}
              >
                {e.day}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-beam">{e.t1}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{e.d}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Family() {
  const t = useT(paraEstudiantes).family;
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;
  return (
    <section className="mt-14 grid min-w-0 gap-8 sm:mt-20 lg:grid-cols-12 lg:gap-12">
      <div className="min-w-0 lg:col-span-5">
        <h2 className="text-2xl font-semibold tracking-[-0.01em] text-beam sm:text-3xl">
          {t.title}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-2">{t.intro}</p>
        <aside className="mt-6 rounded-2xl border border-accent bg-accent-soft p-5">
          <p className="font-semibold text-beam">{t.calloutTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">
            {t.calloutBody(
              pct(config.guaranteedTiers[0].guarantorCoverageBps),
              config.guarantorChargeDay,
            )}
          </p>
        </aside>
      </div>
      <ul className="grid min-w-0 gap-3 lg:col-span-7">
        {t.items.map((item) => (
          <li key={item.t} className="glass flex min-w-0 items-start gap-4 p-4 sm:p-5">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border border-accent bg-accent-soft text-accent"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-medium text-beam">{item.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {typeof item.d === "string"
                  ? item.d
                  : item.d(
                      config.graceDays,
                      config.guarantorNoticeDay,
                      config.guarantorChargeDay,
                    )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Upcoming() {
  const t = useT(paraEstudiantes).next;
  return (
    <AudienceSection title={t.title}>
      <p className="mb-4">
        <Chip>{t.tag}</Chip>
      </p>
      <div className="grid gap-4 sm:grid-cols-2 min-w-0">
        {t.items.map((item) => (
          <div key={item.t} className="glass p-4 sm:p-5 min-w-0">
            <p className="font-medium text-beam">{item.t}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{item.d}</p>
          </div>
        ))}
      </div>
    </AudienceSection>
  );
}

function FaqSection() {
  const t = useT(paraEstudiantes).faq;
  return (
    <AudienceSection title={t.title}>
      <div className="max-w-3xl min-w-0">
        <Accordion
          label={t.title}
          items={t.items.map((i) => ({ q: i.q, a: i.a }))}
        />
      </div>
    </AudienceSection>
  );
}

function Ctas() {
  const t = useT(paraEstudiantes).cta;
  return (
    <section className={`${styles.halo} mt-14 sm:mt-20`}>
      <div className="glass flex min-w-0 flex-wrap items-center justify-between gap-4 border border-accent bg-accent-soft p-5 sm:p-8">
        <p className="text-xl font-semibold text-beam sm:text-2xl">{t.title}</p>
        <div className="flex flex-wrap gap-3">
          <Link className={buttonClasses("primary")} href="/comercio">
            {t.merchants}
          </Link>
          <Link className={buttonClasses("secondary")} href="/checkout/pc">
            {t.checkout}
          </Link>
          <Link className={buttonClasses("secondary")} href="/app">
            {t.account}
          </Link>
        </div>
      </div>
    </section>
  );
}
