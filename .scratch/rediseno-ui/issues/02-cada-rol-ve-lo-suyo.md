# 02: Cada rol ve lo suyo

**What to build:** el comprador ya no ve montos ni plazos de cobro del comercio. Se sacan las líneas "X cobra US$ … hoy, sin esperar" / "… hoy y US$ … a N días" del desglose del checkout, de la confirmación y de la pantalla de éxito (los hechos "merchantPaidLead" / "merchantLaterFact"). Se borran los textos que queden sin uso. Además se auditan las vistas de comprador, garante (`/fiador/[token]` y su cuenta), comercio, pool y admin buscando datos que no le corresponden a ese rol. Lo obvio (montos del comercio frente al comprador o al garante) se saca directo. Lo dudoso se lista en este ticket, en "Consultas", **sin tocarlo**, para que lo decida Luciano.

**Blocked by:** None (can start immediately). Ojo: 01 cambia palabras en `checkout.ts` en paralelo; tocá solo las claves de las líneas del comercio.

**Status:** done · **Asignado:** Devin

**Archivos propios:** `components/checkout/breakdown.tsx`, `confirm-success.tsx`, `confirm-panel.tsx`, `checkout-screen.tsx` (solo el paso de props del comercio), las claves del comercio en `i18n/dictionaries/checkout.ts` y un e2e nuevo `e2e/rol-visibilidad.spec.ts`. La auditoría de otras vistas es de solo lectura (consultas).

- [x] Checkout, confirmación y éxito sin nombre del comercio + "cobra" ni montos del comercio (e2e nuevo que lo verifica en 3 y 6 cuotas, con plazo hoy y diferido)
- [x] El panel del comercio sigue mostrando sus montos (e2e)
- [x] Sección "Auditoría" en este archivo: qué se revisó, qué se sacó y "Consultas" con los casos dudosos
- [x] `demo-recording.spec.ts` y `checkout-happy-path.spec.ts` en verde; capturas 390/1440 del checkout y del éxito en `evidence/02-*`

## Auditoría

**Qué se sacó (archivos propios):**

- `breakdown.tsx`: línea "X cobra US$ … hoy, sin esperar / y US$ … a N días" (`merchantToday`/`merchantDeferred`). `BreakdownData` ya no recibe `merchantReceives`, `merchantAdvance`, `merchantPending` ni `settlementDays`, y `checkout-screen.tsx` deja de poblarlos y de pasar `merchantName` al desglose.
- `confirm-panel.tsx`: fila "El comercio recibe" / "Merchant receives" (montos + fecha del cobro diferido). El comprador sigue viendo destino, lo que paga hoy, token, red, cuotas con fechas, interés, garante y saldo.
- `confirm-success.tsx`: lead "X cobró US$ … al instante / el anticipo hoy" y hecho "cobra el resto (US$ …) a N días". El lead ahora muestra el anticipo del comprador ("Pagaste US$ … de anticipo"); el SVG conserva el nombre del comercio como destino, sin montos; `beamAria` ya no declara cuánto cobra. Claves borradas del diccionario: `merchantToday`, `merchantDeferred`, `confirm.rows.merchant`, `confirm.instantly`, `confirm.merchantLater`, `merchantPaidLead`, `merchantPaidTail`, `merchantLaterFact`; `beamAria` quedó sin argumento.
- `/orden/[id]` (checkout de mostrador del comprador) usa `CheckoutScreen`: queda cubierto por el mismo cambio.

**Qué se revisó y está bien:**

- `/app/estudiante` (cuenta del comprador): planes, anticipo, financiado, interés, cuotas y garante propios — nada del comercio.
- `/fiador/[token]` alta (`alta.tsx`, `real.tsx`): solo parámetros de la fianza (tope, cobertura, tarjeta) — sin datos del comercio.
- `/app/comercio` y `/app/comercio/mostrador`: cobrado, pendiente, tramos, comisión y plazos — todo propio del comercio (verificado por e2e).
- `/pool`: movimientos del pool (depósitos, adelantos, repagos, recuperos, pérdidas) con montos — dato público del protocolo, es la evidencia onchain que la página promete.
- `/app/admin`: la autoridad ve todo por diseño (estados, pool, keeper, comercios).
- `/panel` redirige a `/app/estudiante`.

**Consultas (no tocado — decide Luciano):**

1. **`/account` (`mock-account.tsx`)**: el detalle "Comercio" del tablero muestra `merchant.settlementBalance` ("Saldo a cobrar") y `merchant.sales[].received` ("cobrados") — montos de cobro del comercio frente al comprador. Pinta a fuga obvia, pero el tablero se presenta como vista agregada del recorrido de prueba ("muestra sus planes, su fiador, el comercio y el pool"), quizá a propósito como evidencia. No es archivo de este ticket.
2. **Panel del garante (`fiador/panel.tsx`)**: lista los eventos del pool ligados a los planes de su estudiante, incluido `Advance` con monto — equivale al adelanto que Lazo le paga al comercio por esa compra. Dudoso: es transparencia del protocolo (los eventos son onchain) vs. cobro del comercio frente al garante.
3. **`/comercio/[direccion]` (vista pública, `merchant-store.tsx`)**: chip "Cobra al instante" / "Cobra a N días de la compra" — el plazo de cobro del comercio visible para cualquiera, incluido el comprador que está por comprar. Dudoso: es vidriera pública (el plazo no cambia lo que paga el comprador) vs. la regla "el comprador no ve plazos de cobro".
