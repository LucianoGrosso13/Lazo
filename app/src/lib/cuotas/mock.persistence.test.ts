// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createMockCuotas } from "./mock";
import { toMicro } from "./format";
import { STORAGE_KEY } from "./mock/state";
import { MERCHANTS } from "../merchants";

const W = "WalletPersistencia1111111111111111111111111";

beforeEach(() => {
  window.localStorage.clear();
});

describe("persistencia (localStorage)", () => {
  it("una segunda instancia ve el estado que dejó la primera", async () => {
    const a = createMockCuotas();
    await a.registerGuarantee({
      student: W,
      maxPurchase: toMicro(500),
      coverageMax: toMicro(400),
      mandateHash: "ab".repeat(32),
      display: { guarantorName: "Abuela", cardLabel: "Amex •••• 1001" },
    });

    const b = createMockCuotas();
    const g = await b.getGuarantee(W);
    expect(g).not.toBeNull();
    expect(g!.maxPurchase).toBe(toMicro(500));
    expect(g!.display?.guarantorName).toBe("Abuela");
  });

  it("la clave de storage es v3", () => {
    expect(STORAGE_KEY).toBe("lazo.mock.v3");
  });

  it("siembra todos los comercios del directorio y persisten entre instancias", async () => {
    const a = createMockCuotas();
    await a.resetDemo();

    // El estado persistido bajo la clave v3 trae todos los comercios.
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!) as { merchants: Record<string, unknown> };
    for (const m of MERCHANTS) expect(saved.merchants[m.address]).toBeTruthy();

    // Y una instancia nueva que carga ese estado responde por todos.
    const b = createMockCuotas();
    for (const m of MERCHANTS) {
      const merchant = await b.getMerchant(m.address);
      expect(merchant).toMatchObject({
        owner: m.address,
        name: m.name,
        active: true,
        settlementBalance: 0,
      });
    }
  });

  it("resetDemo vuelve al estado sembrado y lo ven otras instancias", async () => {
    const a = createMockCuotas();
    await a.getReputation(W); // siembra la wallet con su fiador de ejemplo
    await a.revokeGuarantee(W);
    expect((await a.getGuarantee(W))!.active).toBe(false);

    await a.resetDemo();
    const b = createMockCuotas();
    const g = await b.getGuarantee(W);
    // Después del reset la wallet no existe: getGuarantee es lectura pura → null
    expect(g).toBeNull();
    const rep = await b.getReputation(W);
    expect(rep.tier).toBe(0);
  });
});
