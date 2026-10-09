"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Finite, bounded entrance; reduced-motion and SSR expose the final value. */
export function useCountUp(target: number, entered: boolean, enabled: boolean, duration = 900) {
  const reduced = useReducedMotion();
  const [displayed, setDisplayed] = useState(target);
  useEffect(() => {
    if (!entered || !enabled || reduced || !Number.isFinite(target)) return;
    let frame = 0;
    let start: number | undefined;
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / Math.max(1, duration));
      setDisplayed(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, entered, enabled, reduced, duration]);
  return !enabled || !entered || reduced ? target : displayed;
}
