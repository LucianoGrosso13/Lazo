import { AccountProvider } from "@/components/cuenta/account-context";
import { AccountShell } from "@/components/cuenta/account-shell";

// Layout de las rutas de cuenta (`/app/...`). El grupo `(cuenta)` no agrega
// segmento a la URL; suma el proveedor de cuenta y el shell compartido.
export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountProvider>
      <AccountShell>{children}</AccountShell>
    </AccountProvider>
  );
}
