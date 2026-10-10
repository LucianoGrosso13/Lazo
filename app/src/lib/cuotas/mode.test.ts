// @vitest-environment jsdom
// Modo runtime demo/real: default de build, disponibilidad del modo real,
// persistencia en localStorage, parámetro `?modo=` y el cache por modo de
// `getCuotas()`. Cada test importa el módulo fresco para aislar env y estado.
import { afterEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "lazo:cuotas-mode";
const MERCHANT = "11111111111111111111111111111111";

async function freshMode() {
  vi.resetModules();
  return import("./mode");
}

function setUrl(path: string) {
  window.history.replaceState(null, "", path);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  setUrl("/");
});

describe("DEFAULT_MODE e isRealAvailable", () => {
  it("sin env: default mock y el modo real no está disponible", async () => {
    const m = await freshMode();
    expect(m.DEFAULT_MODE).toBe("mock");
    expect(m.isRealAvailable()).toBe(false);
  });

  it("NEXT_PUBLIC_CUOTAS_MODE=real: default real y disponible", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUOTAS_MODE", "real");
    const m = await freshMode();
    expect(m.DEFAULT_MODE).toBe("real");
    expect(m.isRealAvailable()).toBe(true);
  });

  it("NEXT_PUBLIC_CUOTAS_MERCHANT declarado habilita el real con default mock", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUOTAS_MERCHANT", MERCHANT);
    const m = await freshMode();
    expect(m.DEFAULT_MODE).toBe("mock");
    expect(m.isRealAvailable()).toBe(true);
  });
});

describe("readStoredMode", () => {
  it("sin nada guardado devuelve el default", async () => {
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
  });

  it("en el servidor (sin window) devuelve el default", async () => {
    vi.stubGlobal("window", undefined);
    const m = await freshMode();
    expect(m.readStoredMode()).toBe(m.DEFAULT_MODE);
  });

  it("?modo=real persiste y se honra solo si el real está disponible", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUOTAS_MERCHANT", MERCHANT);
    setUrl("/?modo=real");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("real");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("real");
  });

  it("?modo=real persiste pero no se honra sin comercio declarado", async () => {
    setUrl("/?modo=real");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
    // Queda persistido igual: si el despliegue habilita el real, aplica.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("real");
  });

  it("?modo=demo persiste mock aunque el real esté disponible", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUOTAS_MERCHANT", MERCHANT);
    window.localStorage.setItem(STORAGE_KEY, "real");
    setUrl("/checkout?modo=demo&x=1");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("mock");
  });

  it("valor guardado inválido cae al default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "banana");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
  });

  it("real guardado sin disponibilidad cae al default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "real");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
  });

  it("mock guardado se honra aunque el default sea real", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUOTAS_MODE", "real");
    window.localStorage.setItem(STORAGE_KEY, "mock");
    const m = await freshMode();
    expect(m.readStoredMode()).toBe("mock");
  });
});

describe("getCuotas por modo", () => {
  it("cachea una instancia distinta por modo activo", async () => {
    const m = await freshMode();
    const { getCuotas } = await import("../cuotas");

    m.setActiveMode("mock");
    const mock1 = getCuotas();
    const mock2 = getCuotas();
    expect(mock2).toBe(mock1);
    expect(mock1.mode).toBe("mock");

    m.setActiveMode("real");
    const real1 = getCuotas();
    const real2 = getCuotas();
    expect(real2).toBe(real1);
    expect(real1.mode).toBe("real");

    expect(real1).not.toBe(mock1);

    m.setActiveMode("mock");
    expect(getCuotas()).toBe(mock1);
  });
});
