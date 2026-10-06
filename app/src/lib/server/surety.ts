// Server-canonical surety (fianza) text, hash, and acceptance validation.
// The mandate text built here is canonical: its SHA-256 is the `mandateHash`
// proposed for `keeper_register_guarantee`. The client preview
// (components/cuenta/fiador/documento.ts) mirrors these fields for display,
// but only the server text is ever registered.
//
// Coverage rule (coordinator decision, formula still pending with the user):
// the guarantor EXPLICITLY accepts a coverage cap; the server only checks it
// is a positive integer and >= the client-attested required coverage for the
// chosen purchase cap (the Q14 constraint: required coverage must fit inside
// the fianza maximum). No default business formula is assigned. The on-chain
// program remains the final enforcer at `open_plan`.
import { createHash, randomUUID } from "node:crypto";

export type SuretyCode = "coverage_below_required" | "coverage_invalid" | "surety_invalid";

export class SuretyError extends Error {
  constructor(
    public readonly code: SuretyCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "SuretyError";
  }
}

/** micro-USDC -> "1,000.00" style. Deterministic, locale-independent. */
export function formatMicroUsdc(micro: number): string {
  const sign = micro < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(micro));
  const units = Math.floor(abs / 1_000_000);
  const cents = Math.round((abs % 1_000_000) / 10_000);
  const grouped = units.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}.${cents.toString().padStart(2, "0")}`;
}

export function validateCoverageMax(coverageMax: number, requiredCoverage: number): void {
  if (!Number.isSafeInteger(coverageMax) || coverageMax <= 0) {
    throw new SuretyError("coverage_invalid", "coverage_invalid: coverageMax must be a positive integer (micro-USDC)");
  }
  if (!Number.isSafeInteger(requiredCoverage) || requiredCoverage < 0) {
    throw new SuretyError("coverage_invalid", "coverage_invalid: requiredCoverage must be a non-negative integer");
  }
  if (coverageMax < requiredCoverage) {
    throw new SuretyError(
      "coverage_below_required",
      `coverage_below_required: accepted US$${formatMicroUsdc(coverageMax)} is below the required US$${formatMicroUsdc(requiredCoverage)}`,
    );
  }
}

export interface SuretyTerms {
  student: string;
  guarantorName: string;
  maxPurchase: number;
  coverageMax: number;
  requiredCoverage: number;
  /** Seconds unix of acceptance. */
  acceptedAt: number;
  kycSessionId: string;
  cardLabel: string | null;
}

/** Deterministic canonical text. Field order and wording are part of the hash. */
export function suretyText(t: SuretyTerms): string {
  // Exact micro-USDC figures are part of the text so the hash commits to the
  // precise integers, not just the rounded display amounts.
  const usd = (v: number) => `US$${formatMicroUsdc(v)} (${v} micro-USDC)`;
  const fecha = new Date(t.acceptedAt * 1000).toISOString();
  return [
    "LAZO — FIANZA DE DEMOSTRACION (devnet, dinero de prueba)",
    "========================================================",
    "",
    `Aceptada: ${fecha}`,
    `Estudiante (direccion Solana): ${t.student}`,
    `Garante: ${t.guarantorName}`,
    `KYC Didit (sesion): ${t.kycSessionId}`,
    `Tarjeta: ${t.cardLabel ?? "registrada en el procesador (sandbox)"}`,
    "Medio de cargo: tarjeta de credito registrada en el procesador (sandbox).",
    "",
    "CONDICIONES",
    `1. El garante respalda compras de hasta ${usd(t.maxPurchase)} cada una.`,
    `2. Lo maximo que el garante puede llegar a pagar en total por compra es ${usd(t.coverageMax)} (maximo aceptado explicitamente por el garante).`,
    `3. Cobertura exigida verificada para el tope elegido: ${usd(t.requiredCoverage)}.`,
    "4. El garante solo paga si el estudiante no paga una cuota despues del aviso y la gracia configurados en el protocolo.",
    "5. El interes es cero. Una cuota vencida suma el punitorio configurado.",
    "",
    "ALCANCE",
    "Documento de demostracion de la demo devnet de Lazo. No es una firma",
    "digital certificada ni tiene validez legal productiva.",
  ].join("\n");
}

export const sha256hex = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

export interface SuretyAcceptance {
  id: string;
  text: string;
  mandateHash: string;
}

export function buildSuretyAcceptance(t: SuretyTerms): SuretyAcceptance {
  if (!t.student || !t.guarantorName.trim() || !t.kycSessionId) {
    throw new SuretyError("surety_invalid", "surety_invalid: student, guarantorName and kycSessionId are required");
  }
  if (!Number.isSafeInteger(t.maxPurchase) || t.maxPurchase <= 0) {
    throw new SuretyError("surety_invalid", "surety_invalid: maxPurchase must be a positive integer");
  }
  validateCoverageMax(t.coverageMax, t.requiredCoverage);
  const text = suretyText({ ...t, guarantorName: t.guarantorName.trim() });
  return { id: randomUUID(), text, mandateHash: sha256hex(text) };
}
