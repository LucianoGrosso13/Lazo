// Surety coverage candidates (pure math, no default).
//
// The user decision is PENDING between two formulas for the fianza maximum
// (art. 1578 CCyC) derived from the guarantor's chosen purchase cap:
//   A "initial_tier": financed at the initial tier + penalty.
//   B "max_across_tiers": maximum of (financed + penalty) across tiers.
//
// Selection is explicit configuration (FIADOR_COVERAGE_POLICY=A|B) with NO
// default: unset or invalid refuses with coverage_policy_pending. Nothing
// here assigns a business default; tests cover the math only.
//
// Conventions mirror the on-chain program exactly ("Matemática", piso):
// floor division throughout, amounts in micro-USDC integers.
import { ServerEnvError } from "./env";

export type CoveragePolicy = "A" | "B";

export type CoverageCode = "coverage_policy_pending" | "coverage_invalid_input";

export class CoverageError extends Error {
  constructor(
    public readonly code: CoverageCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CoverageError";
  }
}

export interface CoverageTier {
  downPaymentBps: number;
}

function assertMicro(name: string, v: number): void {
  if (!Number.isSafeInteger(v) || v <= 0) {
    throw new CoverageError("coverage_invalid_input", `coverage_invalid_input: ${name} must be a positive integer`);
  }
}

function assertBps(name: string, v: number): void {
  if (!Number.isSafeInteger(v) || v < 0 || v > 10_000) {
    throw new CoverageError("coverage_invalid_input", `coverage_invalid_input: ${name} must be bps 0..10000`);
  }
}

/** financed = price - floor(price * downBps / 10000). */
export function financedFor(maxPurchase: number, downPaymentBps: number): number {
  assertMicro("maxPurchase", maxPurchase);
  assertBps("downPaymentBps", downPaymentBps);
  return maxPurchase - Math.floor((maxPurchase * downPaymentBps) / 10_000);
}

/** financed + floor(financed * penaltyBps / 10000). */
export function withPenalty(financed: number, penaltyBps: number): number {
  if (!Number.isSafeInteger(financed) || financed < 0) {
    throw new CoverageError("coverage_invalid_input", "coverage_invalid_input: financed must be a non-negative integer");
  }
  assertBps("penaltyBps", penaltyBps);
  return financed + Math.floor((financed * penaltyBps) / 10_000);
}

/** Candidate A: initial tier financed + penalty. */
export function candidateInitialTier(maxPurchase: number, initialTier: CoverageTier, penaltyBps: number): number {
  return withPenalty(financedFor(maxPurchase, initialTier.downPaymentBps), penaltyBps);
}

/** Candidate B: max over tiers of (financed + penalty). */
export function candidateMaxAcrossTiers(maxPurchase: number, tiers: CoverageTier[], penaltyBps: number): number {
  if (tiers.length === 0) {
    throw new CoverageError("coverage_invalid_input", "coverage_invalid_input: tiers must not be empty");
  }
  return Math.max(...tiers.map((t) => withPenalty(financedFor(maxPurchase, t.downPaymentBps), penaltyBps)));
}

export function resolveCoverageMax(
  policy: CoveragePolicy,
  maxPurchase: number,
  tiers: CoverageTier[],
  penaltyBps: number,
): number {
  if (policy === "A") {
    if (tiers.length === 0) {
      throw new CoverageError("coverage_invalid_input", "coverage_invalid_input: tiers must not be empty");
    }
    return candidateInitialTier(maxPurchase, tiers[0], penaltyBps);
  }
  return candidateMaxAcrossTiers(maxPurchase, tiers, penaltyBps);
}

/** Explicit selection from FIADOR_COVERAGE_POLICY. No default: unset refuses. */
export function coveragePolicyFromEnv(): CoveragePolicy {
  if (typeof window !== "undefined") throw new CoverageError("coverage_policy_pending", "server-only");
  const v = process.env.FIADOR_COVERAGE_POLICY;
  if (v === "A" || v === "B") return v;
  if (v == null || v === "") {
    throw new CoverageError(
      "coverage_policy_pending",
      "coverage_policy_pending: set FIADOR_COVERAGE_POLICY=A|B once the user picks the fianza formula",
    );
  }
  throw new CoverageError(
    "coverage_policy_pending",
    `coverage_policy_pending: FIADOR_COVERAGE_POLICY must be A or B (got ${JSON.stringify(v)})`,
  );
}

export function isCoverageEnvError(e: unknown): boolean {
  return e instanceof ServerEnvError || e instanceof CoverageError;
}
