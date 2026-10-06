# Spec: pulido de la demo (tanda 2026-10-06)

**Status:** ready-for-agent · Fecha: 2026-10-06 · Rama de integración: `front-esqueleto`

Fuentes: `.scratch/lazo-front/spec.md` (spec original), `AGENTS.md`, pedidos de Luciano en sesión (ver "Decisiones" — vienen del usuario, no se renegocian sin preguntarle). Handoff de ejecución: `proyecto/handoff-pulido-demo.md`.

**Fuera de esta spec:** el issue #1 de GitHub (credenciales, keypair, Fase A3, video) sigue bloqueado por el equipo; el rediseño UX/UI profundo va en otra sesión; tocar el programa Anchor queda fuera (la regla de "un plan" vive on-chain, ver T-02).

## Problem Statement

La demo funciona pero se siente de juguete donde debería sentirse real: las fotos de la tienda son ilustraciones neon generadas, el comercio se llama "Tienda Demo" con una address que dice `LazoTiendaDemo11111…`, la comparación con la competencia está escondida detrás de un toggle, las secciones están muy separadas, la card de "no podés comprar" es un texto plano, el logo es un SVG simple y el prisma —la pieza central de la marca— es un SVG 2D. Además, una regla de negocio molesta: no se pueden tener dos planes en paralelo, cuando la metáfora correcta es la de una tarjeta de crédito con margen.

## Decisiones (tomadas por Luciano, 2026-10-06)

1. **Planes en paralelo = margen de crédito por escalón.** Nada de "un plan a la vez": cada estudiante tiene una línea de crédito (como el límite de una tarjeta) que crece con su escalón. Puede abrir varios planes mientras `activeExposure + nuevoRepayable ≤ límite`. En el mock el límite **es el `maxPurchase` del escalón** (mismo número, doble rol: tope por compra y línea total). No agregar campos a `ProtocolConfig` (espejo del programa).
2. **Comparaciones siempre visibles, sin marcas.** La comparación ilustrativa del hero y los "Números ilustrativos" dejan de ser `<details>`/toggle: siempre desplegados. **Nunca nombrar Mercado Pago ni competidores directos** (MP, Cuota Simple, GOcuotas) — se dice "la competencia" / genérico. Kamino y Jupiter quedan nombrados: son benchmarks de rendimiento DeFi, no competencia (si al equipo le molesta, se genérican después: es un cambio de diccionario).
3. **Comercio con nombre realista inventado:** **Voltia** (no usar marcas reales). La address fake `DEMO_MERCHANT` pasa a un base58 plausible sin texto legible.
4. **Prisma híbrido:** hero y checkout reciben un prisma **3D real e interactivo** (three.js, ya es dependencia) que sigue respondiendo a los datos; logo del header y piezas decorativas se generan como **renders 3D con HyperFrames** (skill ya instalada en `~/.config/devin/skills/`).
5. **Fotos reales** en la tienda demo (no ilustraciones ni animaciones): fotografía real, estilo consistente, licencia libre, descargada y commiteada local.
6. **Márgenes más compactos** en landing, tienda y checkout.
7. **Animaciones "piolas"** donde sumen: micro-interacciones con criterio, siempre respetando `prefers-reduced-motion` y la motion policy existente.

## Alcance por ticket

| # | Ticket | Depende de |
|---|--------|-----------|
| 01 | Comercio "Voltia" (nombre + address + bump de storage) | — |
| 02 | Margen de crédito en el mock + tests + copys del motivo nuevo | 01 (usa el seed) |
| 03 | UI del margen (tienda) + card de bloqueo rediseñada (checkout) | 02 |
| 04 | Comparaciones siempre visibles, sin nombres de competidores | — (antes de 06, pisan `hero.tsx`) |
| 05 | Fotos reales + ritmo vertical compacto | 03 (CSS compartido) |
| 06 | Prisma 3D interactivo en hero + checkout (three.js) | 04 |
| 07 | Logo/marca 3D renderizado con HyperFrames | — (paralelo) |
| 08 | Cierre: verificación completa, capturas, docs | todos |

## Reglas que no se tocan

- Solo devnet, solo mock para la demo. Nada de mainnet ni claves.
- La UI habla con la cadena solo por `@/lib/cuotas` + `useCuotasQuery`.
- Números de negocio desde `getConfig()`/`quote()`; cifras de terceros desde `REFERENCE_FIGURES` con etiqueta "referencia".
- i18n: diccionarios `defineDict({es, en})`, español rioplatense.
- Cambios a `CuotasClient`/tipos se anotan en el mensaje del commit.

## Divergencia conocida (documentar, no resolver)

El programa on-chain fuerza un plan por estudiante (`Plan` PDA con seeds `[PLAN_SEED, student]`, `init` falla si existe; ver `programa/programs/cuotas/src/instructions/open_plan.rs:145`). El margen de crédito se implementa solo en el mock — la demo corre en mock. El cliente real (`real.ts`) mantiene `has_active_plan`. Evolución futura del programa: seeds `[PLAN_SEED, student, generation]` + chequeo `active_exposure + repayable ≤ tope_del_escalón`. Anotar en `proyecto/` al cerrar.

## Testing

- Vitest del mock actualizado a la semántica de margen (tests que hoy afirman "un plan activo bloquea" se reescriben: paralelo dentro del margen OK, exceso bloqueado con `exceeds_credit_limit`).
- `npm run typecheck && npm run lint && npm test && npm run build` en verde en cada ticket.
- e2e (`npm run test:e2e`) al final: el estado pineado en español puede romperse por copys nuevos — actualizar.
- Verificación visual 1440 y 390 px en cada ticket de UI.
