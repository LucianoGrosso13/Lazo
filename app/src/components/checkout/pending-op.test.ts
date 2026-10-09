// Persistencia de la operación pendiente por wallet: la firma original
// sobrevive reload/navegación para reconciliarla; jamás habilita reenvío.
import { describe, expect, it } from "vitest";
import {
  clearPendingOpen,
  loadPendingOpen,
  savePendingOpen,
} from "./pending-op";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe("pending-op", () => {
  it("guarda y recupera la firma por wallet (reload)", () => {
    const s = fakeStorage();
    savePendingOpen(s, "stu1", "sigA");
    expect(loadPendingOpen(s, "stu1")).toEqual({
      operation: "open_plan",
      student: "stu1",
      signature: "sigA",
    });
  });

  it("la pendiente es por wallet: otra identidad no la ve", () => {
    const s = fakeStorage();
    savePendingOpen(s, "stu1", "sigA");
    expect(loadPendingOpen(s, "stu2")).toBeNull();
  });

  it("clear elimina la marca tras veredicto", () => {
    const s = fakeStorage();
    savePendingOpen(s, "stu1", "sigA");
    clearPendingOpen(s, "stu1");
    expect(loadPendingOpen(s, "stu1")).toBeNull();
  });

  it("contenido corrupto o ajeno devuelve null", () => {
    const s = fakeStorage();
    s.setItem("lazo.openplan.pending.stu1", "not-json");
    expect(loadPendingOpen(s, "stu1")).toBeNull();
    s.setItem(
      "lazo.openplan.pending.stu1",
      JSON.stringify({ operation: "open_plan", student: "otro", signature: "s" }),
    );
    expect(loadPendingOpen(s, "stu1")).toBeNull();
  });
});
