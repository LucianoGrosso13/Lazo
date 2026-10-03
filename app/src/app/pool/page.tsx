import type { Metadata } from "next";
import { PoolView } from "@/components/cuenta/pool";

export const metadata: Metadata = {
  title: "Pool · Lazo",
  description:
    "Panel público del pool de Lazo: NAV, tramos junior y senior, utilización y movimientos verificables. Devnet.",
};

// Consulta pública del pool: NAV, tramos, utilización y movimientos. Sin wallet.
export default function PoolPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PoolView />
    </div>
  );
}
