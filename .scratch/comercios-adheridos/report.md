# Comercios adheridos — reporte de ejecución

**Modelo:** swe-2-max (confirmado en system prompt de la sesión).
**Tarea:** `task_7fcd5b9428b7` / dispatch `ctx_ff82880f3b95`.

## Qué se construyó

Directorio ilustrativo "Comercios adheridos" en `/tienda`, debajo de la
vidriera de productos y encima del pie de página. Es una losa-registro
(`glass`) con 4 perfiles ficticios, cada uno con su banda-categoría del
espectro (mismo motivo que el haz: el directorio es el haz ya partido).

| Perfil | Categoría | Zona | Entrega |
|---|---|---|---|
| Voltia (cobre la demo) | Tecnología | San Miguel de Tucumán | Retiro en local |
| Margen Librería | Librería | Zona universitaria | Retiro en local |
| Norte Equipamiento | Equipamiento | Yerba Buena | Envío local |
| Aula Abierta | Cursos online | Online | Acceso online |

- **Declarado ficticio:** tag `ejemplos ficticios` / `fictional examples`
  (`.ref-tag`, el mismo componente de cifras de terceros) junto al título;
  lede "Son perfiles ficticios, sin acuerdos comerciales reales"; pie
  "Las compras de prueba se procesan con Voltia en devnet; los demás
  perfiles son ilustrativos."
- **Solo Voltia cobra:** chip encendido "Cobra en la demo" / "Runs the demo
  checkout" + fila con luz violeta. Ninguna fila tiene link ni CTA de
  compra; el checkout sigue usando `DEMO_MERCHANT` exclusivamente.
- **Independiente del protocolo:** la sección renderiza fuera del
  condicional `error ? … : loading ? … : grid`, con datos editoriales
  locales — se muestra en estados de carga y error. El nombre del comercio
  demo toma `merchantQ.data?.name` si cargó, con fallback a "Voltia".
- **Control real justificado:** `SegmentedControl` existente filtra por
  categoría (Todos + 4), contador `n de n` con `aria-live`. Sin botones de
  contacto ni flujos de checkout extra.
- **Mundo preservado:** tokens del módulo (`--ink*`, `--violet/--indigo/
  --cyan/--green`, `--ease`, `--pad`), `.glass`, `.chip`, `.ref-tag`,
  `.term`, `.refractIn`/`.prismNotch`, animación `cardIn`, y
  `prefers-reduced-motion` extendido a las piezas nuevas. Sin número de
  negocio hardcodeado (los datos del directorio son editoriales).

## Archivos

- `app/src/lib/directory.ts` (nuevo): datos editoriales bilingües,
  convención de `catalog.ts` (`{es,en}`), comentario que prohíbe linkear
  compras a otros comercios.
- `app/src/i18n/dictionaries/tienda.ts`: bloque `dir` ES/EN (título, tag,
  lede, filtro, categorías, etiquetas, foot interpolado).
- `app/src/components/store/tienda-page.tsx`: imports (`useState`,
  `CSSProperties`, `SegmentedControl`, `DIRECTORY*`), estado de filtro,
  sección `<GlassPanel role="region">` fuera del condicional.
- `app/src/components/store/store.module.css`: bloque "Directorio"
  (`.dir`, `.dirHead`, `.dirBeam`, `.dirRow`, `.dirTick`, `.dirMeta`,
  `.dirFoot`, media queries, reduced-motion).

## Cambios pedidos por el coordinador (aplicados)

1. Lede sin contradicción Voltia/checkout y sin afirmar que "ninguno
   procesa compras": nuevo copy ES/EN.
2. Foot sin jerga "editorial": "Las compras de prueba se procesan con
   Voltia en devnet; los demás perfiles son ilustrativos."
3. Franja lateral vertical >1px (craft-floor) → tick horizontal 1.4rem×4px
   antes del nombre, mismo motivo que `.refractIn`.
4. `package-lock.json` de `npm install` revertido (no hay deps nuevas).

## Finish review (`review.md`, disposition: fix) — resuelto

1. Lede: copy del coordinador ya aplicado (resuelve la contradicción y la
   afirmación inverificable).
2. Título EN "Partner directory" → "Example stores" (sin lenguaje de
   partnership ni afiliación; último hallazgo del revisor).
3. `.dirBand` → `.dirTick` horizontal (coordinador + fix #3 del review).
4. Recaptura post-fix de las mismas 8 rutas: hecha (timestamps 13:24-25);
   tras el cambio de título, confirmación visual EN desktop+mobile.

## Verificación

- `npm run typecheck` — limpio (0 errores).
- `npm run lint` — 0 errores; 5 warnings **preexistentes** en
  `lib/cuotas/real.ts` y `lib/server/didit.test.ts` (sin tocar).
- `npm run build` — `next build` OK, 27 rutas.
- `impeccable detect --json` sobre los 4 archivos tocados: `[]`
  (`detector.json`, log en `detector.log`).
- Navegador (Playwright, Next dev 16.3.8):
  - Checkout links intactos: `/checkout/pc`, `/checkout/notebook`,
    `/checkout/curso` (no se enviaron transacciones).
  - Filtro: LIBRERÍA → solo Margen (`1 de 4`); CURSOS ONLINE → Aula
    Abierta; TODOS → los 4.
  - Capturas desktop 1440px / mobile 390px, ES y EN, página completa y
    sección: `tienda-{desktop,mobile}-{es,en}-{full,dir}.png`,
    `tienda-filter-libreria.png`.

## Pendiente

Nada funcional. Si el equipo quiere, el contador podría ocultarse cuando
el filtro está en "Todos" (hoy muestra "4 de 4", intencional como
confirmación).
