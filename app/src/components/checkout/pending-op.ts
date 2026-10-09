// Operación de apertura pendiente de veredicto, persistida por wallet en
// sessionStorage: sobrevive a reload y a la navegación dentro de la pestaña,
// para que un `uncertain` jamás habilite un segundo `openPlan` a ciegas.
// Solo guarda la firma ORIGINAL + la identidad: al volver, la pantalla
// ofrece reconciliarla (lectura) — nunca reenvía.
import type { WalletAddress } from "@/lib/cuotas";

export interface PendingOpenOp {
  operation: "open_plan";
  student: WalletAddress;
  signature: string;
  /** Altura de expiración de la propuesta firmada, cuando el cliente la
   * emitió: la reconciliación solo declara expirada con altura finalized
   * superada + ausencia al reverificar; sin ella queda como incierta. */
  lastValidBlockHeight?: number;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (student: WalletAddress) => `lazo.openplan.pending.${student}`;

export function savePendingOpen(
  storage: Store,
  student: WalletAddress,
  signature: string,
  lastValidBlockHeight?: number,
): void {
  try {
    storage.setItem(
      key(student),
      JSON.stringify({
        operation: "open_plan",
        student,
        signature,
        lastValidBlockHeight,
      }),
    );
  } catch {
    // Storage lleno/bloqueado: la reconciliación manual queda igual.
  }
}

export function loadPendingOpen(
  storage: Store,
  student: WalletAddress,
): PendingOpenOp | null {
  try {
    const raw = storage.getItem(key(student));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOpenOp>;
    if (
      parsed.operation === "open_plan" &&
      parsed.student === student &&
      typeof parsed.signature === "string" &&
      parsed.signature
    ) {
      return {
        operation: "open_plan",
        student,
        signature: parsed.signature,
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

export function clearPendingOpen(
  storage: Store,
  student: WalletAddress,
): void {
  try {
    storage.removeItem(key(student));
  } catch {
    // Nada que limpiar.
  }
}
