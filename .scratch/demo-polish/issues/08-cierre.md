# 08 — Cierre: verificación, capturas y memoria

**Status:** ready-for-agent · **Depende de:** 01-07 · **Tamaño:** S

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

- [ ] Todo lo de arriba en verde, evidencia en `.scratch/demo-polish/evidence/`.
- [ ] Ningún texto renderizado nombra competidores ni dice "Tienda Demo".
- [ ] Demo corre solo devnet/mock; nada de credenciales nuevas requeridas.
