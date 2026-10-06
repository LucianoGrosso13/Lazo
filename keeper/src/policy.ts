// Collection policy: pure evaluation of the Q2 mora timeline
// (02-validacion.md, round 2) against the final on-chain contract
// (/tmp/plan-phaseAB-contracts.md):
//   day N(notice) -> notify the guarantor (off-chain notice proposal;
//     skipped while the notice-day config field is pending — never hardcoded)
//   day grace+1  -> mark late per installment (crank_mark_late; auto-mark also
//     happens in pay/recovery, so already-Late syncs without re-sending)
//   day charge   -> charge the FIRST UNPAID installment only (the program
//     rejects any other index with StaleInstallmentIndex; no parallel charges
//     for two overdue rows of one plan). Guaranteed plans only: unguaranteed
//     plans propose a loss instead (nothing to charge).
//   2nd charge in one plan -> accelerate: the external charge SUMS every
//     unresolved installment (principal + applicable penalties, no penalty on
//     not-yet-overdue items), matching the on-chain transfer exactly.
//
// Penalty rule (contract "Matemática"): penalty = floor(amount * penaltyBps /
// 10000), fixed, never accrues. If the crank was skipped (past grace but the
// program still reports penalty 0), the keeper derives the configured penalty
// before charging — it must never undercharge the processor while the keeper
// funds the full on-chain amount.
//
// Keys carry the plan generation (openedAt) because the Plan PDA is closed on
// settlement and reused by the next plan.
import { chargeKey, lateKey, lossKey, notifyKey } from "./journal.ts";

export type InstallmentState = "Upcoming" | "Due" | "Grace" | "Late" | "Paid" | "ChargedToGuarantor";

export interface InstallmentView {
  index: number;
  /** Principal of the installment, micro-USDC. */
  amount: number;
  /** Accrued punitive fee, micro-USDC, as reported by the program. */
  penalty: number;
  dueAt: number;
  status: InstallmentState;
  /**
   * Penalty applied on-chain (crank or auto-applied). The derived Late status
   * alone does NOT imply this: an unmarked past-grace installment still needs
   * the crank to fix its penalty.
   */
  markedLate: boolean;
}

export interface PlanView {
  id: string;
  student: string;
  /** Plan generation: part of every journal key (PDA reuse). */
  openedAt: number;
  withGuarantee: boolean;
  status: "Active" | "Late" | "Settled" | "Recovered";
  installments: InstallmentView[];
}

export interface PolicyConfig {
  graceDays: number;
  /** Null until the chain config field lands (test owner); notify skipped. */
  guarantorNoticeDay: number | null;
  guarantorChargeDay: number;
  secondsPerDay: number;
  penaltyBps: number;
}

export type PolicyActionKind = "notify" | "mark_late" | "charge" | "loss";

export interface PolicyAction {
  kind: PolicyActionKind;
  key: string;
  planId: string;
  openedAt: number;
  installment: number;
  /** External amount to collect (or lose), micro-USDC. */
  amountMicro: number;
  /** Whole days past due of the trigger installment. */
  day: number;
  /** True when this charge accelerates the plan (2nd guarantor charge). */
  accelerates: boolean;
  /**
   * True when the chain already shows the effect (e.g. someone else ran the
   * permissionless crank): the runner journals it as done without re-sending.
   */
  alreadyDone: boolean;
  detail: string;
}

export function daysPastDue(dueAt: number, now: number, secondsPerDay: number): number {
  if (now < dueAt) return -1;
  return Math.floor((now - dueAt) / secondsPerDay);
}

const isResolved = (s: InstallmentState): boolean => s === "Paid" || s === "ChargedToGuarantor";

/** Reported penalty, or the configured fixed penalty when the crank was skipped. */
export function effectivePenalty(
  inst: InstallmentView,
  now: number,
  config: PolicyConfig,
): number {
  if (inst.penalty > 0) return inst.penalty;
  if (daysPastDue(inst.dueAt, now, config.secondsPerDay) <= config.graceDays) return 0;
  return Math.floor((inst.amount * config.penaltyBps) / 10_000);
}

