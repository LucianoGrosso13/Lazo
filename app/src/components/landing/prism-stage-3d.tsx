"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  layoutBands,
  PrismStage,
  STAGE_LAYOUT,
  useTweened,
  type StageBand,
} from "./prism-stage";
import { toSlices, type Stage3DRenderer } from "./prism-3d-renderer";
import styles from "./landing.module.css";

interface Props {
  inputLabel: string;
  inputValue: string;
  bands: StageBand[];
  cracked: boolean;
  ariaLabel: string;
  /**
   * "overlay" (default): etiquetas de banda sobre el abanico. "below": el
   * stage no las dibuja — el llamador las lista debajo (legible a 390 px,
   * donde el abanico ocupa todo el ancho). Vale para el SVG y para el 3D.
   */
  labelsPlacement?: "overlay" | "below";
}

let webglCache: boolean | null = null;
function detectWebGL(): boolean {
  if (webglCache === null) {
    try {
      // three@0.186 corre sobre WebGL2; si no hay, el stage queda en SVG.
      webglCache = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}

/**
 * El stage se sube a 3D solo si hay WebGL2 y el usuario no pidió movimiento
 * reducido. En SSR responde `false`: el HTML del servidor es el SVG de siempre
 * y la mejora aparece al hidratar (mismo patrón que prism.tsx).
 */
function useEnhanced(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => detectWebGL() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * Drop-in del PrismStage: mismo contrato. Sin WebGL o con
 * prefers-reduced-motion, renderiza el SVG actual sin tocar nada.
 */
export function PrismStage3D(props: Props) {
  const enhanced = useEnhanced();
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  if (!enhanced || failed) return <PrismStage {...props} />;
  return <Stage3DScene {...props} onFail={fail} />;
}

function Stage3DScene({ onFail, inputLabel, inputValue, bands, cracked, ariaLabel, labelsPlacement = "overlay" }: Props & { onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Stage3DRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const [svgGone, setSvgGone] = useState(false);

  // La misma matemática que el SVG: tween de montos + reparto del abanico.
  // Así las etiquetas HTML y las bandas del canvas nunca se despegan.
  const amounts = useTweened(bands.map((b) => b.amount));
  const total = amounts.reduce((s, v) => s + Math.max(0, v), 0) || 1;
  const visible = bands.map((b, i) => ({ ...b, shown: Math.max(0, amounts[i]) }));
  const activeCount = visible.filter((b) => b.shown > total * 0.002).length;
  const geom = layoutBands(visible, total, activeCount);

  const geomRef = useRef(geom);
  const crackedRef = useRef(cracked);

  // Estos efectos se declaran antes que el de montaje: en el primer render
  // los refs ya están al día cuando el renderer termina de arrancar.
  useEffect(() => {
    geomRef.current = geom;
    rendererRef.current?.setBands(toSlices(geom));
  }, [geom]);

  useEffect(() => {
    crackedRef.current = cracked;
    rendererRef.current?.setCracked(cracked);
  }, [cracked]);

  // Pulso de re-refracción: precio, producto o escalón cambiaron y la luz
  // se reparte de nuevo. Salta el primer render (montaje, no cambio).
  const firstBands = useRef(true);
  useEffect(() => {
    if (firstBands.current) {
      firstBands.current = false;
      return;
    }
    rendererRef.current?.pulse();
  }, [bands]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let renderer: Stage3DRenderer | null = null;
    let retry = 0;

    const boot = () => {
      import("./prism-3d-renderer")
        .then((m) => {
          if (!alive) return;
          renderer = m.Stage3DRenderer.tryCreate(canvas);
          if (!renderer) {
            onFail();
            return;
          }
          rendererRef.current = renderer;
          renderer.onFatal = onFail;
          renderer.setBands(toSlices(geomRef.current));
          renderer.setCracked(crackedRef.current);
          // dos frames: que el vidrio haya dibujado antes del crossfade
          requestAnimationFrame(() => requestAnimationFrame(() => alive && setReady(true)));
        })
        .catch(() => {
          if (!alive) return;
          // un reintento por si el chunk llega tarde; después, SVG.
          if (retry++ < 1) boot();
          else onFail();
        });
    };
    boot();

    const onLost = (e: Event) => {
      e.preventDefault();
      if (alive) onFail();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => {
      alive = false;
      canvas.removeEventListener("webglcontextlost", onLost);
      renderer?.dispose();
      rendererRef.current = null;
    };
  }, [onFail]);

  // Cuando el 3D ya dibuja, el SVG termina su fade y sale del árbol.
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setSvgGone(true), 750);
    return () => window.clearTimeout(id);
  }, [ready]);

  const { VB_W, VB_H, BEAM_Y, FAN_END_X } = STAGE_LAYOUT;

  return (
    <div
      className={styles.stage}
      style={{ aspectRatio: `${VB_W} / ${VB_H}` }}
      role="img"
      aria-label={ariaLabel}
    >
      {!svgGone && (
        <div className={styles.stage3dSvg} data-gone={ready || undefined} aria-hidden="true">
          <PrismStage inputLabel={inputLabel} inputValue={inputValue} bands={bands} cracked={cracked} ariaLabel={ariaLabel} labelsPlacement={labelsPlacement} />
        </div>
      )}
      <canvas ref={canvasRef} className={styles.stage3dCanvas} data-ready={ready || undefined} aria-hidden="true" />

      {/* Etiquetas en HTML: mismas posiciones que el SVG */}
      <div className={styles.stage3dLabels} data-ready={ready || undefined}>
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
    </div>
  );
}
