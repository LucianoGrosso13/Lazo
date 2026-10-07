// Color de banda del prisma: interpola el espectro en sRGB entre sus paradas.
// Con 4 bandas cae exacto sobre SPECTRUM (paradas en 0/3, 1/3, 2/3 y 3/3, el
// reparto de hoy); con 7 reparte el mismo gradiente sin inventar colores.
const hex = (c: string): [number, number, number] => [
  parseInt(c.slice(1, 3), 16),
  parseInt(c.slice(3, 5), 16),
  parseInt(c.slice(5, 7), 16),
];

const to2 = (n: number) => n.toString(16).padStart(2, "0");

/** Color del gradiente en la posición `p` (0 = primera parada, 1 = última). */
export function spectrumAt(stops: readonly string[], p: number): string {
  if (stops.length === 0) return "#ffffff";
  if (stops.length === 1) return stops[0];
  const t = Math.min(1, Math.max(0, p)) * (stops.length - 1);
  const seg = Math.min(stops.length - 2, Math.floor(t));
  const [a, b] = [hex(stops[seg]), hex(stops[seg + 1])];
  const k = t - seg;
  return `#${a.map((v, i) => to2(Math.round(v + (b[i] - v) * k))).join("")}`;
}

/** Color de la banda `i` de `n` totales sobre el espectro dado. */
export function bandColor(stops: readonly string[], i: number, n: number): string {
  return spectrumAt(stops, n > 1 ? i / (n - 1) : 0);
}
