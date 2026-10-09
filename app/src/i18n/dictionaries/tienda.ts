import { defineDict } from "../locale";
import { tierLabel } from "./tiers";

/** Diccionario de la vidriera de cada comercio demo (/comercio/[direccion]). */
export const tienda = defineDict({
  es: {
    lede: "Cada precio entra al vidrio entero y sale partido: un anticipo y tres cuotas, sin interés. Elegí lo tuyo.",
    ledeAlt: (base: number, n: number, pct: string) =>
      `Cada precio entra al vidrio entero y sale partido: un anticipo y ${base} cuotas sin interés, o ${n} con un interés total del ${pct} sobre lo financiado. Elegí lo tuyo.`,
    demoBanner: "Tienda demo: productos, precios y stock son simulados.",
    merchantLabel: "Cobra",
    simulated: "simulada",
    down: "Anticipo hoy",
    noDown: "Sin anticipo",
    installments: (n: number) => `${n} cuotas de`,
    zeroInterest: "0% de interés",
    // Alternativa de la config bajo el desglose principal (hoy: 6 cuotas).
    altOption: (n: number, each: string, pct: string) =>
      `O ${n} cuotas de US$ ${each} (interés total ${pct})`,
    altMinimum: (n: number, min: string) => `${n} cuotas desde US$ ${min}`,
    buy: "Comprar en cuotas",
    breakdown: "Ver el desglose",
    moreMerchantsLead: (name: string) => `Esta vidriera muestra solo ${name}.`,
    moreMerchants: "Ver más comercios",
    yourTier: (n: number) => `Cotizando ${tierLabel(n)}`,
    marginLine: (available: string, limit: string) =>
      `Margen: US$ ${available} disponibles de US$ ${limit}`,
    guestTier: (downPct: string) => `Sin wallet: cotizás como Tier 1 · Starter (${downPct} de anticipo).`,
    guestHint: "Conectá tu wallet para ver tu anticipo real y comprar.",
    reasons: {
      exceeds_tier_max: (max: string) => `Supera el tope de tu Tier (US$ ${max})`,
      exceeds_credit_limit: (used: string, limit: string) =>
        `Te quedaste sin margen (US$ ${used} de US$ ${limit} en uso)`,
      exceeds_guarantor_max_purchase: (max: string) => `Supera el tope de tu garante (US$ ${max})`,
      exceeds_guarantee_coverage: "Tu garante no llega a cubrirlo",
      no_guarantee: "Necesitás un garante para comprar",
      guarantor_required: "Para abrir un plan necesitás un garante. Invitalo en 2 minutos",
      below_option_min: "6 cuotas desde el mínimo configurado",
      pool_liquidity: "En este momento no hay cupo para planes nuevos. Probá más tarde",
      blocked_after_default: "Bloqueado por una mora anterior",
      has_active_plan: "Ya tenés un plan activo",
      protocol_halted: "El protocolo está en pausa",
      option_unavailable: "Esta opción no está disponible",
      insufficient_funds: "Saldo insuficiente para el anticipo",
    },
    loadingAria: "Cargando la tienda",
    errorTitle: "No se pudo leer la tienda",
    errorBody: "Falló la lectura del estado del protocolo. Probá de nuevo.",
    retry: "Reintentar",
    emptyProductsTitle: "Este comercio no tiene productos publicados",
    emptyProductsBody: "Volvé al directorio para explorar otros comercios de ejemplo.",
    cardAria: (name: string, price: string, down: string, inst: string, n: number, alt: string | null) =>
      `${name}, US$ ${price}. Anticipo US$ ${down} y ${n} cuotas de US$ ${inst}, sin interés.${alt ? ` ${alt}` : ""}`,
    footer: "Los montos salen de la configuración del protocolo y de tu Tier. Nada es real: corre en devnet.",
  },
  en: {
    lede: "Every price enters the glass whole and leaves split: a down payment and three installments, interest-free. Pick yours.",
    ledeAlt: (base: number, n: number, pct: string) =>
      `Every price enters the glass whole and leaves split: a down payment and ${base} interest-free installments, or ${n} with a ${pct} total interest on the financed amount. Pick yours.`,
    demoBanner: "Demo store: products, prices and stock are simulated.",
    merchantLabel: "Sold by",
    simulated: "simulated",
    down: "Down payment today",
    noDown: "No down payment",
    installments: (n: number) => `${n} installments of`,
    zeroInterest: "0% interest",
    altOption: (n: number, each: string, pct: string) =>
      `Or ${n} installments of US$ ${each} (${pct} total interest)`,
    altMinimum: (n: number, min: string) => `${n} installments from US$ ${min}`,
    buy: "Buy in installments",
    breakdown: "See the breakdown",
    moreMerchantsLead: (name: string) => `This shop window only shows ${name}.`,
    moreMerchants: "See more merchants",
    yourTier: (n: number) => `Quoting ${tierLabel(n)}`,
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
      guarantor_required: "You need a guarantor to open a plan. Invite them in 2 minutes",
      below_option_min: "6 installments from the configured minimum",
      pool_liquidity: "There is no capacity for new plans right now. Try again later",
      blocked_after_default: "Blocked after a late payment",
      has_active_plan: "You already have an active plan",
      protocol_halted: "The protocol is paused",
      option_unavailable: "This option is not available",
      insufficient_funds: "Not enough balance for the down payment",
    },
    loadingAria: "Loading the store",
    errorTitle: "Couldn't read the store",
    errorBody: "Reading the protocol state failed. Try again.",
    retry: "Retry",
    emptyProductsTitle: "This merchant has no published products",
    emptyProductsBody: "Return to the directory to browse other example merchants.",
    cardAria: (name: string, price: string, down: string, inst: string, n: number, alt: string | null) =>
      `${name}, US$ ${price}. US$ ${down} down payment and ${n} installments of US$ ${inst}, interest-free.${alt ? ` ${alt}` : ""}`,
    footer: "Amounts come from the protocol config and your tier. Nothing is real: it runs on devnet.",
  },
});
