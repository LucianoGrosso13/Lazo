// Keeper runner: poll plans, propose effects, execute approved ones.
//
//   node src/run.ts once        evaluate once, print proposals (default, dry-run)
//   node src/run.ts loop        repeat every KEEPER_POLL_SECONDS
//   node src/run.ts proposals   list open proposals
//   node src/run.ts --execute --proposal <id> --approved-by <name> --yes
//                               execute ONE approved proposal
//
// The loop NEVER signs, charges, or sends: it only writes PROPOSED records.
// Every effect (mark late, card charge, recovery registration, loss note)
// runs only via --execute with an explicit proposal id, an approver name,
// and --yes, after the operator reviewed the printed amounts. The journal
// makes every effect idempotent across restarts.
import { MockAdapter, ReceiptAlreadyUsedError, StubAdapter, readAcceptanceById, readAcceptanceForStudent, readBindingFromStore } from "./adapter.ts";
import type { ChainAdapter, CoverageCap } from "./adapter.ts";
import { loadKeeperEnv } from "./config.ts";
import type { KeeperEnv } from "./config.ts";
import { GatewayError, MobbexGateway, chargeReference, microUsdcToArs } from "./gateway.ts";
import type { ChargeResult, Gateway, SimulatedCharge } from "./gateway.ts";
import { Journal, chargeKey, lossKey, parseKey, recoveryKey } from "./journal.ts";
import type { Proposal } from "./journal.ts";
import { duePayouts, evaluatePlan } from "./policy.ts";
import type { PlanView } from "./policy.ts";

export interface RunDeps {
  adapter: ChainAdapter;
  gateway: Gateway;
  journal: Journal;
  env: KeeperEnv;
  now?: number;
  log?: (line: string) => void;
}

export interface RunReport {
  ready: boolean;
  reason: string;
  plans: number;
  proposed: Proposal[];
  synced: string[];
  open: Proposal[];
}

export type ExecuteStatus =
  | "ok"
  | "pending"
  | "blocked"
  | "failed"
  | "simulated"
  | "error";

export interface ExecuteReport {
  status: ExecuteStatus;
  proposalId: string;
  detail: string;
  signature?: string;
}

export class ExecuteError extends Error {
  readonly code: "proposal_unknown" | "proposal_closed" | "plan_unknown" | "already_settled" | "dry_run_only";
  constructor(
    code: "proposal_unknown" | "proposal_closed" | "plan_unknown" | "already_settled" | "dry_run_only",
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ExecuteError";
    this.code = code;
  }
}

function toArsOrNull(micro: number, env: KeeperEnv): number | null {
  if (env.mobbexArsPerUsdc == null) return null;
  try {
    return microUsdcToArs(micro, env.mobbexArsPerUsdc);
  } catch {
    return null;
  }
}

