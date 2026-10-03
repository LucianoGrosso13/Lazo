// Cifras de terceros para comparar en la UI (fuentes secundarias, ver
// `proyecto/02-validacion.md` y `proyecto/research/`). Regla del spec:
// mostrarlas siempre con la etiqueta "referencia".
export const REFERENCE_FIGURES = {
  /** Etiqueta obligatoria al mostrar estas cifras en pantalla. */
  note: "referencia, sin verificar en la fuente oficial",
  /** Lo que pagaría en total una PC de US$1.000 en 3 cuotas de Mercado Pago (ARS). */
  mercadoPagoPc1000TotalArs: 1290,
  /** Recargo equivalente de ese total sobre el precio de lista (+29%). */
  mercadoPagoPc1000SurchargePct: 29,
  /** CFTEA publicado de MP "Cuotas sin Tarjeta". */
  mercadoPagoCfteaPct: { min: 61, max: 388 },
  /** Comisión al comercio de Cuota Simple (solo pymes, CAME ene-2026). */
  cuotaSimpleMerchantPct: 5.41,
  /** Comisión al comercio de Mercado Pago / Mercado Libre (~abr-2026). */
  mercadoPagoMerchantPct: 12.49,
  /** Días hábiles que tarda GOcuotas en pagarle al comercio. */
  gocuotasSettlementBusinessDays: 22,
  /** Rendimiento USDC de referencia en Solana. */
  kaminoYieldPct: 6,
  jupiterYieldPct: 5,
  /** Objetivo de rendimiento del tramo senior de Lazo. */
  lazoSeniorTargetYieldPct: 8,
} as const;
