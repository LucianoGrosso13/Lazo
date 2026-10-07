import type { Metadata } from "next";
import { ParaInversores } from "@/components/audience/para-inversores";

export const metadata: Metadata = {
  title: "Inversores · Lazo",
  description:
    "Cómo funciona Lazo para inversores: el pool adelanta la parte financiada de cada venta y todo movimiento se verifica en la cadena. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries (audience-common mientras sea placeholder).
export default function ParaInversoresPage() {
  return <ParaInversores />;
}
