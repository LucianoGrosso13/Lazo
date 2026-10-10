"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import type { OrbState } from "./state";
import { createOrbRenderer } from "./webgl";
import styles from "./pool-orb.module.css";

/** Decorative renderer. Its exact asset shares are always readable in the
 * adjacent legend, so neither canvas nor animation is needed to read data. */
export function PoolOrb({ state, className = "" }: { state: OrbState; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { disponibleRatio, prestadoRatio, intensidad } = state;
  useEffect(() => {
    const element = host.current;
    const surface = canvas.current;
    if (!element || !surface) return;
    let renderer: ReturnType<typeof createOrbRenderer> = null;
    try { if (!reduced) renderer = createOrbRenderer(surface, { disponibleRatio, prestadoRatio, intensidad }); }
    catch { /* CSS remains visible on unsupported adapters. */ }
    element.dataset.renderer = renderer ? "webgl" : "css";
    element.dataset.motion = reduced ? "static" : "animated";
    let frame = 0;
    let inView = false;
    let elapsed = 0;
    let last = 0;
    let disposed = false;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      element.dataset.running = "false";
    };
    const draw = (now: number) => {
      frame = 0;
      if (disposed || !inView || document.hidden || reduced) return;
      if (last) elapsed += Math.min(now - last, 50) / 1000;
      last = now;
      if (renderer && !renderer.draw(elapsed)) {
        renderer.dispose();
        renderer = null;
        element.dataset.renderer = "css";
      }
      // CSS doesn't need a JS frame loop.
      if (renderer) frame = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!inView || document.hidden || disposed || reduced) { stop(); return; }
      element.dataset.running = "true";
      if (renderer && !frame) frame = requestAnimationFrame(draw);
    };
    const resize = () => { renderer?.resize(); wake(); };
    const ro = new ResizeObserver(resize);
    ro.observe(element);
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      wake();
    });
    io.observe(element);
    const lost = (event: Event) => {
      event.preventDefault();
      stop();
      renderer?.dispose();
      renderer = null;
      element.dataset.renderer = "css";
      wake();
    };
    surface.addEventListener("webglcontextlost", lost);
    document.addEventListener("visibilitychange", wake);
    renderer?.resize();
    if (reduced) stop();
    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", wake);
      surface.removeEventListener("webglcontextlost", lost);
      renderer?.dispose();
    };
  }, [reduced, disponibleRatio, prestadoRatio, intensidad]);

  return <div ref={host} aria-hidden="true" data-testid="pool-orb" data-renderer="css" className={`${styles.orb} ${className}`} style={{ "--available-angle": `${disponibleRatio * 360}deg`, "--orb-energy": intensidad } as CSSProperties}>
    <div data-testid="pool-orb-fallback" className={styles.fallback}>
      <div className={styles.glass}>
        <div className={styles.haze} />
        <div className={styles.ribbon} /><div className={styles.ribbon} /><div className={styles.ribbon} />
      </div>
    </div>
    <canvas ref={canvas} className={styles.canvas} />
  </div>;
}
