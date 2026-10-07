// Generador del documento de fianza de DEMOSTRACIÓN y su hash SHA-256.
// Corre entero en el navegador con Web Crypto: sin paquetes ni backend.
// El documento se declara de demostración: no es firma digital certificada
// ni tiene validez legal productiva (ver spec §decisiones).
import { formatUsdc, type Bps, type Micro, type WalletAddress } from "@/lib/cuotas";

export interface MandatoDemo {
  student: WalletAddress;
  guarantorName: string;
  /** Tope de compras respaldadas (micro-USDC). */
  maxPurchase: Micro;
  /**
   * Máximo total de la fianza (micro-USDC). `null` mientras la fórmula del
   * máximo (Q1) esté pendiente: el documento lo declara, jamás inventa un
   * número provisional.
   */
  coverageMax: Micro | null;
  /**
   * Cobertura de la fianza sobre el capital pendiente de cada compra (bps),
   * según la configuración del protocolo. `null` si aún no se conoce: el
   * documento lo declara pendiente, no inventa un porcentaje.
   */
  coverageBps?: Bps | null;
  /** Segundos unix de la emisión. */
  issuedAt: number;
  locale: "es" | "en";
}

/** Texto legible del documento. Todo monto sale de los parámetros, no de JSX. */
export function textoMandato(m: MandatoDemo): string {
  const usd = (v: Micro) => `US$${formatUsdc(v, m.locale)}`;
  const fecha = new Intl.DateTimeFormat(m.locale === "es" ? "es-AR" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(m.issuedAt * 1000);
  const pct =
    m.coverageBps != null
      ? new Intl.NumberFormat(m.locale === "es" ? "es-AR" : "en-US", {
          maximumFractionDigits: 2,
        }).format(m.coverageBps / 100)
      : null;

  if (m.locale === "en") {
    return [
      "LAZO — DEMONSTRATION GUARANTEE (devnet, test money)",
      "====================================================",
      "",
      `Issued: ${fecha}`,
      `Student (Solana address): ${m.student}`,
      `Guarantor: ${m.guarantorName}`,
      "Charge method: credit card registered at the payment processor (sandbox, simulated).",
      "",
      "TERMS",
      `1. The guarantor backs purchases of up to ${usd(m.maxPurchase)} each.`,
      pct != null
        ? `2. The guarantee covers ${pct}% of the outstanding principal of each backed purchase.`
        : "2. The guarantee's coverage of the outstanding principal is PENDING DEFINITION.",
      "   Plan interest (when the plan has any) and late fees are outside that coverage: their treatment is PENDING DEFINITION.",
      m.coverageMax != null
        ? `3. The maximum the guarantor can be charged in total per purchase is ${usd(m.coverageMax)}.`
        : "3. The guarantor's total maximum is PENDING DEFINITION (the maximum formula is not defined yet).",
      "4. The guarantor is only charged if the student misses an installment after the notice and grace period configured in the protocol.",
      "",
      "DISCLAIMER",
      "Demonstration document for the Lazo devnet demo. It is not a certified",
      "digital signature and carries no production legal validity.",
    ].join("\n");
  }
  return [
    "LAZO — FIANZA DE DEMOSTRACIÓN (devnet, plata de prueba)",
    "======================================================",
    "",
    `Emitida: ${fecha}`,
    `Estudiante (dirección Solana): ${m.student}`,
    `Garante: ${m.guarantorName}`,
    "Medio de cargo: tarjeta de crédito registrada en el procesador (sandbox, simulada).",
    "",
    "CONDICIONES",
    `1. El garante respalda compras de hasta ${usd(m.maxPurchase)} cada una.`,
    pct != null
      ? `2. La fianza cubre el ${pct}% del capital pendiente de cada compra respaldada.`
      : "2. La cobertura de la fianza sobre el capital pendiente está PENDIENTE DE DEFINICIÓN.",
    "   El interés del plan (cuando el plan lo tiene) y los punitorios por mora quedan fuera de esa cobertura: su tratamiento está PENDIENTE DE DEFINICIÓN.",
    m.coverageMax != null
      ? `3. Lo máximo que el garante puede llegar a pagar en total por compra es ${usd(m.coverageMax)}.`
      : "3. Lo máximo que el garante puede llegar a pagar está PENDIENTE DE DEFINICIÓN (la fórmula del máximo aún no está definida).",
    "4. El garante solo paga si el estudiante no paga una cuota después del aviso y la gracia configurados en el protocolo.",
    "",
    "ALCANCE",
    "Documento de demostración de la demo devnet de Lazo. No es una firma",
    "digital certificada ni tiene validez legal productiva.",
  ].join("\n");
}

/** SHA-256 del texto en hex minúscula — el `mandateHash` del registro. */
export async function hashMandato(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Dispara la descarga del documento como .txt en el navegador. */
export function descargarMandato(texto: string, filename = "fianza-lazo-demo.txt") {
  const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
