import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { DEMO_MERCHANT, toMicro } from "./format";
import type { CuotasClient } from "./types";

const W = "WalletMorosa111111111111111111111111111111";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{60,90}$/;
const HEX64 = /^[0-9a-f]{64}$/;

let c: CuotasClient;
beforeEach(() => {
  c = createMockCuotas();
});

const openPlan = (price: number, student = W) =>
  c.openPlan({ student, merchant: DEMO_MERCHANT, price: toMicro(price) });

describe("advanceDays y estados de cuota", () => {
  it("acumula daysAdvanced y notifica a los suscriptores", async () => {
    let calls = 0;
    c.subscribe(() => calls++);
    const clock1 = await c.advanceDays(5);
    expect(clock1.daysAdvanced).toBe(5);
    const clock2 = await c.advanceDays(3);
    expect(clock2.daysAdvanced).toBe(8);
    expect((await c.getClock()).daysAdvanced).toBe(8);
    expect(calls).toBe(2);
  });

  it("Upcoming → Due (día de vencimiento) → Grace (días 1-5)", async () => {
    const { value: plan } = await openPlan(1000);
    const at = async () => (await c.getPlans(W))[0].installments[0].status;

    expect(await at()).toBe("Upcoming");
    await c.advanceDays(30); // día del vencimiento
    expect(await at()).toBe("Due");
    await c.advanceDays(1); // 1 día de atraso
    expect(await at()).toBe("Grace");
    expect((await c.getPlans(W))[0].status).toBe("Active");
    expect(plan.counts).toBe(true);
  });
});

