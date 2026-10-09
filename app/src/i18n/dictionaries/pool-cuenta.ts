import { defineDict } from "../locale";

// Panel público del pool (/pool). Sin wallet. Todo movimiento del mock se
// declara simulado; los links a Explorer solo aparecen en modo real.
export const poolCuenta = defineDict({
  es: {
    titulo: "Pool",
    subtitulo:
      "El capital que adelanta las cuotas. Cada adelanto, pago, recupero y pérdida queda acá, verificable.",
    navLabel: "NAV del pool",
    navHint: "Valor neto: capital depositado menos pérdidas, más comisiones devengadas.",
    capitalTotal: "Capital total",
    tramoJunior: "Tramo junior",
    tramoJuniorHint: "Absorbe la primera pérdida; con más riesgo y más retorno.",
    tramoSenior: "Tramo senior",
    tramoSeniorHint: "Se cobra primero; menor riesgo y menor retorno.",
    junior: "junior",
    senior: "senior",
    utilizacion: "Utilización",
    creditoVigente: "Crédito vigente",
    disponible: "Liquidez disponible",
    comisiones: "Comisiones devengadas",
    comisionesHint: "Las paga el comercio sobre lo financiado; es el rendimiento bruto del pool.",
    movimientosTitle: "Movimientos",
    movimientosVacio:
      "Sin movimientos todavía. Los depósitos, adelantos, pagos y recuperos aparecen acá.",
    evento: {
      Deposit: "Depósito",
      Advance: "Adelanto al comercio",
      Repayment: "Pago de cuota",
      Recovery: "Recupero por garante",
      Loss: "Pérdida",
    },
    plan: "plan",
    comprobanteSimulado: "comprobante simulado",
    verEnExplorer: "Ver en Explorer",
    reciboHash: "recibo",
    refsTitle: "Rendimiento — referencias",
    refsObjetivo: "Objetivo del tramo senior según el modelo del equipo",
    refsBody:
      "Cifras de mercado publicadas por el equipo como referencia, sin verificar en la fuente. El rendimiento real depende de la mora y el recupero: nada acá es una promesa ni una cotización vigente.",
    refKamino: "Kamino",
    refJupiter: "Jupiter Lend",
    referenciaTag: "referencia",
    garantiaLinea:
      "Cada adelanto está respaldado por un garante con tarjeta: si el comprador no paga, se cobra al garante y el recupero se registra acá.",
    leerTitle: "Lectura pendiente",
    leerBody:
      "La lectura del pool todavía no está conectada en este modo. Los datos aparecen acá cuando el cliente compartido los publique.",
    reintentar: "Reintentar",
    errorTitle: "No se pudo leer el pool",
    errorBody: "Falló la consulta al cliente de cuotas. Revisá la conexión y reintentá.",
    datosSimulados: "Datos simulados",
    datosSimuladosHint:
      "Modo demo: los movimientos y saldos son de prueba, sin comprobantes onchain.",
  },
  en: {
    titulo: "Pool",
    subtitulo:
      "The capital that advances the installments. Every advance, payment, recovery and loss lands here, verifiable.",
    navLabel: "Pool NAV",
    navHint: "Net value: deposited capital minus losses, plus accrued fees.",
    capitalTotal: "Total capital",
    tramoJunior: "Junior tranche",
    tramoJuniorHint: "Takes the first loss; higher risk and higher return.",
    tramoSenior: "Senior tranche",
    tramoSeniorHint: "Gets repaid first; lower risk and lower return.",
    junior: "junior",
    senior: "senior",
    utilizacion: "Utilization",
    creditoVigente: "Outstanding credit",
    disponible: "Available liquidity",
    comisiones: "Accrued fees",
    comisionesHint: "Paid by the merchant on the financed amount; the pool's gross yield.",
    movimientosTitle: "Movements",
    movimientosVacio:
      "No movements yet. Deposits, advances, payments and recoveries show up here.",
    evento: {
      Deposit: "Deposit",
      Advance: "Advance to merchant",
      Repayment: "Installment payment",
      Recovery: "Guarantor recovery",
      Loss: "Loss",
    },
    plan: "plan",
    comprobanteSimulado: "simulated receipt",
    verEnExplorer: "View on Explorer",
    reciboHash: "receipt",
    refsTitle: "Yield — references",
    refsObjetivo: "Senior tranche target per the team's model",
    refsBody:
      "Market figures published by the team as reference, unverified at the source. Real yield depends on delinquency and recovery: nothing here is a promise or a live quote.",
    refKamino: "Kamino",
    refJupiter: "Jupiter Lend",
    referenciaTag: "reference",
    garantiaLinea:
      "Every advance is backed by a card-bearing guarantor: if the buyer doesn't pay, the guarantor is charged and the recovery is recorded here.",
    leerTitle: "Read pending",
    leerBody:
      "Pool reads aren't wired in this mode yet. Data shows up here once the shared client publishes it.",
    reintentar: "Retry",
    errorTitle: "Couldn't read the pool",
    errorBody: "The installments client query failed. Check your connection and retry.",
    datosSimulados: "Simulated data",
    datosSimuladosHint:
      "Demo mode: movements and balances are test data, with no on-chain receipts.",
  },
});
