# 05 — Fotos reales en la tienda + ritmo vertical compacto

**Status:** done · **Depende de:** 03 · **Tamaño:** M

## Objetivo

Dos pedidos del usuario:

1. **"A las fotos pone cosas reales, no esas animaciones feas"** — los webp de `app/public/products/` son renders neon generados (del prisma). Reemplazar por **fotografías reales** de producto, con estilo consistente entre las tres.
2. **"Reducí los márgenes, está todo como muy separado"** — pase de densidad: secciones de la landing, tienda y checkout más compactas.

## Fotos (`app/public/products/`)

- Reemplazar `pc.webp`, `notebook.webp`, `curso.webp` por fotos reales: setup de PC de escritorio, laptop, y curso online (pantalla con código / persona estudiando — lo que lea "curso online" de una foto).
- Fuente: Unsplash o Pexels (licencia libre, sin atribución obligatoria). **Descargar y commitear** — nada de hotlink. La skill `media-use` (`resolve`) puede buscar/bajar; si no, `curl` directo a `images.unsplash.com/photo-…?w=1600&q=80` o Pexels.
- Estilo consistente: mismas 3 fotos en la misma familia visual (fondo oscuro o neutro, producto claro, sin marcas de agua, sin texto quemado). Revisarlas en el navegador antes de dar por hecho.
- Formato: webp 1600×1200 (o convertir con `sips`/`cwebp`), mismo nombre de archivo → `catalog.ts` no cambia. Borrar `public/products/src/*.svg` (los generadores de las imágenes viejas) si quedan huérfanos.
- `blurDataURL`/placeholder no hace falta; `Image` ya tiene `sizes`.

## Ritmo vertical (CSS)

- `app/src/components/landing/landing.module.css`: `.section` padding `clamp(4rem,9vw,8rem)` → ~`clamp(2.5rem,5vw,4.5rem)`; `.sectionHead`/`h2Wide` margin-bottom → ~`clamp(1.5rem,3vw,2.5rem)`; `.hero` padding y `.heroGrid` gap → ajustar proporcional; `.compare` margin-top tras quedar siempre visible → integrar.
- `app/src/components/store/store.module.css`: gaps de `.page`/`.grid`/`.side`, padding de `.card` — compactar ~25-35%.
- `app/src/components/checkout/checkout.module.css`: `.wrap` gap, `.grid` gap, `.panel` padding — compactar.
- `app/src/app/globals.css` si hay paddings de página globales que se vean sueltos.
- Criterio: compacto pero no apretado — el vidrio y el prisma siguen respirando. Si dudás entre dos valores, el menor.

## Micro-animaciones (donde sumen, pedido del usuario)

Ya que estás en estos archivos, animaciones chicas con criterio (reglas de `hyperframes-animation`): hover de `ProductCard` (zoom leve de la foto + sheen espectral en el borde), entrada staggered de las cards si falta, transición del medidor. Nada que mueva layout ni que distraiga del precio. Todo con versión quieta en reduced-motion.

## Criterios

- [x] Las 3 fotos son fotografía real, mismo lenguaje visual, peso razonable (<300 KB c/u), se ven bien en card featured y side (1440 y 390 px).
- [x] La landing se recorre con menos scroll "muerto": secciones claramente más juntas sin chocar.
- [x] Tienda y checkout más compactos, sin overflow ni textos pegados.
- [x] typecheck/lint/test/build en verde.
