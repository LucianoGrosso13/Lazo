# Spec: front de Lazo (landing, diseño, tienda, checkout, cuotas.ts, deploy)

**Status:** ready-for-agent · Fecha: 2026-10-03 · Rama de integración: `front-esqueleto`

Fuentes: `proyecto/handoff-desarrollo-front.md`, `proyecto/03-mvp.md`, `proyecto/04-plan.md`, `proyecto/02-validacion.md`, `PRODUCT.md`, `.impeccable/surfaces/app-src-app-page-tsx.md` (contrato de dirección "Prisma").

**Fuera de esta spec (otra sesión, rama `app-cuentas`):** panel del estudiante (T1.7), comercio (T1.8), pool (T1.9), fiador (T2.3/T2.5) y admin. Esas pantallas consumen `cuotas.ts` y el sistema de diseño de esta spec.

## Problem Statement

Un estudiante argentino sin tarjeta que quiere una PC de US$1.000 en cuotas hoy le pide la tarjeta a un familiar o paga un CFTEA de 61-388% en Mercado Pago. Los jurados de la hackathon tienen que entender en segundos, desde un link público, que Lazo da 3 cuotas sin interés respaldadas por un fiador familiar, que el comercio cobra al instante y que todo es verificable en Solana (devnet). Y el equipo quiere ganar el premio a mejor diseño.

## Solution

Una landing interactiva con el prisma (el precio entra como haz de luz y sale partido en anticipo + 3 cuotas, al lado de la banda más larga de MP), un sistema de diseño de vidrio y espectro Solana que usan todas las pantallas, una tienda demo y un checkout que muestran el desglose para el escalón del estudiante y abren el plan con una confirmación clara (destino, monto, token, red). Todo contra `cuotas.ts`, con un mock completo (reglas de negocio reales y reloj de demo) que después se cambia por el cliente Codama. Deploy en Vercel con link público.

## User Stories

1. Como estudiante, quiero ver en la primera pantalla cuánto pago de anticipo y de cada cuota por un precio dado, para decidir rápido si me sirve.
2. Como estudiante, quiero mover el precio y ver cómo se reparte en el momento, para probar con lo que quiero comprar.
3. Como estudiante, quiero ver cuánto pagaría en Mercado Pago por lo mismo (referencia), para entender el ahorro.
4. Como estudiante, quiero ver cómo baja el anticipo y sube el tope en cada escalón, para saber qué gano pagando a tiempo.
5. Como estudiante, quiero entender en una frase qué hace mi fiador (solo paga si yo no pago), para animarme a pedírselo a mi mamá.
6. Como estudiante, quiero conectar Phantom en devnet con un botón, para comprar sin crear cuenta.
7. Como estudiante, quiero ver siempre que esto corre en devnet con plata de prueba, para no confundirme.
8. Como estudiante, quiero elegir un producto de la tienda (PC US$1.000, notebook US$650, curso US$120), para iniciar la compra.
9. Como estudiante, quiero ver en el checkout el desglose exacto para mi escalón (anticipo, 3 cuotas, total, 0% de interés), para saber qué firmo.
10. Como estudiante, quiero que el checkout me diga claramente por qué no puedo comprar (supera el tope, no tengo fiador, tengo un plan activo, estoy bloqueado), para saber qué hacer.
11. Como estudiante sin fiador, quiero un link para invitar a mi familiar, para destrabar la compra.
12. Como estudiante, antes de firmar quiero ver destino, monto, token y red, para confiar en la transacción.
13. Como estudiante, después de comprar quiero ver que el comercio cobró al instante y el comprobante, para ver la prueba onchain.
14. Como estudiante, quiero ir a mi panel después de comprar, para pagar las cuotas.
15. Como jurado, quiero cambiar la interfaz a inglés con un toggle, para entender todo.
16. Como jurado, quiero ver que lo simulado está declarado (devUSDC, reloj de demo, tienda demo), para evaluar con honestidad.
17. Como jurado, quiero adelantar días con el reloj de demo, para ver la mora completa en menos de 60 segundos.
18. Como jurado, quiero ver los tres beneficios (estudiante, comercio, pool) con números al lado de la alternativa, para entender el negocio.
19. Como comercio (visitante de la landing), quiero ver que cobro al instante y cuánto pago de comisión frente a Cuota Simple y MP.
20. Como inversor (visitante de la landing), quiero ver el rendimiento esperado del senior frente a Kamino y Jupiter y que todo es auditable.
21. Como usuario con movimiento reducido, quiero una versión quieta y legible del prisma.
22. Como usuario de celular, quiero que la landing, la tienda y el checkout funcionen bien a 390 px.
23. Como compañero de la otra sesión, quiero un sistema de diseño reutilizable (vidrio, marcas de estado, números, chips, botones), para que los paneles se vean del mismo mundo.
24. Como compañero de la otra sesión, quiero un mock de `cuotas.ts` que implemente todas las reglas, para construir paneles sin el programa.
25. Como equipo, quiero cambiar de mock a real con una variable de entorno, sin tocar pantallas.
26. Como equipo, quiero un link público en Vercel que se actualice con cada push.

## Implementation Decisions

