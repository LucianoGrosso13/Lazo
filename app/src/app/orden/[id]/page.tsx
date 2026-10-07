"use client";

import Link from "next/link";
import { use } from "react";
import { CheckoutScreen } from "@/components/checkout/checkout-screen";
import { GlassPanel } from "@/components/ui/glass";
import { mostrador } from "@/i18n/dictionaries/mostrador";
import { useLocale, useT } from "@/i18n/locale";
import { DEMO_STUDENT_NEW, formatUsdc, getCuotas, type CounterOrder } from "@/lib/cuotas";
import { useCuotasQuery } from "@/lib/use-cuotas";

export default function OrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT(mostrador);
  const { locale } = useLocale();
  const { data: order, error } = useCuotasQuery<CounterOrder>(["counter-order", id], (c) => c.getCounterOrder(id));
  const { data: merchant } = useCuotasQuery(["counter-order-merchant", order?.merchant ?? null], (c) => c.getMerchant(order!.merchant));

  if (error || (order && order.status === "expired")) return <main className="mx-auto max-w-2xl px-4 py-12"><GlassPanel className="p-6 sm:p-8"><h1 className="text-xl font-semibold text-beam">{order?.status === "expired" ? t.ordenVencidaTitulo : t.ordenNoEncontradaTitulo}</h1><p className="mt-2 text-sm leading-relaxed text-ink-2">{order?.status === "expired" ? t.ordenVencidaDesc : t.ordenNoEncontradaDesc}</p><Link className="mt-5 inline-flex min-h-10 items-center text-cyan underline underline-offset-4" href="/tienda">{t.ordenVolverTienda}</Link></GlassPanel></main>;
  if (!order) return <main className="mx-auto max-w-2xl px-4 py-12"><GlassPanel className="p-6"><p className="text-sm text-ink-2">{t.ordenCargando}</p></GlassPanel></main>;
  if (order.status === "paid") return <main className="mx-auto max-w-2xl px-4 py-12"><GlassPanel className="p-6 sm:p-8"><h1 className="text-xl font-semibold text-beam">{t.ordenPagadaTitulo}</h1><p className="mt-2 text-sm leading-relaxed text-ink-2">{t.ordenPagadaDesc(order.planId)}</p><Link className="mt-5 inline-flex min-h-10 items-center text-cyan underline underline-offset-4" href="/tienda">{t.ordenVolverTienda}</Link></GlassPanel></main>;

  const itemName = merchant?.name ?? t.ordenClienteTitulo;
  const itemDescription = `${order.description} · ${formatUsdc(order.amount, locale)} devUSDC`;
  const mockStudent = getCuotas().mode === "mock" ? DEMO_STUDENT_NEW : null;
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8" data-testid="orden-cliente-page">
      <GlassPanel className="p-5 sm:p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-beam">{t.ordenClienteTitulo}</h1>
        <p className="mt-1 text-sm text-ink-2">{t.ordenClienteSubtitulo(itemName)}</p>
        <div className="mt-4 flex flex-col gap-2 border-t border-beam/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs uppercase tracking-wide text-ink-3">{t.colDescripcion}</p><p className="mt-1 text-base text-beam">{order.description}</p></div>
          <p className="font-num text-xl font-semibold tabular-nums text-beam">US$ {formatUsdc(order.amount, locale)} <span className="text-xs font-normal text-ink-3">devUSDC</span></p>
        </div>
      </GlassPanel>
      <CheckoutScreen item={{ name: itemName, blurb: itemDescription, merchant: order.merchant, price: order.amount, orderId: order.id }} demoWallet={mockStudent} backHref="/tienda" backLabel={t.ordenVolverTienda} />
    </main>
  );
}
