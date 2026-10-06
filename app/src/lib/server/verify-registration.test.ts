import { address } from "@solana/kit";
import { describe, expect, it } from "vitest";
import { getKeeperRegisterGuaranteeInstructionDataEncoder } from "@/generated/instructions/keeperRegisterGuarantee";
import { findGuaranteePda } from "@/generated/pdas";
import { verifyGuaranteeRegistration } from "./verify-registration";

const PROGRAM = "E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ";
const KEEPER = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";
const STUDENT = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1";
const SIG = "5".repeat(88);
const HASH = "ab".repeat(32);

const expected = { student: STUDENT, maxPurchase: 1_000_000_000, coverageMax: 735_000_000, mandateHash: HASH };

const ixData = (over: { maxPurchase?: bigint; coverageMax?: bigint; hash?: Uint8Array } = {}): string => {
  const hash = over.hash ?? Uint8Array.from(Buffer.from(HASH, "hex"));
  const bytes = getKeeperRegisterGuaranteeInstructionDataEncoder().encode({
    maxPurchase: over.maxPurchase ?? BigInt(1_000_000_000),
    coverageMax: over.coverageMax ?? BigInt(735_000_000),
    mandateHash: hash,
  });
  return Buffer.from(new Uint8Array(bytes)).toString("base64");
};

interface TxOpts {
  data?: string;
  accounts?: string[];
  keeperSigner?: boolean;
  programId?: string;
  logs?: string[] | null;
  metaErr?: unknown;
}

const txFixture = async (opts: TxOpts = {}) => {
  const [guaranteePda] = await findGuaranteePda({ student: address(STUDENT) }, { programAddress: address(PROGRAM) });
  const accounts = opts.accounts ?? [KEEPER, "Config11111111111111111111111111111111111", STUDENT, String(guaranteePda), "11111111111111111111111111111111"];
  return {
    meta: { err: opts.metaErr ?? null, logMessages: opts.logs ?? ["Program log: Instruction: KeeperRegisterGuarantee"] },
    transaction: {
      message: {
        instructions: [{ programId: opts.programId ?? PROGRAM, accounts, data: opts.data ?? ixData() }],
        accountKeys: accounts.map((pubkey) => ({
          pubkey,
          signer: pubkey === KEEPER ? (opts.keeperSigner ?? true) : false,
          writable: true,
        })),
      },
    },
  };
};

const rpcFixture = (status: unknown, tx: unknown) =>
  ({
    getSignatureStatuses: () => ({ send: async () => ({ value: [status] }) }),
    getTransaction: () => ({ send: async () => tx }),
  }) as never;

const confirmed = { err: null, confirmationStatus: "finalized" };

describe("verifyGuaranteeRegistration", () => {
  it("verifies a matching registration (real instruction codec)", async () => {
    const rpc = rpcFixture(confirmed, await txFixture());
    const r = await verifyGuaranteeRegistration(rpc, address(PROGRAM), KEEPER, SIG, expected);
    expect(r).toEqual({ verified: true });
  });

  it("rejects unknown, failed, and unconfirmed signatures", async () => {
    const tx = await txFixture();
    expect((await verifyGuaranteeRegistration(rpcFixture(null, tx), address(PROGRAM), KEEPER, SIG, expected)).verified).toBe(false);
    expect(
      (await verifyGuaranteeRegistration(rpcFixture({ err: { InstructionError: [0, "Custom"] }, confirmationStatus: "finalized" }, tx), address(PROGRAM), KEEPER, SIG, expected)),
    ).toEqual(expect.objectContaining({ verified: false, reason: "signature_tx_failed" }));
    expect(
      (await verifyGuaranteeRegistration(rpcFixture({ err: null, confirmationStatus: "processed" }, tx), address(PROGRAM), KEEPER, SIG, expected)),
    ).toEqual(expect.objectContaining({ verified: false, reason: "signature_unconfirmed" }));
    expect(
      (await verifyGuaranteeRegistration(rpcFixture(confirmed, null), address(PROGRAM), KEEPER, SIG, expected)),
    ).toEqual(expect.objectContaining({ verified: false, reason: "signature_not_found" }));
  });

  it("rejects arg mismatches via the generated decoder (never string matching)", async () => {
    for (const data of [
      ixData({ maxPurchase: BigInt(999_000_000) }),
      ixData({ coverageMax: BigInt(1) }),
      ixData({ hash: new Uint8Array(32) }),
      Buffer.from("not-an-instruction").toString("base64"),
    ]) {
      const rpc = rpcFixture(confirmed, await txFixture({ data }));
      const r = await verifyGuaranteeRegistration(rpc, address(PROGRAM), KEEPER, SIG, expected);
      expect(r).toEqual(expect.objectContaining({ verified: false, reason: "signature_mismatch" }));
    }
  });

  it("rejects wrong accounts, non-signer keeper, and missing Anchor logs", async () => {
    const base = await txFixture();
    const baseAccounts = (base.transaction.message.instructions[0] as { accounts: string[] }).accounts;
    // Wrong student.
    const wrongStudent = { ...base, transaction: { message: { ...base.transaction.message, instructions: [{ programId: PROGRAM, accounts: [baseAccounts[0], baseAccounts[1], "11111111111111111111111111111111", baseAccounts[3], baseAccounts[4]], data: ixData() }] } } };
    expect((await verifyGuaranteeRegistration(rpcFixture(confirmed, wrongStudent), address(PROGRAM), KEEPER, SIG, expected)).verified).toBe(false);
    // Keeper not a signer.
    const notSigner = await txFixture({ keeperSigner: false });
    expect((await verifyGuaranteeRegistration(rpcFixture(confirmed, notSigner), address(PROGRAM), KEEPER, SIG, expected)).verified).toBe(false);
    // Missing Anchor log corroboration.
    const noLogs = await txFixture({ logs: ["Program log: something else"] });
    expect((await verifyGuaranteeRegistration(rpcFixture(confirmed, noLogs), address(PROGRAM), KEEPER, SIG, expected)).verified).toBe(false);
    // Other program.
    const otherProgram = await txFixture({ programId: "11111111111111111111111111111111" });
    expect((await verifyGuaranteeRegistration(rpcFixture(confirmed, otherProgram), address(PROGRAM), KEEPER, SIG, expected)).verified).toBe(false);
  });
});
