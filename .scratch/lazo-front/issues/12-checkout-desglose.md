# 12: Checkout — desglose y comparación /checkout/[producto]

**What to build:** el checkout muestra, para el producto y el escalón de la wallet conectada, el desglose (anticipo, 3 cuotas con fechas, total, 0% de interés), la comparación con MP (referencia), el fiador vinculado y, si no puede comprar, el motivo claro y qué hacer.

**Blocked by:** 03, 07

**Status:** ready-for-agent

**Archivos tuyos:** `app/src/app/checkout/**`, `app/src/components/checkout/**` (salvo `confirm-*`), `app/src/i18n/dictionaries/checkout.ts`. Usá `app/src/lib/catalog.ts` (ya existe; no lo modifiques).

- [ ] Sin wallet: pide conectar Phantom (explica en una línea qué es una wallet) y muestra el desglose del escalón 0
- [ ] Con wallet: desglose de `quote(precio, wallet)`; fechas de vencimiento con el reloj de demo; "Fiador: Mamá · Visa •••• 4242 · tope US$1.000" desde `getGuarantee`
- [ ] Comparación: total Lazo vs total MP (referencia) con la diferencia a escala de titular; si existe `<Prism size="compact">`, usarlo para el desglose
- [ ] Lo que recibe el comercio al instante (`merchantReceives`) visible como dato secundario
- [ ] Motivos de bloqueo traducidos a acción: sin fiador → "Invitá a tu fiador" (link a `/fiador/nuevo`, pantalla de la otra sesión), supera el tope → muestra el tope y el próximo escalón, plan activo → link a `/panel`, bloqueado → explica la mora
- [ ] Botón "Pagar anticipo y abrir plan" que abre la confirmación (ticket 13); hasta entonces, deshabilitado con el texto final
- [ ] 1440 y 390 px; ES/EN
- [ ] typecheck, lint, test y build pasan
