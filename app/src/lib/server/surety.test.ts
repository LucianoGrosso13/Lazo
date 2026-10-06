import { describe, expect, it } from "vitest";
import {
  SuretyError,
  buildSuretyAcceptance,
  formatMicroUsdc,
  suretyText,
  validateCoverageMax,
} from "./surety";

const TERMS = {
  student: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1",
  guarantorName: "María Garante",
  maxPurchase: 1_000_000_000,
  coverageMax: 800_000_000,
  requiredCoverage: 700_000_000,
  acceptedAt: 1_800_000_000,
  kycSessionId: "sess-1",
  cardLabel: "Visa •••• 0010",
};

describe("surety", () => {
  it("builds a deterministic canonical text and hash", () => {
    const a = buildSuretyAcceptance(TERMS);
    const b = buildSuretyAcceptance(TERMS);
    expect(a.text).toBe(b.text);
    expect(a.mandateHash).toBe(b.mandateHash);
    expect(a.mandateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.text).toContain("US$1,000.00");
    expect(a.text).toContain("US$800.00");
    expect(a.text).toContain("US$700.00");
    expect(a.text).toContain(TERMS.student);
  });

  it("changes the hash when any term changes", () => {
    const base = buildSuretyAcceptance(TERMS).mandateHash;
    expect(buildSuretyAcceptance({ ...TERMS, coverageMax: 800_000_001 }).mandateHash).not.toBe(base);
    expect(buildSuretyAcceptance({ ...TERMS, guarantorName: "Otro" }).mandateHash).not.toBe(base);
    expect(buildSuretyAcceptance({ ...TERMS, acceptedAt: TERMS.acceptedAt + 1 }).mandateHash).not.toBe(base);
  });

  it("accepts a cap equal to the required coverage, rejects below", () => {
    expect(() => validateCoverageMax(700_000_000, 700_000_000)).not.toThrow();
    expect(() => validateCoverageMax(699_999_999, 700_000_000)).toThrowError(
      expect.objectContaining({ code: "coverage_below_required" }),
    );
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => validateCoverageMax(bad, 100)).toThrowError(expect.objectContaining({ code: "coverage_invalid" }));
    }
  });

  it("rejects incomplete terms", () => {
    expect(() => buildSuretyAcceptance({ ...TERMS, guarantorName: "  " })).toThrowError(
      expect.objectContaining({ code: "surety_invalid" }),
    );
    expect(() => buildSuretyAcceptance({ ...TERMS, maxPurchase: 0 })).toThrowError(
      expect.objectContaining({ code: "surety_invalid" }),
    );
  });

  it("formats micro-USDC deterministically", () => {
    expect(formatMicroUsdc(1_000_000_000)).toBe("1,000.00");
    expect(formatMicroUsdc(233_330_000)).toBe("233.33");
    expect(formatMicroUsdc(0)).toBe("0.00");
  });

  it("keeps the acceptance text stable for a fixed fixture", () => {
    // Guards the canonical text against accidental rewording (hash stability).
    expect(suretyText(TERMS)).toBe(
      [
        "LAZO — FIANZA DE DEMOSTRACION (devnet, dinero de prueba)",
        "========================================================",
        "",
        "Aceptada: 2027-01-15T08:00:00.000Z",
        "Estudiante (direccion Solana): 7xKXtg2CW87d97TXJSDpbD5jBkheTqA7e9MTf5R7a8V1",
        "Garante: María Garante",
        "KYC Didit (sesion): sess-1",
        "Tarjeta: Visa •••• 0010",
        "Medio de cargo: tarjeta de credito registrada en el procesador (sandbox).",
        "",
        "CONDICIONES",
        "1. El garante respalda compras de hasta US$1,000.00 (1000000000 micro-USDC) cada una.",
        "2. Lo maximo que el garante puede llegar a pagar en total por compra es US$800.00 (800000000 micro-USDC) (maximo aceptado explicitamente por el garante).",
        "3. Cobertura exigida verificada para el tope elegido: US$700.00 (700000000 micro-USDC).",
        "4. El garante solo paga si el estudiante no paga una cuota despues del aviso y la gracia configurados en el protocolo.",
        "5. El interes es cero. Una cuota vencida suma el punitorio configurado.",
        "",
        "ALCANCE",
        "Documento de demostracion de la demo devnet de Lazo. No es una firma",
        "digital certificada ni tiene validez legal productiva.",
      ].join("\n"),
    );
  });
});

describe("SuretyError", () => {
  it("carries its code", () => {
    expect(new SuretyError("coverage_invalid").code).toBe("coverage_invalid");
  });
});
