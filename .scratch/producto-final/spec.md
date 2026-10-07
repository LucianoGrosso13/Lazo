# Spec: producto final — 6 cuotas en la cadena, cobro en tramos, venta en mostrador, tiers y copy profesional

**Status:** ready-for-agent · Fecha: 2026-10-07 · Rama de integración: `t-producto-final` (sale de `t-web-marketplace-responsive` @ `089e0ff`)

Fuentes: sesión de grilling con Luciano del 2026-10-07 (ver "Decisiones"), `AGENTS.md`, `PRODUCT.md`, `proyecto/06-decisiones-comerciales.md`, `proyecto/08-minorista-y-economia.md`, `proyecto/09-alcance-opcion-h-y-mejoras.md`, `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`, `programa/UPGRADE_DEVNET.md`. Formato heredado de `.scratch/web-completa/spec.md`.

Entrega objetivo: **domingo 11/10** (límite 13/10 03:59 ART, a confirmar).

## Problem Statement

La web cuenta un producto "a medio decidir": 6 cuotas y los plazos de cobro aparecen como "provisional" en cada pantalla, casi todo dice "demo" o "ilustrativo", y la hoja de ruta promete cosas que deberían estar en el MVP. El cobro diferido del comercio paga **todo** al final del plazo (a 90 días, el comercio espera tres meses por una venta de hoy), algo que ningún comercio aceptaría. Los "escalones" no tienen reglas visibles para subir o bajar, el reloj de demo no explica qué significa cada día, no hay "Quiénes somos" y se puede comprar sin fiador (con 50% de anticipo, alguien se lleva la PC y no paga el resto). En la cadena, el programa solo sabe hacer 3 cuotas.

## Solution

1. **6 cuotas decididas:** 3% de interés total, desde US$ 350, en el mock **y en el programa**. El fiador cubre todo lo que falta pagar (capital + interés).
2. **Cobro en tramos garantizado:** a 30/60/90 días el comercio cobra en tramos mensuales iguales hasta el plazo elegido, con un compromiso registrado en la cadena el día de la compra.
3. **Sin fiador no hay plan.**
4. **Venta en mostrador por link/QR** funcionando en el mock.
5. **Tiers** (Tier 1–4 · Starter, Steady, Trusted, Full) con reglas visibles.
6. **Copy profesional:** un solo aviso de devnet, nada de "provisional" suelto, "Qué corre en la cadena y qué en el simulador", supuestos explícitos, Quiénes somos, Probalo en 2 minutos y una comparación de costo total.
7. **Plan de negocio y pitch** actualizados con todo esto.

## Decisiones (Luciano, 2026-10-07 — no se renegocian sin preguntarle)

1. **6 cuotas = 3% total sobre lo financiado** (análisis 2,5% vs 3% en `proyecto/10-…`; 3% deja el equilibrio de un cliente nuevo en ~US$ 217 contra ~US$ 267). **Mínimo de precio para 6 cuotas: US$ 350** (configurable). 3 cuotas sin interés y sin mínimo.
2. **Cobro del comercio en tramos** (Luciano: "que se vaya liberando a medida que se van pagando las cuotas"). El anticipo se cobra siempre en el momento. Lo financiado neto (`A − F`) se paga:

   | Opción | Comisión s/ financiado | Tramos |
   |---|---:|---|
   | Hoy | 7% | todo al abrir |
   | 30 días | 6,25% | 100% el día 30 |
   | 60 días | **5,75%** | 50% día 30 · 50% día 60 |
   | 90 días | 5,25% | ⅓ día 30 · ⅓ día 60 · ⅓ día 90 (el último tramo absorbe el redondeo) |

   Comisiones neutras recalculadas con tramos: 6,10 / 5,65 / 5,23 (3 cuotas). **Lazo garantiza cada tramo en su fecha**, pague o no el estudiante.
