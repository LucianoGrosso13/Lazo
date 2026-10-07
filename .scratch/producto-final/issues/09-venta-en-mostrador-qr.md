# 09: Venta en mostrador — orden con QR y link, y checkout desde la orden

**What to build:** el comercio vende en el local con Lazo.
- **Panel del cajero** (`/app/comercio/mostrador`): carga monto y descripción → "Generar orden" → QR grande + link copiable + estado en vivo ("Esperando al cliente" → "Pagada" con el plan) + historial de órdenes del día.
- **Página de la orden** (`/orden/[id]`): el cliente que escanea ve comercio, descripción y monto, y confirma con el checkout de siempre (3 o 6 cuotas, su fianza vigente). Al confirmar, la orden queda pagada y la venta aparece en el panel del comercio.
- **Ejemplo del flujo** visible en el panel: 3 pasos ilustrados (cargar → mostrar QR → el cliente confirma en su celular).

**Blocked by:** 01

**Status:** done

**Archivos propios:** nuevos `app/src/app/(cuenta)/app/comercio/mostrador/page.tsx`, `app/src/app/orden/[id]/page.tsx`, `app/src/components/mostrador/*`, `app/src/i18n/dictionaries/mostrador.ts`; `app/src/components/checkout/checkout-screen.tsx` (refactor para aceptar un ítem genérico `{ name, price, merchant, orderId? }` además del producto del catálogo, sin cambiar el comportamiento actual); `app/package.json` + lockfile (dependencia `qrcode` y sus tipos).

Notas:
- API de 01: `createCounterOrder`, `getCounterOrder`, `listCounterOrders`, `openPlan({ orderId })`. Orden vencida o pagada → mensaje claro (`order_unavailable`).
- QR en SVG del lado del cliente con la URL absoluta de `/orden/[id]`. Texto: "Es un link de Lazo: el cliente lo abre con la cámara. No es un QR de pagos de otras billeteras".
- Para la demo en una sola pantalla: botón "Abrir como cliente" que abre la orden en otra pestaña.
- Estado en vivo vía `subscribe` del cliente (sin polling agresivo).
- En modo real los métodos devuelven `option_unavailable`: mostrar "Disponible en el simulador" sin romper.
- Los strings del checkout siguen en `checkout.ts` (del 12): si necesitás uno nuevo para el modo orden, ponelo en `mostrador.ts`.

- [x] Panel del cajero: crear orden, QR, link, estado en vivo e historial
- [x] `/orden/[id]` → checkout → plan abierto; la orden pasa a pagada y aparece en el comercio
- [x] Orden vencida o reusada bien manejada
- [x] El checkout de productos sigue igual (typecheck y suite de tests en verde)
- [x] 390/1440; capturas `evidence/09-*` (incluido el flujo celular)
- [x] typecheck / lint / test / build en verde
