import type { WalletAddress } from "./cuotas";
import { MERCHANTS, type DirectoryProduct } from "./merchants";

// Catálogo de la tienda demo (simulada): junta los productos de todos los
// comercios del directorio (`src/lib/merchants`). Precios en micro-USDC.
export interface Product extends DirectoryProduct {
  /** Comercio dueño: su cuenta Merchant del mock (dirección base58). */
  merchant: WalletAddress;
}

export const CATALOG: Product[] = MERCHANTS.flatMap((m) =>
  m.products.map((p) => ({ ...p, merchant: m.address })),
);

export const getProduct = (id: string) => CATALOG.find((p) => p.id === id) ?? null;

/** Productos de un comercio del directorio (su tienda los filtra por dirección). */
export const productsByMerchant = (merchant: WalletAddress): Product[] =>
  CATALOG.filter((p) => p.merchant === merchant);
