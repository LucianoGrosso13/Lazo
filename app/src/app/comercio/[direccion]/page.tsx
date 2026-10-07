import { ComercioPublico } from "@/components/cuenta/comercio";
import { MerchantProfile } from "@/components/marketplace/merchant-profile";
import { getDirectoryMerchant } from "@/lib/merchants";

// Perfil del comercio. Si la dirección está en el directorio demo, es el
// perfil del marketplace (productos comprables); si es válida pero no está,
// cae en la vista pública actual (datos en cadena/mock); si es inválida,
// `ComercioPublico` muestra el estado honesto de siempre.
export default async function ComercioDireccionPage({
  params,
}: PageProps<"/comercio/[direccion]">) {
  const { direccion } = await params;
  const merchant = getDirectoryMerchant(direccion);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {merchant ? (
        <MerchantProfile merchant={merchant} />
      ) : (
        <div className="py-8">
          <ComercioPublico direccion={direccion} />
        </div>
      )}
    </div>
  );
}
