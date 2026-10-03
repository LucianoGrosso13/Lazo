# 05: Mock de cuotas.ts — pagar cuotas y subir de escalón

**What to build:** `payInstallment` paga la próxima cuota impaga (con el punitorio si lo tiene), y al saldar un plan que cuenta el estudiante sube un escalón.

**Blocked by:** 04

**Status:** ready-for-agent

**Archivos tuyos:** los mismos del ticket 03.

- [ ] Paga la próxima cuota impaga (`amount + penalty`), firma simulada, evento de pool `Repayment` (`outstandingCredit` baja, `available` sube), actividad `InstallmentPaid`
- [ ] Sin cuotas impagas → `CuotasError("nothing_due")`; plan inexistente → `not_found`
- [ ] Al pagar la última: plan `Settled`, `activeExposure` baja; si `counts`, `plansCompleted + 1` y `tier + 1` (máx. 3) con actividad `TierUp`
- [ ] Tests: 3 cuotas pagadas → `Settled` y escalón 1; plan de 120 (financiado 84 < 100) → no sube; pagar dos veces la misma no duplica
- [ ] typecheck, lint, test y build pasan