3. **Modelo "compromiso en la cadena" (opción B del grilling):** al abrir el plan se crea una cuenta pública con el calendario de tramos a favor del comercio. La plata **queda en el pool** (sigue financiando) y en cada fecha se libera: la libera el keeper o la reclama el comercio. Para que el compromiso sea creíble, **no se abren planes nuevos si el pool no tiene liquidez libre** para el desembolso más los tramos comprometidos.
4. **El fiador cubre el 100% de lo que falta pagar del plan: capital + interés.** El punitorio por mora queda afuera.
5. **Sin fiador activo no se abre un plan** (se eliminan los tiers sin fiador en config, mock, programa y copy).
6. **"Tier" siempre, también en español** (nunca "escalón" ni "nivel" en la UI). En pantalla: **Tier 1 · Starter, Tier 2 · Steady, Tier 3 · Trusted, Tier 4 · Full** (índice interno 0–3).
7. **Venta en mostrador por link/QR en el MVP**, con un ejemplo del flujo. Es un link de Lazo dentro de un QR, no un QR de pagos interoperable.
8. **Se elimina el "descuento para el fiador al día"** de todos lados (MVP, roadmap, páginas).
9. **"Qué viene" queda solo con:** billeteras argentinas como canal y tesorería propia en DeFi (simulada, nunca el pool).
10. **Etiquetas:** un único aviso de devnet (footer + una línea en el hero), una sección "Supuestos", una nota de "comercios de ejemplo" en el marketplace. Se sacan los "provisional", "ilustrativo" y "demo" sueltos. "Estado de la demo" pasa a "Qué corre en la cadena y qué en el simulador".
11. **Reloj de demo:** explicación al abrirlo y leyenda de cada marca. La misma leyenda va en la línea de mora del home.
12. **Quiénes somos:** Luciano Grosso (22, product owner) e Ignacio Albarracín (22, full stack developer). Estudiantes de Ingeniería en Informática en la Universidad del Norte Santo Tomás de Aquino (UNSTA), se reciben en diciembre de 2026, amigos desde hace años. El enfoque es el problema de no estar bancarizado y no acceder a cuotas, **no** la anécdota de la PC. Tono pulido.
13. **Se agrega "Probalo en 2 minutos"** (para el jurado) y **una comparación de costo total** frente a la alternativa sin tarjeta. No se agregan más FAQ.
14. **Programa:** entran las 6 cuotas, la cobertura con interés, la regla de "sin fiador no hay plan" y el mínimo por opción. Los tramos van a la cadena **si llega el tiempo** (es lo primero que se corta). El deploy a devnet lo aprueba Luciano aparte.

## Decisiones del coordinador

- **Orden de prioridad si falta tiempo:** copy y landing → 6 cuotas en el programa → mostrador → tramos (mock) → plan y pitch → tramos en la cadena.
- **Nombres de competidores:** se mantiene la regla vigente ("la competencia", "billeteras argentinas", sin marcas). La comparación usa `REFERENCE_FIGURES` **verificadas por el coordinador** antes de lanzar 05. Si el +29% no se verifica en la fuente, se usa el CFTEA publicado.
- **Sin "provisional" en el modelo de datos:** `PlanOption.provisional` y `SettlementOption.provisional` pasan a `false` en la config mock. El campo se mantiene para no romper el cliente real; la UI deja de rotular.
- Las hipótesis del modelo (anticipo 30%, default 8%, recupero 80%, costo de capital 12%) se muestran en "Supuestos", rotuladas como **supuestos del modelo, no métricas medidas**. Viven en `REFERENCE_FIGURES` (lib), no en el JSX.
- Hedges permitidos en el copy: "de ejemplo", "objetivo", "en devnet", "simulado". Prohibido: "ilustrativo", "provisional", "a confirmar", salvo en "Supuestos" y en "Qué corre en la cadena y qué en el simulador".

## User Stories

### Estudiante

1. Como estudiante, quiero elegir 3 cuotas sin interés o 6 con 3% total (desde US$ 350), para adaptar la compra a mi bolsillo sin letra chica.
2. Como estudiante, quiero que si mi compra es menor a US$ 350 la opción de 6 cuotas aparezca bloqueada con el motivo, para entender por qué.
3. Como estudiante, quiero saber que sin fiador no puedo abrir un plan y ver cómo invitar uno, para no chocarme en el checkout.
4. Como estudiante, quiero ver mi tier con nombre (Tier 1 · Starter…) y las reglas exactas para subir y bajar, para saber qué tengo que hacer.
5. Como estudiante, quiero escanear el QR que me muestra el cajero y confirmar la compra en mi celular con mi fianza vigente, para comprar en el local.

### Fiador

6. Como fiador, quiero saber que cubro lo que falta pagar (capital + interés), pero no el punitorio, para conocer mi máximo.
7. Como fiador, quiero que el documento de la fianza diga lo mismo que la web, sin "PENDIENTE DE DEFINICIÓN" en cobertura.

### Comercio

8. Como comercio, quiero elegir cobrar hoy, a 30, a 60 o a 90 días y ver el calendario de tramos con montos y fechas, para planificar mi caja.
9. Como comercio, quiero que mis tramos se liberen solos en su fecha (o reclamarlos yo) aunque el cliente se atrase, para no depender del estudiante.
10. Como comercio, quiero ver mi compromiso de cobro en la cadena, para confiar en la garantía.
11. Como comercio, quiero cargar un monto y una descripción, generar un QR y un link y ver la venta aparecer cuando el cliente confirma, para vender en mostrador.

### Jurado / visitante

