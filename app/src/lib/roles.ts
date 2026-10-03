// Lógica de roles y navegación de cuentas. La detección vive en
// `getAccountCuotas().resolveAccount`; acá quedan las rutas declaradas, las
// cuentas de ejemplo del selector demo y la persistencia de esa selección.
import {
  DEMO_ADMIN,
  DEMO_MERCHANT,
  DEMO_STUDENT_NEW,
  DEMO_STUDENT_TIER3,
  type WalletAddress,
} from "./cuotas";

/** Home de cada cuenta. El alias `/panel` redirige a `/app/estudiante`. */
export const ACCOUNT_ROUTES = {
  student: "/app/estudiante",
  merchant: "/app/comercio",
  admin: "/app/admin",
} as const;

/** Consulta pública, sin wallet. Los define el owner del ticket 04. */
export const PUBLIC_ROUTES = {
  pool: "/pool",
  comercio: "/comercio",
} as const;

/** Ruta del fiador (propuesta; el owner del ticket 03 la confirma). Sin wallet. */
export const guarantorPath = (token: string) => `/fiador/${token}`;

/** Identidades de ejemplo del selector demo. Nunca autorizan nada real. */
export type DemoAccountId = "student-new" | "student-tier3" | "merchant" | "admin" | "guarantor";

/** Direcciones de datos de prueba para las identidades con wallet simulada. */
export const DEMO_ACCOUNT_ADDRESSES: Record<Exclude<DemoAccountId, "guarantor">, WalletAddress> = {
  "student-new": DEMO_STUDENT_NEW,
  "student-tier3": DEMO_STUDENT_TIER3,
  merchant: DEMO_MERCHANT,
  admin: DEMO_ADMIN,
};

/** Orden estable del selector. `guarantor` no tiene dirección: entra por invitación. */
export const DEMO_ACCOUNT_IDS: readonly DemoAccountId[] = [
  "student-new",
  "student-tier3",
  "merchant",
  "admin",
  "guarantor",
];

/** Ruta destino de cada identidad del selector: navegación en un click. */
export const DEMO_ROUTES: Record<DemoAccountId, string> = {
  "student-new": ACCOUNT_ROUTES.student,
  "student-tier3": ACCOUNT_ROUTES.student,
  merchant: ACCOUNT_ROUTES.merchant,
  admin: ACCOUNT_ROUTES.admin,
  // El fiador no tiene wallet ni home: entra por invitación desde /app.
  guarantor: "/app",
};

const DEMO_STORAGE_KEY = "lazo.cuenta.demo.v1";
const LAST_STUDENT_STORAGE_KEY = "lazo.cuenta.last-student.v1";

// Respaldo en memoria por si localStorage está bloqueado o lleno: la selección
// sigue funcionando en la sesión sin prometer persistencia que no existe.
let memoryDemo: DemoAccountId | null = null;
let memoryStudent: WalletAddress | null = null;

// Store externo de la selección demo, mismo patrón que `locale.tsx`: así los
// componentes la leen con `useSyncExternalStore` sin desincronizar el SSR.
const demoListeners = new Set<() => void>();
const studentListeners = new Set<() => void>();

export function subscribeDemoSelection(cb: () => void) {
  demoListeners.add(cb);
  return () => demoListeners.delete(cb);
}

export function subscribeLastStudent(cb: () => void) {
  studentListeners.add(cb);
  return () => studentListeners.delete(cb);
}

/** Selección persistida. Solo la honra el modo mock; el llamador decide cuándo. */
export function readDemoSelection(): DemoAccountId | null {
  if (typeof window === "undefined") return memoryDemo;
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return DEMO_ACCOUNT_IDS.includes(raw as DemoAccountId) ? (raw as DemoAccountId) : memoryDemo;
  } catch {
    return memoryDemo;
  }
}

export function writeDemoSelection(id: DemoAccountId | null) {
  memoryDemo = id;
  if (typeof window !== "undefined") {
    try {
      if (id === null) window.localStorage.removeItem(DEMO_STORAGE_KEY);
      else window.localStorage.setItem(DEMO_STORAGE_KEY, id);
    } catch {
      // Storage bloqueado: la selección vive en memoria durante la sesión.
    }
  }
  demoListeners.forEach((cb) => cb());
}

/**
 * Último estudiante del recorrido: la identidad que siguió la demo al pasar a
 * fiador/admin/comercio. Persiste como la selección; el default lo decide el
 * llamador (`useStudentAddress` usa `DEMO_STUDENT_NEW`).
 */
export function readLastStudent(): WalletAddress | null {
  if (typeof window === "undefined") return memoryStudent;
  try {
    return window.localStorage.getItem(LAST_STUDENT_STORAGE_KEY) ?? memoryStudent;
  } catch {
    return memoryStudent;
  }
}

export function writeLastStudent(address: WalletAddress | null) {
  memoryStudent = address;
  if (typeof window !== "undefined") {
    try {
      if (address === null) window.localStorage.removeItem(LAST_STUDENT_STORAGE_KEY);
      else window.localStorage.setItem(LAST_STUDENT_STORAGE_KEY, address);
    } catch {
      // Igual que la selección: sesión sola.
    }
  }
  studentListeners.forEach((cb) => cb());
}

/** Limpieza coherente de la demo: selección e identidad recordada. */
export function resetDemoUiState() {
  writeDemoSelection(null);
  writeLastStudent(null);
}
