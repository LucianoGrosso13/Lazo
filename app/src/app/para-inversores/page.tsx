import type { Metadata } from "next";
import { ParaInversores } from "@/components/audience/para-inversores";

export const metadata: Metadata = {
  title: "Inversores · Lazo",
  description:
    "Cómo funciona Lazo para inversores: de dónde sale el rendimiento del pool, el reparto de cada compra, tramos junior/senior y riesgos explícitos, sin rendimiento prometido. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-inversores.ts.
export default function ParaInversoresPage() {
  return <ParaInversores />;
}
