import { ComercioCuenta } from "@/components/cuenta/comercio";

// Cuenta del comercio: usa la identidad común (wallet o selección demo) y
// falla cerrado si el rol resuelto no es merchant.
export default function ComercioCuentaPage() {
  return <ComercioCuenta />;
}
