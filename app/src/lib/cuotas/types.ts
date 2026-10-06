// Tipos de la interfaz única hacia la cadena (ver `src/lib/cuotas.ts`).
// Los nombres espejan las cuentas e instrucciones del programa Anchor
// (`proyecto/03-brief-companero.md`). Montos en micro-USDC enteros
// (6 decimales, como el mint devUSDC): 1 USDC = 1_000_000.

export type Micro = number;
export type Bps = number;
/** Dirección base58 de una wallet o cuenta. */
export type WalletAddress = string;
/** Segundos unix. En el mock salen del reloj de demo. */
export type UnixSeconds = number;

export type TierIndex = 0 | 1 | 2 | 3;

export interface TierParams {
  downPaymentBps: Bps;
  guarantorCoverageBps: Bps;
  maxPurchase: Micro;
  interestBps: Bps;
}

export type ProtocolState = "Normal" | "Halted" | "WithdrawsOnly";

/** Espejo de `ProtocolConfig`. Ningún número de negocio vive fuera de acá. */
export interface ProtocolConfig {
  /** Autoridad admin onchain. Presente en modo real; ausente en el mock. */
  admin?: WalletAddress;
  /** Autoridad del keeper onchain. Presente en modo real; ausente en el mock. */
  keeper?: WalletAddress;
  feeBps: Bps;
  penaltyBps: Bps;
  graceDays: number;
  /** Día del aviso al fiador. Regla de `02-validacion.md` (ronda 2, Q2); off-chain. */
  guarantorNoticeDay: number;
  guarantorChargeDay: number;
  secondsPerDay: number;
  installmentsCount: number;
  /**
   * Días entre vencimientos (`installment_interval_days` onchain). Presente
   * en modo real; el mock usa 30 fijo en la UI y lo omite.
   */
  installmentIntervalDays?: number;
  guaranteedTiers: [TierParams, TierParams, TierParams, TierParams];
  unguaranteedTiers: [TierParams, TierParams];
  minFinancedToCount: Micro;
  state: ProtocolState;
  usdcMint: WalletAddress;
  cluster: "devnet";
}

/** Espejo de `Reputation` (PDA ["reputation", student]). */
export interface Reputation {
  student: WalletAddress;
  tier: TierIndex;
  plansCompleted: number;
  lateCount: number;
  activeExposure: Micro;
  /** Después de un cobro al fiador no puede abrir planes nuevos. */
  blockedFromNewPlans: boolean;
}

/** Espejo de `Guarantee` (PDA ["guarantee", student]). El fiador no tiene wallet. */
export interface Guarantee {
  student: WalletAddress;
  maxPurchase: Micro;
  coverageMax: Micro;
  /** SHA-256 en hex del PDF de la fianza. */
  mandateHash: string;
  active: boolean;
  registeredAt: UnixSeconds;
  /** Datos de presentación que viven off-chain (ej. "Visa •••• 4242", "Fiador de ejemplo"). */
  display?: { guarantorName?: string; cardLabel?: string };
}

export type QuoteBlockReason =
  | "exceeds_tier_max"
  | "exceeds_guarantor_max_purchase"
  | "exceeds_guarantee_coverage"
  | "no_guarantee"
  | "blocked_after_default"
  | "has_active_plan"
  | "protocol_halted";

export interface Quote {
  price: Micro;
  tier: TierIndex;
  withGuarantee: boolean;
  downPayment: Micro;
  financed: Micro;
  /** Montos de cada cuota; la última absorbe el redondeo. */
  installments: Micro[];
  interest: Micro;
  total: Micro;
  merchantFee: Micro;
  merchantReceives: Micro;
  requiredCoverage: Micro;
  eligible: boolean;
  reasons: QuoteBlockReason[];
}

export type InstallmentStatus =
  | "Upcoming"
  | "Due"
  | "Grace"
  | "Late"
  | "Paid"
  | "ChargedToGuarantor";

export interface Installment {
  index: number;
  amount: Micro;
  dueAt: UnixSeconds;
  penalty: Micro;
  status: InstallmentStatus;
  paidAt?: UnixSeconds;
  signature?: string;
}

export type PlanStatus = "Active" | "Late" | "Settled" | "Recovered";

/** Espejo de `Plan`. */
export interface Plan {
  id: string;
  student: WalletAddress;
  merchant: WalletAddress;
  productId?: string;
  price: Micro;
  downPayment: Micro;
  financed: Micro;
  merchantFee: Micro;
  installments: Installment[];
  openedAt: UnixSeconds;
  status: PlanStatus;
  /** Si sigue contando para subir de escalón (≥ min financiado y sin pasar la gracia). */
  counts: boolean;
  signature: string;
}

export interface Sale {
  planId: string;
  price: Micro;
  downPayment: Micro;
  financed: Micro;
  fee: Micro;
  received: Micro;
  at: UnixSeconds;
  signature: string;
}

/** Espejo de `Merchant` + saldo de su ATA de cobro. */
export interface Merchant {
  owner: WalletAddress;
  name: string;
  active: boolean;
  settlementBalance: Micro;
  plansCount: number;
  sales: Sale[];
}

