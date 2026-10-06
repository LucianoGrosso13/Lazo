import { EstudianteCuenta } from "@/components/cuenta/estudiante";

// Cuenta del estudiante: usa la identidad común (wallet o selección demo) y
// falla cerrado si el rol resuelto no es student.
export default function EstudianteCuentaPage() {
  return <EstudianteCuenta />;
}