12. Como jurado, quiero ver en un solo lugar qué corre en la cadena y qué en el simulador, para evaluar con honestidad sin tropezar con "demo" en cada párrafo.
13. Como jurado, quiero una guía de 2 minutos para recorrer la demo, para no perderme.
14. Como jurado, quiero saber quién está detrás del proyecto, para evaluar al equipo.
15. Como jurado, quiero entender el reloj de demo (día 0, gracia, aviso, recargo, cobro al fiador), para seguir la demo de mora.
16. Como jurado, quiero ver el costo total de una compra con Lazo frente a la alternativa sin tarjeta, para dimensionar el problema.
17. Como inversor, quiero ver los supuestos del modelo y el rendimiento objetivo del tramo senior, para no leer una promesa.

## Implementation Decisions

### Mock — términos (ticket 01, la costura principal)

```ts
// types.ts
export interface PlanOption {
  installments: 3 | 6;
  interestTotalBps: Bps;
  /** Precio mínimo para ofrecer la opción (micro-USDC); 0 = sin mínimo. */
  minPrice: Micro;
  enabled: boolean;
  provisional: boolean; // false en el mock; la UI deja de rotular
}
export interface SettlementOption {
  id: SettlementId;
  /** Plazo final: el último tramo se paga a `days` días. */
  days: number;
  /** Cantidad de tramos mensuales iguales (0 = inmediato). 30→1, 60→2, 90→3. */
  tranches: number;
  feeBps: Bps | null;
  enabled: boolean;
  provisional: boolean;
}
export interface PayoutTranche { index: number; amount: Micro; releaseAt: number; released: boolean; }
// ProtocolConfig: se ELIMINA `unguaranteedTiers`.
// Quote += payoutTranches: PayoutTranche[] (vacío si inmediato); merchantPending = suma de tramos.
// QuoteBlockReason += "guarantor_required" | "below_option_min" | "pool_liquidity"
// Sale/Merchant: la venta guarda sus tramos; Merchant.pendingSettlement = tramos no liberados.
```

- Config mock: 6 cuotas `{300 bps, minPrice: usdc(350)}`; 3 cuotas `{0, minPrice: 0}`; liquidaciones 700/625/575/525 con tranches 0/1/2/3; todo `provisional: false`; sin `unguaranteedTiers`.
- `requiredCoverage = financed + interest` (antes: solo capital).
- Sin garantía activa → `eligible: false`, motivo `guarantor_required`. `openPlan` falla con ese código.
- Precio < `minPrice` de la opción → `below_option_min`.
- Liquidez: `openPlan` exige `pool.liquid ≥ desembolso de hoy + Σ tramos no liberados de todos los comercios`; si no alcanza, `pool_liquidity`.
- `advanceDays` libera cada tramo vencido exactamente una vez (idempotente) y registra actividad `PayoutReleased`.
- `terms.ts` (fuente única de cálculo) suma `payoutSchedule(financedNet, option, openedAt)`.
- **Venta en mostrador** (nuevo en `CuotasClient`, el real devuelve `option_unavailable`):

```ts
interface CounterOrder { id: string; merchant: WalletAddress; amount: Micro; description: string;
  createdAt: number; expiresAt: number; status: "open" | "paid" | "expired"; planId?: string; }
createCounterOrder(merchant: WalletAddress, args: { amount: Micro; description: string }): Promise<CounterOrder>;
getCounterOrder(id: string): Promise<CounterOrder>;
listCounterOrders(merchant: WalletAddress): Promise<CounterOrder[]>;
// OpenPlanArgs += orderId?: string → toma precio y comercio de la orden, la marca "paid".
```

  La orden vence a las 24 h del reloj de demo. Una orden `paid` o `expired` no se puede volver a usar (`order_unavailable`).
- **Tiers:** nuevo diccionario `i18n/dictionaries/tiers.ts` con `tierLabel(index)` → "Tier 1 · Starter" y `tierShort(index)` → "Tier 1"; los nombres valen en es y en. Todas las pantallas lo usan.
- `REFERENCE_FIGURES` suma `modelAssumptions` (anticipo 30%, default 8%, recupero 80%, costo de capital 12% anual) y la cifra de comparación ya verificada por el coordinador.

### Programa (tickets 02 y 03)

