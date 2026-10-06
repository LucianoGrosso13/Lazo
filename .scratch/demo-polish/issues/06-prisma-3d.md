# 06 — Prisma 3D interactivo (hero + checkout)

**Status:** ready-for-agent · **Depende de:** 04 · **Tamaño:** L

## Objetivo

El prisma es la marca: hoy `PrismStage` es un SVG 2D (un slab con caras dibujadas). El usuario pidió **"que el prisma sea 3D"** manteniendo los datos vivos — los montos del slider/checkout siguen conduciendo las bandas. Decisión tomada: **three.js real** en la app (ya es dependencia: `three@0.186` + `@types/three`), NO un video fijo. La skill `hyperframes-animation` (reglas de motion) e `impeccable` guían la coreografía.

## Qué construir

`app/src/components/landing/prism-stage-3d.tsx` — mismo contrato que `PrismStage` (`inputLabel`, `inputValue`, `bands: StageBand[]`, `cracked`, `ariaLabel`) para hacer drop-in:

- Escena three.js en `<canvas>` transparente sobre el fondo actual:
  - **Prisma de vidrio real**: `MeshPhysicalMaterial` con `transmission`/`thickness`/`ior` (o shader propio si transmission es pesado para el tier de máquinas), iluminación ambiente violeta/cian.
  - **Haz entrante**: volumen cónico/plano blanco (mesh con material aditivo o sprite con gradiente) que entra por una cara.
  - **Dispersión**: N haces de salida (uno por banda) cuyo **ancho/intensidad es proporcional al `amount`** y ángulo ligeramente distinto por índice (dispersión cromática). Tween de 600ms ease-out al cambiar montos (mismo timing que el SVG actual; reusar la lógica de `useTweened` si aplica).
  - **Energía del puntero**: el prisma rota/parpadea sutil con la velocidad del mouse (equivalente a `--energy` actual) + parallax de cámara mínimo.
  - `cracked` → las bandas se dessaturan/apagan como hoy (`stageCracked`).
- **Fallbacks**: sin WebGL o `prefers-reduced-motion` → renderizar el `PrismStage` SVG actual tal cual (no borrarlo). SSR: skeleton como hoy.
- Etiquetas HTML encima (las del stage actual: `inputLabel`, `bandLabel`) — reubicar aproximado es OK, el ojo manda.
- Pausar el loop fuera de viewport (IntersectionObserver) y con pestaña oculta, como hace `prism/webgl.ts`.
- Performance: `powerPreference: "low-power"` razonable, DPR cap ≤1.75, sin postprocessing pesado.

## Dónde se monta

- `hero.tsx` línea ~89 y `checkout-screen.tsx` línea ~238: `<PrismStage>` → `<PrismStage3D>` (que internamente cae al SVG si no hay WebGL).
- `landing.module.css`/`checkout.module.css`: estilos del contenedor del canvas si hacen falta (`.stage` conserva tamaño/aspecto).

## Criterios

- [ ] El prisma se ve con volumen/vidrio real y las bandas salen del sólido con dispersión creíble (screenshot en el PR/commit).
- [ ] Mover el slider de precio cambia los anchos de banda con el tween.
- [ ] Sin WebGL → SVG actual idéntico. reduced-motion → estático.
- [ ] Sin regresión de performance visible ni errores de consola.
- [ ] typecheck/lint/test/build en verde.

## Notas

- `app/src/components/prism/` (el otro prisma WebGL de `/design`) queda intacto.
- `three` ya está en `package.json` — no agregar deps sin avisar (R3F no es necesario; three plano alcanza y pesa menos).