- **Seam único: `cuotas.ts`.** La interfaz `CuotasClient` (tipos espejo de `ProtocolConfig`, `Reputation`, `Guarantee`, `Plan`, `Merchant`, `Pool`) ya está publicada en `front-esqueleto`. Cambios a la interfaz se anotan en el mensaje del commit (pedido del equipo).
- **Montos en micro-USDC enteros** (6 decimales). La última cuota absorbe el redondeo: 700 → 233,333333 / 233,333333 / 233,333334.
- **Reglas del mock** (fuente `02-validacion.md`): precio ≤ `maxPurchase` del escalón; precio ≤ `Guarantee.maxPurchase`; `guarantorCoverageBps × financiado ≤ coverageMax`; un plan activo por estudiante; bloqueado tras cobro al fiador; protocolo `Halted` no abre planes. Comercio recibe `precio − feeBps × financiado` (anticipo + adelanto del pool). Sube de escalón al saldar un plan que cuenta (financiado ≥ `minFinancedToCount` y ninguna cuota pasó la gracia), hasta 3. Mora: días 1-5 gracia (día 3 actividad `GuarantorNotified`), día 6 `MarkedLate` + punitorio `penaltyBps` sobre la cuota vencida + el plan deja de contar, día 15 se cobra al fiador la cuota vencida + punitorio: `GuarantorCharged` + `RecoveryRegistered` (evento de pool `Recovery` con `receiptHash`), cuota `ChargedToGuarantor`, baja un escalón, `lateCount + 1`, `blockedFromNewPlans`; el plan sigue sin contar. Si una segunda cuota del mismo plan llega al día 15, caducan los plazos, se cobra el saldo y el plan queda `Recovered`.
- **Sin fiador** el mock usa `unguaranteedTiers` (S0/S1) solo para cotizar; la UI no ofrece el tramo sin fiador (fuera del MVP), muestra "necesitás un fiador".
- **Reloj de demo:** el mock guarda un offset en días; `now = Date.now()/1000 + offset × secondsPerDay`. Las cuotas vencen cada 30 días desde la apertura. `advanceDays(n)` avanza y corre el keeper simulado.
- **Persistencia del mock:** localStorage (clave versionada), SSR-safe (en servidor, estado en memoria sin persistir). `resetDemo` siembra: comercio "Tienda Demo" (`DEMO_MERCHANT`), pool fondeado (junior del equipo, senior de wallets de prueba, montos de ejemplo), estudiante de ejemplo en escalón 3 con fiador (`DEMO_STUDENT_TIER3`). La wallet conectada arranca en escalón 0 **con** fiador de ejemplo ("Mamá · Visa •••• 4242", tope US$1.000) para que el guion corra sin la pantalla del fiador; la otra sesión lo reemplaza con su flujo.
- **Firmas en el mock:** firmas falsas con formato base58, marcadas como simuladas en la UI ("simulada en modo demo"); nunca se pide firma real a Phantom en modo mock.
- **Sistema de diseño Prisma:** tokens en CSS (`@theme` de Tailwind 4), componentes en `src/components/ui/`. Estados como marcas (grabado/encendido/rajado/rellenado) además del color. Números tabulares a escala de titular. Fuentes elegidas por el ticket de diseño siguiendo `impeccable` (no las de la lista prohibida sin razón).
- **`<Prism>`:** WebGL (sin dependencias pesadas si se puede; three.js/ogl permitido si hace falta) con fallback SVG estático; `prefers-reduced-motion` = quieto; responde a velocidad de puntero/scroll; recibe bandas como props (monto, etiqueta, tipo).
- **i18n:** un diccionario por pantalla en `src/i18n/dictionaries/` con `defineDict({es, en})`. ES por defecto.
- **Cifras de terceros** (MP ~1.290 por 1.000 en 3 cuotas, CFTEA 61-388%, Cuota Simple 5,41%, MP ~12,49%, GOcuotas 22 días hábiles, Kamino ~6%, Jupiter ~5%) viven en una constante `REFERENCE_FIGURES` y se muestran con la etiqueta "referencia".
- **Deploy:** Vercel `lazo-cuotas` (raíz `app/`, conectado a GitHub). Producción: https://lazo-cuotas.vercel.app.

## Testing Decisions

- Un buen test mira comportamiento externo por la interfaz `CuotasClient`, no detalles internos.
- **Vitest sobre el mock**: cotización por escalón y bloqueos; `openPlan` (PC 1.000 escalón 0 → comercio 951, cuotas 233,33 ×2 + 233,34, pool adelanta 651); pago de cuotas y subida de escalón; recorrido de mora con `advanceDays`; reglas de "cuenta para subir"; persistencia y `resetDemo`.
- UI: `npm run build`, `npm run lint`, `npm run typecheck` pasan; verificación visual en navegador a 1440 y 390 px.
- Al final: Playwright del recorrido landing → tienda → checkout → compra en modo mock.

## Out of Scope

Paneles por rol (estudiante, comercio, pool), fiador y admin (otra sesión); implementación real de `cuotas.ts` hasta que exista el IDL; Didit y Mobbex; tour guiado entre pantallas (depende de las pantallas de la otra sesión); mainnet.

## Further Notes

- El tour guiado de 5 pasos queda para cuando estén los paneles de `app-cuentas`.
- Finish de diseño con `impeccable` (reviewer + documenter → DESIGN.md) al cierre.
