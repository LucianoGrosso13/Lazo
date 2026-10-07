// Cifras de terceros para comparar. Referencia, sin verificar en la fuente
// oficial (ver `proyecto/02-validacion.md`, `proyecto/06-viabilidad/` y
// `research/a-...`). Actualizado 6-oct-2026.
export const REFERENCE = {
  /** Lo que termina pagando la competencia en cuotas sin tarjeta, en términos reales. */
  mpInstallmentMarkup: 0.29,
  mpCftea: { min: 76, max: 1376 },
  merchantFeePct: { cuotaMipyme: 6.91, mercadoPago: 12.49 },
  goCuotasPayoutBusinessDays: 22,
  apyPct: { lazoSeniorTarget: 8, kamino: 4.5, jupiter: 5 },
} as const;
