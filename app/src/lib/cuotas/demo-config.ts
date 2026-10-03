import type { ProtocolConfig } from "./types";

// Valores iniciales de `admin_init_config` (tabla de la ronda 4 y decisiones de
// precio Q15-Q16 de `proyecto/02-validacion.md`). Solo los usa el mock: la
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
  guaranteedTiers: [
    { downPaymentBps: 3000, guarantorCoverageBps: 10000, maxPurchase: usdc(1000), interestBps: 0 },
    { downPaymentBps: 2000, guarantorCoverageBps: 9000, maxPurchase: usdc(1000), interestBps: 0 },
    { downPaymentBps: 1000, guarantorCoverageBps: 8000, maxPurchase: usdc(1250), interestBps: 0 },
    { downPaymentBps: 0, guarantorCoverageBps: 7000, maxPurchase: usdc(1500), interestBps: 0 },
  ],
  unguaranteedTiers: [
    { downPaymentBps: 5000, guarantorCoverageBps: 0, maxPurchase: usdc(150), interestBps: 0 },
    { downPaymentBps: 3000, guarantorCoverageBps: 0, maxPurchase: usdc(300), interestBps: 0 },
  ],
  minFinancedToCount: usdc(100),
  state: "Normal",
  usdcMint: "devUSDC1111111111111111111111111111111111111",
  cluster: "devnet",
};
