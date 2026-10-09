// Progreso al próximo Tier del comprador (ticket 07): función pura que
// deriva "qué falta" de la reputación, los planes y la config del
// protocolo. La regla de subida es la del programa y del mock: cada plan
// saldado a tiempo con financiado ≥ `minFinancedToCount` sube un escalón
// (`plan.counts` queda en false si el plan pasó la gracia). Ningún número
// de negocio vive acá: `minFinanced` y los escalones salen de la config.
import type {
  Installment,
  Micro,
  Plan,
  ProtocolConfig,
  Reputation,
  TierIndex,
} from "@/lib/cuotas";

export interface TierProgress {
  /** Escalón actual (índice 0-based de `guaranteedTiers`). */
  tier: TierIndex;
  /** true cuando el comprador llegó al último escalón de la config. */
  atMax: boolean;
  /** Escalón siguiente; `null` en el máximo. */
  nextTier: TierIndex | null;
  /**
   * Planes saldados a tiempo que faltan para subir. La regla vigente sube
   * un escalón por plan que cuenta, así que es 1 (0 en el máximo).
   */
  plansNeeded: number;
  /** Financiado mínimo para que un plan cuente (micro-USDC, de la config). */
  minFinanced: Micro;
  /**
   * Plan abierto que cuenta para subir (el más avanzado si hay varios):
   * cuotas pagadas sobre el total. `null` si no hay plan en curso que
   * cuente o el Tier ya es el máximo.
   */
  inFlight: { planId: string; paid: number; total: number; ratio: number } | null;
  /** Fracción 0..1 para la barra: avance del plan en curso (1 en el máximo). */
  ratio: number;
}

type PlanLike = Pick<Plan, "id" | "counts" | "status"> & {
  installments: readonly Pick<Installment, "status" | "paidAt">[];
};

const isPaid = (i: Pick<Installment, "status" | "paidAt">) =>
  i.status === "Paid" || i.paidAt !== undefined;

/**
 * El progreso honesto hacia el próximo Tier: falta siempre un plan saldado
 * a tiempo (≥ `minFinanced`), y la barra muestra cuánto del plan en curso
 * que cuenta ya está pago. Un plan que pasó la gracia (`counts: false`) o
 * uno chico (< `minFinanced`) no empuja la barra.
 */
export function tierProgress(
  reputation: Pick<Reputation, "tier">,
  plans: readonly PlanLike[],
  config: Pick<ProtocolConfig, "guaranteedTiers" | "minFinancedToCount">,
): TierProgress {
  const last = config.guaranteedTiers.length - 1;
  const tier = Math.max(0, Math.min(reputation.tier, last)) as TierIndex;
  const atMax = tier >= last;

  let inFlight: TierProgress["inFlight"] = null;
  if (!atMax) {
    for (const plan of plans) {
      // Solo empuja el plan abierto que cuenta: saldado ya subió el Tier y
      // recuperado/plan que no cuenta jamás lo hará.
      if (!plan.counts) continue;
      if (plan.status === "Settled" || plan.status === "Recovered") continue;
      const total = plan.installments.length;
      if (total === 0) continue;
      const paid = plan.installments.filter(isPaid).length;
      const ratio = paid / total;
      if (!inFlight || ratio > inFlight.ratio) {
        inFlight = { planId: plan.id, paid, total, ratio };
      }
    }
  }

  return {
    tier,
    atMax,
    nextTier: atMax ? null : ((tier + 1) as TierIndex),
    plansNeeded: atMax ? 0 : 1,
    minFinanced: config.minFinancedToCount,
    inFlight,
    ratio: atMax ? 1 : (inFlight?.ratio ?? 0),
  };
}
