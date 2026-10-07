import type { Metadata } from "next";
import Link from "next/link";
import { ComercioPublico } from "@/components/cuenta/comercio";
import { MerchantStore } from "@/components/store/merchant-store";
import { getDirectoryMerchant } from "@/lib/merchants";

// Perfil del comercio. Si la dirección está en el directorio demo, es su
// tienda (el layout de vidriera con productos comprables); si es válida pero
// no está, cae en la vista pública actual (datos en cadena/mock); si es
// inválida, `ComercioPublico` muestra el estado honesto de siempre.
export async function generateMetadata({
  params,
}: PageProps<"/comercio/[direccion]">): Promise<Metadata> {
  const { direccion } = await params;
  const merchant = getDirectoryMerchant(direccion);
  if (!merchant) {
    return {
      title: "Comercio · Lazo",
      description: "Vista pública de comercio en devnet (demo).",
    };
  }
  return {
    title: `${merchant.name} · Lazo`,
    description: `${merchant.description.es} Precios partidos en cuotas (demo, devnet).`,
  };
}

export default async function ComercioDireccionPage({
  params,
}: PageProps<"/comercio/[direccion]">) {
  const { direccion } = await params;
  const merchant = getDirectoryMerchant(direccion);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {merchant ? (
        <MerchantStore merchant={merchant} />
      ) : (
        <div className="py-8">
          <div className="mx-auto mb-6 w-full max-w-3xl">
            <Link
              href="/comercio"
              className="inline-flex min-h-[2.5rem] items-center gap-1.5 text-sm text-ink-2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-cyan"
            >
              <span aria-hidden>←</span> Todos los comercios
            </Link>
          </div>
          <ComercioPublico direccion={direccion} />
        </div>
      )}
    </div>
  );
}
