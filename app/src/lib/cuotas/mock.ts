// Implementación mock de `CuotasClient`: estado en memoria + localStorage
// (SSR-safe), reloj de demo y keeper simulado. Reglas de negocio:
// `proyecto/02-validacion.md` (rondas 1-4 y decisiones de precio) y
// `.scratch/lazo-front/spec.md`. Ningún número de negocio va hardcodeado:
// todo sale de `state.config` (sembrado desde `demo-config.ts`).
import { DEMO_CONFIG } from "./demo-config";
import { DEMO_STUDENT_FUNDS } from "./accounts-types";
import {
  PLAN_TERMS_VERSION,
  planOptionsOf,
  quoteTerms,
  settlementOptionOf,
  settlementOptionsOf,
} from "./terms";
import { CuotasError } from "./types";
import type {
  Activity,
  CounterOrder,
  CreateCounterOrderArgs,
  CuotasClient,
  DemoClock,
  Guarantee,
  Micro,
  OperationSnapshot,
  Plan,
  PlanTerms,
  Pool,
  ProtocolConfig,
  Quote,
  QuoteBlockReason,
  QuoteOptions,
  ReconcileOutcome,
  Reputation,
  SettlementId,
  TxPhase,
  TxProgressListener,
  TxResult,
  UnixSeconds,
  WalletAddress,
} from "./types";
import {
  bpsOf,
  ensureStudent,
  fakeReceiptHash,
  fakeSignature,
  loadState,
  now,
  persistState,
  seedState,
  type MockInstallment,
  type MockPlan,
  type MockState,
} from "./mock/state";

/** Overrides para tests/demos puntuales (solo aplican si no hay estado guardado). */
export interface MockOverrides {
  config?: Partial<ProtocolConfig>;
  pool?: Partial<Pool>;
  /** Fondos devUSDC simulados por estudiante (default `DEMO_STUDENT_FUNDS`). */
  studentFunds?: Micro;
}

/** Emite una fase de progreso; un listener que lanza nunca rompe la operación. */
function emitProgress(
  listener: TxProgressListener | undefined,
  phase: TxPhase,
  signature?: string,
): void {
  if (!listener) return;
  try {
    listener({ phase, signature });
  } catch {
    // El listener es observador: su error no puede abortar la operación.
  }
}

const clone = <T>(value: T): T => structuredClone(value);

/** Quita las marcas internas del keeper antes de exponer la cuota. */
function toPublicInstallment(i: MockInstallment) {
  return {
    index: i.index,
    amount: i.amount,
    dueAt: i.dueAt,
    penalty: i.penalty,
    status: i.status,
    paidAt: i.paidAt,
    signature: i.signature,
  };
}

function toPublicPlan(p: MockPlan): Plan {
  return {
    ...p,
    installments: p.installments.map(toPublicInstallment),
    // Los términos son inmutables: el plan devuelto no comparte referencia.
    terms: clone(p.terms),
  };
}

