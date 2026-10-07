import { REFERENCE_FIGURES } from "@/lib/cuotas";

// Cifras de terceros para comparar. Con etiqueta obligatoria "referencia".
export const REFERENCE = {
  note: REFERENCE_FIGURES.note,
  /** @deprecated no usar en UI nueva: comparar con REFERENCE_FIGURES.mercadoPagoCfteaPct */
  mpInstallmentMarkup: REFERENCE_FIGURES.mercadoPagoPc1000SurchargePct / 100,
  cfteaRangePct: REFERENCE_FIGURES.mercadoPagoCfteaPct,
  merchantFeePct: {
    countertop: REFERENCE_FIGURES.cuotaMipymeMerchantPct,
    wallets: REFERENCE_FIGURES.mercadoPagoMerchantPct,
  },
  settlementBusinessDays: REFERENCE_FIGURES.gocuotasSettlementBusinessDays,
  apyPct: {
    lazoSeniorTarget: REFERENCE_FIGURES.lazoSeniorTargetYieldPct,
    kamino: REFERENCE_FIGURES.kaminoYieldPct,
    jupiter: REFERENCE_FIGURES.jupiterYieldPct,
  },
  modelAssumptions: REFERENCE_FIGURES.modelAssumptions,
} as const;
