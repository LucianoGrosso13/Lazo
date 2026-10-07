import { describe, expect, it } from "vitest";
import { bandColor, spectrumAt } from "./band-color";

const STOPS = ["#9945FF", "#6C63FF", "#00C2FF", "#19FB9B"] as const;

describe("spectrumAt", () => {
  it("cae exacto sobre las paradas del espectro", () => {
    expect(spectrumAt(STOPS, 0)).toBe("#9945ff");
    expect(spectrumAt(STOPS, 1 / 3)).toBe("#6c63ff");
    expect(spectrumAt(STOPS, 2 / 3)).toBe("#00c2ff");
    expect(spectrumAt(STOPS, 1)).toBe("#19fb9b");
  });

  it("interpola el punto medio entre dos paradas", () => {
    expect(spectrumAt(["#000000", "#ffffff"], 0.5)).toBe("#808080");
  });

  it("clampa posiciones fuera de rango", () => {
    expect(spectrumAt(STOPS, -1)).toBe("#9945ff");
    expect(spectrumAt(STOPS, 2)).toBe("#19fb9b");
  });
});

describe("bandColor", () => {
  it("con 4 bandas reproduce el reparto actual del hero", () => {
    const colors = [0, 1, 2, 3].map((i) => bandColor(STOPS, i, 4));
    expect(colors).toEqual([...STOPS].map((c) => c.toLowerCase()));
  });

  it("con 7 bandas (anticipo + 6 cuotas) reparte todo el gradiente", () => {
    const colors = [0, 1, 2, 3, 4, 5, 6].map((i) => bandColor(STOPS, i, 7));
    expect(new Set(colors).size).toBe(7);
    expect(colors[0]).toBe("#9945ff");
    expect(colors[6]).toBe("#19fb9b");
  });

  it("una sola banda toma el primer color", () => {
    expect(bandColor(STOPS, 0, 1)).toBe("#9945ff");
  });
});
