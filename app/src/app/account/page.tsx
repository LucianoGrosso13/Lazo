import type { Metadata } from "next";
import { MockAccount } from "@/components/cuenta/mock-account";

export const metadata: Metadata = {
  title: "Mi cuenta (demo) · Lazo",
  description:
    "Tablero simulado: planes y cuotas, fiador, comercio, pool y actividad del comprador de la demo. Nada se firma ni se envía.",
};

export default function Page() {
  return <MockAccount />;
}
