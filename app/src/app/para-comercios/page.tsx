import type { Metadata } from "next";
import { ParaComercios } from "@/components/audience/para-comercios";

export const metadata: Metadata = {
  title: "Para comercios · Lazo",
  description:
    "Cómo vende un comercio con Lazo: cuotas respaldadas, cobro en tramos garantizados y venta en mostrador por QR en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-comercios.ts.
export default function ParaComerciosPage() {
  return <ParaComercios />;
}
