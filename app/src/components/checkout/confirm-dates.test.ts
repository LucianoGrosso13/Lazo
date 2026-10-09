// Fechas de la revisión: el intervalo entre cuotas sale SIEMPRE de la
// config vigente (`installmentIntervalDays`, expuesto por real y mock) —
// sin valor la UI omite fechas, no inventa un 30. Misma verdad que los
// vencimientos del plan recuperado.
import { describe, expect, it } from "vitest";
import { previewDueDates } from "./confirm-panel";

const DAY = 86_400;

describe("previewDueDates", () => {
  it("devuelve una fecha por cuota, separadas por el intervalo", () => {
    expect(previewDueDates(1_000, 3, DAY, 30)).toEqual([
      1_000 + 30 * DAY,
      1_000 + 60 * DAY,
      1_000 + 90 * DAY,
    ]);
  });

  it("respeta un intervalo distinto de la config vigente", () => {
    const dates = previewDueDates(1_000, 3, DAY, 15);
    expect(dates).toEqual([
      1_000 + 15 * DAY,
      1_000 + 30 * DAY,
      1_000 + 45 * DAY,
    ]);
    // Distinto del calendario de 30 días: la revisión no puede contradecir
    // al plan si el protocolo usa otro intervalo.
    expect(dates[1]).not.toBe(1_000 + 60 * DAY);
  });

  it("honra el secondsPerDay del reloj (el mock puede acelerar el tiempo)", () => {
    expect(previewDueDates(0, 1, 60, 30)).toEqual([30 * 60]);
  });
});
