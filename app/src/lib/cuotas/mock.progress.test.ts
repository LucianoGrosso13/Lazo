// Progreso observable y fondos en el mock: la misma secuencia de fases que
// el cliente real (simulada, instantánea) y `insufficient_funds` con el
// mismo criterio de saldo que `getBalance` (DEMO_STUDENT_FUNDS − gastado).
import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { DEMO_MERCHANT, toMicro } from "./format";
import type { CuotasClient, TxProgress } from "./types";

const W = "WalletCompradora1111111111111111111111111111";

const phases = (events: TxProgress[]) => events.map((e) => e.phase);

let c: CuotasClient;
beforeEach(() => {
  c = createMockCuotas();
});

describe("openPlan progreso observable (simulado)", () => {
  it("emite preparing → awaiting_approval → sending → confirming → syncing", async () => {
    const events: TxProgress[] = [];
    const res = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      onProgress: (p) => events.push(p),
    });
    expect(phases(events)).toEqual([
      "preparing",
      "awaiting_approval",
      "sending",
      "confirming",
      "syncing",
    ]);
    // La firma aparece recién desde `sending` y es la del resultado.
    expect(events[0].signature).toBeUndefined();
    expect(events[1].signature).toBeUndefined();
    expect(events[2].signature).toBe(res.signature);
    expect(events[3].signature).toBe(res.signature);
    expect(events[4].signature).toBe(res.signature);
  });

  it("bloqueo previo a la firma: solo `preparing` se emite antes del error", async () => {
    const events: TxProgress[] = [];
    await expect(
      c.openPlan({
        student: W,
        merchant: "comercio-inexistente",
        price: toMicro(1000),
        onProgress: (p) => events.push(p),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(phases(events)).toEqual(["preparing"]);
  });

  it("un listener que lanza no rompe la operación", async () => {
    const res = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      onProgress: () => {
        throw new Error("listener roto");
      },
    });
    expect(res.value.status).toBe("Active");
  });
});

describe("payInstallment progreso observable (simulado)", () => {
  it("emite la misma secuencia; la firma es la del pago", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    const events: TxProgress[] = [];
    const res = await c.payInstallment(W, plan.id, {
      onProgress: (p) => events.push(p),
    });
    expect(phases(events)).toEqual([
      "preparing",
      "awaiting_approval",
      "sending",
      "confirming",
      "syncing",
    ]);
    expect(events[2].signature).toBe(res.signature);
    expect(res.value.installments[0].status).toBe("Paid");
  });
});

describe("insufficient_funds (fondos simulados)", () => {
  it("quote lo reporta como razón y openPlan lo lanza, ambos antes de firmar", async () => {
    const poor = createMockCuotas({ studentFunds: toMicro(100) });
    const q = await poor.quote(toMicro(1000), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("insufficient_funds");

    const events: TxProgress[] = [];
    await expect(
      poor.openPlan({
        student: W,
        merchant: DEMO_MERCHANT,
        price: toMicro(1000),
        onProgress: (p) => events.push(p),
      }),
    ).rejects.toMatchObject({ code: "insufficient_funds" });
    // Se cortó en preparación: nunca llegó a "aprobación" ni a "envío".
    expect(phases(events)).toEqual(["preparing"]);
  });

  it("pagar una cuota sin saldo restante → insufficient_funds", async () => {
    // 400 de fondos: alcanza para el anticipo (300) pero no para la cuota (233,33).
    const tight = createMockCuotas({ studentFunds: toMicro(400) });
    const { value: plan } = await tight.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    await expect(tight.payInstallment(W, plan.id)).rejects.toMatchObject({
      code: "insufficient_funds",
    });
    // Nada se gastó: la cuota sigue impaga y el plan sigue activo.
    const plans = await tight.getPlans(W);
    expect(plans[0].installments[0].status).not.toBe("Paid");
    expect(plans[0].status).toBe("Active");
  });

  it("fondos derivados del gasto: lo cobrado al fiador no cuenta como gasto", async () => {
    // Fondos justos para anticipo + primera cuota; el resto lo cubre mora/fiador.
    const just = createMockCuotas({ studentFunds: toMicro(533) });
    const { value: plan } = await just.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    await just.advanceDays(40); // cuota 1 en mora (día 10 ≥ aviso 3, gracia 5 → Late)
    await expect(just.payInstallment(W, plan.id)).rejects.toMatchObject({
      code: "insufficient_funds",
    });
    // Al fiador le cobran con keeper; el plan sigue sin pagos del estudiante.
    await just.advanceDays(40);
    const plans = await just.getPlans(W);
    expect(plans[0].installments.every((i) => i.paidAt === undefined)).toBe(true);
  });
});
