import { describe, expect, it } from "vitest";
import { PROGRAM_ID, buildRegisterProposal } from "./registration";

describe("registration proposal", () => {
  it("builds a devnet-only proposal for the deployed program", () => {
    const p = buildRegisterProposal({
      student: "S",
      maxPurchase: 1,
      coverageMax: 2,
      mandateHash: "ab".repeat(32),
      keeper: "K",
      status: "pending_approval",
    });
    expect(p.program).toBe(PROGRAM_ID);
    expect(p.network).toBe("devnet");
    expect(p.instruction).toBe("keeper_register_guarantee");
    expect(p.accounts.guaranteePdaSeeds).toEqual(["guarantee", "S"]);
  });
});
