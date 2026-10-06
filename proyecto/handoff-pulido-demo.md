# Handoff: pulido de la demo (tanda Luciano 2026-10-06)

> **Para la sesión nueva:** este archivo + `.scratch/demo-polish/spec.md` + los tickets en `.scratch/demo-polish/issues/` son todo lo necesario. Rol: coordinador (SWE-2 Max); los workers son subagentes. No implementar en la sesión de coordinación salvo tickets S.

## Qué pidió Luciano (decisiones ya tomadas — no renegociar sin preguntar)

1. Fotos **reales** en la tienda demo (las webp actuales son renders neon generados).
2. El **prisma 3D**: hero/checkout con prisma three.js **interactivo y con datos vivos**; logo y piezas decorativas renderizados con **HyperFrames** (híbrido — lo eligió él).
3. **Planes en paralelo con margen de tarjeta**: límite total por escalón (como una tarjeta de crédito). Implementación: `activeExposure + repayable ≤ maxPurchase del escalón`; motivo nuevo `exceeds_credit_limit`. Solo mock — el programa on-chain fuerza un plan por PDA; divergencia documentada en el spec.
4. **Márgenes más compactos** en todo.
5. Card de "Todavía no podés comprar esto / Ya tenés un plan activo" **más linda** (tiene medidor de margen).
6. Comercio = **"Voltia"** (inventado pero realista — no marcas reales). Address fake `LazoTiendaDemo11111…` → base58 plausible.
7. Comparación ilustrativa y números ilustrativos: **siempre visibles** (sin toggle) y **sin nombrar competidores** (Mercado Pago, Cuota Simple, GOcuotas → "la competencia"/genérico). Kamino/Jupiter quedan (benchmarks DeFi, no competencia).
8. Animaciones piolas donde sumen; `prefers-reduced-motion` siempre.

## El issue #1 de GitHub queda afuera

Sigue bloqueado por credenciales/keypair del equipo (deployer, SOL devnet, Didit, Mobbex, Vercel). Nada codeable de ahí entra en esta tanda.

## ⚠️ Sesión paralela de UX/UI en vuelo

Mientras se escribía este handoff, **otra sesión estaba modificando el working tree** (la "parte de UX/UI" que Luciano abrió aparte): borró `components/animate-ui/`, `components/ui/reveal.tsx`, `hooks/use-auto-height.tsx`, `hooks/use-is-in-view.tsx` (~1.300 líneas) y tocó `hero.tsx`, `sections.tsx`, `landing.module.css`, `tienda-page.tsx`, `product-card.tsx`, `checkout-screen.tsx`, `confirm-success.tsx`, `cuenta/*`, `glass.tsx`. Nada quedó importando lo borrado (verificado con grep).

**Antes de despachar workers:** `git status`/`git log` para confirmar que esa sesión commiteó; re-verificar los paths de cada ticket contra el árbol real (ej.: `Fade`/`revealTransition` ya no existen — los tickets que hablen de animaciones usan la convención que haya quedado). Si esa sesión sigue a medio camino, esperar a que aterrice o coordinar con Luciano: los tickets 03/04/05/06 pisan los mismos archivos.

## Cómo ejecutar (orquestación)

Pedido del usuario: `/to-spec` + `/to-ticket` ya hechos (esta sesión). En la sesión nueva: `/implement` + `/orchestration` — coordinador = vos, workers = subagentes SWE-2 Max.

1. Invocar skill `orchestration` y cargar la guía (`orca skills get orchestration` / `orca-ide`/`orca` según la máquina — macOS: `orca`). Revisar Tasks/workers existentes antes de lanzar (regla del skill).
   - **Si Orca no responde** en la sesión nueva: usar `run_subagent` con profile `subagent_general` (tienen write access); el contenido del prompt = reglas + ticket (ver template abajo). Es el fallback autorizado por el usuario ("los workers son subagentes").
