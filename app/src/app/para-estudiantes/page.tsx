import type { Metadata } from "next";
import { ParaEstudiantes } from "@/components/audience/para-estudiantes";

export const metadata: Metadata = {
  title: "Estudiantes y familias · Lazo",
  description:
    "Cómo funciona Lazo para estudiantes y familias: 3 cuotas sin interés o 6 con interés provisional, fiador al 100%, escalera de anticipo y reglas claras de mora. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries/para-estudiantes.ts.
export default function ParaEstudiantesPage() {
  return <ParaEstudiantes />;
}
