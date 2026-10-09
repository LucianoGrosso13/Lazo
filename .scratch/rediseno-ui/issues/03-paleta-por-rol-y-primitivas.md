# 03: Paleta por rol + primitivas visuales

**What to build:** (a) tokens de acento por rol en el tema: **comprador = violeta** (`--color-violet`), **comercio = cyan** (`--color-cyan`), **pool/inversor = verde** (`--color-green`), cada uno con su variante suave (fondos), de borde y de brillo, y un mecanismo para aplicarlos a una página o sección (atributo o clase de rol que redefine `--accent*`). (b) Primitivas compartidas, accesibles y con reduced-motion: **ComparisonBars** (barras horizontales con valor, etiqueta y realce del ganador), **BigNumber con count-up** (al entrar en pantalla), **Gauge** (medidor de utilización), **CollapsibleHistory** (N visibles + "Ver todas (N)", `aria-expanded`), **AnimatedSteps** (entrada escalonada y realce de paso + línea de conexión en hover/foco/toque) y **Accordion** (FAQ). (c) `/design` muestra la paleta y cada primitiva en los 3 acentos. **La paleta ya está aprobada por Luciano.**

**Blocked by:** None (can start immediately)

**Status:** done · **Asignado:** Codex

**Archivos propios:** `app/src/app/globals.css` (solo agregar tokens o utilidades), archivos nuevos en `app/src/components/ui/`, `components/audience/primitives.tsx` (extender, no romper los exports), `app/src/app/design/page.tsx`, `i18n/dictionaries/design.ts` (solo claves nuevas). Las primitivas reciben sus textos por props (sin diccionario propio).

- [x] Tokens de acento por rol + mecanismo de aplicación documentado en un comentario
- [x] 6 primitivas exportadas, con tipos claros, usables desde server o client components según corresponda
- [x] Todas respetan reduced-motion y se activan con teclado y toque
- [x] `/design` las muestra en los 3 acentos; capturas 390/1440 en `evidence/03-*`
- [x] typecheck, lint, test y build en verde


## Resultado y verificación (2026-10-09)

- Rama: `rui/03-paleta-primitivas`. Sin push ni merge.
- API y ejemplos: `app/src/components/ui/README.md`. Las seis primitivas se
  reexportan desde `@/components/audience/primitives`; los exports anteriores
  permanecen disponibles. `BigNumber` con count-up compone el componente
  estático original en `ui/count-up-number.tsx`, sin modificarlo.
- `data-role="buyer|merchant|pool|investor"` redefine `--accent`, `--accent-ink`,
  `--accent-soft`, `--accent-border`, `--accent-glow`. El texto violeta usa
  backlight para contraste; el relleno conserva violet.
- Muestras bilingües en `/design`: valores de `getConfig()` mediante
  `useCuotasQuery`, sin tasas ni actividad inventadas. Entrada finita, sin loops;
  reduced-motion muestra cifras finales, pasos y gráficos quietos.
- Verdes con Node 24.13: `npm run typecheck`, `npm run lint`, `npm test`
  (33 archivos, 380 tests) y `npm run build` (50 páginas generadas).
  El shell en `app/` puede resolver Node 20: para reproducir se antepuso
  `PATH=/Users/lucianogrosso/.nvm/versions/node/v24.13.0/bin:$PATH`.
- E2e: 5 verdes con `PW_BASE_URL=http://localhost:3203 npx playwright test
  e2e/design-primitives.spec.ts e2e/responsive.spec.ts --grep
  'shared primitives|English copy|count-up settles|/design'`. Cubren los tres
  acentos a 390/1440, teclado, toque real a 390, expansión y cierre, traducción,
  número exacto tras count-up, valor accesible estable, targets ≥40 px y overflow.
- Se inspeccionaron las capturas finales completas y de viewport:
  `evidence/03-design-390.png`, `evidence/03-design-1440.png`,
  `evidence/03-viewport-390.png`, `evidence/03-viewport-1440.png`.
- Fuera del ownership inicial: solo `app/e2e/design-primitives.spec.ts`,
  autorizado por el coordinador en respuesta al ask `msg_f4dcbcb9069f`.
  Se usa la configuración estándar; no quedó un segundo runner.
- Solo mock/devnet; no se firmó ni envió nada, no se tocó `programa/` ni
  los archivos de quiénes somos. Sin cambios en los datos comerciales.
