# 04: Pool con orbe 3D

**What to build:** `/pool` (y la vista de pool en cuentas, si la reutiliza) con acento verde: arriba un **orbe 3D abstracto tipo logo de Siri** (esfera de cristal con cintas de luz que giran y se cruzan, colores de Lazo: violeta, cyan, verde y backlight) y, flotando arriba, el **rendimiento anual en grande con count-up** ("~X% anual si dejás tu plata", el valor sale de la config o de las cifras de referencia, con etiqueta si es objetivo). El orbe **representa datos**: el reparto de color sigue disponible vs prestado y el brillo o la intensidad siguen la liquidez total, a través de una función pura `pool → { disponibleRatio, prestadoRatio, intensidad }` con test. Se implementa con **shader WebGL** reutilizando el andamiaje de `components/prism/webgl.ts` y `landing/gpu-fog.tsx` (contexto, resize, loop, pausa fuera de pantalla o con la pestaña oculta), con **respaldo CSS** (gradientes con blur y rotación en perspectiva) sin WebGL y **estático** con reduced-motion. Sin librerías 3D nuevas. Debajo: **utilización** con el Gauge, **movimientos** con CollapsibleHistory (3 visibles) y **rendimientos de referencia** con ComparisonBars (pool vs Kamino vs Jupiter, etiqueta "referencia"). Los tramos y los datos del pool se mantienen, más visuales.

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Codex

**Archivos propios:** `components/cuenta/pool.tsx`, `app/src/app/pool/page.tsx`, `i18n/dictionaries/pool-cuenta.ts`, carpeta nueva `components/pool-orb/`.

- [x] Orbe WebGL animado a 60 fps en desktop, sin errores de consola, que se pausa fuera de pantalla
- [x] El respaldo CSS se ve sin WebGL; con reduced-motion queda estático (e2e con `reducedMotion: 'reduce'`)
- [x] Función pura del estado del orbe con test de Vitest (0%, 50% y 100% de utilización)
- [x] Rendimiento con count-up; Gauge de utilización; historial plegable (e2e: 3 visibles → expandir); barras de referencia
- [x] `comercio-pool.spec.ts` en verde; capturas 390/1440 en `evidence/04-*` (incluido el respaldo)

## Verificación de cierre

Rama `rui/04-pool-orbe`. Typecheck, lint (sin errores; 2 warnings previos fuera de propiedad), 386 pruebas unitarias y build aprobados; 12 e2e existentes y 4 nuevos del orbe aprobados. Desktop con ANGLE Metal Apple M1: 60,002 fps. Se revisaron las seis capturas 390/1440, CSS, reduced-motion y reparto 50/50. Informe: `../evidence/04-validation.md`.
