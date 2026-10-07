import type { Metadata } from "next";
import { ParaEstudiantes } from "@/components/audience/para-estudiantes";

export const metadata: Metadata = {
  title: "Estudiantes y familias · Lazo",
  description:
    "Cómo funciona Lazo para estudiantes y familias: cuotas con fiador, anticipo que baja con la escalera y reglas claras de mora. Demo simulada en Solana devnet.",
};

// Página por audiencia: el contenido vive en components/audience/ y los
// textos en i18n/dictionaries (audience-common mientras sea placeholder).
export default function ParaEstudiantesPage() {
  return <ParaEstudiantes />;
}
