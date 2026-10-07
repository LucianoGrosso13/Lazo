import type { Metadata } from "next";
import { TiendaPage } from "@/components/store/tienda-page";

export const metadata: Metadata = {
  title: "Tienda demo · Lazo",
  description:
    "Catálogo simulado: cada precio se parte en anticipo y 3 cuotas sin interés o 6 con interés. Corre en Solana devnet.",
};

export default function Page() {
  return <TiendaPage />;
}
