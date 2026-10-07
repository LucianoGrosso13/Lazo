# Reglas para los workers (leer antes de tu ticket)

1. Leé `AGENTS.md` (raíz), `app/AGENTS.md` (Next.js 16: leé la guía relevante en `app/node_modules/next/dist/docs/` antes de usar APIs de Next), `PRODUCT.md`, `.scratch/web-completa/spec.md` y tu ticket en `.scratch/web-completa/issues/`. Si tu ticket es de contenido, leé también los documentos de `proyecto/` que nombra.
2. **Trabajás en tu propio worktree** (el que te abrió Orca). Antes de nada, desde la raíz del worktree:
   - Confirmá la rama: `git switch -c web/<NN>-<slug>` si todavía estás en una rama compartida.
   - Dependencias sin reinstalar: `cp -cR "/Users/lucianogrosso/orca/projects/Hackaton Solana/app/node_modules" app/node_modules` (copia APFS instantánea). Si falla, `cd app && npm ci`.
   - `app/.env.local` no existe en tu worktree y no hace falta: la app corre en modo mock. Nunca copies secretos.
3. Si tu ticket toca UI: usá la skill `impeccable` (`.agents/skills/impeccable/SKILL.md`, en especial `reference/craft-floor.md`) y los contratos de `.impeccable/` si existen. Usá los componentes y tokens de `app/src/components/ui/` y `app/src/app/globals.css`; no inventes colores ni fuentes.
4. **Solo devnet y mock.** Nunca mainnet, claves privadas ni frases semilla. Nada se firma ni se envía.
5. Las pantallas hablan con la cadena **solo** por `@/lib/cuotas` (`getCuotas()`) y `useCuotasQuery`. Si cambiás `CuotasClient` o un tipo exportado, explicalo en el mensaje del commit.
6. **Ningún número de negocio hardcodeado en la UI**: sale de `getConfig()`/`quote()` o de los helpers de términos de `@/lib/cuotas`. Cifras de terceros desde `REFERENCE_FIGURES`/`REFERENCE`, con etiqueta "referencia". **Nunca nombrar competidores** (Mercado Pago, Cuota Simple, Cuotas MiPyME, GOcuotas) ni billeteras candidatas (Lemon, Ripio, belo): se dice "la competencia", "billeteras argentinas". Kamino y Jupiter sí se pueden nombrar (benchmarks DeFi).
7. **Lo simulado se declara:** comercios demo con etiqueta "demo", términos provisionales con etiqueta "provisional", siempre visible que corre en devnet. No inventes usuarios, métricas, testimonios, aliados ni tracción.
8. Textos: un diccionario por pantalla en `app/src/i18n/dictionaries/<pantalla>.ts` con `defineDict({ es, en })`. Español rioplatense claro, sin jerga cripto (si aparece un término como wallet o devnet, explicalo en una línea); inglés correcto. Nunca texto suelto en el JSX.
9. Tocá **solo** los archivos que tu ticket dice que te pertenecen. Si necesitás cambiar otro, preguntá al coordinador con el `ask` de Orca antes de editar. Excepción: cambios mínimos de tipos para que compile, listados en tu `worker_done`.
10. **Responsive:** a 390×844 sin scroll horizontal (`document.documentElement.scrollWidth <= clientWidth`), tap targets ≥ 40×40 px, texto de cuerpo ≥ 14 px. Arreglá la causa (grids, anchos fijos, `min-width`, tablas); no tapes con `overflow-x: hidden` global. Tablas anchas → tarjetas apiladas o scroll contenido en su propio contenedor.
11. `prefers-reduced-motion`: toda animación nueva tiene versión quieta.
12. Antes de terminar, desde `app/`: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` en verde. Si tu ticket es de UI, levantá `npm run dev -- --port <31NN>` (NN = número de ticket) y revisá tus pantallas a 390 y 1440 px con Playwright; guardá capturas en `.scratch/web-completa/evidence/<NN>-*.png` y mirá cada una. Cerrá tu dev server al terminar.
13. Commits chicos en tu rama, en español, terminando con la línea `Co-Authored-By: Devin SWE-2 <noreply@cognition.ai>`. No hagas push ni merge: integra el coordinador.
14. Tildá los criterios de tu ticket en su archivo y cambiá `Status` a `done` (en tu rama).
15. Al terminar, mandá `worker_done` por Orca con resumen, rama, hash del último commit, archivos tocados fuera de tu propiedad (si hubo) y rutas de las capturas.
