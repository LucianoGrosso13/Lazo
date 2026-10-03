# 07: Sistema de diseño Prisma (tokens, vidrio, marcas de estado) + /design

**What to build:** el mundo visual de Lazo como sistema reutilizable: tokens, tipografías, paneles de vidrio grueso, marcas de estado, números a escala de titular, botones, chips, badge devnet y el header rediseñado. Una página `/design` muestra todo. Las pantallas de esta spec y las de la otra sesión (`app-cuentas`) lo usan.

**Blocked by:** 01

**Status:** done

**Lectura obligatoria:** `.impeccable/surfaces/app-src-app-page-tsx.md` (contrato "Prisma": OWN-WORLD, motion grammar), `PRODUCT.md`, `.agents/skills/impeccable/reference/craft-floor.md`, `reference/color-and-contrast.md` si existe, `reference/typography.md` si existe.

**Archivos tuyos:** `app/src/app/globals.css`, `app/src/components/ui/**`, `app/src/components/app-header.tsx`, `app/src/components/wallet-button.tsx` (solo estilos/markup, no la lógica), `app/src/app/design/**`, `app/src/i18n/dictionaries/design.ts`, `app/src/app/layout.tsx` (solo fuentes y clases del body), `app/public/` (assets propios).

- [x] Tokens en `globals.css` con `@theme` de Tailwind 4: fondo casi negro violáceo, espectro Solana (violeta #9945FF → cian #00C2FF → verde #19FB9B), blanco de luz, gris "alternativa" (para MP), tintas de texto con contraste AA sobre el fondo y sobre vidrio
- [x] Dos familias tipográficas con punto de vista vía `next/font` (display + tabular para números). Evitar la lista prohibida de impeccable (Inter como display, Space Grotesk, Space Mono, IBM Plex, DM Sans, Outfit, Plus Jakarta, Syne…) salvo razón escrita en el commit
- [x] `GlassPanel` (vidrio grueso: borde con canto visible, highlight interior, refracción/blur, nunca una card plana translúcida genérica) y `GlassSlab` (bloque grande para héroes)
- [x] `StateMark` para cuotas y planes: `etched` (pagada), `lit` (por vencer), `cracked` (vencida), `refilled` (recuperada por el fiador), `dim` (futura). Se distinguen **sin color** (forma/trama) además del color
- [x] `BigNumber` (tabular, a escala de titular, con prefijo US$/USDC y sufijo opcional), `Button` (primario espectral, secundario de vidrio, ghost), `Chip`/`SegmentedControl`, `DevnetBadge` (con tooltip "qué es devnet"), `ExplorerLink` (marca "simulada" en modo mock), `ReferenceTag` ("referencia")
- [x] Header rediseñado con estos componentes: wordmark Lazo, nav, DevnetBadge, ES/EN, wallet. Responsive con menú en 390 px
- [x] Fondo de página del mundo (luz y profundidad, sin blobs genéricos)
- [x] `/design` muestra cada componente en todos sus estados, en ES/EN
- [x] `prefers-reduced-motion` respetado; foco visible en todo lo interactivo
- [x] Capturas de `/design` a 1440 y 390 px en `.impeccable/review/design-desktop.png` y `design-mobile.png`
- [x] typecheck, lint, test y build pasan
