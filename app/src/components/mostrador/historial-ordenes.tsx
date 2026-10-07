"use client";

import { GlassPanel } from "@/components/ui/glass";
import { Chip } from "@/components/ui/chip";
import { buttonClasses } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/locale";
import { mostrador } from "@/i18n/dictionaries/mostrador";
import { formatUsdc, type CounterOrder, type UnixSeconds } from "@/lib/cuotas";

interface HistorialOrdenesProps {
  orders: CounterOrder[];
  selectedOrderId?: string;
  onSelectOrder: (order: CounterOrder) => void;
}

const fmtHoraCorta = (at: UnixSeconds, locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(at * 1000);

export function HistorialOrdenes({
  orders,
  selectedOrderId,
  onSelectOrder,
}: HistorialOrdenesProps) {
  const t = useT(mostrador);
  const { locale } = useLocale();

  return (
    <GlassPanel className="p-5 sm:p-6" data-testid="mostrador-historial">
      <div className="flex items-baseline justify-between gap-3 border-b border-beam/8 pb-3">
        <h2 className="text-base font-semibold text-beam">{t.historialTitulo}</h2>
        <span className="font-num text-xs tabular-nums text-ink-ghost">
          {t.contadorOrdenes(orders.length)}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-2">{t.historialVacio}</p>
      ) : (
        <ul className="mt-3 divide-y divide-beam/8" data-testid="lista-ordenes">
          {orders.map((ord) => {
            const isSelected = ord.id === selectedOrderId;
            const statusLabel =
              ord.status === "paid"
                ? t.ordenPagada
                : ord.status === "expired"
                  ? t.ordenVencida
                  : t.esperandoCliente;

            const statusClass =
              ord.status === "paid"
                ? "text-green border-green/30 bg-green/10"
                : ord.status === "expired"
                  ? "text-crack border-crack/30 bg-crack/10"
                  : "text-cyan border-cyan/30 bg-cyan/10";

            return (
              <li
                key={ord.id}
                className={`py-3.5 first:pt-2 last:pb-1 transition-colors ${
                  isSelected ? "bg-cyan/[0.04] -mx-2 px-2 rounded-xl" : ""
                }`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-num text-xs font-semibold text-beam">
                        #{ord.id}
                      </span>
                      <span className="text-xs text-ink-ghost">
                        {fmtHoraCorta(ord.createdAt, locale)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-num text-[0.6875rem] font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                      {isSelected && <Chip on>{t.seleccionada}</Chip>}
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-2">{ord.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <span className="font-num text-base font-semibold tabular-nums text-beam">
                        US$ {formatUsdc(ord.amount, locale)}
                      </span>
                      <span className="block text-[0.6875rem] text-ink-ghost">devUSDC</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectOrder(ord)}
                      data-testid={`btn-ver-qr-${ord.id}`}
                      className={buttonClasses("secondary", "sm")}
                    >
                      {t.verQr}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