export async function runOnce(deps: RunDeps): Promise<RunReport> {
  const log = deps.log ?? (() => {});
  const now = deps.now ?? Math.floor(Date.now() / 1000);
  const ready = await deps.adapter.ready();
  if (!ready.ready) {
    log(`keeper not ready: ${ready.reason}`);
    return { ready: false, reason: ready.reason, plans: 0, proposed: [], synced: [], open: deps.journal.openProposals() };
  }
  const config = await deps.adapter.getConfig();
  const plans = await deps.adapter.listPlans();
  const done = deps.journal.terminalKeys();
  const open = deps.journal.openProposals();
  const openByKey = new Map(open.map((p) => [p.key, p]));
  const proposed: Proposal[] = [];
  const synced: string[] = [];

  for (const plan of plans) {
    for (const action of evaluatePlan(plan, config, now, done)) {
      if (action.alreadyDone) {
        deps.journal.append({
          kind: "MARKED_LATE",
          key: action.key,
          proposalId: null,
          planId: plan.id,
          installment: action.installment,
          amountMicro: null,
          amountArs: null,
          receipt: null,
          detail: `synced from chain: ${action.detail}`,
        });
        synced.push(action.key);
        continue;
      }
      if (openByKey.has(action.key)) continue;
      const amountArs = action.kind === "charge" ? toArsOrNull(action.amountMicro, deps.env) : null;
      const detail =
        action.kind === "charge" && amountArs == null
          ? `${action.detail} ars_rate_missing(MOBBEX_ARS_PER_USDC)`
          : action.detail;
      const p = deps.journal.propose({
        kind: action.kind,
        key: action.key,
        planId: plan.id,
        installment: action.installment,
        amountMicro: action.amountMicro,
        amountArs,
        createdAt: now,
        detail,
      });
      openByKey.set(p.key, p);
      proposed.push(p);
      log(`proposed ${p.id} ${p.detail}`);
    }
  }

  // Permissionless merchant payouts are proposed for operator review only.
  const payoutSchedules = await deps.adapter.listPayoutSchedules?.() ?? [];
  for (const schedule of payoutSchedules) {
    for (const tranche of schedule.tranches.filter((item) => item.released)) {
      const key = `payout:${schedule.address}:${tranche.index}`;
      if (done.has(key)) continue;
      deps.journal.append({
        kind: "PAYOUT_RELEASED", key, proposalId: null, planId: schedule.planId,
        installment: tranche.index, amountMicro: tranche.amountMicro, amountArs: null,
        receipt: null, detail: "synced from chain: payout tranche already released",
      });
      done.add(key);
      synced.push(key);
    }
  }
  for (const { address: scheduleAddress, planId, tranche } of duePayouts(payoutSchedules, now)) {
    const key = `payout:${scheduleAddress}:${tranche.index}`;
    if (done.has(key) || openByKey.has(key)) continue;
    const p = deps.journal.propose({
      kind: "release_payout", key, planId, installment: tranche.index,
      amountMicro: tranche.amountMicro, amountArs: null, createdAt: now,
      detail: `release_payout plan=${planId} schedule=${scheduleAddress} tranche=${tranche.index} amount=${tranche.amountMicro} release_at=${tranche.releaseAt}`,
    });
    openByKey.set(p.key, p);
    proposed.push(p);
    log(`proposed ${p.id} ${p.detail}`);
  }

  // Recovery follow-ups: verified charges still awaiting on-chain registration.
  // Generation comes from the charge key (legacy keys without it are skipped:
  // they cannot be safely attributed to a plan generation).
  for (const r of deps.journal.readAll()) {
    if (r.kind !== "CHARGE_OK" || r.planId == null || r.installment == null) continue;
    const parsed = parseKey(r.key);
    if (!parsed || parsed.kind !== "charge") continue;
    const rkey = recoveryKey(r.planId, parsed.openedAt, r.installment);
    if (done.has(rkey) || openByKey.has(rkey)) continue;
    const p = deps.journal.propose({
      kind: "recover",
      key: rkey,
      planId: r.planId,
      installment: r.installment,
      amountMicro: r.amountMicro ?? 0,
      amountArs: r.amountArs,
      createdAt: now,
      detail: `recover plan=${r.planId} installment=${r.installment} receipt=${r.receipt ?? "unknown"}`,
    });
    openByKey.set(p.key, p);
    proposed.push(p);
    log(`proposed ${p.id} ${p.detail}`);
  }

  return { ready: true, reason: "ok", plans: plans.length, proposed, synced, open: [...openByKey.values()] };
}

function attemptFor(journal: Journal, key: string): number {
  // Attempts increment only on VERIFIED declines: unknown outcomes (ERROR)
  // retry with the same reference so the gateway dedupes server-side.
  let failed = 0;
  for (const r of journal.readAll()) {
    if (r.key === key && r.kind === "CHARGE_FAILED") failed += 1;
  }
  return failed + 1;
}

