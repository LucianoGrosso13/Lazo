"use client";

// Comercio: cuenta propia (/app/comercio, con rol merchant del contexto de
// cuenta) y vistas públicas (/comercio, /comercio/[direccion]) que nunca
// exigen wallet. Cobros, ventas y comisiones salen de getMerchant + config;
// las alternativas son REFERENCE_FIGURES rotuladas, sin promesas.
import { isAddress } from "@solana/kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReferenceTag } from "@/components/ui/badges";
import { BigNumber } from "@/components/ui/big-number";
import { buttonClasses } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { GlassPanel, GlassSlab } from "@/components/ui/glass";
import { comercioCuenta } from "@/i18n/dictionaries/comercio-cuenta";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useLocale, useT } from "@/i18n/locale";
import { CATALOG } from "@/lib/catalog";
import {
  DEMO_MERCHANT,
  formatUsdc,
  getCuotas,
  type Merchant,
  type ProtocolConfig,
} from "@/lib/cuotas";
import { REFERENCE_FIGURES } from "@/lib/cuotas/reference-figures";
import { useCuotasQuery } from "@/lib/use-cuotas";
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

/** El precio se refracta: lo que cobra el comercio (espectro) + la comisión. */
function SplitBanda({
  recibido,
  comision,
  locale,
  labelCobras,
  labelComision,
}: {
  recibido: number;
  comision: number;
  locale: "es" | "en";
  labelCobras: string;
  labelComision: string;
}) {
  const total = recibido + comision;
  if (total <= 0) return null;
  const wComision = Math.max((comision / total) * 100, 1.5);
  return (
    <div>
      <div
        className="flex h-3.5 w-full overflow-hidden rounded-full bg-beam/5"
        role="img"
        aria-label={`${labelCobras} ${formatUsdc(recibido, locale)} · ${labelComision} ${formatUsdc(comision, locale)}`}
      >
        <div
          className="h-full bg-gradient-to-r from-cyan to-green"
          style={{ width: `${(recibido / total) * 100}%` }}
        />
        <div className="h-full bg-violet/80" style={{ width: `${wComision}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-green" />
          {labelCobras} · <span className="font-num tabular-nums">{formatUsdc(recibido, locale)}</span>
        </span>
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

/** Enlaces de checkout por producto del catálogo, copiables. Roadmap declarado. */
function CajaCheckout() {
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

  return (
    <GlassPanel data-testid="comercio-checkout-link" className="px-5 py-5">
      <h2 className="text-base font-semibold text-beam">{t.checkoutTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{t.checkoutBody}</p>
      <ul className="mt-4 space-y-2">
        {CATALOG.map((p) => {
          const path = `/checkout/${p.id}`;
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-beam/10 bg-beam/[0.03] px-3 py-2"
            >
              <span className="text-sm text-ink">{p.name[locale]}</span>
              <code className="min-w-0 flex-1 truncate font-num text-xs text-ink-ghost">{path}</code>
              <button
                type="button"
                onClick={() => void copiar(path)}
                className={buttonClasses("secondary", "sm")}
              >
                {copiado === path ? t.checkoutCopiado : t.checkoutCopiar}
              </button>
              <Link href={path} className={buttonClasses("ghost", "sm")}>
                {t.checkoutAbrir}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-ink-ghost">{t.checkoutRoadmap}</p>
    </GlassPanel>
  );
}

function DatosComercio({ merchant }: { merchant: Merchant }) {
  const t = useT(comercioCuenta);
  const { locale } = useLocale();
  const ventas = merchant.sales;
  const cobrado = ventas.reduce((acc, s) => acc + s.received, 0);
  const comisiones = ventas.reduce((acc, s) => acc + s.fee, 0);

  return (
    <div data-testid="comercio-datos" className="space-y-6">
      <GlassSlab>
        <div className="px-6 py-7 sm:px-8">
          <p className="font-num text-measure uppercase tracking-[0.14em] text-ink-ghost">
            {t.saldoLabel}
          </p>
          <p className="mt-3">
            <BigNumber amount={merchant.settlementBalance} currency="US$" size="display" />
            <span className="ml-2 align-middle font-num text-sm text-ink-ghost">devUSDC</span>
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">
            {t.saldoHint} {t.sinCargoDeMora}
          </p>
          {ventas.length > 0 && (
            <div className="mt-6">
              <SplitBanda
                recibido={cobrado}
                comision={comisiones}
                locale={locale}
                labelCobras={t.splitCobras}
                labelComision={t.splitComision}
              />
            </div>
          )}
        </div>
      </GlassSlab>

      <GlassPanel className="px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-beam">{t.ventasTitle}</h2>
          <span className="font-num text-xs tabular-nums text-ink-ghost">
            {t.ventasCount.replace("{count}", String(ventas.length))}
          </span>
        </div>
        {ventas.length === 0 ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.ventasVacia}</p>
        ) : (
          <ul className="mt-3 divide-y divide-beam/8">
            {ventas.map((s) => (
              <li key={s.planId} className="py-3 first:pt-2 last:pb-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-3">{fmtFecha(s.at, locale)}</span>
                  <span className="font-num text-xs tabular-nums text-ink-ghost" title={s.planId}>
                    {t.colPrecio} {formatUsdc(s.price, locale)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                  <span className="font-num text-lg tabular-nums text-beam">
                    {formatUsdc(s.received, locale)}
                    <span className="ml-1.5 text-xs font-normal text-ink-ghost">{t.colCobrado}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
                    <span className="font-num tabular-nums">
                      {t.colComision} {formatUsdc(s.fee, locale)}
                    </span>
                    <EvidenceMark evidence={{ kind: "signature", signature: s.signature }} />
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
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
          nombre={t.refCuotaSimple}
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
  const esDemo = address === DEMO_MERCHANT;
  const nombre = merchant.data?.name;

  return (
    <div data-testid="comercio-panel" className="mx-auto w-full max-w-3xl space-y-6">
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
        <p className="mt-1.5 break-all font-num text-xs text-ink-ghost" title={address}>
          {address}
        </p>
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
        {(m) => <DatosComercio merchant={m} />}
      </Consulta>

      <Alternativas config={config.data} merchant={merchant.data} />
      <CajaCheckout />
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
