import { defineDict } from "../locale";

// Página /para-comercios (ticket 10): cómo vende un comercio con Lazo, cuánto
// cobra y cuándo, cómo opera en mostrador y online, y qué sigue pendiente.
// Ningún número de negocio vive acá: los montos y tasas salen de la config
// del protocolo y de `quote()` en el componente; las cifras de terceros son
// REFERENCE_FIGURES con etiqueta "referencia" y sin marcas.
export const paraComercios = defineDict({
  es: {
    ctaPanel: "Ver el panel demo del comercio",
    ctaMarketplace: "Ver el marketplace",

    propuestaTitle: "Vendé en cuotas a clientes que no tienen tarjeta",
    propuestaIntro:
      "El cliente paga un anticipo y el resto en cuotas; un familiar con tarjeta respalda el capital por si no paga. Vos no perseguís a nadie: elegís cuándo cobrar y Lazo se encarga del plan.",
    cuotasValue: "{opciones}",
    cuotasLabel: "cuotas para tu cliente",
    cuotasNote:
      "{tres} sin interés; {seis} con un interés total del {pct} sobre lo financiado, que paga el comprador.",
    cuotasNoteBase: "{lista} cuotas sin interés.",
    respaldoLabel: "del capital financiado, respaldado",
    respaldoNote:
      "Cada venta lleva un fiador que cubre el capital pendiente si el cliente no paga.",
    cobroValue: "vos elegís",
    cobroLabel: "cuándo cobrar lo financiado",
    cobroNote: "Hoy o a {dias} días: a más espera, menos comisión.",
    cobroNoteHoy: "Hoy: el cobro inmediato es el único plazo habilitado en esta lectura.",

    cobroTitle: "Cuánto cobrás y cuándo",
    cobroIntro:
      "La comisión es sobre lo financiado, no sobre el precio. Cuanto más podés esperar el cobro, menos comisión pagás.",
    cobroEjemplo:
      "Ejemplo: una venta de {precio} con {anticipo} de anticipo y {financiado} financiados.",
    plazoHoy: "Hoy",
    plazoDias: "A {dias} días",
    comisionLabel: "comisión ({pct} de lo financiado)",
    netoLabel: "Neto que cobrás",
    cobroHoyLabel: "al confirmar la venta",
    cobroEnFechaLabel: "el día {dias}",
    cobroBarraAria: "Cobrás {hoy} al confirmar y {despues} en la fecha elegida",
    cobroGarantia:
      "El anticipo entra en el momento; la parte financiada llega en la fecha que elegiste. En la demo, Lazo garantiza esa fecha aunque el comprador se atrase.",
    cobroSeis:
      "En {seis} cuotas el interés lo paga el comprador, no vos: tu comisión es la misma que en {tres} y solo depende del plazo de cobro.",
    cobroCargando: "Leyendo los términos de la demo…",
    cobroErrorTitle: "No se pudieron leer los plazos",
    cobroErrorBody: "Falló la consulta a la demo. Reintentá.",
    cobroReintentar: "Reintentar",
    provisionalTag: "provisional",
    roadmapTag: "roadmap",

    operarTitle: "Cómo se vende en el día a día",
    operarOnlineTitle: "Online: un link de checkout",
    operarOnlineBody:
      "Cada producto tiene su enlace de pago en cuotas: va en tu tienda, en WhatsApp o en redes. El cliente abre el link, ve su anticipo y sus cuotas, y confirma.",
    operarMostradorTitle: "En mostrador: una orden con QR (roadmap)",
    operarMostradorBody:
      "La idea: el cajero genera la orden con el importe y el cliente la abre con la cámara. Es un link de Lazo en un QR — no es un QR de pagos interoperable ni lo lee la billetera de otro proveedor. Hoy no está implementado.",
    operarPanelTitle: "Tu panel: ventas, cobros y pendientes",
    operarPanelBody:
      "En tu cuenta ves cada venta con su comprobante, lo ya cobrado y lo que falta cobrar con su fecha. También fijás tu plazo de cobro predeterminado para las ventas nuevas.",

    comparacionTitle: "Frente a otras formas de vender en cuotas",
    comparacionIntro:
      "Las cifras de terceros son referencias publicadas por el equipo, no cotizaciones vigentes ni promesas. Ojo con la base: la de Lazo es sobre lo financiado; la de las alternativas, sobre el precio.",
    comparacionLazo: "Lazo",
    comparacionLazoDetalle: "{pct} sobre lo financiado, según el plazo de cobro",
    comparacionMipyme: "Programa público para MiPyMEs",
    comparacionMipymeDetalle:
      "{pct} sobre el precio · cobro a ~10 días hábiles · solo pymes certificadas",
    comparacionBilletera: "Billeteras y marketplaces",
    comparacionBilleteraDetalle: "{pct} sobre el precio · 3 cuotas sin interés",
    comparacionDemora:
      "Un competidor de cuotas le paga al comercio a {dias} días hábiles como mínimo publicitado. Con Lazo, si esperás lo mismo o menos, pagás menos comisión.",
    comparacionNote:
      "Comparación orientativa: cada producto tiene condiciones, costos y alcance distintos.",

    marketplaceTitle: "Aparecé donde te buscan",
    marketplaceBody:
      "El marketplace de Lazo es el directorio donde los estudiantes descubren comercios por nombre y categoría, y compran con el mismo checkout. El alta de comercios reales es parte del piloto.",
    marketplaceDemoNote:
      "Hoy el directorio lista comercios de ejemplo para mostrar el recorrido: no son aliados ni comercios adheridos.",
    marketplaceCta: "Explorar el marketplace",

    riesgosTitle: "Riesgos y pendientes, en claro",
    riesgoDevolucionesTitle: "Devoluciones",
    riesgoDevolucionesBody:
      "La política está en definición. La propuesta: antes de la fecha de cobro se cancela la orden y se devuelve lo pagado; después, se recupera el neto del comercio con un mecanismo acordado. Nunca se le devuelve todo al cliente dejando al fiador debitado.",
    riesgoFiadorTitle: "El respaldo no es un seguro total",
    riesgoFiadorBody:
      "El fiador cubre el 100% del capital pendiente, pero eso es una obligación contractual: la tarjeta puede rechazar el cargo. En el cobro diferido, la demo asume que Lazo te paga igual en la fecha elegida.",
    riesgoPartesTitle: "Qué asume cada parte",
    riesgoPartesBody:
      "Lazo opera el plan, la cobranza y el pool que adelanta el dinero. El comercio responde por la venta, la entrega y las devoluciones. El fiador respalda el capital. El procesador de pagos gestiona los cargos a la tarjeta.",
    riesgoAlcanceTitle: "Qué es demo y qué no",
    riesgoAlcanceBody:
      "Las 6 cuotas y los plazos de cobro viven solo en esta demo simulada: el programa en la cadena sigue con 3 cuotas y cobro inmediato. Las tarifas son valores provisionales, no una oferta comercial.",
    provisionalCalloutTitle: "Tarifas provisionales",
    provisionalCalloutBody:
      "Las comisiones por plazo de cobro y el interés de 6 cuotas son valores de la demo para mostrar el mecanismo; no son tarifas aprobadas.",

    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Cuándo cobro una venta?",
        a: "El anticipo entra al confirmar la venta y la parte financiada en la fecha que elijas. Fijás un plazo predeterminado en tu cuenta y cada venta guarda el suyo: cambiar el predeterminado no toca ventas ya hechas.",
      },
      {
        q: "¿Qué pasa si el cliente no paga?",
        a: "Un familiar con tarjeta respalda el capital pendiente y Lazo opera la cobranza. En la demo, tu cobro en la fecha elegida está garantizado aunque el cliente se atrase. Ojo: que el fiador deba es una obligación contractual; que la tarjeta acepte el cargo es otra cosa, y ese riesgo lo absorbe Lazo, no tu comercio.",
      },
      {
        q: "¿La comisión es sobre el precio de venta?",
        a: "No: es sobre lo financiado. Cobrar hoy cuesta {pctEj} de lo financiado y esperar baja esa tarifa — la tabla de arriba lo muestra con números.",
      },
      {
        q: "¿Necesito saber de cripto o tener una wallet?",
        a: "No para esta demo. Cobrás en devUSDC, un token de prueba que representa USDC (una moneda digital que sigue el valor del dólar) en devnet, la red de prueba de Solana. La conversión a pesos es una integración pendiente con rampas y billeteras argentinas: no hay acuerdos firmados.",
      },
      {
        q: "¿Qué pasa con una devolución?",
        a: "Es una política en definición. La propuesta es cancelar la orden si todavía no cobraste la parte financiada, y recuperar el neto con un mecanismo acordado si ya la cobraste.",
      },
      {
        q: "¿Cómo empiezo a vender con Lazo?",
        a: "Todavía no hay alta de comercios reales: la demo muestra el recorrido con comercios de ejemplo. Podés explorar el panel del comercio y el marketplace para ver cómo se vería tu operación.",
      },
      {
        q: "El QR de mostrador, ¿es un QR de pagos?",
        a: "No. Es un link a la orden de Lazo que el cliente abre con la cámara o el navegador; ninguna billetera ni lector interoperable lo procesa. Además es roadmap: hoy no está implementado.",
      },
    ],

    cierreTitle: "Mirá el recorrido del comercio",
    cierreBody:
      "El panel demo muestra saldo cobrado, ventas y pendientes; el marketplace, cómo te encontrarían los estudiantes.",
    devnetCallout:
      "Todo lo que ves acá corre en devnet, la red de prueba de Solana: la plata es de mentira y nada de esto mueve dinero real.",
  },
  en: {
    ctaPanel: "See the merchant demo panel",
    ctaMarketplace: "See the marketplace",

    propuestaTitle: "Sell in installments to customers with no card",
    propuestaIntro:
      "The customer pays a down payment and the rest in installments; a relative with a card backs the principal in case they don't pay. You chase nobody: you choose when you get paid and Lazo runs the plan.",
    cuotasValue: "{opciones}",
    cuotasLabel: "installment plans for your customer",
    cuotasNote:
      "{tres} interest-free; {seis} with a {pct} total interest on the financed amount, paid by the buyer.",
    cuotasNoteBase: "{lista} interest-free installments.",
    respaldoLabel: "of the financed amount, backed",
    respaldoNote:
      "Every sale carries a guarantor who covers the outstanding principal if the customer doesn't pay.",
    cobroValue: "you choose",
    cobroLabel: "when you collect the financed amount",
    cobroNote: "Today or in {dias} days: the longer you wait, the lower the fee.",
    cobroNoteHoy: "Today: instant payout is the only term enabled in this read.",

    cobroTitle: "How much you get paid, and when",
    cobroIntro:
      "The fee is on the financed amount, not the price. The longer you can wait for the payout, the less fee you pay.",
    cobroEjemplo:
      "Example: a {precio} sale with a {anticipo} down payment and {financiado} financed.",
    plazoHoy: "Today",
    plazoDias: "In {dias} days",
    comisionLabel: "fee ({pct} of the financed amount)",
    netoLabel: "Net you receive",
    cobroHoyLabel: "when the sale is confirmed",
    cobroEnFechaLabel: "on day {dias}",
    cobroBarraAria: "You collect {hoy} at checkout and {despues} on the chosen date",
    cobroGarantia:
      "The down payment lands right away; the financed part arrives on the date you chose. In the demo, Lazo guarantees that date even if the buyer falls behind.",
    cobroSeis:
      "With {seis} installments the buyer pays the interest, not you: your fee is the same as with {tres} and only depends on the payout term.",
    cobroCargando: "Reading the demo terms…",
    cobroErrorTitle: "Couldn't load the payout terms",
    cobroErrorBody: "The demo query failed. Retry.",
    cobroReintentar: "Retry",
    provisionalTag: "provisional",
    roadmapTag: "roadmap",

    operarTitle: "How selling works day to day",
    operarOnlineTitle: "Online: a checkout link",
    operarOnlineBody:
      "Every product has its own installment checkout link: it goes in your store, on WhatsApp or on social media. The customer opens it, sees their down payment and installments, and confirms.",
    operarMostradorTitle: "At the counter: an order with a QR (roadmap)",
    operarMostradorBody:
      "The idea: the cashier creates the order with the amount and the customer opens it with their camera. It's a Lazo link inside a QR — not an interoperable payment QR and no other provider's wallet can read it. It's not implemented today.",
    operarPanelTitle: "Your panel: sales, payouts and pending amounts",
    operarPanelBody:
      "Your account shows every sale with its receipt, what you already collected and what's still pending with its date. You also set your default payout term for new sales.",

    comparacionTitle: "Compared to other ways of selling in installments",
    comparacionIntro:
      "Third-party figures are references published by the team, not live quotes or promises. Mind the base: Lazo's is on the financed amount; the alternatives' is on the price.",
    comparacionLazo: "Lazo",
    comparacionLazoDetalle: "{pct} on the financed amount, depending on the payout term",
    comparacionMipyme: "Public program for certified SMBs",
    comparacionMipymeDetalle:
      "{pct} on the price · payout in ~10 business days · certified SMBs only",
    comparacionBilletera: "Wallets and marketplaces",
    comparacionBilleteraDetalle: "{pct} on the price · 3 interest-free installments",
    comparacionDemora:
      "One installment competitor pays the merchant {dias} business days later, minimum advertised. With Lazo, waiting that long or less costs you less fee.",
    comparacionNote:
      "Rough comparison: each product has different terms, costs and reach.",

    marketplaceTitle: "Show up where they look for you",
    marketplaceBody:
      "The Lazo marketplace is the directory where students discover merchants by name and category, and buy with the same checkout. Real merchant onboarding is part of the pilot.",
    marketplaceDemoNote:
      "Today the directory lists example merchants to show the flow: they are not partners or enrolled stores.",
    marketplaceCta: "Browse the marketplace",

    riesgosTitle: "Risks and open questions, in plain terms",
    riesgoDevolucionesTitle: "Refunds",
    riesgoDevolucionesBody:
      "The policy is being defined. The proposal: before the payout date the order is cancelled and payments are returned; afterwards, the merchant's net is recovered through an agreed clawback. The customer never gets a full refund while the guarantor is left charged.",
    riesgoFiadorTitle: "The backing isn't full insurance",
    riesgoFiadorBody:
      "The guarantor covers 100% of the outstanding principal, but that's a contractual obligation: the card can decline the charge. With deferred payouts, the demo assumes Lazo still pays you on the chosen date.",
    riesgoPartesTitle: "What each party takes on",
    riesgoPartesBody:
      "Lazo runs the plan, the collections and the pool that advances the money. The merchant answers for the sale, delivery and refunds. The guarantor backs the principal. The payment processor handles the card charges.",
    riesgoAlcanceTitle: "What's demo and what isn't",
    riesgoAlcanceBody:
      "The 6-installment plan and the payout terms live only in this simulated demo: the on-chain program still runs 3 installments and instant payout. The fees are provisional values, not a commercial offer.",
    provisionalCalloutTitle: "Provisional fees",
    provisionalCalloutBody:
      "The payout-term fees and the 6-installment interest are demo values to show the mechanism; they are not approved rates.",

    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "When do I get paid for a sale?",
        a: "The down payment lands when the sale is confirmed and the financed part on the date you choose. You set a default term in your account and each sale keeps its own: changing the default doesn't touch past sales.",
      },
      {
        q: "What if the customer doesn't pay?",
        a: "A relative with a card backs the outstanding principal and Lazo runs the collections. In the demo, your payout on the chosen date is guaranteed even if the customer falls behind. Mind the difference: the guarantor owing it is contractual; the card accepting the charge is another matter, and Lazo absorbs that risk, not your store.",
      },
      {
        q: "Is the fee on the sale price?",
        a: "No: it's on the financed amount. Collecting today costs {pctEj} of the financed amount and waiting lowers that fee — the table above shows it with real numbers.",
      },
      {
        q: "Do I need to know crypto or have a wallet?",
        a: "Not for this demo. You collect in devUSDC, a test token standing in for USDC (a digital currency that tracks the dollar) on devnet, Solana's test network. Converting to pesos is a pending integration with Argentine ramps and wallets: no agreements are signed.",
      },
      {
        q: "What about refunds?",
        a: "The policy is being defined. The proposal is to cancel the order if you haven't collected the financed part yet, and to recover the net through an agreed clawback if you already did.",
      },
      {
        q: "How do I start selling with Lazo?",
        a: "There's no real merchant onboarding yet: the demo shows the flow with example merchants. You can browse the merchant panel and the marketplace to see what your operation would look like.",
      },
      {
        q: "Is the counter QR a payment QR?",
        a: "No. It's a link to the Lazo order that the customer opens with their camera or browser; no wallet or interoperable reader processes it. It's also roadmap: it's not implemented today.",
      },
    ],

    cierreTitle: "Walk the merchant's flow",
    cierreBody:
      "The demo panel shows collected balance, sales and pending payouts; the marketplace shows how students would find you.",
    devnetCallout:
      "Everything you see here runs on devnet, Solana's test network: the money is fake and none of this moves real funds.",
  },
});
