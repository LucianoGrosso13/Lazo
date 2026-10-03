---
name: Lazo — Prisma
description: Vidrio grueso sobre fondo casi negro violáceo que parte un haz de luz blanca en anticipo + 3 cuotas del espectro Solana.
colors:
  abyss: "#07060b"
  abyss-2: "#0d0a17"
  abyss-3: "#141026"
  beam: "#f4f1ff"
  violet: "#9945ff"
  indigo: "#6c63ff"
  cyan: "#00c2ff"
  green: "#19fb9b"
  ash: "#8b92a9"
  ash-2: "#565d74"
  alt: "#6f6a86"
  ink: "#f4f1ff"
  ink-2: "#b9b3d6"
  ink-3: "#9a93bb"
  ink-ghost: "#6a6488"
  crack: "#ff5470"
  backlight: "#c4a3ff"
  edge: "rgb(255 255 255 / 0.14)"
typography:
  display:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 5.4vw, 5.25rem)"
    fontWeight: 700
    lineHeight: 0.94
    letterSpacing: "-0.022em"
    fontVariation: "\"wdth\" 92, \"opsz\" 96"
  headline:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 90, \"opsz\" 72"
  figure-lg:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 7vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1
  figure:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Bricolage Grotesque, system-ui, sans-serif"
    fontSize: "clamp(1.02rem, 1.3vw, 1.2rem)"
    lineHeight: 1.5
  label:
    fontFamily: "Martian Mono, ui-monospace, \"SF Mono\", Menlo, monospace"
    fontSize: "0.6875rem"
    lineHeight: 1.1
    letterSpacing: "0.14em"
rounded:
  pill: "999px"
  panel: "18px"
  step: "1.1rem"
  mark: "4px"
  tooltip: "12px"
  ref-tag: "3px"
spacing:
  pad: "clamp(1rem, 3vw, 2.5rem)"
  section-y: "clamp(1.9rem, 5vw, 4rem)"
  gap-grid: "clamp(1.25rem, 2.5vw, 2.25rem)"
components:
  button-primary:
    backgroundColor: "linear-gradient(180deg, #ffffff, #ddd7f2)"
    textColor: "#0b0716"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.375rem"
  button-secondary:
    backgroundColor: "rgb(14 11 23 / 0.5)"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 1.375rem"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.625rem 0.5rem"
  chip:
    backgroundColor: "rgb(244 241 255 / 0.045)"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.8rem"
    typography: "{typography.label}"
  chip-on:
    backgroundColor: "rgb(0 194 255 / 0.1)"
    textColor: "{colors.beam}"
    rounded: "{rounded.pill}"
    padding: "0.3rem 0.8rem"
  glass-panel:
    backgroundColor: "rgb(14 11 23 / 0.55)"
    rounded: "{rounded.panel}"
  segtrack:
    backgroundColor: "rgb(4 2 10 / 0.55)"
    rounded: "{rounded.pill}"
    padding: "0.25rem"
---

# Design System: Lazo — Prisma

## Overview

**Creative North Star: "Un haz de luz partido en cuotas"**

Una compra es un haz de luz blanca que entra a un bloque de vidrio tallado; el prisma de Lazo lo dispersa en anticipo + 3 cuotas del espectro Solana, y el garante es la contraluz que rellena cualquier banda que se apague. El fondo es un casi negro violáceo con bloom radial, grano fino y filetes espectrales: nada es una card translúcida plana ni un dashboard DeFi genérico con un sticker de gradiente.

La densidad es compacta y medida: números tabulares a escala de titular, etiquetas de calibración en mayúsculas, márgenes laterales 16–40 px y separación vertical 30–64 px. El espectro violeta→cian→verde sólo significa plata en movimiento; la alternativa (Mercado Pago) es gris y quebrada.

**Key Characteristics:**
- Vidrio grueso con canto visible, luz interior y canto inferior que atrapa el espectro
- Estado como marca en el vidrio (forma + trama, no sólo color)
- Luz en movimiento, vidrio estable; refracciones ease-out de 400–700 ms
- Números de titular como evidencia, "referencia" declarada en cifras de terceros

