# 03: Paleta por rol + primitivas visuales

**What to build:** (a) tokens de acento por rol en el tema: **comprador = violeta** (`--color-violet`), **comercio = cyan** (`--color-cyan`), **pool/inversor = verde** (`--color-green`), cada uno con su variante suave (fondos), de borde y de brillo, y un mecanismo para aplicarlos a una página o sección (atributo o clase de rol que redefine `--accent*`). (b) Primitivas compartidas, accesibles y con reduced-motion: **ComparisonBars** (barras horizontales con valor, etiqueta y realce del ganador), **BigNumber con count-up** (al entrar en pantalla), **Gauge** (medidor de utilización), **CollapsibleHistory** (N visibles + "Ver todas (N)", `aria-expanded`), **AnimatedSteps** (entrada escalonada y realce de paso + línea de conexión en hover/foco/toque) y **Accordion** (FAQ). (c) `/design` muestra la paleta y cada primitiva en los 3 acentos. **La paleta ya está aprobada por Luciano.**

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent · **Asignado:** Codex

**Archivos propios:** `app/src/app/globals.css` (solo agregar tokens o utilidades), archivos nuevos en `app/src/components/ui/`, `components/audience/primitives.tsx` (extender, no romper los exports), `app/src/app/design/page.tsx`, `i18n/dictionaries/design.ts` (solo claves nuevas). Las primitivas reciben sus textos por props (sin diccionario propio).

- [ ] Tokens de acento por rol + mecanismo de aplicación documentado en un comentario
- [ ] 6 primitivas exportadas, con tipos claros, usables desde server o client components según corresponda
- [ ] Todas respetan reduced-motion y se activan con teclado y toque
- [ ] `/design` las muestra en los 3 acentos; capturas 390/1440 en `evidence/03-*`
- [ ] typecheck, lint, test y build en verde
