import { defineDict } from "../locale";

export const landingSections = defineDict({
  es: {
    audiences: {
      title: "Para quién es",
      lede: "Tres actores, tres recorridos. Elegí el tuyo y mirá cómo funciona Lazo de punta a punta.",
      cards: {
        estudiantes: {
          blurb: "Comprá en cuotas sin tarjeta: un familiar te respalda y tu anticipo baja con tu historial.",
          cta: "Cómo funciona para vos",
        },
        comercios: {
          blurb: "Vendé en cuotas aunque el cliente no tenga tarjeta: elegís cuándo cobrar y cuánto te cuesta.",
          cta: "Cómo funciona para tu comercio",
        },
        inversores: {
          blurb: "El pool adelanta lo financiado de cada venta y cada movimiento queda verificable en la cadena.",
          cta: "Cómo funciona para el pool",
        },
      },
    },
    installments: {
      title: "Elegí en cuántas cuotas",
      lede: "Dos planes hoy: 3 cuotas sin interés o 6 con un interés total chico. El interés se calcula sobre lo financiado, no sobre el precio.",
      unit: (n: number) => (n === 1 ? "cuota" : "cuotas"),
      interestFree: "Sin interés",
      interestTotal: (pct: string) => `${pct}% de interés total`,
      provisional: "provisional",
      example: (price: string) => `Ejemplo: una compra de US$ ${price} en el escalón 0, cotizada por el protocolo`,
      down: "Anticipo",
      installments: "Cuotas",
      each: (n: number, amount: string) => `${n} × US$ ${amount}`,
      interest: "Interés",
      total: "Total que pagás",
      footnote: "Los términos de 6 cuotas son provisionales: la tasa final la define la configuración del protocolo.",
    },
    ladder: {
      title: "Cada plan pagado te sube un escalón",
      lede: "Subir de escalón baja el anticipo y sube el tope — la cobertura del fiador no baja.",
      tier: (n: number) => `Escalón ${n}`,
      down: "anticipo",
      cap: "tope",
      coverage: "cobertura del fiador",
      example: (price: string, down: string) => `Una PC de US$ ${price}: anticipo de US$ ${down}`,
      start: "Acá arrancás",
      top: "Sin anticipo",
      coverageNote: "El fiador siempre respalda el 100% del capital pendiente, en todos los escalones.",
    },
    guarantor: {
      title: "Un familiar respalda el plan",
      lede: (chargeDay: number) =>
        `Cubre el 100% del capital pendiente en todos los escalones y solo paga si el estudiante no paga. Elige un tope y registra una tarjeta: si falta una cuota, primero recibe un aviso — recién al día ${chargeDay} se le cobra.`,
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
    merchants: {
      title: "Comercios adheridos",
      lede: "En la demo, comercios de ejemplo aceptan Lazo. Buscá el tuyo por nombre o categoría en el marketplace.",
      demoTag: "demo",
      products: (n: number) => `${n} productos`,
      seeAll: "Ver todos los comercios",
      footnote: "Son comercios ficticios para la demo: no son aliados ni ventas reales.",
    },
    benefits: {
      title: "Números ilustrativos",
      rows: {
        student: {
          who: "Cliente",
          value: "0%",
          label: "de interés en 3 cuotas",
          vs: (x: string) => `La competencia, sin tarjeta: ~${x}% más`,
        },
        merchant: {
          who: "Comercio",
          label: "del precio, según cuándo elige cobrar (provisional)",
          vs: (cs: string, mp: string) => `Financiación en mostrador ${cs}% · billeteras ~${mp}%`,
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
    roadmap: {
      title: "Qué viene",
      lede: "Hoja de ruta honesta: propuestas en evaluación, no funciones listas ni acuerdos firmados.",
      tag: "propuesta",
      items: [
        {
          t: "Venta en mostrador por link o QR",
          d: "El comercio comparte un link o muestra un QR; el cliente abre el checkout en su celular y reutiliza su fianza vigente.",
        },
        {
          t: "Billeteras argentinas como canal",
          d: "Evaluamos que billeteras locales distribuyan Lazo y conviertan pesos a dólares digitales. Canal en estudio: no hay acuerdos.",
        },
        {
          t: "Descuentos para el fiador al día",
          d: "Beneficios en comercios para fiadores cuyos estudiantes pagan a tiempo. Nunca a cambio de bajar la cobertura del 100%.",
        },
        {
          t: "Tesorería propia en DeFi, simulada",
          d: "Solo fondos propios de Lazo — nunca el pool ni el dinero de usuarios — con integración simulada hasta verificar compatibilidad en devnet.",
        },
      ],
    },
    honest: {
      title: "Estado de la demo",
      realTitle: "Disponible acá",
      real: [
        "Recorrido completo: tienda, checkout, plan y paneles",
        "3 o 6 cuotas y plazo de cobro del comercio, calculados desde la config",
        "Marketplace de comercios de ejemplo y páginas por audiencia",
        "Escalones, línea de mora y vista del pool",
      ],
      simTitle: "Simulado, y lo decimos",
      sim: [
        "Pagos, identidad, cobro al fiador y el paso del tiempo",
        "Comercios ficticios: no hay acuerdos, ventas ni tracción real",
        "Lo de “Qué viene” es propuesta: no está firmado ni implementado",
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
    audiences: {
      title: "Who it's for",
      lede: "Three actors, three walkthroughs. Pick yours and see how Lazo works end to end.",
      cards: {
        estudiantes: {
          blurb: "Buy in installments with no card: a family member backs you and your down payment drops with your track record.",
          cta: "How it works for you",
        },
        comercios: {
          blurb: "Sell in installments even when the customer has no card: you choose when to get paid and what it costs.",
          cta: "How it works for your store",
        },
        inversores: {
          blurb: "The pool advances the financed share of every sale and each move is verifiable onchain.",
          cta: "How it works for the pool",
        },
      },
    },
    installments: {
      title: "Choose how many installments",
      lede: "Two plans today: 3 interest-free installments or 6 with a small total interest. Interest accrues on the financed amount, not on the price.",
      unit: (n: number) => (n === 1 ? "installment" : "installments"),
      interestFree: "Interest-free",
      interestTotal: (pct: string) => `${pct}% total interest`,
      provisional: "provisional",
      example: (price: string) => `Example: a US$ ${price} purchase on tier 0, quoted by the protocol`,
      down: "Down payment",
      installments: "Installments",
      each: (n: number, amount: string) => `${n} × US$ ${amount}`,
      interest: "Interest",
      total: "Total you pay",
      footnote: "The 6-installment terms are provisional: the final rate is set by the protocol configuration.",
    },
    ladder: {
      title: "Every plan paid moves you up a tier",
      lede: "Moving up a tier lowers the down payment and raises the cap — the guarantor's coverage never drops.",
      tier: (n: number) => `Tier ${n}`,
      down: "down payment",
      cap: "limit",
      coverage: "guarantor coverage",
      example: (price: string, down: string) => `A US$ ${price} PC: US$ ${down} down`,
      start: "You start here",
      top: "No down payment",
      coverageNote: "The guarantor always covers 100% of the outstanding capital, on every tier.",
    },
    guarantor: {
      title: "A family member backs the plan",
      lede: (chargeDay: number) =>
        `They cover 100% of the outstanding capital on every tier and only pay if the student doesn't. They pick a cap and register a card: a missed installment warns them first — they're only charged on day ${chargeDay}.`,
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
    merchants: {
      title: "Member stores",
      lede: "In the demo, example stores accept Lazo. Find yours by name or category in the marketplace.",
      demoTag: "demo",
      products: (n: number) => `${n} products`,
      seeAll: "See all stores",
      footnote: "These are fictional stores for the demo: not real partners or sales.",
    },
    benefits: {
      title: "Illustrative economics",
      rows: {
        student: {
          who: "Customer",
          value: "0%",
          label: "interest over 3 installments",
          vs: (x: string) => `The competition, no-card: ~${x}% more`,
        },
        merchant: {
          who: "Merchant",
          label: "of the price, depending on when they choose to get paid (provisional)",
          vs: (cs: string, mp: string) => `Store financing ${cs}% · wallets ~${mp}%`,
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
    roadmap: {
      title: "What's next",
      lede: "An honest roadmap: proposals under evaluation, not shipped features or signed deals.",
      tag: "proposal",
      items: [
        {
          t: "Over-the-counter sales by link or QR",
          d: "The merchant shares a link or shows a QR code; the customer opens checkout on their phone and reuses their active guarantee.",
        },
        {
          t: "Argentine wallets as a channel",
          d: "We're evaluating local wallets to distribute Lazo and convert pesos to digital dollars. A channel under study — no agreements signed.",
        },
        {
          t: "Discounts for the on-time guarantor",
          d: "Store benefits for guarantors whose students pay on time. Never in exchange for lowering the 100% coverage.",
        },
        {
          t: "Own treasury in DeFi, simulated",
          d: "Lazo's own funds only — never the pool's or users' money — with a simulated integration until devnet compatibility is verified.",
        },
      ],
    },
    honest: {
      title: "Demo status",
      realTitle: "Live in this demo",
      real: [
        "Full flow: store, checkout, plan and panels",
        "3 or 6 installments and the merchant's settlement term, computed from the config",
        "Example-store marketplace and per-audience pages",
        "Tier ladder, late-payment timeline and pool view",
      ],
      simTitle: "Simulated, declared",
      sim: [
        "Payments, identity, the guarantor's charge and the passing of time",
        "Fictional stores: no agreements, sales or real traction",
        "Everything under “What's next” is a proposal: unsigned and unimplemented",
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