export async function executeProposal(
  deps: RunDeps,
  args: { proposalId: string; approvedBy: string },
): Promise<ExecuteReport> {
  const now = deps.now ?? Math.floor(Date.now() / 1000);
  const proposal = deps.journal.findProposal(args.proposalId);
  if (!proposal) {
    // Distinguish "never existed" from "already terminal".
    const ever = deps.journal.readAll().some((r) => r.proposalId === args.proposalId);
    if (ever) {
      throw new ExecuteError("proposal_closed", `proposal_closed: ${args.proposalId} already reached a terminal state`);
    }
    throw new ExecuteError("proposal_unknown", `proposal_unknown: ${args.proposalId}`);
  }
  if (proposal.kind === "release_payout") {
    throw new ExecuteError("dry_run_only", "release_payout stays dry-run in this ticket; no transaction was signed or sent");
  }
  const ready = await deps.adapter.ready();
  if (!ready.ready) {
    return { status: "blocked", proposalId: proposal.id, detail: ready.reason };
  }
  // Recovery acts on the journaled verified receipt, not on live plan state
  // (the charge already validated the plan when it executed).
  let plan: PlanView | null = null;
  if (proposal.kind !== "recover") {
    const plans = await deps.adapter.listPlans();
    plan = plans.find((p) => p.id === proposal.planId) ?? null;
    if (!plan) {
      throw new ExecuteError("plan_unknown", `plan_unknown: ${proposal.planId} not returned by the adapter`);
    }
    const inst = plan.installments.find((i) => i.index === proposal.installment) ?? null;
    if (proposal.kind === "charge" && inst && (inst.status === "Paid" || inst.status === "ChargedToGuarantor")) {
      throw new ExecuteError("already_settled", `already_settled: installment ${proposal.installment} is ${inst.status}`);
    }
  }

  if (proposal.kind === "notify") {
    deps.journal.append({
      kind: "NOTIFIED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: proposal.amountMicro,
      amountArs: proposal.amountArs,
      receipt: null,
      detail: `notice approved_by=${args.approvedBy}: guarantor notice for plan=${proposal.planId} installment=${proposal.installment} (demo channel: journal log)`,
    });
    return { status: "ok", proposalId: proposal.id, detail: `notified (demo channel: journal)` };
  }

  if (proposal.kind === "mark_late") {
    let res: { signature: string } | { pending: string };
    try {
      res = await deps.adapter.markLate(proposal.planId, proposal.installment);
    } catch (e) {
      deps.journal.append({
        kind: "ERROR",
        key: proposal.key,
        proposalId: proposal.id,
        planId: proposal.planId,
        installment: proposal.installment,
        amountMicro: null,
        amountArs: null,
        receipt: null,
        detail: `mark_late failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      return { status: "error", proposalId: proposal.id, detail: e instanceof Error ? e.message : String(e) };
    }
    if ("pending" in res) {
      return { status: "pending", proposalId: proposal.id, detail: res.pending };
    }
    deps.journal.append({
      kind: "MARKED_LATE",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: null,
      amountArs: null,
      receipt: null,
      detail: `approved_by=${args.approvedBy} signature=${res.signature}`,
    });
    return { status: "ok", proposalId: proposal.id, detail: "marked late", signature: res.signature };
  }

  if (proposal.kind === "loss") {
    deps.journal.append({
      kind: "LOSS_PROPOSED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: proposal.amountMicro,
      amountArs: proposal.amountArs,
      receipt: null,
      detail: `approved_by=${args.approvedBy} ${proposal.detail} -> route to admin_apply_loss (junior first)`,
    });
    return { status: "ok", proposalId: proposal.id, detail: "loss proposed (admin_apply_loss, junior first)" };
  }

  if (proposal.kind === "recover") {
    const parsed = parseKey(proposal.key);
    const charge = deps.journal
      .readAll()
      .find(
        (r) =>
          r.kind === "CHARGE_OK" &&
          parsed !== null &&
          r.key === chargeKey(proposal.planId, parsed.openedAt, proposal.installment),
      );
    if (!charge || !charge.receipt || charge.amountMicro == null) {
      return {
        status: "blocked",
        proposalId: proposal.id,
        detail: "blocked: no verified receipt for this charge (refusing to fabricate one)",
      };
    }
    // Pre-funding check against the REAL keeper USDC source: the on-chain
    // transfer would fail without it, so refuse before attempting.
    const balance = await deps.adapter.getKeeperUsdcBalance();
    if (balance < charge.amountMicro) {
      return {
        status: "blocked",
        proposalId: proposal.id,
        detail: `blocked: keeper USDC source holds ${balance}, needs ${charge.amountMicro} (fund it, then retry)`,
      };
    }
    let res: { signature: string } | { pending: string };
    try {
      res = await deps.adapter.registerRecovery(proposal.planId, proposal.installment, charge.amountMicro, charge.receipt);
    } catch (e) {
      if (e instanceof ReceiptAlreadyUsedError) {
        // The receipt is already recorded on-chain (a prior attempt landed):
        // sync as registered instead of failing or reusing a new receipt.
        deps.journal.append({
          kind: "RECOVERY_REGISTERED",
          key: proposal.key,
          proposalId: proposal.id,
          planId: proposal.planId,
          installment: proposal.installment,
          amountMicro: charge.amountMicro,
          amountArs: charge.amountArs,
          receipt: charge.receipt,
          detail: `synced: receipt already recorded on-chain (signature unknown)`,
        });
        return { status: "ok", proposalId: proposal.id, detail: "recovery synced (receipt already on-chain)" };
      }
      deps.journal.append({
        kind: "ERROR",
        key: proposal.key,
        proposalId: proposal.id,
        planId: proposal.planId,
        installment: proposal.installment,
        amountMicro: charge.amountMicro,
        amountArs: charge.amountArs,
        receipt: charge.receipt,
        detail: `register_recovery failed: ${e instanceof Error ? e.message : String(e)}`,
      });
      return { status: "error", proposalId: proposal.id, detail: e instanceof Error ? e.message : String(e) };
    }
    if ("pending" in res) {
      deps.journal.append({
        kind: "RECOVERY_PENDING",
        key: proposal.key,
        proposalId: proposal.id,
        planId: proposal.planId,
        installment: proposal.installment,
        amountMicro: charge.amountMicro,
        amountArs: charge.amountArs,
        receipt: charge.receipt,
        detail: res.pending,
      });
      return { status: "pending", proposalId: proposal.id, detail: res.pending };
    }
    deps.journal.append({
      kind: "RECOVERY_REGISTERED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: charge.amountMicro,
      amountArs: charge.amountArs,
      receipt: charge.receipt,
      detail: `approved_by=${args.approvedBy} signature=${res.signature}`,
    });
    return { status: "ok", proposalId: proposal.id, detail: "recovery registered", signature: res.signature };
  }

  // kind === "charge": card collection, the only effect that moves real
  // (sandbox) money. Requires a linked card, the accepted surety cap with
  // remaining room, AND a reviewed ARS figure. Cumulative charges per plan
  // generation never exceed the accepted coverageMax.
  if (!plan) {
    throw new ExecuteError("plan_unknown", `plan_unknown: ${proposal.planId} not returned by the adapter`);
  }
  const binding =
    (await deps.adapter.getBinding(plan.student)) ?? readBindingFromStore(deps.env.fiadorDataDir, plan.student);
  if (!binding || !binding.linked) {
    return { status: "blocked", proposalId: proposal.id, detail: "blocked: no linked guarantor card for this student" };
  }
  if (deps.env.mobbexArsPerUsdc == null) {
    return { status: "blocked", proposalId: proposal.id, detail: "blocked: MOBBEX_ARS_PER_USDC is not configured" };
  }
  let cap: CoverageCap | null;
  if (deps.adapter.getCoverageCap) {
    cap = await deps.adapter.getCoverageCap(plan.student);
  } else {
    cap = readAcceptanceForStudent(deps.env.fiadorDataDir, plan.student);
  }
  if (!cap) {
    return {
      status: "blocked",
      proposalId: proposal.id,
      detail: "blocked: no accepted surety cap for this student (refusing uncapped charges)",
    };
  }
  const generationPrefix = `charge:${proposal.planId}:${plan.openedAt}:`;
  const cumulative = deps.journal
    .readAll()
    .filter((r) => r.kind === "CHARGE_OK" && r.key.startsWith(generationPrefix))
    .reduce((s, r) => s + (r.amountMicro ?? 0), 0);
  const remaining = cap.coverageMax - cumulative;
  const due = proposal.amountMicro;
  if (remaining <= 0) {
    deps.journal.append({
      kind: "CHARGE_REFUSED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: due,
      amountArs: null,
      receipt: null,
      detail: `cap exhausted: cumulative=${cumulative} coverageMax=${cap.coverageMax} (mandate ${cap.mandateHash.slice(0, 16)}…)`,
    });
    deps.journal.append({
      kind: "LOSS_PROPOSED",
      key: lossKey(proposal.planId, plan.openedAt, proposal.installment),
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: due,
      amountArs: null,
      receipt: null,
      detail: `cap exhausted for plan=${proposal.planId}: route to admin_apply_loss (junior first)`,
    });
    return { status: "blocked", proposalId: proposal.id, detail: "blocked: surety cap exhausted for this plan" };
  }
  const chargeMicro = Math.min(due, remaining);
  const partial = chargeMicro < due;
  const amountArs = microUsdcToArs(chargeMicro, deps.env.mobbexArsPerUsdc);
  const reference = chargeReference(proposal.planId, plan.openedAt, proposal.installment, attemptFor(deps.journal, proposal.key));
  let result: ChargeResult | SimulatedCharge;
  try {
    result = await deps.gateway.charge({
      subscriberId: binding.subscriberId,
      totalArs: amountArs,
      reference,
      description: `Lazo plan ${proposal.planId} installment ${proposal.installment} (+penalty)`,
    });
  } catch (e) {
    const msg = e instanceof GatewayError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : String(e);
    deps.journal.append({
      kind: "ERROR",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: chargeMicro,
      amountArs,
      receipt: null,
      detail: `charge error (unknown outcome, same reference will be retried): ${msg} reference=${reference}`,
    });
    return { status: "error", proposalId: proposal.id, detail: msg };
  }
  if (result.simulated) {
    deps.journal.append({
      kind: "CHARGE_SIMULATED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: chargeMicro,
      amountArs,
      receipt: null,
      detail: `approved_by=${args.approvedBy} ${result.reason}`,
    });
    return { status: "simulated", proposalId: proposal.id, detail: result.reason };
  }
  if (!result.approved) {
    deps.journal.append({
      kind: "CHARGE_FAILED",
      key: proposal.key,
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: chargeMicro,
      amountArs,
      receipt: null,
      detail: `approved_by=${args.approvedBy} gateway declined status=${result.statusCode ?? "?"} reference=${reference}`,
    });
    deps.journal.append({
      kind: "LOSS_PROPOSED",
      key: lossKey(proposal.planId, plan.openedAt, proposal.installment),
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: chargeMicro,
      amountArs,
      receipt: null,
      detail: `funding failed for plan=${proposal.planId} installment=${proposal.installment}: route to admin_apply_loss (junior first)`,
    });
    return { status: "failed", proposalId: proposal.id, detail: `gateway declined (status ${result.statusCode ?? "?"})` };
  }
  deps.journal.append({
    kind: "CHARGE_OK",
    key: proposal.key,
    proposalId: proposal.id,
    planId: proposal.planId,
    installment: proposal.installment,
    amountMicro: chargeMicro,
    amountArs: result.totalArs ?? amountArs,
    receipt: result.receiptHash,
    detail:
      `approved_by=${args.approvedBy} execution=${result.executionUid ?? "?"} ` +
      `payment=${result.paymentId ?? "?"} reference=${reference} verified_via=operations_api` +
      (partial ? ` partial(due=${due} cap_remaining=${remaining})` : ""),
    at: now,
  });
  if (partial) {
    const shortfall = due - chargeMicro;
    deps.journal.append({
      kind: "LOSS_PROPOSED",
      key: lossKey(proposal.planId, plan.openedAt, proposal.installment),
      proposalId: proposal.id,
      planId: proposal.planId,
      installment: proposal.installment,
      amountMicro: shortfall,
      amountArs: null,
      receipt: null,
      detail: `partial charge capped at remaining surety room: shortfall=${shortfall} route to admin_apply_loss (junior first)`,
    });
  }
  return {
    status: "ok",
    proposalId: proposal.id,
    detail: partial
      ? `charged ARS ${result.totalArs ?? amountArs} (verified, partial: cap room exhausted, shortfall proposed as loss)`
      : `charged ARS ${result.totalArs ?? amountArs} (verified); recovery registration is a separate approved proposal`,
  };
}

// --- CLI ----------------------------------------------------------------------

function usage(): string {
  return [
    "lazo keeper (devnet demo) — dry-run by default",
    "",
    "  node src/run.ts once [--adapter codama|stub]",
    "                                evaluate plans, write proposals, print them",
    "  node src/run.ts loop [--adapter codama]",
    "                                repeat `once` every KEEPER_POLL_SECONDS",
    "  node src/run.ts proposals   list open proposals",
    "  node src/run.ts --execute --proposal <id> --approved-by <name> --yes [--adapter codama]",
    "                                execute ONE proposal (the explicit approval)",
    "  npx tsx src/run.ts guarantee --acceptance <id> --approved-by <name> --yes",
    "                                simulate + send keeper_register_guarantee",
    "                                (needs tsx: imports the generated client)",
    "",
    "The loop never signs, charges, or sends. Only --execute / guarantee with",
    "all three flags performs an effect, and every effect is journaled",
    "idempotently. The codama adapter reads the real chain; stub (default)",
    "reports pending_client.",
  ].join("\n");
}

async function loadCodamaAdapter(env: KeeperEnv): Promise<ChainAdapter> {
  const program = process.env.NEXT_PUBLIC_CUOTAS_PROGRAM_ID;
  if (!program) {
    console.error("refused: --adapter codama needs NEXT_PUBLIC_CUOTAS_PROGRAM_ID");
    process.exit(2);
  }
  try {
    const { CodamaAdapter } = await import("./codama.ts");
    return new CodamaAdapter({
      rpcUrl: env.rpcUrl,
      program,
      keeperKeypairPath: env.keeperKeypairPath,
      fiadorDataDir: env.fiadorDataDir,
    });
  } catch (e) {
    console.error(`refused: codama adapter failed to load (${e instanceof Error ? e.message : e})`);
    console.error("hint: run keeper commands that touch the chain under tsx (npx tsx src/run.ts ...)");
    process.exit(2);
  }
}

function parseExecute(argv: string[]): { proposal: string; approvedBy: string } | null {
  if (!argv.includes("--execute")) return null;
  const at = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  };
  const proposal = at("--proposal");
  const approvedBy = at("--approved-by");
  const yes = argv.includes("--yes");
  if (!proposal || !approvedBy || !yes) {
    console.error("refused: --execute needs --proposal <id> --approved-by <name> --yes (all three)");
    process.exit(2);
  }
  return { proposal, approvedBy };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    console.log(usage());
    return;
  }
  const env = loadKeeperEnv();
  const journal = new Journal(env.dataDir);
  const useMock = process.argv.includes("--mock-adapter");
  const useCodama = argv.includes("--adapter") && argv[argv.indexOf("--adapter") + 1] === "codama";
  let adapter: ChainAdapter;
  if (useMock) {
    adapter = new MockAdapter({
      config: { graceDays: 5, guarantorNoticeDay: null, guarantorChargeDay: 15, secondsPerDay: 86400, penaltyBps: 500 },
      plans: [],
      bindings: {},
    });
  } else if (useCodama) {
    adapter = await loadCodamaAdapter(env);
  } else {
    adapter = new StubAdapter();
  }
  const gateway = new MobbexGateway(env);
  const deps: RunDeps = { adapter, gateway, journal, env, log: (l) => console.log(l) };

  const exec = parseExecute(argv);
  if (exec) {
    const proposal = journal.findProposal(exec.proposal);
    if (!proposal) {
      console.error(`unknown or closed proposal: ${exec.proposal}`);
      process.exit(1);
    }
    console.log(`executing ${proposal.id}: ${proposal.detail}`);
    if (proposal.amountArs != null) console.log(`  ARS amount reviewed: ${proposal.amountArs}`);
    console.log(`  approved by: ${exec.approvedBy}`);
    const report = await executeProposal(deps, { proposalId: exec.proposal, approvedBy: exec.approvedBy });
    console.log(`${report.status}: ${report.detail}`);
    if (report.signature) console.log(`  signature: ${report.signature}`);
    process.exit(report.status === "ok" || report.status === "simulated" ? 0 : 1);
  }

  const cmd = argv[0];
  if (cmd === "guarantee") {
    const at = (flag: string): string | null => {
      const i = argv.indexOf(flag);
      return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
    };
    const acceptanceId = at("--acceptance");
    const approvedBy = at("--approved-by");
    const yes = argv.includes("--yes");
    if (!acceptanceId || !approvedBy || !yes) {
      console.error("refused: guarantee needs --acceptance <id> --approved-by <name> --yes (all three)");
      process.exit(2);
    }
    const acceptance = readAcceptanceById(env.fiadorDataDir, acceptanceId);
    if (!acceptance) {
      console.error(`unknown acceptance: ${acceptanceId} (check FIADOR_DATA_DIR)`);
      process.exit(1);
    }
    console.log(`keeper_register_guarantee (devnet):`);
    console.log(`  student:      ${acceptance.student}`);
    console.log(`  max_purchase: ${acceptance.maxPurchase}`);
    console.log(`  coverage_max: ${acceptance.coverageMax}`);
    console.log(`  mandate_hash: ${acceptance.mandateHash}`);
    console.log(`  approved by:  ${approvedBy}`);
    const program = process.env.NEXT_PUBLIC_CUOTAS_PROGRAM_ID;
    if (!program) {
      console.error("refused: guarantee needs NEXT_PUBLIC_CUOTAS_PROGRAM_ID");
      process.exit(2);
    }
    let chain;
    try {
      const { KitGuaranteeChain } = await import("./codama.ts");
      chain = new KitGuaranteeChain({
        rpcUrl: env.rpcUrl,
        program,
        keeperKeypairPath: env.keeperKeypairPath,
        fiadorDataDir: env.fiadorDataDir,
      });
    } catch (e) {
      console.error(`refused: guarantee chain failed to load (${e instanceof Error ? e.message : e})`);
      console.error("hint: run under tsx: npx tsx src/run.ts guarantee ...");
      process.exit(2);
    }
    const { executeGuaranteeRegistration } = await import("./guarantee.ts");
    const report = await executeGuaranteeRegistration({ chain, journal }, { acceptance, approvedBy });
    console.log(`${report.status}: ${report.detail}`);
    if (report.signature) console.log(`  signature: ${report.signature}`);
    process.exit(report.status === "error" ? 1 : 0);
  }
  if (cmd === "proposals") {
    const open = journal.openProposals();
    if (open.length === 0) console.log("no open proposals");
    for (const p of open) {
      console.log(`${p.id} [${p.kind}] ${p.detail}${p.amountArs != null ? ` ARS ${p.amountArs}` : ""}`);
    }
    return;
  }
  if (cmd === "once") {
    const report = await runOnce(deps);
    console.log(`ready=${report.ready} plans=${report.plans} proposed=${report.proposed.length} synced=${report.synced.length} open=${report.open.length}`);
    if (!report.ready) console.log(`reason: ${report.reason}`);
    for (const p of report.open) {
      console.log(`  ${p.id} [${p.kind}] ${p.detail}${p.amountArs != null ? ` ARS ${p.amountArs}` : ""}`);
    }
    return;
  }
  if (cmd === "loop") {
    console.log(`keeper loop every ${env.pollSeconds}s (dry-run; Ctrl-C to stop)`);
    for (;;) {
      const report = await runOnce(deps);
      console.log(
        `[${new Date().toISOString()}] ready=${report.ready} plans=${report.plans} proposed=${report.proposed.length} open=${report.open.length}`,
      );
      await new Promise((r) => setTimeout(r, env.pollSeconds * 1000));
    }
  }
  console.error(usage());
  process.exit(2);
}

const invoked = process.argv[1]?.endsWith("run.ts") ?? false;
if (invoked) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
