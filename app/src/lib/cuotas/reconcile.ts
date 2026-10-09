// Reconciliación tras `CuotasError("uncertain")`: lee la cadena hasta
// verificar el efecto de una transacción que pudo haber aterrizado, SIN
// reenviarla (un reenvío a ciegas puede duplicar el cargo). Los helpers
// son de solo lectura: nunca firman ni envían nada.
import type { CuotasClient, Plan, WalletAddress } from "./types";

export interface ReconcileOptions {
  /** Espera entre lecturas (default 2.000 ms). */
  intervalMs?: number;
  /** Tiempo máximo total (default 90 s). `null` → devuelve `null`. */
  timeoutMs?: number;
  /** Inyectable en tests (default `setTimeout`). */
  sleep?: (ms: number) => Promise<void>;
  /** Reloj inyectable en tests (default `Date.now`). */
  now?: () => number;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Sondea `fetch` hasta que `done` produzca un valor ≠ null o se venza
 * `timeoutMs`. Los errores de lectura son transitorios: se ignoran y se
 * reintenta hasta el deadline (una lectura fallida no prueba nada).
 * Devuelve `null` si el efecto nunca se verificó dentro del plazo.
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
  const deadline = now() + timeoutMs;
  for (;;) {
    try {
      const result = done(await fetch());
      if (result !== null) return result;
    } catch {
      // Lectura fallida: no afirma nada; se reintenta hasta el deadline.
    }
    const remaining = deadline - now();
    if (remaining <= 0) return null;
    await sleep(Math.min(intervalMs, remaining));
  }
}

/**
 * Tras un `uncertain` de `openPlan`: espera a que el plan del estudiante
 * aparezca activo (confirmado pero aún no indexado por la lectura). El
 * estudiante tiene un solo plan activo onchain; se filtra por identidad
 * para que el plan devuelto corresponda al snapshot del checkout.
 * `null` = no verificado dentro del plazo (revisar la firma en Explorer).
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
    options,
  );
}

/**
 * Tras un `uncertain` de `payInstallment` (o cualquier escritura sobre un
 * plan): espera a que el plan `planId` vuelva a leerse. Si el plan se
 * saldó el programa cierra la cuenta y `getPlans` ya no lo trae: quien
 * reconcilia decide con `reconcileUntil` y su propio `done` si la
 * desaparición significa "saldado" para su flujo.
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
    options,
  );
}
