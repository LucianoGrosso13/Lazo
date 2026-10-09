# 02: Cada rol ve lo suyo

**What to build:** el comprador ya no ve montos ni plazos de cobro del comercio. Se sacan las líneas "X cobra US$ … hoy, sin esperar" / "… hoy y US$ … a N días" del desglose del checkout, de la confirmación y de la pantalla de éxito (los hechos "merchantPaidLead" / "merchantLaterFact"). Se borran los textos que queden sin uso. Además se auditan las vistas de comprador, garante (`/fiador/[token]` y su cuenta), comercio, pool y admin buscando datos que no le corresponden a ese rol. Lo obvio (montos del comercio frente al comprador o al garante) se saca directo. Lo dudoso se lista en este ticket, en "Consultas", **sin tocarlo**, para que lo decida Luciano.

**Blocked by:** None (can start immediately). Ojo: 01 cambia palabras en `checkout.ts` en paralelo; tocá solo las claves de las líneas del comercio.

**Status:** ready-for-agent · **Asignado:** Devin

**Archivos propios:** `components/checkout/breakdown.tsx`, `confirm-success.tsx`, `confirm-panel.tsx`, `checkout-screen.tsx` (solo el paso de props del comercio), las claves del comercio en `i18n/dictionaries/checkout.ts` y un e2e nuevo `e2e/rol-visibilidad.spec.ts`. La auditoría de otras vistas es de solo lectura (consultas).

- [ ] Checkout, confirmación y éxito sin nombre del comercio + "cobra" ni montos del comercio (e2e nuevo que lo verifica en 3 y 6 cuotas, con plazo hoy y diferido)
- [ ] El panel del comercio sigue mostrando sus montos (e2e)
- [ ] Sección "Auditoría" en este archivo: qué se revisó, qué se sacó y "Consultas" con los casos dudosos
- [ ] `demo-recording.spec.ts` y `checkout-happy-path.spec.ts` en verde; capturas 390/1440 del checkout y del éxito en `evidence/02-*`
