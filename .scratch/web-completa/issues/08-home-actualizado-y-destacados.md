# 08: Home con las decisiones vigentes, audiencias, comercios destacados y "Qué viene"

**What to build:** el home cuenta el producto actual y lleva a cada actor a su página. Leé `.scratch/web-completa/spec.md` § "Home", `proyecto/06-decisiones-comerciales.md` (addendum), `proyecto/09-alcance-opcion-h-y-mejoras.md` y `proyecto/07-go-to-market-y-alianzas.md` (solo para "Qué viene", sin nombrar billeteras).

**Blocked by:** 01, 02

**Status:** ready-for-agent

**Archivos propios:** `app/src/app/page.tsx`, `app/src/components/landing/hero.tsx`, `sections.tsx`, `landing.module.css`, `atmosphere.tsx`, `motion-policy.tsx`, `gpu-fog.tsx`, `split.ts`, `use-config.ts`, `reference.ts`, diccionarios `landing-hero.ts`, `landing-sections.ts`, y la `metadata` de `app/src/app/layout.tsx` (solo `title`/`description`; el resto del layout es del 03). **No cambiar firmas** de `split.ts`, `use-config.ts`, `reference.ts` ni el export `SPECTRUM`/`MotionLink`/`ChangingNumber` de `hero.tsx` (los usan checkout y tienda). `prism-stage*` es del 05.

Notas:
- Hero: "3 cuotas sin interés · 6 con interés bajo" en lugar de "Sin interés." a secas (ES y EN); la bajada menciona el fiador al 100% y que el comercio elige cuándo cobrar.
- Orden propuesto: Hero → Para quién es (3 tarjetas a `/para-estudiantes`, `/para-comercios`, `/para-inversores`) → Elegí en cuántas cuotas (3/6 desde la config, ejemplo con `quote()`, 6 con "provisional") → Escalera (la cobertura ya sale 100% de la config) → Fiador → Comercios adheridos · demo (destacados del directorio con link a `/comercio`) → Números ilustrativos (fila cliente: 0% en 3 cuotas) → Qué viene (venta en mostrador por link/QR, billeteras argentinas como canal —sin acuerdos firmados—, descuentos para el fiador al día, tesorería propia simulada) → Estado de la demo (actualizado) → Cierre.
- La escalera tiene que decir que subir de escalón baja anticipo y sube tope, **no** baja la cobertura del fiador.
- Tarjetas de comercio destacado con fallback de imagen si falta la foto. Etiqueta "demo".

- [ ] Hero y metadata sin "sin interés" absoluto; 3/6 explicado con números de la config
- [ ] Sección de audiencias, destacados, "Qué viene" y estado de la demo actualizados en ES y EN
- [ ] Cobertura 100% visible en la escalera, sin prometer que baja
- [ ] Checkout y tienda siguen compilando y viéndose igual (APIs compartidas intactas)
- [ ] Sin scroll horizontal a 390 px; animaciones con versión reduced-motion
- [ ] Capturas 390/1440 (home completo) en `.scratch/web-completa/evidence/08-*`
- [ ] typecheck / lint / test / build en verde
