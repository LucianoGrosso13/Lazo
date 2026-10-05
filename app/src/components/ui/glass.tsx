"use client";

import type { ComponentProps } from "react";
import { motion } from "motion/react";

const reveal = {
  hidden: { opacity: 0.92, y: 8, filter: "blur(2px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const revealTransition = { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const };

/**
 * Vidrio grueso: canto visible, brillo interior y canto inferior que atrapa
 * el espectro. Nunca una card translúcida plana.
 */
type MotionGlassProps = Omit<ComponentProps<"div">, "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onDrag" | "onDragStart" | "onDragEnd">;

export function GlassPanel({ className = "", ...props }: MotionGlassProps) {
  return <motion.div
    className={`glass ${className}`}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.08 }}
    variants={reveal}
    transition={revealTransition}
    {...props}
  />;
}

/**
 * Bloque de vidrio para héroes: aristas biseladas como un prisma tallado.
 * El wrapper aporta la sombra de profundidad (clip-path se la comería).
 */
export function GlassSlab({ className = "", ...props }: MotionGlassProps) {
  return (
    <motion.div
      className={`slab-depth ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={reveal}
      transition={revealTransition}
    >
      <div className="slab h-full w-full" {...props} />
    </motion.div>
  );
}
