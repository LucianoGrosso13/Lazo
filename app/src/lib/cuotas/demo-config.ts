import type { ProtocolConfig } from "./types";

// Valores iniciales de `admin_init_config` (tabla de la ronda 4 y decisiones de
// precio Q15-Q16 de `proyecto/02-validacion.md`), más los términos de plan y
// liquidación de `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md` y el reparto
// D8 de `proyecto/09-alcance-opcion-h-y-mejoras.md`. Solo los usa el mock: la
// implementación real lee `ProtocolConfig` de la cadena.
const usdc = (n: number) => Math.round(n * 1_000_000);

export const DEMO_CONFIG: ProtocolConfig = {
  feeBps: 700,
  penaltyBps: 500,
  graceDays: 5,
  guarantorNoticeDay: 3,
  guarantorChargeDay: 15,
  secondsPerDay: 86_400,
  installmentsCount: 3,
  installmentIntervalDays: 30,
  // Opciones de plan (decisión comercial de 10): 3 sin interés; 6 con 3%
  // total sobre lo financiado. La opción de 1 cuota se retiró: no existe y
  // pedirla devuelve `option_unavailable`.
  planOptions: [
    { installments: 3, interestTotalBps: 0, minPrice: 0, enabled: true, provisional: false },
    { installments: 6, interestTotalBps: 300, minPrice: usdc(350), enabled: true, provisional: false },
  ],
  // Plazos de cobro del comercio (spec § "Términos del plan"): cobro en
  // tramos mensuales iguales (30→1, 60→2, 90→3) garantizados por Lazo.
  settlementOptions: [
    { id: "immediate", days: 0, tranches: 0, feeBps: 700, enabled: true, provisional: false },
    { id: "deferred_30", days: 30, tranches: 1, feeBps: 625, enabled: true, provisional: false },
    { id: "deferred_60", days: 60, tranches: 2, feeBps: 575, enabled: true, provisional: false },
    { id: "deferred_90", days: 90, tranches: 3, feeBps: 525, enabled: true, provisional: false },
  ],
  // Reparto D8 (09): originación incluida en la comisión; administración
  // anual sobre saldo a cargo del pool.
  originationBps: 400,
  adminFeeAnnualBps: 200,
  // Cobertura del fiador 100% en los cuatro escalones (decisión comercial).
  guaranteedTiers: [
    { downPaymentBps: 3000, guarantorCoverageBps: 10000, maxPurchase: usdc(1000), interestBps: 0 },
    { downPaymentBps: 2000, guarantorCoverageBps: 10000, maxPurchase: usdc(1000), interestBps: 0 },
    { downPaymentBps: 1000, guarantorCoverageBps: 10000, maxPurchase: usdc(1250), interestBps: 0 },
    { downPaymentBps: 0, guarantorCoverageBps: 10000, maxPurchase: usdc(1500), interestBps: 0 },
  ],
  minFinancedToCount: usdc(100),
  state: "Normal",
  usdcMint: "devUSDC1111111111111111111111111111111111111",
  cluster: "devnet",
};
