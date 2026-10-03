"use client";

// Cuenta del administrador: la autoridad la verifica `getAccountCuotas()` en
// cada lectura y mutación; esta página no concede nada por sí sola.
import { AdminPanel } from "@/components/cuenta/admin";

export default function AdminPage() {
  return <AdminPanel />;
}