export type PoolEventKind = "Deposit" | "Advance" | "Repayment" | "Recovery" | "Loss";

export interface PoolEvent {
  kind: PoolEventKind;
  amount: Micro;
  at: UnixSeconds;
  signature: string;
  planId?: string;
  tranche?: "junior" | "senior";
  /** Hash del comprobante del cobro al fiador (keeper_register_recovery). */
  receiptHash?: string;
}

/** Espejo de `Pool` + vault. */
export interface Pool {
  juniorCapital: Micro;
  seniorCapital: Micro;
  outstandingCredit: Micro;
  accruedFees: Micro;
  /** Liquidez del vault no adelantada. */
  available: Micro;
  nav: Micro;
  events: PoolEvent[];
}

export type ActivityKind =
  | "PlanOpened"
  | "InstallmentPaid"
  | "GuarantorNotified"
  | "MarkedLate"
  | "GuarantorCharged"
  | "RecoveryRegistered"
  | "TierUp"
  | "TierDown"
  | "GuaranteeRegistered"
  | "GuaranteeRevoked";

/** Bitácora para la UI (avisos, línea de tiempo de la mora). */
export interface Activity {
  kind: ActivityKind;
  at: UnixSeconds;
  student?: WalletAddress;
  planId?: string;
  amount?: Micro;
  signature?: string;
}

export interface DemoClock {
  now: UnixSeconds;
  secondsPerDay: number;
  /** Días que se adelantaron con `advanceDays` (0 en la implementación real). */
  daysAdvanced: number;
}

export interface OpenPlanArgs {
  student: WalletAddress;
  merchant: WalletAddress;
  price: Micro;
  productId?: string;
}

export interface RegisterGuaranteeArgs {
  student: WalletAddress;
  maxPurchase: Micro;
  coverageMax: Micro;
  mandateHash: string;
  display?: Guarantee["display"];
}

export interface TxResult<T> {
  value: T;
  signature: string;
}

/**
 * Interfaz única hacia la cadena. La implementan el mock (memoria + localStorage,
 * reloj de demo) y la real (cliente Codama en `src/generated/`).
 */
export interface CuotasClient {
  readonly mode: "mock" | "real";

  getConfig(): Promise<ProtocolConfig>;
  getClock(): Promise<DemoClock>;
  getReputation(student: WalletAddress): Promise<Reputation>;
  getGuarantee(student: WalletAddress): Promise<Guarantee | null>;
  quote(price: Micro, student: WalletAddress): Promise<Quote>;
  getPlans(student: WalletAddress): Promise<Plan[]>;
  getMerchant(owner: WalletAddress): Promise<Merchant>;
  getPool(): Promise<Pool>;
  getActivity(filter?: { student?: WalletAddress; planId?: string }): Promise<Activity[]>;

  /** `student_init_reputation` (idempotente desde la UI). */
  initReputation(student: WalletAddress): Promise<TxResult<Reputation>>;
  /** `open_plan`: anticipo → comercio, pool → comercio (menos fee) y se crea el Plan. Si el estudiante todavía no tiene Reputation on-chain, la misma transacción la crea primero (`student_init_reputation` + `open_plan`, una firma). */
  openPlan(args: OpenPlanArgs): Promise<TxResult<Plan>>;
  /** `pay_installment`: paga la próxima cuota impaga (con punitorio si corresponde). */
  payInstallment(student: WalletAddress, planId: string): Promise<TxResult<Plan>>;
  /** `keeper_register_guarantee` (lo firma el keeper; en el mock, directo). */
  registerGuarantee(args: RegisterGuaranteeArgs): Promise<TxResult<Guarantee>>;
  /** `keeper_revoke_guarantee`. */
  revokeGuarantee(student: WalletAddress): Promise<TxResult<Guarantee>>;

  /** Solo modo demo: adelanta el reloj y corre el keeper (mora, aviso, cobro al fiador). */
  advanceDays(days: number): Promise<DemoClock>;
  /** Solo modo demo: vuelve al estado inicial con datos de ejemplo. */
  resetDemo(): Promise<void>;

  /** Avisa cuando cambia el estado (para refrescar la UI). Devuelve la desuscripción. */
  subscribe(listener: () => void): () => void;
}

export type RealErrorCode =
  /** Sin wallet conectada para firmar. La UI pide conectar Phantom. */
  | "wallet_required"
  /** La wallet conectada no es la autoridad requerida (admin/keeper/estudiante). */
  | "unauthorized"
  /** El RPC no es devnet (verificación por hash de génesis). */
  | "wrong_cluster"
  /** La simulación previa a la firma falló: no se pide aprobación. */
  | "simulation_failed"
  /** Revisión explícita rechazada: cero firmas, cero envíos. */
  | "review_rejected"
  /** La wallet no firma la versión de transacción pedida. */
  | "unsupported_version"
  /** Fallo de red, RPC o confirmación: reintentar. No inventa datos. */
  | "unavailable";

export class CuotasError extends Error {
  constructor(
    public readonly code:
      | QuoteBlockReason
      | "not_found"
      | "nothing_due"
      | "demo_only"
      | "not_implemented"
      | RealErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CuotasError";
  }
}
