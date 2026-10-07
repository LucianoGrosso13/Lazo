// La vidriera estima la opción alternativa (6 cuotas) sin wallet con la
// misma cuenta que `computeQuote`: estos tests la contrastan con el mock
// real y con `splitPurchase` (el split de 3 cuotas que ya usa la página).
import { describe, expect, it } from "vitest";
import { DEMO_CONFIG } from "@/lib/cuotas/demo-config";
import { createMockCuotas } from "@/lib/cuotas/mock";
import {
  defaultPlanOption,
  DEMO_STUDENT_NEW,
  toMicro,
  type ProtocolConfig,
} from "@/lib/cuotas";
import { splitPurchase } from "@/components/landing/split";
import { altPlanOption, formatBps, installmentsForOption } from "./plan-alt";

describe("altPlanOption", () => {
  it("devuelve la opción habilitada que no es la por defecto", () => {
    expect(altPlanOption(DEMO_CONFIG)?.installments).toBe(6);
  });

  it("sin planOptions en la config no hay alternativa", () => {
    // Config histórica (pre-3/6): el fallback usa installmentsCount solo.
    const legacy: ProtocolConfig = { ...DEMO_CONFIG };
    delete legacy.planOptions;
    expect(altPlanOption(legacy)).toBeUndefined();
  });

  it("una opción deshabilitada no es alternativa", () => {
    const cfg: ProtocolConfig = {
      ...DEMO_CONFIG,
      planOptions: DEMO_CONFIG.planOptions!.map((o) =>
        o.installments === 6 ? { ...o, enabled: false } : o,
      ),
    };
    expect(altPlanOption(cfg)).toBeUndefined();
  });
});

describe("installmentsForOption", () => {
  it("6 cuotas: interés sobre lo financiado, última cuota absorbe el redondeo", () => {
    const six = DEMO_CONFIG.planOptions!.find((o) => o.installments === 6)!;
    const inst = installmentsForOption(DEMO_CONFIG, toMicro(1000), 0, six);
    // Escalón 0: anticipo 300 → financiado 700 → interés 3% = 21 → repaga 721.
    expect(inst).toHaveLength(6);
    expect(inst.reduce((a, b) => a + b, 0)).toBe(721_000_000);
    expect(inst[0]).toBe(Math.floor(721_000_000 / 6));
  });

  it("coincide con quote() del mock para un estudiante nuevo con fiador", async () => {
    const c = createMockCuotas();
    const six = DEMO_CONFIG.planOptions!.find((o) => o.installments === 6)!;
    // La vista sin wallet cotiza el escalón 0 con fiador (como splitPurchase):
    // un estudiante nuevo con garantía activa cae en la misma cuenta.
    await c.registerGuarantee({
      student: DEMO_STUDENT_NEW,
      maxPurchase: toMicro(1500),
      coverageMax: toMicro(1500),
      mandateHash: "00",
    });
    const q = await c.quote(toMicro(1000), DEMO_STUDENT_NEW, {
      installments: 6,
    });
    expect(q.tier).toBe(0);
    expect(installmentsForOption(DEMO_CONFIG, toMicro(1000), 0, six)).toEqual(
      q.installments,
    );
    expect(q.interestTotalBps).toBe(six.interestTotalBps);
  });

  it("con la opción por defecto replica el split de 3 cuotas", () => {
    const def = defaultPlanOption(DEMO_CONFIG)!;
    const price = toMicro(650);
    expect(installmentsForOption(DEMO_CONFIG, price, 0, def)).toEqual(
      splitPurchase(DEMO_CONFIG, price, 0).installments,
    );
  });
});

describe("formatBps", () => {
  it("300 → '3%' y 625 → '6,25%'/'6.25%' según locale", () => {
    expect(formatBps(300, "es")).toBe("3%");
    expect(formatBps(625, "es")).toBe("6,25%");
    expect(formatBps(625, "en")).toBe("6.25%");
  });
});
