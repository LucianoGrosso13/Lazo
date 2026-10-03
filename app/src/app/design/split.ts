import type { Micro, TierParams } from "@/lib/cuotas";

/**
 * Reparto de la demo de /design: anticipo por escalón + cuotas parejas.
 * La última cuota absorbe el redondeo (regla del protocolo). Los montos se
 * derivan de `getConfig()` — nada de negocio hardcodeado.
 */
export function demoSplit(price: Micro, tier: TierParams, count: number) {
  const down = Math.round((price * tier.downPaymentBps) / 10_000);
  const financed = price - down;
  const base = Math.floor(financed / count);
  const installments = Array.from({ length: count }, (_, i) =>
    i === count - 1 ? financed - base * (count - 1) : base,
  );
  return { down, financed, installments };
}
