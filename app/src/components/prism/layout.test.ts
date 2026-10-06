import { describe, expect, it } from "vitest";
import { toMicro } from "@/lib/cuotas";
import { COLORS, computePrism, type PrismBandInput } from "./layout";

const PC: PrismBandInput[] = [
  { id: "down", label: "Anticipo", amount: toMicro(300), kind: "down" },
  { id: "q1", label: "Cuota 1", amount: 233_333_333, kind: "installment" },
  { id: "q2", label: "Cuota 2", amount: 233_333_333, kind: "installment" },
  { id: "q3", label: "Cuota 3", amount: 233_333_334, kind: "installment" },
];
const INPUT = { label: "Precio", amount: toMicro(1000) };
const CMP = { label: "La competencia", amount: toMicro(1290) };

describe("computePrism", () => {
  const g = computePrism(INPUT, PC, CMP);

  it("el ancho de cada banda es proporcional al monto", () => {
    const down = g.bands[0];
    const q1 = g.bands[1];
    expect(down.x1 - down.x0).toBeCloseTo(toMicro(300) * g.unit, 9);
    expect(q1.x1 - q1.x0).toBeCloseTo(233_333_333 * g.unit, 9);
    // anticipo 300 > cuota 233 → banda más larga
    expect(down.x1 - down.x0).toBeGreaterThan(q1.x1 - q1.x0);
  });

  it("la misma unidad para todo: largos comparables entre haz y comparación", () => {
    const cmpLen = g.comparison.x1 - g.comparison.x0;
    expect(cmpLen).toBeCloseTo(toMicro(1290) * g.unit, 9);
    // el haz gris de la competencia es más largo que cualquier banda de Lazo
    for (const b of g.bands) expect(cmpLen).toBeGreaterThan(b.x1 - b.x0);
  });

  it("nada se sale del dibujo", () => {
    expect(g.comparison.x1).toBeLessThanOrEqual(0.985);
    for (const b of g.bands) {
      expect(b.x1).toBeLessThanOrEqual(0.986);
      expect(b.y).toBeGreaterThan(g.slab.y0);
      expect(b.y).toBeLessThan(g.slab.y1);
    }
  });

  it("el anticipo es violeta y las cuotas recorren cian → verde", () => {
    expect(g.bands[0].color).toEqual(COLORS.VIOLET);
    const inst = g.bands.slice(1);
    expect(inst[0].color).toEqual(COLORS.CYAN);
    expect(inst[2].color).toEqual(COLORS.GREEN);
    expect(inst[1].color[1]).toBeGreaterThan(COLORS.CYAN[1]);
  });

  it("merchant dibuja una banda de luz blanca", () => {
    const m = computePrism(INPUT, [{ id: "m", label: "Comercio", amount: toMicro(951), kind: "merchant" }], null);
    expect(m.bands[0].color).toEqual(COLORS.BEAM);
  });

  it("las marcas llegan a la banda correcta", () => {
    const s = computePrism(INPUT, PC, CMP, { q2: "cracked" });
    expect(s.bands[2].mark).toBe("cracked");
    expect(s.bands[0].mark).toBeNull();
  });

  it("precios chicos no rompen la escala", () => {
    const small = computePrism(
      { label: "Curso", amount: toMicro(120) },
      [
        { id: "down", label: "Anticipo", amount: toMicro(36), kind: "down" },
        { id: "q1", label: "Cuota", amount: toMicro(28), kind: "installment" },
      ],
      { label: "Competencia", amount: toMicro(155) },
    );
    expect(small.bands[0].x1).toBeLessThanOrEqual(0.986);
    expect(small.comparison.x1).toBeLessThanOrEqual(0.985);
  });
});