export function evaluatePlan(
  plan: PlanView,
  config: PolicyConfig,
  now: number,
  doneKeys: ReadonlySet<string>,
): PolicyAction[] {
  if (plan.status === "Settled" || plan.status === "Recovered") return [];
  const out: PolicyAction[] = [];
  const unresolved = plan.installments.filter((i) => !isResolved(i.status)).sort((a, b) => a.index - b.index);
  if (unresolved.length === 0) return [];
  const firstUnpaid = unresolved[0];
  const firstDay = daysPastDue(firstUnpaid.dueAt, now, config.secondsPerDay);
  const chargedCount = plan.installments.filter((i) => i.status === "ChargedToGuarantor").length;

  // Day-15 guard: FIRST unpaid installment only.
  if (firstDay >= config.guarantorChargeDay) {
    if (plan.withGuarantee) {
      const key = chargeKey(plan.id, plan.openedAt, firstUnpaid.index);
      if (!doneKeys.has(key)) {
        const accelerates = chargedCount >= 1;
        // Accelerated: sum every unresolved installment (no penalty on
        // not-yet-overdue). First charge: the trigger only.
        const scope = accelerates ? unresolved : [firstUnpaid];
        const amountMicro = scope.reduce((s, i) => s + i.amount + effectivePenalty(i, now, config), 0);
        out.push({
          kind: "charge",
          key,
          planId: plan.id,
          openedAt: plan.openedAt,
          installment: firstUnpaid.index,
          amountMicro,
          day: firstDay,
          accelerates,
          alreadyDone: false,
          detail: accelerates
            ? `charge plan=${plan.id} installment=${firstUnpaid.index} amount=${amountMicro} day=${firstDay} accelerated(second guarantor charge)`
            : `charge plan=${plan.id} installment=${firstUnpaid.index} amount=${amountMicro} day=${firstDay}`,
        });
      }
    } else {
      const key = lossKey(plan.id, plan.openedAt, firstUnpaid.index);
      if (!doneKeys.has(key)) {
        const amountMicro = firstUnpaid.amount + effectivePenalty(firstUnpaid, now, config);
        out.push({
          kind: "loss",
          key,
          planId: plan.id,
          openedAt: plan.openedAt,
          installment: firstUnpaid.index,
          amountMicro,
          day: firstDay,
          accelerates: false,
          alreadyDone: false,
          detail: `loss plan=${plan.id} installment=${firstUnpaid.index} amount=${amountMicro} day=${firstDay} unguaranteed(no card to charge)`,
        });
      }
    }
  }

  for (const inst of unresolved) {
    // The charge/loss guard above owns day-15+; per-installment mora below.
    const day = daysPastDue(inst.dueAt, now, config.secondsPerDay);
    if (day < 0) continue;
    if (day >= config.guarantorChargeDay) {
      // Non-first installments at day 15+: no parallel charges; still mark
      // late individually so each carries its penalty when resolved.
      if (inst.index === firstUnpaid.index) continue;
      const key = lateKey(plan.id, plan.openedAt, inst.index);
      if (doneKeys.has(key)) continue;
      out.push({
        kind: "mark_late",
        key,
        planId: plan.id,
        openedAt: plan.openedAt,
        installment: inst.index,
        amountMicro: 0,
        day,
        accelerates: false,
        alreadyDone: inst.status === "Late" && inst.markedLate,
        detail: `mark_late plan=${plan.id} installment=${inst.index} day=${day}`,
      });
      continue;
    }
    if (day > config.graceDays) {
      const key = lateKey(plan.id, plan.openedAt, inst.index);
      if (doneKeys.has(key)) continue;
      // Only a program-applied mark syncs: derived-Late without markedLate
      // still needs the crank to fix the penalty on-chain.
      const alreadyDone = inst.status === "Late" && inst.markedLate;
      out.push({
        kind: "mark_late",
        key,
        planId: plan.id,
        openedAt: plan.openedAt,
        installment: inst.index,
        amountMicro: 0,
        day,
        accelerates: false,
        alreadyDone,
        detail: alreadyDone
          ? `mark_late plan=${plan.id} installment=${inst.index} already_late day=${day}`
          : `mark_late plan=${plan.id} installment=${inst.index} day=${day}`,
      });
    } else if (config.guarantorNoticeDay != null && day >= config.guarantorNoticeDay) {
      const key = notifyKey(plan.id, plan.openedAt, inst.index);
      if (doneKeys.has(key)) continue;
      out.push({
        kind: "notify",
        key,
        planId: plan.id,
        openedAt: plan.openedAt,
        installment: inst.index,
        amountMicro: inst.amount + effectivePenalty(inst, now, config),
        day,
        accelerates: false,
        alreadyDone: false,
        detail: `notify plan=${plan.id} installment=${inst.index} day=${day}`,
      });
    }
  }
  return out;
}