## Colors

La paleta nace del haz: blanco para el precio, espectro Solana para la plata, grises para la alternativa y para tintas secundarias.

### Primary
- **Violeta Solana** (`{colors.violet}`): banda del anticipo, bloom ambiental, selección, scrollbar. Es el acento dominante del espectro.
- **Cian haz** (`{colors.cyan}`): bandas medias, foco visible, caret, estado "encendido" de chips.
- **Verde pulso** (`{colors.green}`): última cuota, ahorro, nota devnet, foco de controles críticos.

### Secondary
- **Contraluz fiador** (`{colors.backlight}`): el refill que repone una banda impaga; sólo aparece en estados recuperados.
- **Fisura** (`{colors.crack}`): marca de cuota vencida; localizada, nunca un flash de pantalla.
- **Índigo espectral** (`{colors.indigo}`): escalón intermedio del abanico (bandas 2).

### Neutral
- **Abismo** (`{colors.abyss}` / `{colors.abyss-2}` / `{colors.abyss-3}`): suelo del mundo y vidrio profundo.
- **Haz** (`{colors.beam}`): texto primario, luz entrante, botón primario.
- **Tintas** (`{colors.ink-2}`, `{colors.ink-3}`, `{colors.ink-ghost}`): texto secundario, etiquetas y apagados sobre vidrio (AA sobre abyss).
- **Ceniza** (`{colors.ash}`, `{colors.ash-2}`, `{colors.alt}`): la alternativa gris (MP) y tramas punteadas.
- **Canto** (`{colors.edge}`): filetes y bordes de vidrio.

**The Spectrum-Means-Money Rule.** El gradiente violeta→cian→verde sólo aparece donde hay plata moviéndose o un canto que la atrapa. Nunca como relleno decorativo de fondos.

## Typography

**Display/Body Font:** Bricolage Grotesque (variable, `wdth`/`opsz`)
**Label/Mono Font:** Martian Mono (tabular-nums)

**Character:** una sola familia expresiva para titulares y texto; los números y etiquetas viven en una mono de calibración, ancha en tracking.

### Hierarchy
- **Display** (700, `clamp(2.6rem, 5.4vw, 5.25rem)`, lh 0.94): titular del hero, cierre.
- **Headline** (700, `clamp(2rem, 4.2vw, 3.6rem)`, lh 1): títulos de sección.
- **Figure** (700, `clamp(2rem, 6vw, 3.75rem)` / `clamp(2.6rem, 7vw, 4.75rem)`): porcentajes y montos a escala de titular (0%, comercio, pool).
- **Body** (`clamp(1.02rem, 1.3vw, 1.2rem)`, lh 1.5): bajadas y texto corrido.
- **Label** (Martian Mono, 0.6875rem, ls 0.14em, uppercase): etiquetas de bandas, chips, navegación, "referencia".

**The Numbers-Are-Headlines Rule.** Los montos que prueban el producto (0%, anticipo, cuota) se renderizan a escala de figure en cara tabular; el tamaño es evidencia, no adorno.

## Layout

Retícula de contenido `max-width: 1440px` con padding lateral fluido (`--pad: clamp(1rem, 3vw, 2.5rem)`). El hero divide 7fr/4.4fr en ≥1024 px (prisma + controles a la izquierda, titular y CTA a la derecha) y apila en móvil. Ritmo vertical compacto: secciones `clamp(1.9rem, 5vw, 4rem)`, gaps internos `clamp(1.25rem, 2.5vw, 2.25rem)`. Breakpoints observados: 560, 640, 760, 860, 960, 1024 px; en ≤560 px los chips de precio/escalón pasan a grilla full-width y se ocultan los números secundarios. Targets táctiles ≥44 px.

## Elevation & Depth

La profundidad es óptica, no de sombras de caja: vidrio con `backdrop-filter: blur(20–28px) saturate(1.4–1.5)`, canto superior iluminado (`inset 0 1px 0`), borde inferior espectral y blooms `mix-blend-mode: screen` detrás del prisma. La única sombra estructural es la caída del bloque (`drop-shadow(0 34px 60px rgba(0,0,0,.72))`) y el halo del CTA primario.

