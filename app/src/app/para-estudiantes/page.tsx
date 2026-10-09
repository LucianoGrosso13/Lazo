import type { Metadata } from "next";
import { ParaEstudiantes } from "@/components/audience/para-estudiantes";

export const metadata: Metadata = {
  title: "Compradores y garantes · Lazo",
  description:
    "Cómo funciona Lazo para compradores y garantes: 3 cuotas sin interés o 6 con 3% total (desde US$ 350), garante obligatorio al 100% de capital e interés, tiers con reglas visibles y línea de mora. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-estudiantes.ts.
export default function ParaEstudiantesPage() {
  return <ParaEstudiantes />;
}
