import { DEMO_CONFIG } from "./demo-config";
import { CuotasError, type CuotasClient } from "./types";

// Implementación mock (memoria + localStorage + reloj de demo).
// PENDIENTE: ticket 03-05 de `.scratch/lazo-front/issues/`. Por ahora solo
// `getConfig` y `subscribe` funcionan; el resto tira `not_implemented`.
const pending = (name: string) => () =>
  Promise.reject(new CuotasError("not_implemented", `mock.${name} pendiente`));

export function createMockCuotas(): CuotasClient {
  const listeners = new Set<() => void>();
  return {
    mode: "mock",
    getConfig: async () => DEMO_CONFIG,
    getClock: pending("getClock"),
    getReputation: pending("getReputation"),
    getGuarantee: pending("getGuarantee"),
    quote: pending("quote"),
    getPlans: pending("getPlans"),
    getMerchant: pending("getMerchant"),
    getPool: pending("getPool"),
    getActivity: pending("getActivity"),
    initReputation: pending("initReputation"),
    openPlan: pending("openPlan"),
    payInstallment: pending("payInstallment"),
    registerGuarantee: pending("registerGuarantee"),
    revokeGuarantee: pending("revokeGuarantee"),
    advanceDays: pending("advanceDays"),
    resetDemo: pending("resetDemo"),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
