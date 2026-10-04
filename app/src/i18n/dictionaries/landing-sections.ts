import { defineDict } from "../locale";

export const landingSections = defineDict({
  es: {
    ladder: {
      title: "Cada plan pagado te sube un escalón",
      lede: "La escalera de ejemplo muestra cómo el pago puntual podría reducir el anticipo y ampliar el límite. Wallet significa cuenta digital para operar en la red.",
      tier: (n: number) => `Escalón ${n}`,
      down: "anticipo",
      cap: "tope",
      coverage: "cobertura del fiador",
      example: (price: string, down: string) => `Una PC de US$ ${price}: anticipo de US$ ${down}`,
      start: "Acá arrancás",
      top: "Sin anticipo",
    },
    guarantor: {
      title: "Un familiar puede respaldar el plan",
      lede: "Un familiar podría incorporarse como fiador, elegir un límite y registrar una tarjeta. Si hay una cuota impaga, el proceso prevé un aviso antes de cualquier cobro.",
      steps: [
        { t: "Recibe una invitación", d: "El flujo previsto explica la fianza y solicita una verificación de identidad." },
        { t: "Define un límite", d: "El monto máximo debe quedar claro antes de aceptar." },
        { t: "Se simula la mora", d: "La demo muestra los avisos y el cobro previsto, sin procesar pagos reales." },
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
      title: "Condiciones claras para cada parte",
      rows: {
        student: {
          who: "Estudiante",
          value: "0%",
          label: "de interés en 3 cuotas",
          vs: (x: string) => `Mercado Pago: diferencia de ~${x}% según referencia del equipo`,
        },
        merchant: {
          who: "Comercio",
          label: "del precio de comisión, y cobra al instante",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
          payout: (d: number) => `Referencia del equipo: GOcuotas paga a ${d} días hábiles.`,
        },
        pool: {
          who: "Pool",
          label: "rendimiento ilustrativo, aún no validado",
          vs: (k: string, j: string) => `Referencias del equipo: Kamino ~${k}% · Jupiter ~${j}%`,
          audit: "La versión actual no registra operaciones en Solana.",
        },
      },
      lazo: "Lazo",
      alternative: "Alternativa",
    },
    honest: {
      title: "Qué muestra esta demo",
      realTitle: "Interfaz disponible",
      real: [
        "Recorridos de interfaz y datos de ejemplo",
        "Cálculos de cuotas con configuración de demostración",
        "Escalera, mora y paneles como experiencia simulada",
      ],
      simTitle: "Simulado, y lo decimos",
      sim: [
        "Pagos, reputación y actividad del pool",
        "Avance del tiempo y proceso de mora",
        "Verificación de identidad y cobro al fiador",
        "No se firma ni se envía ninguna transacción",
      ],
    },
    close: {
      title: "Explorá el modelo con una compra de ejemplo",
      cta: "Ir a la tienda",
      foot: "Demo simulada · no procesa pagos ni envía transacciones. La versión de prueba opera únicamente en Solana devnet.",
    },
    reference: "referencia",
  },
  en: {
    ladder: {
      title: "Every plan you pay moves you up a tier",
      lede: "The sample tier ladder shows how on-time payments could lower the down payment and increase the limit. A wallet is a digital account used to interact with the network.",
      tier: (n: number) => `Tier ${n}`,
      down: "down payment",
      cap: "limit",
      coverage: "guarantor coverage",
      example: (price: string, down: string) => `A US$ ${price} PC: US$ ${down} down`,
      start: "You start here",
      top: "No down payment",
    },
    guarantor: {
      title: "A family member can back the plan",
      lede: "A family member could join as guarantor, choose a limit and register a card. If an installment is missed, the flow calls for notice before any charge.",
      steps: [
        { t: "They receive an invitation", d: "The planned flow explains the guarantee and requests identity verification." },
        { t: "They set a limit", d: "The maximum amount must be clear before acceptance." },
        { t: "Late payment is simulated", d: "The demo shows planned notices and collection without processing real payments." },
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
      title: "Clear terms for each participant",
      rows: {
        student: {
          who: "Student",
          value: "0%",
          label: "interest over 3 installments",
          vs: (x: string) => `Mercado Pago: ~${x}% difference based on team reference`,
        },
        merchant: {
          who: "Merchant",
          label: "of the price in fees, paid instantly",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
          payout: (d: number) => `Team reference: GOcuotas pays out in ${d} business days.`,
        },
        pool: {
          who: "Pool",
          label: "illustrative yield, not yet validated",
          vs: (k: string, j: string) => `Team references: Kamino ~${k}% · Jupiter ~${j}%`,
          audit: "The current version does not record activity on Solana.",
        },
      },
      lazo: "Lazo",
      alternative: "Alternative",
    },
    honest: {
      title: "What this demo shows",
      realTitle: "Available interface",
      real: [
        "Interface flows and sample data",
        "Installment calculations from demo configuration",
        "Tier, late-payment and account views as a simulation",
      ],
      simTitle: "Simulated, and we say so",
      sim: [
        "Payments, reputation and pool activity",
        "Time advancement and late-payment flow",
        "Identity checks and guarantor collection",
        "No transaction is signed or sent",
      ],
    },
    close: {
      title: "Explore the model with a sample purchase",
      cta: "Go to the store",
      foot: "Simulated demo · no payments or transactions. The test version runs only on Solana devnet.",
    },
    reference: "reference",
  },
});
