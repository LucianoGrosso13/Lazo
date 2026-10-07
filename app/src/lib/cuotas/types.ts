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

/** Cuotas que se pueden pedir al cotizar/abrir un plan. */
export type InstallmentsOption = 1 | 3 | 6;

/** Opción de plan configurable (spec § "Términos del plan"). */
export interface PlanOption {
  installments: 3 | 6;
  /** Interés TOTAL del plan sobre el capital financiado (no anual). */
  interestTotalBps: Bps;
  /** Precio mínimo para ofrecer la opción (micro-USDC); 0 = sin mínimo. */
  minPrice: Micro;
  enabled: boolean;
  /** Términos provisionales: false en el mock; la UI deja de rotular. */
  provisional: boolean;
}

/** Plazo de cobro del comercio. */
export type SettlementId = "immediate" | "deferred_30" | "deferred_60" | "deferred_90";

/** Opción de liquidación del comercio (spec § "Términos del plan"). */
export interface SettlementOption {
  id: SettlementId;
  /** Días desde la compra hasta que el comercio cobra lo financiado. */
  days: number;
  /** Cantidad de tramos mensuales iguales (0 = inmediato). 30→1, 60→2, 90→3. */
  tranches: number;
  /** Comisión sobre lo financiado; null = tarifa a confirmar → no elegible. */
  feeBps: Bps | null;
  enabled: boolean;
  /** Términos provisionales: la UI los rotula. */
  provisional: boolean;
}

export interface PayoutTranche {
  index: number;
  amount: Micro;
  releaseAt: number;
  released: boolean;
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
  /**
   * Opciones de plan (3/6 cuotas). Solo mock: el cliente real no las trae
   * porque el programa on-chain sigue con 3 cuotas fijas. Los helpers de
   * `terms.ts` caen a `installmentsCount` cuando faltan.
   */
  planOptions?: PlanOption[];
  /**
   * Opciones de cobro del comercio. Solo mock: el real cobra siempre al
   * instante. Los helpers de `terms.ts` caen a inmediato con `feeBps`.
   */
  settlementOptions?: SettlementOption[];
  /** Originación D8 (bps de lo financiado, incluida en la comisión). */
  originationBps?: Bps;
  /** Administración anual D8 (bps sobre saldo; la paga el pool). */
  adminFeeAnnualBps?: Bps;
  guaranteedTiers: [TierParams, TierParams, TierParams, TierParams];
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
  /** Solo la emite el mock: margen de crédito por escalón (varios planes en
   * paralelo). El cliente real sigue emitiendo `has_active_plan` porque el
   * programa on-chain fuerza un plan por estudiante vía PDA. */
  | "exceeds_credit_limit"
  | "exceeds_guarantor_max_purchase"
  | "exceeds_guarantee_coverage"
  | "no_guarantee"
  | "guarantor_required"
  | "below_option_min"
  | "pool_liquidity"
  | "blocked_after_default"
  | "has_active_plan"
  | "protocol_halted"
  /** La opción de plan/cobro pedida no existe, está deshabilitada o no tiene
   * tarifa (el real la emite para todo lo que el programa no soporta). */
  | "option_unavailable";

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
  /** Cobro del comercio el día de la compra (todo si la liquidación es inmediata). */
  merchantAdvance: Micro;
  /** Cobro diferido del comercio, a `settlementDays` días (0 si es inmediata). */
  merchantPending: Micro;
  /** Calendario de tramos de cobro del comercio (vacío si es cobro inmediato). */
  payoutTranches: PayoutTranche[];
  requiredCoverage: Micro;
  /** Cantidad de cuotas de la opción cotizada. */
  installmentsCount: number;
  /** Interés total aplicado sobre lo financiado, en bps. */
  interestTotalBps: Bps;
  /** Liquidación del comercio cotizada. */
  settlementId: SettlementId;
  /** Días hasta el cobro diferido del comercio (0 = inmediato). */
  settlementDays: number;
  /** Alguna opción cotizada es provisional: la UI lo rotula. */
  provisional: boolean;
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

/**
 * Copia inmutable de los términos con los que se abrió el plan: si la config
 * cambia después, el plan sigue mostrando lo que se firmó.
 */
export interface PlanTerms {
  /** Versión del formato de términos (`PLAN_TERMS_VERSION` en terms.ts). */
  termsVersion: number;
  /** Cuotas de la opción elegida al abrir. */
  installmentsCount: number;
  /** Interés total sobre lo financiado, en bps. */
  interestTotalBps: Bps;
  /** Anticipo aplicado, en bps del precio. */
  downPaymentBps: Bps;
  /** Cobertura del fiador aplicada, en bps de lo financiado. */
  coverageBps: Bps;
  /** Liquidación del comercio elegida al abrir. */
  settlementId: SettlementId;
  /** Días hasta el cobro diferido (0 = inmediato). */
  settlementDays: number;
  /** Comisión aplicada sobre lo financiado, en bps. */
  settlementFeeBps: Bps;
  /** Alguna opción elegida era provisional: la UI lo rotula. */
  provisional: boolean;
}

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
  /** Términos con los que se abrió el plan (cuotas, interés, liquidación, cobertura). */
  terms: PlanTerms;
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
  /** Liquidación elegida al abrir la venta ("immediate" si falta). */
  settlementId?: SettlementId;
  /** Días de espera hasta el cobro diferido (0 si falta). */
  settlementDays?: number;
  /** Fecha de cobro del monto diferido; ventas viejas sin campo = cobradas. */
  settlementAt?: UnixSeconds;
  /** Monto aún pendiente de cobro diferido (0 si falta o ya cobrada). */
  pendingSettlement?: Micro;
  /** true cuando el cobro diferido ya se acreditó (true si falta). */
  settled?: boolean;
  /** Tramos de cobro diferido del comercio. */
  payoutTranches?: PayoutTranche[];
}

