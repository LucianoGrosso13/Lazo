import { CuotasError, type CuotasClient } from "./types";

// Implementación real con el cliente Codama (`src/generated/`). Se completa
// cuando el compañero publique el IDL (tarea T1.4 de `proyecto/04-plan.md`).
export function createRealCuotas(): CuotasClient {
  const notYet = () =>
    Promise.reject(new CuotasError("not_implemented", "Falta el programa desplegado y el IDL"));
  return {
    mode: "real",
    getConfig: notYet,
    getClock: notYet,
    getReputation: notYet,
    getGuarantee: notYet,
    quote: notYet,
    getPlans: notYet,
    getMerchant: notYet,
    getPool: notYet,
    getActivity: notYet,
    initReputation: notYet,
    openPlan: notYet,
    payInstallment: notYet,
    registerGuarantee: notYet,
    revokeGuarantee: notYet,
    advanceDays: () => Promise.reject(new CuotasError("demo_only")),
    resetDemo: () => Promise.reject(new CuotasError("demo_only")),
    subscribe: () => () => {},
  };
}
