import { defineDict } from "../locale";

/**
 * Contenido de /para-estudiantes (ticket 09): cómo funciona Lazo para quien
 * compra y para el familiar fiador. Los números se inyectan desde la config
 * del protocolo en el componente; acá solo viven los textos y sus huecos.
 */
export const paraEstudiantes = defineDict({
  es: {
    hero: {
      eyebrow: "Estudiantes y familias",
      title: "Cuotas para estudiar, con el respaldo de tu familia",
      lede: "Lazo te deja comprar en cuotas en comercios adheridos y pagar con dólares digitales (USDC), aunque no tengas tarjeta de crédito. Un familiar queda como fiador: respalda tu plan con un tope acordado y solo paga si vos no pagás.",
      ctaStore: "Ir a la tienda",
      ctaMerchants: "Ver comercios",
    },
    what: {
      title: "Qué es Lazo",
      body: "Comprás hoy y pagás en cuotas mensuales en dólares digitales. El anticipo y el tope dependen de tu escalón; la tarjeta de tu fiador solo se usa si una cuota queda impaga.",
      devnet:
        "Todo corre en devnet, la red de prueba de Solana, con devUSDC: un token propio de mentira que no vale nada. Ningún cobro de esta demo es real.",
    },
    how: {
      title: "Cómo comprar",
      steps: [
        {
          t: "Elegí el comercio y el producto",
          d: "Buscá por nombre o categoría en la tienda o en el directorio. Los comercios de esta demo son ficticios y llevan etiqueta demo.",
        },
        {
          t: "Elegí 3 o 6 cuotas",
          d: "3 cuotas sin interés, o 6 con un interés total provisional sobre lo financiado. Antes de confirmar ves anticipo, monto de cada cuota, fechas y total.",
        },
        {
          t: "Aprobá la compra",
          d: "Si tu fiador está vigente y la compra entra en tu escalón, el plan se abre y el anticipo se paga en el momento.",
        },
        {
          t: "Pagá las cuotas mes a mes",
          d: "Desde tu panel, con tu wallet conectada. Cada plan terminado a tiempo te sube un escalón.",
        },
      ],
      example: {
        title: (price: string) =>
          `Ejemplo con la config de la demo: compra de US$ ${price} en el escalón 0`,
        option: (n: number) => `${n} cuotas`,
        interestFree: "sin interés",
        down: "Anticipo al comprar",
        each: "Cada cuota",
        interest: "Interés total",
        interestNote: (pct: string) => `(${pct} del financiado)`,
        total: "Pagás en total",
        note: "Los montos se muestran redondeados: la última cuota absorbe el centésimo para que el total cierre exacto. El interés de 6 cuotas se cobra una sola vez sobre lo financiado.",
      },
    },
    ladder: {
      title: "La escalera",
      intro: (minFinanced: string, graceDays: number) =>
        `Arrancás en el escalón 0. Cada plan que terminás de pagar — financiando al menos US$ ${minFinanced} y sin pasar los ${graceDays} días de gracia — te sube un escalón: menos anticipo y más tope.`,
      tier: (n: number) => `Escalón ${n}`,
      down: "anticipo",
      cap: (max: string) => `tope por compra US$ ${max}`,
      coverage: (pct: string) =>
        `En todos los escalones tu fiador cubre el ${pct} del capital financiado que quede pendiente. Subir de escalón no lo libera.`,
    },
    late: {
      title: "Si te atrasás con una cuota",
      intro:
        "Las reglas son las mismas para todos y salen de la config del protocolo. En la demo las corre el reloj de prueba.",
      day: (d: number) => `Día ${d}`,
      dayRange: (a: number, b: number) => `Días ${a}–${b}`,
      events: {
        due: {
          t: "Vence la cuota",
          d: "Cada cuota tiene su fecha en tu panel.",
        },
        grace: {
          t: "Días de gracia, sin recargo",
          d: "Podés pagar solo la cuota; el plan sigue contando para la escalera.",
        },
        notice: {
          t: "Aviso al fiador",
          d: "Todavía dentro de la gracia: tu familiar recibe una notificación, pero no hay cobro.",
        },
        penalty: {
          t: "Recargo",
          d: (pct: string) =>
            `Se suma un recargo del ${pct} sobre la cuota vencida y ese plan deja de contar para subir de escalón.`,
        },
        charge: {
          t: "Cobro al fiador",
          d: "Se cobra la cuota con el recargo de la tarjeta del fiador. Bajás un escalón y no podés abrir planes nuevos.",
        },
      },
      footnote:
        "Si otra cuota del mismo plan llega impaga al día del cobro al fiador, se le cobra todo el saldo restante y el plan pasa a recuperado.",
    },
    family: {
      title: "Para la familia: ser fiador",
      intro:
        "Si un estudiante te invita a respaldar su plan, esto es lo que aceptás. En la demo no hay cobros reales.",
      items: [
        {
          t: "Cubrís el 100% del capital pendiente",
          d: "En todos los escalones respondés por el total de lo financiado que quede por pagar, ni más ni menos.",
        },
        {
          t: "Solo pagás si el estudiante no paga",
          d: (graceDays: number, noticeDay: number, chargeDay: number) =>
            `Hay ${graceDays} días de gracia, un aviso a tu nombre al día ${noticeDay} y recién al día ${chargeDay} un posible cobro a tu tarjeta.`,
        },
        {
          t: "El tope lo acordás antes de aceptar",
          d: "Ves el monto máximo de la fianza y lo elegís antes de firmar: ningún plan puede superarlo.",
        },
        {
          t: "Subir de escalón no te libera",
          d: "Que el estudiante complete planes y suba de escalón mejora su anticipo y su tope; tu cobertura sigue siendo el 100% del capital pendiente.",
        },
      ],
      pending:
        "Pendiente de definir: si la fianza también cubre el interés de los planes de 6 cuotas y los recargos por atraso, y cuál es su techo exacto.",
    },
    next: {
      title: "Lo que viene",
      tag: "roadmap",
      items: [
        {
          t: "Comprar en el local con un QR o un link",
          d: "El comercio muestra un QR o te manda un link de Lazo. Te identificás y comprás sin repetir el alta: tu identidad y tu fiador siguen vigentes dentro de su límite.",
        },
        {
          t: "Descuentos para fiadores al día",
          d: "En evaluación: descuentos en comercios para el familiar cuyo estudiante paga a tiempo. Lo define cada comercio y no cambia la cobertura del 100%.",
        },
      ],
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        {
          q: "¿Necesito tarjeta de crédito?",
          a: "No. Vos pagás el anticipo y las cuotas en dólares digitales desde tu wallet. La tarjeta la registra tu fiador y solo se usa si una cuota queda impaga.",
        },
        {
          q: "¿Qué es una wallet?",
          a: "Una aplicación que guarda tu cuenta en la red y autoriza movimientos: como la app del banco, pero para dólares digitales. En la demo se conecta con un botón y no maneja plata real.",
        },
        {
          q: "¿Pago en pesos o en dólares?",
          a: "Los planes se cotizan en dólares digitales (USDC; en la demo, devUSDC). Si tus ingresos son en pesos, el tipo de cambio puede jugar a favor o en contra: pagar en dólares digitales no garantiza que sea barato.",
        },
        {
          q: "¿Puedo tener más de un plan a la vez?",
          a: "En la demo, sí: mientras lo que debés entre en el margen de tu escalón, y cada compra se aprueba por separado. En el programa en cadena la regla vigente es un plan por estudiante.",
        },
        {
          q: "¿Qué pasa con mis datos?",
          a: "La verificación de identidad y la tarjeta del fiador viven fuera de la cadena, con el proveedor del alta. En la cadena solo quedan montos, fechas y estados del plan.",
        },
        {
          q: "¿Esto es real?",
          a: "Es una demo: corre en devnet, la red de prueba de Solana, con devUSDC, un token sin valor. Los comercios son ficticios y ningún cobro es real.",
        },
      ],
    },
    cta: {
      title: "Empezá por una compra de ejemplo",
      store: "Ir a la tienda",
      merchants: "Ver comercios",
      account: "Mi cuenta",
    },
  },
  en: {
    hero: {
      eyebrow: "Students and families",
      title: "Installments for your studies, backed by your family",
      lede: "Lazo lets you buy in installments at participating merchants and pay with digital dollars (USDC), even without a credit card. A family member acts as guarantor: they back your plan with an agreed cap and only pay if you don't.",
      ctaStore: "Go to the store",
      ctaMerchants: "Browse merchants",
    },
    what: {
      title: "What Lazo is",
      body: "You buy today and pay in monthly installments in digital dollars. The down payment and the cap depend on your tier; your guarantor's card is only used if an installment goes unpaid.",
      devnet:
        "Everything runs on devnet, Solana's test network, with devUSDC: a fake in-house token worth nothing. No charge in this demo is real.",
    },
    how: {
      title: "How to buy",
      steps: [
        {
          t: "Pick the merchant and the product",
          d: "Search by name or category in the store or the directory. The merchants in this demo are fictional and carry a demo label.",
        },
        {
          t: "Choose 3 or 6 installments",
          d: "3 installments interest-free, or 6 with a provisional total interest on the financed amount. Before confirming you see the down payment, each installment, dates and the total.",
        },
        {
          t: "Approve the purchase",
          d: "If your guarantor is active and the purchase fits your tier, the plan opens and the down payment is paid right away.",
        },
        {
          t: "Pay the installments month by month",
          d: "From your dashboard, with your wallet connected. Every plan finished on time moves you up a tier.",
        },
      ],
      example: {
        title: (price: string) =>
          `Example from the demo config: a US$ ${price} purchase on tier 0`,
        option: (n: number) => `${n} installments`,
        interestFree: "interest-free",
        down: "Down payment at checkout",
        each: "Each installment",
        interest: "Total interest",
        interestNote: (pct: string) => `(${pct} of financed)`,
        total: "You pay in total",
        note: "Amounts are shown rounded: the last installment absorbs the cent so the total closes exactly. Interest on 6 installments is charged once on the financed amount.",
      },
    },
    ladder: {
      title: "The tier ladder",
      intro: (minFinanced: string, graceDays: number) =>
        `You start on tier 0. Every plan you finish paying — financing at least US$ ${minFinanced} and never passing the ${graceDays}-day grace period — moves you up a tier: lower down payment, higher cap.`,
      tier: (n: number) => `Tier ${n}`,
      down: "down payment",
      cap: (max: string) => `per-purchase cap US$ ${max}`,
      coverage: (pct: string) =>
        `On every tier your guarantor covers ${pct} of the financed capital still outstanding. Moving up a tier does not release them.`,
    },
    late: {
      title: "If you fall behind on an installment",
      intro:
        "The rules are the same for everyone and come from the protocol config. In the demo the test clock runs them.",
      day: (d: number) => `Day ${d}`,
      dayRange: (a: number, b: number) => `Days ${a}–${b}`,
      events: {
        due: {
          t: "Installment due",
          d: "Each installment has its date in your dashboard.",
        },
        grace: {
          t: "Grace days, no late fee",
          d: "You can pay just the installment; the plan still counts toward your ladder.",
        },
        notice: {
          t: "Guarantor is warned",
          d: "Still within grace: your family member gets a notification, but there is no charge.",
        },
        penalty: {
          t: "Late fee",
          d: (pct: string) =>
            `A ${pct} late fee is added to the overdue installment and that plan stops counting toward a tier-up.`,
        },
        charge: {
          t: "Guarantor is charged",
          d: "The installment plus the late fee is charged to the guarantor's card. You drop a tier and can't open new plans.",
        },
      },
      footnote:
        "If a second installment of the same plan reaches the guarantor-charge day unpaid, the whole remaining balance is charged to the guarantor and the plan moves to recovered.",
    },
    family: {
      title: "For the family: being a guarantor",
      intro:
        "If a student invites you to back their plan, this is what you agree to. In the demo no charges are real.",
      items: [
        {
          t: "You cover 100% of the outstanding capital",
          d: "On every tier you answer for the full financed amount still owed — no more, no less.",
        },
        {
          t: "You only pay if the student doesn't",
          d: (graceDays: number, noticeDay: number, chargeDay: number) =>
            `There is a ${graceDays}-day grace period, a warning addressed to you on day ${noticeDay}, and only on day ${chargeDay} a possible charge to your card.`,
        },
        {
          t: "The cap is agreed before you accept",
          d: "You see the guarantee's maximum amount and choose it before signing: no plan can exceed it.",
        },
        {
          t: "A higher tier doesn't release you",
          d: "The student completing plans and moving up tiers improves their down payment and cap; your coverage stays at 100% of the outstanding capital.",
        },
      ],
      pending:
        "Still to be defined: whether the guarantee also covers interest on 6-installment plans and late fees, and its exact ceiling.",
    },
    next: {
      title: "What's coming",
      tag: "roadmap",
      items: [
        {
          t: "Buying in-store with a QR or a link",
          d: "The merchant shows a QR or sends you a Lazo link. You identify yourself and buy without repeating onboarding: your identity and guarantor stay active within their limits.",
        },
        {
          t: "Discounts for on-time guarantors",
          d: "Under evaluation: merchant discounts for the family member whose student pays on time. Each merchant sets them and they don't change the 100% coverage.",
        },
      ],
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          q: "Do I need a credit card?",
          a: "No. You pay the down payment and installments in digital dollars from your wallet. Your guarantor registers the card and it's only used if an installment goes unpaid.",
        },
        {
          q: "What is a wallet?",
          a: "An app that holds your account on the network and authorizes moves: like a banking app, but for digital dollars. In the demo it connects with a button and handles no real money.",
        },
        {
          q: "Do I pay in pesos or dollars?",
          a: "Plans are priced in digital dollars (USDC; devUSDC in the demo). If your income is in pesos, the exchange rate can play for or against you: paying in digital dollars doesn't guarantee it's cheap.",
        },
        {
          q: "Can I have more than one plan at once?",
          a: "In the demo, yes: as long as what you owe fits within your tier's margin, and every purchase is approved separately. On the onchain program the current rule is one plan per student.",
        },
        {
          q: "What happens to my data?",
          a: "Identity verification and the guarantor's card live offchain, with the onboarding provider. Only amounts, dates and plan states are stored onchain.",
        },
        {
          q: "Is this real?",
          a: "It's a demo: it runs on devnet, Solana's test network, with devUSDC, a worthless token. The merchants are fictional and no charge is real.",
        },
      ],
    },
    cta: {
      title: "Start with a sample purchase",
      store: "Go to the store",
      merchants: "Browse merchants",
      account: "My account",
    },
  },
});
