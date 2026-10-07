// Cifras de terceros para comparar en la UI (fuentes secundarias, ver
// `proyecto/02-validacion.md`, `proyecto/06-viabilidad/` y `proyecto/research/`).
// Regla del spec: mostrarlas siempre con la etiqueta "referencia".
// Actualizado 6-oct-2026 con la investigación de viabilidad.
export const REFERENCE_FIGURES = {
  /** Etiqueta obligatoria al mostrar estas cifras en pantalla. */
  note: "referencia, sin verificar en la fuente oficial",
  /** Ejemplo calculado en research/a (caso de prensa nov-2025, CFTEA 367%), no es cifra oficial; la UI compara con el rango de CFTEA. Lo que pagaría en total una PC de US$1.000 en 3 cuotas sin tarjeta de la competencia (ARS). */
  mercadoPagoPc1000TotalArs: 1290,
  /** Ejemplo calculado en research/a (caso de prensa nov-2025, CFTEA 367%), no es cifra oficial; la UI compara con el rango de CFTEA. Recargo equivalente de ese total sobre el precio de lista (+29%). */
  mercadoPagoPc1000SurchargePct: 29,
  /** CFTEA publicado por la competencia para cuotas sin tarjeta (ago-2026: TNA 48-249%, CFTEA 76,36-1.375,94%). */
  mercadoPagoCfteaPct: { min: 76, max: 1376 },
  /** Comisión al comercio del programa público de cuotas: Cuotas MiPyME (Payway+CAME, 5,93%+IVA ≈ 6,9% a 3 cuotas, cobro a 10 días hábiles, solo MiPyMEs certificadas; ene-2026). Sucesora del extinto Cuota Simple (5,41%, finalizó jun-2025). */
  cuotaMipymeMerchantPct: 6.91,
  /** Comisión al comercio de la billetera/marketplace dominante por 3 cuotas sin interés (~abr-2026). */
  mercadoPagoMerchantPct: 12.49,
  /** Días hábiles que tarda en pagarle al comercio un competidor de cuotas (mínimo publicitado; condiciones reales reportadas 28-65 según plazo, oct-2026). */
  gocuotasSettlementBusinessDays: 22,
  /** Rendimiento USDC de referencia en Solana (oct-2026: Kamino ~4,5%, Jupiter ~4-5,4%). */
  kaminoYieldPct: 4.5,
  jupiterYieldPct: 5,
  /** Objetivo de rendimiento del tramo senior de Lazo. */
  lazoSeniorTargetYieldPct: 8,
  /** Hipótesis del modelo económico de Lazo (supuestos de trabajo, no métricas medidas). */
  modelAssumptions: {
    downPaymentPct: 30,
    defaultRatePct: 8,
    recoveryRatePct: 80,
    costOfCapitalAnnualPct: 12,
  },
} as const;
