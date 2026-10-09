// Máquina de estados de la apertura de plan (ticket 01): progreso observable
// por fases, éxito solo tras resolver la operación (confirmación + plan
// leído) y una pausa mínima de ~2 s post-envío solo en el camino exitoso.
// Reglas duras: un envío a la vez (doble clic no produce otra transacción),
// el resultado se descarta si la wallet/identidad dejó de ser la que inició,
// y un `uncertain` nunca se reintenta a ciegas: se reconcilia la firma
// ORIGINAL con `reconcileOperation`/`waitForOperation` del cliente (veredicto
// por estado real + evento correlacionado — un plan preexistente no prueba
// nada). Nada acá construye transacciones ni habla RPC: el trabajo lo
// inyecta la pantalla desde la API pública de cuotas.
import {
  CuotasError,
  type Plan,
  type ReconcileOutcome,
  type TxPhase,
  type TxProgress,
  type TxResult,
  type UnixSeconds,
} from "@/lib/cuotas";

/** Mínimo visible del procesamiento post-envío en una operación exitosa. */
export const POST_SEND_MIN_MS = 2_000;

/** Orden de las fases; el progreso nunca retrocede. */
const ORDER: readonly TxPhase[] = [
  "preparing",
  "awaiting_approval",
  "sending",
  "confirming",
  "syncing",
];

/** Fases post-envío: la primera marca el inicio del mínimo visible. */
const POST_SEND: ReadonlySet<TxPhase> = new Set([
  "sending",
  "confirming",
  "syncing",
]);

export type OpenFlowState =
  | { kind: "idle" }
  | { kind: "running"; phase: TxPhase; signature?: string }
  | {
      kind: "success";
      /** `null` solo en el borde `confirmed` sin cuenta legible: el
       * comprobante queda y el panel muestra el plan. */
      plan: Plan | null;
      signature: string;
      /** true cuando el éxito vino de reconciliar la firma original. */
      reconciled: boolean;
      /** Segundos unix del veredicto (reloj del runner, inyectable). */
      completedAt: UnixSeconds;
    }
  | { kind: "failed"; error: CuotasError }
  /** La firma falló onchain (veredicto `failed` de la reconciliación):
   * definitivo, seguro reintentar con una propuesta fresca. */
  | { kind: "failed_onchain"; signature: string }
  /** Envío posiblemente aterrizado: `checked` = ya se intentó reconciliar. */
  | { kind: "uncertain"; signature?: string; checked: boolean };

export interface OpenPlanRun {
  /** La operación en sí: recibe el listener de progreso y resuelve con la
   * transacción confirmada y el plan leído (o rechaza). */
  call: (onProgress: (p: TxProgress) => void) => Promise<TxResult<Plan>>;
  /** Snapshot de identidad: si deja de ser cierto (cambio de wallet), el
   * resultado se descarta en silencio — nunca se muestra bajo otra cuenta. */
  isCurrent: () => boolean;
  /** Solo desde `uncertain`: veredicto de la firma original, sin reenviar. */
  reconcile?: (signature?: string) => Promise<ReconcileOutcome | null>;
}

interface Deps {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  minPostSendMs: number;
}

export interface OpenPlanRunner {
  state(): OpenFlowState;
  subscribe(cb: () => void): () => void;
  /** Inicia la operación. Se ignoran llamadas mientras hay una corrida viva
   * (incluido `uncertain`: un envío posiblemente aterrizado NO se repite —
   * solo `recheck` o un veredicto `failed` habilitan otra operación). */
  start(run: OpenPlanRun): void;
  /** Desde `uncertain`: vuelve a verificar la firma original. */
  recheck(): void;
  /** Restaura un `uncertain` persistido (reload/navegación): la firma
   * guardada vuelve a ser la operación corriente para reconciliar. */
  restore(run: OpenPlanRun, signature: string): void;
  /** Vuelve a `idle`; resultados tardíos de la corrida se descartan.
   * NO usar para abandonar un `uncertain` de la MISMA wallet (habilitaría
   * un reenvío a ciegas): solo cuando cambia la identidad — la operación
   * dudosa queda persistida por wallet y se restaura con `restore`. */
  reset(): void;
}