function computeQuote(
  state: MockState,
  price: Micro,
  student: WalletAddress,
  options: QuoteOptions | undefined,
  /** Saldo devUSDC simulado del estudiante (mismo criterio que `getBalance`). */
  funds: Micro,
): Quote {
  const cfg = state.config;
  const rep = state.reputations[student];
  const guarantee = state.guarantees[student];
  const withGuarantee = guarantee?.active === true;
  const tierParams = cfg.guaranteedTiers[rep.tier];

  // Opción de plan pedida o por defecto (la primera habilitada; histórico:
  // `installmentsCount`). Inexistente o deshabilitada → `option_unavailable`,
  // igual que una liquidación deshabilitada o con tarifa sin definir (null).
  const planOpts = planOptionsOf(cfg);
  const installmentsReq =
    options?.installments ??
    planOpts.find((o) => o.enabled)?.installments ??
    cfg.installmentsCount;
  const planOpt = planOpts.find((o) => o.installments === installmentsReq);
  const settlementReq: SettlementId = options?.settlement ?? "immediate";
  const settleOpt = settlementOptionsOf(cfg).find(
    (o) => o.id === settlementReq,
  );

  const reasons: QuoteBlockReason[] = [];
  if (
    !planOpt?.enabled ||
    !settleOpt?.enabled ||
    settleOpt.feeBps === null
  ) {
    reasons.push("option_unavailable");
  }

  if (planOpt && planOpt.minPrice > 0 && price < planOpt.minPrice) {
    reasons.push("below_option_min");
  }

  const n = planOpt?.installments ?? (installmentsReq === 6 ? 6 : 3);
  // El cálculo puro vive en `terms.ts` y lo comparten las pantallas sin
  // wallet: opción faltante → 0 interés propio, plazo faltante → `feeBps`
  // histórico y 0 días (los números salen igual aunque la opción no sea
  // elegible, como siempre).
  const terms = quoteTerms({
    price,
    tier: tierParams,
    plan: {
      installments: n,
      interestTotalBps: planOpt?.interestTotalBps ?? 0,
    },
    settlement: {
      days: settleOpt?.days ?? 0,
      feeBps: settleOpt?.feeBps ?? cfg.feeBps,
      tranches: settleOpt?.tranches ?? 0,
    },
    openedAt: now(state),
    secondsPerDay: cfg.secondsPerDay,
  });
  const {
    downPayment,
    financed,
    interest,
    repayable,
    installments,
    interestTotalBps,
    merchantFee,
    requiredCoverage,
    settlementDays,
    merchantReceives,
    merchantAdvance,
    merchantPending,
    payoutTranches,
  } = terms;

  if (cfg.state !== "Normal") reasons.push("protocol_halted");
  if (rep.blockedFromNewPlans) reasons.push("blocked_after_default");
  if (!withGuarantee) reasons.push("guarantor_required");
  if (price > tierParams.maxPurchase) reasons.push("exceeds_tier_max");
  // Margen de crédito por escalón (solo mock, decisión del usuario): el
  // `maxPurchase` del escalón hace doble función — tope por compra y línea
  // de crédito total, como el margen de una tarjeta. Varios planes en
  // paralelo mientras `activeExposure + repayable ≤ maxPurchase`.
  // Divergencia conocida: el programa on-chain fuerza UN plan por estudiante
  // (Plan PDA con seeds [PLAN_SEED, student], `init` falla si existe) y el
  // cliente real emite `has_active_plan`. Ver `.scratch/demo-polish/spec.md`
  // §"Divergencia conocida".
  if (rep.activeExposure + repayable > tierParams.maxPurchase) {
    reasons.push("exceeds_credit_limit");
  }
  if (withGuarantee && guarantee) {
    if (price > guarantee.maxPurchase)
      reasons.push("exceeds_guarantor_max_purchase");
    if (requiredCoverage > guarantee.coverageMax)
      reasons.push("exceeds_guarantee_coverage");
  }

  // Chequeo de liquidez libre del pool:
  // pool.liquid ≥ desembolso de hoy + Σ tramos no liberados de todos los comercios
  const existingPending = Object.values(state.merchants).reduce(
    (sum, m) => sum + (m.pendingSettlement ?? 0),
    0,
  );
  const requiredPoolLiquidity =
    (settlementDays === 0 ? financed - merchantFee : 0) +
    existingPending +
    merchantPending;
  if (state.pool.available < requiredPoolLiquidity) {
    reasons.push("pool_liquidity");
  }
  // Va última: si hay otro bloqueo (fiador, escalón, liquidez) es más
  // accionable que "te falta saldo".
  if (funds < downPayment) {
    reasons.push("insufficient_funds");
  }

  return {
    price,
    tier: rep.tier,
    withGuarantee,
    downPayment,
    financed,
    installments,
    interest,
    total: price + interest,
    merchantFee,
    merchantReceives,
    merchantAdvance,
    merchantPending,
    payoutTranches,
    requiredCoverage,
    installmentsCount: n,
    interestTotalBps,
    settlementId: settlementReq,
    settlementDays,
    provisional: (planOpt?.provisional ?? false) || (settleOpt?.provisional ?? false),
    eligible: reasons.length === 0,
    reasons,
  };
}

