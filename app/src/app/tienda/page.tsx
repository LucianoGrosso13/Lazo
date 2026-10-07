import { permanentRedirect } from "next/navigation";
import { DEMO_MERCHANT } from "@/lib/cuotas";

// La tienda ya no es una sección propia: cada comercio del marketplace tiene
// la suya en /comercio/[direccion]. /tienda era la vidriera de Kroma (el
// comercio del guion de la demo), así que redirige a su tienda.
export default function Page() {
  permanentRedirect(`/comercio/${DEMO_MERCHANT}`);
}
