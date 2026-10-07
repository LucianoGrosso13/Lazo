# 04: Responsive de pool, admin, /design y reloj de demo

**What to build:** el pool, el panel admin, la página `/design` y el reloj de demo flotante se usan bien a 390 px. Hallazgos del audit (`/tmp/lazo-responsive-audit/summary.md`, capturas en la misma carpeta):
- `/design` tiene 25 px de scroll horizontal: las tarjetas `.glass p-7` de especímenes en la grilla `lg:grid-cols-2`, las etiquetas absolutas del prisma (~407 px) y el wrap del reloj (399 px).
- El chip del reloj ("DAY 0") **tapa el badge DEVNET del header en todas las rutas `/app/*`**, el chip `MOCK` en `/account` y la esquina de la tienda. Tiene que convivir con el header (p. ej. abajo a la derecha en móvil, sin tapar CTAs ni el footer, respetando el safe-area).
- Botones `btn-sm` de ~28 px de alto y tabs de rol de 24 px: llevarlos a ≥ 40 px de área táctil en móvil (puede ser con padding o pseudo-elemento sin cambiar el look de escritorio). Si el arreglo vive en `components/ui/`, es tuyo.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/cuenta/pool.tsx`, `app/src/components/cuenta/admin.tsx`, `app/src/app/pool/page.tsx`, `app/src/app/(cuenta)/app/admin/page.tsx`, `app/src/app/design/*`, `app/src/components/demo-clock/*`, `app/src/components/ui/*` (solo tamaños táctiles, sin cambiar API ni look de escritorio), diccionarios `pool-cuenta.ts`, `admin-cuenta.ts`, `demo-clock.ts`. **No tocar** `design.ts` (lo usa el header del 03).

- [ ] `/design`, `/pool`, `/app/admin` sin scroll horizontal a 390 px
- [ ] Reloj de demo sin tapar header, badges ni CTAs en `/`, `/tienda`, `/checkout/pc`, `/app/*`, `/account` a 390 px; versión escritorio sin regresiones
- [ ] Tablas del pool/admin legibles en móvil (tarjetas o scroll contenido con indicación)
- [ ] Tap targets ≥ 40×40 en esas pantallas y en `components/ui`
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/04-*`
- [ ] typecheck / lint / test / build en verde
