import { defineDict } from "../locale";

export const landingSections = defineDict({
  es: {
    ladder: {
      title: "Cada plan pagado te sube un escalón",
      lede: "Tu historial vive en tu wallet, no en un banco. Pagás a tiempo, baja el anticipo y sube el tope. Cualquier comercio lo puede leer.",
      tier: (n: number) => `Escalón ${n}`,
      down: "anticipo",
      cap: "tope",
      coverage: "cobertura del fiador",
      example: (price: string, down: string) => `Una PC de US$ ${price}: anticipo de US$ ${down}`,
      start: "Acá arrancás",
      top: "Sin anticipo",
    },
    guarantor: {
      title: "Tu mamá no te presta la tarjeta. Te respalda.",
      lede: "Hoy le pedís la tarjeta a un familiar para cada compra. Con Lazo, esa persona se suma una vez como fiadora, elige un tope y carga su tarjeta. Solo se le cobra si vos no pagás.",
      steps: [
        { t: "Le mandás un link", d: "Por WhatsApp. Verifica su identidad y lee la fianza." },
        { t: "Elige su tope", d: "Sabe desde el día uno cuánto puede llegar a pagar, como máximo." },
        { t: "Solo paga si vos no", d: "Si una cuota no se paga, se le avisa antes de cobrar." },
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
      receipt: "El cobro queda registrado en la cadena con el hash del comprobante.",
    },
    benefits: {
      title: "Gana el estudiante, el comercio y quien pone la plata",
      rows: {
        student: {
          who: "Estudiante",
          value: "0%",
          label: "de interés en 3 cuotas",
          vs: (x: string) => `Mercado Pago: ~${x}% más caro en términos reales`,
        },
        merchant: {
          who: "Comercio",
          label: "del precio de comisión, y cobra al instante",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
          payout: (d: number) => `GOcuotas paga a ${d} días hábiles. Lazo, en el momento.`,
        },
        pool: {
          who: "Pool",
          label: "anual objetivo en dólares para el tramo senior",
          vs: (k: string, j: string) => `Kamino ~${k}% · Jupiter ~${j}%`,
          audit: "Cada préstamo, pago y recupero es verificable en Solana.",
        },
      },
      lazo: "Lazo",
      alternative: "Alternativa",
    },
    honest: {
      title: "Qué es real y qué es de prueba",
      realTitle: "Real, en devnet",
      real: [
        "El programa, el pool, los planes y la reputación",
        "El pago del anticipo y de las cuotas con Phantom",
        "El comercio cobra al instante, se ve en el explorador",
      ],
      simTitle: "Simulado, y lo decimos",
      sim: [
        "El USDC es un token de prueba (devUSDC)",
        "En la demo, un día dura segundos",
        "La tienda es una tienda demo",
        "La tarjeta del fiador corre en un sandbox",
      ],
    },
    close: {
      title: "Probalo con una PC de US$ 1.000",
      cta: "Ir a la tienda",
      foot: "Hecho para Colosseum Crypto World's Fair · Superteam Argentina. Corre en Solana devnet.",
    },
    reference: "referencia",
  },
  en: {
    ladder: {
      title: "Every plan you pay moves you up a tier",
      lede: "Your history lives in your wallet, not in a bank. Pay on time and your down payment drops while your limit grows. Any merchant can read it.",
      tier: (n: number) => `Tier ${n}`,
      down: "down payment",
      cap: "limit",
      coverage: "guarantor coverage",
      example: (price: string, down: string) => `A US$ ${price} PC: US$ ${down} down`,
      start: "You start here",
      top: "No down payment",
    },
    guarantor: {
      title: "Mom doesn't lend you her card. She backs you.",
      lede: "Today you borrow a relative's card for every purchase. With Lazo, they join once as guarantor, pick a cap and add their card. They're only charged if you don't pay.",
      steps: [
        { t: "You send a link", d: "Over WhatsApp. They verify their ID and read the guarantee." },
        { t: "They pick a cap", d: "From day one they know the most they could ever pay." },
        { t: "They only pay if you don't", d: "If an installment goes unpaid, they're warned before any charge." },
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
      receipt: "The charge is recorded onchain with the receipt hash.",
    },
    benefits: {
      title: "The student, the merchant and the lender all win",
      rows: {
        student: {
          who: "Student",
          value: "0%",
          label: "interest over 3 installments",
          vs: (x: string) => `Mercado Pago: ~${x}% more in real terms`,
        },
        merchant: {
          who: "Merchant",
          label: "of the price in fees, paid instantly",
          vs: (cs: string, mp: string) => `Cuota Simple ${cs}% · Mercado Pago ~${mp}%`,
          payout: (d: number) => `GOcuotas pays out in ${d} business days. Lazo, right away.`,
        },
        pool: {
          who: "Pool",
          label: "target yearly USD yield for the senior tranche",
          vs: (k: string, j: string) => `Kamino ~${k}% · Jupiter ~${j}%`,
          audit: "Every loan, repayment and recovery is verifiable on Solana.",
        },
      },
      lazo: "Lazo",
      alternative: "Alternative",
    },
    honest: {
      title: "What's real and what's a test",
      realTitle: "Real, on devnet",
      real: [
        "The program, the pool, the plans and the reputation",
        "Paying the down payment and installments with Phantom",
        "The merchant is paid instantly, visible on the explorer",
      ],
      simTitle: "Simulated, and we say so",
      sim: [
        "The USDC is a test token (devUSDC)",
        "In the demo, a day lasts seconds",
        "The store is a demo store",
        "The guarantor's card runs in a sandbox",
      ],
    },
    close: {
      title: "Try it with a US$ 1,000 PC",
      cta: "Go to the store",
      foot: "Built for Colosseum Crypto World's Fair · Superteam Argentina. Runs on Solana devnet.",
    },
    reference: "reference",
  },
});
