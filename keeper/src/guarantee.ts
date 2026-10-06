// Keeper-side guarantee registration (plain-node logic; the kit transport is
// injected). The operator runs:
//   npx tsx src/run.ts guarantee --acceptance <id> --approved-by <name> --yes
// which simulates + sends keeper_register_guarantee with the local keeper
// key, then journals the signature. The UI registrar verifies that signature
// on-chain before marking anything registered. Re-running an already
// terminal acceptance is a no-op sync (never a duplicate registration: the
// program rejects re-init and the chain pre-checks existence first).
import { guaranteeKey, type Journal } from "./journal.ts";
import type { GuaranteeChain } from "./codama.ts";

export interface GuaranteeAcceptance {
  id: string;
  student: string;
  maxPurchase: number;
  coverageMax: number;
  mandateHash: string;
}

export interface GuaranteeDeps {
  chain: GuaranteeChain;
  journal: Journal;
  now?: number;
}

export type GuaranteeStatus = "ok" | "synced" | "error";

export interface GuaranteeReport {
  status: GuaranteeStatus;
  signature: string | null;
  detail: string;
}

export async function executeGuaranteeRegistration(
  deps: GuaranteeDeps,
  args: { acceptance: GuaranteeAcceptance; approvedBy: string },
): Promise<GuaranteeReport> {
  const now = deps.now ?? Math.floor(Date.now() / 1000);
  const key = guaranteeKey(args.acceptance.student);
  if (deps.journal.hasTerminal(key)) {
    return { status: "synced", signature: null, detail: `journal already terminal for ${args.acceptance.student}` };
  }
  let res: { signature: string } | { alreadyRegistered: true };
  try {
    res = await deps.chain.registerGuarantee(args.acceptance.student, {
      maxPurchase: args.acceptance.maxPurchase,
      coverageMax: args.acceptance.coverageMax,
      mandateHash: args.acceptance.mandateHash,
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    deps.journal.append({
      kind: "ERROR",
      key,
      proposalId: null,
      planId: null,
      installment: null,
      amountMicro: args.acceptance.coverageMax,
      amountArs: null,
      receipt: null,
      detail: `guarantee registration failed: ${detail}`,
      at: now,
    });
    return { status: "error", signature: null, detail };
  }
  if ("alreadyRegistered" in res) {
    deps.journal.append({
      kind: "GUARANTEE_REGISTERED",
      key,
      proposalId: null,
      planId: null,
      installment: null,
      amountMicro: args.acceptance.coverageMax,
      amountArs: null,
      receipt: null,
      detail: `synced: guarantee already exists on-chain for ${args.acceptance.student}`,
      at: now,
    });
    return { status: "synced", signature: null, detail: "guarantee already exists on-chain (synced, nothing sent)" };
  }
  deps.journal.append({
    kind: "GUARANTEE_REGISTERED",
    key,
    proposalId: null,
    planId: null,
    installment: null,
    amountMicro: args.acceptance.coverageMax,
    amountArs: null,
    receipt: null,
    detail: `approved_by=${args.approvedBy} signature=${res.signature} acceptance=${args.acceptance.id}`,
    at: now,
  });
  return { status: "ok", signature: res.signature, detail: "guarantee registered (paste the signature into the UI registrar to verify)" };
}
