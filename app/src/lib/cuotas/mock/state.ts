// Estado interno del mock: serializable, persistido en localStorage
// (clave versionada) y SSR-safe (en servidor vive solo en memoria).
import { DEMO_MERCHANT, DEMO_STUDENT_TIER3 } from "../format";
import type {
  Activity,
  Guarantee,
  Installment,
  Merchant,
  Micro,
  Plan,
  Pool,
  ProtocolConfig,
  Reputation,
  UnixSeconds,
  WalletAddress,
} from "../types";

export const STORAGE_KEY = "lazo.mock.v1";

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const HEX = "0123456789abcdef";
const usdc = (n: number) => Math.round(n * 1_000_000);

/** Cuota con marcas internas del keeper; no se exponen en la interfaz. */
export type MockInstallment = Installment & {
  notifiedAt?: UnixSeconds;
  markedLateAt?: UnixSeconds;
  chargedAt?: UnixSeconds;
};

export type MockPlan = Omit<Plan, "installments"> & {
  installments: MockInstallment[];
};

export interface MockState {
  version: 1;
  /** Días que se adelantó el reloj de demo con `advanceDays`. */
  daysAdvanced: number;
  config: ProtocolConfig;
  reputations: Record<WalletAddress, Reputation>;
  guarantees: Record<WalletAddress, Guarantee>;
  plans: MockPlan[];
  merchants: Record<WalletAddress, Merchant>;
  pool: Pool;
  activity: Activity[];
  planSeq: number;
}

export const bpsOf = (amount: Micro, bps: number): Micro =>
  Math.round((amount * bps) / 10_000);

/** Reloj de demo: tiempo real + el offset acumulado en días de demo. */
export function now(state: MockState): UnixSeconds {
  return (
    Math.floor(Date.now() / 1000) +
    state.daysAdvanced * state.config.secondsPerDay
  );
}

function randomChars(alphabet: string, length: number): string {
  const buf = new Uint32Array(length);
  const crypto = globalThis.crypto;
  if (crypto?.getRandomValues) crypto.getRandomValues(buf);
  else for (let i = 0; i < length; i++) buf[i] = Math.floor(Math.random() * 1e9);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

/** Firma falsa con formato base58. Es simulada; nunca es una firma real. */
export const fakeSignature = () => randomChars(B58, 88);
/** Hash falso del comprobante del procesador de pagos (64 hex). */
export const fakeReceiptHash = () => randomChars(HEX, 64);

function exampleGuarantee(
  student: WalletAddress,
  at: UnixSeconds,
  maxPurchase: Micro = usdc(1000),
): Guarantee {
  return {
    student,
    maxPurchase,
    coverageMax: maxPurchase,
    mandateHash: fakeReceiptHash(),
    active: true,
    registeredAt: at,
    display: { guarantorName: "Fiador de ejemplo", cardLabel: "Visa •••• 4242" },
  };
}

/**
 * Crea la reputación (escalón 0) y el fiador de ejemplo si la wallet es nueva.
 * Devuelve true si hubo que crear algo.
 */
export function ensureStudent(
  state: MockState,
  student: WalletAddress,
): boolean {
  let created = false;
  if (!state.reputations[student]) {
    state.reputations[student] = {
      student,
      tier: 0,
      plansCompleted: 0,
      lateCount: 0,
      activeExposure: 0,
      blockedFromNewPlans: false,
    };
    created = true;
  }
  if (!state.guarantees[student]) {
    state.guarantees[student] = exampleGuarantee(student, now(state));
    created = true;
  }
  return created;
}

/** Estado inicial de la demo: comercio, pool fondeado y estudiante escalón 3. */
export function seedState(config: ProtocolConfig): MockState {
  const t0 = Math.floor(Date.now() / 1000);
  const junior = usdc(2000);
  const senior = usdc(8000);
  const state: MockState = {
    version: 1,
    daysAdvanced: 0,
    config,
    reputations: {},
    guarantees: {},
    plans: [],
    merchants: {
      [DEMO_MERCHANT]: {
        owner: DEMO_MERCHANT,
        name: "Tienda Demo",
        active: true,
        settlementBalance: 0,
        plansCount: 0,
        sales: [],
      },
    },
    pool: {
      juniorCapital: junior,
      seniorCapital: senior,
      outstandingCredit: 0,
      accruedFees: 0,
      available: junior + senior,
      nav: junior + senior,
      events: [
        {
          kind: "Deposit",
          amount: junior,
          at: t0,
          signature: fakeSignature(),
          tranche: "junior",
        },
        {
          kind: "Deposit",
          amount: senior,
          at: t0,
          signature: fakeSignature(),
          tranche: "senior",
        },
      ],
    },
    activity: [],
    planSeq: 0,
  };
  ensureStudent(state, DEMO_STUDENT_TIER3);
  const rep = state.reputations[DEMO_STUDENT_TIER3];
  rep.tier = 3;
  rep.plansCompleted = 3;
  const guarantee = state.guarantees[DEMO_STUDENT_TIER3];
  guarantee.maxPurchase = usdc(1500);
  guarantee.coverageMax = usdc(1500);
  return state;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadState(): MockState | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MockState;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function persistState(state: MockState): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage lleno o bloqueado: el mock sigue funcionando en memoria.
  }
}
