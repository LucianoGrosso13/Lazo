// Cifras de terceros para comparar. Referencia, sin verificar en la fuente
// oficial (ver `proyecto/02-validacion.md` y `research/a-...`).
export const REFERENCE = {
  /** Lo que termina pagando en MP "Cuotas sin Tarjeta" por 3 cuotas, en términos reales. */
  mpInstallmentMarkup: 0.29,
  mpCftea: { min: 61, max: 388 },
  merchantFeePct: { cuotaSimple: 5.41, mercadoPago: 12.49 },
  goCuotasPayoutBusinessDays: 22,
  apyPct: { lazoSeniorTarget: 8, kamino: 6, jupiter: 5 },
} as const;
