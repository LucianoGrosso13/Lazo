// Interfaz única del front hacia la cadena. Las pantallas importan solo de acá.
// `NEXT_PUBLIC_CUOTAS_MODE=real` usa el cliente Codama; cualquier otro valor, el mock.
import { createAccountCuotas } from "./cuotas/accounts";
import { createMockCuotas } from "./cuotas/mock";
import { createRealCuotas } from "./cuotas/real";
import type { AccountCuotasClient } from "./cuotas/accounts-types";
import type { CuotasClient } from "./cuotas/types";

export * from "./cuotas/types";
export * from "./cuotas/accounts-types";
export { formatUsdc, toMicro, fromMicro, DEMO_MERCHANT, DEMO_STUDENT_TIER3 } from "./cuotas/format";
export { REFERENCE_FIGURES } from "./cuotas/reference-figures";

let instance: CuotasClient | null = null;
let accountInstance: AccountCuotasClient | null = null;

export function getCuotas(): CuotasClient {
  instance ??=
    process.env.NEXT_PUBLIC_CUOTAS_MODE === "real" ? createRealCuotas() : createMockCuotas();
  return instance;
}

/** Extensión aditiva de cuentas (roles, saldo, invitaciones, admin). Ver `account-api.md`. */
export function getAccountCuotas(): AccountCuotasClient {
  accountInstance ??= createAccountCuotas(getCuotas());
  return accountInstance;
}
