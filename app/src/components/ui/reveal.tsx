"use client";

import type { ReactElement } from "react";
import { useReducedMotion } from "motion/react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";

const EASE = [0.16, 1, 0.3, 1] as const;

export function revealTransition(reducedMotion: boolean, delay = 0) {
  return {
    duration: reducedMotion ? 0 : 0.28,
    delay: reducedMotion ? 0 : delay,
    ease: EASE,
  };
}

/** In-view fade that keeps the child element, its props, and its semantics intact. */
export function Reveal({ children }: { children: ReactElement }) {
  const reducedMotion = useReducedMotion();
  return (
    <Fade
      asChild
      inView
      inViewOnce
      initialOpacity={0.94}
      transition={revealTransition(reducedMotion === true)}
    >
      {children}
    </Fade>
  );
}