**The Mark-Not-Color Rule.** El estado se lee por marca: futura = contorno punteado, por vencer = núcleo encendido, pagada = grabado rayado, vencida = rajadura dibujada, recuperada = relleno por contraluz. El color acompaña; la forma informa.

## Shapes

Dos familias de forma: píldoras (`999px`) para controles, chips y botones; vidrio tallado para superficies (`18px` en paneles, `clip-path` octogonal con bisel de 20px en el slab del hero). Los filetes son de 1px y el canto espectral de 2–3px vive siempre en el borde inferior del vidrio. Las fisuras son trazos finos (1.4–1.6px) confinados dentro del bloque.

## Components

### Buttons
- **Shape:** píldora (`999px`).
- **Primary:** el haz blanco mismo — gradiente blanco→lavanda con canto espectral inferior y halo violeta/cian en hover; texto casi negro (`#0b0716`), `0.625rem 1.375rem`.
- **Secondary:** vidrio del mundo (`blur 14px`), canto superior claro; hover eleva brillo y agrega halo violeta.
- **Ghost:** texto `ink-2`, subrayado cian en hover; sin vidrio.
- **Estados:** `disabled` a 45% de opacidad; foco `outline 2px` verde/cian con offset.

### Chips
- **Style:** etiqueta de calibración en Martian Mono mayúscula, fondo `beam/4.5%`, borde `beam/14%`.
- **State:** `data-on` enciende como tramo de haz (cian al 10–65%, glow 14px).
- **Pista:** `segtrack` es una píldora de vidrio hundido que contiene chips (producto, escalón, ES/EN).

### Cards / Containers
- **GlassPanel:** `18px`, blur 20px, canto espectral inferior 3px al 75% de opacidad, highlight 118°.
- **GlassSlab:** bloque de hero con aristas biseladas (`clip-path` 20px), blur 28px, facetas de corte en esquinas y sombra de profundidad en el wrapper.
- **glass-deep:** variante más oscura (blur 26px) para header, menús y tooltips.

### Navigation
- **Style:** header sticky en `glass-deep`, marca "Lazo" con glifo prisma (haz + triángulo + espectro), links en Martian Mono `text-measure` uppercase; filete `beam-line` espectral bajo la barra. Menú móvil en panel de vidrio; hamburguesa con nombre accesible.

### State Marks
- **Style:** cápsulas 34×18px (o barra full-width) que dibujan el estado de una cuota por forma y trama (ver The Mark-Not-Color Rule).

### Prisma (signature)
- Escenario SVG 960×560: haz blanco entrante etiquetado con el precio, bloque de vidrio con wedge refractivo, abanico de bandas proporcionales al monto etiquetadas en HTML accesible. `state.warning` = presión de luz en la cara de entrada (tope, no mora); `late` = banda al 22% + fisura local; `refill` = gradiente que vuelve desde atrás. Los montos se tweanean ~620ms easeOutExpo; loops (fotones, presión) se pausan fuera de viewport/pestaña.

## Do's and Don'ts

### Do:
- **Do** mover la luz (bandas, refracción ~400–700ms con `cubic-bezier(0.16, 1, 0.3, 1)`) y dejar el vidrio quieto.
- **Do** declarar lo simulado y las cifras de terceros con la etiqueta `ref-tag` junto al dato.
- **Do** mantener el badge devnet visible en toda superficie.
- **Do** dar estado quieto completo con `prefers-reduced-motion` (animaciones off, fisura dibujada, refill al 25%).

### Don't:
- **Don't** usar el gradiente espectral como decoración fuera del haz/cantos (The Spectrum-Means-Money Rule).
- **Don't** dibujar cards translúcidas planas: el vidrio siempre lleva canto visible, luz interior y borde espectral.
- **Don't** representar mora por mover un control: `late`/`refill` sólo por estado real o demostración identificada.
- **Don't** usar rebotes, fragmentos ni destellos repetidos; las transiciones son corrimientos de refracción ease-out.
