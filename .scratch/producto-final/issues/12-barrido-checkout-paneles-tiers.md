# 12: Barrido — checkout, tienda, marketplace y paneles con tiers, mínimo de 6 cuotas, fiador obligatorio y cobertura con interés

**What to build:** todas las pantallas que no son landing ni páginas de audiencia quedan coherentes con las decisiones:
- "Tier N · Nombre" en todos lados;
- la opción de 6 cuotas bloqueada con motivo bajo US$ 350;
- sin fiador, el checkout explica que hace falta uno y lleva a invitarlo;
- la cobertura del fiador dice "lo que falta pagar (capital + interés)";
- ningún chip "provisional".

**Blocked by:** 01

**Status:** ready

**Archivos propios:** `app/src/components/checkout/{plan-selector.tsx,breakdown.tsx,confirm-panel.tsx,confirm-success.tsx,format.ts}`, `app/src/i18n/dictionaries/{checkout.ts,tienda.ts,marketplace.ts,account.ts,cuentas.ts,fiador-cuenta.ts,invitacion-cuenta.ts,admin-cuenta.ts,pool-cuenta.ts,design.ts}`, `app/src/components/store/*`, `app/src/components/marketplace/*`, `app/src/components/cuenta/{estudiante.tsx,mock-account.tsx,admin.tsx,invitar-fiador.tsx,account-shell.tsx}`, `app/src/components/cuenta/fiador/*`, `app/src/app/design/*`. **No** toques `checkout-screen.tsx` (es del 09) ni `cuenta/comercio.tsx` (es del 08).

Notas:
- Motivos nuevos de 01: `guarantor_required` → "Para abrir un plan necesitás un fiador. Invitalo en 2 minutos" + CTA; `below_option_min` → "6 cuotas desde US$ 350"; `pool_liquidity` → "En este momento no hay cupo para planes nuevos. Probá más tarde".
- `fiador/documento.ts`: la cobertura es "100% de lo que falta pagar del plan, capital + interés; el punitorio por mora queda afuera". Saca los "PENDIENTE DE DEFINICIÓN" de cobertura (el del máximo total también: = tope elegido por el fiador).
- Admin: la tabla de escalones pasa a "Tiers" y saca la fila de tiers sin fiador.
- Marketplace: una única nota "comercios de ejemplo" en el directorio; fuera los chips "demo" de cada tarjeta.

- [ ] `rg -i "escal[oó]n|provisional|ilustrativ" app/src --glob '!**/generated/**'` sin resultados en la UI de estos archivos (es y en)
- [ ] Mínimo de 6 cuotas, fiador obligatorio y sin cupo con mensajes claros
- [ ] Documento de fianza con la cobertura decidida
- [ ] 390/1440 de checkout, tienda, marketplace, paneles estudiante/fiador/admin; capturas `evidence/12-*`
- [ ] typecheck / lint / test / build en verde
