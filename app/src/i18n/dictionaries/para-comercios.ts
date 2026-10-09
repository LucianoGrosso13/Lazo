import { defineDict } from "../locale";

// Página /para-comercios (ticket 10, rediseño ticket 09): cómo vende un
// comercio con Lazo — figura de cobros en el tiempo, pasos de una venta,
// neto por plazo (quote()), comparativas con cifras de referencia, canales,
// garantías y FAQ en acordeón. Ningún número de negocio vive acá: sale de
// la config del protocolo, de quote() y de payoutSchedule(); las cifras de
// terceros son REFERENCE_FIGURES con etiqueta "referencia" y sin marcas.
export const paraComercios = defineDict({
  es: {
    ctaHeroMostrador: "Probar terminal de mostrador",
    ctaMarketplace: "Ver el marketplace",

    figTitle: "Una venta de {precio}: cuándo entra cada cobro",
    figAxisDias: "días desde la venta",
    figHoy: "hoy",
    figComision: "comisión {pct}",
    figLaneHoy: "{plazo}: cobrás {neto} al confirmar la venta",
    figLanePlazo: "{plazo}: {anticipo} al confirmar y {tramos}",
    figTramo: "{monto} el día {dia}",
    figLegendHoy: "al confirmar la venta",
    figLegendTramo: "tramo garantizado por Lazo",
    figCaption:
      "Elegís el plazo por venta; cada tramo está garantizado en su fecha, aunque el comprador se atrase.",
    figCargando: "Consultando plazos…",

    pasosTitle: "De la orden al cobro",
    pasos: [
      {
        title: "Generás la orden",
        body: "En mostrador, un QR en pantalla desde la terminal; online, un link de checkout para compartir por WhatsApp, redes o tu tienda.",
      },
      {
        title: "El comprador confirma en cuotas",
        body: "Elige {cuotas} cuotas y confirma con su garante: un familiar con tarjeta que respalda el 100% del plan.",
      },
      {
        title: "Cobrás en el plazo que elegiste",
        body: "El anticipo entra al instante y lo financiado llega en tramos mensuales garantizados por Lazo en la cadena.",
      },
    ],

    cobroTitle: "Cuánto cobrás y cuándo",
    cobroIntro:
      "La comisión aplica sobre lo financiado, no sobre el precio total. Cuanto más diferís el cobro, menor es la comisión — y cada tramo llega en su fecha aunque el comprador se atrase.",
    netoGrandeLabel: "neto de una venta de {precio} cobrada hoy",
    netoGrandeNote:
      "Si esperás {dias} días te quedan {neto}: la comisión baja de {max} a {min} sobre lo financiado.",
    cobroEjemplo:
      "Ejemplo con una venta de {precio}: {anticipo} de anticipo y {financiado} financiados.",
    plazoHoy: "Hoy",
    plazoDias: "A {dias} días",
    netoLabel: "Neto que cobrás",
    comisionLabel: "comisión ({pct} de lo financiado)",
    cobroInmediatoTodo: "Todo al confirmar: anticipo + saldo neto.",
    tramosResumen: "{anticipo} al confirmar + {n} tramos de {monto}",
    tramosResumenVarios: "{anticipo} al confirmar + {n} tramos ({montos})",
    cobroGarantia:
      "Cada tramo queda comprometido en la cadena al confirmar la venta y Lazo garantiza su fecha, pague o no el comprador.",
    cobroSeis:
      "En {seis} cuotas el interés ({pct} total) lo paga el comprador, no vos: tu comisión solo depende del plazo de cobro elegido.",
    cobroCargando: "Consultando plazos y comisiones…",
    cobroErrorTitle: "No se pudieron leer los plazos",
    cobroErrorBody: "Falló la consulta al protocolo. Reintentá.",
    cobroReintentar: "Reintentar",

    cmpTitle: "Frente a otras formas de financiar",
    cmpIntro:
      "Dos números deciden si te conviene: la comisión que pagás vos y lo que paga tu cliente. Las cifras externas son referencias publicadas, no cotizaciones vigentes.",
    cmpComercioTitle: "Tu comisión por venta",
    cmpComercioLabel: "Comisión sobre lo financiado",
    cmpClienteTitle: "Lo que paga tu cliente",
    cmpClienteLabel: "Costo de financiamiento",
    cmpLazoHoy: "Lazo · cobrás hoy",
    cmpLazoPlazo: "Lazo · cobrás a {dias} días",
    cmpPublico: "Programa público de cuotas",
    cmpPublicoNote: "Comisión publicada ~{pct}; solo MiPyMEs certificadas y pago a ~10 días hábiles.",
    cmpBilletera: "Billetera o marketplace",
    cmpBilleteraNote: "Comisión publicada ~{pct} por cuotas sin interés.",
    cmpLazoCuotas: "Lazo · {n} cuotas",
    cmpCompetencia: "Crédito en cuotas sin tarjeta",
    cmpCompetenciaNote: "CFTEA anual publicado: rango de {min} a {max}.",
    cmpGanadorComercio: "la comisión más baja",
    cmpGanadorCliente: "sin interés",
    cmpNote:
      "Comparación orientativa con cifras de referencia: cada alternativa tiene condiciones de elegibilidad, plazos e impuestos particulares. La CFTEA mide un año; el interés de Lazo es total del plan.",
    cmpDiasNote:
      "El anticipo entra el día de la venta en todos los plazos. Otras opciones de cuotas pagan recién desde los ~{dias} días hábiles (referencia).",

    riesgosTitle: "Seguridad, garantías y reglas claras",
    riesgoCompromisoTitle: "Compromiso registrado en la cadena",
    riesgoCompromisoBody:
      "Al confirmarse la venta se registra en Solana el calendario exacto de tramos a tu favor. Los fondos quedan comprometidos en el pool y se liberan solos en su fecha.",
    riesgoFiadorTitle: "El respaldo del garante",
    riesgoFiadorBody:
      "Un familiar con tarjeta cubre el 100% de lo que falte (capital más interés). Si el emisor rechaza un débito en mora, ese riesgo lo absorbe Lazo: tus tramos no se tocan.",
    riesgoLiquidezTitle: "Liquidez asegurada antes de cada compra",
    riesgoLiquidezBody:
      "El protocolo solo permite abrir una venta si el pool tiene liquidez suficiente para cubrir el anticipo y todos los tramos futuros.",

    destinosTitle: "Tres lugares para vender hoy",
    destinosIntro:
      "Mostrador, panel y marketplace: el circuito comercial completo ya se puede recorrer.",
    operarMostradorTitle: "Terminal de mostrador",
    operarMostradorBody:
      "Cargás importe y concepto, se genera un QR y la venta se acredita en tiempo real en tu pantalla.",
    operarPanelTitle: "Panel del comercio",
    operarPanelBody:
      "Cada venta con su comprobante, lo cobrado al instante y el calendario de tramos pendientes con sus fechas.",
    operarMarketplaceTitle: "Marketplace de Lazo",
    operarMarketplaceBody:
      "Los compradores descubren comercios por rubro y compran en mostrador y online.",
    ejemploTag: "de ejemplo",

    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Cuándo cobro una venta?",
        a: "El anticipo entra al instante al confirmar la venta. La parte financiada se libera en tramos mensuales iguales según el plazo que elijas: 100% hoy, en 1 tramo a 30 días, en 2 tramos (a 30 y 60 días) o en 3 tramos (a 30, 60 y 90 días). Cada venta congela sus tramos y fechas en la cadena al momento de abrirse.",
      },
      {
        q: "¿Qué pasa si el cliente no paga?",
        a: "Un familiar con tarjeta de crédito respalda el 100% de lo que falta pagar (capital e interés). Lazo opera la cobranza y garantiza cada tramo del comercio en su fecha comprometida en la cadena, pague o no el comprador. Aunque la tarjeta del garante rechace el cargo, el riesgo lo absorbe el protocolo, no tu comercio.",
      },
      {
        q: "¿La comisión es sobre el precio de venta?",
        a: "No: es sobre lo financiado, nunca sobre el precio total. Cobrar hoy cuesta {pctEj} de lo financiado, y elegir tramos a 30, 60 o 90 días reduce progresivamente esa comisión. El anticipo no paga comisión de financiamiento.",
      },
      {
        q: "¿Necesito saber de cripto o tener una wallet?",
        a: "No para operar. En esta etapa corremos en devnet de Solana con devUSDC (un token que representa dólares digitales de prueba). La liquidación final en pesos se integrará a futuro mediante alianzas con billeteras argentinas y rampas locales (sin acuerdos firmados aún).",
      },
      {
        q: "¿Qué pasa con una devolución?",
        a: "Todavía es una política en definición, y la cerramos con los primeros comercios. La propuesta: si los tramos todavía no se liberaron, se cancela la orden; si ya se liberaron, el neto se recupera con un mecanismo acordado. Nunca se le devuelve todo al cliente mientras al garante le queda un cargo.",
      },
      {
        q: "¿Cómo empiezo a vender con Lazo?",
        a: "Podés probar todo el circuito comercial hoy mismo: generar órdenes en el mostrador con QR, revisar las ventas en el panel de comercio y explorar los productos en el marketplace de ejemplo.",
      },
      {
        q: "El QR de mostrador, ¿es un QR de pagos?",
        a: "No es un QR bancario ni interoperable de transferencias: es un enlace dinámico a la orden de compra de Lazo. El cliente lo abre con la cámara estándar de cualquier teléfono o su navegador, revisa las cuotas disponibles y confirma con su garantía activa en segundos. Ya está disponible para probar en el mostrador.",
      },
    ],

    cierreTitle: "Empezá a vender en cuotas con Lazo",
    cierreBody:
      "Probá la terminal de mostrador, explorá el panel de control del comercio o descubrí cómo te encuentran los compradores en el marketplace.",
    devnetCallout:
      "Esta plataforma opera en Solana devnet (red de pruebas): los fondos en devUSDC son para validación y no representan dinero real.",
  },
  en: {
    ctaHeroMostrador: "Try counter terminal",
    ctaMarketplace: "View marketplace",

    figTitle: "A {precio} sale: when each payout lands",
    figAxisDias: "days after the sale",
    figHoy: "today",
    figComision: "fee {pct}",
    figLaneHoy: "{plazo}: you collect {neto} at checkout",
    figLanePlazo: "{plazo}: {anticipo} at checkout plus {tramos}",
    figTramo: "{monto} on day {dia}",
    figLegendHoy: "at sale confirmation",
    figLegendTramo: "tranche guaranteed by Lazo",
    figCaption:
      "You pick the term per sale; every tranche is guaranteed on its date, even if the buyer falls behind.",
    figCargando: "Loading terms…",

    pasosTitle: "From order to payout",
    pasos: [
      {
        title: "You create the order",
        body: "At the counter, an on-screen QR from the terminal; online, a checkout link to share via WhatsApp, social media, or your store.",
      },
      {
        title: "The buyer confirms in installments",
        body: "They pick {cuotas} installments and confirm with their guarantor: a relative with a card who backs 100% of the plan.",
      },
      {
        title: "You get paid on your chosen term",
        body: "The down payment lands instantly and the financed share arrives in monthly tranches guaranteed by Lazo onchain.",
      },
    ],

    cobroTitle: "How much you get paid, and when",
    cobroIntro:
      "The fee applies to the financed amount, not the total price. The longer you defer the payout, the lower the fee — and every tranche lands on its date even if the buyer falls behind.",
    netoGrandeLabel: "net from a {precio} sale collected today",
    netoGrandeNote:
      "Wait {dias} days and you keep {neto}: the fee drops from {max} to {min} of the financed amount.",
    cobroEjemplo:
      "Example with a {precio} sale: {anticipo} down payment and {financiado} financed.",
    plazoHoy: "Today",
    plazoDias: "In {dias} days",
    netoLabel: "Net you collect",
    comisionLabel: "fee ({pct} of the financed amount)",
    cobroInmediatoTodo: "Everything at checkout: down payment + net balance.",
    tramosResumen: "{anticipo} at checkout + {n} tranches of {monto}",
    tramosResumenVarios: "{anticipo} at checkout + {n} tranches ({montos})",
    cobroGarantia:
      "Each tranche is committed onchain when the sale confirms and Lazo guarantees its date, whether the buyer pays or not.",
    cobroSeis:
      "In {seis} installments the buyer pays the interest ({pct} total), not you: your fee only depends on the payout term you choose.",
    cobroCargando: "Loading terms and fees…",
    cobroErrorTitle: "Could not load terms",
    cobroErrorBody: "Protocol query failed. Retry.",
    cobroReintentar: "Retry",

    cmpTitle: "Next to other ways of financing",
    cmpIntro:
      "Two numbers decide whether it works for you: the fee you pay and what your customer pays. External figures are published references, not live quotes.",
    cmpComercioTitle: "Your fee per sale",
    cmpComercioLabel: "Fee on the financed amount",
    cmpClienteTitle: "What your customer pays",
    cmpClienteLabel: "Financing cost",
    cmpLazoHoy: "Lazo · you collect today",
    cmpLazoPlazo: "Lazo · you collect in {dias} days",
    cmpPublico: "Public installments program",
    cmpPublicoNote: "Published fee ~{pct}; certified SMEs only, paid in ~10 business days.",
    cmpBilletera: "Wallet or marketplace",
    cmpBilleteraNote: "Published fee ~{pct} for interest-free installments.",
    cmpLazoCuotas: "Lazo · {n} installments",
    cmpCompetencia: "Cardless installment credit",
    cmpCompetenciaNote: "Published annualized total cost: {min} to {max} range.",
    cmpGanadorComercio: "lowest fee",
    cmpGanadorCliente: "interest-free",
    cmpNote:
      "Guidance comparison with reference figures: each alternative has its own eligibility rules, terms, and taxes. CFTEA measures a full year; Lazo's interest is a plan total.",
    cmpDiasNote:
      "The down payment lands on sale day at every term. Other installment options pay starting ~{dias} business days later (reference).",

    riesgosTitle: "Security, guarantees and clear rules",
    riesgoCompromisoTitle: "Commitment registered onchain",
    riesgoCompromisoBody:
      "When the sale confirms, Solana records the exact tranche calendar in your favor. Funds stay committed in the pool and release on their own on each date.",
    riesgoFiadorTitle: "Guarantor backing",
    riesgoFiadorBody:
      "A relative with a card covers 100% of what's left (principal plus interest). If the issuer declines a charge in arrears, Lazo absorbs that risk: your tranches are untouched.",
    riesgoLiquidezTitle: "Liquidity secured before each purchase",
    riesgoLiquidezBody:
      "The protocol only opens a sale if the pool holds enough liquidity to cover the advance and every future tranche.",

    destinosTitle: "Three places to sell today",
    destinosIntro:
      "Counter, dashboard and marketplace: the full commercial loop is ready to try.",
    operarMostradorTitle: "Counter terminal",
    operarMostradorBody:
      "Enter amount and description, a QR is generated, and the sale settles in real time on your screen.",
    operarPanelTitle: "Merchant dashboard",
    operarPanelBody:
      "Every sale with its receipt, what you collected instantly, and the calendar of pending tranches with their dates.",
    operarMarketplaceTitle: "Lazo marketplace",
    operarMarketplaceBody:
      "Buyers discover stores by category and shop at the counter and online.",
    ejemploTag: "example",

    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "When do I get paid for a sale?",
        a: "The down payment lands instantly at checkout. The financed share is released in equal monthly tranches based on your chosen term: 100% today, 1 tranche at 30 days, 2 tranches (at 30 and 60 days), or 3 tranches (at 30, 60, and 90 days). Each sale locks its tranches and dates onchain upon creation.",
      },
      {
        q: "What happens if the customer doesn't pay?",
        a: "A relative with a credit card backs 100% of the outstanding balance (principal and interest). Lazo manages collections and guarantees each merchant tranche on its committed onchain date, whether the buyer pays or not. Even if the guarantor's card declines the charge, the protocol absorbs the risk, not your store.",
      },
      {
        q: "Is the fee on the sale price?",
        a: "No: it applies strictly to the financed amount, never to the total sale price. Collecting today costs {pctEj} of the financed amount, and selecting tranches at 30, 60, or 90 days progressively reduces that fee. The down payment incurs no financing fee.",
      },
      {
        q: "Do I need to know crypto or have a wallet?",
        a: "Not to operate. At this stage we run on Solana devnet using devUSDC (a test token tracking the dollar). Settlement in local pesos will be integrated down the road through partnerships with Argentine wallets and local ramps (no signed agreements yet).",
      },
      {
        q: "What about refunds?",
        a: "This policy is still being defined, and we will settle it with the first merchants. The proposal: if the tranches have not been released yet, the order is cancelled; if they have, the net amount is recovered through an agreed mechanism. The customer never gets a full refund while the guarantor is left with a charge.",
      },
      {
        q: "How do I start selling with Lazo?",
        a: "You can test the entire commercial workflow today: generate in-store orders via QR, review sales in the merchant dashboard, and browse products in the example marketplace.",
      },
      {
        q: "Is the counter QR a payment QR?",
        a: "It is not a bank or interoperable transfer QR: it is a dynamic link to the Lazo checkout order. The customer scans it with any smartphone camera or browser, reviews available installments, and confirms with their active guarantee in seconds. It is ready to test at the counter today.",
      },
    ],

    cierreTitle: "Start selling in installments with Lazo",
    cierreBody:
      "Try the counter terminal, explore the merchant dashboard, or discover how buyers find you in the marketplace.",
    devnetCallout:
      "This platform operates on Solana devnet (test network): devUSDC funds are for testing and do not represent real money.",
  },
});
