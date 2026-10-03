# 13: Checkout — confirmación de la transacción y apertura del plan

**What to build:** al confirmar, un panel muestra exactamente qué se firma (destino, monto del anticipo, token devUSDC, red devnet, que el comercio recibe X al instante), llama a `openPlan` y muestra el éxito con el comprobante y el paso siguiente.

**Blocked by:** 04, 12

**Status:** done

**Archivos tuyos:** `app/src/components/checkout/confirm-*.tsx`, el cableado del botón en la página del checkout, `app/src/i18n/dictionaries/checkout.ts` (solo agregar claves bajo `confirm`).

- [x] Panel de confirmación con destino (comercio, dirección corta), anticipo, token, red, cuotas y lo que recibe el comercio; en modo mock dice "firma simulada en modo demo" y no pide firma a Phantom
- [x] Estados: confirmando (botón deshabilitado), error con mensaje accionable (motivos de `CuotasError`), éxito
- [x] Éxito: "El comercio cobró US$951 al instante" (monto real del plan), firma con `ExplorerLink` (marcada simulada en mock), animación de la luz entrando al comercio, CTA "Ir a mi plan" → `/panel`
- [x] Después de abrir el plan, volver al checkout muestra "ya tenés un plan activo"
- [x] 1440 y 390 px; ES/EN
- [x] typecheck, lint, test y build pasan