const defaultNow = () => Date.now();
const defaultSleep = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, ms));

export function createOpenPlanRunner(partial?: Partial<Deps>): OpenPlanRunner {
  const deps: Deps = {
    now: partial?.now ?? defaultNow,
    sleep: partial?.sleep ?? defaultSleep,
    minPostSendMs: partial?.minPostSendMs ?? POST_SEND_MIN_MS,
  };
  let state: OpenFlowState = { kind: "idle" };
  // `gen` invalida resultados tardíos: un reset o una corrida nueva hacen que
  // la resolución anterior no toque el estado.
  let gen = 0;
  let current: OpenPlanRun | null = null;
  const listeners = new Set<() => void>();
  const set = (next: OpenFlowState) => {
    state = next;
    listeners.forEach((cb) => cb());
  };
  const stale = (my: number, run: OpenPlanRun) => gen !== my || !run.isCurrent();

  return {
    state: () => state,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    start(run) {
      if (state.kind === "running" || state.kind === "uncertain") return;
      gen += 1;
      const my = gen;
      current = run;
      set({ kind: "running", phase: "preparing" });
      let postSendAt: number | undefined;
      let signature: string | undefined;

      const onProgress = (p: TxProgress) => {
        if (gen !== my || state.kind !== "running") return;
        if (ORDER.indexOf(p.phase) < ORDER.indexOf(state.phase)) return;
        if (p.signature) signature = p.signature;
        if (postSendAt === undefined && POST_SEND.has(p.phase)) {
          postSendAt = deps.now();
        }
        set({ kind: "running", phase: p.phase, signature });
      };

      void (async () => {
        try {
          const res = await run.call(onProgress);
          if (stale(my, run)) {
            set({ kind: "idle" });
            return;
          }
          const sig = signature ?? res.signature;
          // La pausa mínima se mide desde la primera fase post-envío; si el
          // cliente no emitió fases, corre desde la resolución y se muestra
          // `syncing` (la lectura ya volvió: es solo la ventana legible).
          const base = postSendAt ?? deps.now();
          const remaining = deps.minPostSendMs - (deps.now() - base);
          set({ kind: "running", phase: "syncing", signature: sig });
          if (remaining > 0) await deps.sleep(remaining);
          if (stale(my, run)) {
            set({ kind: "idle" });
            return;
          }
          set({
            kind: "success",
            plan: res.value,
            signature: sig,
            reconciled: false,
            completedAt: Math.floor(deps.now() / 1000),
          });
        } catch (e) {
          if (stale(my, run)) {
            set({ kind: "idle" });
            return;
          }
          const err =
            e instanceof CuotasError ? e : new CuotasError("unavailable");
          if (err.code === "uncertain") {
            set({
              kind: "uncertain",
              signature: err.signature ?? signature,
              checked: false,
            });
          } else {
            set({ kind: "failed", error: err });
          }
        }
      })();
    },
    recheck() {
      if (state.kind !== "uncertain" || !current?.reconcile) return;
      const run = current;
      const signature = state.signature;
      gen += 1;
      const my = gen;
      set({ kind: "running", phase: "syncing", signature });
      void (async () => {
        const out = await run.reconcile!(signature).catch(() => null);
        if (stale(my, run)) {
          set({ kind: "idle" });
          return;
        }
        if (out?.status === "confirmed") {
          set({
            kind: "success",
            plan: out.plan,
            signature: out.signature,
            reconciled: true,
            completedAt: Math.floor(deps.now() / 1000),
          });
        } else if (out?.status === "failed") {
          set({ kind: "failed_onchain", signature: out.signature });
        } else {
          set({ kind: "uncertain", signature, checked: true });
        }
      })();
    },
    restore(run, signature) {
      if (state.kind !== "idle") return;
      gen += 1;
      current = run;
      set({ kind: "uncertain", signature, checked: false });
    },
    reset() {
      gen += 1;
      current = null;
      set({ kind: "idle" });
    },
  };
}
