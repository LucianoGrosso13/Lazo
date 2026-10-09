import { describe, expect, it } from "vitest";
import { toMicro } from "@/lib/cuotas";
import { cfteaTotalCost } from "./split";

const base = { downPayment: toMicro(300), financed: toMicro(700), installments: 3 };

describe("cfteaTotalCost", () => {
  it("con CFTEA 0 cuesta el precio", () => {
    expect(cfteaTotalCost({ ...base, cfteaPct: 0 })).toBe(toMicro(1000));
  });

  it("convierte la CFTEA a tasa mensual equivalente y suma las cuotas del sistema francés", () => {
    // 76% anual efectivo → ~4,82% mensual → 3 cuotas de ~256,2 sobre 700.
    const min = cfteaTotalCost({ ...base, cfteaPct: 76 });
    expect(min / 1e6).toBeCloseTo(1068.59, 1);
    // 1.376% anual efectivo → ~25,2% mensual.
    const max = cfteaTotalCost({ ...base, cfteaPct: 1376 });
    expect(max / 1e6).toBeCloseTo(1378.18, 1);
  });

  it("una CFTEA más alta nunca cuesta menos", () => {
    const costs = [0, 10, 76, 300, 1376].map((cfteaPct) => cfteaTotalCost({ ...base, cfteaPct }));
    expect([...costs].sort((a, b) => a - b)).toEqual(costs);
  });

  it("sin saldo financiado el costo es el anticipo", () => {
    expect(cfteaTotalCost({ ...base, financed: 0, cfteaPct: 1376 })).toBe(toMicro(300));
  });
});