describe("mora completa", () => {
  it("guion: gracia → aviso al fiador → punitorio → cobro al fiador → recupero", async () => {
    const { value: opened } = await openPlan(1000);
    await c.payInstallment(W, opened.id); // cuota 1 a tiempo

    // Cuota 2: un día de atraso → Grace
    await c.advanceDays(61);
    let plan = (await c.getPlans(W))[0];
    expect(plan.installments[1].status).toBe("Grace");

    // Día 3 de atraso: aviso al fiador, una sola vez
    await c.advanceDays(2); // total 63
    let kinds = (await c.getActivity({ planId: opened.id })).map((a) => a.kind);
    expect(kinds.filter((k) => k === "GuarantorNotified")).toHaveLength(1);
    await c.advanceDays(1); // total 64, sigue en gracia
    kinds = (await c.getActivity({ planId: opened.id })).map((a) => a.kind);
    expect(kinds.filter((k) => k === "GuarantorNotified")).toHaveLength(1);

    // Día 6: punitorio de 5% sobre la cuota, plan Late y deja de contar
    await c.advanceDays(2); // total 66
    plan = (await c.getPlans(W))[0];
    expect(plan.installments[1].status).toBe("Late");
    expect(plan.installments[1].penalty).toBe(11_666_667); // 5% de 233,333333
    expect(plan.status).toBe("Late");
    expect(plan.counts).toBe(false);
    kinds = (await c.getActivity({ planId: opened.id })).map((a) => a.kind);
    expect(kinds).toContain("MarkedLate");

    // Día 15: cobro al fiador de la cuota + punitorio (233,333333 + 11,666667)
    await c.advanceDays(9); // total 75
    plan = (await c.getPlans(W))[0];
    expect(plan.installments[1].status).toBe("ChargedToGuarantor");
    expect(plan.status).toBe("Active"); // no queda nada vencido
    expect(plan.counts).toBe(false);

    const acts = await c.getActivity({ planId: opened.id });
    const charged = acts.find((a) => a.kind === "GuarantorCharged");
    expect(charged?.amount).toBe(245_000_000);
    expect(acts.some((a) => a.kind === "RecoveryRegistered")).toBe(true);

    const pool = await c.getPool();
    const recovery = pool.events.find((e) => e.kind === "Recovery");
    expect(recovery).toMatchObject({ amount: 245_000_000, planId: opened.id });
    expect(recovery?.receiptHash).toMatch(HEX64);
    expect(recovery?.signature).toMatch(BASE58);
    expect(pool.outstandingCredit).toBe(233_333_334); // queda la cuota 3

    // Reputación: escalón en el piso (0), una mora, bloqueado para planes nuevos
    const rep = await c.getReputation(W);
    expect(rep.tier).toBe(0);
    expect(rep.lateCount).toBe(1);
    expect(rep.blockedFromNewPlans).toBe(true);
    expect(rep.activeExposure).toBe(233_333_334);
    const q = await c.quote(toMicro(100), W);
    expect(q.eligible).toBe(false);
    expect(q.reasons).toContain("blocked_after_default");

    // El estudiante igual puede pagar la cuota 3 y saldar el plan (sin subir)
    const { value: settled } = await c.payInstallment(W, opened.id);
    expect(settled.status).toBe("Settled");
    const rep2 = await c.getReputation(W);
    expect(rep2.tier).toBe(0);
    expect(rep2.plansCompleted).toBe(0);
    expect(rep2.activeExposure).toBe(0);
  });

  it("un estudiante en escalón 2 baja a 1 tras el cobro al fiador", async () => {
    const W2 = "WalletEscalonDos11111111111111111111111111";
    for (let i = 0; i < 2; i++) {
      const { value: p } = await openPlan(200, W2);
      for (let j = 0; j < 3; j++) await c.payInstallment(W2, p.id);
    }
    expect((await c.getReputation(W2)).tier).toBe(2);

    const { value: plan } = await openPlan(500, W2); // escalón 2: anticipo 10%
    expect(plan.downPayment).toBe(toMicro(50));
    await c.advanceDays(45); // cuota 1 llega al día 15

    const rep = await c.getReputation(W2);
    expect(rep.tier).toBe(1);
    expect(rep.lateCount).toBe(1);
    expect(rep.blockedFromNewPlans).toBe(true);
    expect(
      (await c.getActivity({ student: W2 })).map((a) => a.kind),
    ).toContain("TierDown");
    const q = await c.quote(toMicro(100), W2);
    expect(q.reasons).toContain("blocked_after_default");
  });

  it("una segunda cuota al día 15 caduca los plazos: se cobra el saldo y el plan queda Recovered", async () => {
    const { value: opened } = await openPlan(1000);
    await c.advanceDays(45); // cuota 1 → cobro al fiador (233,333333 + punitorio)
    let plan = (await c.getPlans(W))[0];
    expect(plan.installments[0].status).toBe("ChargedToGuarantor");
    expect(plan.status).toBe("Active");

    await c.advanceDays(30); // total 75: cuota 2 llega al día 15
    plan = (await c.getPlans(W))[0];
    expect(plan.status).toBe("Recovered");
    expect(
      plan.installments.every((i) => i.status === "ChargedToGuarantor"),
    ).toBe(true);

    // El segundo cobro incluye la cuota 2 (con punitorio) y la 3 (saldo)
    const pool = await c.getPool();
    const recoveries = pool.events.filter((e) => e.kind === "Recovery");
    expect(recoveries).toHaveLength(2);
    expect(recoveries[1].amount).toBe(
      233_333_333 + 11_666_667 + 233_333_334,
    );
    expect(pool.outstandingCredit).toBe(0);

    const rep = await c.getReputation(W);
    expect(rep.lateCount).toBe(2);
    expect(rep.tier).toBe(0);
    expect(rep.activeExposure).toBe(0);
    expect(rep.blockedFromNewPlans).toBe(true);

    // Plan recuperado: no queda nada por pagar
    await expect(c.payInstallment(W, opened.id)).rejects.toMatchObject({
      code: "nothing_due",
    });
  });

  it("el cobro diferido del comercio se acredita en su fecha aunque el estudiante caiga en mora", async () => {
    await c.openPlan({
      student: W,
      merchant: DEMO_MERCHANT,
      price: toMicro(1000),
      settlement: "deferred_30",
    });
    const m0 = await c.getMerchant(DEMO_MERCHANT);
    expect(m0.settlementBalance).toBe(toMicro(300));
    expect(m0.pendingSettlement).toBe(toMicro(656.25));

    // Día 30: vence la cuota 1 (Due) y se acredita el cobro del comercio.
    await c.advanceDays(30);
    const m1 = await c.getMerchant(DEMO_MERCHANT);
    expect(m1.settlementBalance).toBe(toMicro(956.25));
    expect(m1.pendingSettlement).toBe(0);
    expect(m1.sales[0].settled).toBe(true);
    let p = (await c.getPlans(W))[0];
    expect(p.installments[0].status).toBe("Due");

    // La mora del estudiante no le saca plata al comercio: el riesgo lo
    // absorbe el pool (lo cubre el fiador). Día 45 → cobro al fiador.
    await c.advanceDays(15);
    p = (await c.getPlans(W))[0];
    expect(p.installments[0].status).toBe("ChargedToGuarantor");
    const m2 = await c.getMerchant(DEMO_MERCHANT);
    expect(m2.settlementBalance).toBe(toMicro(956.25));
    const pool = await c.getPool();
    expect(pool.events.filter((e) => e.kind === "Advance")).toHaveLength(1);
    expect(pool.events.filter((e) => e.kind === "Recovery")).toHaveLength(1);
  });

  it("pagar en gracia (día 4) no tiene punitorio y el plan sigue contando", async () => {
    const { value: opened } = await openPlan(1000);
    await c.advanceDays(34); // cuota 1 con 4 días de atraso (gracia)

    const { value: after } = await c.payInstallment(W, opened.id);
    expect(after.installments[0].status).toBe("Paid");
    expect(after.installments[0].penalty).toBe(0);
    expect(after.status).toBe("Active");
    expect(after.counts).toBe(true);

    // Paga el resto el día del vencimiento y sube de escalón igual
    await c.advanceDays(26); // día 60: vence la cuota 2
    await c.payInstallment(W, opened.id);
    await c.advanceDays(30); // día 90: vence la cuota 3
    const { value: settled } = await c.payInstallment(W, opened.id);
    expect(settled.status).toBe("Settled");

    const rep = await c.getReputation(W);
    expect(rep.tier).toBe(1);
    expect(rep.plansCompleted).toBe(1);
  });
});
