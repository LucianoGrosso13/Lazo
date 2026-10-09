# Reglas para los workers — tanda rediseño UI (leer antes de tu ticket)

**Plazo: hoy.** Mañana a la mañana hay demo en vivo. Priorizá que funcione y se vea bien; no te metas en refactors que tu ticket no pide.

1. Leé `AGENTS.md` (raíz), `app/AGENTS.md` (Next.js 16: antes de usar una API de Next leé la guía relevante en `app/node_modules/next/dist/docs/`), `PRODUCT.md`, `.scratch/rediseno-ui/spec.md` (sobre todo "Decisiones") y tu ticket en `.scratch/rediseno-ui/issues/`.
2. **Trabajás en tu propio worktree**, el que te abrió Orca, que sale de `t4-rediseno-ui`. Antes de nada, desde la raíz del worktree:
   - Rama: `git switch -c rui/<NN>-<slug>` si todavía no estás en una rama propia.
   - Dependencias: `cp -cR "/Users/lucianogrosso/orca/projects/Hackaton Solana/app/node_modules" app/node_modules` (copia APFS instantánea). Si falla, `cd app && npm ci`.
   - No hace falta `app/.env.local`: la app corre en modo mock. Nunca copies secretos.
3. **UI:** usá la skill `impeccable` (`.agents/skills/impeccable/SKILL.md`, en especial `reference/craft-floor.md`) y los contratos de `.impeccable/`. Colores **solo** con tokens de `app/src/app/globals.css`, incluidos los de acento por rol del ticket 03. Para piezas visuales repetidas usá las primitivas del ticket 03 (barras comparativas, número con count-up, medidor, historial plegable, pasos animados, acordeón); no hagas copias locales. Se mantienen la identidad (fondo oscuro, prisma, Bricolage, Martian Mono) y el tono sobrio, con más color y movimiento con sentido.
4. **Vocabulario:** en español se dice **comprador/compradores** y **garante/garantes** (nunca "estudiante" ni "fiador" en texto visible). En inglés, **buyer** y **guarantor**. Las rutas, claves de diccionario, nombres de componentes y tipos **no** se renombran.
5. **Cada rol ve lo suyo:** el comprador y el garante nunca ven montos ni plazos de cobro del comercio.
6. **Sin "Datos simulados", "Simulated data" ni "Mock"** en las cuentas. Sí se mantienen la sección "Qué corre en la cadena y qué en el simulador" de la landing, el aviso de devnet del footer y la etiqueta "de ejemplo" de los comercios del marketplace.
7. **Solo devnet y mock.** Nunca mainnet, claves privadas ni frases semilla. Nada se firma ni se envía. No se toca `programa/`.
8. Las pantallas hablan con la cadena **solo** por `@/lib/cuotas` (`getCuotas()` / `useCuotasQuery`). Si cambiás `CuotasClient` o un tipo exportado, explicalo en el commit.
9. **Ningún número de negocio hardcodeado:** sale de la config del protocolo, de `quote()` / `quoteTerms()` o de `REFERENCE_FIGURES` (con etiqueta "referencia"). No nombres competidores (Mercado Pago, Cuota Simple, Cuotas MiPyME, GOcuotas) ni billeteras candidatas (Lemon, Ripio, belo). Kamino y Jupiter sí. No inventes métricas, usuarios ni tracción.
10. Textos: un diccionario por pantalla en `app/src/i18n/dictionaries/<pantalla>.ts` con `defineDict({ es, en })`. Español rioplatense claro y sin jerga; inglés correcto. Nunca texto suelto en el JSX.
11. Tocá **solo** los archivos que tu ticket dice que te pertenecen (más archivos nuevos dentro de las carpetas que te asigna). Si necesitás otro, preguntá al coordinador con `ask` de Orca. Excepción: ajustes mínimos de tipos para que compile, que listás en tu `worker_done`. **Nunca** toques `quienes-somos.tsx`, `team.module.css` ni `landing-equipo.ts`.
12. **Responsive:** a 390×844, sin scroll horizontal (`scrollWidth <= clientWidth`), tap targets ≥ 40×40 px y texto de cuerpo ≥ 14 px. Arreglá la causa; no tapes con `overflow-x: hidden` global.
13. **`prefers-reduced-motion`:** toda animación nueva tiene versión quieta (usá `app/src/lib/use-reduced-motion.ts`). Las animaciones en loop se pausan fuera de pantalla.
14. **Accesible:** todo lo que se activa con hover también se activa con foco de teclado y con toque. Los plegables usan `<button aria-expanded>`.
15. Antes de terminar, desde `app/`: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` en verde. Corré los e2e de tu área (`npx playwright test e2e/<spec>`) y actualizá los que se rompan por un texto que tu ticket cambió. Levantá `npm run dev -- --port 32NN` (NN = número de ticket), revisá tus pantallas a 390 y 1440 px con Playwright, guardá capturas en `.scratch/rediseno-ui/evidence/<NN>-*.png` y **mirá cada una**. Cerrá tu dev server al terminar.
16. Commits chicos en tu rama, en español, terminando con tu línea de coautoría (Devin: `Co-Authored-By: Devin SWE-2 <noreply@cognition.ai>`; Codex: `Co-Authored-By: Codex <noreply@openai.com>`). Ni push ni merge: integra el coordinador.
17. Tildá los criterios de tu ticket en su archivo y cambiá `Status` a `done` (en tu rama).
18. Al terminar, mandá `worker_done` por Orca con un resumen, la rama, el hash del último commit, los archivos tocados fuera de tu propiedad (si hubo) y las rutas de las capturas.
