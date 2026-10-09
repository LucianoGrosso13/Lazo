// Pago de cuota pendiente de veredicto, persistido por wallet+plan en
// sessionStorage: sobrevive a reload y a la navegación dentro de la
// pestaña, para que un `uncertain` jamás habilite un segundo
// `payInstallment` a ciegas. Guarda la firma ORIGINAL + el snapshot de
// identidad (plan, cuota esperada, openedAt): al volver, la pantalla
// ofrece reconciliarla (lectura) — nunca reenvía.
import type { OperationSnapshot, WalletAddress } from "@/lib/cuotas";

type PaySnapshot = Extract<OperationSnapshot, { operation: "pay_installment" }>;
// `lastValidBlockHeight` (opcional, del contrato cliente) viaja con el
// snapshot: solo la reconciliación declara expirada la firma — altura
// finalized superada + ausencia al reverificar, nunca por tiempo de reloj.
export type PendingPayOp = PaySnapshot & {
  lastValidBlockHeight?: number;
};

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (student: WalletAddress, planId: string) =>
  `lazo.pay.pending.${student}.${planId}`;

export function savePendingPay(storage: Store, op: PendingPayOp): void {
  try {
    storage.setItem(key(op.student, op.planId), JSON.stringify(op));
  } catch {
    // Storage lleno/bloqueado: la reconciliación manual queda igual.
  }
}

export function loadPendingPay(
  storage: Store,
  student: WalletAddress,
  planId: string,
): PendingPayOp | null {
  try {
    const raw = storage.getItem(key(student, planId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingPayOp>;
    if (
      parsed.operation === "pay_installment" &&
      parsed.student === student &&
      parsed.planId === planId &&
      typeof parsed.signature === "string" &&
      parsed.signature &&
      typeof parsed.expectedInstallmentIndex === "number"
    ) {
      return {
        operation: "pay_installment",
        student,
        planId,
        signature: parsed.signature,
        expectedInstallmentIndex: parsed.expectedInstallmentIndex,
        expectedOpenedAt: parsed.expectedOpenedAt,
        expectedGeneration: parsed.expectedGeneration,
        lastValidBlockHeight:
          typeof parsed.lastValidBlockHeight === "number"
            ? parsed.lastValidBlockHeight
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPendingPay(
  storage: Store,
  student: WalletAddress,
  planId: string,
): void {
  try {
    storage.removeItem(key(student, planId));
  } catch {
    // Nada que limpiar.
  }
}
