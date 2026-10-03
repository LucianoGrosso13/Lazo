import { defineDict } from "../locale";

export const checkout = defineDict({
  es: {
    back: "Tienda",
    price: "Precio",
    breakdownTitle: "Tu desglose",
    tierChip: (n: number) => `Escalón ${n}`,
    previewNote: "Vista previa del escalón 0: conectá tu wallet para ver el tuyo.",
    stageDown: "Anticipo",
    down: "Anticipo · hoy",
    installment: (i: number) => `Cuota ${i}`,
    dueOn: (date: string) => `vence ${date}`,
    total: "Total",
    interestFree: "0% de interés",
    merchantToday: (x: string) => `El comercio cobra US$ ${x} hoy, sin esperar.`,
    guarantorLabel: "Fiador",
    guarantorLine: (name: string, card: string | null, max: string) =>
      `Fiador · ${name}${card ? ` · ${card}` : ""} · tope US$ ${max}`,
    checking: "Buscando tu wallet…",
    connectTitle: "Conectá tu wallet para comprar",
    connectBody:
      "Una wallet es tu cuenta en Solana: con Phantom comprás sin registrarte ni dar datos.",
    cta: "Pagar anticipo y abrir plan",
    ctaNoDown: "Abrir plan · sin anticipo",
    ctaHint: "Antes de firmar revisás destino, monto, token y red.",
    blockedTitle: "Todavía no podés comprar esto",
    blocked: {
      protocol_halted: {
        t: "El protocolo está en pausa",
        d: "La demo está detenida por mantenimiento. Probá de nuevo en un rato.",
        cta: null,
      },
      blocked_after_default: {
        t: "No podés abrir planes nuevos",
        d: "Una cuota tuya llegó al día 15 y la terminó pagando tu fiador. Tu cuenta quedó bloqueada para planes nuevos.",
        cta: { label: "Ver mi plan", href: "/panel" },
      },
      has_active_plan: {
        t: "Ya tenés un plan activo",
        d: "Solo podés tener un plan a la vez. Pagalo completo para abrir el próximo.",
        cta: { label: "Ir a mi plan", href: "/panel" },
      },
      no_guarantee: {
        t: "Necesitás un fiador",
        d: "Lazo te presta porque un garante te respalda con su tarjeta: solo paga si vos no pagás. Mandale la invitación para activarlo.",
        cta: { label: "Invitar a mi fiador", href: "/fiador/nuevo" },
      },
      exceeds_tier_max: {
        t: "Supera el tope de tu escalón",
        d: (max: string) => `En tu escalón el tope es US$ ${max}.`,
        next: (n: number, max: string) =>
          `Al llegar al escalón ${n} el tope sube a US$ ${max}: se gana pagando planes a tiempo.`,
        cta: { label: "Ver algo más barato", href: "/tienda" },
      },
      exceeds_guarantor_max_purchase: {
        t: "Supera el tope de tu fiador",
        d: (max: string) => `Tu fiador te cubre compras hasta US$ ${max}.`,
        cta: { label: "Ver algo más barato", href: "/tienda" },
      },
      exceeds_guarantee_coverage: {
        t: "Tu fiador no llega a cubrirla",
        d: (max: string) => `La cobertura de tu fiador llega a US$ ${max}.`,
        cta: { label: "Ver algo más barato", href: "/tienda" },
      },
    },
    compareTitle: "Lo mismo, pagando en cuotas",
    lazo: "Lazo · 3 cuotas",
    mp: "Mercado Pago · cuotas sin tarjeta",
    reference: "referencia",
    savingsLead: "Te ahorrás",
    demoNote: "Compra simulada · el USDC es de prueba (devnet)",
    stageAria: (price: string, down: string, inst: string) =>
      `La compra de US$ ${price} se divide en un anticipo de US$ ${down} y tres cuotas de US$ ${inst}, sin interés.`,
  },
  en: {
    back: "Store",
    price: "Price",
    breakdownTitle: "Your breakdown",
    tierChip: (n: number) => `Tier ${n}`,
    previewNote: "Tier 0 preview: connect your wallet to see yours.",
    stageDown: "Down payment",
    down: "Down payment · today",
    installment: (i: number) => `Installment ${i}`,
    dueOn: (date: string) => `due ${date}`,
    total: "Total",
    interestFree: "0% interest",
    merchantToday: (x: string) => `The merchant gets US$ ${x} today, no waiting.`,
    guarantorLabel: "Guarantor",
    guarantorLine: (name: string, card: string | null, max: string) =>
      `Guarantor · ${name}${card ? ` · ${card}` : ""} · up to US$ ${max}`,
    checking: "Looking for your wallet…",
    connectTitle: "Connect your wallet to buy",
    connectBody:
      "A wallet is your Solana account: with Phantom you buy without signing up or sharing data.",
    cta: "Pay down payment & open plan",
    ctaNoDown: "Open plan · no down payment",
    ctaHint: "Before signing you review destination, amount, token and network.",
    blockedTitle: "You can't buy this yet",
    blocked: {
      protocol_halted: {
        t: "The protocol is paused",
        d: "The demo is stopped for maintenance. Try again in a bit.",
        cta: null,
      },
      blocked_after_default: {
        t: "You can't open new plans",
        d: "One of your installments reached day 15 and your guarantor ended up paying it. Your account is blocked from new plans.",
        cta: { label: "See my plan", href: "/panel" },
      },
      has_active_plan: {
        t: "You already have an active plan",
        d: "You can only have one plan at a time. Pay it off to open the next one.",
        cta: { label: "Go to my plan", href: "/panel" },
      },
      no_guarantee: {
        t: "You need a guarantor",
        d: "Lazo lends to you because a guarantor backs you with their card: they only pay if you don't. Send them the invite to activate it.",
        cta: { label: "Invite my guarantor", href: "/fiador/nuevo" },
      },
      exceeds_tier_max: {
        t: "It's over your tier's cap",
        d: (max: string) => `Your tier caps at US$ ${max}.`,
        next: (n: number, max: string) =>
          `At tier ${n} the cap rises to US$ ${max}: you get there by paying plans on time.`,
        cta: { label: "See something cheaper", href: "/tienda" },
      },
      exceeds_guarantor_max_purchase: {
        t: "It's over your guarantor's cap",
        d: (max: string) => `Your guarantor covers purchases up to US$ ${max}.`,
        cta: { label: "See something cheaper", href: "/tienda" },
      },
      exceeds_guarantee_coverage: {
        t: "Your guarantor can't cover it",
        d: (max: string) => `Your guarantor's coverage reaches US$ ${max}.`,
        cta: { label: "See something cheaper", href: "/tienda" },
      },
    },
    compareTitle: "The same purchase, in installments",
    lazo: "Lazo · 3 installments",
    mp: "Mercado Pago · no-card installments",
    reference: "reference",
    savingsLead: "You save",
    demoNote: "Simulated purchase · the USDC is test money (devnet)",
    stageAria: (price: string, down: string, inst: string) =>
      `The US$ ${price} purchase splits into a US$ ${down} down payment and three US$ ${inst} installments, interest-free.`,
  },
});
