"use client";

import type { ComponentProps } from "react";
import { useReducedMotion } from "motion/react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";
import { revealTransition } from "@/components/ui/reveal";

/**
 * Vidrio grueso: canto visible, brillo interior y canto inferior que atrapa
 * el espectro. Nunca una card translúcida plana.
 */
type MotionGlassProps = ComponentProps<"div">;

export function GlassPanel({ className = "", ...props }: MotionGlassProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Fade
      asChild
      inView
      inViewOnce
      initialOpacity={0.94}
      transition={revealTransition(reducedMotion === true)}
    >
      <div className={`glass ${className}`} {...props} />
    </Fade>
  );
}

/**
 * Bloque de vidrio para héroes: aristas biseladas como un prisma tallado.
 * El wrapper aporta la sombra de profundidad (clip-path se la comería).
 */
export function GlassSlab({ className = "", ...props }: MotionGlassProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Fade
      asChild
      inView
      inViewOnce
      initialOpacity={0.94}
      transition={revealTransition(reducedMotion === true)}
    >
      <div className={`slab-depth ${className}`}>
        <div className="slab h-full w-full" {...props} />
      </div>
    </Fade>
  );
}
