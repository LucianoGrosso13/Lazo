import { defineDict } from "../locale";
import { tierLabel } from "./tiers";

export const landingSections = defineDict({
  es: {
    audiences: {
      title: "Para quién es",
      lede: "Tres actores, tres recorridos. Mirá cómo funciona Lazo de punta a punta.",
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
          blurb: "El pool adelanta lo financiado de cada venta y cada movimiento queda registrado en la cadena.",
          cta: "Cómo funciona para el pool",
        },
      },
    },
    installments: {
      title: "Elegí en cuántas cuotas",
      lede: "Dos planes: 3 cuotas sin interés o 6 con interés. El interés total se calcula sobre lo financiado, no sobre el precio, y lo ves antes de confirmar.",
      unit: (n: number) => (n === 1 ? "cuota" : "cuotas"),
      interestFree: "Sin interés",
      interestTotal: (pct: string) => `${pct}% de interés total`,
      minPriceNote: (min: string) => `Desde US$ ${min}`,
      example: (price: string, tierName: string) => `Ejemplo: compra de US$ ${price} en ${tierName}, cotizada por el protocolo`,
      down: "Anticipo",
      installments: "Cuotas",
      each: (n: number, amount: string) => `${n} × US$ ${amount}`,
      interest: "Interés",
      total: "Total que pagás",
      footnote: "El anticipo se abona al abrir el plan; las cuotas restantes son mensuales y fijas.",
    },
    tiers: {
      title: "Tiers y reglas de crecimiento",
      lede: "Comenzás en Tier 1 · Starter. Al saldar tus compras a tiempo, tu anticipo baja y tu tope de compra sube. La cobertura del fiador siempre se mantiene en el 100% de lo que falta pagar.",
      tier: (i: number) => tierLabel(i),
      down: "anticipo",
      cap: "tope",
      coverage: "cobertura del fiador",
      coverageValue: (pct: string) => `${pct} de lo que falta pagar`,
      start: "Arrancás acá",
      top: "Sin anticipo",
      example: (price: string, down: string) => `Una PC de US$ ${price}: anticipo de US$ ${down}`,
      rulesTitle: "Reglas para subir y bajar de Tier",
      rulesSubtitle: "Definidas en la configuración del protocolo para premiar el pago a tiempo.",
      ruleUp: {
        title: "Subís 1 Tier",
        desc: (min: string, grace: number) => `Al saldar un plan con monto financiado ≥ US$ ${min} sin pagos después de la gracia (${grace} días).`,
      },
      ruleNeutral: {
        title: "No suma ni baja",
        desc: (grace: number, charge: number) => `Si pagás después de los ${grace} días de gracia pero antes del día ${charge}.`,
      },
      ruleDown: {
        title: "Bajás 1 Tier",
        desc: (charge: number) => `Si no pagás y se ejecuta el cobro al fiador en el día ${charge}.`,
      },
      ruleGuarantor: {
        title: "Sin fiador no hay plan",
        desc: "El respaldo del fiador con tarjeta de crédito es obligatorio en todos los tiers.",
      },
    },
    guarantor: {
      title: "Un familiar respalda el plan",
      lede: (chargeDay: number) =>
        `Cubre el 100% de lo que falta pagar (capital e interés) en todos los tiers y solo paga ante impago. Registra una tarjeta: si una cuota se atrasa, primero recibe un aviso preventivo; recién al día ${chargeDay} se ejecuta el cobro.`,
      steps: [
        { t: "Recibe una invitación", d: "El estudiante invita a un familiar y este valida su identidad." },
        { t: "Define un tope", d: "Acuerda el monto máximo de compra a respaldar antes de aceptar." },
        { t: "Solo paga si hay mora", d: "Si el estudiante paga sus cuotas a tiempo, la tarjeta del fiador nunca recibe ningún cargo." },
      ],
      rulerTitle: "Qué pasa si una cuota no se paga",
      rulerSubtitle: "Línea de mora paso a paso: qué ocurre y quién se entera en cada hito.",
      day: (n: number) => `Día ${n}`,
      legendTitle: "Leyenda de la línea de mora",
      marks: {
        day0: {
          label: "Día 0 · Compra",
          what: "Arranca el plan. El estudiante abona el anticipo y el comercio recibe la confirmación.",
          who: "Se enteran el estudiante, el comercio y el fiador.",
        },
        due: {
          label: "Vencimiento (día 0 de mora)",
          what: "Vence la cuota mensual pendiente.",
          who: "Se notifica al estudiante sobre el pago pendiente.",
        },
        grace: {
          label: (days: number) => `Días 1–${days} · Gracia sin recargo`,
          what: "Período de gracia sin punitorio ni costo extra.",
          who: "El estudiante puede pagar sin consecuencias; no se contacta al fiador.",
        },
        notice: {
          label: (day: number) => `Día ${day} · Aviso al fiador`,
          what: "Notificación preventiva al fiador antes de cualquier cargo.",
          who: "Se entera el fiador para coordinar con el estudiante.",
        },
        penalty: {
          label: (fromDay: number, pct: string) => `Día ${fromDay} · Recargo del ${pct}`,
          what: (pct: string) => `Se aplica un recargo punitorio del ${pct} sobre la cuota vencida.`,
          who: "Se notifica al estudiante del recargo aplicado.",
        },
        charge: {
          label: (day: number) => `Día ${day} · Cobro al fiador y −1 Tier`,
          what: "Se ejecuta el cobro automático a la tarjeta del fiador y el estudiante desciende 1 Tier.",
          who: "Se enteran el fiador y el estudiante.",
        },
      },
    },
    merchants: {
      title: "Comercios de ejemplo",
      lede: "Comercios de ejemplo que aceptan Lazo. Buscá el tuyo por nombre o categoría en el marketplace.",
      tag: "de ejemplo",
      products: (n: number) => `${n} productos`,
      seeAll: "Ver todos los comercios",
      footnote: "Comercios de ejemplo en el marketplace para recorrer la experiencia de compra.",
    },
    comparison: {
      title: "Comparación de costo total",
      lede: (price: string, down: string, financed: string) => `Para una compra de US$ ${price} en Tier 1 · Starter (anticipo de US$ ${down}, saldo a financiar de US$ ${financed}):`,
      reference: "referencia",
      lazo3: {
        who: "Lazo · 3 cuotas sin interés",
        interest: (pct: string, amount: string) => `${pct}% de interés total (US$ ${amount})`,
        terms: (down: string, n: number, amount: string) => `Anticipo de US$ ${down} + ${n} cuotas fijas de US$ ${amount}`,
      },
      lazo6: {
        who: "Lazo · 6 cuotas con interés",
        interest: (pct: string, amount: string) => `${pct}% total sobre financiado (US$ ${amount})`,
        terms: (down: string, n: number, amount: string) => `Anticipo de US$ ${down} + ${n} cuotas fijas de US$ ${amount}`,
      },
      competition: {
        who: "La competencia · cuotas sin tarjeta",
        rangeLabel: (min: number, max: number) => `CFTEA ${min}% – ${max}%`,
        terms: "Préstamos al consumo sin tarjeta de crédito bancaria",
        detail: "Rango publicado para financiación al consumo sin tarjeta bancaria.",
      },
      sourceNote: "Fuente: tasas publicadas para financiación al consumo sin tarjeta bancaria, agosto de 2026. La CFTEA expresa el costo financiero total anual. Cifra de referencia.",
    },
    benefits: {
      title: "Los números de Lazo",
      lede: "Estructura de costos e incentivos para cada participante.",
      reference: "referencia",
      merchant: {
        who: "Comercio",
        label: "según el plazo de cobro elegido",
      detail: "Comisión sobre el saldo financiado; Lazo garantiza cada tramo en su fecha.",
        vs: (ct: string, w: string) => `Financiación de mostrador ~${ct}% · billeteras ~${w}%`,
      },
      pool: {
        who: "Pool de liquidez",
        label: "rendimiento objetivo del tramo senior",
        target: (pct: number) => `~${pct}% anual`,
        detail: "Rendimiento objetivo para el tramo senior, respaldado por el flujo de cuotas y la fianza.",
        vs: (k: number, j: number) => `Benchmarks DeFi: Kamino ~${k}% · Jupiter ~${j}%`,
      },
      assumptionsTitle: "Supuestos del modelo económico",
      assumptionsSubtitle: "Hipótesis de trabajo utilizadas para evaluar la viabilidad del protocolo, no métricas medidas.",
      assumptions: {
        downPayment: {
          label: "Anticipo promedio",
          value: (pct: number) => `${pct}%`,
          desc: "Anticipo inicial estimado en el modelo de compra.",
        },
        defaultRate: {
          label: "Tasa de mora esperada",
          value: (pct: number) => `${pct}%`,
          desc: "Porcentaje estimado de planes que incurren en mora.",
        },
        recoveryRate: {
          label: "Tasa de recupero vía fiador",
          value: (pct: number) => `${pct}%`,
          desc: "Efectividad proyectada de cobro automático a la tarjeta del fiador.",
        },
        capitalCost: {
          label: "Costo de capital senior",
          value: (pct: number) => `${pct}% anual`,
          desc: "Costo financiero anual estimado para fondear el tramo senior.",
        },
      },
    },
    roadmap: {
      title: "Qué viene",
      lede: "Hoja de ruta: propuestas en análisis de viabilidad, no acuerdos firmados.",
      tag: "en estudio",
      items: [
        {
          t: "Billeteras argentinas como canal",
          d: "Evaluamos alianzas con billeteras locales para distribuir Lazo como medio de pago en cuotas y facilitar la conversión entre pesos y dólares digitales. Canal en estudio, sin acuerdos vigentes.",
        },
        {
          t: "Tesorería propia en DeFi, simulada",
          d: "Estrategias de colocación de capital propio de Lazo — nunca los fondos del pool de usuarios — en protocolos descentralizados, en entorno simulado.",
        },
      ],
    },
    honest: {
      title: "Qué corre en la cadena y qué en el simulador",
      realTitle: "Programa para Solana devnet",
      real: [
        "Código Anchor probado localmente con planes de 3 y 6 cuotas",
        "Fiador obligatorio con cobertura del 100% de capital e interés",
        "Pool de liquidez con tramo senior y cuentas verificables",
        "Calendario de tramos del comercio (PayoutSchedule) y control de liquidez del pool",
        "La actualización del programa en devnet está pendiente; la web pública usa el simulador",
      ],
      simTitle: "En el simulador",
      sim: [
        "Reloj acelerado para avanzar los días y seguir el estado de mora",
        "Cobro simulado a la tarjeta del fiador ante impago",
        "Verificación de identidad digital simulada",
        "Venta en mostrador por QR y enlace",
        "Comercios y catálogo de productos de ejemplo",
      ],
    },
    close: {
      title: "Probá Lazo con una compra de ejemplo",
      cta: "Explorar los comercios",
      foot: "Solana devnet · Red de prueba: los fondos no tienen valor monetario.",

    },
    reference: "referencia",
  },
  en: {
    audiences: {
      title: "Who it's for",
      lede: "Three actors, three walkthroughs. See how Lazo works end to end.",
      cards: {
        estudiantes: {
          blurb: "Buy in installments with no credit card: a family member backs you and your down payment drops with your track record.",
          cta: "How it works for you",
        },
        comercios: {
          blurb: "Sell in installments even without a customer credit card: choose when to get paid and control your fees.",
          cta: "How it works for your store",
        },
        inversores: {
          blurb: "The pool advances the financed portion of each sale and every movement is verifiable onchain.",
          cta: "How it works for the pool",
        },
      },
    },
    installments: {
      title: "Choose how many installments",
      lede: "Two clear plans: 3 interest-free installments or 6 with interest. Total interest is computed on the financed balance, not on the total price, and you see it before you confirm.",
      unit: (n: number) => (n === 1 ? "installment" : "installments"),
      interestFree: "Interest-free",
      interestTotal: (pct: string) => `${pct}% total interest`,
      minPriceNote: (min: string) => `From US$ ${min}`,
      example: (price: string, tierName: string) => `Example: US$ ${price} purchase on ${tierName}, quoted by the protocol`,
      down: "Down payment",
      installments: "Installments",
      each: (n: number, amount: string) => `${n} × US$ ${amount}`,
      interest: "Interest",
      total: "Total you pay",
      footnote: "The down payment is paid upon opening the plan; remaining installments are monthly and fixed.",
    },
    tiers: {
      title: "Tiers and progression rules",
      lede: "You start at Tier 1 · Starter. By completing your plans on time, your down payment drops and your purchase limit rises. Guarantor coverage always remains 100% of the outstanding balance.",
      tier: (i: number) => tierLabel(i),
      down: "down payment",
      cap: "limit",
      coverage: "guarantor coverage",
      coverageValue: (pct: string) => `${pct} of outstanding balance`,
      start: "You start here",
      top: "Zero down payment",
      example: (price: string, down: string) => `A US$ ${price} PC: US$ ${down} down payment`,
      rulesTitle: "Rules to move up and down tiers",
      rulesSubtitle: "Set in protocol configuration to reward on-time payments.",
      ruleUp: {
        title: "Move up 1 Tier",
        desc: (min: string, grace: number) => `By paying off a plan with financed amount ≥ US$ ${min} with no payments after the grace period (${grace} days).`,
      },
      ruleNeutral: {
        title: "No change",
        desc: (grace: number, charge: number) => `If you pay after the ${grace}-day grace period but before day ${charge}.`,
      },
      ruleDown: {
        title: "Drop 1 Tier",
        desc: (charge: number) => `If you default and the guarantor is charged on day ${charge}.`,
      },
      ruleGuarantor: {
        title: "No guarantor, no plan",
        desc: "A guarantor backed by a credit card is mandatory across all tiers.",
      },
    },
    guarantor: {
      title: "A family member backs the plan",
      lede: (chargeDay: number) =>
        `Covers 100% of the outstanding balance (capital and interest) across all tiers and only pays on default. They register a credit card: if an installment is late, they receive a warning first; charges execute on day ${chargeDay}.`,
      steps: [
        { t: "Receives an invite", d: "The student invites a family member who validates their identity." },
        { t: "Sets a limit", d: "Agrees on the maximum purchase amount to back before confirming." },
        { t: "Only pays on default", d: "If the student pays on time, the guarantor's card is never charged." },
      ],
      rulerTitle: "What happens if an installment goes unpaid",
      rulerSubtitle: "Late-payment timeline step by step: what happens and who gets notified at each milestone.",
      day: (n: number) => `Day ${n}`,
      legendTitle: "Late-payment timeline legend",
      marks: {
        day0: {
          label: "Day 0 · Purchase",
          what: "The plan starts. The student pays the down payment and the merchant receives confirmation.",
          who: "The student, merchant, and guarantor are notified.",
        },
        due: {
          label: "Due date (day 0 of delinquency)",
          what: "The monthly installment falls due.",
          who: "The student is notified of the pending payment.",
        },
        grace: {
          label: (days: number) => `Days 1–${days} · Grace period, no fee`,
          what: "Grace period with no late fee or penalty.",
          who: "The student can pay with no penalty; guarantor is not contacted.",
        },
        notice: {
          label: (day: number) => `Day ${day} · Guarantor is warned`,
          what: "Preventive notice sent to the guarantor prior to any charge.",
          who: "Guarantor is notified to coordinate with the student.",
        },
        penalty: {
          label: (fromDay: number, pct: string) => `Day ${fromDay} · ${pct} late fee`,
          what: (pct: string) => `A late fee of ${pct} applies to the overdue installment.`,
          who: "The student is notified of the applied fee.",
        },
        charge: {
          label: (day: number) => `Day ${day} · Guarantor charged & drop 1 Tier`,
          what: "An automatic charge executes against the guarantor's card and the student drops 1 Tier.",
          who: "Both guarantor and student are notified.",
        },
      },
    },
    merchants: {
      title: "Example stores",
      lede: "Example stores accepting Lazo. Browse by name or category in the marketplace.",
      tag: "example",
      products: (n: number) => `${n} products`,
      seeAll: "See all stores",
      footnote: "Example stores in the marketplace to experience the purchase flow.",
    },
    comparison: {
      title: "Total cost comparison",
      lede: (price: string, down: string, financed: string) => `For a US$ ${price} purchase on Tier 1 · Starter (US$ ${down} down, US$ ${financed} financed):`,
      reference: "reference",
      lazo3: {
        who: "Lazo · 3 interest-free installments",
        interest: (pct: string, amount: string) => `${pct}% total interest (US$ ${amount})`,
        terms: (down: string, n: number, amount: string) => `US$ ${down} down payment + ${n} fixed monthly installments of US$ ${amount}`,
      },
      lazo6: {
        who: "Lazo · 6 installments with interest",
        interest: (pct: string, amount: string) => `${pct}% total on financed balance (US$ ${amount})`,
        terms: (down: string, n: number, amount: string) => `US$ ${down} down payment + ${n} fixed monthly installments of US$ ${amount}`,
      },
      competition: {
        who: "The competition · no-card installments",
        rangeLabel: (min: number, max: number) => `CFTEA ${min}% – ${max}%`,
        terms: "Consumer installment loans without a bank credit card",
        detail: "Published range for consumer financing without a bank credit card.",
      },
      sourceNote: "Source: published rates for consumer financing without a bank credit card, August 2026. CFTEA expresses total annual financial cost. Reference figure.",
    },
    benefits: {
      title: "Lazo economics",
      lede: "Cost structure and incentives for every participant.",
      reference: "reference",
      merchant: {
        who: "Merchant",
        label: "depending on the chosen settlement term",
      detail: "Fee on the financed balance; Lazo guarantees each tranche on its due date.",
        vs: (ct: string, w: string) => `Counter financing ~${ct}% · wallets ~${w}%`,
      },
      pool: {
        who: "Liquidity pool",
        label: "senior tranche target yield",
        target: (pct: number) => `~${pct}% APY`,
        detail: "Target yield for senior tranche investors, backed by installment cash flows and credit guarantees.",
        vs: (k: number, j: number) => `DeFi benchmarks: Kamino ~${k}% · Jupiter ~${j}%`,
      },
      assumptionsTitle: "Economic model assumptions",
      assumptionsSubtitle: "Working hypotheses used to evaluate protocol viability, not measured historical metrics.",
      assumptions: {
        downPayment: {
          label: "Average down payment",
          value: (pct: number) => `${pct}%`,
          desc: "Estimated initial down payment in the purchase model.",
        },
        defaultRate: {
          label: "Expected default rate",
          value: (pct: number) => `${pct}%`,
          desc: "Estimated percentage of plans experiencing default.",
        },
        recoveryRate: {
          label: "Recovery rate via guarantor",
          value: (pct: number) => `${pct}%`,
          desc: "Projected recovery through automatic card charges.",
        },
        capitalCost: {
          label: "Senior capital cost",
          value: (pct: number) => `${pct}% APR`,
          desc: "Estimated annual financing cost to fund senior liquidity.",
        },
      },
    },
    roadmap: {
      title: "What's next",
      lede: "Roadmap: proposals under feasibility review, not signed partnerships.",
      tag: "under study",
      items: [
        {
          t: "Argentine wallets as a distribution channel",
          d: "We evaluate alliances with local wallets to distribute Lazo as an installment payment method and facilitate conversion between pesos and digital dollars. Channel under study, no active agreements.",
        },
        {
          t: "Own treasury in DeFi, simulated",
          d: "Allocation strategies for Lazo's own treasury — never user pool funds — into decentralized protocols, in a simulated environment.",
        },
      ],
    },
    honest: {
      title: "What runs onchain and what runs in the simulator",
      realTitle: "Program for Solana devnet",
      real: [
        "Locally tested Anchor source with 3 and 6 installment plans",
        "Mandatory guarantor covering 100% of capital and interest",
        "Liquidity pool with senior tranche and verifiable accounts",
        "Merchant payout schedule (PayoutSchedule) and pool liquidity check",
        "The devnet program upgrade is pending; the public web uses the simulator",
      ],
      simTitle: "In the simulator",
      sim: [
        "Accelerated clock to follow delinquency days",
        "Simulated charges to the guarantor's card upon default",
        "Digital identity verification (simulated KYC)",
        "Counter sales via QR and link",
        "Example stores and product catalog",
      ],
    },
    close: {
      title: "Try Lazo with a sample purchase",
      cta: "Explore the merchants",
      foot: "Solana devnet · Test network: funds have no monetary value.",

    },
    reference: "reference",
  },
});
