import type { Micro } from "@/lib/cuotas";

/**
 * Geometría del prisma, compartida entre el renderer WebGL, el fallback SVG
 * y las etiquetas HTML. Todo en coordenadas normalizadas (x ∈ [0,1] del
 * ancho, y ∈ [0,1] del alto, origen arriba a la izquierda).
 *
 * El ancho de cada banda es proporcional al monto: una misma unidad U
 * convierte micro-USDC a largo de banda para todo el dibujo, así las
 * proporciones se leen directo (el haz gris de la alternativa sale más largo).
 */

export type BandKind = "down" | "installment" | "merchant";
export type BandMark = "cracked" | "refilled" | "etched";

export interface PrismBandInput {
  id: string;
  label: string;
  amount: Micro;
  kind: BandKind;
}
export interface PrismInput {
  label: string;
  amount: Micro;
}
export interface PrismComparison {
  label: string;
  amount: Micro;
}
/** Marca por banda: `{ [bandId]: "cracked" | "refilled" | "etched" }`. */
export type PrismState = Record<string, BandMark | undefined>;

const VIOLET: RGB = [0.6, 0.271, 1.0]; // #9945FF
const CYAN: RGB = [0.0, 0.761, 1.0]; // #00C2FF
const GREEN: RGB = [0.098, 0.984, 0.608]; // #19FB9B
const BEAM: RGB = [0.957, 0.945, 1.0]; // #F4F1FF
const ASH: RGB = [0.545, 0.573, 0.663]; // #8B92A9
export const COLORS = { VIOLET, CYAN, GREEN, BEAM, ASH } as const;
type RGB = [number, number, number];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export interface SlabGeom {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
export interface BeamGeom {
  x0: number;
  x1: number;
  y: number;
  th: number;
}
export interface BandGeom {
  id: string;
  kind: BandKind;
  mark: BandMark | null;
  amount: Micro;
  label: string;
  x0: number;
  x1: number;
  y: number;
  th: number;
  color: RGB;
}
export interface PrismGeom {
  slab: SlabGeom;
  input: BeamGeom;
  bands: BandGeom[];
  comparison: BeamGeom;
  /** micro-USDC → fracción del ancho. */
  unit: number;
}

/** Escala del dibujo: el espacio libre a la derecha del bloque. */
const BAND_ROOM = 0.4;
const CMP_ROOM = 0.84;
const MAX_X = 0.985;

export function computePrism(
  input: PrismInput,
  bands: PrismBandInput[],
  comparison?: PrismComparison | null,
  state: PrismState = {},
): PrismGeom {
  const slab: SlabGeom = { x0: 0.3, y0: 0.05, x1: 0.56, y1: 0.76 };

  const maxBand = Math.max(1, ...bands.map((b) => b.amount));
  let unit = BAND_ROOM / maxBand;
  if (comparison) unit = Math.min(unit, CMP_ROOM / comparison.amount);

  const n = Math.max(1, bands.length);
  const pad = (slab.y1 - slab.y0) * 0.12;
  const step = (slab.y1 - slab.y0 - pad * 2) / n;
  const installments = bands.filter((b) => b.kind === "installment").length;
  let instSeen = 0;

  const geoms: BandGeom[] = bands.map((b, i) => {
    const y = slab.y0 + pad + step * (i + 0.5);
    const len = Math.min(b.amount * unit, MAX_X - slab.x1);
    let color: RGB;
    if (b.kind === "down") color = VIOLET;
    else if (b.kind === "merchant") color = BEAM;
    else {
      const t = installments <= 1 ? 0.5 : instSeen / (installments - 1);
      color = mixRGB(CYAN, GREEN, t);
      instSeen += 1;
    }
    return {
      id: b.id,
      kind: b.kind,
      mark: state[b.id] ?? null,
      amount: b.amount,
      label: b.label,
      x0: slab.x1,
      x1: slab.x1 + len,
      y,
      th: Math.min(0.02, step * 0.3),
      color,
    };
  });

  const cmpY = Math.min(0.93, slab.y1 + 0.14);
  const cmpGeom: BeamGeom = comparison
    ? { x0: 0.06, x1: Math.min(0.06 + comparison.amount * unit, MAX_X), y: cmpY, th: 0.018 }
    : { x0: 0, x1: 0, y: cmpY, th: 0.018 };

  return {
    slab,
    input: { x0: 0, x1: slab.x0, y: (slab.y0 + slab.y1) / 2 - 0.045, th: 0.024 },
    bands: geoms,
    comparison: cmpGeom,
    unit,
  };
}
