# Ticket 04 — pool con orbe

Rama: `rui/04-pool-orbe`. Implementación: `b9aa6cc`.

## Resultado

- Orbe con shader WebGL, esfera de cristal y cintas luminosas. Sin dependencias nuevas.
- El shader adapta el triángulo de pantalla completa y límite de DPR del prisma; el componente adapta el lifecycle de resize/intersection/visibility del fog existente, también para el respaldo CSS.
- `poolToOrbState`: disponible y prestado como proporciones de los activos operativos; intensidad logarítmica del volumen total en unidades USDC. No introduce objetivos de liquidez ni parámetros comerciales.
- Acento verde del rol; objetivo senior desde `REFERENCE_FIGURES`, con count-up y rotulado como objetivo no garantizado. Gauge, ComparisonBars y CollapsibleHistory compartidos, sin copias locales.
- Conserva NAV, capital, tramos, crédito, comisiones, fechas y comprobantes. Lecturas sólo por el cliente compartido.
- Respaldo CSS con gradientes, blur y cintas en perspectiva. Pausa fuera de pantalla y con pestaña oculta; reduced-motion estático sin bucle de JS ni CSS.
- Sólo mock/devnet; ninguna operación firmada ni enviada.

## Validación

- `npm run typecheck`: aprobado.
- `npm run lint`: aprobado, cero errores; quedan dos warnings previos en `cuenta/evidencia.tsx` y `ui/badges.tsx`, fuera de propiedad.
- `npm test`: 34 archivos y 386 pruebas aprobadas, incluidas 6 del estado del orbe (0%, 50%, 100%, vacío, monotonía y balances inválidos).
- `comercio-pool.spec.ts`: las 12 pruebas del área aprobadas, ejecutadas con `PW_BASE_URL=http://localhost:3204` junto con la nueva suite.
- `PW_BASE_URL=http://localhost:3204 npx playwright test e2e/pool-orbe.spec.ts`: 4 pruebas nuevas aprobadas (WebGL y pausa, historial 3→5→3 por teclado, CSS a 390 sin overflow, reduced-motion e inglés).
- `npm run build`: aprobado, 50 páginas generadas, una única ejecución en modo mock.
- Benchmark desktop 1440×1000, Chromium con `--use-angle=metal`, ANGLE Metal Apple M1: 181 frames en 3 segundos, 60,002 fps, pestaña visible. Chromium por defecto usa SwiftShader por software: ~25 fps, no representa la GPU de la demo. El shader renderiza una vez por requestAnimationFrame.

## Capturas revisadas

- `04-webgl-1440.png` y `04-webgl-390.png`: estado inicial del cliente.
- `04-css-1440.png` y `04-css-390.png`: contexto WebGL bloqueado en el navegador de prueba.
- `04-reduced-390.png`: preferencia de movimiento reducido.
- `04-50-percent-1440.png`: fixture local de prueba para mostrar 50% disponible / 50% prestado; no modifica el seed ni representa actividad real.

Todas fueron abiertas e inspeccionadas. No hay overflow horizontal a 390px.

## Propiedad

Fuera de los archivos de implementación propios: `app/e2e/pool-orbe.spec.ts`, autorizado por el coordinador en respuesta a la consulta Orca; ticket y evidencias modificados por el requisito de cierre. No se tocó `comercio-pool.spec.ts`, `programa/`, las primitivas ni quiénes somos.

El servidor de puerto 3204 quedó cerrado. Se eliminan los artefactos de `.next`, `test-results` y `playwright-report` al terminar, según el pedido del coordinador por espacio de disco.

Impeccable informó que la configuración existente no registra `buildPath`; se conserva la dirección de código del brief y no se amplió el alcance para modificar esa configuración.
