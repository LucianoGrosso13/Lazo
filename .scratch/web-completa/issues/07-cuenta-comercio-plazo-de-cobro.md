# 07: Cuenta del comercio — elegir cuándo cobrar, cobros pendientes y responsive

**What to build:** en `/app/comercio` (y la vista pública de comercio) el comercio ve una tabla de plazos de cobro (hoy, 30, 60, 90 días) con comisión sobre lo financiado, neto de una venta de ejemplo y fecha de cobro; elige su plazo predeterminado; ve ventas cobradas y pendientes con su fecha. Todo con etiqueta "provisional" donde corresponda. En móvil se ve bien.

**Blocked by:** 01

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/cuenta/comercio.tsx`, `app/src/i18n/dictionaries/comercio-cuenta.ts`, `app/src/app/(cuenta)/app/comercio/page.tsx`. No eliminar exports existentes de `comercio.tsx` (el ticket 06 puede importarlos).

Notas:
- Opciones desde `settlementOptionsOf(config)`; elegir con `setMerchantSettlement` (en modo real el error `option_unavailable` se muestra como "disponible próximamente", sin romper). Ejemplo con la venta de referencia (precio 1.000, escalón 0) calculado con `quote()` para cada plazo: 951 / 956,25 / 961,50 / 963,25.
- Explicar en una línea que el anticipo llega en el momento y el resto en la fecha elegida, y que Lazo garantiza esa fecha aunque el comprador se atrase (supuesto de la demo).
- Ventas: columna de plazo y estado cobrada/pendiente con fecha; saldo pendiente de `getMerchant`.
- Bug del audit: aparece "7.0%% on the financed amount" (doble `%`) — corregir.
- Audit 390 px en `/comercio/<dirección>`: la dirección deja 2 caracteres huérfanos al cortar y los botones de embed se acomodan mal. Corregir en la vista pública/cuenta.
- La comparación "Frente a otras formas de vender en cuotas" sigue con `REFERENCE_FIGURES` y etiqueta "referencia", sin marcas.

- [ ] Tabla de plazos con comisión, neto y fecha; predeterminado elegible y persistido (mock)
- [ ] Ventas con plazo y estado; saldo pendiente visible; tras adelantar el reloj, la venta pasa a cobrada
- [ ] Sin "%%"; dirección y botones bien en 390 px
- [ ] Sin scroll horizontal a 390 px; tap targets ≥ 40×40
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/07-*`
- [ ] typecheck / lint / test / build en verde
