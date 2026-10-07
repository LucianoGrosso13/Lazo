"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./landing.module.css";

export interface StageBand {
  id: string;
  label: string;
  value: string;
  amount: number;
  color: string;
}

interface Props {
  inputLabel: string;
  inputValue: string;
  bands: StageBand[];
  cracked: boolean;
  ariaLabel: string;
  /**
   * "overlay" (default): las etiquetas de banda van sobre el abanico, a la
   * derecha del escenario. "below": el stage no las dibuja — el llamador las
   * muestra debajo (el checkout las necesita legibles a 390 px, donde el
   * abanico ocupa todo el ancho). La etiqueta de entrada va siempre arriba.
   */
  labelsPlacement?: "overlay" | "below";
}

// Geometría del escenario (viewBox 960 × 560). La luz entra por la izquierda,
// se refracta dentro del bloque y sale partida en bandas proporcionales al monto.
const VB_W = 960;
const VB_H = 560;
const BEAM_Y = 250;
const SLAB = {
  a: [330, 112],
  b: [502, 82],
  c: [562, 440],
  d: [390, 470],
  depth: [28, -16],
} as const;
const EXIT_TOP = 226;
const EXIT_BOTTOM = 336;
const FAN_END_X = 748;
const FAN_TOP = 96;
const FAN_BOTTOM = 500;
const GAP = 7;

const leftX = (y: number) => SLAB.a[0] + ((y - SLAB.a[1]) / (SLAB.d[1] - SLAB.a[1])) * (SLAB.d[0] - SLAB.a[0]);
const rightX = (y: number) => SLAB.b[0] + ((y - SLAB.b[1]) / (SLAB.c[1] - SLAB.b[1])) * (SLAB.c[0] - SLAB.b[0]);
const pt = (p: readonly number[]) => `${p[0]},${p[1]}`;
const off = (p: readonly number[]) => [p[0] + SLAB.depth[0], p[1] + SLAB.depth[1]];

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Layout del escenario en coordenadas viewBox — lo comparten el SVG y el stage 3D. */
export const STAGE_LAYOUT = { VB_W, VB_H, BEAM_Y, EXIT_TOP, EXIT_BOTTOM, FAN_END_X, rightX } as const;

/** Anima los montos hacia el objetivo (la luz se re-refracta, el vidrio no se mueve). Exportado para el stage 3D. */
export function useTweened(target: number[], duration = 620): number[] {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = shownRef.current.length === target.length ? shownRef.current : target;
    fromRef.current = from;
    if (reduce) {
      shownRef.current = target;
      const id = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = easeOutExpo((now - start) / duration);
      const next = target.map((v, i) => from[i] + (v - from[i]) * k);
      shownRef.current = next;
      setShown(next);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join("|"), duration]);

  return shown;
}

/** Reparte la cara de salida y el abanico entre las bandas, proporcional al monto. Exportado para el stage 3D. */
export function layoutBands<B extends { shown: number }>(bands: B[], total: number, activeCount: number) {
  const exitSpan = EXIT_BOTTOM - EXIT_TOP;
  const fanSpan = FAN_BOTTOM - FAN_TOP - GAP * Math.max(0, activeCount - 1);
  let exitCursor = EXIT_TOP;
  let fanCursor = FAN_TOP;
  return bands.map((b) => {
    const share = b.shown / total;
    const on = share > 0.002;
    const e0 = exitCursor;
    const e1 = exitCursor + share * exitSpan;
    const f0 = fanCursor;
    const f1 = fanCursor + share * fanSpan;
    exitCursor = e1;
    fanCursor = f1 + (on ? GAP : 0);
    return { ...b, e0, e1, f0, f1, on };
  });
}

