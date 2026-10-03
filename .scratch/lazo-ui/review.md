# Review visual — refinamiento UI Lazo (UI-01/02) · veredicto: **SHIP**

**Fecha:** 2026-10-03 · **Revisor:** dispatch ctx_549c47b462d5 (read-only) · **Owner UI:** ctx_4b2b2c852d90
**Alcance:** landing + PrismStage SVG + copy público. Sin edición de fuente, sin git, sin tests ni browser propios.

## Evidencia

- Capturas confirmadas del owner: `/tmp/lazo-confirm/desktop-es.png` (1440×4191), `mobile-es.png` y `mobile-en.png` (390×844), `desktop-es-late.png` y `desktop-es-refill.png` (1440×900).
- Verificación de estados: diff de píxeles late↔refill (81 411 bytes difieren, bbox (56,119)-(702,663)) — el cambio queda **contenido en la banda cuota 1 dentro del prisma**; la contraluz del refill se recompone desde atrás. No invade texto ni controles.
- Inspección de fuente (solo lectura): `hero.tsx`, `prism-stage.tsx`, `landing.module.css`, `sections.tsx`, diccionarios `landing-hero`/`landing-sections`, `app-header.tsx`, `.scratch/lazo-ui/spec.md` y `worker-scopes.md`.

## Resultado por criterio

| Criterio | Resultado |
|---|---|
| Jerarquía y márgenes compactos | ✅ Hero en ~1 viewport; secciones escalera→garante→beneficios→honest→cierre sin vacíos. `--pad` 16–40px, secciones ~30–64px verticales. |
| Texto garante / anticipo + saldo | ✅ "respaldadas por un garante que solo paga si vos no pagás" / "backed by a guarantor". "Hoy US$ 300,00 + 3 cuotas de US$ 233,33 del saldo" + total 0% + "El anticipo es parte del precio, no un depósito". Caso "Sin anticipo: 3 cuotas" presente. Sin mamá/mom ni fixtures. |
| Prism fisura/refill | ✅ Fisura localizada en banda afectada; refill con contraluz desde atrás; warning (tope) = presión en cara de entrada, no finge mora. Demo explicitada: "demostración visual, no es una deuda real". |
| Móvil ES/EN | ✅ Etiquetas de banda ancladas al borde derecho sin overflow; chips full-width; pay line wrappea; EN correcto ("Down payment today", "See a missed installment"). |
| Honestidad | ✅ Badge devnet + nota "el USDC es de prueba"; sección "Qué es real y qué es de prueba" con modeNote por modo; `referencia` en cifras de terceros; sin claims financieros nuevos. |

## Pendientes (no bloquean)

1. **Resuelto en `95c49b5`:** el navbar compartido ya no incluye `/design`; metadata y textos comunes usan garante/guarantor. La observación original corresponde a capturas anteriores al commit final.
2. Clave `merchant` del diccionario `landing-hero` ("El comercio cobra hoy") sin uso visible en el hero — dead key cosmética.
3. El badge "N" de Next dev visible en las capturas es tooling de desarrollo, no producto.
4. Capturas de `/tmp/lazo-confirm` son evidencia de QA: no son assets raster del producto.
5. **Detector manual único:** registró dos warnings `layout-transition` en las vigas de comparación y la regla de mora (`/tmp/lazo-ui-detector.json`). **Resueltos en fuente `95c49b5`** con `transform: scaleX`, manteniendo las proporciones mediante `--k`. No se repitió el detector.

## Comprobaciones del commit final

- Fuente final: `95c49b5`; typecheck y ESLint de archivos modificados pasaron según el owner.
- El coordinador corrió `npm test`: **46/46 tests, 7 archivos**, y `npm run lint`: ambos exit 0. El binding nativo faltante se repuso en `node_modules` con la misma versión; no se cambiaron package.json ni lockfile.
- Build previo pasó; la build y el recorrido completos después de integrar cuentas quedan con el integrador.
- `DESIGN.md` contiene las ocho secciones canónicas; el sidecar es JSON válido, schemaVersion 2 y diez componentes.
- El integrador de `app-cuentas`, Run `run_fa4df6a795be`, confirmó la integración de `95c49b5`. UI-03, el etiquetado de tarjeta mock y la publicación final en main/Vercel pertenecen a ese Run bajo su nuevo encargo integral. Este reporte no afirma que estén publicados.

## Alcance declarado

Todo corre en **devnet** con datos mock declarados en pantalla; el programa onchain/IDL, KYC (Didit) y tarjeta del garante (Mobbex) figuran como integración pendiente y así lo dice la propia UI. Este veredicto no afirma flujo completo de cuentas (app-cuentas) ni contrato real: cubre landing + prisma + copy público.

## Documentación generada

- `DESIGN.md` (raíz): frontmatter YAML con tokens observados (`globals.css` @theme + `landing.module.css`) + 8 secciones canónicas.
- `.impeccable/design.json` (schemaVersion 2): ramps tonales, sombras, motion, breakpoints, 10 componentes con snippets autocontenidos `ds-*`, narrativa (north star, reglas, do/don'ts).
