import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketplacePage } from "@/components/marketplace/marketplace-page";

export const metadata: Metadata = {
  title: "Comercios · Lazo",
  description:
    "Marketplace de comercios demo que aceptan Lazo: buscá por nombre, producto o categoría y comprá en cuotas en devnet.",
};

// /comercio es el marketplace del directorio demo (simulado). La cuenta
// propia del comercio sigue en /app/comercio. Suspense: la página cliente
// lee ?q=&cat= con useSearchParams.
export default function ComercioPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <Suspense>
        <MarketplacePage />
      </Suspense>
    </div>
  );
}
