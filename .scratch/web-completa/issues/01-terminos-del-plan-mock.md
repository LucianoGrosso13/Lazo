# 01: Términos del plan en el mock (3/6 cuotas, plazo de cobro, D8, cobertura 100%)

**What to build:** el mock de `CuotasClient` cotiza y abre planes de 3 o 6 cuotas con el plazo de cobro del comercio, guarda una copia inmutable de términos en cada plan, simula el cobro diferido con el reloj de demo y expone helpers puros de términos y del desglose D8. Es la costura que usan los tickets de UI. Leé `.scratch/web-completa/spec.md` § "Términos del plan (mock)" (tipos y valores exactos) y `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Archivos propios:** `app/src/lib/cuotas/types.ts`, `demo-config.ts`, `mock.ts`, `real.ts`, `accounts.ts`, `accounts-types.ts`, nuevo `terms.ts` + `terms.test.ts`, `mock.test.ts`, `mock.open-plan.test.ts`, `mock.pay.test.ts`, `mock.mora.test.ts`, `real.test.ts`, `accounts.test.ts`, `app/src/lib/cuotas.ts` (solo exports). **No tocar** `mock/state.ts` ni `mock.persistence.test.ts` (son del ticket 02): los campos nuevos de `Merchant` y `Sale` son opcionales y se tratan como 0 / `"immediate"` / cobrado cuando faltan, así el estado sembrado sigue sirviendo.

Notas:
- Config mock: `planOptions` = 3 cuotas (0 bps, no provisional) y 6 cuotas (300 bps total, provisional); `settlementOptions` = inmediato 0 días 700 bps (no provisional), 30 días 625, 60 días 550, 90 días 525 (provisionales, habilitados); `originationBps` 400; `adminFeeAnnualBps` 200; `guarantorCoverageBps` 10000 en los cuatro escalones con fiador. `feeBps` (700) se mantiene por compatibilidad.
- `quote(price, student, options?)` y `openPlan({..., installments?, settlement?})`. `openPlan` sin plazo usa el predeterminado del comercio. Nuevo `setMerchantSettlement(owner, settlement)`. Motivo nuevo `option_unavailable` (en `QuoteBlockReason` y en los códigos de error que correspondan).
- Cobro: el anticipo suma al saldo del comercio al abrir; `A − F` queda pendiente hasta `openedAt + días`; el evento `Advance` del pool ocurre en esa fecha. `advanceDays` liquida las ventas vencidas una sola vez.
- Cliente real: opciones por defecto = comportamiento actual; otras → cotización no elegible / error `option_unavailable`; `setMerchantSettlement` → `option_unavailable`. `getConfig` real no trae los campos nuevos.
- `terms.ts`: `planOptionsOf(config)`, `settlementOptionsOf(config)` con fallback (3 cuotas + inmediato con `feeBps`), `d8Breakdown(config, quote)` y lo que haga falta para la UI (p. ej. fecha de cobro dada una apertura).

- [ ] Tipos y config mock como en la spec; cambios de interfaz explicados en el commit
- [ ] Caso por defecto idéntico al actual (1.000 escalón 0 → 951; 233,333333 / 233,333333 / 233,333334) — tests existentes en verde
- [ ] 6 cuotas al 3%: interés 21, total 1.021, seis cuotas que suman 721 exacto; pagar las 6 lleva el plan a `Settled`
- [ ] 1 cuota, opción deshabilitada o tarifa null → `option_unavailable` en quote y en openPlan
- [ ] Cobro a 30 días: comercio +300 al abrir, +656,25 al adelantar 30 días, una sola vez aunque se adelante de nuevo; pendiente visible en `getMerchant`
- [ ] Predeterminado del comercio aplicado cuando `openPlan` no recibe plazo; el plazo de la venta no cambia si después cambia el predeterminado
- [ ] Copia de términos en el plan inmune a cambios posteriores de config
- [ ] Cobertura 100% en los cuatro escalones con fiador (cotización y tests)
- [ ] `d8Breakdown` reproduce la tabla de `proyecto/09-…`: 49 / 28 / 651 / 679 / 700 / 21 / 2,333333 / 18,666667
- [ ] Cliente real: tests de opciones no por defecto
- [ ] typecheck / lint / test / build en verde
