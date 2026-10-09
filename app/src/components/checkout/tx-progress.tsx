"use client";

// Progreso observable de una operación firmada (ticket 01): la secuencia de
// fases del contrato (`preparing → awaiting_approval → sending → confirming
// → syncing`) como tramos del haz que se van grabando. El texto vivo
// (`role=status`) anuncia la fase actual; con movimiento reducido la barra
// queda quieta y la información no se pierde.
import { checkout } from "@/i18n/dictionaries/checkout";
import { useT } from "@/i18n/locale";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import type { TxPhase } from "@/lib/cuotas";
import styles from "./checkout.module.css";

const PHASES: readonly TxPhase[] = [
  "preparing",
  "awaiting_approval",
  "sending",
  "confirming",
  "syncing",
];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

type ProgressCopy = (typeof checkout)["es"]["confirm"]["progress"];

export function TxProgressView({
  phase,
  signature,
  copy,
}: {
  phase: TxPhase;
  signature?: string;
  /** Textos alternativos (p. ej. el pago de cuota): por defecto los del plan. */
  copy?: ProgressCopy;
}) {
  const fallback = useT(checkout).confirm.progress;
  const t = copy ?? fallback;
  const idx = Math.max(0, PHASES.indexOf(phase));
  const current = t.steps[phase];
  return (
    <div className={styles.progress} data-testid="tx-progress">
      <div className={styles.progHead}>
        <p className={styles.progTitle}>{t.title}</p>
        {signature ? (
          <span className={styles.progSig} title={signature}>
            {short(signature)}
          </span>
        ) : null}
      </div>
      <div
        className={styles.progBeam}
        role="progressbar"
        aria-label={t.aria}
        aria-valuemin={0}
        aria-valuemax={PHASES.length}
        aria-valuenow={idx + 1}
        aria-valuetext={current.t}
      >
        <span
          className={styles.progBeamFill}
          style={{ transform: `scaleX(${(idx + 1) / PHASES.length})` }}
        />
      </div>
      <ol className={styles.progList}>
        {PHASES.map((p, i) => {
          const mark: MarkState =
            i < idx ? "etched" : i === idx ? "lit" : "dim";
          return (
            <li
              key={p}
              className={styles.progStep}
              data-current={i === idx || undefined}
              data-done={i < idx || undefined}
              aria-current={i === idx ? "step" : undefined}
            >
              <StateMark state={mark} title={t.steps[p].t} />
              <span>{t.steps[p].t}</span>
            </li>
          );
        })}
      </ol>
      <p className={styles.progStatus} role="status">
        {current.d}
      </p>
    </div>
  );
}
