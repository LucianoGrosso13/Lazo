# 06: Landing visual — garante, mora automática, costos y números

**What to build:** en el home: (a) **"Un garante respalda el plan"**: los 3 pasos con AnimatedSteps (aparecen en secuencia al entrar en pantalla; en hover/foco/toque se eleva y se ilumina el paso y se dibuja la línea que los une). (b) **"Qué pasa si una cuota no se paga"** avanza **sola**: arranca al entrar en pantalla y pasa de hito cada ~2,5 s (Día 0 → vencimiento → gracia → aviso → recargo → cobro al garante), con una barra de progreso. Corre en loop, se pausa con hover, foco o toque en un hito y con reduced-motion queda quieta, con todo visible. Los días salen de la config. (c) **"Comparación de costo total"**: arriba porcentajes grandes (0% · 3% vs CFTEA min–max) y abajo ComparisonBars con el **costo total en US$** de la compra de referencia (Lazo 3, Lazo 6, la competencia), con una función pura testeada CFTEA → costo total, etiqueta "referencia" y la fuente. (d) **"Los números de Lazo"**: ComparisonBars de la comisión del comercio (rango por plazo) vs mostrador y billeteras, y del rendimiento del pool vs Kamino y Jupiter, más los supuestos como tarjetas con número grande. No se tocan el hero, quiénes somos ni "Probalo".

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Claude

**Archivos propios:** `components/landing/sections.tsx`, `components/landing/landing.module.css`, `components/landing/split.ts`, `i18n/dictionaries/landing-sections.ts`.

- [x] Pasos animados con hover, foco y toque
- [x] La línea de mora cambia de hito sola (e2e con `page.clock`) y no cambia con reduced-motion (e2e); se pausa al tocar un hito
- [x] Costos: porcentajes grandes + barras en US$; test de Vitest de la conversión
- [x] Números de Lazo en barras; ningún número hardcodeado
- [x] `landing-motion.spec.ts` y `product-landing.spec.ts` en verde; capturas 390/1440 en `evidence/06-*`

**Notas de cierre (Claude):** la línea de mora tiene además un botón Pausar/Reproducir (WCAG 2.2.2) y el detalle solo se anuncia (aria-live) cuando está quieta. La competencia se compara con el mismo saldo financiado en 3 cuotas mensuales al CFTEA mín y máx (`cfteaTotalCost` en `split.ts`, test en `split.test.ts`). Se actualizó `e2e/landing-motion.spec.ts` (el hito inicial ahora es Día 0 y se sumaron tests de autoplay, reduced-motion, costos y números). El test del slider del hero da timeout solo con la máquina cargada (load ~20); pasa aislado.