- `INSTALLMENT_COUNT` pasa a `MAX_INSTALLMENTS = 6`; `Plan` guarda `installment_count: u8` e `installments: [Installment; 6]` (los slots sin usar quedan vacíos y resueltos). Todos los loops (`pay_installment`, `crank_mark_late`, recovery, `fully_resolved`, `split_installments(repayable, n)`) usan `installment_count`.
- `ProtocolConfig` += `plan_options: [PlanOption; 2]` `{ installments: u8, interest_total_bps: u16, min_price: u64, enabled: bool }`; se **elimina** `unguaranteed_tiers`. `open_plan(price, installments: u8)`.
- Sin `Guarantee` activa → error `GuarantorRequired`. `required_coverage = financed + interest`.
- Como el config de devnet **nunca se inicializó** (A3 pendiente), cambiar el layout no requiere migración.
- Ticket 03: `settlement_options: [SettlementOption; 4]` en config; cuenta `PayoutSchedule` PDA `["payout", plan]` con hasta 3 tramos `{ amount, release_at, released }`; `open_plan(price, installments, settlement)` crea el schedule y no transfiere lo financiado si es diferido; `release_payout(index)` sin permiso especial, con verificación de `Clock`; `Pool.committed_payouts` se suma al abrir y se resta al liberar; `open_plan` exige `vault ≥ desembolso + committed_payouts` (`PoolLiquidity`).

### Cliente real y keeper (ticket 04)

- Regenerar Codama en `app/src/generated/`, mapear `planOptions` y `settlementOptions` en `real.ts`, sin `unguaranteedTiers`. Mostrador: el real devuelve `option_unavailable`.
- Keeper: crank `release_payout` para tramos vencidos (si 03 entró).
- Actualizar los parámetros de `admin_init_config` (seed) y `programa/UPGRADE_DEVNET.md`. **Nada se firma ni se envía**: el deploy lo hace el coordinador con aprobación de Luciano.

### Web

- Home: hero, tiers + reglas, línea de mora con leyenda, comparación de costo total, números con supuestos, "Qué viene" (2 ítems), "Qué corre en la cadena y qué en el simulador", aviso único de devnet en el footer. Secciones nuevas como componentes propios: `QuienesSomos`, `Probalo`.
- Reglas de tiers (todas desde la config): subís 1 tier al saldar un plan con financiado ≥ `minFinancedToCount` sin pagos después de la gracia; si pagaste después de la gracia, el plan no suma ni baja; bajás 1 tier si se le cobra al fiador (día `guarantorChargeDay`); cada tier fija anticipo y tope; sin fiador no hay plan.
- Mostrador: `/app/comercio/mostrador` (panel del cajero: monto + descripción → QR + link + estado en vivo) y `/orden/[id]` (el estudiante ve la orden y confirma con el checkout de siempre). Dependencia nueva: `qrcode` (QR en SVG, del lado del cliente).

## Testing Decisions

- Tests de comportamiento por la interfaz pública (`CuotasClient`, `terms.ts`), con el mismo prior art que `web-completa`.
- **Mock (01):**
  - 1.000 en tier 1, 6 cuotas → interés 21, total 1.021, `requiredCoverage` 721.
  - 300 con 6 cuotas → `below_option_min`.
  - Sin garantía → `guarantor_required`.
  - 90 días → tramos 221,083333 / 221,083333 / 221,083334 de 663,25 (= 700 − 5,25%) a los días 30/60/90; se liberan una sola vez aunque se adelante de más; el comercio cobra aunque el estudiante esté en mora.
  - 60 días → 2 tramos de 329,875 (= (700 − 5,75%) / 2).
  - Pool sin liquidez → `pool_liquidity`.
  - Orden de mostrador: crear → pagar → `paid` y la venta aparece en el comercio; reusar o vencida → `order_unavailable`.
  - El caso por defecto (3 cuotas, hoy) queda idéntico: comercio 951.
- **Programa:** tests LiteSVM en `programa/tests/tests/` para las mismas propiedades; los 137+36 existentes siguen en verde (adaptados a 6 slots).
- **e2e (cierre):** checkout 6 cuotas con mínimo; mostrador de punta a punta; cobro a 90 días que libera 3 tramos con el reloj; home sin la palabra "provisional"; 390 px sin scroll horizontal.
- En cada ticket de app: `npm run typecheck && npm run lint && npm test && npm run build` en verde. En el programa: los comandos de `README.md` § Tests (**nunca `anchor test` contra devnet**).

## Out of Scope

- Deploy o upgrade en devnet, init de config, cualquier firma o envío (lo hace el coordinador con aprobación explícita).
- Mainnet. Integración con billeteras argentinas o rampas. Tesorería DeFi real.
- Descuento para el fiador (eliminado).
- QR de pagos interoperable.
- Más FAQ.

## Further Notes

- La divergencia mock ↔ programa se achica a: tramos (si 03 no entra) y mostrador (solo mock). Documentar al cierre en `proyecto/04-plan.md` § Estado, `proyecto/05-pitch.md` § Nota técnica y en la sección "Qué corre en la cadena y qué en el simulador".
- `CLAUDE.md` § "Qué es" queda desactualizado (dice "provisionales" y 60 días 5,5%): lo actualiza el ticket 13.
