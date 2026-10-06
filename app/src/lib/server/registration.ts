// On-chain registration proposal for keeper_register_guarantee.
// The accept endpoint returns this as a DRY-RUN proposal; nothing is signed
// or sent there. Signing happens ONLY in the keeper CLI after explicit
// operator approval; the registrar route then VERIFIES the on-chain
// signature (read-only) before marking anything registered. No private key
// ever touches HTTP input.
export const PROGRAM_ID = "E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ";
export const PROGRAM_NETWORK = "devnet";

export interface RegisterProposal {
  instruction: "keeper_register_guarantee";
  program: string;
  network: "devnet";
  args: { max_purchase: number; coverage_max: number; mandate_hash: string };
  accounts: { keeper: string; student: string; guaranteePdaSeeds: [string, string] };
  status: "pending_approval" | "pending_client" | "registered";
}

export function buildRegisterProposal(args: {
  student: string;
  maxPurchase: number;
  coverageMax: number;
  mandateHash: string;
  keeper: string;
  status: RegisterProposal["status"];
}): RegisterProposal {
  return {
    instruction: "keeper_register_guarantee",
    program: PROGRAM_ID,
    network: PROGRAM_NETWORK,
    args: { max_purchase: args.maxPurchase, coverage_max: args.coverageMax, mandate_hash: args.mandateHash },
    accounts: { keeper: args.keeper, student: args.student, guaranteePdaSeeds: ["guarantee", args.student] },
    status: args.status,
  };
}
