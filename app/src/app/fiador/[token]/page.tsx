import type { Metadata } from "next";
import { FiadorEntry } from "@/components/cuenta/fiador/fiador";

export const metadata: Metadata = {
  title: "Garante · Lazo",
  description:
    "Alta y seguimiento del garante de Lazo por invitación. Demo en Solana devnet: la plata es de prueba.",
};

// Entrada del fiador por enlace de invitación: el token ES la credencial, no
// hace falta wallet. La resolución y los estados viven en FiadorEntry.
export default async function FiadorPage({
  params,
}: PageProps<"/fiador/[token]">) {
  const { token } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <FiadorEntry token={token} />
    </div>
  );
}
