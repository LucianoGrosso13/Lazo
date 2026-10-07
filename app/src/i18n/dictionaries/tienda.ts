import { defineDict } from "../locale";

/** Diccionario de /tienda: la vidriera de la tienda demo. */
export const tienda = defineDict({
  es: {
    title: "La vidriera",
    lede: "Cada precio entra al vidrio entero y sale partido: un anticipo y tres cuotas, sin interés. Elegí lo tuyo.",
    // Cuando la config ofrece una segunda opción (hoy: 6 cuotas con interés
    // provisional) la lede la nombra con sus números, no con texto fijo.
    ledeAlt: (base: number, n: number, pct: string, provisional: boolean) =>
      `Cada precio entra al vidrio entero y sale partido: un anticipo y ${base} cuotas sin interés, o ${n} con un interés total del ${pct} sobre lo financiado${provisional ? " (provisional)" : ""}. Elegí lo tuyo.`,
    demoBanner: "Tienda demo: productos, precios y stock son simulados.",
    merchantLabel: "Cobra",
    simulated: "simulada",
    down: "Anticipo hoy",
    noDown: "Sin anticipo",
    installments: (n: number) => `${n} cuotas de`,
    zeroInterest: "0% de interés",
    // Alternativa de la config bajo el desglose principal (hoy: 6 cuotas).
    altOption: (n: number, each: string, pct: string, provisional: boolean) =>
      `O ${n} cuotas de US$ ${each} (interés total ${pct}${provisional ? ", provisional" : ""})`,
    buy: "Comprar en cuotas",
    breakdown: "Ver el desglose",
    moreMerchantsLead: "Esta vidriera muestra solo Voltia.",
    moreMerchants: "Ver más comercios",
    yourTier: (n: number) => `Cotizando tu escalón ${n}`,
    marginLine: (available: string, limit: string) =>
      `Margen: US$ ${available} disponibles de US$ ${limit}`,
    guestTier: (downPct: string) => `Sin wallet: cotizás como escalón 0 (${downPct} de anticipo).`,
    guestHint: "Conectá tu wallet para ver tu anticipo real y comprar.",
    reasons: {
      exceeds_tier_max: (max: string) => `Supera el tope de tu escalón (US$ ${max})`,
      exceeds_credit_limit: (used: string, limit: string) =>
        `Te quedaste sin margen (US$ ${used} de US$ ${limit} en uso)`,
      exceeds_guarantor_max_purchase: (max: string) => `Supera el tope de tu garante (US$ ${max})`,
      exceeds_guarantee_coverage: "Tu garante no llega a cubrirlo",
      no_guarantee: "Necesitás un garante para comprar",
      blocked_after_default: "Bloqueado por una mora anterior",
      has_active_plan: "Ya tenés un plan activo",
      protocol_halted: "El protocolo está en pausa",
      option_unavailable: "Esta opción no está disponible",
    },
    loadingAria: "Cargando la tienda",
    errorTitle: "No se pudo leer la tienda",
    errorBody: "Falló la lectura del estado del protocolo. Probá de nuevo.",
    retry: "Reintentar",
    cardAria: (name: string, price: string, down: string, inst: string, n: number, alt: string | null) =>
      `${name}, US$ ${price}. Anticipo US$ ${down} y ${n} cuotas de US$ ${inst}, sin interés.${alt ? ` ${alt}` : ""}`,
    footer: "Los montos salen de la configuración del protocolo y de tu escalón. Nada es real: corre en devnet.",
  },
  en: {
    title: "The shop window",
    lede: "Every price enters the glass whole and leaves split: a down payment and three installments, interest-free. Pick yours.",
    ledeAlt: (base: number, n: number, pct: string, provisional: boolean) =>
      `Every price enters the glass whole and leaves split: a down payment and ${base} interest-free installments, or ${n} with a ${pct} total interest on the financed amount${provisional ? " (provisional)" : ""}. Pick yours.`,
    demoBanner: "Demo store: products, prices and stock are simulated.",
    merchantLabel: "Sold by",
    simulated: "simulated",
    down: "Down payment today",
    noDown: "No down payment",
    installments: (n: number) => `${n} installments of`,
    zeroInterest: "0% interest",
    altOption: (n: number, each: string, pct: string, provisional: boolean) =>
      `Or ${n} installments of US$ ${each} (${pct} total interest${provisional ? ", provisional" : ""})`,
    buy: "Buy in installments",
    breakdown: "See the breakdown",
    moreMerchantsLead: "This shop window only shows Voltia.",
    moreMerchants: "See more merchants",
    yourTier: (n: number) => `Quoting your tier ${n}`,
    marginLine: (available: string, limit: string) =>
      `Margin: US$ ${available} of US$ ${limit} available`,
    guestTier: (downPct: string) => `No wallet: you're quoted as tier 0 (${downPct} down payment).`,
    guestHint: "Connect your wallet to see your real down payment and buy.",
    reasons: {
      exceeds_tier_max: (max: string) => `Over your tier's cap (US$ ${max})`,
      exceeds_credit_limit: (used: string, limit: string) =>
        `You're out of credit margin (US$ ${used} of US$ ${limit} in use)`,
      exceeds_guarantor_max_purchase: (max: string) => `Over your guarantor's cap (US$ ${max})`,
      exceeds_guarantee_coverage: "Your guarantor can't cover this much",
      no_guarantee: "You need a guarantor to buy",
      blocked_after_default: "Blocked after a late payment",
      has_active_plan: "You already have an active plan",
      protocol_halted: "The protocol is paused",
      option_unavailable: "This option is not available",
    },
    loadingAria: "Loading the store",
    errorTitle: "Couldn't read the store",
    errorBody: "Reading the protocol state failed. Try again.",
    retry: "Retry",
    cardAria: (name: string, price: string, down: string, inst: string, n: number, alt: string | null) =>
      `${name}, US$ ${price}. US$ ${down} down payment and ${n} installments of US$ ${inst}, interest-free.${alt ? ` ${alt}` : ""}`,
    footer: "Amounts come from the protocol config and your tier. Nothing is real: it runs on devnet.",
  },
});
