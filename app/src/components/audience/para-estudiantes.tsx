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
import {
  AudienceHero,
  AudienceSection,
  Callout,
  Faq,
  StatCard,
  StepList,
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
    <div className="page-shell py-12 sm:py-16">
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
      <What />
      <HowToBuy />
      <Ladder />
      <Late />
      <Family />
      <Upcoming />
      <FaqSection />
      <Ctas />
    </div>
  );
}

function What() {
  const t = useT(paraEstudiantes).what;
  return (
    <AudienceSection title={t.title} intro={t.body}>
      <div className="max-w-2xl">
        <Callout variant="devnet">{t.devnet}</Callout>
      </div>
    </AudienceSection>
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
      className={`flex items-baseline justify-between gap-3 ${
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
      <StepList steps={t.steps.map((s) => ({ title: s.t, body: s.d }))} />
      <p className="mt-8 text-sm font-medium text-ink-2">
        {t.example.title(fmt(EXAMPLE_PRICE, 0), tierLabel(0))}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {options.map((o) => {
          // Cotización para Tier 1 · Starter con fiador obligatorio:
          // `quoteTerms` de `lib/cuotas/terms.ts` (el plazo del comercio no
          // cambia lo que paga el estudiante; se resuelve con la inmediata).
          const ex = quoteTerms({
            price: EXAMPLE_PRICE,
            tier: config.guaranteedTiers[0],
            plan: o,
            settlement: { days: 0, feeBps: immediateFeeBps(config) },
          });
          return (
            <div key={o.installments} className="glass p-4 sm:p-5">
              <p className="flex items-center justify-between gap-2">
                <span className="font-medium text-beam">
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
              </p>
              <dl className="mt-4 grid gap-2 text-sm">
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
      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-ink-3">
        {t.example.note}
      </p>
    </AudienceSection>
  );
}

function Ladder() {
  const t = useT(paraEstudiantes).ladder;
  const { locale } = useLocale();
  const pct = usePct();
  const config = useProtocolConfig();
  if (!config) return null;
  const coveragePct = pct(config.guaranteedTiers[0].guarantorCoverageBps);
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {config.guaranteedTiers.map((tier, n) => (
          <StatCard
            key={n}
            value={pct(tier.downPaymentBps)}
            label={`${tierLabel(n)} · ${t.down}`}
            note={t.cap(formatUsdc(tier.maxPurchase, locale, 0))}
          />
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {t.rules.map((r) => (
          <div key={r.title} className="glass p-4 sm:p-5">
            <p className="font-medium text-beam">{r.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">
              {typeof r.body === "string"
                ? r.body
                : r.body(formatUsdc(config.minFinancedToCount, locale, 0), config.graceDays)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">
        {t.coverage(coveragePct)}
      </p>
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
      <ol className="grid gap-3">
        {events.map((e) => (
          <li key={e.day} className="glass flex items-start gap-4 p-4 sm:p-5">
            <span className="chip flex-none whitespace-nowrap normal-case">
              {e.day}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-beam">{e.t1}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{e.d}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-2">
        {t.footnote}
      </p>
    </AudienceSection>
  );
}

function Family() {
  const t = useT(paraEstudiantes).family;
  const config = useProtocolConfig();
  if (!config) return null;
  return (
    <AudienceSection title={t.title} intro={t.intro}>
      <div className="grid gap-4 sm:grid-cols-2">
        {t.items.map((item) => (
          <div key={item.t} className="glass p-4 sm:p-5">
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
        ))}
      </div>
    </AudienceSection>
  );
}

function Upcoming() {
  const t = useT(paraEstudiantes).next;
  return (
    <AudienceSection title={t.title}>
      <p className="mb-4">
        <Chip>{t.tag}</Chip>
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {t.items.map((item) => (
          <div key={item.t} className="glass p-4 sm:p-5">
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
      <div className="max-w-3xl">
        <Faq items={t.items.map((i) => ({ q: i.q, a: i.a }))} />
      </div>
    </AudienceSection>
  );
}

function Ctas() {
  const t = useT(paraEstudiantes).cta;
  return (
    <section className="mt-14 sm:mt-20">
      <div className="glass flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <p className="text-lg font-medium text-beam">{t.title}</p>
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
