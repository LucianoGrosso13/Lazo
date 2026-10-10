# 09: Cómo funciona — comercios

**What to build:** la página `/para-comercios` deja de ser bloques de texto iguales uno abajo del otro y pasa a usar el set común de bloques del ticket 03, alternando ritmo: hero con ilustración o gráfico, pasos con AnimatedSteps, un número grande con count-up, una comparativa con ComparisonBars, callouts y FAQ con Accordion. Todo con acento **cyan (comercio)** aplicado a la página. El contenido se mantiene (se reordena y se recorta si sobra); los números salen de la config o de las cifras de referencia.

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Devin

**Archivos propios:** `components/audience/para-comercios.tsx`, `i18n/dictionaries/para-comercios.ts`, `app/src/app/para-comercios/page.tsx`. `primitives.tsx` y `audience-common.ts` no se tocan (si hace falta algo, preguntale al coordinador).

- [x] Al menos 4 tipos de bloque distintos y ningún tramo de más de 2 secciones de texto seguidas
- [x] Acento de rol aplicado; FAQ en acordeón accesible
- [x] Sin scroll horizontal a 390 px; reduced-motion OK
- [x] e2e de la página (`responsive.spec.ts` y los que la cubran) en verde; capturas 390/1440 en `evidence/09-*`
