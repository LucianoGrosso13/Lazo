// Implementación del contrato aditivo de cuentas: envuelve al `CuotasClient`
// base y agrega solo metadatos de cuenta (roles, saldo derivado, invitaciones,
// autorización admin). Nunca duplica planes, pool, config ni reloj: todo lo
// financiero se delega a `base`. Ver `.scratch/app-cuentas/account-api.md`.
import { DEMO_MERCHANT, DEMO_STUDENT_TIER3 } from "./format";
import { CuotasError, type CuotasClient, type Plan, type ProtocolConfig } from "./types";
import {
  AccountCuotasError,
  DEMO_ADMIN,
  DEMO_KEEPER,
  DEMO_STUDENT_FUNDS,
  DEMO_STUDENT_NEW,
  type AccountAuthority,
  type AccountBaseHooks,
  type AccountConfig,
  type AccountCuotasClient,
  type AccountErrorCode,
  type AdminMerchantRef,
  type AdminRegisterMerchantArgs,
  type AdminSnapshot,
  type CompleteGuarantorArgs,
  type Invitation,
  type ReputationStatus,
  type ResolvedAccount,
  type StudentBalance,
} from "./accounts-types";
import type {
  Guarantee,
  Merchant,
  ProtocolState,
  TxResult,
  UnixSeconds,
  WalletAddress,
} from "./types";

/** Clave versionada del store de metadatos de cuenta (invitaciones). */
const STORAGE_KEY = "lazo.accounts.v1";

interface AccountStoreV1 {
  version: 1;
  invitations: Invitation[];
}

const EMPTY_STORE: AccountStoreV1 = { version: 1, invitations: [] };
// Respaldo en memoria: si localStorage está bloqueado o lleno, un token creado
// en esta sesión sigue siendo resoluble. En SSR vive solo acá, como el mock A.
let memoryStore: AccountStoreV1 | null = null;

function loadStore(): AccountStoreV1 {
  if (typeof window === "undefined") return memoryStore ?? EMPTY_STORE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryStore ?? EMPTY_STORE;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as AccountStoreV1).version !== 1 ||
      !Array.isArray((parsed as AccountStoreV1).invitations)
    ) {
      return memoryStore ?? EMPTY_STORE;
    }
    memoryStore = parsed as AccountStoreV1;
    return memoryStore;
  } catch {
    return memoryStore ?? EMPTY_STORE;
  }
}

function saveStore(store: AccountStoreV1) {
  memoryStore = store;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage lleno o bloqueado: la invitación vive solo en esta sesión.
  }
}

function clearStore() {
  memoryStore = EMPTY_STORE;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nada que limpiar si el storage ya está bloqueado.
  }
}

