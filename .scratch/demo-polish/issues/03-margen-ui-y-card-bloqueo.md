# 03 — UI del margen + card de "no podés comprar" rediseñada

**Status:** ready-for-agent · **Depende de:** 02 · **Tamaño:** M

## Objetivo

Dos cosas:

1. **El margen se ve.** Con wallet conectada, la tienda muestra el margen tipo tarjeta: "Margen: US$ X disponibles de US$ Y" (chip o línea discreta junto al chip de escalón en `/tienda`). Datos: `getReputation(wallet).activeExposure` + `getConfig().guaranteedTiers[tier].maxPurchase`. En el checkout, cuando el bloqueo es `exceeds_credit_limit`, la card muestra una **barra de margen** (usado vs límite, estilo medidor) con los montos reales.
2. **La card de bloqueo es linda.** Hoy `BlockedReasons`/`Reason` en `breakdown.tsx` es texto plano con un `StateMark`. Rediseñarla: panel `glass-deep`, jerarquía clara (marca de estado + título + qué hacer), CTA visible. Es la pantalla que el usuario mostró como fea: "Todavía no podés comprar esto / Ya tenés un plan activo…".

## Archivos propios

- `app/src/components/checkout/breakdown.tsx` — rediseño de `BlockedReasons`/`Reason`; meter el medidor de margen cuando `reason === "exceeds_credit_limit"` (necesita `activeExposure` + límite: ya recibe `config`; `activeExposure` hay que pasarlo — ver checkout-screen abajo).
- `app/src/components/checkout/checkout-screen.tsx` — `mine.reputation` ya se trae: pasar `activeExposure` a `Breakdown` (prop nueva, ej. `exposure?: Micro`).
- `app/src/components/checkout/checkout.module.css` — estilos de la card nueva y del medidor.
- `app/src/components/store/tienda-page.tsx` — línea/chip de margen junto a `styles.tierChip` (solo cuando hay wallet y reputación; `walletQ` ya trae quotes — extender la query con `c.getReputation(student)` si no lo trae).
- `app/src/components/store/store.module.css` — estilos del chip de margen.
- `app/src/components/store/product-card.tsx` — el `badge` de bloqueo queda igual; si `badge` es por margen el texto nuevo viene del dict (nada que hacer acá salvo que el diseño lo pida).
- `app/src/i18n/dictionaries/tienda.ts` — `marginLine(available, limit)` es/en.
- `app/src/i18n/dictionaries/checkout.ts` — copys del medidor (`marginUsed(used, limit)`, `marginFrees` tipo "pagando cuotas liberás margen").

## Dirección de diseño

- Craft-floor de `impeccable`: la card de bloqueo no es un error feo, es un estado con camino de salida. Acento espectral sutil (borde o glow en la banda del motivo), `StateMark` conservado, CTA `Button secondary`.
- Medidor de margen: barra fina con segmento usado en color de banda + resto en vidrio; número tabular "US$ {used} / US$ {limit}".
- Micro-animación piola permitida: la barra del medidor llena con tween al montar (respetar reduced-motion).
- Compactar: la card no debe ser alta; paddings ajustados (va con la tanda de márgenes del ticket 05, no pelear: acá solo la card).

## Criterios

- [ ] Con un plan activo que consume margen, la tienda muestra "Margen: US$ X de US$ Y" y baja al pagar cuotas.
- [ ] `exceeds_credit_limit` en checkout muestra el medidor + copy + CTA a `/panel`.
- [ ] Las demás razones de bloqueo se ven con el nuevo diseño (sin regresión de contenido).
- [ ] reduced-motion sin animaciones; 390 px sin overflow.
- [ ] typecheck/lint/test/build en verde.
