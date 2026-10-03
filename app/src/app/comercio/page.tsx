import type { Metadata } from "next";
import { ComercioEntrada } from "@/components/cuenta/comercio";

export const metadata: Metadata = {
  title: "Comercio · Lazo",
  description:
    "Panel público del comercio en Lazo: cobros al instante, ventas en cuotas y comisión frente a alternativas. Devnet.",
};

// Entrada pública del comercio: buscador por dirección + el comercio de
// ejemplo (solo modo mock). Nunca exige wallet.
export default function ComercioPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ComercioEntrada />
    </div>
  );
}
