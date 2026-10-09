// Reconciliación tras `CuotasError("uncertain")`: verificar el efecto de
// una transacción que pudo haber aterrizado, SIN reenviarla (un reenvío a
// ciegas puede duplicar el cargo). Los helpers son de solo lectura:
// nunca firman ni envían nada.
//
// IMPORTANTE: `waitForOpenedPlan`/`waitForPlan` son polling genérico de
// estado — NO prueban que una firma aterrizó (un plan previo o una cuota
// ya paga también los satisfacen). Para el veredicto de UNA operación
// firmada usar `CuotasClient.reconcileOperation` (o `waitForOperation`),
// que valida la firma ORIGINAL + snapshot de identidad.
import type {
  CuotasClient,
  OperationSnapshot,
  Plan,
  ReconcileOutcome,
  WalletAddress,
} from "./types";
import { CuotasError } from "./types";

export interface ReconcileOptions {
  /** Espera entre lecturas (default 2.000 ms). */
  intervalMs?: number;
  /** Tiempo máximo total (default 90 s). `0` (o negativo) sondea una sola
   * vez y devuelve `null` si no hay veredicto inmediato. */
  timeoutMs?: number;
  /** Inyectable en tests (default `setTimeout`). */
  sleep?: (ms: number) => Promise<void>;
  /** Reloj inyectable en tests (default `Date.now`). */
  now?: () => number;
  /** Qué errores de `fetch` se reintentan (default: todos). Devolver
   * `false` propaga el error en vez de seguir sondeando. */
  isTransient?: (error: unknown) => boolean;
}

/**
 * Transitorio para los `waitFor*`: errores crudos de red/RPC (que no son
 * `CuotasError`) y `CuotasError("unavailable")` se reintentan. Cualquier
 * otro código clasificado (`wrong_cluster`, `not_found`, validación del
 * snapshot…) es definitivo y se propaga en vez de sondear en vano.
 */
const rpcTransientOnly = (e: unknown): boolean =>
  !(e instanceof CuotasError) || e.code === "unavailable";

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Sondea `fetch` hasta que `done` produzca un valor ≠ null o se venza
 * `timeoutMs`. Los errores de lectura se tratan como transitorios (una
 * lectura fallida no prueba nada) salvo que `isTransient` diga lo
 * contrario, en cuyo caso se propagan. Devuelve `null` si el efecto
 * nunca se verificó dentro del plazo.
 */
export async function reconcileUntil<T, R>(
  fetch: () => Promise<T>,
  done: (value: T) => R | null,
  options?: ReconcileOptions,
): Promise<R | null> {
  const intervalMs = options?.intervalMs ?? 2_000;
  const timeoutMs = options?.timeoutMs ?? 90_000;
  const sleep = options?.sleep ?? defaultSleep;
  const now = options?.now ?? Date.now;
  const isTransient = options?.isTransient ?? (() => true);
  const deadline = now() + timeoutMs;
  for (;;) {
    try {
      const result = done(await fetch());
      if (result !== null) return result;
    } catch (e) {
      // Lectura fallida: no afirma nada; se reintenta hasta el deadline.
      // Un error no transitorio se propaga en lugar de sondear en vano.
      if (!isTransient(e)) throw e;
    }
    const remaining = deadline - now();
    if (remaining <= 0) return null;
    await sleep(Math.min(intervalMs, remaining));
  }
}

/**
 * Espera el veredicto de UNA operación firmada (la forma correcta de
 * resolver un `uncertain`): sondea `reconcileOperation` hasta `confirmed`
 * o `failed`. `null` = siguió `pending` dentro del plazo — mantener el
 * bloqueo, jamás reintentar a ciegas.
 */
export function waitForOperation(
  client: Pick<CuotasClient, "reconcileOperation">,
  snapshot: OperationSnapshot,
  options?: ReconcileOptions,
): Promise<ReconcileOutcome | null> {
  return reconcileUntil(
    () => client.reconcileOperation(snapshot),
    (outcome) => (outcome.status === "pending" ? null : outcome),
    { ...options, isTransient: options?.isTransient ?? rpcTransientOnly },
  );
}

/**
 * Helper de LECTURA (polling de estado), no veredicto de una firma.
 * Devuelve el primer plan activo del estudiante — que puede ser un plan
 * PREEXISTENTE, no el de la operación en duda. NO usar como prueba de
 * éxito tras `uncertain`: para eso está `reconcileOperation`/`waitForOperation`.
 */
export function waitForOpenedPlan(
  client: Pick<CuotasClient, "getPlans">,
  student: WalletAddress,
  options?: ReconcileOptions,
): Promise<Plan | null> {
  return reconcileUntil(
    () => client.getPlans(student),
    (plans) =>
      plans.find(
        (p) =>
          p.student === student &&
          (p.status === "Active" || p.status === "Late"),
      ) ?? null,
    { ...options, isTransient: options?.isTransient ?? rpcTransientOnly },
  );
}

/**
 * Helper de LECTURA (polling de estado), no veredicto de una firma.
 * Devuelve el plan `planId` cuando vuelve a leerse — no distingue si la
 * cuota la pagó esta firma o ya estaba paga. NO usar como prueba de
 * éxito tras `uncertain`: para eso está `reconcileOperation`/`waitForOperation`.
 * Si el plan se saldó y cerró, `getPlans` ya no lo trae: quien espera el
 * cierre lo resuelve con `reconcileUntil` y su propio `done`.
 */
export function waitForPlan(
  client: Pick<CuotasClient, "getPlans">,
  student: WalletAddress,
  planId: string,
  options?: ReconcileOptions,
): Promise<Plan | null> {
  return reconcileUntil(
    () => client.getPlans(student),
    (plans) => plans.find((p) => p.id === planId) ?? null,
    { ...options, isTransient: options?.isTransient ?? rpcTransientOnly },
  );
}
