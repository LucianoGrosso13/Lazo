# 03: Programa — compromiso de cobro en tramos (PayoutSchedule) y liquidez del pool

**What to build:** al abrir un plan con cobro diferido, el programa crea una cuenta pública `PayoutSchedule` con los tramos a favor del comercio. La plata queda en el pool y cada tramo se libera en su fecha con `release_payout`, una instrucción que cualquiera puede llamar. El pool lleva la cuenta de lo comprometido y rechaza planes nuevos si no hay liquidez libre.

**Blocked by:** 02

**Status:** done · **Prioridad: la primera en cortarse si no llega el tiempo**

**Archivos propios:** los mismos que 02 (`programa/**`), sobre la rama ya integrada de 02.

Notas:
- Diseño en spec § "Programa" (ticket 03). `settlement_options: [SettlementOption; 4]` `{ days, tranches, fee_bps, enabled }`; tramos mensuales iguales con el último absorbiendo el redondeo; la fecha sale de `installment_interval_days`.
- `release_payout(index)`: requiere `Clock ≥ release_at`, no liberado, ATA del comercio correcto; marca `released`, baja `Pool.committed_payouts` y emite el evento `PayoutReleased`. Es idempotente ante reintentos (falla limpio si ya está liberado).
- `open_plan(price, installments, settlement)`: con cobro inmediato, igual que hoy; con diferido, transfiere solo el anticipo (estudiante → comercio), crea el schedule y suma lo comprometido. Liquidez: `vault ≥ desembolso_hoy + committed_payouts` o `PoolLiquidity`.
- El pago al comercio **no depende** de que el estudiante pague (Lazo garantiza).
- Los retiros de LPs (`lp_withdraw`) no pueden dejar `vault < committed_payouts`.

- [x] `PayoutSchedule` creado con los montos y fechas del spec (30/60/90 → 1/2/3 tramos, 6,25/5,75/5,25%)
- [x] `release_payout` antes de tiempo falla; en fecha transfiere; dos veces falla
- [x] Tramo liberado con el estudiante en mora
- [x] `PoolLiquidity` en `open_plan` y tope en `lp_withdraw`
- [x] Suite completa en verde
