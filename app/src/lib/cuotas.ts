// Interfaz única del front hacia la cadena. Las pantallas importan solo de acá.
// `NEXT_PUBLIC_CUOTAS_MODE=real` usa el cliente Codama; cualquier otro valor, el mock.
import { createMockCuotas } from "./cuotas/mock";
import { createRealCuotas } from "./cuotas/real";
import type { CuotasClient } from "./cuotas/types";

export * from "./cuotas/types";
export { formatUsdc, toMicro, fromMicro, DEMO_MERCHANT, DEMO_STUDENT_TIER3 } from "./cuotas/format";

let instance: CuotasClient | null = null;

export function getCuotas(): CuotasClient {
  instance ??=
    process.env.NEXT_PUBLIC_CUOTAS_MODE === "real" ? createRealCuotas() : createMockCuotas();
  return instance;
}
