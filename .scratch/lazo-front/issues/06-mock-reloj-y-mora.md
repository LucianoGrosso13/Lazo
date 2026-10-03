# 06: Mock de cuotas.ts — reloj de demo y mora completa

**What to build:** `advanceDays(n)` adelanta el reloj y corre el keeper simulado, recorriendo toda la línea de tiempo de la mora hasta el cobro al fiador y el recupero en el pool.

**Blocked by:** 05

**Status:** done

**Archivos tuyos:** los mismos del ticket 03.

- [x] Estados por días de atraso de cada cuota: `Upcoming` → `Due` (día de vencimiento) → `Grace` (días 1-5) → `Late` (día 6+) → `ChargedToGuarantor` (día 15)
- [x] Día 3: actividad `GuarantorNotified` (una sola vez por cuota)
- [x] Día 6: actividad `MarkedLate`, `penalty = penaltyBps × cuota`, plan `Late`, `counts = false`
- [x] Día 15 (Q2 de la ronda 2): se le cobra al fiador **la cuota vencida + punitorio**. Actividad `GuarantorCharged` y `RecoveryRegistered`; evento de pool `Recovery` por ese monto con `receiptHash` hex de 64 caracteres; la cuota queda `ChargedToGuarantor`; `tier − 1` (mín. 0) con `TierDown`; `lateCount + 1`; `blockedFromNewPlans = true`; `activeExposure` baja por lo recuperado. El plan sigue (`Active` si no queda nada vencido, `counts = false`) y el estudiante puede pagar las cuotas restantes (al saldarlo queda `Settled` sin subir de escalón)
- [x] Si una **segunda** cuota del mismo plan llega al día 15: caducan los plazos y se le cobra al fiador **todo el saldo impago** (con punitorios); plan `Recovered`; mismo efecto en reputación
- [x] Pagar en gracia funciona y el plan sigue contando si ninguna cuota pasó el día 5
- [x] `advanceDays` notifica a los suscriptores; `getClock().daysAdvanced` refleja el total
- [x] Tests: guion (compra 1.000 en escalón 0 → paga cuota 1 → no paga la 2 → avanza hasta su día 15 → recupero de 233,33 + 5%, escalón queda en 0 (piso), `lateCount` 1, bloqueado; y otro caso que arranca en escalón 2 y baja a 1, `quote` devuelve `blocked_after_default`); segunda cuota al día 15 → `Recovered` con el saldo; pago en el día 4 no baja escalón y el plan sigue contando
- [x] typecheck, lint, test y build pasan
