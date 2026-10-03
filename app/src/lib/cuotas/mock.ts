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

const pending = (name: string) => () =>
  Promise.reject(new CuotasError("not_implemented", `mock.${name} pendiente`));

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
  if (
    state.plans.some(
      (p) =>
        p.student === student &&
        (p.status === "Active" || p.status === "Late"),
    )
  ) {
    reasons.push("has_active_plan");
  }
  if (!withGuarantee) reasons.push("no_guarantee");
  if (price > tierParams.maxPurchase) reasons.push("exceeds_tier_max");
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

  return {
    mode: "mock",

    async getConfig() {
      refresh();
      return clone(state.config);
    },

    async getClock(): Promise<DemoClock> {
      refresh();
      return {
        now: now(state),
        secondsPerDay: state.config.secondsPerDay,
        daysAdvanced: state.daysAdvanced,
      };
    },

    async getReputation(student) {
      refresh();
      if (ensureStudent(state, student)) commit();
      return clone(state.reputations[student]);
    },

    async getGuarantee(student) {
      refresh();
      const g = state.guarantees[student];
      return g ? clone(g) : null;
    },

    async quote(price, student) {
      refresh();
      if (ensureStudent(state, student)) commit();
      return computeQuote(state, price, student);
    },

    async getPlans(student) {
      refresh();
      return state.plans
        .filter((p) => p.student === student)
        .map(toPublicPlan);
    },

    async getMerchant(owner) {
      refresh();
      const m = state.merchants[owner];
      if (!m) throw new CuotasError("not_found", `comercio ${owner}`);
      return clone(m);
    },

    async getPool() {
      refresh();
      return clone(state.pool);
    },

    async getActivity(filter) {
      refresh();
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
      if (ensureStudent(state, student)) commit();
      return { value: clone(state.reputations[student]), signature: fakeSignature() };
    },

    openPlan: pending("openPlan"),

    payInstallment: pending("payInstallment"),

    async registerGuarantee(args): Promise<TxResult<Guarantee>> {
      refresh();
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
      const guarantee = state.guarantees[student];
      if (!guarantee) throw new CuotasError("not_found", `fiador de ${student}`);
      if (guarantee.active) {
        guarantee.active = false;
        activity({ kind: "GuaranteeRevoked", student });
        commit();
      }
      return { value: clone(guarantee), signature: fakeSignature() };
    },

    advanceDays: pending("advanceDays"),

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
