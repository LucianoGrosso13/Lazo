"use client";

// Comercio: cuenta propia (/app/comercio, con rol merchant del contexto de
// cuenta) y vistas públicas (/comercio, /comercio/[direccion]) que nunca
// exigen wallet. Cobros, ventas y comisiones salen de getMerchant + config;
// las alternativas son REFERENCE_FIGURES rotuladas, sin promesas.
import { isAddress } from "@solana/kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { ReferenceTag } from "@/components/ui/badges";
import { BigNumber } from "@/components/ui/count-up-number";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { useInView } from "@/components/ui/use-in-view";
import { CollapsibleHistory } from "@/components/ui/visual-primitives";
import { comercioCuenta } from "@/i18n/dictionaries/comercio-cuenta";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useLocale, useT } from "@/i18n/locale";
import { tierLabel } from "@/i18n/dictionaries/tiers";
import { productsByMerchant } from "@/lib/catalog";
import { getDirectoryMerchant } from "@/lib/merchants";
import {
  CuotasError,
  DEMO_MERCHANT,
  DEMO_STUDENT_NEW,
  formatUsdc,
  getCuotas,
  settlementAvailable,
  settlementOptionsOf,
  payoutSchedule,
  type Merchant,
  type Micro,
  type ProtocolConfig,
  type Quote,
  type Sale,
  type SettlementId,
  type SettlementOption,
  type UnixSeconds,
  type WalletAddress,
} from "@/lib/cuotas";
import { REFERENCE_FIGURES } from "@/lib/cuotas/reference-figures";
import { useCuotasQuery } from "@/lib/use-cuotas";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import styles from "./comercio.module.css";
import { useAccount } from "./account-context";
import { EvidenceMark, ModeBadge } from "./evidencia";
import {
  Consulta,
  ConsultaCargando,
  EstadoConsulta,
  fmtFecha,
  fmtPct01,
  shortAddr,
} from "./consulta";

const fmtPct = (p01: number, locale: "es" | "en") =>
  `${fmtPct01(p01, locale)} · ${locale === "es" ? "del precio" : "of price"}`;

