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

describe("reconcileOperation (espejo simulado)", () => {
  it("open_plan: solo confirma la firma registrada, no la existencia del plan", async () => {
    const { value: plan, signature } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    // Una firma que no es la de la compra → pending aunque el plan exista.
    expect(
      await c.reconcileOperation({
        operation: "open_plan",
        student: W,
        signature: "firma-inventada-que-nunca-se-envio",
      }),
    ).toEqual({ status: "pending", signature: "firma-inventada-que-nunca-se-envio" });
    // La firma original sí confirma y devuelve el plan.
    expect(
      await c.reconcileOperation({
        operation: "open_plan",
        student: W,
        signature,
      }),
    ).toEqual({ status: "confirmed", signature, plan: expect.objectContaining({ id: plan.id }) });
  });

  it("pay_installment: exige firma + cuota + identidad correlacionados", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    const res = await c.payInstallment(W, plan.id);
    // La firma de la cuota 0 confirma; con índice 1 (otra cuota) → pending.
    expect(
      await c.reconcileOperation({
        operation: "pay_installment",
        student: W,
        planId: plan.id,
        signature: res.signature,
        expectedInstallmentIndex: 1,
      }),
    ).toMatchObject({ status: "pending" });
    expect(
      await c.reconcileOperation({
        operation: "pay_installment",
        student: W,
        planId: plan.id,
        signature: res.signature,
        expectedInstallmentIndex: 0,
      }),
    ).toMatchObject({ status: "confirmed", signature: res.signature });
    // Snapshot de otro plan → pending (identidad no correlacionada).
    expect(
      await c.reconcileOperation({
        operation: "pay_installment",
        student: W,
        planId: "plan-que-no-existe",
        signature: res.signature,
        expectedInstallmentIndex: 0,
      }),
    ).toMatchObject({ status: "pending" });
  });

  it("cuota impaga con firma ajena → pending (jamás success por existencia)", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    // La cuota 0 está impaga y la firma no existe en el estado.
    expect(
      await c.reconcileOperation({
        operation: "pay_installment",
        student: W,
        planId: plan.id,
        signature: "firma-fantasma",
        expectedInstallmentIndex: 0,
      }),
    ).toMatchObject({ status: "pending" });
  });

  it("expectedOpenedAt distinto (plan reabierto) → confirmed con plan null", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    const res = await c.payInstallment(W, plan.id);
    // El pago está probado pero la generación esperada ya no coincide:
    // espejo del real (cuenta reabierta → efecto probado, sin plan legible).
    expect(
      await c.reconcileOperation({
        operation: "pay_installment",
        student: W,
        planId: plan.id,
        signature: res.signature,
        expectedInstallmentIndex: 0,
        expectedOpenedAt: plan.openedAt + 999,
      }),
    ).toEqual({ status: "confirmed", signature: res.signature, plan: null });
  });
});

describe("dedup de llamados concurrentes (espejo del real)", () => {
  it("openPlan: dos llamados idénticos comparten la MISMA promesa (un solo plan)", async () => {
    const p1 = c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1000) });
    const p2 = c.openPlan({ student: W, merchant: DEMO_MERCHANT, price: toMicro(1000) });
    expect(p2).toBe(p1);
    await p1;
    const plans = await c.getPlans(W);
    expect(plans).toHaveLength(1);
  });

  it("payInstallment: doble click no paga dos cuotas", async () => {
    const { value: plan } = await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
    });
    const p1 = c.payInstallment(W, plan.id);
    const p2 = c.payInstallment(W, plan.id);
    expect(p2).toBe(p1);
    const res = await p1;
    expect(res.value.installments[0].status).toBe("Paid");
    expect(res.value.installments[1].status).not.toBe("Paid");
  });
});
