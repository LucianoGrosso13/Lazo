import { COLORS, type PrismGeom } from "./layout";

const toCSS = (rgb: readonly number[], a = 1) =>
  `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},${a})`;

/**
 * Versión estática del prisma: mismo layout que WebGL, sin movimiento.
 * Se usa cuando no hay WebGL o con prefers-reduced-motion.
 * Los estados de banda se pintan con las mismas tramas .mark-* del sistema.
 */
export function PrismFallback({ geom }: { geom: PrismGeom }) {
  const { slab, input, bands, comparison } = geom;
  const entry = { x: slab.x0, y: input.y };

  return (
    <div className="absolute inset-0" aria-hidden>
      <svg
        className="h-full w-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <defs>
          {/* haz de entrada: halo vertical alrededor de un núcleo blanco */}
          <linearGradient id="pf-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00C2FF" stopOpacity="0" />
            <stop offset="0.35" stopColor="#9945FF" stopOpacity="0.35" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="0.65" stopColor="#9945FF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#00C2FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="pf-ash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8B92A9" stopOpacity="0" />
            <stop offset="0.4" stopColor="#8B92A9" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#D6DAE8" stopOpacity="0.85" />
            <stop offset="0.6" stopColor="#8B92A9" stopOpacity="0.45" />
            <stop offset="1" stopColor="#8B92A9" stopOpacity="0" />
          </linearGradient>
          {bands.map((b, i) => (
            <linearGradient key={b.id} id={`pf-b${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={toCSS(b.color, 0)} />
              <stop offset="0.32" stopColor={toCSS(b.color, 0.5)} />
              <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="0.68" stopColor={toCSS(b.color, 0.5)} />
              <stop offset="1" stopColor={toCSS(b.color, 0)} />
            </linearGradient>
          ))}
          {bands.map((b, i) => (
            <linearGradient key={`f${b.id}`} id={`pf-f${i}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={toCSS(b.color, 0.02)} />
              <stop offset="0.55" stopColor={toCSS(b.color, 0.1)} />
              <stop offset="1" stopColor={toCSS(b.color, 0.26)} />
            </linearGradient>
          ))}
        </defs>

        {/* haz entrante */}
        <rect x={input.x0} y={input.y - input.th * 3} width={input.x1 - input.x0} height={input.th * 6} fill="url(#pf-beam)" opacity="0.35" />
        <rect x={input.x0} y={input.y - input.th} width={input.x1 - input.x0} height={input.th * 2} fill="url(#pf-beam)" />

        {/* dispersión dentro del vidrio: un rayo por banda */}
        {bands.map((b, i) => (
          <polygon
            key={`fan${b.id}`}
            points={`${entry.x},${entry.y - input.th} ${entry.x},${entry.y + input.th} ${b.x0},${b.y + b.th} ${b.x0},${b.y - b.th}`}
            fill={`url(#pf-f${i})`}
          />
        ))}

        {/* bandas espectrales */}
        {bands.map((b, i) => (
          <g key={b.id}>
            <rect x={b.x0} y={b.y - b.th * 3.2} width={b.x1 - b.x0} height={b.th * 6.4} fill={`url(#pf-b${i})`} opacity={b.mark === "etched" ? 0.28 : 0.38} />
            <rect x={b.x0} y={b.y - b.th} width={b.x1 - b.x0} height={b.th * 2} fill={`url(#pf-b${i})`} opacity={b.mark === "etched" ? 0.55 : 1} />
            {b.mark === "refilled" && (
              <rect x={b.x0} y={b.y - b.th * 5} width={b.x1 - b.x0} height={b.th * 10} fill={toCSS(COLORS.VIOLET, 0.22)} />
            )}
          </g>
        ))}

        {/* la alternativa: haz gris, más largo */}
        {comparison.x1 > comparison.x0 && (
          <>
            <rect x={comparison.x0} y={comparison.y - comparison.th * 3} width={comparison.x1 - comparison.x0} height={comparison.th * 6} fill="url(#pf-ash)" opacity="0.4" />
            <rect x={comparison.x0} y={comparison.y - comparison.th} width={comparison.x1 - comparison.x0} height={comparison.th * 2} fill="url(#pf-ash)" />
          </>
        )}
      </svg>

      {/* marcas de estado: tramas del sistema sobre cada banda */}
      {bands
        .filter((b) => b.mark)
        .map((b) => (
          <div
            key={`mark-${b.id}`}
            className={`absolute mark-${b.mark}`}
            style={{
              left: `${b.x0 * 100}%`,
              top: `${(b.y - b.th * 1.4) * 100}%`,
              width: `${(b.x1 - b.x0) * 100}%`,
              height: `${b.th * 2.8 * 100}%`,
              borderRadius: 3,
            }}
          />
        ))}
    </div>
  );
}
