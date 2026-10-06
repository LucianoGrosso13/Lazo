// On-chain registration verification (read-only). The registrar NEVER signs:
// the keeper key signs locally (keeper CLI) after operator review, and this
// module verifies the resulting signature before anything is marked
// registered. Checks, in order:
//   1. signature status: found, no error, confirmed/finalized;
//   2. transaction: found, no meta error;
//   3. a top-level keeper_register_guarantee instruction for this program
//      whose decoded args equal the acceptance (max_purchase, coverage_max,
//      mandate_hash via the generated data decoder — never string matching);
//   4. accounts: keeper == chain keeper AND a signer, student == acceptance
//      student, guarantee == ["guarantee", student] PDA;
//   5. Anchor log corroboration (`Instruction: KeeperRegisterGuarantee`).
import type { Address } from "@solana/kit";
import { getKeeperRegisterGuaranteeInstructionDataDecoder } from "@/generated/instructions/keeperRegisterGuarantee";
import { findGuaranteePda } from "@/generated/pdas";
import type { RpcLike } from "./chain";

export type VerifyReason =
  | "signature_not_found"
  | "signature_unconfirmed"
  | "signature_tx_failed"
  | "signature_mismatch";

export type VerifyResult = { verified: true } | { verified: false; reason: VerifyReason; detail: string };

export interface AcceptanceExpectation {
  student: string;
  maxPurchase: number;
  coverageMax: number;
  mandateHash: string;
}

interface ParsedInstruction {
  programId?: unknown;
  accounts?: unknown;
  data?: unknown;
}

const asAccountKeys = (v: unknown): { pubkey: string; signer: boolean }[] => {
  if (!Array.isArray(v)) return [];
  return v.flatMap((k): { pubkey: string; signer: boolean }[] => {
    if (typeof k === "string") return [{ pubkey: k, signer: false }];
    if (k && typeof k === "object" && typeof (k as { pubkey?: unknown }).pubkey === "string") {
      const o = k as { pubkey: string; signer?: unknown };
      return [{ pubkey: o.pubkey, signer: o.signer === true }];
    }
    return [];
  });
};

const asIxAccounts = (v: unknown): string[] => {
  if (!Array.isArray(v)) return [];
  return v.flatMap((a): string[] => {
    if (typeof a === "string") return [a];
    if (a && typeof a === "object" && typeof (a as { pubkey?: unknown }).pubkey === "string") {
      return [(a as { pubkey: string }).pubkey];
    }
    return [];
  });
};

const hexToBytes = (hex: string): Uint8Array | null => {
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

export async function verifyGuaranteeRegistration(
  rpc: RpcLike,
  program: Address,
  keeper: string,
  signature: string,
  expected: AcceptanceExpectation,
): Promise<VerifyResult> {
  // 1. Status.
  let statuses;
  try {
    statuses = await rpc.getSignatureStatuses([signature as never]).send();
  } catch (e) {
    return { verified: false, reason: "signature_not_found", detail: `status lookup failed: ${e instanceof Error ? e.message : "rpc failed"}` };
  }
  const status = (statuses as unknown as { value?: Array<{ err?: unknown; confirmationStatus?: unknown } | null> }).value?.[0] ?? null;
  if (!status) return { verified: false, reason: "signature_not_found", detail: "signature unknown to the RPC" };
  if (status.err) {
    return { verified: false, reason: "signature_tx_failed", detail: `transaction failed on-chain: ${JSON.stringify(status.err)}` };
  }
  if (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized") {
    return { verified: false, reason: "signature_unconfirmed", detail: `confirmation status is ${String(status.confirmationStatus)}` };
  }
  // 2. Transaction.
  let tx: unknown;
  try {
    tx = await rpc.getTransaction(signature as never, {
      commitment: "confirmed",
      encoding: "jsonParsed",
      maxSupportedTransactionVersion: 1,
    } as never).send();
  } catch (e) {
    return { verified: false, reason: "signature_not_found", detail: `transaction lookup failed: ${e instanceof Error ? e.message : "rpc failed"}` };
  }
  if (!tx || typeof tx !== "object") return { verified: false, reason: "signature_not_found", detail: "transaction not found" };
  const t = tx as {
    meta?: { err?: unknown; logMessages?: unknown } | null;
    transaction?: { message?: { instructions?: unknown; accountKeys?: unknown } };
  };
  if (t.meta?.err) {
    return { verified: false, reason: "signature_tx_failed", detail: `transaction failed on-chain: ${JSON.stringify(t.meta.err)}` };
  }
  const instructions = Array.isArray(t.transaction?.message?.instructions)
    ? (t.transaction?.message?.instructions as ParsedInstruction[])
    : [];
  const accountKeys = asAccountKeys(t.transaction?.message?.accountKeys);
  const [guaranteePda] = await findGuaranteePda({ student: expected.student as Address }, { programAddress: program });
  const expectedHash = hexToBytes(expected.mandateHash);
  if (!expectedHash) return { verified: false, reason: "signature_mismatch", detail: "acceptance mandate hash is malformed" };
  const decoder = getKeeperRegisterGuaranteeInstructionDataDecoder();
  let candidateFound = false;
  for (const ix of instructions) {
    if (ix.programId !== String(program) || typeof ix.data !== "string") continue;
    let decoded: ReturnType<typeof decoder.decode>;
    try {
      decoded = decoder.decode(Buffer.from(ix.data, "base64"));
    } catch {
      continue; // Not our instruction (discriminator or shape differs).
    }
    candidateFound = true;
    if (Number(decoded.maxPurchase) !== expected.maxPurchase) continue;
    if (Number(decoded.coverageMax) !== expected.coverageMax) continue;
    if (decoded.mandateHash.length !== 32 || !decoded.mandateHash.every((b, i) => b === (expectedHash as Uint8Array)[i])) continue;
    // 4. Accounts: [keeper, config, student, guarantee, system_program].
    const accounts = asIxAccounts(ix.accounts);
    if (accounts.length < 4) continue;
    if (accounts[0] !== keeper) continue;
    if (accounts[2] !== expected.student) continue;
    if (accounts[3] !== String(guaranteePda)) continue;
    if (!accountKeys.some((k) => k.pubkey === keeper && k.signer)) continue;
    // 5. Anchor log corroboration.
    const logs = Array.isArray(t.meta?.logMessages) ? (t.meta?.logMessages as unknown[]) : [];
    const logged = logs.some((l) => typeof l === "string" && l.includes("Instruction: KeeperRegisterGuarantee"));
    if (!logged) continue;
    return { verified: true };
  }
  return {
    verified: false,
    reason: "signature_mismatch",
    detail: candidateFound
      ? "instruction found but args/accounts/signer do not match the acceptance"
      : "no keeper_register_guarantee instruction for this program in the transaction",
  };
}