/** Token de invitación de la demo: referencia aleatoria, no firma ni HMAC. */
function newToken(): string {
  const bytes = new Uint8Array(18);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Errores de la base se mapean a `AccountCuotasError` para una superficie única. */
function mapError(e: unknown): AccountCuotasError {
  if (e instanceof AccountCuotasError) return e;
  if (e instanceof CuotasError) {
    const code: AccountErrorCode =
      e.code === "not_found" || e.code === "demo_only" || e.code === "not_implemented"
        ? e.code
        : "unavailable";
    return new AccountCuotasError(code, e.message);
  }
  return new AccountCuotasError("unavailable", e instanceof Error ? e.message : undefined);
}

export function createAccountCuotas(base: CuotasClient): AccountCuotasClient {
  const mode = base.mode;
  const hooks = base as CuotasClient & AccountBaseHooks;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const notYet = <T>(what: string): Promise<T> =>
    Promise.reject(new AccountCuotasError("not_implemented", `${what}: pendiente en modo real`));

  /** Reloj de la demo para sellar invitaciones; cae al reloj real si no hay. */
  async function now(): Promise<UnixSeconds> {
    try {
      return (await base.getClock()).now;
    } catch {
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Autoridad admin/keeper. Gana `admin` de la config si existe; en mock sin
   * ese campo usa el fixture declarado. En real jamás hay fixture: sin
   * autoridad en config nadie es admin.
   */
  async function getAuthority(protocol: ProtocolConfig): Promise<AccountAuthority> {
    const ext = protocol as ProtocolConfig & { admin?: WalletAddress; keeper?: WalletAddress };
    if (ext.admin) return { admin: ext.admin, keeper: ext.keeper ?? null, source: "config" };
    if (mode === "mock") {
      return { admin: DEMO_ADMIN, keeper: ext.keeper ?? DEMO_KEEPER, source: "demo-fixture" };
    }
    return { admin: null, keeper: ext.keeper ?? null, source: "config" };
  }

  async function requireAdmin(actor: WalletAddress): Promise<AccountAuthority> {
    let protocol: ProtocolConfig;
    try {
      protocol = await base.getConfig();
    } catch (e) {
      throw mapError(e);
    }
    const authority = await getAuthority(protocol);
    if (!authority.admin || actor !== authority.admin) {
      throw new AccountCuotasError("unauthorized", "El actor no es la autoridad admin");
    }
    return authority;
  }

  async function getAccountConfig(): Promise<AccountConfig> {
    let protocol: ProtocolConfig;
    try {
      protocol = await base.getConfig();
    } catch (e) {
      throw mapError(e);
    }
    return {
      protocol,
      authority: await getAuthority(protocol),
      // Fixtures declarados para la UI: la plata y las identidades de la demo.
      demo:
        mode === "mock"
          ? {
              studentFunds: DEMO_STUDENT_FUNDS,
              admin: DEMO_ADMIN,
              merchant: DEMO_MERCHANT,
              studentNew: DEMO_STUDENT_NEW,
              studentTier3: DEMO_STUDENT_TIER3,
            }
          : null,
    };
  }

  return {
    mode,

    getAccountConfig,

    async resolveAccount(address: WalletAddress): Promise<ResolvedAccount> {
      const config = await getAccountConfig();

      if (config.authority.admin && address === config.authority.admin) {
        return {
          address,
          role: "admin",
          roleEvidence: "authority",
          merchant: null,
          reputation: null,
          reputationStatus: "unavailable",
        };
      }

      // Comercio por cuenta existente. `not_found` sigue a estudiante; un fallo
      // de lectura distinto no concede rol. Si la base aún no implementa, solo
      // el fixture declarado puede resolver comercio en mock.
      try {
        const merchant: Merchant = await base.getMerchant(address);
        return {
          address,
          role: "merchant",
          roleEvidence: "merchant-account",
          merchant,
          reputation: null,
          reputationStatus: "unavailable",
        };
      } catch (e) {
        if (e instanceof CuotasError && e.code === "not_found") {
          // No es comercio: sigue la resolución.
        } else if (e instanceof CuotasError && e.code === "not_implemented" && mode === "mock") {
          if (address === DEMO_MERCHANT) {
            return {
              address,
              role: "merchant",
              roleEvidence: "demo-fixture",
              merchant: null,
              reputation: null,
              reputationStatus: "unavailable",
            };
          }
        } else {
          throw mapError(e);
        }
      }

      // Estudiante por descarte; la reputación no bloquea la entrada.
      let reputation = null;
      let reputationStatus: ReputationStatus = "unavailable";
      try {
        reputation = await base.getReputation(address);
        reputationStatus = "ok";
      } catch (e) {
        reputationStatus =
          e instanceof CuotasError && e.code === "not_found" ? "not_found" : "unavailable";
      }
      return {
        address,
        role: "student",
        roleEvidence: "default",
        merchant: null,
        reputation,
        reputationStatus,
      };
    },

    async getBalance(student: WalletAddress): Promise<StudentBalance> {
      if (mode === "real") return notYet("saldo devUSDC");
      let plans: Plan[];
      try {
        plans = await base.getPlans(student);
      } catch {
        return { available: null, simulated: true, source: "unavailable" };
      }
      const spent = plans.reduce(
        (sum, p) =>
          sum +
          p.downPayment +
          p.installments
            .filter((i) => i.status === "Paid")
            .reduce((s, i) => s + i.amount + i.penalty, 0),
        0,
      );
      return {
        available: Math.max(0, DEMO_STUDENT_FUNDS - spent),
        simulated: true,
        source: "derived",
      };
    },

    async createInvitation(student: WalletAddress): Promise<Invitation> {
      if (mode === "real") return notYet("crear invitación");
      const store = loadStore();
      // Idempotente solo mientras la invitación sigue activa: una ya usada
      // queda resoluble para volver por el enlace, pero el alta pide una nueva.
      const existing = [...store.invitations]
        .reverse()
        .find((i) => i.student === student && !i.completedAt);
      if (existing) return existing;
      const invitation: Invitation = {
        token: newToken(),
        student,
        createdAt: await now(),
        completedAt: null,
      };
      saveStore({ ...store, invitations: [...store.invitations, invitation] });
      notify();
      return invitation;
    },

    async resolveInvitation(token: string): Promise<Invitation> {
      if (mode === "real") return notYet("resolver invitación");
      const invitation = loadStore().invitations.find((i) => i.token === token);
      if (!invitation) {
        throw new AccountCuotasError("invalid_token", "Invitación inválida o vencida");
      }
      return invitation;
    },

    async completeGuarantor(
      token: string,
      args: CompleteGuarantorArgs,
    ): Promise<TxResult<Guarantee>> {
      if (mode === "real") return notYet("alta del fiador");
      const store = loadStore();
      const invitation = store.invitations.find((i) => i.token === token);
      if (!invitation || invitation.completedAt) {
        throw new AccountCuotasError("invalid_token", "Invitación inválida o ya utilizada");
      }
      // El alta delega en la base: nunca un segundo store de Guarantee. El
      // estudiante queda ligado al token aun si args trae extras en runtime.
      let result: TxResult<Guarantee>;
      try {
        result = await base.registerGuarantee({ ...args, student: invitation.student });
      } catch (e) {
        throw mapError(e);
      }
      const completedAt = await now();
      saveStore({
        ...store,
        invitations: store.invitations.map((i) => (i.token === token ? { ...i, completedAt } : i)),
      });
      notify();
      return result;
    },

    async adminSetState(actor: WalletAddress, state: ProtocolState): Promise<ProtocolConfig> {
      await requireAdmin(actor);
      if (!hooks.setProtocolState) {
        throw new AccountCuotasError(
          "not_implemented",
          "requiere hook base.setProtocolState (owner A)",
        );
      }
      try {
        const config = await hooks.setProtocolState(actor, state);
        notify();
        return config;
      } catch (e) {
        throw mapError(e);
      }
    },

    async adminRegisterMerchant(
      actor: WalletAddress,
      args: AdminRegisterMerchantArgs,
    ): Promise<AdminMerchantRef> {
      await requireAdmin(actor);
      if (!hooks.registerMerchantAccount) {
        throw new AccountCuotasError(
          "not_implemented",
          "requiere hook base.registerMerchantAccount (owner A)",
        );
      }
      try {
        const m = await hooks.registerMerchantAccount(actor, args);
        notify();
        return { owner: m.owner, name: m.name, active: m.active, source: "account" };
      } catch (e) {
        throw mapError(e);
      }
    },

    async getAdminSnapshot(actor: WalletAddress): Promise<AdminSnapshot> {
      const authority = await requireAdmin(actor);
      const pending: string[] = [];
      let protocol: ProtocolConfig;
      try {
        protocol = await base.getConfig();
      } catch (e) {
        throw mapError(e);
      }
      const pool = await base.getPool().catch(() => {
        pending.push("pool");
        return null;
      });
      const activity = await base.getActivity().catch(() => {
        pending.push("activity");
        return null;
      });
      const merchants: AdminMerchantRef[] = [];
      try {
        const m = await base.getMerchant(DEMO_MERCHANT);
        merchants.push({ owner: m.owner, name: m.name, active: m.active, source: "account" });
      } catch (e) {
        if (e instanceof CuotasError && e.code === "not_implemented" && mode === "mock") {
          merchants.push({
            owner: DEMO_MERCHANT,
            name: "Tienda Demo",
            active: true,
            source: "demo-fixture",
          });
        } else if (!(e instanceof CuotasError && e.code === "not_found")) {
          pending.push("merchants");
        }
      }
      return { config: protocol, authority, pool, activity, merchants, pending };
    },

    async resetDemo(): Promise<void> {
      // La metadata de cuentas se limpia acá; el estado financiero es de la
      // base, que en real rechaza con `demo_only`.
      clearStore();
      try {
        await base.resetDemo();
      } catch (e) {
        throw mapError(e);
      }
      notify();
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      const offBase = base.subscribe(listener);
      return () => {
        listeners.delete(listener);
        offBase();
      };
    },
  };
}