/** Espejo de `Merchant` + saldo de su ATA de cobro. */
export interface Merchant {
  owner: WalletAddress;
  name: string;
  active: boolean;
  settlementBalance: Micro;
  plansCount: number;
  sales: Sale[];
  /** Liquidación predeterminada para compras nuevas ("immediate" si falta). */
  settlementId?: SettlementId;
  /** Suma pendiente de cobro diferido de las ventas abiertas (0 si falta). */
  pendingSettlement?: Micro;
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
  | "GuaranteeRevoked"
  | "PayoutReleased";

/** Bitácora para la UI (avisos, línea de tiempo de la mora). */
export interface Activity {
  kind: ActivityKind;
  at: UnixSeconds;
  student?: WalletAddress;
  merchant?: WalletAddress;
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

/** Orden generada en el mostrador del comercio para cobrar por link/QR. */
export interface CounterOrder {
  id: string;
  merchant: WalletAddress;
  amount: Micro;
  description: string;
  createdAt: UnixSeconds;
  expiresAt: UnixSeconds;
  status: "open" | "paid" | "expired";
  planId?: string;
}

export interface CreateCounterOrderArgs {
  amount: Micro;
  description: string;
}

export interface OpenPlanArgs {
  student: WalletAddress;
  merchant: WalletAddress;
  price: Micro;
  productId?: string;
  /** Cuotas pedidas (mock: 3 ó 6; el real solo soporta la del programa). */
  installments?: InstallmentsOption;
  /** Liquidación pedida; sin valor usa el predeterminado del comercio. */
  settlement?: SettlementId;
  /** Orden de mostrador asociada: toma precio y comercio de ella y la marca paid. */
  orderId?: string;
}

/** Opciones pedidas al cotizar: plan de cuotas y plazo de cobro del comercio. */
export interface QuoteOptions {
  installments?: InstallmentsOption;
  settlement?: SettlementId;
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
  quote(
    price: Micro,
    student: WalletAddress,
    options?: QuoteOptions,
  ): Promise<Quote>;
  getPlans(student: WalletAddress): Promise<Plan[]>;
  getMerchant(owner: WalletAddress): Promise<Merchant>;
  /** Fija la liquidación predeterminada del comercio para compras nuevas.
   * Solo mock: el programa on-chain cobra siempre al instante, así que el
   * cliente real la rechaza con `option_unavailable`. */
  setMerchantSettlement(
    owner: WalletAddress,
    settlement: SettlementId,
  ): Promise<Merchant>;
  getPool(): Promise<Pool>;
  getActivity(filter?: {
    student?: WalletAddress;
    merchant?: WalletAddress;
    planId?: string;
  }): Promise<Activity[]>;

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

  /** Mostrador: crea una orden de cobro con vencimiento a 24 horas. */
  createCounterOrder(
    merchant: WalletAddress,
    args: CreateCounterOrderArgs,
  ): Promise<CounterOrder>;
  /** Mostrador: consulta una orden por su id. */
  getCounterOrder(id: string): Promise<CounterOrder>;
  /** Mostrador: lista las órdenes de un comercio. */
  listCounterOrders(merchant: WalletAddress): Promise<CounterOrder[]>;

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
      | "order_unavailable"
      | RealErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CuotasError";
  }
}
