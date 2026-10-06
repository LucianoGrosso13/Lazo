# 07 — Logo/marca 3D renderizado con HyperFrames

**Status:** done · **Depende de:** — (paralelo, sin conflictos de archivos) · **Tamaño:** M

## Objetivo

El logo del header hoy es `PrismaGlyph` (SVG de líneas en `app-header.tsx`). El usuario lo quiere **más lindo y 3D**, producido con la skill **HyperFrames** (instalada en `~/.config/devin/skills/hyperframes`; si el binario falta: `npx skills add heygen-com/hyperframes` fue lo que pidió el usuario, y el skill `hyperframes-cli` documenta el pipeline).

## Qué producir

- **Marca 3D del prisma**: un prisma de vidrio triangular (como el concepto del proyecto) con un haz blanco entrando y dispersión violeta→cian→verde saliendo, fondo **transparente**, cámara 3/4, iluminación estilo del sitio (vidrio, espectro Solana).
  - Entregable principal: PNG @2x transparente (ej. 256×256 o 480×360 según proporción del glifo).
  - Entregable opcional (si el pipeline lo da sin dolor): loop sutil de 3-4s (rotación lenta o brillo recorriendo las bandas) como `webm`/`mp4` alpha o, si alpha no sale, versión pensada para fondo oscuro que se integre con `mix-blend-mode: screen`.
- Guardar en `app/public/brand/` (`logo-prisma.png`, `logo-prisma-loop.webm` si existe).
- Composición HyperFrames en `.scratch/demo-polish/brand/` (o `app/brand/` si el skill lo pide en el proyecto) para que sea reproducible — documentar el comando usado en el commit o en un README chico junto a la composición.

## Dónde se usa

- `app-header.tsx`: `PrismaGlyph` → `<img src="/brand/logo-prisma.png">` (o `<video autoPlay muted loop playsInline>` si hay loop); tamaño actual `h-5 w-[1.875rem]` — ajustar proporciones al asset real. Mantener el texto "Lazo".
- `src/app/favicon.ico`: regenerar con el prisma (o `icon.png` en app router — ver `app/node_modules/next/dist/docs/` para la convención Next 16).
- Extra si queda natural: el bloque final de la landing (`close`) o la pantalla de éxito del checkout pueden reutilizar el render como pieza decorativa. Solo si suma, no forzar.
- Fallback si HyperFrames no corre en la máquina: mejorar `PrismaGlyph` a un SVG con gradientes espectrales + facetas (no plano), y dejar el render como follow-up. Avisar en el ticket.

## Criterios

- [x] El header muestra la marca 3D nítida en fondo oscuro, retina incluida.
- [x] El asset está commiteado local (no CDN), peso razonable.
- [x] `prefers-reduced-motion`: si hay video loop, ` prefersReducedMotion` → imagen estática (poster/first frame o PNG).
- [x] typecheck/lint/test/build en verde.

## Notas de implementación

- HyperFrames 0.8.137 funcionó (no fue necesario el fallback SVG). Composición en `.scratch/demo-polish/brand/` (`index.html` 960×640 loop 4s seamless, `compositions/icon.html` 640×640 estático); pipeline documentado en `.scratch/demo-polish/brand/README.md`.
- Assets: `app/public/brand/logo-prisma.png` (480×320 RGBA, 99KB), `logo-prisma@2x.png` (960×640, 264KB), `logo-prisma-loop.webm` + `.mp4` (~240/105KB, fondo negro para `mix-blend-mode: screen` — el VP9 alpha no sale en este pipeline, ticket preveía el fallback), `app/src/app/icon.png` (256px), `favicon.ico` regenerado (16/32/48).
- `app-header.tsx`: `PrismaGlyph` ahora envuelve `<Image>` (marca decorativa, `alt=""` — el texto "Lazo" sigue). Landing `close` suma el loop decorativo (`BrandMark`) con fallback PNG bajo reduced-motion (verificado con playwright `reducedMotion`).
