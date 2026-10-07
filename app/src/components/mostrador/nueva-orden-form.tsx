"use client";

import { useState } from "react";
import { GlassPanel } from "@/components/ui/glass";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale";
import { mostrador } from "@/i18n/dictionaries/mostrador";
import { getCuotas, type CounterOrder, type WalletAddress } from "@/lib/cuotas";

interface NuevaOrdenFormProps {
  merchant: WalletAddress;
  onCreated: (order: CounterOrder) => void;
}

export function NuevaOrdenForm({ merchant, onCreated }: NuevaOrdenFormProps) {
  const t = useT(mostrador);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMonto, setErrorMonto] = useState(false);
  const [errorDesc, setErrorDesc] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMonto(false);
    setErrorDesc(false);
    setErrorGeneral(null);

    const parsedMonto = parseFloat(monto.replace(",", "."));
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorMonto(true);
      return;
    }

    const trimmedDesc = descripcion.trim();
    if (!trimmedDesc) {
      setErrorDesc(true);
      return;
    }

    const microAmount = Math.round(parsedMonto * 1_000_000);

    setLoading(true);
    try {
      const order = await getCuotas().createCounterOrder(merchant, {
        amount: microAmount,
        description: trimmedDesc,
      });
      setMonto("");
      setDescripcion("");
      onCreated(order);
    } catch {
      setErrorGeneral(t.errorGenerar);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassPanel className="p-5 sm:p-6" data-testid="nueva-orden-panel">
      <h2 className="text-base font-semibold text-beam">{t.nuevaOrdenTitulo}</h2>

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="orden-monto"
            className="block font-num text-xs uppercase tracking-wider text-ink-3"
          >
            {t.campoMonto}
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 font-num text-sm text-ink-ghost">
              US$
            </span>
            <input
              id="orden-monto"
              data-testid="input-orden-monto"
              type="text"
              inputMode="decimal"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value);
                setErrorMonto(false);
              }}
              placeholder={t.campoMontoPlaceholder}
              aria-invalid={errorMonto}
              aria-describedby={errorMonto ? "orden-monto-error" : undefined}
              className="w-full rounded-xl border border-beam/15 bg-beam/[0.04] py-2.5 pr-4 pl-12 font-num text-sm text-ink placeholder:text-ink-ghost focus:border-cyan/60 focus:outline-none"
            />
          </div>
          {errorMonto && (
            <p
              id="orden-monto-error"
              role="alert"
              className="mt-1.5 text-xs text-crack"
            >
              {t.errorMonto}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="orden-descripcion"
            className="block font-num text-xs uppercase tracking-wider text-ink-3"
          >
            {t.campoDescripcion}
          </label>
          <input
            id="orden-descripcion"
            data-testid="input-orden-descripcion"
            type="text"
            value={descripcion}
            onChange={(e) => {
              setDescripcion(e.target.value);
              setErrorDesc(false);
            }}
            placeholder={t.campoDescripcionPlaceholder}
            aria-invalid={errorDesc}
            aria-describedby={errorDesc ? "orden-desc-error" : undefined}
            className="mt-1.5 w-full rounded-xl border border-beam/15 bg-beam/[0.04] px-4 py-2.5 text-sm text-ink placeholder:text-ink-ghost focus:border-cyan/60 focus:outline-none"
          />
          {errorDesc && (
            <p
              id="orden-desc-error"
              role="alert"
              className="mt-1.5 text-xs text-crack"
            >
              {t.errorDescripcion}
            </p>
          )}
        </div>

        {errorGeneral && (
          <p role="alert" className="text-xs text-crack">
            {errorGeneral}
          </p>
        )}

        <div className="pt-1">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto"
            data-testid="btn-generar-orden"
          >
            {loading ? t.generando : t.botonGenerar}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}
