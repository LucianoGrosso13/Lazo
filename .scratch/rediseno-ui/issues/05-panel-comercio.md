# 05: Panel del comercio — cobrado, garantizado, mostrador e historial

**What to build:** en la cuenta del comercio, con acento cyan, el orden pasa a ser: (1) **Cobrado** en grande (BigNumber) y, al lado, **Garantizado por cobrar**: el total más una mini línea de tiempo con fecha y monto de cada tramo pendiente, armada con los `payoutTranches` / `pendingSettlement` de las ventas (si no hay pendientes, un estado vacío amable; si en modo real no está disponible, no se muestra). (2) **Venta en mostrador**, la tarjeta destacada que ya existe, movida acá. (3) **Ventas en cuotas** como CollapsibleHistory (las últimas 3 y "Ver todas (N)"). El resto del panel (plazos de cobro, actividad, alternativas, checkout embebido) no se toca, salvo el orden.

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Devin

**Archivos propios:** `components/cuenta/comercio.tsx`, `i18n/dictionaries/comercio-cuenta.ts`.

- [x] Orden: Cobrado + Garantizado → Mostrador → Ventas plegables → resto
- [x] Garantizado por cobrar con fechas y montos que cuadran con el calendario del mock; después de adelantar el reloj, el tramo pasa a cobrado (e2e)
- [x] Historial de ventas: 3 visibles y se expande (e2e)
- [x] `comercio-pool.spec.ts` y `counter-order.spec.ts` en verde; capturas 390/1440 en `evidence/05-*`
