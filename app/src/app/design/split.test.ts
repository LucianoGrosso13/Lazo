import { describe, expect, it } from "vitest";
import { toMicro, type TierParams } from "@/lib/cuotas";
import { demoSplit } from "./split";

const tier30: TierParams = {
  downPaymentBps: 3000,
  guarantorCoverageBps: 10_000,
  maxPurchase: toMicro(1000),
  interestBps: 0,
};
const tier0: TierParams = { ...tier30, downPaymentBps: 0 };

describe("demoSplit", () => {
  it("parte el precio en anticipo + cuotas que suman el financiado", () => {
    const s = demoSplit(toMicro(1000), tier30, 3);
    expect(s.down).toBe(toMicro(300));
    expect(s.financed).toBe(toMicro(700));
    expect(s.installments).toHaveLength(3);
    expect(s.installments.reduce((a, b) => a + b, 0)).toBe(s.financed);
  });

  it("la última cuota absorbe el redondeo", () => {
    const s = demoSplit(toMicro(1000), tier30, 3);
    // 700 / 3 no cierra en micro: 233,333333 / 233,333333 / 233,333334
    expect(s.installments).toEqual([233_333_333, 233_333_333, 233_333_334]);
  });

  it("escalón 3: sin anticipo, todo financiado", () => {
    const s = demoSplit(toMicro(1500), tier0, 3);
    expect(s.down).toBe(0);
    expect(s.financed).toBe(toMicro(1500));
    expect(s.installments).toEqual([500_000_000, 500_000_000, 500_000_000]);
  });

  it("precios chicos: centavos repartidos sin perder micros", () => {
    const s = demoSplit(toMicro(120), tier30, 3);
    expect(s.down).toBe(toMicro(36));
    expect(s.installments.reduce((a, b) => a + b, 0)).toBe(toMicro(84));
  });
});
