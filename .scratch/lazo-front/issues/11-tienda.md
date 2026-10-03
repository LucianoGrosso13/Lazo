# 11: Tienda demo /tienda

**What to build:** catálogo de la tienda demo con 3 productos (PC US$1.000, notebook US$650, curso US$120) en el mundo Prisma, cada uno con "3 cuotas sin interés de X" y el anticipo para el escalón de la wallet conectada (o escalón 0 si no hay wallet).

**Blocked by:** 03, 07

**Status:** done

**Archivos tuyos:** `app/src/app/tienda/**`, `app/src/lib/catalog.ts` (ya existe: completá imágenes si hace falta), `app/src/components/store/**`, `app/src/i18n/dictionaries/tienda.ts`, imágenes en `app/public/products/` (con origen/licencia en el commit; si son generadas o ilustraciones propias, decirlo).

- [x] Banner "Tienda demo" (simulada, declarada) con el comercio "Tienda Demo"
- [x] Cada producto: imagen, nombre, precio, cuota y anticipo según `quote()` del escalón; badge si supera el tope del escalón
- [x] Click → `/checkout/<id>`
- [x] Estados: cargando (skeleton del mundo), sin wallet (cotiza escalón 0 y sugiere conectar), error
- [x] 1440 y 390 px; ES/EN
- [x] typecheck, lint, test y build pasan
