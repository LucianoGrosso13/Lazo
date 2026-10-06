# 04 — Comparaciones siempre visibles y sin nombres de competidores

**Status:** ready-for-agent · **Depende de:** — · **Tamaño:** S-M

## Objetivo

Decisión del usuario: la "comparación ilustrativa" y los "números ilustrativos" quedan **siempre desplegados** (no toggle, no `<details>` cerrado) y **nunca se nombra a la competencia**. Hoy:

- `hero.tsx` línea ~199: `<details class={styles.compare}>` con summary "Ver una comparación ilustrativa" → pasa a sección siempre visible.
- `sections.tsx` línea ~216: `<details class={styles.economicsDisclosure}>` (beneficios "Números ilustrativos") → siempre visible.
- `checkout-screen.tsx` línea ~292: la sección compare ya es siempre visible — solo retocar copys.

## Sin nombres de competidores

Regla: **Mercado Pago, Cuota Simple y GOcuotas jamás se nombran.** Reemplazos:

- `landing-hero.ts`: `mp: "Mercado Pago, cuotas sin tarjeta"` → `"La competencia · cuotas sin tarjeta"` (en: `"The competition · no-card installments"`).
- `landing-sections.ts` `benefits.rows`: `vs` de student → `"La competencia, sin tarjeta: ~{x}% más"`; merchant → `"Financiación en mostrador {cs}% · billeteras ~{mp}%"` (o genérico similar, sin marcas); pool → dejar `Kamino ~{k}% · Jupiter ~{j}%` (son benchmarks DeFi, no competencia — decisión del spec).
- `checkout.ts`: `mp:` → `"La competencia · cuotas sin tarjeta"`.
- `REFERENCE_FIGURES` (`lib/cuotas/reference-figures.ts`): los nombres de campos pueden quedar (son internos), pero revisar que ningún comentario/label expuesto diga la marca. El `note` "referencia, sin verificar en la fuente oficial" queda.
- Buscar otras menciones: `rg -ni "mercado ?pago|cuota simple|gocuotas" app/src` → eliminar todas las que se rendericen. Comentarios de código interno: preferible genéricos también, pero no bloqueante.

## Cambios de estructura

- `hero.tsx`: el `<details><summary>…` → `<div class={styles.compare}>` con título visible (usar `compareTitle` como heading, ya no botón). El contenido (rows + savings) siempre montado.
- `sections.tsx`: `economicsDisclosure` → sección normal con `h2` + contenido (mantener `aria-labelledby="benefits-title"`).
- `landing.module.css`: limpiar lo que solo servía al toggle (`::after` "+/−", `disclosureIn` si queda huérfano, `[open]` selectors); ajustar márgenes para que quede integrado (el ticket 05 hace el pase fino de espacios — acá solo que no quede roto).
- e2e: `rg -n "compare|ilustrativ|competencia" app/e2e` — si algún spec abre el toggle o afirma el texto viejo, actualizarlo.

## Criterios

- [ ] Hero y sección de números muestran la comparación sin click, arriba del fold si el diseño lo permite sin empujar el CTA.
- [ ] `rg -ni "mercado ?pago|cuota simple|gocuotas" app/src` → cero en texto renderizado.
- [ ] La etiqueta "referencia" sigue junto a las cifras de terceros.
- [ ] reduced-motion y 390 px OK.
- [ ] typecheck/lint/test/build en verde.
