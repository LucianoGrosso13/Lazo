import type { Metadata } from "next";
import { ParaComercios } from "@/components/audience/para-comercios";

export const metadata: Metadata = {
  title: "Comercios · Lazo",
  description:
    "Cómo funciona Lazo para comercios: vendé en cuotas sin tarjeta, elegí cuándo cobrar y la comisión baja si esperás. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries (audience-common mientras sea placeholder).
export default function ParaComerciosPage() {
  return <ParaComercios />;
}