export function PrismStage({ inputLabel, inputValue, bands, cracked, ariaLabel, labelsPlacement = "overlay" }: Props) {
  const uid = useId().replace(/:/g, "");
  const stageRef = useRef<HTMLDivElement>(null);
  const amounts = useTweened(bands.map((b) => b.amount));

  // La luz responde a la velocidad del puntero: más rápido, más energía.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let energy = 0;
    let last: { x: number; y: number; t: number } | null = null;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
      const now = performance.now();
      if (last) {
        const v = Math.hypot(x - last.x, y - last.y) / Math.max(16, now - last.t);
        energy = Math.min(1, energy + v * 40);
      }
      last = { x, y, t: now };
    };
    const decay = () => {
      energy *= 0.94;
      el.style.setProperty("--energy", energy.toFixed(3));
      raf = requestAnimationFrame(decay);
    };
    raf = requestAnimationFrame(decay);
    el.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
    };
  }, []);

  const total = amounts.reduce((s, v) => s + Math.max(0, v), 0) || 1;
  const visible = bands.map((b, i) => ({ ...b, shown: Math.max(0, amounts[i]) }));
  const activeCount = visible.filter((b) => b.shown > total * 0.002).length;

  const geom = layoutBands(visible, total, activeCount);

  const entry = [leftX(BEAM_Y), BEAM_Y];
  const wedge = `${pt(entry)} ${rightX(EXIT_TOP)},${EXIT_TOP} ${rightX(EXIT_BOTTOM)},${EXIT_BOTTOM}`;

  return (
    <div
      ref={stageRef}
      className={`${styles.stage} ${cracked ? styles.stageCracked : ""}`}
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className={styles.stageSvg} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={`face-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="0.45" stopColor="#c9b8ff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.09" />
          </linearGradient>
          <linearGradient id={`side-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#9a8cff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#0c0a18" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={`wedge-${uid}`} gradientUnits="userSpaceOnUse" x1={entry[0]} y1="0" x2={rightX(EXIT_TOP)} y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#d7ccff" stopOpacity="0.55" />
          </linearGradient>
          {geom.map((g) => (
            <linearGradient
              key={g.id}
              id={`band-${g.id}-${uid}`}
              gradientUnits="userSpaceOnUse"
              x1={rightX(EXIT_TOP)}
              y1="0"
              x2={FAN_END_X}
              y2="0"
            >
              <stop offset="0" stopColor={g.color} stopOpacity="1" />
              <stop offset="0.7" stopColor={g.color} stopOpacity="0.72" />
              <stop offset="1" stopColor={g.color} stopOpacity="0.38" />
            </linearGradient>
          ))}
          <filter id={`glow-${uid}`} x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          <filter id={`soft-${uid}`} x="-10%" y="-200%" width="120%" height="500%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <clipPath id={`slab-${uid}`}>
            <polygon points={`${pt(SLAB.a)} ${pt(SLAB.b)} ${pt(SLAB.c)} ${pt(SLAB.d)}`} />
          </clipPath>
        </defs>

        {/* Haz de entrada */}
        <g className={styles.beamIn}>
          <line x1="0" y1={BEAM_Y} x2={entry[0]} y2={BEAM_Y} stroke="#fff" strokeWidth="18" opacity="0.18" filter={`url(#soft-${uid})`} />
          <line x1="0" y1={BEAM_Y} x2={entry[0]} y2={BEAM_Y} stroke="#fff" strokeWidth="5" strokeLinecap="round" />
          <line
            x1="0"
            y1={BEAM_Y}
            x2={entry[0]}
            y2={BEAM_Y}
            stroke="#fff"
            strokeWidth="5"
            strokeDasharray="2 46"
            className={styles.photons}
          />
        </g>

        {/* Bandas de salida: brillo difuso + banda nítida */}
        <g className={styles.bandsGlow} filter={`url(#glow-${uid})`}>
          {geom.map((g) =>
            g.on ? (
              <polygon
                key={g.id}
                points={`${rightX(g.e0)},${g.e0} ${FAN_END_X},${g.f0} ${FAN_END_X},${g.f1} ${rightX(g.e1)},${g.e1}`}
                fill={g.color}
              />
            ) : null,
          )}
        </g>
        <g className={styles.bands}>
          {geom.map((g) =>
            g.on ? (
              <polygon
                key={g.id}
                points={`${rightX(g.e0)},${g.e0} ${FAN_END_X},${g.f0} ${FAN_END_X},${g.f1} ${rightX(g.e1)},${g.e1}`}
                fill={`url(#band-${g.id}-${uid})`}
              />
            ) : null,
          )}
        </g>

        {/* Bloque de vidrio: canto, cara superior y cara frontal */}
        <polygon points={`${pt(SLAB.b)} ${pt(off(SLAB.b))} ${pt(off(SLAB.c))} ${pt(SLAB.c)}`} fill={`url(#side-${uid})`} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <polygon points={`${pt(SLAB.a)} ${pt(off(SLAB.a))} ${pt(off(SLAB.b))} ${pt(SLAB.b)}`} fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <polygon points={`${pt(SLAB.a)} ${pt(SLAB.b)} ${pt(SLAB.c)} ${pt(SLAB.d)}`} fill={`url(#face-${uid})`} />
        <g clipPath={`url(#slab-${uid})`}>
          <polygon points={wedge} fill={`url(#wedge-${uid})`} className={styles.wedge} />
          <ellipse className={styles.caustic} cx="440" cy="280" rx="120" ry="160" fill="#9945ff" opacity="0.22" filter={`url(#glow-${uid})`} />
          {cracked ? (
            <path
              className={styles.crack}
              d="M 352 196 L 398 232 L 386 262 L 440 300 L 428 330 L 488 372 M 398 232 L 430 214 M 440 300 L 470 296"
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
            />
          ) : null}
        </g>
        <polygon points={`${pt(SLAB.a)} ${pt(SLAB.b)} ${pt(SLAB.c)} ${pt(SLAB.d)}`} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.2" />
        <line x1={SLAB.a[0]} y1={SLAB.a[1]} x2={SLAB.b[0]} y2={SLAB.b[1]} stroke="#fff" strokeWidth="2" opacity="0.8" />
        <line x1={SLAB.a[0] + 4} y1={SLAB.a[1] + 6} x2={SLAB.d[0] + 2} y2={SLAB.d[1] - 10} stroke="#fff" strokeWidth="1" opacity="0.35" />
      </svg>

      {/* Etiquetas en HTML (accesibles y traducibles) */}
      <div className={styles.inputLabel} style={{ top: `${(BEAM_Y / VB_H) * 100}%` }} aria-hidden>
        <span className={styles.labelKey}>{inputLabel}</span>
        <span className={styles.labelValue}>{inputValue}</span>
      </div>
      {labelsPlacement === "overlay"
        ? geom.map((g) =>
            g.on ? (
              <div
                key={g.id}
                className={styles.bandLabel}
                style={{ top: `${(((g.f0 + g.f1) / 2) / VB_H) * 100}%`, left: `${(FAN_END_X / VB_W) * 100 + 1.6}%`, ["--band" as string]: g.color }}
                aria-hidden
              >
                <span className={styles.labelKey}>{g.label}</span>
                <span className={styles.labelValue}>{g.value}</span>
              </div>
            ) : null,
          )
        : null}
    </div>
  );
}