export function createMockCuotas(overrides: MockOverrides = {}): CuotasClient {
  const seedConfig = { ...DEMO_CONFIG, ...overrides.config };
  const listeners = new Set<() => void>();
  let state: MockState;

  const persist = () => persistState(state);
  const notify = () => listeners.forEach((l) => l());
  const commit = () => {
    persist();
    notify();
  };
  /**
   * Acomoda estado persistido de versiones viejas: planes sin `terms` (se
   * reconstruyen de sus montos y la config) y ventas/comercios sin los campos
   * de liquidación (faltantes = inmediato, ya cobrado, pendiente 0).
   */
  const normalize = (s: MockState): MockState => {
    for (const p of s.plans) {
      if (p.terms) continue;
      const rep = s.reputations[p.student];
      const tier = s.config.guaranteedTiers[rep?.tier ?? 0];
      const repaid = p.installments.reduce((a, i) => a + i.amount, 0);
      const interest = Math.max(0, repaid - p.financed);
      p.terms = {
        termsVersion: PLAN_TERMS_VERSION,
        installmentsCount: p.installments.length,
        interestTotalBps:
          p.financed > 0 ? Math.round((interest * 10_000) / p.financed) : 0,
        downPaymentBps:
          p.price > 0 ? Math.round((p.downPayment * 10_000) / p.price) : 0,
        coverageBps: tier.guarantorCoverageBps,
        settlementId: "immediate",
        settlementDays: 0,
        settlementFeeBps:
          p.financed > 0
            ? Math.round((p.merchantFee * 10_000) / p.financed)
            : s.config.feeBps,
        provisional: false,
      };
    }
    s.counterOrders ??= {};
    s.orderSeq ??= 0;
    for (const m of Object.values(s.merchants)) {
      m.settlementId ??= "immediate";
      m.pendingSettlement ??= m.sales.reduce(
        (a, sale) => a + (sale.pendingSettlement ?? 0),
        0,
      );
      for (const sale of m.sales) {
        sale.settlementId ??= "immediate";
        sale.settlementDays ??= 0;
        sale.settlementAt ??= sale.at;
        sale.pendingSettlement ??= 0;
        sale.settled ??= true;
        sale.payoutTranches ??= [];
      }
    }
    return s;
  };
  state = normalize(loadState() ?? seedState(seedConfig));
  if (overrides.pool) {
    state.pool = { ...state.pool, ...overrides.pool };
  }
  /** Relee el estado persistido (otra instancia pudo haberlo cambiado). */
  const refresh = () => {
    const loaded = loadState();
    if (loaded) state = normalize(loaded);
  };

  const activity = (
    entry: Omit<Activity, "at" | "signature"> & { at?: UnixSeconds },
  ) => {
    state.activity.push({
      ...entry,
      at: entry.at ?? now(state),
      signature: fakeSignature(),
    });
  };

  /**
   * Recalcula el estado del plan según sus cuotas y, si se salda un plan que
   * cuenta, sube el escalón. Devuelve true si cambió algo.
   */
  const settleOrRefresh = (plan: MockPlan): boolean => {
    if (plan.status === "Recovered") return false;
    const unpaid = plan.installments.filter(
      (i) => i.paidAt === undefined && i.chargedAt === undefined,
    );
    const prev = plan.status;
    plan.status =
      unpaid.length === 0
        ? "Settled"
        : unpaid.some((i) => i.status === "Late")
          ? "Late"
          : "Active";
    if (plan.status === "Settled" && prev !== "Settled" && plan.counts) {
      const rep = state.reputations[plan.student];
      rep.plansCompleted += 1;
      if (rep.tier < 3) {
        rep.tier = (rep.tier + 1) as Reputation["tier"];
        activity({ kind: "TierUp", student: plan.student, planId: plan.id });
      }
      return true;
    }
    return plan.status !== prev;
  };

  /**
   * El keeper le cobra al fiador las cuotas dadas (principal + punitorio),
   * registra el recupero en el pool y castiga la reputación. Replica
   * `keeper_register_recovery`: el comprobante del procesador queda como
   * `receiptHash` en el evento `Recovery`.
   */
  const chargeToGuarantor = (
    plan: MockPlan,
    installments: MockInstallment[],
    at: UnixSeconds,
  ) => {
    const rep = state.reputations[plan.student];
    let principal = 0;
    let total = 0;
    for (const i of installments) {
      principal += i.amount;
      total += i.amount + i.penalty;
      i.chargedAt = at;
      i.status = "ChargedToGuarantor";
    }
    state.pool.events.push({
      kind: "Recovery",
      amount: total,
      at,
      signature: fakeSignature(),
      planId: plan.id,
      receiptHash: fakeReceiptHash(),
    });
    state.pool.outstandingCredit -= principal;
    state.pool.available += total;
    state.pool.nav = state.pool.available + state.pool.outstandingCredit;
    rep.lateCount += 1;
    rep.blockedFromNewPlans = true;
    // Las cuotas cobradas al fiador también salen del margen (mismo criterio:
    // exposure = Σ amounts de cuotas sin pagar ni cobrar).
    rep.activeExposure = Math.max(0, rep.activeExposure - principal);
    activity({
      kind: "GuarantorCharged",
      student: plan.student,
      planId: plan.id,
      amount: total,
      at,
    });
    activity({
      kind: "RecoveryRegistered",
      student: plan.student,
      planId: plan.id,
      amount: total,
      at,
    });
    if (rep.tier > 0) {
      rep.tier = (rep.tier - 1) as Reputation["tier"];
      activity({ kind: "TierDown", student: plan.student, planId: plan.id, at });
    }
  };

  /**
   * Keeper simulado (idempotente): recorre las cuotas impagas y aplica la
   * línea de mora del reloj de demo — aviso al fiador (día 3), punitorio
   * (día 6) y cobro al fiador (día 15). Una segunda cuota al día 15 caduca
   * los plazos y le cobra todo el saldo al fiador (plan Recovered).
   */
  const applyKeeper = (): boolean => {
    const cfg = state.config;
    const spd = cfg.secondsPerDay;
    const t = now(state);
    let changed = false;

    for (const plan of state.plans) {
      if (plan.status === "Settled" || plan.status === "Recovered") continue;
      for (const inst of plan.installments) {
        if (inst.paidAt !== undefined || inst.chargedAt !== undefined) continue;
        const daysLate = Math.floor((t - inst.dueAt) / spd);

        if (daysLate >= cfg.guarantorNoticeDay && inst.notifiedAt === undefined) {
          inst.notifiedAt = inst.dueAt + cfg.guarantorNoticeDay * spd;
          activity({
            kind: "GuarantorNotified",
            student: plan.student,
            planId: plan.id,
            amount: inst.amount,
            at: inst.notifiedAt,
          });
          changed = true;
        }
        if (daysLate > cfg.graceDays && inst.markedLateAt === undefined) {
          inst.markedLateAt = inst.dueAt + (cfg.graceDays + 1) * spd;
          inst.penalty = bpsOf(inst.amount, cfg.penaltyBps);
          plan.counts = false;
          activity({
            kind: "MarkedLate",
            student: plan.student,
            planId: plan.id,
            amount: inst.amount,
            at: inst.markedLateAt,
          });
          changed = true;
        }

        if (daysLate >= cfg.guarantorChargeDay) {
          const firstCharge = !plan.installments.some(
            (j) => j.chargedAt !== undefined,
          );
          if (firstCharge) {
            chargeToGuarantor(
              plan,
              [inst],
              inst.dueAt + cfg.guarantorChargeDay * spd,
            );
          } else {
            // Segunda cuota del plan al día 15: caducan los plazos y se le
            // cobra al fiador todo el saldo impago (con punitorios).
            const remaining = plan.installments.filter(
              (j) => j.paidAt === undefined && j.chargedAt === undefined,
            );
            for (const j of remaining) {
              const lateDays = Math.floor((t - j.dueAt) / spd);
              if (lateDays > cfg.graceDays && j.markedLateAt === undefined) {
                j.markedLateAt = j.dueAt + (cfg.graceDays + 1) * spd;
                j.penalty = bpsOf(j.amount, cfg.penaltyBps);
                activity({
                  kind: "MarkedLate",
                  student: plan.student,
                  planId: plan.id,
                  amount: j.amount,
                  at: j.markedLateAt,
                });
              }
            }
            chargeToGuarantor(
              plan,
              remaining,
              inst.dueAt + cfg.guarantorChargeDay * spd,
            );
            plan.status = "Recovered";
            plan.counts = false;
            break;
          }
          changed = true;
          continue;
        }

        const status =
          daysLate < 0
            ? "Upcoming"
            : daysLate === 0
              ? "Due"
              : daysLate <= cfg.graceDays
                ? "Grace"
                : "Late";
        if (inst.status !== status) {
          inst.status = status;
          changed = true;
        }
      }
      if (settleOrRefresh(plan)) changed = true;
    }

    // Liquidación diferida en tramos garantizados por Lazo:
    // Cada tramo se libera en su fecha exacta (t >= tranche.releaseAt)
    // de forma idempotente, pague o no el estudiante (incluso en mora).
    for (const merchant of Object.values(state.merchants)) {
      for (const sale of merchant.sales) {
        if (sale.settled === true) continue;
        if (sale.payoutTranches && sale.payoutTranches.length > 0) {
          for (const tranche of sale.payoutTranches) {
            if (!tranche.released && t >= tranche.releaseAt) {
              tranche.released = true;
              sale.pendingSettlement = Math.max(
                0,
                (sale.pendingSettlement ?? 0) - tranche.amount,
              );
              merchant.pendingSettlement = Math.max(
                0,
                (merchant.pendingSettlement ?? 0) - tranche.amount,
              );
              merchant.settlementBalance += tranche.amount;
              state.pool.available -= tranche.amount;
              state.pool.nav = state.pool.available + state.pool.outstandingCredit;
              state.pool.events.push({
                kind: "Advance",
                amount: tranche.amount,
                at: tranche.releaseAt,
                signature: fakeSignature(),
                planId: sale.planId,
              });
              activity({
                kind: "PayoutReleased",
                merchant: merchant.owner,
                planId: sale.planId,
                amount: tranche.amount,
                at: tranche.releaseAt,
              });
              changed = true;
            }
          }
          if (sale.payoutTranches.every((tr) => tr.released)) {
            sale.settled = true;
            sale.pendingSettlement = 0;
          }
        } else {
          // Ventas históricas sin tramos
          const pending = sale.pendingSettlement ?? 0;
          if (pending <= 0) continue;
          const dueAt = sale.settlementAt ?? sale.at;
          if (t < dueAt) continue;
          sale.pendingSettlement = 0;
          sale.settled = true;
          merchant.pendingSettlement = Math.max(
            0,
            (merchant.pendingSettlement ?? 0) - pending,
          );
          merchant.settlementBalance += pending;
          state.pool.available -= pending;
          state.pool.nav = state.pool.available + state.pool.outstandingCredit;
          state.pool.events.push({
            kind: "Advance",
            amount: pending,
            at: dueAt,
            signature: fakeSignature(),
            planId: sale.planId,
          });
          activity({
            kind: "PayoutReleased",
            merchant: merchant.owner,
            planId: sale.planId,
            amount: pending,
            at: dueAt,
          });
          changed = true;
        }
      }
    }
    return changed;
  };

  /** Corre el keeper por si el reloj avanzó; persiste y avisa si cambió algo. */
  const sync = () => {
    if (applyKeeper()) commit();
  };

  /**
   * Fondos devUSDC simulados del estudiante: misma derivación que
   * `getBalance` de cuentas (`DEMO_STUDENT_FUNDS` − lo ya gastado en
   * anticipos y cuotas pagadas; lo cobrado al fiador no es gasto del
   * estudiante). `overrides.studentFunds` baja el techo en tests.
   */
  const spentOf = (student: WalletAddress): Micro =>
    state.plans
      .filter((p) => p.student === student)
      .reduce(
        (sum, p) =>
          sum +
          p.downPayment +
          p.installments.reduce(
            (a, i) => a + (i.paidAt !== undefined ? i.amount + i.penalty : 0),
            0,
          ),
        0,
      );
  const fundsOf = (student: WalletAddress): Micro =>
    Math.max(0, (overrides.studentFunds ?? DEMO_STUDENT_FUNDS) - spentOf(student));

  return {
    mode: "mock",

    async getConfig() {
      refresh();
      return clone(state.config);
    },

    async getClock(): Promise<DemoClock> {
      refresh();
      sync();
      return {
        now: now(state),
        secondsPerDay: state.config.secondsPerDay,
        daysAdvanced: state.daysAdvanced,
      };
    },

    async getReputation(student) {
      refresh();
      sync();
      if (ensureStudent(state, student)) commit();
      return clone(state.reputations[student]);
    },

    async getGuarantee(student) {
      refresh();
      sync();
      const g = state.guarantees[student];
      return g ? clone(g) : null;
    },

    async quote(price, student, options) {
      refresh();
      sync();
      if (ensureStudent(state, student)) commit();
      return computeQuote(state, price, student, options, fundsOf(student));
    },

    async getPlans(student) {
      refresh();
      sync();
      return state.plans
        .filter((p) => p.student === student)
        .map(toPublicPlan);
    },

    async getMerchant(owner) {
      refresh();
      sync();
      const m = state.merchants[owner];
      if (!m) throw new CuotasError("not_found", `comercio ${owner}`);
      return clone(m);
    },

    async setMerchantSettlement(owner, settlement) {
      refresh();
      sync();
      const m = state.merchants[owner];
      if (!m) throw new CuotasError("not_found", `comercio ${owner}`);
      const opt = settlementOptionOf(state.config, settlement);
      if (!opt || !opt.enabled || opt.feeBps === null) {
        throw new CuotasError(
          "option_unavailable",
          `liquidación ${settlement} no disponible`,
        );
      }
      m.settlementId = settlement;
      commit();
      return clone(m);
    },

    async getPool() {
      refresh();
      sync();
      return clone(state.pool);
    },

    async getActivity(filter) {
      refresh();
      sync();
      return clone(
        state.activity
          .filter(
            (a) =>
              (filter?.student === undefined ||
                a.student === filter.student) &&
              (filter?.merchant === undefined ||
                a.merchant === filter.merchant) &&
              (filter?.planId === undefined || a.planId === filter.planId),
          )
          .sort((a, b) => a.at - b.at),
      );
    },

    async initReputation(student): Promise<TxResult<Reputation>> {
      refresh();
      sync();
      if (ensureStudent(state, student)) commit();
      return { value: clone(state.reputations[student]), signature: fakeSignature() };
    },

    async openPlan(args): Promise<TxResult<Plan>> {
      const progress = args.onProgress;
      emitProgress(progress, "preparing");
      refresh();
      sync();

      let order: CounterOrder | undefined;
      if (args.orderId) {
        order = state.counterOrders?.[args.orderId];
        if (!order) {
          throw new CuotasError(
            "order_unavailable",
            `orden ${args.orderId} no encontrada`,
          );
        }
        const t = now(state);
        if (order.status === "open" && t > order.expiresAt) {
          order.status = "expired";
        }
        if (order.status !== "open") {
          throw new CuotasError(
            "order_unavailable",
            `orden ${args.orderId} no disponible (${order.status})`,
          );
        }
        args = {
          ...args,
          price: order.amount,
          merchant: order.merchant,
        };
      }

      const merchant = state.merchants[args.merchant];
      if (!merchant) {
        throw new CuotasError("not_found", `comercio ${args.merchant}`);
      }
      if (ensureStudent(state, args.student)) commit();
      // Sin plazo pedido en la orden, se usa el predeterminado del comercio.
      const settlementReq =
        args.settlement ?? merchant.settlementId ?? "immediate";
      const quote = computeQuote(state, args.price, args.student, {
        installments: args.installments,
        settlement: settlementReq,
      }, fundsOf(args.student));
      if (!quote.eligible) {
        throw new CuotasError(quote.reasons[0], `openPlan: ${quote.reasons[0]}`);
      }

      // Simulación declarada: emite la misma secuencia de fases que el real
      // (aprobación → envío → confirmación → sync), todo instantáneo.
      emitProgress(progress, "awaiting_approval");
      const at = now(state);
      const signature = fakeSignature();
      emitProgress(progress, "sending", signature);
      const day = state.config.secondsPerDay;
      const rep = state.reputations[args.student];
      const tierParams = state.config.guaranteedTiers[rep.tier];
      // Copia fija de los términos con los que se abrió el plan: si la config
      // o el predeterminado del comercio cambian después, el plan no se toca.
      const terms: PlanTerms = {
        termsVersion: PLAN_TERMS_VERSION,
        installmentsCount: quote.installmentsCount,
        interestTotalBps: quote.interestTotalBps,
        downPaymentBps: tierParams.downPaymentBps,
        coverageBps: tierParams.guarantorCoverageBps,
        settlementId: quote.settlementId,
        settlementDays: quote.settlementDays,
        settlementFeeBps:
          settlementOptionOf(state.config, settlementReq)?.feeBps ??
          state.config.feeBps,
        provisional: quote.provisional,
      };
      const plan: MockPlan = {
        id: `plan-${++state.planSeq}`,
        student: args.student,
        merchant: args.merchant,
        productId: args.productId,
        price: args.price,
        downPayment: quote.downPayment,
        financed: quote.financed,
        merchantFee: quote.merchantFee,
        installments: quote.installments.map((amount, index) => ({
          index,
          amount,
          dueAt: at + (index + 1) * 30 * day,
          penalty: 0,
          status: "Upcoming",
        })),
        openedAt: at,
        status: "Active",
        counts: quote.financed >= state.config.minFinancedToCount,
        terms,
        signature,
      };
      state.plans.push(plan);

      // Cobro del comercio: el anticipo del estudiante entra al abrir siempre.
      // Si la liquidación es diferida, `financiado − fee` queda pendiente en
      // tramos mensuales iguales garantizados por Lazo.
      merchant.settlementBalance += quote.merchantAdvance;
      merchant.pendingSettlement =
        (merchant.pendingSettlement ?? 0) + quote.merchantPending;
      merchant.plansCount += 1;
      merchant.sales.push({
        planId: plan.id,
        price: args.price,
        downPayment: quote.downPayment,
        financed: quote.financed,
        fee: quote.merchantFee,
        received: quote.merchantReceives,
        at,
        signature,
        settlementId: quote.settlementId,
        settlementDays: quote.settlementDays,
        settlementAt: at + quote.settlementDays * day,
        pendingSettlement: quote.merchantPending,
        settled: quote.merchantPending === 0,
        payoutTranches: clone(quote.payoutTranches),
      });

      if (order) {
        order.status = "paid";
        order.planId = plan.id;
      }

      // El pool adelanta `financiado − fee` al comercio: al abrir si la
      // liquidación es inmediata; en la fecha de cobro de cada tramo si es diferida
      // (lo liquida `applyKeeper` con el evento Advance en esa fecha).
      const advance =
        quote.merchantPending === 0 ? quote.financed - quote.merchantFee : 0;
      if (advance > 0) {
        state.pool.events.push({
          kind: "Advance",
          amount: advance,
          at,
          signature,
          planId: plan.id,
        });
        state.pool.available -= advance;
      }
      // Crédito pendiente del pool = lo que el comprador debe repagar
      // (financiado + interés de la opción). Cada cuota pagada lo baja por
      // `inst.amount`, así saldar deja el contador en 0 exacto.
      state.pool.outstandingCredit += quote.financed + quote.interest;
      state.pool.accruedFees += quote.merchantFee;
      state.pool.nav = state.pool.available + state.pool.outstandingCredit;

      // activeExposure = repayable del plan (financed + interest), igual que
      // `active_exposure` on-chain. Con interés 0 equivale a la suma de los
      // amounts de sus cuotas; con 6 cuotas incluye el interés de la opción.
      state.reputations[args.student].activeExposure +=
        quote.financed + quote.interest;
      activity({
        kind: "PlanOpened",
        student: args.student,
        planId: plan.id,
        amount: args.price,
      });
      commit();
      emitProgress(progress, "confirming", signature);
      emitProgress(progress, "syncing", signature);
      return { value: toPublicPlan(plan), signature };
    },

    async payInstallment(student, planId, options): Promise<TxResult<Plan>> {
      const progress = options?.onProgress;
      emitProgress(progress, "preparing");
      refresh();
      sync();
      const plan = state.plans.find(
        (p) => p.id === planId && p.student === student,
      );
      if (!plan) throw new CuotasError("not_found", `plan ${planId}`);
      const inst = plan.installments.find((i) => !i.paidAt && !i.chargedAt);
      if (!inst) {
        throw new CuotasError("nothing_due", `plan ${planId} sin cuotas impagas`);
      }
      // Sin fondos para la cuota (+punitorio) se corta antes de "aprobar",
      // igual que el cliente real.
      if (fundsOf(student) < inst.amount + inst.penalty) {
        throw new CuotasError(
          "insufficient_funds",
          `Saldo insuficiente para la cuota ${inst.index + 1} (tenés ${fundsOf(student)}, necesitás ${inst.amount + inst.penalty})`,
        );
      }

      emitProgress(progress, "awaiting_approval");
      const at = now(state);
      inst.paidAt = at;
      inst.status = "Paid";
      inst.signature = fakeSignature();
      emitProgress(progress, "sending", inst.signature);
      const paid = inst.amount + inst.penalty;

      // El repago entra al vault: baja el crédito pendiente por el principal
      // y sube lo disponible por lo que efectivamente entró (con punitorio).
      state.pool.events.push({
        kind: "Repayment",
        amount: paid,
        at,
        signature: inst.signature,
        planId,
      });
      state.pool.outstandingCredit -= inst.amount;
      state.pool.available += paid;
      state.pool.nav = state.pool.available + state.pool.outstandingCredit;

      // Pagar libera margen: inst.amount ya es la parte de repayable de la
      // cuota (las cuotas se cortan sobre financed + interest, no sobre
      // financed). exposure = Σ amounts de cuotas impagas.
      const rep = state.reputations[student];
      rep.activeExposure = Math.max(0, rep.activeExposure - inst.amount);
      activity({ kind: "InstallmentPaid", student, planId, amount: paid });

      // Si no queda nada impago el plan queda Settled; sube de escalón solo
      // si cuenta (financiado ≥ mínimo y sin pasar la gracia). Al saldarlo
      // via cobro al fiador no sube.
      settleOrRefresh(plan);

      commit();
      emitProgress(progress, "confirming", inst.signature);
      emitProgress(progress, "syncing", inst.signature);
      return { value: toPublicPlan(plan), signature: inst.signature };
    },

    // Espejo del real: la firma registrada en el estado ES el comprobante
    // simulado. Un plan/cuota con OTRA firma (previo o ajeno) no prueba
    // esta operación — nunca declara éxito por "existe". El mock no tiene
    // transacciones fallidas: una firma desconocida queda `pending`.
    async reconcileOperation(snapshot: OperationSnapshot): Promise<ReconcileOutcome> {
      refresh();
      sync();
      const plans = state.plans.filter((p) => p.student === snapshot.student);
      if (snapshot.operation === "open_plan") {
        const plan = plans.find((p) => p.signature === snapshot.signature);
        return plan
          ? { status: "confirmed", signature: snapshot.signature, plan: toPublicPlan(plan) }
          : { status: "pending", signature: snapshot.signature };
      }
      const plan = plans.find((p) => p.id === snapshot.planId);
      if (!plan) return { status: "pending", signature: snapshot.signature };
      const inst = plan.installments.find(
        (i) =>
          i.index === snapshot.expectedInstallmentIndex &&
          i.signature === snapshot.signature &&
          i.paidAt !== undefined,
      );
      return inst
        ? { status: "confirmed", signature: snapshot.signature, plan: toPublicPlan(plan) }
        : { status: "pending", signature: snapshot.signature };
    },

    async registerGuarantee(args): Promise<TxResult<Guarantee>> {
      refresh();
      sync();
      ensureStudent(state, args.student);
      const previous = state.guarantees[args.student];
      const guarantee: Guarantee = {
        student: args.student,
        maxPurchase: args.maxPurchase,
        coverageMax: args.coverageMax,
        mandateHash: args.mandateHash,
        active: true,
        registeredAt: now(state),
        display: args.display ?? previous?.display,
      };
      state.guarantees[args.student] = guarantee;
      activity({ kind: "GuaranteeRegistered", student: args.student });
      commit();
      return { value: clone(guarantee), signature: fakeSignature() };
    },

    async revokeGuarantee(student): Promise<TxResult<Guarantee>> {
      refresh();
      sync();
      const guarantee = state.guarantees[student];
      if (!guarantee) throw new CuotasError("not_found", `fiador de ${student}`);
      if (guarantee.active) {
        guarantee.active = false;
        activity({ kind: "GuaranteeRevoked", student });
        commit();
      }
      return { value: clone(guarantee), signature: fakeSignature() };
    },

    async createCounterOrder(
      merchant,
      args: CreateCounterOrderArgs,
    ): Promise<CounterOrder> {
      refresh();
      sync();
      const m = state.merchants[merchant];
      if (!m) throw new CuotasError("not_found", `comercio ${merchant}`);
      const createdAt = now(state);
      const expiresAt = createdAt + state.config.secondsPerDay;
      state.orderSeq = (state.orderSeq ?? 0) + 1;
      const order: CounterOrder = {
        id: `ord_${state.orderSeq}`,
        merchant,
        amount: args.amount,
        description: args.description,
        createdAt,
        expiresAt,
        status: "open",
      };
      state.counterOrders[order.id] = order;
      commit();
      return clone(order);
    },

    async getCounterOrder(id): Promise<CounterOrder> {
      refresh();
      sync();
      const order = state.counterOrders?.[id];
      if (!order) throw new CuotasError("not_found", `orden ${id}`);
      const t = now(state);
      if (order.status === "open" && t > order.expiresAt) {
        order.status = "expired";
        commit();
      }
      return clone(order);
    },

    async listCounterOrders(merchant): Promise<CounterOrder[]> {
      refresh();
      sync();
      const t = now(state);
      const orders = Object.values(state.counterOrders ?? {}).filter(
        (o) => o.merchant === merchant,
      );
      let changed = false;
      for (const o of orders) {
        if (o.status === "open" && t > o.expiresAt) {
          o.status = "expired";
          changed = true;
        }
      }
      if (changed) commit();
      return orders.map(clone).sort((a, b) => b.createdAt - a.createdAt);
    },

    async advanceDays(days): Promise<DemoClock> {
      refresh();
      state.daysAdvanced += days;
      applyKeeper();
      commit();
      return {
        now: now(state),
        secondsPerDay: state.config.secondsPerDay,
        daysAdvanced: state.daysAdvanced,
      };
    },

    async resetDemo() {
      state = seedState(seedConfig);
      commit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
