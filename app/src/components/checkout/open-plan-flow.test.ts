// Runner de apertura de plan: fases monótonas, mínimo post-envío solo en
// éxito, doble envío bloqueado, snapshot de identidad, y `uncertain` que
// solo se resuelve reconciliando la firma original (restore tras reload).
import { describe, expect, it, vi } from "vitest";
import { CuotasError, type Plan, type TxProgress } from "@/lib/cuotas";
import { createOpenPlanRunner, type OpenPlanRun } from "./open-plan-flow";

const plan: Plan = {
  id: "plan-1",
  student: "stu1",
  merchant: "merch1",
  price: 1_000_000_000,
  downPayment: 300_000_000,
  financed: 700_000_000,
  merchantFee: 0,
  installments: [
    { index: 0, amount: 233_333_333, dueAt: 2_592_000, penalty: 0, status: "Upcoming" },
    { index: 1, amount: 233_333_333, dueAt: 5_184_000, penalty: 0, status: "Upcoming" },
    { index: 2, amount: 233_333_334, dueAt: 7_776_000, penalty: 0, status: "Upcoming" },
  ],
  openedAt: 0,
  status: "Active",
  counts: true,
  terms: {
    termsVersion: 1,
    installmentsCount: 3,
    interestTotalBps: 0,
    downPaymentBps: 3000,
    coverageBps: 10_000,
    settlementId: "immediate",
    settlementDays: 0,
    settlementFeeBps: 0,
    provisional: false,
  },
  signature: "sigA",
};

/** Reloj falso: `sleep` avanza el tiempo sin esperar de verdad. */
function fakeClock() {
  let t = 0;
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms;
    },
    t: () => t,
  };
}

function runOf(
  impl: (onProgress: (p: TxProgress) => void) => Promise<{ value: Plan; signature: string }>,
  extra?: Partial<OpenPlanRun>,
): OpenPlanRun {
  return { call: impl, isCurrent: () => true, ...extra };
}

