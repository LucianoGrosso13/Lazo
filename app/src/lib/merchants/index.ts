// Funciones puras del directorio: normalización, búsqueda, filtro por
// categoría, destacados y lookups. Sin estado ni React: las usan la
// página del marketplace, el seed del mock y los tests.
import type { CategoryId, DemoMerchant, MerchantCategory } from "./data";
import { CATEGORIES, MERCHANTS } from "./data";

export * from "./data";

/** Minúsculas y sin tildes: "Electrónica" y "electronica" coinciden. */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Orden estable del directorio: destacados primero, después alfabético
// por nombre; la dirección desempata para que el orden sea total.
const byName = new Intl.Collator("es", { sensitivity: "base" });
const sortDirectory = (a: DemoMerchant, b: DemoMerchant) =>
  Number(b.featured) - Number(a.featured) ||
  byName.compare(a.name, b.name) ||
  a.address.localeCompare(b.address);

/** Texto donde se busca un comercio: nombre, descripción, categoría y productos (ambos idiomas). */
function searchCorpus(m: DemoMerchant): string {
  const category = CATEGORIES.find((c) => c.id === m.category);
  return [
    m.name,
    m.description.es,
    m.description.en,
    category?.label.es ?? "",
    category?.label.en ?? "",
    ...m.products.flatMap((p) => [p.name.es, p.name.en]),
  ]
    .map(normalizeSearch)
    .join(" ");
}

export interface MerchantQuery {
  /** Texto libre; vacío o solo espacios no filtra. */
  q?: string;
  /** Filtro por categoría, combinable con `q`. */
  categoryId?: CategoryId | null;
}

/**
 * Busca comercios del directorio: texto sin distinguir mayúsculas ni
 * tildes sobre nombre, descripción, categoría y productos; filtro por
 * categoría combinable. Resultado ordenado (destacados, alfabético).
 */
export function searchMerchants(query: MerchantQuery = {}): DemoMerchant[] {
  const q = normalizeSearch(query.q ?? "").trim();
  return MERCHANTS.filter(
    (m) =>
      (query.categoryId == null || m.category === query.categoryId) &&
      (q === "" || searchCorpus(m).includes(q)),
  ).sort(sortDirectory);
}

/** Destacados del home/marketplace, en el orden estable del directorio. */
export function featuredMerchants(): DemoMerchant[] {
  return MERCHANTS.filter((m) => m.featured).sort(sortDirectory);
}

/** Comercio del directorio por dirección (null si no está o no es válido). */
export function getDirectoryMerchant(address: string): DemoMerchant | null {
  return MERCHANTS.find((m) => m.address === address) ?? null;
}

export function getCategory(id: string): MerchantCategory | null {
  return CATEGORIES.find((c) => c.id === id) ?? null;
}
