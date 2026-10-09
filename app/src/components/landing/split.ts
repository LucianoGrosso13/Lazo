import type { Micro, ProtocolConfig, TierIndex } from "@/lib/cuotas";

// Reparto de una compra para un tier con fiador, a partir de la config.
// Es la misma cuenta que `quote()` sin los chequeos de la wallet (la landing
// no necesita wallet). El checkout usa `quote()`.
export interface Split {
  price: Micro;
  tier: TierIndex;
  downPayment: Micro;
  financed: Micro;
  installments: Micro[];
  merchantFee: Micro;
  merchantReceives: Micro;
  maxPurchase: Micro;
  withinTier: boolean;
}

export function splitPurchase(config: ProtocolConfig, price: Micro, tier: TierIndex): Split {
  const t = config.guaranteedTiers[tier];
  const downPayment = Math.round((price * t.downPaymentBps) / 10_000);
  const financed = price - downPayment;
  const n = config.installmentsCount;
  const base = Math.floor(financed / n);
  const installments = Array.from({ length: n }, (_, i) => (i === n - 1 ? financed - base * (n - 1) : base));
  const merchantFee = Math.round((financed * config.feeBps) / 10_000);
  return {
    price,
    tier,
    downPayment,
    financed,
    installments,
    merchantFee,
    merchantReceives: price - merchantFee,
    maxPurchase: t.maxPurchase,
    withinTier: price <= t.maxPurchase,
  };
}

/** Comisión del comercio como % del precio en un tier (7% de lo financiado). */
export const merchantFeeOfPrice = (config: ProtocolConfig, tier: TierIndex) =>
  (config.feeBps * (10_000 - config.guaranteedTiers[tier].downPaymentBps)) / 10_000 / 100;

/**
 * Costo total en micro-USDC de financiar `financed` en `installments` cuotas
 * mensuales iguales con una CFTEA dada (costo financiero total efectivo
 * anual, en %), sumado al anticipo. La CFTEA se pasa a tasa mensual
 * equivalente `i = (1 + CFTEA)^(1/12) − 1` y la cuota sale del sistema
 * francés `C = A·i / (1 − (1 + i)^−n)`. Con CFTEA 0 el costo es el precio.
 * Sirve para comparar en US$ la misma compra con la cifra de referencia.
 */
export function cfteaTotalCost({
  downPayment,
  financed,
  cfteaPct,
  installments,
}: {
  downPayment: Micro;
  financed: Micro;
  cfteaPct: number;
  installments: number;
}): Micro {
  if (installments <= 0 || financed <= 0) return Math.max(0, downPayment) + Math.max(0, financed);
  const monthly = Math.pow(1 + Math.max(0, cfteaPct) / 100, 1 / 12) - 1;
  const payment = monthly === 0 ? financed / installments : (financed * monthly) / (1 - Math.pow(1 + monthly, -installments));
  return downPayment + Math.round(payment * installments);
}
