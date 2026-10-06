"use client";

import type { ComponentProps } from "react";

/**
 * Vidrio grueso: canto visible, brillo interior y canto inferior que atrapa
 * el espectro. Nunca una card translúcida plana.
 */
type GlassProps = ComponentProps<"div">;

export function GlassPanel({ className = "", ...props }: GlassProps) {
  return <div className={`glass ${className}`} {...props} />;
}

/**
 * Bloque de vidrio para héroes: aristas biseladas como un prisma tallado.
 * El wrapper aporta la sombra de profundidad (clip-path se la comería).
 */
export function GlassSlab({ className = "", ...props }: GlassProps) {
  return (
    <div className={`slab-depth ${className}`}>
      <div className="slab h-full w-full" {...props} />
    </div>
  );
}
