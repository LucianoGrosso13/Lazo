import { defineDict } from "../locale";

/**
 * Contenido de /para-inversores (ticket 11). Todo número de negocio llega al
 * componente desde `getConfig()`/helpers de `@/lib/cuotas` y se interpola acá;
 * las cifras de escenarios son hipótesis del modelo interno documentadas en
 * `proyecto/08-minorista-y-economia.md`, no métricas medidas.
 */
export const paraInversores = defineDict({
  es: {
    ctas: {
      pool: "Ver el pool en vivo",
      comercios: "Cómo funciona para comercios",
      estudiantes: "Para estudiantes y familias",
    },
    pool: {
      title: "De dónde sale el rendimiento",
      intro:
        "El pool junta capital en devUSDC, el token de prueba de la demo (corre en devnet, la red de prueba de Solana: la plata es de mentira). En cada venta adelanta al comercio la parte financiada menos su comisión, y la plata vuelve cuando el comprador paga las cuotas. El rendimiento bruto nace de esa comisión y del interés de los planes de 6 cuotas; después se descuentan administración, pérdidas y el costo del capital.",
      junior: "Tramo junior",
      juniorHint:
        "Absorbe la primera pérdida de cada crédito: más riesgo, más retorno esperado.",
      senior: "Tramo senior",
      seniorHint:
        "Se repone primero cuando vuelve la plata: menor riesgo, menor retorno esperado.",
      liveTitle: "El pool ahora",
      liveHint: "Lectura en vivo del estado de la demo, simulada en devnet.",
      liveLink: "Abrir el panel del pool",
      nav: "NAV — valor neto del pool",
      uso: "Utilización",
      credito: "Crédito vigente",
      disponible: "Disponible para adelantar",
      consulta: {
        pendienteTitle: "Lectura pendiente",
        pendienteBody:
          "La lectura del pool no está conectada en este modo. Los datos aparecen cuando el cliente compartido los publique.",
        errorTitle: "No se pudo leer el pool",
        errorBody: "Falló la consulta al cliente de cuotas. Revisá la conexión y reintentá.",
        reintentar: "Reintentar",
      },
    },
    compra: {
      title: "Una compra, paso a paso",
      intro: (precio: string, anticipoPct: string, cuotas: number) =>
        `Así se reparte una compra de ${precio} de un estudiante en escalón 0 con fiador (${anticipoPct} de anticipo, ${cuotas} cuotas, cobro inmediato del comercio):`,
      steps: {
        compra: {
          title: (precio: string, anticipo: string) =>
            `Compra de ${precio}: el estudiante paga ${anticipo} de anticipo`,
          body: "El anticipo va directo al comercio. El resto queda financiado con el respaldo del fiador.",
        },
        adelanto: {
          title: (adelanto: string, originacion: string) =>
            `El pool adelanta ${adelanto} al comercio y paga ${originacion} de originación a Lazo`,
          body: (salida: string) =>
            `Salida total del pool: ${salida}. El comercio ya cobró completo menos la comisión.`,
        },
        cuotas: {
          title: (cuotas: number, cuota: string, principal: string) =>
            `El comprador devuelve ${cuotas} cuotas de ${cuota}: entran ${principal} al pool`,
          body: "El principal repone el capital que salió. Las cuotas vencen cada 30 días.",
        },
        reparto: {
          title: (diferencia: string) => `La diferencia bruta queda en ${diferencia}`,
          body: (admin: string, resto: string) =>
            `Descontada la administración ilustrativa (~${admin}), el resto (~${resto}) todavía tiene que cubrir fondeo, pérdidas y demás costos antes de ser rendimiento.`,
        },
      },
      desgloseTitle: "Desglose D8: adónde va cada devUSDC",
      rows: {
        precio: "Precio de la compra",
        anticipo: "Anticipo — directo al comercio",
        financiado: "Capital financiado",
        comision: (pct: string) => `Comisión del comercio (${pct} del financiado)`,
        adelanto: "Adelanto del pool al comercio",
        originacion: (pct: string) =>
          `Originación para Lazo (${pct} del financiado, sale de la comisión)`,
        salida: "Salida total del pool",
        principal: "Principal que devuelve el comprador",
        diferencia: "Diferencia bruta del pool",
        admin: (pct: string) =>
          `Administración ilustrativa (${pct} anual sobre el saldo, la paga el pool)`,
        resto: "Resto del pool",
      },
      nota: "Reparto contable ilustrativo del modelo (D8). No es ganancia neta ni prueba de rentabilidad: al resto del pool hay que descontarle el costo del capital, las pérdidas por mora no recuperada y los demás costos.",
    },
    seis: {
      title: "Seis cuotas y cobro diferido",
      intro:
        "Dos opciones de la demo cambian cuánto capital queda comprometido y por cuánto tiempo.",
      planesTitle: "Seis cuotas: más plazo, con interés",
      planesBody: (interestPct: string, interest: string, total: string) =>
        `Con 6 cuotas el comprador paga un interés total del ${interestPct} sobre lo financiado — ${interest} en el ejemplo, ${total} en total — y el plan dura el doble: el capital del pool queda comprometido unos 6 meses en vez de unos 3. El interés entra una sola vez en los cobros; su reparto entre pool y Lazo está por definir.`,
      cobroTitle: "Cobro diferido: menos días de capital afuera",
      cobroBody:
        "El comercio elige cuándo cobra la parte financiada. Si acepta esperar paga menos comisión, porque el adelanto del pool sale en la fecha de cobro y el capital queda comprometido menos tiempo. Lazo garantiza la fecha elegida aunque el comprador se atrase: es una obligación con reserva, no una eliminación del riesgo.",
      cobroHoy: "hoy",
      cobroDias: (d: number) => `a ${d} días`,
      comisionCol: "comisión",
      netoCol: "neto del comercio",
      nota: "Estas opciones viven solo en el mock de la demo: el programa en la cadena sigue con 3 cuotas y cobro inmediato.",
    },
    riesgos: {
      title: "Riesgos, dicho claro",
      intro:
        "El fiador y el tramo junior absorben golpes, pero ninguno vuelve el crédito libre de riesgo.",
      mora: {
        title: "Mora",
        body: (grace: number, notice: number, charge: number, penalty: string) =>
          `Si una cuota vence hay ${grace} días de gracia (el día ${notice} se avisa al fiador), después corre un punitorio del ${penalty} sobre la cuota y al día ${charge} se cobra al fiador. Todo queda registrado: la mora, el cobro y el recupero.`,
      },
      cobertura: {
        title: "Cobertura no es recupero garantizado",
        body: "El fiador cubre el 100% del capital pendiente en todos los escalones, pero el cobro a su tarjeta puede fallar: rechazo del emisor o contracargo. Lo que no se recupera es una pérdida del pool y la absorbe primero el tramo junior.",
      },
      liquidez: {
        title: "Liquidez y plazo",
        body: "Con planes de 6 cuotas el capital queda comprometido el doble de tiempo que con 3. La liquidez del pool depende de que las cuotas vuelvan: una salida grande de capital puede no poder pagarse al instante.",
      },
      escenariosTitle: "Sensibilidad del modelo",
      escenariosIntro:
        "Contribución por compra de 1.000 en 3 cuotas con cobro inmediato, según el modelo interno del equipo. Las variables son probabilidad de default, recupero efectivo y costo anual del capital — hipótesis no medidas, no resultados:",
      escenarios: [
        { id: "favorable", name: "Favorable", d: 2, r: 95, h: 8, c: 21.31 },
        { id: "base", name: "Base", d: 8, r: 80, h: 12, c: 8.44 },
        { id: "adverso", name: "Adverso", d: 20, r: 50, h: 20, c: -42.51 },
      ] as { id: string; name: string; d: number; r: number; h: number; c: number }[],
      escenarioParams: (d: number, r: number, h: number) =>
        `default ${d}% · recupero ${r}% · capital ${h}%`,
      escenariosNote:
        "En el escenario adverso cada compra da negativo: ni la cobertura del 100% ni un ticket grande aseguran resultado positivo.",
      hipotesisTag: "hipótesis del modelo, sin medir",
    },
    rendimiento: {
      title: "Rendimiento: ilustrativo, no validado",
      intro:
        "Ninguna cifra de esta página es una promesa ni un rendimiento anual garantizado. Lo que comparte el equipo es un objetivo de modelo junto a referencias publicadas por otros protocolos DeFi:",
      lazo: "Objetivo del tramo senior según el modelo del equipo",
      ilustrativoTag: "ilustrativo, no validado",
      referenciaTag: "referencia",
      nota: "El rendimiento real depende de la mora, el recupero y el costo del capital. Las cifras de terceros son referencias sin verificar en la fuente oficial.",
    },
    transparencia: {
      title: "Todo se puede verificar",
      body: "Cada adelanto, pago, recupero y pérdida es un movimiento del pool con su comprobante en la cadena. En la demo corre en devnet y los comprobantes son simulados; el panel del pool muestra cada evento con su firma.",
      link: "Ver los movimientos del pool",
    },
    roadmap: {
      chip: "roadmap",
      title: "Tesorería propia en DeFi",
      body: "En el roadmap: poner a trabajar solo la tesorería propia de Lazo en protocolos DeFi — nunca el capital del pool ni el de terceros. Sería un módulo separado y simulado en devnet hasta verificar compatibilidad real; el rendimiento del crédito no depende de eso.",
    },
    faq: {
      title: "Preguntas frecuentes",
      items: [
        {
          q: "¿De dónde sale el rendimiento del pool?",
          a: "De la comisión que paga el comercio sobre lo financiado y del interés de los planes de 6 cuotas. A eso se le descuenta la administración, las pérdidas por mora no recuperada y el costo del capital: el desglose de arriba muestra la diferencia bruta, no una ganancia.",
        },
        {
          q: "¿Qué diferencia hay entre los tramos junior y senior?",
          a: "El junior absorbe la primera pérdida de cada crédito: asume más riesgo y espera más retorno. El senior se repone primero cuando vuelve la plata: menos riesgo y menor retorno esperado.",
        },
        {
          q: "Si el fiador cubre el 100%, ¿el pool no puede perder?",
          a: "Sí puede. La cobertura es una obligación contractual del fiador, pero el cobro a su tarjeta puede ser rechazado o revertido por contracargo. Lo que no se recupera se registra como pérdida del pool.",
        },
        {
          q: "¿Qué pasa cuando el estudiante no paga?",
          a: "Hay días de gracia, después un punitorio sobre la cuota y finalmente el cobro al fiador. El recupero entra al pool y queda registrado como movimiento verificable, igual que la pérdida si no se logra cobrar.",
        },
        {
          q: "¿Puedo verificar cada movimiento?",
          a: "Sí. Adelantos, pagos, recuperos y pérdidas son eventos del pool con su firma. En la demo son simulados en devnet, la red de prueba de Solana; el panel /pool los lista todos.",
        },
        {
          q: "¿Por qué no prometen un APY?",
          a: "Porque el modelo todavía no está validado con datos reales: prometer un número sería inventarlo. En su lugar se muestra el desglose contable de cada compra y referencias externas rotuladas como tales.",
        },
        {
          q: "¿El pool invierte en otros protocolos DeFi?",
          a: "No. Es una idea de roadmap y solo con la tesorería propia de Lazo, nunca con el capital del pool ni de terceros, y primero simulada en devnet.",
        },
      ],
    },
  },
  en: {
    ctas: {
      pool: "See the live pool",
      comercios: "How it works for merchants",
      estudiantes: "For students and families",
    },
    pool: {
      title: "Where the yield comes from",
      intro:
        "The pool pools capital in devUSDC, the demo's test token (it runs on devnet, Solana's test network: the money is fake). On every sale it advances the merchant the financed share minus its fee, and the money comes back as the buyer pays installments. Gross yield comes from that fee and from the interest on 6-installment plans; administration, losses and the cost of capital are then deducted.",
      junior: "Junior tranche",
      juniorHint:
        "Takes the first loss on every loan: more risk, higher expected return.",
      senior: "Senior tranche",
      seniorHint:
        "Repaid first as money comes back: less risk, lower expected return.",
      liveTitle: "The pool right now",
      liveHint: "Live read of the demo state, simulated on devnet.",
      liveLink: "Open the pool panel",
      nav: "NAV — pool net value",
      uso: "Utilization",
      credito: "Outstanding credit",
      disponible: "Available to advance",
      consulta: {
        pendienteTitle: "Read pending",
        pendienteBody:
          "Pool reads aren't wired in this mode yet. Data shows up once the shared client publishes it.",
        errorTitle: "Couldn't read the pool",
        errorBody: "The installments client query failed. Check your connection and retry.",
        reintentar: "Retry",
      },
    },
    compra: {
      title: "One purchase, step by step",
      intro: (precio: string, anticipoPct: string, cuotas: number) =>
        `This is how a ${precio} purchase by a tier-0 student with a guarantor is split (${anticipoPct} down payment, ${cuotas} installments, immediate merchant settlement):`,
      steps: {
        compra: {
          title: (precio: string, anticipo: string) =>
            `${precio} purchase: the student pays ${anticipo} up front`,
          body: "The down payment goes straight to the merchant. The rest is financed, backed by the guarantor.",
        },
        adelanto: {
          title: (adelanto: string, originacion: string) =>
            `The pool advances ${adelanto} to the merchant and pays ${originacion} of origination to Lazo`,
          body: (salida: string) =>
            `Total pool outflow: ${salida}. The merchant is already paid in full minus the fee.`,
        },
        cuotas: {
          title: (cuotas: number, cuota: string, principal: string) =>
            `The buyer repays ${cuotas} installments of ${cuota}: ${principal} flows back into the pool`,
          body: "Principal replenishes the capital that went out. Installments fall due every 30 days.",
        },
        reparto: {
          title: (diferencia: string) => `Gross spread lands at ${diferencia}`,
          body: (admin: string, resto: string) =>
            `After the illustrative administration fee (~${admin}), the remainder (~${resto}) still has to cover funding, losses and other costs before it is yield.`,
        },
      },
      desgloseTitle: "D8 breakdown: where each devUSDC goes",
      rows: {
        precio: "Purchase price",
        anticipo: "Down payment — straight to the merchant",
        financiado: "Financed capital",
        comision: (pct: string) => `Merchant fee (${pct} of the financed amount)`,
        adelanto: "Pool advance to the merchant",
        originacion: (pct: string) =>
          `Origination for Lazo (${pct} of the financed amount, paid out of the fee)`,
        salida: "Total pool outflow",
        principal: "Principal repaid by the buyer",
        diferencia: "Pool gross spread",
        admin: (pct: string) =>
          `Illustrative administration (${pct} per year on balance, paid by the pool)`,
        resto: "Pool remainder",
      },
      nota: "Illustrative accounting split from the model (D8). It is not net profit nor proof of returns: the pool remainder still has to cover the cost of capital, losses from unrecovered delinquency and other costs.",
    },
    seis: {
      title: "Six installments and deferred settlement",
      intro:
        "Two demo options change how much capital stays committed, and for how long.",
      planesTitle: "Six installments: longer, with interest",
      planesBody: (interestPct: string, interest: string, total: string) =>
        `With 6 installments the buyer pays a total interest of ${interestPct} on the financed amount — ${interest} in the example, ${total} in total — and the plan lasts twice as long: pool capital stays committed for about 6 months instead of about 3. The interest enters the repayment flows once; its split between pool and Lazo is still to be defined.`,
      cobroTitle: "Deferred settlement: fewer days of capital out",
      cobroBody:
        "The merchant chooses when to collect the financed share. If it accepts waiting it pays a lower fee, because the pool advance goes out on the settlement date and capital stays committed for less time. Lazo guarantees the chosen date even if the buyer falls behind: it is an obligation backed by reserves, not a removal of risk.",
      cobroHoy: "today",
      cobroDias: (d: number) => `in ${d} days`,
      comisionCol: "fee",
      netoCol: "merchant net",
      nota: "These options only exist in the demo mock: the on-chain program still runs 3 installments and immediate settlement.",
    },
    riesgos: {
      title: "Risks, stated plainly",
      intro:
        "The guarantor and the junior tranche absorb blows, but neither makes the loan risk-free.",
      mora: {
        title: "Delinquency",
        body: (grace: number, notice: number, charge: number, penalty: string) =>
          `When an installment falls due there is a ${grace}-day grace period (the guarantor is notified on day ${notice}), then a ${penalty} penalty on the installment, and on day ${charge} the guarantor is charged. Everything is recorded: the delinquency, the charge and the recovery.`,
      },
      cobertura: {
        title: "Coverage is not guaranteed recovery",
        body: "The guarantor covers 100% of the outstanding capital at every tier, but the charge to their card can fail: issuer decline or chargeback. Whatever is not recovered is a pool loss, absorbed first by the junior tranche.",
      },
      liquidez: {
        title: "Liquidity and tenor",
        body: "With 6-installment plans capital stays committed twice as long as with 3. Pool liquidity depends on installments coming back: a large capital outflow may not be payable instantly.",
      },
      escenariosTitle: "Model sensitivity",
      escenariosIntro:
        "Contribution per 1,000 purchase in 3 installments with immediate settlement, per the team's internal model. The variables are default probability, effective recovery and annual cost of capital — unmeasured hypotheses, not results:",
      escenarios: [
        { id: "favorable", name: "Favorable", d: 2, r: 95, h: 8, c: 21.31 },
        { id: "base", name: "Base", d: 8, r: 80, h: 12, c: 8.44 },
        { id: "adverse", name: "Adverse", d: 20, r: 50, h: 20, c: -42.51 },
      ] as { id: string; name: string; d: number; r: number; h: number; c: number }[],
      escenarioParams: (d: number, r: number, h: number) =>
        `default ${d}% · recovery ${r}% · capital ${h}%`,
      escenariosNote:
        "In the adverse scenario each purchase is negative: neither 100% coverage nor a large ticket guarantees a positive outcome.",
      hipotesisTag: "model hypothesis, unmeasured",
    },
    rendimiento: {
      title: "Yield: illustrative, not validated",
      intro:
        "No figure on this page is a promise or a guaranteed annual yield. What the team shares is a model target next to references published by other DeFi protocols:",
      lazo: "Senior tranche target per the team's model",
      ilustrativoTag: "illustrative, not validated",
      referenciaTag: "reference",
      nota: "Real yield depends on delinquency, recovery and the cost of capital. Third-party figures are references unverified at the source.",
    },
    transparencia: {
      title: "Everything is verifiable",
      body: "Every advance, payment, recovery and loss is a pool movement with its on-chain receipt. The demo runs on devnet and the receipts are simulated; the pool panel lists every event with its signature.",
      link: "See the pool movements",
    },
    roadmap: {
      chip: "roadmap",
      title: "Own treasury in DeFi",
      body: "On the roadmap: putting only Lazo's own treasury to work in DeFi protocols — never pool capital or third-party funds. It would be a separate module, simulated on devnet until real compatibility is verified; loan yield does not depend on it.",
    },
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          q: "Where does the pool's yield come from?",
          a: "From the fee the merchant pays on the financed amount and from the interest on 6-installment plans. Administration, unrecovered delinquency losses and the cost of capital are deducted from that: the breakdown above shows the gross spread, not a profit.",
        },
        {
          q: "What's the difference between the junior and senior tranches?",
          a: "The junior takes the first loss on every loan: it takes on more risk and expects a higher return. The senior is repaid first as money comes back: less risk and a lower expected return.",
        },
        {
          q: "If the guarantor covers 100%, can the pool still lose?",
          a: "Yes. Coverage is a contractual obligation of the guarantor, but the charge to their card can be declined or reversed by a chargeback. Whatever is not recovered is recorded as a pool loss.",
        },
        {
          q: "What happens when the student doesn't pay?",
          a: "There is a grace period, then a penalty on the installment, and finally a charge to the guarantor. The recovery flows into the pool and is recorded as a verifiable movement, just like the loss if it can't be collected.",
        },
        {
          q: "Can I verify every movement?",
          a: "Yes. Advances, payments, recoveries and losses are pool events with a signature. In the demo they are simulated on devnet, Solana's test network; the /pool panel lists them all.",
        },
        {
          q: "Why don't you promise an APY?",
          a: "Because the model hasn't been validated with real data yet: promising a number would be making it up. Instead we show the accounting split of each purchase and external references labeled as such.",
        },
        {
          q: "Does the pool invest in other DeFi protocols?",
          a: "No. It's a roadmap idea and only with Lazo's own treasury, never with pool capital or third-party funds, and simulated on devnet first.",
        },
      ],
    },
  },
});
