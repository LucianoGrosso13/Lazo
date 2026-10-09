import { describe, expect, it } from "vitest";
import { poolToOrbState } from "./state";

describe("poolToOrbState", () => {
  it.each([0, 0.5, 1])("represents utilization %s without changing total energy", (ratio) => {
    const result = poolToOrbState({ available: (1 - ratio) * 100_000_000, outstandingCredit: ratio * 100_000_000 });
    expect(result.disponibleRatio).toBe(1 - ratio);
    expect(result.prestadoRatio).toBe(ratio);
    expect(result.intensidad).toBeCloseTo(Math.log1p(100) / (1 + Math.log1p(100)));
  });
  it("has no asset sectors or light in an empty pool", () => {
    expect(poolToOrbState({ available: 0, outstandingCredit: 0 })).toEqual({ disponibleRatio: 0, prestadoRatio: 0, intensidad: 0 });
  });
  it("increases brightness with total liquidity and stays bounded", () => {
    const energy = [1, 10, 1000, 1_000_000].map(n => poolToOrbState({ available: n * 1_000_000, outstandingCredit: 0 }).intensidad);
    expect(energy.every((n, i) => n > 0 && n < 1 && (i === 0 || n > energy[i - 1]))).toBe(true);
  });
  it("sanitizes invalid balances", () => {
    expect(poolToOrbState({ available: NaN, outstandingCredit: -5 })).toEqual({ disponibleRatio: 0, prestadoRatio: 0, intensidad: 0 });
  });
});
