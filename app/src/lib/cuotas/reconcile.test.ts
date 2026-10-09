// Reconciliación post-incertidumbre (`CuotasError("uncertain")`):
// sondear la cadena hasta verificar el efecto, jamás reenviar la tx.
import { describe, expect, it } from "vitest";
import { reconcileUntil, waitForOpenedPlan, waitForPlan } from "./reconcile";
import type { CuotasClient, Plan } from "./types";

const TERMS: Plan["terms"] = {
  termsVersion: 1,
  installmentsCount: 3,
  interestTotalBps: 0,
  downPaymentBps: 3000,
  coverageBps: 10_000,
  settlementId: "immediate",
  settlementDays: 0,
  settlementFeeBps: 700,
  provisional: false,
};

const planFixture = (over: Partial<Plan> = {}): Plan => ({
  id: "plan-1",
  student: "estudiante",
  merchant: "comercio",
  price: 1_000_000_000,
  downPayment: 300_000_000,
  financed: 700_000_000,
  merchantFee: 49_000_000,
  installments: [],
  openedAt: 1_700_000_000,
  status: "Active",
  counts: true,
  terms: TERMS,
  signature: "firma",
  ...over,
});

const clientWith = (batches: Plan[][]): Pick<CuotasClient, "getPlans"> => {
  let i = 0;
  return { getPlans: async () => batches[Math.min(i++, batches.length - 1)] };
};

describe("reconcileUntil", () => {
  it("devuelve el valor cuando `done` lo produce (reintenta tras errores)", async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      if (calls < 3) throw new Error("RPC caído");
      return "valor";
    };
    const res = await reconcileUntil(fetch, (v) => (v === "valor" ? 42 : null), {
      intervalMs: 5,
      sleep: async () => {},
    });
    expect(res).toBe(42);
    expect(calls).toBe(3);
  });

  it("sin veredicto dentro del plazo → null (sleep/now inyectados, sin reloj real)", async () => {
    let t = 0;
    const sleeps: number[] = [];
    const res = await reconcileUntil(
      async () => "nada",
      () => null,
      {
        intervalMs: 1_000,
        timeoutMs: 2_500,
        sleep: async (ms) => {
          sleeps.push(ms);
          t += ms;
        },
        now: () => t,
      },
    );
    expect(res).toBeNull();
    // Última espera recortada al deadline restante (min(interval, remaining)).
    expect(sleeps).toEqual([1_000, 1_000, 500]);
  });
});

describe("waitForOpenedPlan", () => {
  it("devuelve el plan del estudiante cuando aparece activo", async () => {
    const active = planFixture();
    const c = clientWith([[], [], [active]]);
    const found = await waitForOpenedPlan(c, "estudiante", {
      intervalMs: 1,
      sleep: async () => {},
    });
    expect(found).toBe(active);
  });

  it("ignora planes ajenos y saldados; null si nunca aparece", async () => {
    const c = clientWith([
      [planFixture({ student: "otro" }), planFixture({ status: "Settled" })],
    ]);
    const found = await waitForOpenedPlan(c, "estudiante", {
      intervalMs: 1,
      timeoutMs: 3,
      sleep: async () => {},
    });
    expect(found).toBeNull();
  });

  it("tolera lecturas que fallan (el plan puede tardar en indexarse)", async () => {
    let calls = 0;
    const c: Pick<CuotasClient, "getPlans"> = {
      getPlans: async () => {
        calls++;
        if (calls === 1) throw new Error("timeout RPC");
        return [planFixture()];
      },
    };
    const found = await waitForOpenedPlan(c, "estudiante", {
      intervalMs: 1,
      sleep: async () => {},
    });
    expect(found).not.toBeNull();
    expect(calls).toBe(2);
  });
});

describe("waitForPlan", () => {
  it("encuentra el plan por id; null si no vuelve a leerse", async () => {
    const target = planFixture({ id: "plan-9" });
    const c = clientWith([[planFixture()], [target]]);
    const found = await waitForPlan(c, "estudiante", "plan-9", {
      intervalMs: 1,
      sleep: async () => {},
    });
    expect(found).toBe(target);
    const missing = await waitForPlan(c, "estudiante", "plan-x", {
      intervalMs: 1,
      timeoutMs: 2,
      sleep: async () => {},
    });
    expect(missing).toBeNull();
  });
});
