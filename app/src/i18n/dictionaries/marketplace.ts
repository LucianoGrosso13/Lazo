import { defineDict } from "../locale";

/**
 * Marketplace de comercios demo: /comercio (buscador + chips + grilla) y
 * /comercio/[direccion] (perfil del directorio con productos y CTA al
 * checkout). Los comercios son ficticios y se declaran "demo"; los términos
 * (cuotas, interés, plazo de cobro) salen de la config vía helpers.
 */
export const marketplace = defineDict({
  es: {
    title: "Comercios que aceptan Lazo",
    lede: "Buscá por nombre, producto o categoría. Cada comercio tiene su perfil con productos para comprar en cuotas.",
    notice:
      "Comercios de ejemplo para la demo; no son aliados reales.",
    searchLabel: "Buscar comercios",
    searchPlaceholder: "Nombre, producto o categoría…",
    searchClear: "Limpiar búsqueda",
    categoriesLabel: "Filtrar por categoría",
    allCategories: "Todas",
    resultsWord: (n: number) => (n === 1 ? "comercio" : "comercios"),
    results: (n: number) => (n === 1 ? "1 comercio" : `${n} comercios`),
    emptyTitle: "Sin resultados",
    emptyBody:
      "Nada coincide con esa búsqueda. Probá otra palabra o limpiá los filtros.",
    clearFilters: "Limpiar filtros",
    demoTag: "demo",
    featuredTag: "destacado",
    productsCount: (n: number) => (n === 1 ? "1 producto" : `${n} productos`),
    addressDetected:
      "Eso es una dirección de Solana: podés abrir la vista pública del comercio registrado con esa dirección.",
    addressDetectedCta: "Ver por dirección",
    cardAria: (name: string, category: string, city: string, products: string) =>
      `${name}, ${category}, ${city}. ${products}. Comercio demo.`,
    backToMarketplace: "Todos los comercios",
    acceptedPlans: "Acepta",
    planChip: (n: number) => `${n} cuotas`,
    planOptionLine: (n: number, amount: string) => `${n} cuotas de US$ ${amount}`,
    zeroInterest: "sin interés",
    provisionalTag: "provisional",
    settlementNow: "Cobra al instante",
    settlementIn: (days: number) => `Cobra a ${days} días de la compra`,
    productsTitle: "Productos",
    tierNote:
      "Precios partidos con la cotización de una cuenta nueva con fiador; con tu historial el anticipo puede bajar.",
    buy: "Comprar en cuotas",
    productAria: (name: string, price: string) => `${name}, US$ ${price}`,
    foot: "Marketplace simulado en devnet: comercios, productos y precios son de ejemplo.",
    loadingAria: "Cargando comercios",
  },
  en: {
    title: "Merchants that accept Lazo",
    lede: "Search by name, product or category. Every merchant has a profile with products you can buy in installments.",
    notice: "Sample merchants for the demo; they are not real partners.",
    searchLabel: "Search merchants",
    searchPlaceholder: "Name, product or category…",
    searchClear: "Clear search",
    categoriesLabel: "Filter by category",
    allCategories: "All",
    resultsWord: (n: number) => (n === 1 ? "merchant" : "merchants"),
    results: (n: number) => (n === 1 ? "1 merchant" : `${n} merchants`),
    emptyTitle: "No results",
    emptyBody: "Nothing matches that search. Try another word or clear the filters.",
    clearFilters: "Clear filters",
    demoTag: "demo",
    featuredTag: "featured",
    productsCount: (n: number) => (n === 1 ? "1 product" : `${n} products`),
    addressDetected:
      "That's a Solana address: you can open the public view of the merchant registered with it.",
    addressDetectedCta: "View by address",
    cardAria: (name: string, category: string, city: string, products: string) =>
      `${name}, ${category}, ${city}. ${products}. Demo merchant.`,
    backToMarketplace: "All merchants",
    acceptedPlans: "Accepts",
    planChip: (n: number) => `${n} installments`,
    planOptionLine: (n: number, amount: string) => `${n} installments of US$ ${amount}`,
    zeroInterest: "interest-free",
    provisionalTag: "provisional",
    settlementNow: "Settles instantly",
    settlementIn: (days: number) => `Settles ${days} days after purchase`,
    productsTitle: "Products",
    tierNote:
      "Prices split with the quote a new backed account gets; your track record can lower the down payment.",
    buy: "Buy in installments",
    productAria: (name: string, price: string) => `${name}, US$ ${price}`,
    foot: "Simulated marketplace on devnet: merchants, products and prices are examples.",
    loadingAria: "Loading merchants",
  },
});
