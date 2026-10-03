import { notFound } from "next/navigation";
import { CATALOG, getProduct } from "@/lib/catalog";
import { CheckoutScreen } from "@/components/checkout/checkout-screen";

export function generateStaticParams() {
  return CATALOG.map((p) => ({ producto: p.id }));
}

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<"/checkout/[producto]">) {
  const { producto } = await params;
  const { demo } = await searchParams;
  const product = getProduct(producto);
  if (!product) notFound();
  return (
    <CheckoutScreen
      product={product}
      demoWallet={typeof demo === "string" ? demo : null}
    />
  );
}
