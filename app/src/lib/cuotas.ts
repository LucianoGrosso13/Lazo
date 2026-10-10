// Interfaz única del front hacia la cadena. Las pantallas importan solo de acá.
// El modo activo lo fija `cuotas/mode.ts` (default de build + elección en
// runtime); cada modo cachea su propio cliente y su propio cliente de cuentas.
import { createAccountCuotas } from "./cuotas/accounts";
import { getActiveMode, type CuotasMode } from "./cuotas/mode";
import { createMockCuotas } from "./cuotas/mock";
import { createRealCuotas } from "./cuotas/real";
import type { AccountCuotasClient } from "./cuotas/accounts-types";
import type { CuotasClient } from "./cuotas/types";

export * from "./cuotas/types";
export * from "./cuotas/accounts-types";
export * from "./cuotas/terms";
export * from "./cuotas/reconcile";
export { formatUsdc, toMicro, fromMicro, DEMO_MERCHANT, DEMO_STUDENT_TIER3 } from "./cuotas/format";
export { REFERENCE_FIGURES } from "./cuotas/reference-figures";
export {
  DEFAULT_MODE,
  getActiveMode,
  isRealAvailable,
  readStoredMode,
  setActiveMode,
  subscribeCuotasMode,
  switchCuotasMode,
  type CuotasMode,
} from "./cuotas/mode";

const instances: Partial<Record<CuotasMode, CuotasClient>> = {};
const accountInstances: Partial<Record<CuotasMode, AccountCuotasClient>> = {};

export function getCuotas(): CuotasClient {
  const mode = getActiveMode();
  return (instances[mode] ??= mode === "real" ? createRealCuotas() : createMockCuotas());
}

/** Extensión aditiva de cuentas (roles, saldo, invitaciones, admin). Ver `account-api.md`. */
export function getAccountCuotas(): AccountCuotasClient {
  const mode = getActiveMode();
  return (accountInstances[mode] ??= createAccountCuotas(getCuotas()));
}
