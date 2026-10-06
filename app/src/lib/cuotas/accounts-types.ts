// Tipos del contrato aditivo de cuentas (`.scratch/app-cuentas/account-api.md`).
// Solo metadatos de cuenta: nunca duplica planes, pool ni reloj financieros,
// que siguen saliendo del `CuotasClient` base.
import { toMicro } from "./format";
import type {
  Activity,
  Guarantee,
  Merchant,
  Micro,
  Pool,
  ProtocolConfig,
  ProtocolState,
  Reputation,
  TxResult,
  UnixSeconds,
  WalletAddress,
} from "./types";

export type AccountRole = "admin" | "merchant" | "student";

/** De dónde salió la autoridad admin. En real nunca hay fixture: sin autoridad se falla cerrado. */
export interface AccountAuthority {
  admin: WalletAddress | null;
  keeper: WalletAddress | null;
  source: "config" | "demo-fixture";
}

/** Datos de prueba declarados del mock para la UI. En real es `null`. */
export interface AccountDemoInfo {
  /** Fondos simulados con los que arranca un estudiante de la demo. */
  studentFunds: Micro;
  /** Identidades de ejemplo con wallet simulada (fixtures, no devnet). */
  admin: WalletAddress;
  merchant: WalletAddress;
  studentNew: WalletAddress;
  studentTier3: WalletAddress;
}

export interface AccountConfig {
  protocol: ProtocolConfig;
  authority: AccountAuthority;
  demo: AccountDemoInfo | null;
}

export type RoleEvidence = "authority" | "merchant-account" | "demo-fixture" | "default";
export type ReputationStatus = "ok" | "not_found" | "unavailable";

export interface ResolvedAccount {
  address: WalletAddress;
  role: AccountRole;
  roleEvidence: RoleEvidence;
  /** Solo si `role === "merchant"` y la base lo resolvió. */
  merchant: Merchant | null;
  /** Solo estudiantes. */
  reputation: Reputation | null;
  /** `not_found` = todavía no existe; la UI ofrece crearla con revisión. */
  reputationStatus: ReputationStatus;
}

export interface StudentBalance {
  /** `null` = no se pudo determinar; la UI declara indisponibilidad, no inventa. */
  available: Micro | null;
  /** En mock siempre `true`: es plata de prueba. En real es devUSDC de devnet. */
  simulated: boolean;
  source: "derived" | "onchain" | "unavailable";
}

/** Metadata de la invitación al fiador. El token no firma nada: es una referencia demo. */
export interface Invitation {
  token: string;
  student: WalletAddress;
  createdAt: UnixSeconds;
  /** Una invitación usada sigue resolviendo para volver por el mismo enlace. */
  completedAt: UnixSeconds | null;
}

/** Lo que el fiador completa; `student` sale del token, nunca del cliente. */
export interface CompleteGuarantorArgs {
  maxPurchase: Micro;
  coverageMax: Micro;
  mandateHash: string;
  display?: Guarantee["display"];
}

export interface AdminRegisterMerchantArgs {
  owner: WalletAddress;
  name: string;
}

export interface AdminMerchantRef {
  owner: WalletAddress;
  name: string | null;
  active: boolean;
  source: "account" | "demo-fixture";
}

export interface AdminSnapshot {
  config: ProtocolConfig;
  authority: AccountAuthority;
  pool: Pool | null;
  activity: Activity[] | null;
  merchants: AdminMerchantRef[];
  /** Secciones que la base todavía no responde (ej. "pool", "activity"). */
  pending: string[];
}

export type AccountErrorCode =
  | "not_found"
  | "invalid_token"
  /** Invitación vencida: el estudiante emite un enlace nuevo. */
  | "expired"
  | "unauthorized"
  | "unavailable"
  | "not_implemented"
  | "demo_only";

export class AccountCuotasError extends Error {
  constructor(
    public readonly code: AccountErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AccountCuotasError";
  }
}

/**
 * Mutaciones financieras que solo la base puede ejecutar con consistencia.
 * `accounts.ts` las detecta en runtime sobre el objeto base: mientras el owner
 * del mock no las exponga, las operaciones admin autorizan y rechazan
 * `not_implemented` identificado.
 */
export interface AccountBaseHooks {
  /** Espeja `admin_set_state`: muta `ProtocolConfig.state`. */
  setProtocolState?(actor: WalletAddress, state: ProtocolState): Promise<ProtocolConfig>;
  /** Espeja `merchant_register`: crea la cuenta `Merchant`. */
  registerMerchantAccount?(
    actor: WalletAddress,
    args: AdminRegisterMerchantArgs,
  ): Promise<Merchant>;
  /**
   * Balance devUSDC onchain del ATA canónico del dueño (0 si no existe).
   * Lo implementa la base real; el mock no lo expone (usa el derivado).
   */
  getDevUsdcBalance?(owner: WalletAddress): Promise<Micro>;
  /**
   * Comercios registrados onchain (barrido por discriminador). Lo implementa
   * la base real; sin él, el snapshot marca "merchants" como pendiente.
   */
  listMerchants?(): Promise<AdminMerchantRef[]>;
}

export interface AccountCuotasClient {
  readonly mode: "mock" | "real";

  getAccountConfig(): Promise<AccountConfig>;
  resolveAccount(address: WalletAddress): Promise<ResolvedAccount>;
  getBalance(student: WalletAddress): Promise<StudentBalance>;

  createInvitation(student: WalletAddress): Promise<Invitation>;
  resolveInvitation(token: string): Promise<Invitation>;
  completeGuarantor(token: string, args: CompleteGuarantorArgs): Promise<TxResult<Guarantee>>;

  adminSetState(actor: WalletAddress, state: ProtocolState): Promise<ProtocolConfig>;
  adminRegisterMerchant(
    actor: WalletAddress,
    args: AdminRegisterMerchantArgs,
  ): Promise<AdminMerchantRef>;
  getAdminSnapshot(actor: WalletAddress): Promise<AdminSnapshot>;

  /**
   * Reinicia la demo completa: limpia la metadata de cuentas (invitaciones)
   * y delega el estado financiero a `base.resetDemo()`. En real la base
   * rechaza con `demo_only`. La selección de UI se limpia aparte
   * (`resetDemoUiState` en `lib/roles.ts`).
   */
  resetDemo(): Promise<void>;

  subscribe(listener: () => void): () => void;
}

// --- Fixtures de la demo ----------------------------------------------------
// Direcciones de datos de prueba del mock. No son cuentas devnet reales: la UI
// las presenta como ejemplos simulados.

/** Admin de ejemplo: autoridad mientras `ProtocolConfig` no expone `admin`. */
export const DEMO_ADMIN: WalletAddress = "LazoAdminDemo1111111111111111111111111111111";
/** Keeper de ejemplo, misma convención. */
export const DEMO_KEEPER: WalletAddress = "LazoKeeperDemo11111111111111111111111111111";
/** Estudiante nuevo de ejemplo (sin reputación creada todavía). */
export const DEMO_STUDENT_NEW: WalletAddress = "LazoEstudianteNuevo1111111111111111111111";
/** Fondos simulados con los que arranca un estudiante de la demo. */
export const DEMO_STUDENT_FUNDS: Micro = toMicro(2000);