/** Fecha sin hora: para vencimientos y fechas de cobro a días. */
const fmtDia = (at: UnixSeconds, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(at * 1000);

/**
 * Dirección base58 en grupos de 4 caracteres: en 390 px cortar al medio deja
 * caracteres huérfanos en la última línea; los grupos quiebran entre bloques.
 */
function DireccionLarga({ address }: { address: string }) {
  const chunks = address.match(/.{1,4}/g) ?? [address];
  return (
    <p className="mt-1.5 font-num text-xs leading-relaxed text-ink-ghost" title={address}>
      <span className="sr-only">{address}</span>
      <span aria-hidden className="flex flex-wrap gap-x-2.5 gap-y-0.5">
        {chunks.map((chunk, i) => (
          <span key={i}>{chunk}</span>
        ))}
      </span>
    </p>
  );
}

/** El precio se refracta: lo cobrado (espectro) + lo pendiente + la comisión. */
function SplitBanda({
  recibido,
  pendiente,
  comision,
  locale,
  labelCobras,
  labelPendiente,
  labelComision,
}: {
  recibido: number;
  pendiente: number;
  comision: number;
  locale: "es" | "en";
  labelCobras: string;
  labelPendiente: string;
  labelComision: string;
}) {
  const total = recibido + pendiente + comision;
  if (total <= 0) return null;
  const w = (v: number) => Math.max((v / total) * 100, 1.5);
  const aria = [
    `${labelCobras} ${formatUsdc(recibido, locale)}`,
    pendiente > 0 ? `${labelPendiente} ${formatUsdc(pendiente, locale)}` : null,
    `${labelComision} ${formatUsdc(comision, locale)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div>
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-beam/5"
        role="img"
        aria-label={aria}
      >
        <div
          className="h-full bg-gradient-to-r from-cyan to-green"
          style={{ width: `${(recibido / total) * 100}%` }}
        />
        {pendiente > 0 && (
          <div className="h-full bg-backlight/60" style={{ width: `${w(pendiente)}%` }} />
        )}
        <div className="h-full bg-violet/80" style={{ width: `${w(comision)}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-green" />
          {labelCobras} · <span className="font-num tabular-nums">{formatUsdc(recibido, locale)}</span>
        </span>
        {pendiente > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-backlight" />
            {labelPendiente} · <span className="font-num tabular-nums">{formatUsdc(pendiente, locale)}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-violet" />
          {labelComision} · <span className="font-num tabular-nums">{formatUsdc(comision, locale)}</span>
        </span>
      </div>
    </div>
  );
}

/** Una línea de comparación: Lazo en espectro, las alternativas en gris. */
function BarraReferencia({
  nombre,
  valor01,
  max01,
  detalle,
  espectro,
  locale,
}: {
  nombre: string;
  valor01: number;
  max01: number;
  detalle: React.ReactNode;
  espectro?: boolean;
  locale: "es" | "en";
}) {
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[13rem_1fr_auto]">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{nombre}</p>
        <p className="text-xs text-ink-ghost">{detalle}</p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-beam/8">
        <div
          className={`h-full rounded-full ${
            espectro ? "bg-gradient-to-r from-violet via-cyan to-green" : "bg-ash/50"
          }`}
          style={{ width: `${Math.min((valor01 / max01) * 100, 100)}%` }}
        />
      </div>
      <span className="col-span-2 font-num text-sm tabular-nums text-ink sm:col-span-1 sm:text-right">
        {fmtPct01(valor01, locale)}
      </span>
    </li>
  );
}

/** Enlaces de checkout por producto del comercio, copiables. Roadmap declarado. */
function CajaCheckout({ owner }: { owner: string }) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopiado(path);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Clipboard no disponible (contexto no seguro): el enlace queda visible igual.
    }
  };

  const products = productsByMerchant(owner);
  if (products.length === 0) return null;

  return (
    <GlassPanel data-testid="comercio-checkout-link" className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.checkoutTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.checkoutBody}</p>
      <ul className="mt-4 space-y-2">
        {products.map((p) => {
          const path = `/checkout/${p.id}`;
          return (
            <li
              key={p.id}
              className="flex flex-col gap-2.5 rounded-xl border border-beam/10 bg-beam/[0.03] px-3.5 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-3 sm:py-2"
            >
              <span className="text-sm text-ink">{p.name[locale]}</span>
              <code className="min-w-0 truncate font-num text-xs text-ink-ghost sm:flex-1">{path}</code>
              <span className="flex gap-2 max-sm:w-full">
                <button
                  type="button"
                  onClick={() => void copiar(path)}
                  className={`${buttonClasses("secondary", "sm")} max-sm:flex-1`}
                >
                  {copiado === path ? t.checkoutCopiado : t.checkoutCopiar}
                </button>
                <Link href={path} className={`${buttonClasses("ghost", "sm")} max-sm:flex-1`}>
                  {t.checkoutAbrir}
                </Link>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-ghost">{t.checkoutRoadmap}</p>
    </GlassPanel>
  );
}

/** Acceso destacado a "Venta en mostrador" (/app/comercio/mostrador). */
function AccesoMostrador() {
  const t = useT(comercioCuenta);
  return (
    <GlassPanel
      data-testid="comercio-mostrador-card"
      className="relative overflow-hidden border-cyan/25 bg-gradient-to-r from-cyan/[0.06] via-beam/[0.02] to-transparent px-5 py-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </span>
            <h2 className="text-base font-semibold text-beam">{t.mostradorCardTitle}</h2>
            <Chip on>{t.mostradorCardBadge}</Chip>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-ink-2">
            {t.mostradorCardDesc}
          </p>
        </div>
        <Link
          href="/app/comercio/mostrador"
          data-testid="comercio-mostrador-link"
          className={`${buttonClasses("primary", "md")} shrink-0 self-start sm:self-center`}
        >
          {t.mostradorCardBoton} →
        </Link>
      </div>
    </GlassPanel>
  );
}

/** Un cobro pendiente del calendario garantizado: tramo o pendiente legado. */
interface CobroPendiente {
  key: string;
  releaseAt: UnixSeconds;
  amount: Micro;
  detalle: string;
}

/**
 * "Garantizado por cobrar": el total diferido más una mini línea de tiempo
 * con fecha y monto de cada tramo pendiente. El dato sale de los
 * `payoutTranches`/`pendingSettlement` de cada venta; el cliente real no
 * los expone todavía, así que en ese modo el bloque no se muestra.
 */
function GarantizadoCobro({ merchant }: { merchant: Merchant }) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const { ref, entered } = useInView<HTMLOListElement>();
  const reduced = useReducedMotion();

  const pendientes: CobroPendiente[] = merchant.sales.flatMap((s) => {
    const tramos = s.payoutTranches ?? [];
    if (tramos.length > 0) {
      return tramos
        .filter((tr) => !tr.released)
        .map((tr) => ({
          key: `${s.planId}-${tr.index}`,
          releaseAt: tr.releaseAt,
          amount: tr.amount,
          detalle: t.tramoNumero
            .replace("{index}", String(tr.index + 1))
            .replace("{total}", String(tramos.length)),
        }));
    }
    const pendiente = s.pendingSettlement ?? 0;
    return pendiente > 0
      ? [
          {
            key: `${s.planId}-total`,
            releaseAt: s.settlementAt ?? s.at,
            amount: pendiente,
            detalle: t.garantizadoCobroUnico,
          },
        ]
      : [];
  });
  pendientes.sort((a, b) => a.releaseAt - b.releaseAt || a.key.localeCompare(b.key));

  if (merchant.pendingSettlement === undefined) return null;
  const total = merchant.pendingSettlement;

  return (
    <GlassPanel
      data-testid="comercio-garantizado"
      className="relative flex flex-col overflow-hidden px-5 py-5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_100%_0%,var(--accent-soft),transparent_62%)]"
      />
      <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
        {t.garantizadoLabel}
      </p>
      <p className="mt-3">
        <BigNumber amount={total} currency="US$" size="lg" />
        <span className="ml-2 align-middle font-num text-xs text-ink-ghost">devUSDC</span>
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-2">{t.garantizadoHint}</p>
      {pendientes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-accent px-4 py-3 text-sm leading-relaxed text-ink-2">
          {t.garantizadoVacio}
        </p>
      ) : (
        <ol
          ref={ref}
          data-entered={(entered && !reduced) || undefined}
          aria-label={t.garantizadoLabel}
          className={`${styles.timeline} mt-4`}
        >
          {pendientes.map((p, i) => (
            <li
              key={p.key}
              data-testid="comercio-tramo"
              data-next={i === 0 || undefined}
              className={styles.timelineItem}
              style={{ "--i": i } as CSSProperties}
            >
              <span aria-hidden className={styles.timelineDot} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-num text-sm tabular-nums text-accent">
                    {fmtDia(p.releaseAt, locale)}
                  </span>
                  <span className="font-num text-sm tabular-nums text-beam">
                    US$ {formatUsdc(p.amount, locale)}
                  </span>
                </span>
                <span className="text-xs text-ink-ghost">{p.detalle}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </GlassPanel>
  );
}

/** Una venta dentro del historial plegable. */
function VentaItem({ s, locale }: { s: Sale; locale: "es" | "en" }) {
  const t = useT(comercioCuenta);
  const pendienteVenta = s.pendingSettlement ?? 0;
  const settled = s.settled ?? true;
  const days = s.settlementDays ?? 0;
  const plazo = days === 0 ? t.plazoHoy : t.plazoDias.replace("{dias}", String(days));
  const cobroAt = s.settlementAt ?? s.at;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-3">{fmtFecha(s.at, locale)}</span>
        <span
          className="font-num text-xs tabular-nums text-ink-ghost"
          title={s.planId}
        >
          {t.colPrecio} {formatUsdc(s.price, locale)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <span className="font-num text-lg tabular-nums text-beam">
          {formatUsdc(s.received - pendienteVenta, locale)}
          <span className="ml-1.5 text-xs font-normal text-ink-ghost">{t.colCobrado}</span>
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <Chip>{plazo}</Chip>
          <Chip on={settled}>{settled ? t.estadoCobrada : t.estadoPendiente}</Chip>
          <span className="font-num tabular-nums">
            {t.colComision} {formatUsdc(s.fee, locale)}
          </span>
          <EvidenceMark evidence={{ kind: "signature", signature: s.signature }} />
        </span>
      </div>
      {s.payoutTranches && s.payoutTranches.length > 0 ? (
        <div className="mt-3 rounded-xl border border-beam/10 bg-beam/[0.02] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-beam/8 pb-2 text-ink-3">
            <span className="font-medium text-ink-2">{t.calendarioTramosVenta}</span>
            <span className="text-ink-ghost">
              {t.anticipoCobrado}:{" "}
              <span className="font-num tabular-nums text-beam">
                US$ {formatUsdc(s.downPayment, locale)}
              </span>
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {s.payoutTranches.map((tr) => (
              <li
                key={tr.index}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-beam/[0.03] px-2.5 py-1.5"
              >
                <span className="flex items-center gap-2 text-ink">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${
                      tr.released
                        ? "bg-green"
                        : "bg-cyan shadow-[0_0_6px_rgb(0_194_255/0.5)]"
                    }`}
                  />
                  <span className="font-medium">
                    {t.tramoNumero
                      .replace("{index}", String(tr.index + 1))
                      .replace("{total}", String(s.payoutTranches!.length))}
                  </span>
                  <span className="text-ink-ghost">· {fmtDia(tr.releaseAt, locale)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-num text-sm tabular-nums font-medium text-beam">
                    US$ {formatUsdc(tr.amount, locale)}
                  </span>
                  <Chip on={tr.released}>
                    {tr.released ? t.estadoLiberado : t.estadoPendiente}
                  </Chip>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : days > 0 ? (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-ghost">
          {settled
            ? t.ventaCobradaDetalle.replace("{fecha}", fmtDia(cobroAt, locale))
            : t.ventaPendienteDetalle
                .replace("{monto}", `US$ ${formatUsdc(pendienteVenta, locale)}`)
                .replace("{fecha}", fmtDia(cobroAt, locale))}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Lo primero que ve el comercio: lo cobrado (en grande) al lado de lo que
 * Lazo garantiza cobrar en fecha; abajo la venta en mostrador y las ventas
 * en cuotas como historial plegable.
 */
function DatosComercio({
  merchant,
  mostrador,
}: {
  merchant: Merchant;
  mostrador: boolean;
}) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  // La lectura llega en orden cronológico; el historial muestra lo último.
  const ventas = [...merchant.sales].reverse();
  const pendienteVentas = ventas.reduce((acc, s) => acc + (s.pendingSettlement ?? 0), 0);
  const cobrado = ventas.reduce((acc, s) => acc + s.received - (s.pendingSettlement ?? 0), 0);
  const comisiones = ventas.reduce((acc, s) => acc + s.fee, 0);
  const conCalendario = merchant.pendingSettlement !== undefined;

  return (
    <div data-testid="comercio-datos" className="space-y-6">
      <div
        className={`grid items-stretch gap-5 ${
          conCalendario ? "md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : ""
        }`}
      >
        <GlassSlab className="h-full">
          <div className="px-6 py-7 sm:px-8">
            <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
              {t.saldoLabel}
            </p>
            <p className="mt-3">
              <BigNumber
                amount={merchant.settlementBalance}
                currency="US$"
                size={conCalendario ? "xl" : "display"}
              />
              <span className="ml-2 align-middle font-num text-sm text-ink-ghost">devUSDC</span>
            </p>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">
              {t.saldoHint} {t.sinCargoDeMora}
            </p>
            {ventas.length > 0 && (
              <div className="mt-6">
                <SplitBanda
                  recibido={cobrado}
                  pendiente={pendienteVentas}
                  comision={comisiones}
                  locale={locale}
                  labelCobras={t.splitCobras}
                  labelPendiente={t.splitPendiente}
                  labelComision={t.splitComision}
                />
              </div>
            )}
          </div>
        </GlassSlab>
        <GarantizadoCobro merchant={merchant} />
      </div>

      {mostrador && <AccesoMostrador />}

      <GlassPanel data-testid="comercio-ventas" className="px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-beam">{t.ventasTitle}</h2>
          <span className="font-num text-xs tabular-nums text-ink-ghost">
            {t.ventasCount.replace("{count}", String(ventas.length))}
          </span>
        </div>
        <CollapsibleHistory
          className="mt-1"
          items={ventas.map((s) => (
            <VentaItem key={s.planId} s={s} locale={locale} />
          ))}
          label={t.ventasTitle}
          visibleCount={3}
          expandLabel={t.ventasVerTodas.replace("{count}", String(ventas.length))}
          collapseLabel={t.ventasVerMenos}
          empty={<p className="py-1 text-sm leading-relaxed text-ink-2">{t.ventasVacia}</p>}
        />
      </GlassPanel>
    </div>
  );
}

function HistorialLiberaciones({ owner }: { owner: WalletAddress }) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const res = useCuotasQuery(["comercio-liberaciones", owner], (c) =>
    c.getActivity({ merchant: owner }),
  );
  const liberaciones = (res.data ?? []).filter((item) => item.kind === "PayoutReleased");
  if (liberaciones.length === 0) return null;
  return (
    <GlassPanel className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.actividadTitle}</h2>
      <ul className="mt-3 divide-y divide-beam/8">
        {liberaciones.map((item, index) => (
          <li key={`${item.at}-${item.planId}-${index}`} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-1 last:pb-1">
            <span className="text-sm text-ink">{t.actividadLiberacion} · {fmtDia(item.at, locale)}</span>
            <span className="flex items-center gap-2">
              <span className="font-num text-sm tabular-nums text-beam">US$ {formatUsdc(item.amount ?? 0, locale)} devUSDC</span>
              {item.signature && <EvidenceMark evidence={{ kind: "signature", signature: item.signature }} />}
            </span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}

interface PlazosData {
  options: SettlementOption[];
  /** Cotización de la venta de ejemplo por plazo (null si esa lectura falló). */
  quotes: (Quote | null)[];
  now: UnixSeconds;
  secondsPerDay: number;
}

/**
 * Plazos de cobro del comercio: comisión sobre lo financiado, neto de la
 * venta de ejemplo (`quote()` por plazo) y fecha de cobro según el reloj de
 * demo. En la cuenta el comercio elige el predeterminado vía
 * `setMerchantSettlement`; en la vista pública es de solo lectura.
 */
function PlazosCobro({
  owner,
  merchant,
  editable,
}: {
  owner: WalletAddress;
  merchant: Merchant;
  editable: boolean;
}) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const res = useCuotasQuery(["plazos-cobro"], async (c): Promise<PlazosData> => {
    const [config, clock] = await Promise.all([c.getConfig(), c.getClock()]);
    const options = settlementOptionsOf(config);
    // Venta de ejemplo del spec: el tope del escalón inicial (precio 1.000,
    // anticipo 300, financiado 700 en la demo). El monto sale de la config.
    const price = config.guaranteedTiers[0].maxPurchase;
    const quotes = await Promise.all(
      options.map((o) =>
        c.quote(price, DEMO_STUDENT_NEW, { settlement: o.id }).catch(() => null),
      ),
    );
    return { options, quotes, now: clock.now, secondsPerDay: clock.secondsPerDay };
  });
  const [saving, setSaving] = useState<SettlementId | null>(null);
  const [aviso, setAviso] = useState<"proximamente" | "error" | null>(null);
  const actual = merchant.settlementId ?? "immediate";
  const data = res.data;
  const ejemplo = data?.quotes.find((q) => q !== null) ?? null;

  const elegir = async (id: SettlementId) => {
    if (!editable || saving !== null || id === actual) return;
    setAviso(null);
    setSaving(id);
    try {
      await getCuotas().setMerchantSettlement(owner, id);
    } catch (e) {
      // En modo real el programa cobra siempre al instante: la opción se
      // declara "disponible próximamente" en vez de romper la pantalla.
      setAviso(
        e instanceof CuotasError && e.code === "option_unavailable"
          ? "proximamente"
          : "error",
      );
    } finally {
      setSaving(null);
    }
  };

  return (
    <GlassPanel data-testid="comercio-plazos" className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.plazosTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.plazosBody}</p>
      {editable && <p className="mt-1.5 text-xs text-ink-ghost">{t.plazosElegir}</p>}
      {aviso && (
        <p
          role="status"
          className={`mt-2 text-sm ${aviso === "error" ? "text-crack" : "text-ink-2"}`}
        >
          {aviso === "proximamente" ? t.plazoProximamente : t.plazosError}
        </p>
      )}
      {!data ? (
        <div className="mt-4 animate-pulse space-y-2" aria-busy="true" role="status">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-beam/5" />
          ))}
        </div>
      ) : (
        <>
          <ul
            role={editable ? "radiogroup" : "list"}
            aria-label={t.plazosTitle}
            className="mt-4 space-y-2"
          >
            {data.options.map((opt, i) => {
              const q = data.quotes[i];
              const available = settlementAvailable(opt);
              const selected = actual === opt.id;
              const plazo =
                opt.days === 0
                  ? t.plazoHoy
                  : t.plazoDias.replace("{dias}", String(opt.days));
              const fecha =
                opt.days === 0
                  ? t.plazoInstante
                  : fmtDia(data.now + opt.days * data.secondsPerDay, locale);
              const rowCls = `flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border px-4 py-3 transition-colors ${
                selected
                  ? "border-cyan/45 bg-cyan/[0.07]"
                  : "border-beam/10 bg-beam/[0.03]"
              } ${
                editable && available && !selected && saving === null
                  ? "hover:border-cyan/40 hover:bg-cyan/[0.04]"
                  : ""
              } ${!available || saving !== null ? "opacity-60" : ""}`;
              const contenido = (
                <>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                    {editable && (
                      <span
                        aria-hidden
                        className={`size-3.5 shrink-0 rounded-full border ${
                          selected
                            ? "border-cyan bg-cyan/40 shadow-[0_0_8px_rgb(0_194_255/0.45)]"
                            : "border-beam/25"
                        }`}
                      />
                    )}
                    <span className="text-sm font-medium text-ink">{plazo}</span>
                    {selected && <Chip on>{t.plazoPredeterminado}</Chip>}
                    {!available && <span className="ref-tag">{t.plazoAConfirmar}</span>}
                  </span>
                  <span className="min-w-0 text-sm text-ink-3">
                    {opt.feeBps !== null
                      ? `${fmtPct01(opt.feeBps / 10_000, locale)} ${t.plazoSobreFinanciado}${q ? ` · ${t.plazosComision} US$ ${formatUsdc(q.merchantFee, locale)}` : ""}`
                      : t.plazoAConfirmar}
                  </span>
                  <span className="ml-auto flex flex-wrap items-baseline justify-end gap-x-2 text-right">
                    <span className="font-num text-sm tabular-nums text-beam">
                      {opt.feeBps !== null && q
                        ? `US$ ${formatUsdc(q.merchantReceives, locale)}`
                        : "—"}
                    </span>
                    <span className="text-xs text-ink-ghost">
                      {t.plazoColFecha} {fecha}
                    </span>
                  </span>
                  {q && (
                    <span className="w-full basis-full border-t border-beam/8 pt-2 text-left">
                      <span className="flex flex-wrap justify-between gap-2 text-xs font-medium text-ink-2">
                        <span>{t.plazosCalendarioTramos}</span>
                        <span className="font-num tabular-nums text-beam">{t.plazosNetoTotal}: US$ {formatUsdc(q.merchantReceives, locale)}</span>
                      </span>
                      <span className="mt-1 grid gap-1 sm:grid-cols-2">
                        {opt.tranches > 0 && (
                          <span className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-beam/[0.03] px-2.5 py-1.5 text-sm">
                            <span className="text-ink-3">{t.plazosAnticipoHoy}</span>
                            <span className="font-num tabular-nums text-beam">US$ {formatUsdc(q.merchantAdvance, locale)}</span>
                          </span>
                        )}
                        {payoutSchedule(q.merchantPending, opt, data.now, data.secondsPerDay).map((tr) => (
                          <span key={tr.index} className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-beam/[0.03] px-2.5 py-1.5 text-sm">
                            <span className="text-ink-3">{t.plazosTramoItem.replace("{n}", String(tr.index + 1))} · {fmtDia(tr.releaseAt, locale)}</span>
                            <span className="font-num tabular-nums text-beam">US$ {formatUsdc(tr.amount, locale)}</span>
                          </span>
                        ))}
                        {opt.tranches === 0 && (
                          <span className="flex flex-wrap items-center justify-between gap-x-3 rounded-lg bg-beam/[0.03] px-2.5 py-1.5 text-sm">
                            <span className="text-ink-3">{t.plazoInmediatoTodo}</span>
                            <span className="font-num tabular-nums text-beam">US$ {formatUsdc(q.merchantAdvance, locale)}</span>
                          </span>
                        )}
                      </span>
                    </span>
                  )}
                </>
              );
              return (
                <li key={opt.id}>
                  {editable ? (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!available || saving !== null}
                      onClick={() => void elegir(opt.id)}
                      className={`${rowCls} text-left`}
                    >
                      {contenido}
                    </button>
                  ) : (
                    <div className={rowCls}>{contenido}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {ejemplo && (
            <p className="mt-3 text-sm leading-relaxed text-ink-ghost">
              {t.plazosEjemplo
                .replace("{tier}", tierLabel(ejemplo.tier))
                .replace("{precio}", `US$ ${formatUsdc(ejemplo.price, locale)}`)
                .replace("{anticipo}", `US$ ${formatUsdc(ejemplo.downPayment, locale)}`)
                .replace("{financiado}", `US$ ${formatUsdc(ejemplo.financed, locale)}`)}
            </p>
          )}
          {saving !== null && (
            <p role="status" className="mt-2 text-xs text-ink-2">
              {t.plazosGuardando}
            </p>
          )}
        </>
      )}
    </GlassPanel>
  );
}

function Alternativas({ config, merchant }: { config?: ProtocolConfig; merchant?: Merchant }) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const ventas = merchant?.sales ?? [];
  const precios = ventas.reduce((acc, s) => acc + s.price, 0);
  const comisiones = ventas.reduce((acc, s) => acc + s.fee, 0);
  // Si hubo ventas, la comisión efectiva sobre el precio se calcula de verdad.
  const efectivo01 = precios > 0 ? comisiones / precios : null;
  // Sin ventas, la config: feeBps sobre lo financiado, no sobre el precio.
  const lazo01 = efectivo01 ?? (config ? config.feeBps / 10_000 : 0);
  const max01 = REFERENCE_FIGURES.mercadoPagoMerchantPct / 100;

  return (
    <GlassPanel className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.alternativasTitle}</h2>
      <ul className="mt-4 space-y-4">
        <BarraReferencia
          nombre="Lazo"
          detalle={
            efectivo01 !== null
              ? t.comisionReal
              : t.comisionConfig.replace("{pct}", fmtPct01(lazo01, locale))
          }
          valor01={lazo01}
          max01={max01}
          espectro
          locale={locale}
        />
        <BarraReferencia
          nombre={t.refPyme}
          detalle={
            <>
              {fmtPct(REFERENCE_FIGURES.cuotaMipymeMerchantPct / 100, locale)}{" "}
              <ReferenceTag>{t.referenciaTag}</ReferenceTag>
            </>
          }
          valor01={REFERENCE_FIGURES.cuotaMipymeMerchantPct / 100}
          max01={max01}
          locale={locale}
        />
        <BarraReferencia
          nombre={t.refMp}
          detalle={
            <>
              {fmtPct(REFERENCE_FIGURES.mercadoPagoMerchantPct / 100, locale)}{" "}
              <ReferenceTag>{t.referenciaTag}</ReferenceTag>
            </>
          }
          valor01={REFERENCE_FIGURES.mercadoPagoMerchantPct / 100}
          max01={max01}
          locale={locale}
        />
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        {t.refInstant.replace("{dias}", String(REFERENCE_FIGURES.gocuotasSettlementBusinessDays))}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-ink-ghost">{t.alternativasNote}</p>
    </GlassPanel>
  );
}

/**
 * Panel completo del comercio. `variante` solo cambia la rotulación: la misma
 * lectura sirve a la cuenta propia y a la consulta pública.
 */
export function ComercioView({
  address,
  variante,
}: {
  address: string;
  variante: "cuenta" | "publica";
}) {
  const t = useT(comercioCuenta);
  const merchant = useCuotasQuery(["merchant", address], (c) => c.getMerchant(address));
  const config = useCuotasQuery(["config"], (c) => c.getConfig());
  // Todos los comercios del directorio son demo; el rotulado lo declara.
  const esDemo = getDirectoryMerchant(address) !== null;
  const nombre = merchant.data?.name;

  return (
    <div
      data-testid="comercio-panel"
      data-role="merchant"
      className="mx-auto w-full max-w-3xl space-y-6"
    >
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-beam sm:text-3xl">
            {nombre ?? shortAddr(address)}
          </h1>
          <Chip on={variante === "cuenta" && !esDemo}>
            {variante === "cuenta" && !esDemo ? t.tuComercio : esDemo ? t.vistaDemo : t.vistaPublica}
          </Chip>
          <ModeBadge />
        </div>
        <DireccionLarga address={address} />
        {variante === "cuenta" && (
          <Link
            href={`/comercio/${address}`}
            className="mt-2 inline-block text-sm text-cyan underline-offset-4 hover:text-beam hover:underline"
          >
            {t.cuentaPropia} →
          </Link>
        )}
      </header>

      <Consulta
        res={merchant}
        pendienteTestId="comercio-pendiente"
        noEncontrado={{ title: t.noRegistradoTitle, body: t.noRegistradoBody }}
        textos={{
          pendienteTitle: t.leerTitle,
          pendienteBody: t.leerBody,
          errorTitle: t.errorTitle,
          errorBody: t.errorBody,
          reintentar: t.reintentar,
        }}
      >
        {(m) => (
          <div className="space-y-6">
            <DatosComercio merchant={m} mostrador={variante === "cuenta"} />
            <PlazosCobro owner={address} merchant={m} editable={variante === "cuenta"} />
            {variante === "cuenta" && <HistorialLiberaciones owner={address} />}
          </div>
        )}
      </Consulta>

      <Alternativas config={config.data} merchant={merchant.data} />
      <CajaCheckout owner={address} />
    </div>
  );
}

/** Entrada pública de /comercio: buscador por dirección + panel del demo (mock). */
export function ComercioEntrada() {
  const t = useT(comercioCuenta);
  const router = useRouter();
  const mode = getCuotas().mode;
  const [valor, setValor] = useState("");
  const [invalido, setInvalido] = useState(false);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    const v = valor.trim();
    if (!isAddress(v)) {
      setInvalido(true);
      return;
    }
    router.push(`/comercio/${v}`);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={buscar} noValidate>
        <label htmlFor="buscar-comercio" className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
          {t.buscarLabel}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="buscar-comercio"
            data-testid="comercio-buscar-input"
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setInvalido(false);
            }}
            placeholder={t.buscarPlaceholder}
            aria-invalid={invalido}
            aria-describedby={invalido ? "buscar-comercio-error" : undefined}
            className="min-w-0 flex-1 rounded-xl border border-beam/15 bg-beam/[0.04] px-4 py-2.5 font-num text-sm text-ink placeholder:text-ink-ghost focus:border-cyan/60 focus:outline-none"
          />
          <button type="submit" className={buttonClasses("primary", "sm")}>
            {t.buscarBoton}
          </button>
        </div>
        {invalido && (
          <p id="buscar-comercio-error" role="alert" className="mt-2 text-sm text-crack">
            {t.buscarInvalido}
          </p>
        )}
      </form>

      {mode === "mock" ? (
        <ComercioView address={DEMO_MERCHANT} variante="publica" />
      ) : (
        <GlassPanel className="px-5 py-6">
          <p className="text-sm leading-relaxed text-ink-2">{t.demoSoloMock}</p>
        </GlassPanel>
      )}
    </div>
  );
}

/** /comercio/[direccion]: valida la dirección antes de consultar. */
export function ComercioPublico({ direccion }: { direccion: string }) {
  const t = useT(comercioCuenta);
  if (!isAddress(direccion)) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <EstadoConsulta
          testId="comercio-direccion-invalida"
          tono="vacio"
          title={t.direccionInvalidaTitle}
          body={t.direccionInvalidaBody}
          reintentar=""
        />
        <Link href="/comercio" className="inline-block text-sm text-cyan underline-offset-4 hover:text-beam hover:underline">
          {t.direccionInvalidaVolver} →
        </Link>
      </div>
    );
  }
  return <ComercioView address={direccion} variante="publica" />;
}

/**
 * /app/comercio: la cuenta del comercio. Usa la identidad común del contexto
 * (wallet o selección demo) y falla cerrado: sin rol merchant no hay panel.
 */
export function ComercioCuenta() {
  const t = useT(comercioCuenta);
  const roles = useT(cuentas).roles;
  const { status, account, address, refresh } = useAccount();

  if (status === "resolving") return <ConsultaCargando />;
  if (status === "error") {
    return (
      <EstadoConsulta
        testId="comercio-cuenta-error"
        tono="error"
        title={t.errorTitle}
        body={t.errorBody}
        onRetry={refresh}
        reintentar={t.reintentar}
      />
    );
  }
  if (status === "ready" && account && account.role !== "merchant") {
    return (
      <div className="space-y-4">
        <EstadoConsulta
          testId="comercio-no-es-comercio"
          tono="vacio"
          title={t.cuentaNoComercioTitle}
          body={t.cuentaNoComercioBody.replace("{rol}", roles[account.role])}
          reintentar=""
        />
        <div className="flex flex-wrap gap-3">
          <Link href="/app" className={buttonClasses("secondary", "sm")}>
            {t.irEntrada}
          </Link>
          {address && (
            <Link href={`/comercio/${address}`} className={buttonClasses("ghost", "sm")}>
              {t.verPublico}
            </Link>
          )}
        </div>
      </div>
    );
  }
  if (status === "ready" && account?.role === "merchant") {
    return <ComercioView address={account.address} variante="cuenta" />;
  }
  // idle: sin wallet ni selección demo
  return (
    <div className="space-y-4">
      <EstadoConsulta
        testId="comercio-entrada"
        tono="vacio"
        title={t.titulo}
        body={t.cuentaSinIdentidad}
        reintentar=""
      />
      <Link href="/app" className={buttonClasses("secondary", "sm")}>
        {t.irEntrada}
      </Link>
    </div>
  );
}