const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe("createOpenPlanRunner", () => {
  it.each(["success", "failure", "recheck"] as const)(
    "un resultado viejo (%s) no borra la corrida de la nueva identidad",
    async (oldResult) => {
      const runner = createOpenPlanRunner({ minPostSendMs: 0 });
      let finishOld!: () => void;
      const oldPending = new Promise<void>((resolve) => { finishOld = resolve; });
      const old = runOf(async () => {
        await oldPending;
        if (oldResult === "failure") throw new CuotasError("user_rejected");
        return { value: plan, signature: "old" };
      }, {
        reconcile: async () => {
          await oldPending;
          return { status: "confirmed", plan, signature: "old" };
        },
      });
      if (oldResult === "recheck") {
        runner.restore(old, "old");
        runner.recheck();
      } else {
        runner.start(old);
      }
      runner.reset();
      let finishNew!: () => void;
      const newPending = new Promise<void>((resolve) => { finishNew = resolve; });
      runner.start(runOf(async () => {
        await newPending;
        return { value: plan, signature: "new" };
      }));
      finishOld();
      await flush();
      expect(runner.state()).toMatchObject({ kind: "running" });
      finishNew();
      await vi.waitFor(() => expect(runner.state()).toMatchObject({
        kind: "success", signature: "new",
      }));
    },
  );
  it("éxito: fases monótonas y ~2s de procesamiento post-envío", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    const run = runOf(async (onProgress) => {
      onProgress({ phase: "preparing" });
      onProgress({ phase: "awaiting_approval" });
      onProgress({ phase: "sending", signature: "sigA" });
      onProgress({ phase: "confirming", signature: "sigA" });
      onProgress({ phase: "syncing", signature: "sigA" });
      return { value: plan, signature: "sigA" };
    });
    runner.start(run);
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({ kind: "success" }),
    );
    expect(runner.state()).toMatchObject({
      kind: "success",
      plan,
      signature: "sigA",
      reconciled: false,
    });
    // El envío fue instantáneo: el mínimo visible se completó igual.
    expect(clock.t()).toBe(2_000);
  });

  it("doble clic: el segundo start no produce otra operación", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    let calls = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const run = runOf(async () => {
      calls += 1;
      await gate;
      return { value: plan, signature: "sigA" };
    });
    runner.start(run);
    runner.start(run); // ignorada: corrida viva
    release();
    await vi.waitFor(() => expect(runner.state().kind).toBe("success"));
    expect(calls).toBe(1);
  });

  it("rechazo del usuario: failed inmediato, sin espera artificial", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    runner.start(
      runOf(async (onProgress) => {
        onProgress({ phase: "awaiting_approval" });
        throw new CuotasError("user_rejected");
      }),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("failed"));
    expect(clock.t()).toBe(0);
    expect(runner.state()).toMatchObject({
      kind: "failed",
      error: { code: "user_rejected" },
    });
  });

  it("uncertain → recheck confirmed recupera el plan (reconciled)", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    runner.start(
      runOf(
        async (onProgress) => {
          onProgress({ phase: "sending", signature: "sigX" });
          throw new CuotasError("uncertain", "sin respuesta", "sigX");
        },
        {
          reconcile: async (sig) =>
            sig === "sigX"
              ? { status: "confirmed", signature: "sigX", plan }
              : { status: "pending", signature: sig ?? "" },
        },
      ),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("uncertain"));
    runner.recheck();
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "success",
        reconciled: true,
        signature: "sigX",
      }),
    );
  });

  it("uncertain → pending sigue bloqueado: ni start ni reenvío", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    let calls = 0;
    runner.start(
      runOf(
        async () => {
          calls += 1;
          throw new CuotasError("uncertain", "timeout", "sigX");
        },
        {
          reconcile: async (sig) => ({
            status: "pending",
            signature: sig ?? "",
          }),
        },
      ),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("uncertain"));
    runner.recheck();
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "uncertain",
        checked: true,
      }),
    );
    // Un nuevo start no habilita otra operación mientras siga en duda.
    runner.start(runOf(async () => ({ value: plan, signature: "sigY" })));
    await flush();
    expect(runner.state().kind).toBe("uncertain");
    expect(calls).toBe(1);
  });

  it("uncertain → failed onchain habilita una operación nueva", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    runner.start(
      runOf(
        async () => {
          throw new CuotasError("uncertain", "timeout", "sigX");
        },
        {
          reconcile: async (sig) => ({ status: "failed", signature: sig ?? "" }),
        },
      ),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("uncertain"));
    runner.recheck();
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "failed_onchain",
        signature: "sigX",
      }),
    );
    // Veredicto `failed` = definitivo: una propuesta fresca puede reintentar.
    runner.start(runOf(async () => ({ value: plan, signature: "sigZ" })));
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "success",
        signature: "sigZ",
      }),
    );
  });

  it("cambio de wallet: el resultado tardío se descarta (snapshot)", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    let current = "stu1";
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    runner.start(
      runOf(
        async () => {
          await gate;
          return { value: plan, signature: "sigA" };
        },
        { isCurrent: () => current === "stu1" },
      ),
    );
    current = "stu2"; // la wallet cambió antes de resolver
    release();
    await vi.waitFor(() => expect(runner.state().kind).toBe("idle"));
  });

  it("restore tras reload: vuelve uncertain con la firma original", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    let calls = 0;
    const run = runOf(
      async () => {
        calls += 1;
        return { value: plan, signature: "sigA" };
      },
      {
        reconcile: async (sig) => ({
          status: "confirmed",
          signature: sig ?? "",
          plan,
        }),
      },
    );
    runner.restore(run, "sigPersistida");
    expect(runner.state()).toMatchObject({
      kind: "uncertain",
      signature: "sigPersistida",
      checked: false,
    });
    runner.start(runOf(async () => ({ value: plan, signature: "sigN" })));
    await flush();
    expect(calls).toBe(0); // ninguna operación nueva mientras está en duda
    runner.recheck();
    await vi.waitFor(() =>
      expect(runner.state()).toMatchObject({
        kind: "success",
        reconciled: true,
        signature: "sigPersistida",
      }),
    );
  });

  it("reset con otra identidad permite operar de nuevo", async () => {
    const clock = fakeClock();
    const runner = createOpenPlanRunner({
      now: clock.now,
      sleep: clock.sleep,
      minPostSendMs: 2_000,
    });
    runner.start(
      runOf(async () => {
        throw new CuotasError("uncertain", "timeout", "sigX");
      }),
    );
    await vi.waitFor(() => expect(runner.state().kind).toBe("uncertain"));
    runner.reset(); // la wallet cambió: la duda queda persistida aparte
    expect(runner.state().kind).toBe("idle");
    runner.start(runOf(async () => ({ value: plan, signature: "sigB" })));
    await vi.waitFor(() => expect(runner.state().kind).toBe("success"));
  });
});
