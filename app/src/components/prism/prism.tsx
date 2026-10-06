"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { formatUsdc, type Micro } from "@/lib/cuotas";
import { useLocale } from "@/i18n/locale";
import { PrismFallback } from "./fallback";
import {
  computePrism,
  type PrismBandInput,
  type PrismComparison,
  type PrismInput,
  type PrismState,
} from "./layout";
import { PrismRenderer } from "./webgl";

export interface PrismProps {
  /** El haz que entra: el precio. */
  input: PrismInput;
  /** Las bandas espectrales: anticipo, cuotas, comercio. */
  bands: PrismBandInput[];
  /** La alternativa en gris (la competencia). */
  comparison?: PrismComparison | null;
  /** Marcas por banda: { [bandId]: "cracked" | "refilled" | "etched" }. */
  state?: PrismState;
  size?: "hero" | "compact";
  className?: string;
  /** Texto accesible que resume el dibujo. */
  summary?: string;
}

const subscribeNoop = () => () => {};

function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

let webglCache: boolean | null = null;
function detectWebGL(): boolean {
  if (webglCache === null) {
    try {
      webglCache = !!document.createElement("canvas").getContext("webgl");
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
/** SSR asume WebGL (caso común); si el cliente no tiene, se re-renderiza con fallback. */
function useCanWebGL() {
  return useSyncExternalStore(subscribeNoop, detectWebGL, () => true);
}

/**
 * El prisma: un haz de luz (el precio) entra a un vidrio y sale partido
 * en el espectro de Lazo. El ancho de cada banda es proporcional al monto.
 * WebGL con fallback SVG estático (sin WebGL o reduced-motion).
 * Las etiquetas son HTML real encima del canvas.
 */
export function Prism({ input, bands, comparison = null, state = {}, size = "hero", className = "", summary }: PrismProps) {
  const { locale } = useLocale();
  const geom = useMemo(() => computePrism(input, bands, comparison, state), [input, bands, comparison, state]);
  const reduced = useReducedMotion();
  const canGl = useCanWebGL();
  const useGl = canGl && !reduced;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<PrismRenderer | null>(null);

  useEffect(() => {
    if (!useGl || !canvasRef.current) return;
    const r = PrismRenderer.tryCreate(canvasRef.current);
    rendererRef.current = r;
    return () => {
      r?.dispose();
      rendererRef.current = null;
    };
  }, [useGl]);

  useEffect(() => {
    rendererRef.current?.setGeometry(geom);
  }, [geom]);

  const compact = size === "compact";
  const usd = (m: Micro) => formatUsdc(m, locale);
  const entry = { x: geom.slab.x0, y: geom.input.y };

  return (
    <figure
      className={`relative w-full select-none ${compact ? "h-56" : "h-[340px] md:h-[480px]"} ${className}`}
      role="img"
      aria-label={summary}
    >
      {summary && <figcaption className="sr-only">{summary}</figcaption>}

      {/* el vidrio físico: no se mueve, solo la luz */}
      <div
        className="slab absolute"
        style={{
          left: `${geom.slab.x0 * 100}%`,
          top: `${geom.slab.y0 * 100}%`,
          width: `${(geom.slab.x1 - geom.slab.x0) * 100}%`,
          height: `${(geom.slab.y1 - geom.slab.y0) * 100}%`,
        }}
      />

      {/* la luz */}
      {useGl ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      ) : (
        <PrismFallback geom={geom} />
      )}

      {/* etiqueta del haz entrante */}
      <div
        className="absolute"
        style={{ left: `${Math.max(0, entry.x - 0.16) * 100}%`, top: `${entry.y * 100}%`, transform: "translateY(calc(-100% - 10px))" }}
      >
        <div className={`font-num text-measure uppercase ${compact ? "text-[9px]" : ""}`} style={{ color: "var(--color-ink-3)" }}>
          {input.label}
        </div>
        <div className={`font-num tracking-[-0.02em] ${compact ? "text-lg" : "text-xl md:text-2xl"}`} style={{ color: "var(--color-beam)" }}>
          <span className="font-num text-measure uppercase mr-1" style={{ color: "var(--color-ink-3)" }}>US$</span>
          {usd(input.amount)}
        </div>
      </div>

      {/* etiquetas en la punta de cada banda (se dan vuelta cerca del borde) */}
      {geom.bands.map((b) => {
        const flip = b.x1 > 0.78;
        return (
          <div
            key={b.id}
            className={`absolute ${flip ? "text-right" : ""}`}
            style={{
              left: `${b.x1 * 100}%`,
              top: `${b.y * 100}%`,
              transform: flip ? "translate(calc(-100% - 10px),-50%)" : "translate(10px,-50%)",
              textShadow: "0 1px 10px rgb(7 6 11 / 0.85)",
            }}
          >
            <div
              className={`font-num text-measure uppercase whitespace-nowrap ${compact ? "text-[9px]" : ""}`}
              style={{ color: `rgb(${b.color.map((c) => Math.round(c * 255)).join(",")})` }}
            >
              {b.label}
            </div>
            <div className={`font-num whitespace-nowrap ${compact ? "text-sm" : "text-base md:text-lg"}`} style={{ color: "var(--color-ink)" }}>
              {usd(b.amount)}
            </div>
          </div>
        );
      })}

      {/* la alternativa */}
      {comparison && (
        <div
          className="absolute text-right"
          style={{
            left: `${geom.comparison.x1 * 100}%`,
            top: `${geom.comparison.y * 100}%`,
            transform: "translate(calc(-100% - 10px),-50%)",
            textShadow: "0 1px 10px rgb(7 6 11 / 0.85)",
          }}
        >
          <div className={`font-num text-measure uppercase whitespace-nowrap ${compact ? "text-[9px]" : ""}`} style={{ color: "var(--color-ash)" }}>
            {comparison.label}
          </div>
          <div className={`font-num whitespace-nowrap ${compact ? "text-sm" : "text-base md:text-lg"}`} style={{ color: "var(--color-ink-2)" }}>
            {usd(comparison.amount)}
          </div>
        </div>
      )}
    </figure>
  );
}
