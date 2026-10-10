// Modo activo del cliente de cuotas, elegible en runtime además del default
// de build. La demo pública sigue siendo mock salvo que el visitante pida el
// modo real; ese modo solo existe si el despliegue lo habilita.
//
// - `NEXT_PUBLIC_CUOTAS_MODE=real` fija el DEFAULT en real (build/deploy).
// - `NEXT_PUBLIC_CUOTAS_MERCHANT` habilita el modo real aunque el default sea
//   mock: sin un comercio devnet declarado la compra real falla cerrado, así
//   que sin él el switch no se ofrece y ni la URL ni lo persistido lo activan.
// - `?modo=real` / `?modo=demo` en la URL mandan sobre lo guardado y se
//   persisten; el resto de las visitas usa localStorage (`lazo:cuotas-mode`).
// - El switch recarga la página: reconstruir singletons, clientes y
//   suscripciones de una es más simple y menos frágil que mutarlos en caliente.
//
// Las NEXT_PUBLIC_* se leen con referencias literales (`process.env.X`) para
// que Next las incruste en el bundle del navegador (ver `real.ts`, misma regla).

export type CuotasMode = "mock" | "real";

/** Modo si no hay elección persistida ni parámetro de URL. */
export const DEFAULT_MODE: CuotasMode =
  process.env.NEXT_PUBLIC_CUOTAS_MODE === "real" ? "real" : "mock";

const STORAGE_KEY = "lazo:cuotas-mode";
const MODE_PARAM = "modo";

/**
 * El modo real puede usarse en este despliegue: o el build lo fija como
 * default, o hay un comercio devnet declarado (sin él la compra real no
 * tiene destino y el switch no tiene sentido).
 */
export function isRealAvailable(): boolean {
  if (process.env.NEXT_PUBLIC_CUOTAS_MODE === "real") return true;
  const merchant = process.env.NEXT_PUBLIC_CUOTAS_MERCHANT;
  return typeof merchant === "string" && merchant.length > 0;
}

// Modo que `getCuotas()` usa ahora. El servidor siempre renderiza el default;
// el provider del cliente lo actualiza al persistido en el primer render.
let activeMode: CuotasMode = DEFAULT_MODE;

export function getActiveMode(): CuotasMode {
  return activeMode;
}

export function setActiveMode(mode: CuotasMode): void {
  activeMode = mode;
}

function persistMode(mode: CuotasMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage bloqueado: la elección vive solo en memoria esta sesión.
  }
}

/**
 * Modo elegido por el visitante. En el servidor siempre es el default: el
 * HTML sale en ese modo y la hidratación coincide. En el cliente, un
 * `?modo=real|demo` manda y se persiste primero; después vale lo guardado si
 * es válido y —para "real"— el modo está disponible en este despliegue.
 */
export function readStoredMode(): CuotasMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const param = new URLSearchParams(window.location.search).get(MODE_PARAM);
    if (param === "real" || param === "demo") {
      persistMode(param === "real" ? "real" : "mock");
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "real" && isRealAvailable()) return "real";
    if (stored === "mock") return "mock";
    return DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/**
 * Suscripción al modo persistido para `useSyncExternalStore`: avisa cuando
 * otra pestaña cambia la elección (el evento storage no dispara en la propia).
 */
export function subscribeCuotasMode(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/**
 * Cambia el modo y recarga: la forma más simple de reconstruir clientes,
 * caches y suscripciones sin estados mezclados. Quita `?modo=` de la URL para
 * que el parámetro no vuelva a imponer el modo anterior tras la recarga.
 */
export function switchCuotasMode(mode: CuotasMode): void {
  if (typeof window === "undefined") return;
  persistMode(mode);
  const url = new URL(window.location.href);
  url.searchParams.delete(MODE_PARAM);
  window.location.assign(url.toString());
}
