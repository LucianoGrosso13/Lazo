// Implementación mock de `CuotasClient`: estado en memoria + localStorage
// (SSR-safe), reloj de demo y keeper simulado. Reglas de negocio:
// `proyecto/02-validacion.md` (rondas 1-4 y decisiones de precio) y
// `.scratch/lazo-front/spec.md`. Ningún número de negocio va hardcodeado:
// todo sale de `state.config` (sembrado desde `demo-config.ts`).
import { DEMO_CONFIG } from "./demo-config";
import { CuotasError } from "./types";
import type {
  Activity,
  CuotasClient,
  DemoClock,
  Guarantee,
  Micro,
  Plan,
  ProtocolConfig,
  Quote,
  QuoteBlockReason,
  Reputation,
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
  return { ...p, installments: p.installments.map(toPublicInstallment) };
}

function computeQuote(
  state: MockState,
  price: Micro,
  student: WalletAddress,
): Quote {
  const cfg = state.config;
  const rep = state.reputations[student];
  const guarantee = state.guarantees[student];
  const withGuarantee = guarantee?.active === true;
  const tierParams = withGuarantee
    ? cfg.guaranteedTiers[rep.tier]
    : cfg.unguaranteedTiers[
        Math.min(rep.tier, cfg.unguaranteedTiers.length - 1)
      ];

  const downPayment = bpsOf(price, tierParams.downPaymentBps);
  const financed = price - downPayment;
  const interest = bpsOf(financed, tierParams.interestBps);
  const repayable = financed + interest;
  // La última cuota absorbe el redondeo (700 → 233,333333 / 233,333333 / 233,333334).
  const base = Math.floor(repayable / cfg.installmentsCount);
  const installments = Array.from({ length: cfg.installmentsCount }, (_, i) =>
    i === cfg.installmentsCount - 1
      ? repayable - base * (cfg.installmentsCount - 1)
      : base,
  );
  const merchantFee = bpsOf(financed, cfg.feeBps);
  const requiredCoverage = bpsOf(financed, tierParams.guarantorCoverageBps);

  const reasons: QuoteBlockReason[] = [];
  if (cfg.state !== "Normal") reasons.push("protocol_halted");
  if (rep.blockedFromNewPlans) reasons.push("blocked_after_default");
  if (!withGuarantee) reasons.push("no_guarantee");
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
    merchantReceives: price - merchantFee,
    requiredCoverage,
    eligible: reasons.length === 0,
    reasons,
  };
}

export function createMockCuotas(overrides: MockOverrides = {}): CuotasClient {
  const seedConfig = { ...DEMO_CONFIG, ...overrides.config };
  let state = loadState() ?? seedState(seedConfig);
  const listeners = new Set<() => void>();

  const persist = () => persistState(state);
  const notify = () => listeners.forEach((l) => l());
  const commit = () => {
    persist();
    notify();
  };
  /** Relee el estado persistido (otra instancia pudo haberlo cambiado). */
  const refresh = () => {
    state = loadState() ?? state;
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
    return changed;
  };

  /** Corre el keeper por si el reloj avanzó; persiste y avisa si cambió algo. */
  const sync = () => {
    if (applyKeeper()) commit();
  };

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

    async quote(price, student) {
      refresh();
      sync();
      if (ensureStudent(state, student)) commit();
      return computeQuote(state, price, student);
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
      refresh();
      sync();
      const merchant = state.merchants[args.merchant];
      if (!merchant) {
        throw new CuotasError("not_found", `comercio ${args.merchant}`);
      }
      if (ensureStudent(state, args.student)) commit();
      const quote = computeQuote(state, args.price, args.student);
      if (!quote.eligible) {
        throw new CuotasError(quote.reasons[0], `openPlan: ${quote.reasons[0]}`);
      }

      const at = now(state);
      const signature = fakeSignature();
      const day = state.config.secondsPerDay;
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
        signature,
      };
      state.plans.push(plan);

      // El comercio cobra al instante: anticipo del estudiante + adelanto
      // del pool, menos la comisión sobre lo financiado.
      merchant.settlementBalance += quote.merchantReceives;
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
      });

      const advance = quote.financed - quote.merchantFee;
      state.pool.events.push({
        kind: "Advance",
        amount: advance,
        at,
        signature,
        planId: plan.id,
      });
      state.pool.outstandingCredit += quote.financed;
      state.pool.accruedFees += quote.merchantFee;
      state.pool.available -= advance;
      state.pool.nav = state.pool.available + state.pool.outstandingCredit;

      // activeExposure = repayable del plan (financed + interest), igual que
      // `active_exposure` on-chain. En la práctica interest = 0 en todos los
      // escalones, así que equivale a la suma de amounts de sus cuotas.
      state.reputations[args.student].activeExposure +=
        quote.financed + quote.interest;
      activity({
        kind: "PlanOpened",
        student: args.student,
        planId: plan.id,
        amount: args.price,
      });
      commit();
      return { value: toPublicPlan(plan), signature };
    },

    async payInstallment(student, planId): Promise<TxResult<Plan>> {
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

      const at = now(state);
      inst.paidAt = at;
      inst.status = "Paid";
      inst.signature = fakeSignature();
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
      // financed). Con interest = 0, exposure = Σ amounts de cuotas impagas.
      const rep = state.reputations[student];
      rep.activeExposure = Math.max(0, rep.activeExposure - inst.amount);
      activity({ kind: "InstallmentPaid", student, planId, amount: paid });

      // Si no queda nada impago el plan queda Settled; sube de escalón solo
      // si cuenta (financiado ≥ mínimo y sin pasar la gracia). Al saldarlo
      // via cobro al fiador no sube.
      settleOrRefresh(plan);

      commit();
      return { value: toPublicPlan(plan), signature: inst.signature };
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
