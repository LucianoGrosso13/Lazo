import { defineDict } from "../locale";

export const landingSections = defineDict({
  es: {
    ladder: {
      title: "Cada plan pagado te sube un escalón",
      lede: "Pagar a tiempo baja el anticipo y sube el tope.",
      tier: (n: number) => `Escalón ${n}`,
      down: "anticipo",
      cap: "tope",
      coverage: "cobertura del fiador",
      example: (price: string, down: string) => `Una PC de US$ ${price}: anticipo de US$ ${down}`,
      start: "Acá arrancás",
      top: "Sin anticipo",
    },
    guarantor: {
      title: "Un familiar respalda el plan",
      lede: "Elige un tope y registra una tarjeta. Si falta una cuota, primero recibe un aviso: recién al día 15 se le cobra.",
      steps: [
        { t: "Recibe una invitación", d: "El flujo explica la fianza y pide verificación de identidad." },
        { t: "Define un tope", d: "El monto máximo se acuerda antes de aceptar." },
        { t: "Solo paga si hay mora", d: "En la demo el atraso se simula: no hay cobros reales." },
      ],
      rulerTitle: "Qué pasa si una cuota no se paga",
      day: (n: number) => `Día ${n}`,
      events: {
        due: "Vence la cuota",
        grace: "Gracia, sin recargo",
        notice: "Aviso al fiador",
        penalty: (pct: string) => `Recargo del ${pct}`,
        charge: "Se cobra al fiador y bajás un escalón",
      },
      receipt: "En esta demo, la línea de tiempo ilustra el proceso y no registra eventos en cadena.",
    },
    benefits: {
      title: "Números ilustrativos",
      rows: {
        student: {
          who: "Estudiante",
          value: "0%",
          label: "de interés en 3 cuotas",
          vs: (x: string) => `Mercado Pago, sin tarjeta: ~${x}% más`,
        },
        merchant: {
          who: "Comercio",
          label: "del precio de comisión, y cobra al instante",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
        },
        pool: {
          who: "Pool",
          label: "rendimiento ilustrativo, aún no validado",
          vs: (k: string, j: string) => `Kamino ~${k}% · Jupiter ~${j}%`,
        },
      },
      lazo: "Lazo",
      alternative: "Alternativa",
    },
    honest: {
      title: "Estado de la demo",
      realTitle: "Disponible acá",
      real: [
        "Recorrido completo: tienda, checkout, plan y paneles",
        "Cálculo de cuotas con la config del protocolo",
        "Escalones, línea de mora y vista del pool",
      ],
      simTitle: "Simulado, y lo decimos",
      sim: [
        "Pagos, reputación, actividad del pool y el tiempo",
        "Identidad y cobro a la tarjeta del fiador",
        "Nada se firma ni se envía: la prueba prevista es Solana devnet",
      ],
    },
    close: {
      title: "Probalo con una compra de ejemplo",
      cta: "Ir a la tienda",
      foot: "Demo simulada · no procesa pagos ni envía transacciones. La versión de prueba opera únicamente en Solana devnet.",
    },
    reference: "referencia",
  },
  en: {
    ladder: {
      title: "Every plan paid moves you up a tier",
      lede: "On-time payments lower the down payment and raise the cap.",
      tier: (n: number) => `Tier ${n}`,
      down: "down payment",
      cap: "limit",
      coverage: "guarantor coverage",
      example: (price: string, down: string) => `A US$ ${price} PC: US$ ${down} down`,
      start: "You start here",
      top: "No down payment",
    },
    guarantor: {
      title: "A family member backs the plan",
      lede: "They pick a cap and register a card. A missed installment warns them first — they're only charged on day 15.",
      steps: [
        { t: "Gets an invite", d: "The flow explains the guarantee and requests ID verification." },
        { t: "Sets a cap", d: "The maximum amount is agreed before accepting." },
        { t: "Only pays on default", d: "Late payment is simulated in this demo — no real charges." },
      ],
      rulerTitle: "What happens if an installment goes unpaid",
      day: (n: number) => `Day ${n}`,
      events: {
        due: "Installment due",
        grace: "Grace period, no fee",
        notice: "Guarantor is warned",
        penalty: (pct: string) => `${pct} late fee`,
        charge: "Guarantor is charged and you drop a tier",
      },
      receipt: "In this demo, the timeline illustrates the flow and does not record onchain events.",
    },
    benefits: {
      title: "Illustrative economics",
      rows: {
        student: {
          who: "Student",
          value: "0%",
          label: "interest over 3 installments",
          vs: (x: string) => `Mercado Pago, no-card: ~${x}% more`,
        },
        merchant: {
          who: "Merchant",
          label: "of the price in fees, paid instantly",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
        },
        pool: {
          who: "Pool",
          label: "illustrative yield, not yet validated",
          vs: (k: string, j: string) => `Kamino ~${k}% · Jupiter ~${j}%`,
        },
      },
      lazo: "Lazo",
      alternative: "Alternative",
    },
    honest: {
      title: "Demo status",
      realTitle: "Live in this demo",
      real: [
        "Full flow: store, checkout, plan and panels",
        "Installment math from the protocol config",
        "Tier ladder, late-payment timeline and pool view",
      ],
      simTitle: "Simulated, declared",
      sim: [
        "Payments, reputation, pool activity and time",
        "ID checks and the guarantor's card charge",
        "Nothing is signed or sent — planned test net: Solana devnet",
      ],
    },
    close: {
      title: "Try it with a sample purchase",
      cta: "Go to the store",
      foot: "Simulated demo · no payments or transactions. The test version runs only on Solana devnet.",
    },
    reference: "reference",
  },
});
