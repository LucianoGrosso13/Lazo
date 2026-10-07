import { defineDict } from "../locale";

// Página /para-comercios (ticket 10): cómo vende un comercio con Lazo, cuánto
// cobra y cuándo (tramos y calendario), cómo opera en mostrador y online,
// seguridad, y comparación con referencias públicas.
// Ningún número de negocio vive acá: los montos y tasas salen de la config
// del protocolo, de quote() y de payoutSchedule(); las cifras de terceros son
// REFERENCE_FIGURES con etiqueta "referencia" y sin marcas de competidores.
export const paraComercios = defineDict({
  es: {
    ctaHeroMostrador: "Probar terminal de mostrador",
    ctaPanel: "Ver el panel del comercio",
    ctaMarketplace: "Ver el marketplace",

    propuestaTitle: "Vendé en cuotas a clientes que no tienen tarjeta",
    propuestaIntro:
      "El cliente paga un anticipo y el resto en cuotas; un familiar con tarjeta respalda el capital y los intereses por si no paga. Vos no perseguís a nadie: elegís cuándo cobrar y Lazo garantiza cada tramo del plan.",
    cuotasValue: "{opciones}",
    cuotasLabel: "cuotas para tu cliente",
    cuotasNote:
      "{tres} sin interés; {seis} con un interés total del {pct} sobre lo financiado, que paga el comprador.",
    cuotasNoteBase: "{lista} cuotas sin interés.",
    respaldoLabel: "del saldo financiado, respaldado",
    respaldoNote:
      "Cada venta lleva un fiador con tarjeta de crédito que cubre el 100% pendiente (capital más interés).",
    cobroValue: "vos elegís",
    cobroLabel: "cuándo y cómo cobrar lo financiado",
    cobroNote: "Hoy o en tramos a {dias} días: a más espera, menos comisión.",
    cobroNoteHoy: "Hoy: cobro inmediato al confirmar la venta.",

    cobroTitle: "Cuánto cobrás y cuándo",
    cobroIntro:
      "La comisión aplica sobre lo financiado, no sobre el precio total. Cuanto más podés diferir el cobro, menor es la comisión. El anticipo se acredita al instante y la parte financiada se libera en tramos mensuales iguales.",
    cobroEjemplo:
      "Ejemplo con una venta de {precio}: {anticipo} de anticipo y {financiado} financiados.",
    plazoHoy: "Hoy",
    plazoDias: "A {dias} días",
    comisionLabel: "comisión ({pct} de lo financiado)",
    netoLabel: "Neto total que cobrás",
    cobroHoyLabel: "al confirmar la venta",
    anticipoAlConfirmar: "Al confirmar:",
    tramosGarantizados: "Tramos garantizados:",
    cobroInmediatoTodo: "100% al confirmar (anticipo + saldo neto)",
    tramoItem: "Día {dia}: {monto}",
    tramosResumen: "{n} tramos mensuales de {monto}",
    cobroBarraAria: "Cobrás {anticipo} al confirmar y {tramos} en tramos garantizados",
    cobroGarantia:
      "El anticipo entra al instante al confirmar la venta. La parte financiada se libera en los tramos acordados: Lazo garantiza cada fecha en la cadena aunque el comprador se atrase.",
    cobroSeis:
      "En {seis} cuotas el interés ({pct} total) lo paga el comprador, no vos: tu comisión de comercio es exactamente la misma que en {tres} y solo depende del plazo de cobro elegido.",
    cobroCargando: "Consultando plazos y comisiones…",
    cobroErrorTitle: "No se pudieron leer los plazos",
    cobroErrorBody: "Falló la consulta al protocolo. Reintentá.",
    cobroReintentar: "Reintentar",

    operarTitle: "Cómo se vende en el día a día",
    operarMostradorTitle: "En mostrador: orden con código QR",
    operarMostradorBody:
      "Cargás el importe y el concepto desde la terminal de mostrador y se genera un QR en pantalla. El estudiante lo escanea con la cámara de su celular, elige 3 o 6 cuotas y confirma con su fianza activa. La venta se acredita en tiempo real en tu pantalla.",
    operarMostradorCta: "Abrir terminal de mostrador",
    operarOnlineTitle: "Online: links de checkout y tienda",
    operarOnlineBody:
      "Generás enlaces directos de pago en cuotas para compartir por WhatsApp, redes o tu propia tienda web. El cliente entra al enlace, revisa las cuotas y confirma en segundos.",
    operarOnlineCta: "Ver productos en el marketplace",
    operarPanelTitle: "Tu panel: ventas, cobros y tramos",
    operarPanelBody:
      "En tu cuenta ves cada venta con su comprobante, lo cobrado al instante y el calendario de tramos pendientes con sus fechas de liberación. También configurás tu plazo de cobro predeterminado.",
    operarPanelCta: "Ir al panel del comercio",

    comparacionTitle: "Costo de financiamiento para el comprador",
    comparacionIntro:
      "Lazo ofrece {tres} cuotas sin interés y {seis} cuotas con {pct} de interés total. La competencia publica una CFTEA anual, que mide otro período; las cifras externas son referencias, no cotizaciones vigentes.",
    comparacionLazo: "Costo total del plan Lazo",
    comparacionLazoDetalle: "{tres} cuotas sin interés · {seis} cuotas con {pct} total",
    comparacionCfteaTitle: "Costo de financiamiento para el cliente sin tarjeta",
    comparacionCfteaDetalle:
      "Crédito en cuotas sin tarjeta: CFTEA publicado del {min}% al {max}% (referencia).",
    comparacionNote:
      "Comparación orientativa con cifras de referencia: cada alternativa posee condiciones de elegibilidad, plazos e impuestos particulares.",

    marketplaceTitle: "Aparecé donde te buscan los estudiantes",
    marketplaceBody:
      "El marketplace de Lazo conecta a estudiantes y familias con comercios que ofrecen cuotas respaldadas. Los clientes descubren comercios por rubro y compran tanto en mostrador como online.",
    marketplaceExampleNote:
      "El directorio lista comercios y productos de ejemplo para mostrar la experiencia de compra y venta.",
    marketplaceCta: "Explorar comercios en el marketplace",

    riesgosTitle: "Seguridad, garantías y reglas claras",
    riesgoCompromisoTitle: "Compromiso registrado en la cadena",
    riesgoCompromisoBody:
      "Al confirmarse cada venta se registra una cuenta pública en Solana con el calendario exacto de tramos a favor del comercio. Los fondos quedan comprometidos en el pool y se liberan automáticamente en su fecha: Lazo garantiza cada tramo aunque el comprador se atrase.",
    riesgoFiadorTitle: "El respaldo del fiador y la absorción de riesgo",
    riesgoFiadorBody:
      "El fiador cubre el 100% de lo que falta pagar (capital más interés). Que el fiador deba es una obligación contractual; ante la posibilidad de que la tarjeta emisora rechace un débito en mora, ese riesgo operativo lo absorbe Lazo y nunca afecta los tramos pactados de tu comercio.",
    riesgoLiquidezTitle: "Liquidez asegurada antes de cada compra",
    riesgoLiquidezBody:
      "Para garantizar el cumplimiento de cada compromiso, el protocolo solo permite abrir compras si el pool cuenta con liquidez disponible suficiente para cubrir el desembolso inicial y todos los tramos diferidos futuros.",

    faqTitle: "Preguntas frecuentes",
    faq: [
      {
        q: "¿Cuándo cobro una venta?",
        a: "El anticipo entra al instante al confirmar la venta. La parte financiada se libera en tramos mensuales iguales según el plazo que elijas: 100% hoy, en 1 tramo a 30 días, en 2 tramos (a 30 y 60 días) o en 3 tramos (a 30, 60 y 90 días). Cada venta congela sus tramos y fechas en la cadena al momento de abrirse.",
      },
      {
        q: "¿Qué pasa si el cliente no paga?",
        a: "Un familiar con tarjeta de crédito respalda el 100% de lo que falta pagar (capital e interés). Lazo opera la cobranza y garantiza cada tramo del comercio en su fecha comprometida en la cadena, pague o no el estudiante. Aunque la tarjeta del fiador rechace el cargo, el riesgo lo absorbe el protocolo, no tu comercio.",
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
        a: "Si la cancelación ocurre antes de la liberación de los tramos diferidos, se cancela la orden y se restituyen los fondos correspondientes. Si los tramos ya fueron liberados, el neto se compensa mediante el mecanismo acordado con el comercio, protegiendo siempre al fiador de cargos indebidos.",
      },
      {
        q: "¿Cómo empiezo a vender con Lazo?",
        a: "Podés probar todo el circuito comercial hoy mismo: generar órdenes en el mostrador con QR, revisar las ventas en el panel de comercio y explorar los productos en el marketplace de ejemplo.",
      },
      {
        q: "El QR de mostrador, ¿es un QR de pagos?",
        a: "No es un QR bancario ni interoperable de transferencias: es un enlace dinámico a la orden de compra de Lazo. El cliente lo abre con la cámara estándar de cualquier teléfono o su navegador, revisa las cuotas disponibles y confirma con su fianza activa en segundos. Ya está disponible para probar en el mostrador.",
      },
    ],

    cierreTitle: "Empezá a vender en cuotas con Lazo",
    cierreBody:
      "Probá la terminal de mostrador, explorá el panel de control del comercio o descubrí cómo te encuentran los estudiantes en el marketplace.",
    devnetCallout:
      "Esta plataforma opera en Solana devnet (red de pruebas): los fondos en devUSDC son para validación y no representan dinero real.",
  },
  en: {
    ctaHeroMostrador: "Try counter terminal",
    ctaPanel: "View merchant panel",
    ctaMarketplace: "View marketplace",

    propuestaTitle: "Sell in installments to customers with no card",
    propuestaIntro:
      "The customer pays a down payment and the rest in installments; a relative with a card backs both principal and interest if they don't pay. You chase nobody: you choose when to get paid and Lazo guarantees each tranche of the plan.",
    cuotasValue: "{opciones}",
    cuotasLabel: "installment plans for your customer",
    cuotasNote:
      "{tres} interest-free; {seis} with a {pct} total interest on the financed amount, paid by the buyer.",
    cuotasNoteBase: "{lista} interest-free installments.",
    respaldoLabel: "of the financed balance, backed",
    respaldoNote:
      "Every sale carries a card guarantor who backs 100% of the outstanding balance (principal plus interest).",
    cobroValue: "you choose",
    cobroLabel: "when and how to collect the financed amount",
    cobroNote: "Today or in tranches at {dias} days: the longer you wait, the lower the fee.",
    cobroNoteHoy: "Today: instant payout upon confirmation.",

    cobroTitle: "How much you get paid, and when",
    cobroIntro:
      "The fee applies to the financed amount, not the total price. The longer you can defer the payout, the lower the fee. The down payment is credited instantly and the financed part is released in guaranteed equal monthly tranches.",
    cobroEjemplo:
      "Example with a {precio} sale: {anticipo} down payment and {financiado} financed.",
    plazoHoy: "Today",
    plazoDias: "In {dias} days",
    comisionLabel: "fee ({pct} of financed amount)",
    netoLabel: "Total net you collect",
    cobroHoyLabel: "upon sale confirmation",
    anticipoAlConfirmar: "At checkout:",
    tramosGarantizados: "Guaranteed tranches:",
    cobroInmediatoTodo: "100% at checkout (down payment + net balance)",
    tramoItem: "Day {dia}: {monto}",
    tramosResumen: "{n} monthly tranches of {monto}",
    cobroBarraAria: "You collect {anticipo} at checkout and {tramos} in guaranteed tranches",
    cobroGarantia:
      "The down payment lands instantly at checkout. The financed share is released in the agreed tranches: Lazo guarantees each date onchain even if the buyer falls behind.",
    cobroSeis:
      "In {seis} installments the buyer pays the interest ({pct} total), not you: your merchant fee is exactly the same as in {tres} and only depends on the chosen payout schedule.",
    cobroCargando: "Loading terms and fees…",
    cobroErrorTitle: "Could not load terms",
    cobroErrorBody: "Protocol query failed. Retry.",
    cobroReintentar: "Retry",

    operarTitle: "How selling works day to day",
    operarMostradorTitle: "At the counter: QR order terminal",
    operarMostradorBody:
      "Enter the amount and description in your counter terminal to generate an on-screen QR. The student scans it with their phone camera, selects 3 or 6 installments, and confirms with their active guarantee. The sale updates in real time on your screen.",
    operarMostradorCta: "Open counter terminal",
    operarOnlineTitle: "Online: checkout links & store",
    operarOnlineBody:
      "Generate direct installment checkout links to share via WhatsApp, social media, or your web store. The customer opens the link, reviews the installments, and confirms in seconds.",
    operarOnlineCta: "Browse products in marketplace",
    operarPanelTitle: "Your dashboard: sales, payouts & tranches",
    operarPanelBody:
      "Track every sale with its receipt, immediately collected balance, and calendar of pending tranches with their release dates. You also set your default payout term.",
    operarPanelCta: "Go to merchant panel",

    comparacionTitle: "Financing cost for the buyer",
    comparacionIntro:
      "Lazo offers {tres} interest-free installments and {seis} installments with {pct} total interest. The competition publishes an annual CFTEA, which measures a different period; external figures are references, not live quotes.",
    comparacionLazo: "Total cost of a Lazo plan",
    comparacionLazoDetalle: "{tres} interest-free installments · {seis} installments at {pct} total",
    comparacionCfteaTitle: "Financing cost for cardless customers",
    comparacionCfteaDetalle:
      "Cardless installment credit: published CFTEA from {min}% to {max}% (reference).",
    comparacionNote:
      "Guidance comparison with reference figures: each alternative has distinct eligibility rules, terms, and tax treatments.",

    marketplaceTitle: "Show up where students shop",
    marketplaceBody:
      "The Lazo marketplace connects students and families with merchants offering backed installments. Customers discover stores by category and shop both in-store and online.",
    marketplaceExampleNote:
      "The directory lists example merchants and products to show the buying and selling flow.",
    marketplaceCta: "Explore merchants in marketplace",

    riesgosTitle: "Security, guarantees and clear rules",
    riesgoCompromisoTitle: "Onchain registered commitment",
    riesgoCompromisoBody:
      "When each sale is confirmed, a public account is registered on Solana with the exact tranche calendar for the merchant. Funds remain committed in the pool and release automatically on their due date: Lazo guarantees each tranche even if the buyer falls behind.",
    riesgoFiadorTitle: "Guarantor backing & risk absorption",
    riesgoFiadorBody:
      "The guarantor covers 100% of the outstanding balance (principal plus interest). The guarantor's liability is a contractual obligation; should the issuing card decline a charge upon default, Lazo absorbs that operational risk and your agreed merchant tranches are never affected.",
    riesgoLiquidezTitle: "Guaranteed liquidity before each purchase",
    riesgoLiquidezBody:
      "To ensure every commitment is honored, the protocol only permits purchases if the pool holds sufficient liquidity to cover the immediate advance and all future committed tranches.",

    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "When do I get paid for a sale?",
        a: "The down payment lands instantly at checkout. The financed share is released in equal monthly tranches based on your chosen term: 100% today, 1 tranche at 30 days, 2 tranches (at 30 and 60 days), or 3 tranches (at 30, 60, and 90 days). Each sale locks its tranches and dates onchain upon creation.",
      },
      {
        q: "What happens if the customer doesn't pay?",
        a: "A relative with a credit card backs 100% of the outstanding balance (principal and interest). Lazo manages collections and guarantees each merchant tranche on its committed onchain date, whether the student pays or not. Even if the guarantor's card declines the charge, the protocol absorbs the risk, not your store.",
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
        a: "If a cancellation occurs before deferred tranches are released, the order is cancelled and funds are returned. If tranches were already disbursed, the net amount is compensated through an agreed refund mechanism, always protecting the guarantor from improper charges.",
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
      "Try the counter terminal, explore the merchant dashboard, or discover how students find you in the marketplace.",
    devnetCallout:
      "This platform operates on Solana devnet (test network): devUSDC funds are for testing and do not represent real money.",
  },
});
