# 10: Cómo funciona — inversores

**What to build:** la página `/para-inversores` deja de ser bloques de texto iguales uno abajo del otro y pasa a usar el set común de bloques del ticket 03, alternando ritmo: hero con ilustración o gráfico, pasos con AnimatedSteps, un número grande con count-up, una comparativa con ComparisonBars, callouts y FAQ con Accordion. Todo con acento **verde (pool)** aplicado a la página. El contenido se mantiene (se reordena y se recorta si sobra); los números salen de la config o de las cifras de referencia.

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Codex (retoma la implementación de Gemini)

**Archivos propios:** `components/audience/para-inversores.tsx`, `i18n/dictionaries/para-inversores.ts`, `app/src/app/para-inversores/page.tsx`. `primitives.tsx` y `audience-common.ts` no se tocan (si hace falta algo, preguntale al coordinador).

- [x] Al menos 4 tipos de bloque distintos y ningún tramo de más de 2 secciones de texto seguidas
- [x] Acento de rol aplicado; FAQ en acordeón accesible
- [x] Sin scroll horizontal a 390 px; reduced-motion OK
- [x] e2e de la página (`responsive.spec.ts` y los que la cubran) en verde; capturas 390/1440 en `evidence/10-*`

## Verificación (2026-10-09)

- Hero con diagrama de fondos y tramos; estado del pool con BigNumber y Gauge; objetivo anual y ComparisonBars; compra con AnimatedSteps; callouts y Accordion.
- Todo con `data-role="investor"`, tokens compartidos y contenido ES/EN. Objetivo senior y referencias salen de `REFERENCE_FIGURES`; los cálculos de la compra siguen usando config/quoteTerms/D8. No se agregó ninguna operación ni se firmó o envió nada.
- Typecheck, lint, 380 tests unitarios y build: pasan. Lint conserva tres advertencias preexistentes en `cuenta/evidencia.tsx`, `cuenta/pool.tsx` y `ui/badges.tsx`.
- E2e: `PW_BASE_URL=http://localhost:3210 npx playwright test e2e/rui-10-como-funciona-inversores.spec.ts e2e/responsive.spec.ts --grep inversores`: 4/4 pasan. Verifican acento, datos, ES/EN, teclado/toque, FAQ, targets ≥40×40 y reduced-motion estático, sin errores de página ni scroll horizontal.
- Responsive completo: 15/16 rutas pasan; falla preexistente en `/checkout/pc` por desborde a 390 px, fuera de este ticket (reportada al coordinador). `/para-inversores` pasa.
- Se miraron las seis capturas: `evidence/10-inversores-{390,1440}.png`, `evidence/10-inversores-{390,1440}-hero.png` y `evidence/10-inversores-{390,1440}-rendimiento.png`.
- Fuera de propiedad: solo el e2e nuevo, autorizado por el coordinador; este ticket y sus capturas son artefactos requeridos. Sin cambios en primitivas, programa ni equipo.
- Servidor propio 3210 cerrado; `.next`, `test-results` y `playwright-report` se limpian antes del reporte final.
