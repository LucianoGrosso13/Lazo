# Ownership para implementar el refinamiento de UI

**Estado:** ready-for-agent dentro del alcance autorizado informado por el coordinador. Ningún worker lanzado desde esta tarea. Steering final: la sesión original Claude chat 40641009 sigue coordinando front-08/11/13/14 y merges; no duplicar su coordinación ni intervenir en sus workers.

## Reparto exacto

| Owner | Puede editar | Exclusiones |
|---|---|---|
| **UI nuevo, tickets UI-01 y UI-02 secuenciales, worktree lazo-ui** | `app/src/components/landing/**` (incluye `landing.module.css`, `hero.tsx`, `sections.tsx`, `prism-stage.tsx` SVG incumbente); `app/src/i18n/dictionaries/landing-hero.ts`; `app/src/i18n/dictionaries/landing-sections.ts`; `app/src/app/page.tsx` sólo composición de landing; `PRODUCT.md` sólo copy público/brand aprobado | WebGL `app/src/components/prism/**`, `app/src/components/ui/**`, header/globals/layout/common; checkout/store/tienda/demo-clock; todos los `app/src/lib/**`, config/catalog/cuotas/generated; programa/keeper; app-cuentas |
| **design existente, bajo coordinador original** | Ownership reservado de `app/src/components/prism/**`, `app/src/components/ui/**`, `app/src/app/design/**`, diccionario `design.ts`, estilos de wallet sin lógica; sus cambios actuales en header/globals | Esta mejora no retoca WebGL, no reasigna su worker ni integra el componente en landing; PrismStage SVG permanece con UI |
| **checkout existente, front-12/13, bajo coordinador original** | `app/src/app/checkout/**`, `app/src/components/checkout/**`, `app/src/i18n/dictionaries/checkout.ts`; aclarar anticipo y presentación genérica del garante mock dentro de UI-03 si el integrador lo encarga | Landing/SVG/WebGL, cuotas/config/catalog, header/globals/layout, tienda; no renombrar fixtures |
| **tienda existente, front-11, bajo coordinador original** | `app/src/app/tienda/**`, `app/src/components/store/**`, `app/src/i18n/dictionaries/tienda.ts`, `app/public/products/**`; aclaración de anticipo en su propio scope si se encarga | Checkout/landing/prism/cuotas/config/header/globals/layout; catálogo sólo lectura según handoff |
| **mock existente, reloj front-14, bajo coordinador original** | `app/src/components/demo-clock/**`, diccionario `demo-clock.ts`; `app/src/app/layout.tsx` sólo import/montaje reloj según integración original | No cambios de fixture, reglas de negocio, cuotas, copy/nav/landing/prism por esta iniciativa |
| **Integrador A/B existente, UI-03** | Recibe e integra UI-01/02 y originales; cambios puntuales de `app/src/components/app-header.tsx`, `app/src/i18n/dictionaries/common.ts`, metadata de `app/src/app/layout.tsx`; `app/src/app/globals.css` sólo si hace falta al integrar; setup/recorrido `app/e2e/**`, `app/playwright.config.ts`, package/lock después de integrar dependencias originales | No doble owner de cierre ni edición paralela de scopes activos. Main/deploy quedan fuera de la nueva sesión UI; no cambiar cuotas ni paneles app-cuentas |

El planning owner de esta entrega sólo escribió los cinco documentos de `.scratch/lazo-ui`. No cambió producto/código, git ni workers. El coordinador informó que copiará los documentos al worktree lazo-ui y resolverá los archivos untracked de raíz con el integrador; esta tarea no hace esa operación.

## Gate de archivos compartidos

- Header/globals tienen cambios de design y layout tiene montaje de reloj de mock. La nueva sesión UI **no los edita**, tampoco common o marcas globales. UI-01/02 se implementan íntegramente con landing/SVG/diccionarios propios.
- El integrador original incorpora front-08/14 y aplica quitar Diseño/Design del navbar y cambiar metadata/common a garante/guarantor. Preserva fuentes, nav restante, wallet, ES/EN, devnet y montaje de reloj. No editar esos archivos antes de recoger los cambios originales.
- Para un defecto que requiere globals, UI entrega selector/causa y evidencia al integrador; no hace un refactor global ni altera componentes usados por app-cuentas.
- No package/lock concurrente. El integrador posee setup E2E después de recoger cambios originales; la nueva sesión no añade librería de motion ni dependencias.
- PrismStage es consumidor compartido con checkout: preservar sus props existentes. Opciones nuevas deben ser compatibles y opcionales. No migrar a Prism WebGL ni editar el checkout desde la rama UI.
- Cuotas, config, catálogo y fixtures internos quedan de sólo lectura para esta mejora. El nombre de fixture y tarjeta mock se ocultan en presentación de checkout por su owner/integrador; no se cambia seed ni tests internos.

## Frontier y blockers reales

1. **UI-01** puede empezar ya en lazo-ui, landing y diccionarios; no depende de WebGL ni reloj.
2. **UI-02** sigue a UI-01 en el mismo UI owner porque comparten landing CSS/PrismStage. Es secuenciación real de edición, no dependencia del producto. Sólo SVG; design WebGL fuera de scope y fuera de blockers.
3. **UI-03** pertenece al integrador A/B existente. Cierre necesita UI-01/02 y rutas tienda front-11 / confirmación front-13 (con desglose front-12). Copy de checkout/tienda puede anticiparse por sus owners originales. No lanzar workers equivalentes ni un segundo cierre.
4. Front-08/14 preceden ajustes del integrador en header/globals/layout y evidencia del overlay del reloj. No bloquean 01/02, y WebGL no es requisito para aprobar la UI SVG.
5. Programa/IDL, KYC/Mobbex y paneles de app-cuentas no bloquean ninguna mejora mock de este plan.

## Frontera de pruebas propuesta

Un recorrido real de navegador **landing → tienda → checkout → compra mock**, mismo recorrido ES/EN, desktop/móvil, normal/reduced-motion y teclado. Contexto limpio, mode mock y dirección pública de demo ya prevista; si el parámetro de demo se pierde entre rutas, checkout/tienda/integrador acuerdan la propagación sin modificar cuotas. Conservar unit existentes para cálculo, micros y redondeo; verificar motion SVG, fallback quieto, estados y contraste en pantalla. El integrador original posee runner y dictamen del recorrido; UI demuestra sus dos verticales localmente.

## Resumen para el supervisor

1. **Landing compacta y clara** — sin blockers; garante, anticipo + tres cuotas, simulación honesta y menor separación.
2. **Prisma SVG: fisura/refill suave** — después de 01 por ownership compartido; mismo nuevo UI owner, sin WebGL ni prop breaks.
3. **Compra mock coherente y verificada** — integrador A/B existente; después de 01/02, tienda/confirmación y gate de shared files.

Desglose y frontera se consultaron como refinamiento opcional del alcance ya autorizado. Incorporar correcciones si llegan; no nueva entrevista ni aprobación bloqueante. El supervisor despacha sólo el owner UI nuevo para 01/02; follow-ups originales e integración se coordinan con la autoridad existente.
