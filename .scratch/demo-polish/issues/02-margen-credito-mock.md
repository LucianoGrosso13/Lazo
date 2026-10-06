# 02 — Margen de crédito por escalón en el mock (planes en paralelo)

**Status:** done · **Depende de:** 01 · **Tamaño:** M

## Objetivo

Reemplazar la regla "un plan activo por estudiante" del mock por una **línea de crédito tipo tarjeta**: el estudiante puede abrir varios planes en paralelo mientras `activeExposure + repayableNuevo ≤ maxPurchase` de su escalón. El `maxPurchase` del escalón hace doble función: tope por compra y línea de crédito total. **No** agregar campos a `ProtocolConfig` (espejo del programa on-chain).

Decisión del usuario: "límite total por escalón, como el margen de la tarjeta, simulado a una tarjeta de crédito".

## Cambios

- `app/src/lib/cuotas/types.ts`: agregar `"exceeds_credit_limit"` a `QuoteBlockReason`. **Mantener** `"has_active_plan"` en la unión (el cliente real la sigue emitiendo: el programa on-chain fuerza un plan por estudiante vía PDA).
- `app/src/lib/cuotas/mock.ts` (`computeQuote`): sacar el push de `has_active_plan`; agregar, después del check de `maxPurchase`, el chequeo de margen: si `rep.activeExposure + repayable > tierParams.maxPurchase` → `reasons.push("exceeds_credit_limit")`. Ojo: `repayable = financed + interest` (coherente con `active_exposure` on-chain, que suma repayable). El orden de `reasons` importa: el primero es el que muestra la UI — `exceeds_credit_limit` va antes que los checks de fiador, después de `protocol_halted`/`blocked_after_default`.
- `activeExposure` ya se mantiene: `openPlan` suma `quote.financed` — **cambiarlo a `repayable` (`financed + interest`)** para que matchee el check; `payInstallment` ya resta por cuota paga (ajustar para que reste la parte de repayable de la cuota: `inst.amount + share de interés` — en la práctica interest=0 en todos los tiers, así que restar `inst.amount + inst.penalty` está mal; restar `inst.amount` alcanza hoy, pero que sea consistente: definir `inst.repayable = amount` y restar eso). Decisión simple y documentada: `activeExposure` en el mock = suma de cuotas impagas (amounts) ≈ repayable mientras interest=0. Dejar comentario.
- Diccionarios (copys nuevas, tono tarjeta de crédito):
  - `app/src/i18n/dictionaries/tienda.ts` → `reasons.exceeds_credit_limit`: es `"Te quedaste sin margen (US$ {used} de US$ {limit} en uso)"` — formato a definir, recibe montos; en: `"You're out of credit margin (US$ {used} of US$ {limit} used)"`.
  - `app/src/i18n/dictionaries/checkout.ts` → `blocked.exceeds_credit_limit` con `t`/`d`/`cta` (cta: `{ label: "Ver mis planes", href: "/panel" }`). es: t `"No te alcanza el margen"`, d: `"Estás usando US$ {used} de tu margen de US$ {limit}. Pagando cuotas liberás margen, como una tarjeta."` Necesita los montos → la firma del dict puede recibir `(used, limit)`.
- `app/src/lib/cuotas/real.ts`: sin cambios de regla (on-chain sigue un-plan). Solo verificar que el mapeo de reasons compile con el nuevo miembro de la unión.

## Tests (`app/src/lib/cuotas/`)

Reescribir en `mock.open-plan.test.ts`:
- [x] El test "una compra abierta bloquea la siguiente" (~l.91-97) → ahora: compra PC 1.000 (financiado 700) + curso 120 (financiado ~84) **sí se puede** (784 ≤ 1.000); y una notebook 650 (financiado 455) se bloquea con `exceeds_credit_limit` (1.239 > 1.000).
- [x] Nuevo: pagar cuotas libera margen (exposure baja → la compra que fallaba pasa).
- [x] Nuevo: el quote con margen insuficiente incluye `exceeds_credit_limit` en `reasons`.
- [x] `quote` sigue marcando `exceeds_tier_max` por compra individual sobre el tope.
- [x] El resto de la suite del mock en verde (mora, settle, escalera no cambian). Única aserción ajustada: `mock.test.ts` "sin fiador" suma `exceeds_credit_limit` porque el financiado (250) supera la línea del tramo sin fiador (150).

## Criterios

- [x] Dos planes activos en paralelo dentro del margen; bloqueo por margen excedido con motivo nuevo.
- [x] `npm run typecheck && npm run lint && npm test && npm run build` en verde.
- [x] Comentario en `mock.ts` documentando la divergencia con el programa (ver spec §"Divergencia conocida").
