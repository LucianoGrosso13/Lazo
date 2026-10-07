"use client";

import { useState } from "react";
import Link from "next/link";
import { GlassPanel } from "@/components/ui/glass";
import { BigNumber } from "@/components/ui/big-number";
import { Chip } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/locale";
import { mostrador } from "@/i18n/dictionaries/mostrador";
import type { CounterOrder, UnixSeconds } from "@/lib/cuotas";
import { QRCodeDisplay } from "./qr-code";

interface OrdenActivaCardProps {
  order: CounterOrder;
  onNuevaOrden?: () => void;
}

const fmtHora = (at: UnixSeconds, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(at * 1000);

export function OrdenActivaCard({ order, onNuevaOrden }: OrdenActivaCardProps) {
  const t = useT(mostrador);
  const { locale } = useLocale();
  const [copiado, setCopiado] = useState(false);

  // Obtener URL absoluta de la orden
  const orderPath = `/orden/${order.id}`;
  const orderUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${orderPath}`
      : orderPath;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(orderUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fallback
    }
  };

  const statusChip = (() => {
    if (order.status === "paid") {
      return (
        <span
          data-testid="orden-estado-badge"
          className="inline-flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1 font-num text-xs font-medium text-green"
        >
          <span className="size-2 rounded-full bg-green" />
          {t.ordenPagada}
        </span>
      );
    }
    if (order.status === "expired") {
      return (
        <span
          data-testid="orden-estado-badge"
          className="inline-flex items-center gap-1.5 rounded-full border border-crack/30 bg-crack/10 px-3 py-1 font-num text-xs font-medium text-crack"
        >
          <span className="size-2 rounded-full bg-crack" />
          {t.ordenVencida}
        </span>
      );
    }
    return (
      <span
        data-testid="orden-estado-badge"
        className="inline-flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 font-num text-xs font-medium text-cyan"
      >
        <span className="size-2 rounded-full bg-cyan motion-safe:animate-pulse" />
        {t.esperandoCliente}
      </span>
    );
  })();

  return (
    <GlassPanel className="p-5 sm:p-6" data-testid="orden-activa-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-beam/8 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-semibold text-beam">{t.ordenActivaTitulo}</h2>
            <Chip>{`#${order.id}`}</Chip>
          </div>
          <p className="mt-1 text-sm text-ink-2">{order.description}</p>
        </div>
        <div>{statusChip}</div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
        {/* Lado izquierdo: QR Code */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-beam/10 bg-beam/[0.02] p-6">
          <QRCodeDisplay value={orderUrl} size={220} />

          {/* Botón Abrir como cliente para la demo */}
          <div className="mt-5 w-full max-w-[280px] text-center">
            <Link
              href={orderPath}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="btn-abrir-como-cliente"
              className={`${buttonClasses("secondary", "sm")} w-full justify-center`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mr-1.5 size-4"
              >
                <path d="M6 3h7v7M13 3 7 9" />
              </svg>
              {t.abrirComoCliente}
            </Link>
            <p className="mt-1.5 text-[0.6875rem] text-ink-ghost">
              {t.abrirComoClienteHint}
            </p>
          </div>
        </div>

        {/* Lado derecho: Detalles y link copiable */}
        <div className="space-y-5">
          <div>
            <span className="font-num text-xs uppercase tracking-wider text-ink-3">
              {t.colMonto}
            </span>
            <div className="mt-1">
              <BigNumber amount={order.amount} size="lg" decimals={2} />
              <span className="ml-2 font-num text-xs text-ink-ghost">devUSDC</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-xl border border-beam/8 bg-beam/[0.02] p-4 text-xs">
            <div>
              <span className="text-ink-ghost">{t.creadaEl}</span>
              <p className="mt-0.5 font-num text-ink-2">{fmtHora(order.createdAt, locale)}</p>
            </div>
            <div>
              <span className="text-ink-ghost">{t.venceEl}</span>
              <p className="mt-0.5 font-num text-ink-2">{fmtHora(order.expiresAt, locale)}</p>
            </div>
          </div>

          {order.status === "paid" && (
            <div
              data-testid="orden-pagada-banner"
              className="rounded-xl border border-green/30 bg-green/[0.07] p-4"
            >
              <div className="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5 text-green"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium text-green">{t.ordenPagada}</span>
              </div>
              <p className="mt-1 text-xs text-ink-2">{t.ventaAcreditada}</p>
              {order.planId && (
                <p className="mt-2 font-num text-xs text-ink-3">
                  {t.planAsociado}: <span className="text-beam font-medium">{order.planId}</span>
                </p>
              )}
            </div>
          )}

          {/* Link copiable */}
          <div>
            <label
              htmlFor="orden-link-input"
              className="block font-num text-xs uppercase tracking-wider text-ink-3"
            >
              {t.linkOrden}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="orden-link-input"
                data-testid="orden-link-input"
                type="text"
                readOnly
                value={orderUrl}
                className="min-w-0 flex-1 truncate rounded-xl border border-beam/15 bg-beam/[0.04] px-3.5 py-2 font-num text-xs text-ink-2 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopiar}
                data-testid="btn-copiar-link"
                className={buttonClasses("secondary", "sm")}
              >
                {copiado ? t.linkCopiado : t.copiarLink}
              </button>
            </div>
          </div>

          {onNuevaOrden && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNuevaOrden}
                className={buttonClasses("ghost", "sm")}
                data-testid="btn-crear-otra"
              >
                + {t.generarOtra}
              </button>
            </div>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
