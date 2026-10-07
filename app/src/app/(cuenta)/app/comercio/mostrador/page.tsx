"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/cuenta/account-context";
import { FlujoPasos } from "@/components/mostrador/flujo-pasos";
import { HistorialOrdenes } from "@/components/mostrador/historial-ordenes";
import { NuevaOrdenForm } from "@/components/mostrador/nueva-orden-form";
import { OrdenActivaCard } from "@/components/mostrador/orden-activa-card";
import { Button, buttonClasses } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass";
import { mostrador } from "@/i18n/dictionaries/mostrador";
import { useLocale, useT } from "@/i18n/locale";
import { DEMO_MERCHANT, getCuotas, type CounterOrder, type WalletAddress } from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";

export default function MostradorPage() {
  const t = useT(mostrador);
  const { locale } = useLocale();
  const account = useAccount();
  const [selected, setSelected] = useState<CounterOrder | null>(null);
  const [realUnavailable, setRealUnavailable] = useState(false);
  const isMock = getCuotas().mode === "mock";
  const merchant = account.account?.role === "merchant" ? account.account.address : null;
  const queryAddress = merchant ?? (isMock && account.demoId === "merchant" ? DEMO_MERCHANT : null);
  const { data: orders = [], mutate } = useCuotasQuery<CounterOrder[]>(
    queryAddress ? ["counter-orders", queryAddress] : null,
    (c) => c.listCounterOrders(queryAddress as WalletAddress),
  );
  const { data: merchantInfo } = useCuotasQuery(
    queryAddress ? ["counter-merchant", queryAddress] : null,
    (c) => c.getMerchant(queryAddress as WalletAddress),
  );

  useEffect(() => {
    if (!isMock) {
      getCuotas().listCounterOrders(DEMO_MERCHANT).catch(() => setRealUnavailable(true));
    }
  }, [isMock]);

  const todayOrders = useMemo(() => orders, [orders]);
  const chooseMerchant = () => account.selectDemo("merchant");

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8" data-testid="mostrador-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-beam sm:text-3xl">{t.titulo}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">{t.subtitulo}</p>
        </div>
        <Link href="/app/comercio" className={buttonClasses("secondary", "sm")}>{locale === "es" ? "Cuenta del comercio" : "Merchant account"}</Link>
      </header>

      {!isMock ? (
        <GlassPanel className="p-5 sm:p-6" role="status">
          <h2 className="text-base font-semibold text-beam">{t.modoSimulador}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">{realUnavailable ? t.realAviso : t.realAviso}</p>
        </GlassPanel>
      ) : !queryAddress ? (
        <GlassPanel className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div><h2 className="text-base font-semibold text-beam">{t.sinComercioTitulo}</h2><p className="mt-1 text-sm text-ink-2">{t.sinComercioDesc}</p></div>
          <Button onClick={chooseMerchant}>{t.seleccionarDemoMerchant}</Button>
        </GlassPanel>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
            <span className="text-ink-3">{t.comercioActivo}:</span>
            <strong className="text-beam">{merchantInfo?.name ?? t.comercioActivo}</strong>
            {account.demoId === "merchant" && <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-xs text-cyan">{t.comerciosEjemplo}</span>}
          </div>
          <FlujoPasos />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <NuevaOrdenForm merchant={queryAddress} onCreated={(order) => { setSelected(order); void mutate(); }} />
            {selected ? <OrdenActivaCard order={selected} onNuevaOrden={() => setSelected(null)} /> : <GlassPanel className="flex min-h-64 items-center justify-center p-6 text-center"><p className="max-w-sm text-sm leading-relaxed text-ink-2">{t.ordenActivaVacia}</p></GlassPanel>}
          </div>
          <HistorialOrdenes orders={todayOrders} selectedOrderId={selected?.id} onSelectOrder={setSelected} />
        </>
      )}
    </main>
  );
}
