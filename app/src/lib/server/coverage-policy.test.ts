import { describe, expect, it } from "vitest";
import {
  candidateInitialTier,
  candidateMaxAcrossTiers,
  coveragePolicyFromEnv,
  financedFor,
  resolveCoverageMax,
  withPenalty,
} from "./coverage-policy";

// Ronda 4 + precio: down 30/20/10/0%, penalty 500bps. Cap US$1.000.
const TIERS = [{ downPaymentBps: 3000 }, { downPaymentBps: 2000 }, { downPaymentBps: 1000 }, { downPaymentBps: 0 }];
const CAP = 1_000_000_000;
const PENALTY = 500;

describe("coverage candidates (pure math, floor convention)", () => {
  it("computes financed and penalty with floor division", () => {
    expect(financedFor(CAP, 3000)).toBe(700_000_000);
    expect(withPenalty(700_000_000, 500)).toBe(735_000_000);
    // Floor, not round: 999999 * 500 / 10000 = 49999.95 -> 49999.
    expect(withPenalty(999_999, 500)).toBe(1_049_998);
  });

  it("candidate A uses the initial tier only", () => {
    expect(candidateInitialTier(CAP, TIERS[0], PENALTY)).toBe(735_000_000);
  });

  it("candidate B takes the max across tiers", () => {
    // Tier 3 (down 0%): 1_000_000_000 + 50_000_000 = 1_050_000_000.
    expect(candidateMaxAcrossTiers(CAP, TIERS, PENALTY)).toBe(1_050_000_000);
    expect(resolveCoverageMax("B", CAP, TIERS, PENALTY)).toBe(1_050_000_000);
    expect(resolveCoverageMax("A", CAP, TIERS, PENALTY)).toBe(735_000_000);
  });

  it("rejects invalid inputs", () => {
    expect(() => financedFor(0, 3000)).toThrowError(expect.objectContaining({ code: "coverage_invalid_input" }));
    expect(() => financedFor(CAP, 10_001)).toThrowError(expect.objectContaining({ code: "coverage_invalid_input" }));
    expect(() => candidateMaxAcrossTiers(CAP, [], PENALTY)).toThrowError(
      expect.objectContaining({ code: "coverage_invalid_input" }),
    );
  });
});

describe("coverage policy selection", () => {
  it("reads an explicit A|B policy and refuses without a default", () => {
    const saved = process.env.FIADOR_COVERAGE_POLICY;
    try {
      process.env.FIADOR_COVERAGE_POLICY = "A";
      expect(coveragePolicyFromEnv()).toBe("A");
      process.env.FIADOR_COVERAGE_POLICY = "B";
      expect(coveragePolicyFromEnv()).toBe("B");
      delete process.env.FIADOR_COVERAGE_POLICY;
      expect(() => coveragePolicyFromEnv()).toThrowError(
        expect.objectContaining({ code: "coverage_policy_pending" }),
      );
      process.env.FIADOR_COVERAGE_POLICY = "C";
      expect(() => coveragePolicyFromEnv()).toThrowError(
        expect.objectContaining({ code: "coverage_policy_pending" }),
      );
    } finally {
      if (saved === undefined) delete process.env.FIADOR_COVERAGE_POLICY;
      else process.env.FIADOR_COVERAGE_POLICY = saved;
    }
  });
});
