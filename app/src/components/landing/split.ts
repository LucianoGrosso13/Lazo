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
