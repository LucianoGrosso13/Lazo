import { describe, expect, it } from "vitest";
import { layoutBands } from "./prism-stage";
import { lift, toSlices } from "./prism-3d-renderer";

const band = (id: string, color: string, shown: number) => ({ id, color, shown });

describe("toSlices", () => {
  it("una sola banda ocupa toda la cara de salida y todo el abanico", () => {
    const geom = layoutBands([band("down", "#9945FF", 1000)], 1000, 1);
    expect(toSlices(geom)).toEqual([{ e0: 226, e1: 336, f0: 96, f1: 500, color: "#9945FF", on: true }]);
  });

  it("reparte cara y abanico en proporción y conserva color y encendido", () => {
    const geom = layoutBands([band("down", "#9945FF", 300), band("c1", "#00C2FF", 700)], 1000, 2);
    const [down, c1] = toSlices(geom);
    // la cara de salida se parte sin huecos: 226..336 en 30/70
    expect(down.e0).toBe(226);
    expect(down.e1).toBeCloseTo(259, 6);
    expect(c1.e0).toBeCloseTo(259, 6);
    expect(c1.e1).toBeCloseTo(336, 6);
    // el abanico también, en 30/70 del tramo útil
    expect(down.f0).toBe(96);
    expect(c1.f1).toBeCloseTo(500, 6);
    expect(down.f1 - down.f0).toBeCloseTo((c1.f1 - c1.f0) * (3 / 7), 6);
    expect(down.color).toBe("#9945FF");
    expect(c1.color).toBe("#00C2FF");
    expect(down.on).toBe(true);
    expect(c1.on).toBe(true);
  });

  it("conserva las bandas apagadas para que el pool las oculte", () => {
    const geom = layoutBands([band("down", "#9945FF", 1000), band("c1", "#00C2FF", 0)], 1000, 1);
    const [, c1] = toSlices(geom);
    expect(c1.on).toBe(false);
    expect(c1.color).toBe("#00C2FF");
  });

  it("lista vacía afuera, lista vacía adentro", () => {
    expect(toSlices(layoutBands([], 1, 0))).toEqual([]);
  });
});

describe("lift", () => {
  it("en el plano z=0 es identidad: la banda queda clavada al viewBox", () => {
    expect(lift(4.66, -2.5, 0)).toEqual([4.66, -2.5]);
    expect(lift(-8.5, 4.9, 0)).toEqual([-8.5, 4.9]);
  });

  it("a profundidad corrige hacia el ancla de cámara (parallax exacto)", () => {
    const [x, y] = lift(4.66, 2.5, 1.26);
    // el punto proyectado vuelve al (x0,y0) del plano: la corrección es la
    // fracción z/CAM.z del desplazamiento desde la cámara
    expect(x).toBeCloseTo(4.66 - (4.66 - 1.15) * (1.26 / 15.9), 6);
    expect(y).toBeCloseTo(2.5 - (2.5 - 1.9) * (1.26 / 15.9), 6);
  });

  it("puntos sobre el eje de la cámara no se mueven", () => {
    // un punto en (CAM.x, CAM.y) ya está bajo la cámara: sin parallax
    expect(lift(1.15, 1.9, 2)).toEqual([1.15, 1.9]);
  });
});
