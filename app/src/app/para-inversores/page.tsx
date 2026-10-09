import type { Metadata } from "next";
import { ParaInversores } from "@/components/audience/para-inversores";

export const metadata: Metadata = {
  title: "Inversores · Lazo",
  description:
    "Cómo funciona Lazo para inversores: rendimiento objetivo del tramo senior, supuestos del modelo, desglose D8, tramos de cobro comprometidos y regla de liquidez del pool. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-inversores.ts.
export default function ParaInversoresPage() {
  return (
    <div data-role="investor">
      <ParaInversores />
    </div>
  );
}
