import type { InstallmentStatus } from "@/lib/cuotas";

export type MarkState = "dim" | "lit" | "etched" | "cracked" | "refilled";

/**
 * Marca de estado sobre el vidrio. Se distingue por forma y trama además del
 * color: dim = contorno fantasma, lit = núcleo caliente, etched = grabado
 * rayado, cracked = rajadura, refilled = luz de atrás (el fiador).
 */
export function StateMark({
  state,
  variant = "tile",
  className = "",
  title,
}: {
  state: MarkState;
  /** tile = pastilla junto a texto; bar = tramo de haz a todo lo ancho */
  variant?: "tile" | "bar";
  className?: string;
  title?: string;
}) {
  return (
    <span
      role="img"
      aria-label={title ?? state}
      title={title}
      className={`mark ${variant === "bar" ? "mark-bar" : ""} mark-${state} ${className}`}
    />
  );
}

/** Estado de cuota (del cliente) → marca del sistema. */
export function installmentMark(status: InstallmentStatus): MarkState {
  switch (status) {
    case "Paid":
      return "etched";
    case "Due":
    case "Grace":
      return "lit";
    case "Late":
      return "cracked";
    case "ChargedToGuarantor":
      return "refilled";
    case "Upcoming":
      return "dim";
  }
}
