import { defineDict } from "../locale";

/**
 * Contenido de /para-estudiantes (ticket 11): cómo funciona Lazo para quien
 * compra y para el familiar fiador. Los números se inyectan desde la config
 * del protocolo en el componente; acá solo viven los textos y sus huecos.
 */
export const paraEstudiantes = defineDict({
  es: {
    hero: {
      eyebrow: "Compradores y garantes",
      title: "Cuotas para estudiar, con el respaldo de tu familia",
      lede: "Lazo te deja comprar en cuotas en comercios adheridos y pagar con dólares digitales (USDC), aunque no tengas tarjeta de crédito. Un familiar actúa como garante obligatorio: respalda lo que falta pagar de capital e interés, con un tope acordado, y solo paga si vos no pagás.",

      ctaMerchants: "Ver comercios",
      ctaCheckout: "Probar un checkout",
      graphic: {
        tag: "Así se ve tu plan",
        purchase: (price: string, tier: string) => `Compra de US$ ${price} · ${tier}`,
        scheduleLabel: "Calendario de pagos de la compra de ejemplo",
        today: "Hoy",
        month: (n: number) => `Mes ${n}`,
        down: "Anticipo",
        installment: "Cuota",
        buyerTitle: "Vos pagás",
        buyerSub: "Anticipo y cuotas en USDC, desde tu wallet. Sin tarjeta.",
        guarantorTitle: "Tu garante respalda",
        guarantorSub: (pct: string) =>
          `El ${pct} de lo que falta pagar. Su tarjeta solo se cobra si una cuota queda impaga.`,
        guarantorBadge: "Tarjeta de crédito",
      },
    },
    what: {
      title: "Qué es Lazo",
      body: "Comprás hoy y pagás en cuotas mensuales en dólares digitales. El anticipo y el tope de compra dependen de tu tier; un familiar como garante obligatorio respalda lo que falta pagar del plan y su tarjeta solo se cobra si una cuota queda impaga.",
      devnet:
        "Todo corre en devnet, la red de prueba de Solana, con devUSDC: un token propio de prueba que no vale nada. Ningún cobro es real.",
    },
    how: {
      title: "Cómo comprar",
      stepsLabel: "Pasos para comprar en cuotas",
      steps: [
        {
          t: "Elegí el comercio y el producto",
          d: "Buscá por nombre o categoría en el directorio de comercios. Los comercios del marketplace son de ejemplo.",

        },
        {
          t: "Elegí una opción de cuotas",
          d: "Elegí una opción de cuotas disponible. Antes de confirmar ves el anticipo, el monto de cada cuota, las fechas, el interés total y el mínimo de compra que indica cada opción.",
        },
        {
          t: "Aprobá la compra con tu garante",
          d: "Sin garante no hay plan. Si tu familiar aceptó la garantía y la compra entra en tu tier, el plan se abre y el anticipo se paga en el momento.",
        },
        {
          t: "Pagá las cuotas mes a mes",
          d: "Desde tu panel, con tu wallet conectada. Cada plan terminado a tiempo te sube de tier.",
        },
      ],
      example: {
        tag: "Simulador de cuotas",
        purchaseLabel: "Compra de ejemplo",
        title: (price: string, tierName: string) =>
          `Ejemplo con la config del protocolo: compra de US$ ${price} en ${tierName}`,
        option: (n: number) => `${n} cuotas`,
        interestFree: "sin interés",
        optionBadge: (pct: string, min: string) => `${pct} total · desde US$ ${min}`,
        down: "Anticipo al comprar",
        each: "Cada cuota",
        interest: "Interés total",
        interestNote: (pct: string) => `(${pct} del financiado)`,
        total: "Pagás en total",
        note: "Los montos se muestran redondeados: la última cuota absorbe el centésimo para que el total cierre exacto. El interés y el mínimo de cada opción salen de la configuración del protocolo.",
      },
    },
    ladder: {
      title: "Tiers y reglas de progresión",
      comparisonTitle: "Anticipo requerido por Tier",
      comparisonIntro: "A medida que saldás planes a tiempo subís de nivel: menor anticipo y mayor tope de compra.",
      comparisonWinner: "Menor anticipo",
      coverageTitle: "Cobertura de la garantía familiar",
      coverageEyebrow: "Lo que cubre tu garante",
      intro: (tier: string, minFinanced: string, graceDays: number, chargeDay: number) =>
        `Arrancás en ${tier}. Sin garante activo no se puede abrir ningún plan. Subís 1 Tier al saldar un plan con al menos US$ ${minFinanced} financiados sin pagos después de los ${graceDays} días de gracia. Si pagás con atraso pero antes del día ${chargeDay}, no sumás ni bajás. Bajás 1 Tier si una cuota llega al día ${chargeDay} impaga y se cobra al garante.`,
      tier: (n: number) => `Tier ${n + 1}`,
      down: "anticipo",
      cap: (max: string) => `tope por compra US$ ${max}`,
      coverage: (pct: string) =>
        `En todos los tiers tu garante cubre el ${pct} de lo que resta pagar (capital e interés). El punitorio por mora no lo cubre el garante. Subir de tier no reduce la garantía.`,
      rules: [
        {
          title: "Sin garante no hay plan",
          body: "La garantía es obligatoria en todos los tiers. No existe la compra sin respaldo familiar.",
        },
        {
          title: "Subir de tier",
          body: (minFinanced: string, graceDays: number) =>
            `Saldar un plan con al menos US$ ${minFinanced} financiados y sin pagos después de los ${graceDays} días de gracia te sube 1 Tier: menos anticipo y más tope. Los atrasos resueltos antes del cobro al garante no suman ni bajan.`,
        },
        {
          title: "Bajar de tier",
          body: "Si una cuota llega impaga al día de cobro al garante y se le cobra, bajás 1 Tier y no podés abrir nuevos planes.",
        },
      ],
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
          d: "Podés pagar solo la cuota; el plan sigue contando para subir de tier.",
        },
        notice: {
          t: "Aviso al garante",
          d: "Todavía dentro de la gracia: tu familiar recibe una notificación preventiva, pero no hay ningún cobro.",
        },
        penalty: {
          t: "Recargo por mora",
          d: (pct: string) =>
            `Se suma un recargo del ${pct} sobre la cuota vencida y ese plan deja de contar para subir de tier.`,
        },
        charge: {
          t: "Cobro al garante y baja de Tier",
          d: "Se cobra la cuota de la tarjeta del garante. Bajás un Tier y no podés abrir planes nuevos hasta regularizar.",
        },
      },
      footnote:
        "El garante cubre el capital y el interés pactado que queden por pagar, pero no el recargo por mora. Si otra cuota del mismo plan llega impaga al día del cobro al garante, se le cobra todo el saldo restante del plan y el plan pasa a recuperado.",
    },
    family: {
      title: "Para la familia: ser garante",
      calloutTitle: "Garantía obligatoria con tarjeta",
      calloutBody: (pct: string, chargeDay: number) =>
        `Sin garante no hay plan: la tarjeta del familiar respalda el ${pct} del saldo restante (capital e interés) y solo se debita si una cuota llega impaga al día ${chargeDay}.`,
      intro:
        "En Lazo la garantía es obligatoria: sin garante no hay plan. Si un comprador te invita a respaldarlo, estas son las condiciones claras:",
      items: [
        {
          t: "Sin garante no hay plan",
          d: "La garantía con tarjeta es obligatoria para abrir cualquier plan, en todos los tiers. No existe compra sin respaldo.",
        },
        {
          t: "Cubrís capital e interés",
          d: "Cubrís lo financiado y el interés pactado que queden por pagar. Los recargos punitorios por atraso quedan afuera y son a cargo del comprador.",
        },
        {
          t: "Solo pagás si el comprador no paga",
          d: (graceDays: number, noticeDay: number, chargeDay: number) =>
            `Hay ${graceDays} días de gracia, un aviso preventivo a tu nombre al día ${noticeDay} y recién al día ${chargeDay} un posible cobro a tu tarjeta.`,
        },
        {
          t: "El tope lo acordás antes de aceptar",
          d: "Ves el monto máximo de la garantía antes de aceptar la invitación: ningún plan puede superar el límite que autorizaste.",
        },
        {
          t: "Subir de tier no te libera",
          d: "Que el comprador complete planes y suba de tier mejora su anticipo y su tope; tu cobertura sigue incluyendo todo el saldo pendiente mientras el plan continúe activo.",
        },
      ],
    },
    next: {
      title: "Lo que viene",
      tag: "roadmap",
      items: [
        {
          t: "Billeteras argentinas como canal",
          d: "Evaluamos que billeteras locales distribuyan Lazo y conviertan pesos a dólares digitales. Canal en estudio: no hay acuerdos firmados.",
        },
        {
          t: "Tesorería propia en DeFi, simulada",
          d: "Solo fondos propios de Lazo — nunca el pool ni el dinero de usuarios — con integración simulada hasta verificar compatibilidad en devnet.",
        },
      ],
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        {
          q: "¿Necesito tarjeta de crédito?",
          a: "No. Vos pagás el anticipo y las cuotas en dólares digitales desde tu wallet. La tarjeta la registra tu garante obligatorio y solo se cobra si una cuota queda impaga.",
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
          a: "En el simulador, sí: mientras lo que debés entre en el margen de tu Tier, y cada compra se aprueba por separado. En el programa en cadena la regla vigente es un plan por comprador.",
        },
        {
          q: "¿Qué pasa con mis datos?",
          a: "La verificación de identidad y la tarjeta del garante viven fuera de la cadena, con el proveedor del alta. En la cadena solo quedan montos, fechas y estados del plan.",
        },
        {
          q: "¿Qué cubre exactamente el garante?",
          a: "El garante cubre todo lo que resta pagar del plan: capital financiado e interés pactado. Los recargos punitorios por mora no están cubiertos por el garante y son responsabilidad del comprador.",
        },
        {
          q: "¿Esto es real?",
          a: "Es una demo: corre en devnet, la red de prueba de Solana, con devUSDC, un token sin valor. Los comercios son de ejemplo y ningún cobro es real.",
        },
      ],
    },
    cta: {
      title: "Empezá por una compra de ejemplo",
      merchants: "Ver comercios",
      checkout: "Probar un checkout",
      account: "Mi cuenta",
    },
  },
  en: {
    hero: {
      eyebrow: "Buyers and guarantors",
      title: "Installments for your studies, backed by your family",
      lede: "Lazo lets you buy in installments at participating merchants and pay with digital dollars (USDC), even without a credit card. A family member acts as mandatory guarantor: they cover the outstanding financed amount and interest up to an agreed cap, and only pay if you don't.",

      ctaMerchants: "Browse merchants",
      ctaCheckout: "Try a checkout",
      graphic: {
        tag: "What your plan looks like",
        purchase: (price: string, tier: string) => `US$ ${price} purchase · ${tier}`,
        scheduleLabel: "Payment schedule for the sample purchase",
        today: "Today",
        month: (n: number) => `Month ${n}`,
        down: "Down payment",
        installment: "Installment",
        buyerTitle: "You pay",
        buyerSub: "Down payment and installments in USDC, from your wallet. No card.",
        guarantorTitle: "Your guarantor backs",
        guarantorSub: (pct: string) =>
          `${pct} of what is left to pay. Their card is only charged if an installment goes unpaid.`,
        guarantorBadge: "Credit card",
      },
    },
    what: {
      title: "What Lazo is",
      body: "You buy today and pay in monthly installments in digital dollars. Your down payment and purchase cap depend on your tier; a family member acts as mandatory guarantor for the outstanding plan balance, and their card is only charged if an installment goes unpaid.",
      devnet:
        "Everything runs on devnet, Solana's test network, with devUSDC: an in-house test token worth nothing. No charge is real.",
    },
    how: {
      title: "How to buy",
      stepsLabel: "Steps to buy in installments",
      steps: [
        {
          t: "Pick the merchant and the product",
          d: "Search by name or category in the merchant directory. The marketplace merchants are sample merchants.",

        },
        {
          t: "Choose an installment option",
          d: "Choose an available installment option. Before confirming, you see the down payment, each installment, due dates, total interest and the minimum purchase shown for that option.",
        },
        {
          t: "Approve the purchase with your guarantor",
          d: "Without an active guarantor there is no plan. If your family member accepted the guarantee and the purchase fits your tier, the plan opens and the down payment is paid right away.",
        },
        {
          t: "Pay the installments month by month",
          d: "From your dashboard, with your wallet connected. Every plan finished on time moves you up a tier.",
        },
      ],
      example: {
        tag: "Installment simulation",
        purchaseLabel: "Sample purchase",
        title: (price: string, tierName: string) =>
          `Example from the protocol config: a US$ ${price} purchase on ${tierName}`,
        option: (n: number) => `${n} installments`,
        interestFree: "interest-free",
        optionBadge: (pct: string, min: string) => `${pct} total · from US$ ${min}`,
        down: "Down payment at checkout",
        each: "Each installment",
        interest: "Total interest",
        interestNote: (pct: string) => `(${pct} of financed)`,
        total: "You pay in total",
        note: "Amounts are rounded: the last installment absorbs the cent so the total closes exactly. Each option's interest and minimum come from protocol configuration.",
      },
    },
    ladder: {
      title: "Tiers and progression rules",
      comparisonTitle: "Down payment required per Tier",
      comparisonIntro: "As you complete plans on time you move up a Tier: lower down payment and higher purchase cap.",
      comparisonWinner: "Lowest down payment",
      coverageTitle: "Family guarantee coverage",
      coverageEyebrow: "What your guarantor covers",
      intro: (tier: string, minFinanced: string, graceDays: number, chargeDay: number) =>
        `You start on ${tier}. Without an active guarantor no plan can be opened. You move up 1 Tier when finishing a plan financing at least US$ ${minFinanced} with no payments past the ${graceDays}-day grace period. If you pay late within grace or with late fee before day ${chargeDay}, you neither gain nor lose a tier. You drop 1 Tier if an installment reaches day ${chargeDay} unpaid and is charged to the guarantor.`,
      tier: (n: number) => `Tier ${n + 1}`,
      down: "down payment",
      cap: (max: string) => `per-purchase cap US$ ${max}`,
      coverage: (pct: string) =>
        `On every tier your guarantor covers ${pct} of what remains to be paid (capital and interest). Late penalties are not covered by the guarantor. Moving up a tier does not reduce the guarantee.`,
      rules: [
        {
          title: "Without a guarantor there is no plan",
          body: "A guarantee is mandatory across all tiers. There are no purchases without family backing.",
        },
        {
          title: "Moving up a tier",
          body: (minFinanced: string, graceDays: number) =>
            `Paying off a plan with at least US$ ${minFinanced} financed and no payments after the ${graceDays}-day grace period moves you up 1 Tier: lower down payment and higher cap. Late payments resolved before the guarantor is charged neither add nor subtract a tier.`,
        },
        {
          title: "Dropping a tier",
          body: "If an installment is still unpaid on the guarantor charge day and the guarantor is charged, you drop 1 Tier and cannot open new plans.",
        },
      ],
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
          d: "You can pay just the installment; the plan still counts toward a tier-up.",
        },
        notice: {
          t: "Guarantor warning",
          d: "Still within grace: your family member gets a preventive notification, with no charge.",
        },
        penalty: {
          t: "Late fee",
          d: (pct: string) =>
            `A ${pct} late fee is added to the overdue installment and that plan stops counting toward a tier-up.`,
        },
        charge: {
          t: "Guarantor charged and Tier drop",
          d: "The overdue installment is charged to the guarantor's card. You drop one Tier and cannot open new plans until settled.",
        },
      },
      footnote:
        "The guarantor covers the remaining capital and agreed interest, but not late fees. If a second installment of the same plan reaches the guarantor-charge day unpaid, the full remaining balance is charged to the guarantor and the plan moves to recovered.",
    },
    family: {
      title: "For the family: being a guarantor",
      calloutTitle: "Mandatory card guarantee",
      calloutBody: (pct: string, chargeDay: number) =>
        `Without a guarantor there is no plan: the family member's card backs ${pct} of the remaining balance (capital and interest) and is only charged if an installment is still unpaid on day ${chargeDay}.`,
      intro:
        "In Lazo a guarantee is mandatory: without a guarantor there is no plan. If a buyer invites you to back them, these are the clear conditions:",
      items: [
        {
          t: "Without a guarantor there is no plan",
          d: "A card-backed guarantee is mandatory to open any plan across all tiers. There are no unbacked purchases.",
        },
        {
          t: "You cover capital and interest",
          d: "You cover the financed capital and agreed plan interest still owed. Late penalties are excluded and remain the buyer's responsibility.",
        },
        {
          t: "You only pay if the buyer doesn't",
          d: (graceDays: number, noticeDay: number, chargeDay: number) =>
            `There is a ${graceDays}-day grace period, a preventive notice in your name on day ${noticeDay}, and only on day ${chargeDay} a possible charge to your card.`,
        },
        {
          t: "The cap is agreed before you accept",
          d: "You see the guarantee's maximum amount before accepting the invitation: no plan can exceed the limit you authorized.",
        },
        {
          t: "Moving up a tier does not release you",
          d: "The buyer completing plans and moving up tiers improves their down payment and cap; your coverage includes the full outstanding balance while the plan is active.",
        },
      ],
    },
    next: {
      title: "What's coming",
      tag: "roadmap",
      items: [
        {
          t: "Argentine wallets as a channel",
          d: "We are evaluating having local wallets distribute Lazo and convert pesos to digital dollars. Channel under study: no signed agreements.",
        },
        {
          t: "Own treasury in DeFi, simulated",
          d: "Only Lazo's own treasury — never the pool or user funds — with simulated integration until verifying compatibility on devnet.",
        },
      ],
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          q: "Do I need a credit card?",
          a: "No. You pay the down payment and installments in digital dollars from your wallet. The card is registered by your mandatory guarantor and is only charged if an installment goes unpaid.",
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
          a: "In the simulator, yes: as long as what you owe fits within your Tier's margin, and every purchase is approved separately. On the onchain program the current rule is one plan per buyer.",
        },
        {
          q: "What happens to my data?",
          a: "Identity verification and the guarantor's card live offchain, with the onboarding provider. Only amounts, dates and plan states are stored onchain.",
        },
        {
          q: "What exactly does the guarantor cover?",
          a: "The guarantor covers everything left to pay: financed capital and agreed interest. Late penalties are not covered by the guarantor and remain the buyer's responsibility.",
        },
        {
          q: "Is this real?",
          a: "It's a demo: it runs on devnet, Solana's test network, with devUSDC, a worthless token. The merchants are sample merchants and no charge is real.",
        },
      ],
    },
    cta: {
      title: "Start with a sample purchase",
      merchants: "Browse merchants",
      checkout: "Try a checkout",
      account: "My account",
    },
  },
});
