import type { ComponentProps } from "react";

/**
 * Vidrio grueso: canto visible, brillo interior y canto inferior que atrapa
 * el espectro. Nunca una card translúcida plana.
 */
export function GlassPanel({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`glass ${className}`} {...props} />;
}

/**
 * Bloque de vidrio para héroes: aristas biseladas como un prisma tallado.
 * El wrapper aporta la sombra de profundidad (clip-path se la comería).
 */
export function GlassSlab({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div className={`slab-depth ${className}`}>
      <div className="slab h-full w-full" {...props} />
    </div>
  );
}