2. Una rama por ticket (`t-polish-01-voltia`, …) desde `front-esqueleto`; el coordinador mergea a `front-esqueleto` en orden. Si los workers trabajan sobre el mismo checkout, encolar los que pisan archivos compartidos (ver DAG).
3. Prompt de worker = `WORKER-RULES.md` completo + contenido del ticket + "tu rama es `t-polish-NN-…`". Los tickets ya listan archivos propios y criterios.
4. Al aceptar cada `worker_done`: revisar diff, correr `npm run typecheck/lint/test/build`, mergear, release del worker.

## DAG de tickets

```
01 Voltia ─┐
           ├─→ 02 margen-mock ──→ 03 margen-UI+card ──→ 05 fotos+ritmo ─┐
04 comparaciones ────────────────(antes de 06 por hero.tsx)─────────────┤
07 logo HyperFrames (paralelo desde el inicio, sin conflictos)          │
                        06 prisma-3D (después de 04 y de 05) ◄──────────┘
                        08 cierre (último)
```

Orden simple seguro: **07 en paralelo** + carril 01 → 02 → 03 → 04 → 05 → 06 → 08.
Conflictos de archivos que definen el orden: 03 y 05 pisan `store.module.css`/`checkout.module.css`; 04 y 06 pisan `hero.tsx`; 02 y 03 pisan diccionarios i18n.

## Mapa rápido de archivos (lo que se toca)

| Qué | Dónde |
|---|---|
| Mock/reglas | `app/src/lib/cuotas/mock.ts`, `mock/state.ts`, `types.ts`, `format.ts`, `demo-config.ts`, tests `mock.*.test.ts` |
| Tienda | `components/store/tienda-page.tsx`, `product-card.tsx`, `store.module.css`, `i18n/dictionaries/tienda.ts` |
| Checkout | `components/checkout/{checkout-screen,breakdown,confirm-panel,confirm-success}.tsx`, `checkout.module.css`, `dictionaries/checkout.ts` |
| Landing | `components/landing/{hero,sections,prism-stage}.tsx`, `landing.module.css`, `dictionaries/landing-*.ts` |
| Logo/header | `components/app-header.tsx` (`PrismaGlyph`), `src/app/favicon.ico` |
| Fotos | `app/public/products/{pc,notebook,curso}.webp` (+ borrar `src/*.svg` huérfanos) |
| Constante comercio | `DEMO_MERCHANT` en `format.ts:17`; nombre en `mock/state.ts:133`, `accounts.ts:~495`, dict `checkout.ts` `merchantFallback` |
| Números de terceros | `lib/cuotas/reference-figures.ts` (mantener, etiqueta "referencia") |

## Gotchas que ya investigué

- Hay **dos** prismas: `components/prism/` (WebGL shader, solo luz — lo usa `/design`, no tocar) y `components/landing/prism-stage.tsx` (SVG, usado por hero y checkout — este es el que pasa a 3D en el ticket 06).
- `three@0.186` + `@types/three` ya están en `app/package.json`. No agregar R3F.
- `STORAGE_KEY` del mock: bump a `lazo.mock.v2` en ticket 01 para que el nombre viejo no persista en localStorage.
- e2e pineado en español (`app/e2e/`): puede romper con copys nuevos — actualizar en cada ticket que toque texto.
- `next typegen` corre dentro de `npm run typecheck`; Next 16 — leer `app/node_modules/next/dist/docs/` antes de APIs.
- HyperFrames: skill ya instalada (`~/.config/devin/skills/hyperframes*`); si el binario falta, el usuario autorizó `npx skills add heygen-com/hyperframes`. Output con alpha para el header; fallback = mejorar el SVG glyph.
- Verificación UI: `cd app && npm run dev` → preview; mock es el modo por defecto (`NEXT_PUBLIC_CUOTAS_MODE` ausente = mock, ver `lib/cuotas.ts`).

## Estado al cerrar esta sesión

- [x] Spec + 8 tickets + WORKER-RULES en `.scratch/demo-polish/`
- [x] Decisiones del usuario asentadas arriba
- [ ] Ejecutar tickets (sesión nueva)
- [ ] Commit/push: el coordinador integra en `front-esqueleto`; push solo si el usuario lo pide
