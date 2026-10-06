# 08 — Cierre: verificación, capturas y memoria

**Status:** done · **Depende de:** 01-07 · **Tamaño:** S

## Objetivo

Dejar la tanda integrada, verificada y documentada.

## Pasos

1. `cd app && npm run typecheck && npm run lint && npm test && npm run build` — todo verde.
2. `npm run test:e2e` — revisar/actualizar specs rotos por copys nuevos (comparación visible, margen, Voltia).
3. `npm run dev` y recorrido visual a 1440 y 390 px: landing (hero 3D, comparación abierta, escalera, números), `/tienda` (fotos, chip de margen, badge), `/checkout/pc` (desglose, card de bloqueo forzando margen: comprar la PC y volver a intentar otra compra), éxito, header con logo 3D. Capturas a `.scratch/demo-polish/evidence/`.
4. Actualizar memoria del equipo:
   - `proyecto/04-plan.md` §Estado: línea nueva "Pulido demo (margen, fotos, prisma 3D, Voltia): ver `.scratch/demo-polish/spec.md`".
   - `docs/agents/issue-tracker.md`: marcar tickets done.
   - Anotar en `proyecto/05-pitch.md` (o donde corresponda) la **divergencia mock↔programa** del margen de crédito (spec §"Divergencia conocida") — que no quede escondida para el jurado ni para el upgrade del programa.
5. Reporte al coordinador: qué quedó fuera, riesgos, screenshots.

## Criterios

- [x] Todo lo de arriba en verde, evidencia en `.scratch/demo-polish/evidence/` (capturas `08-*` + `capture-ticket-08.mjs`). typecheck/lint/test/build verdes; e2e 24/24 mock (1 skip real por diseño).
- [x] Ningún texto renderizado nombra competidores ni dice "Tienda Demo" (verificado en ES y EN en `/`, `/tienda`, `/checkout/*`, `/comercio`, `/pool`, `/app/*`, `/panel`; quedan solo usos genéricos del sustantivo "tienda demo" en declaraciones de simulación, criterio aceptado del ticket 01).
- [x] Demo corre solo devnet/mock; nada de credenciales nuevas requeridas (sin `.env.local`, mock por defecto).
