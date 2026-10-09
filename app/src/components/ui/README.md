# Primitivas por audiencia

Envolver una página o sección con `data-role="buyer"`, `data-role="merchant"`,
`data-role="pool"` o `data-role="investor"`. Los acentos pueden anidarse.

Tokens: `--accent` (relleno), `--accent-ink` (texto/foco con contraste),
`--accent-soft` (fondo), `--accent-border` (borde), `--accent-glow` (luz).
Utilidades: `text-accent`, `bg-accent-soft`, `border-accent`.

Importar desde `@/components/audience/primitives` o, para las cinco piezas
nuevas, desde `@/components/ui/visual-primitives`. Se pueden componer desde
componentes server o client: son entradas client con props serializables.
Todos los textos (incluidos labels accesibles) y valores salen del consumidor.
No acceden a cuotas, no calculan tasas ni realizan operaciones financieras.

- `ComparisonBars`: `label`, `items: {label, value, formattedValue, winner?, winnerLabel?, note?}[]`,
  `maxValue?`, `className?`. Todos comparten la misma escala con origen cero.
  `winnerLabel` nombra la marca de ganador para lectores de pantalla.
  El consumidor elige explícitamente el ganador; no se infiere que más sea mejor.
  `formattedValue` incluye unidad y formato local. Cero se conserva como cero.
- `Gauge`: `value`, `max?` (100 por defecto), `label`, `valueLabel?`, `note?`,
  `className?`. Medidor semicircular con valor acotado al rango 0–max.
- `CollapsibleHistory`: `items: ReactNode[]`, `label`, `visibleCount?` (3),
  `expandLabel`, `collapseLabel`, `empty?`, `className?`. El consumidor ordena
  los ítems y arma el texto traducido del total: por ejemplo `Ver todas (8)`.
  Los ítems ocultos no se leen ni reciben foco. Soporta filas con enlaces/botones.
- `AnimatedSteps`: `steps: {title, body?}[]`, `label`, `className?`.
  El contenido permanece visible. Hover/foco ilumina; toque selecciona y vuelve
  a tocar deselecciona. No anidar elementos interactivos dentro de title/body:
  el paso ya es un botón. El número expresa orden, no estado de una operación.
- `Accordion`: `items: {q, a}[]`, `label`, `className?`. Abre preguntas de forma
  independiente con teclado/toque. Cada botón expone `aria-expanded` y
  `aria-controls`; las respuestas cerradas quedan fuera del árbol accesible.
- `BigNumber`: importar desde `@/components/ui/count-up-number` o el barrel de
  audiencia. Mantiene el contrato original de `@/components/ui/big-number`.
  `amount` está en micro-USDC; `currency`, `suffix`, `size`, `decimals` y
  `className` conservan su significado. `countUp?` (true) activa la entrada,
  `duration?` (900 ms) define su duración. Para porcentajes usar micro-unidades
  con `currency="none"` y `suffix="%"`. Lectores de pantalla reciben el valor
  final estable, sin anuncios por cada frame. El componente original estático
  sigue intacto para no alterar llamadas existentes.

Las animaciones de entrada son finitas y comienzan una vez al entrar en
pantalla. `useReducedMotion` y CSS aseguran una variante estática. No hay loops.
Las muestras de `/design` usan reglas del protocolo como datos de prueba,
sin convertirlas en métricas de actividad.
