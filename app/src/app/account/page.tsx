import type { Metadata } from "next";
import { MockAccount } from "@/components/cuenta/mock-account";

export const metadata: Metadata = {
  title: "Mi cuenta (demo) · Lazo",
  description:
    "Tablero simulado: planes y cuotas, fiador, comercio, pool y actividad del comprador de la demo. Nada se firma ni se envía.",
};

export default function Page() {
  // Mismo ancho y padding lateral que el shell de cuentas: a 390 px el
  // tablero no toca los bordes.
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <MockAccount />
    </div>
  );
}
