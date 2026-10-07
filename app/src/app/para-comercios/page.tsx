import type { Metadata } from "next";
import { ParaComercios } from "@/components/audience/para-comercios";

export const metadata: Metadata = {
  title: "Para comercios · Lazo",
  description:
    "Cómo vende un comercio con Lazo: 3 o 6 cuotas a clientes sin tarjeta, respaldo familiar y elección del plazo de cobro — a más espera, menos comisión. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-comercios.ts.
export default function ParaComerciosPage() {
  return <ParaComercios />;
}
