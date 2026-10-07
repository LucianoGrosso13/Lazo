# 05: Checkout con 3 o 6 cuotas, comercio del producto y responsive

**What to build:** en `/checkout/[producto]` el comprador elige 3 o 6 cuotas; el desglose (anticipo, cuotas, interés, total, fechas, lo que recibe el comercio y cuándo) se recalcula con `quote()`; 6 cuotas lleva la etiqueta "provisional"; la compra se abre con el comercio dueño del producto y su plazo de cobro predeterminado. Funciona con cualquier producto del directorio, no solo Voltia. En móvil se ve bien.

**Blocked by:** 01, 02

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/checkout/*`, `app/src/app/checkout/*`, `app/src/i18n/dictionaries/checkout.ts`, `app/src/components/landing/prism-stage.tsx`, `prism-stage-3d.tsx`, `prism-3d-renderer.ts` (compartidos con el hero: mantener su API y que el hero siga igual). Solo lectura: `landing/split.ts`, `landing/hero.tsx`, `landing/use-config.ts`, `landing/reference.ts`.

Notas:
- Opciones desde `planOptionsOf(config)`; si la config no trae opciones (modo real), se ve solo 3 cuotas como hoy. Selector accesible (radiogroup), con el interés total visible en la opción de 6.
- Usar `quote(price, student, { installments, settlement: merchant.settlementId ?? "immediate" })`; no recalcular a mano. Ojo: `quote` sin `settlement` cotiza inmediato, pero `openPlan` sin `settlement` usa el predeterminado del comercio — pasá el mismo plazo a los dos para que lo cotizado sea lo que se abre. `Quote` ya trae `installmentsCount`, `interestTotalBps`, `settlementDays`, `merchantAdvance`, `merchantPending` y `provisional`; `Plan.terms` guarda la copia. El comercio sale de `getProduct(...)`; reemplazar `DEMO_MERCHANT` fijo. Mostrar el plazo de cobro del comercio ("Voltia cobra hoy" / "a 30 días") como dato, sin dejar que el comprador lo cambie.
- El prisma muestra tantas bandas como cuotas. Audit 390 px: las etiquetas de bandas del prisma ("DOWN PAYMENT US$300.00", "INSTALLMENT 1/2/3") quedan cortadas a la derecha (≈457–468 px): resolver en móvil.
- Comparación con la competencia: sigue con `REFERENCE` y etiqueta "referencia", sin marcas.

- [ ] Selector 3/6 que recalcula todo con `quote()`; 6 cuotas muestra interés, total y "provisional"
- [ ] Opción no elegible bloqueada con motivo (incluido `option_unavailable`)
- [ ] La compra se abre con el comercio del producto y queda en su cuenta; `/checkout/pc` sigue funcionando para Voltia
- [ ] Éxito de compra muestra cuotas, interés y el plazo de cobro del comercio
- [ ] Sin scroll horizontal y etiquetas del prisma legibles a 390 px; hero intacto
- [ ] Capturas 390/1440 (3 y 6 cuotas) en `.scratch/web-completa/evidence/05-*`
- [ ] typecheck / lint / test / build en verde
