# 15: Cierre — e2e, verificación completa, documentación y README en inglés

**What to build:** la tanda queda verificada de punta a punta, protegida por e2e y con la documentación del equipo al día.

**Blocked by:** 01–14 (03 y 04 pueden quedar afuera si se cortan: en ese caso, se documenta)

**Status:** done

**Archivos propios:** `app/e2e/*`, `README.md`, `PRODUCT.md`, `proyecto/04-plan.md` (§ Estado), `.scratch/producto-final/evidence/15-*`. Arreglos chicos en otros archivos solo si un e2e descubre un bug, listados en el `worker_done`.

- [x] e2e: checkout con 6 cuotas (mínimo 350 bloquea; 1.000 muestra 3% y 1.021)
- [x] e2e: sin fiador no se puede confirmar y se ofrece invitar
- [x] e2e: mostrador de punta a punta (orden → QR/link → checkout → pagada → venta en el comercio)
- [x] e2e: cobro a 90 días libera 3 tramos con el reloj, con el estudiante en mora
- [x] e2e: home sin "provisional" ni "escalón" (es y en); "Quiénes somos" y "Probalo" visibles
- [x] e2e: rutas nuevas (`/app/comercio/mostrador`, `/orden/[id]`) sin scroll horizontal a 390 px
- [x] e2e existentes actualizados; `npm run test:e2e` en verde
- [x] typecheck / lint / test / build en verde en la rama de integración
- [x] `proyecto/04-plan.md` § Estado y `PRODUCT.md` al día
- [x] `README.md` (inglés): 6 cuotas, tiers, tramos, mostrador; qué corre en la cadena (devnet) y qué en el simulador

Cerrado por Codex el 2026-10-07 al retomar la sesión orquestadora: 48 e2e pasaron y 1 se omitió (modo real), contra el build de producción. Typecheck, lint (7 warnings previos, 0 errores), 279 tests de app, 47+10 de keeper, 36+142 de programa, fmt/clippy, build y generate:check pasaron. Se integró origin/main (tiendas y cuentas de Ignacio), se corrigió el CSS responsive del checkout y su regreso al comercio para órdenes de mostrador. Capturas finales del checkout: 15-checkout-final-{390,768,1440}.png. No se firmó ni envió ninguna transacción.
