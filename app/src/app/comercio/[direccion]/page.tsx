import { ComercioPublico } from "@/components/cuenta/comercio";

// Vista pública de un comercio por dirección. Sin wallet; la validación
// base58 y los estados honestos viven en `ComercioPublico`.
export default async function ComercioDireccionPage({
  params,
}: PageProps<"/comercio/[direccion]">) {
  const { direccion } = await params;
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <ComercioPublico direccion={direccion} />
    </div>
  );
}
