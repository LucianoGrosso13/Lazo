# 04: Mock de cuotas.ts — abrir plan, comercio y pool

**What to build:** `openPlan` en el mock hace lo que hará `open_plan`: valida con la misma cotización, cobra el anticipo al comercio, el pool adelanta el financiado menos la comisión, crea el plan con 3 cuotas mensuales y deja todo visible en `getPlans`, `getMerchant`, `getPool` y `getActivity`.

**Blocked by:** 03

**Status:** done

**Archivos tuyos:** los mismos del ticket 03.

- [x] `openPlan` rechaza con `CuotasError(<reason>)` si la cotización no es elegible
- [x] Crea `Plan` (`Active`, `counts` = financiado ≥ `minFinancedToCount`), cuotas que vencen a los 30/60/90 días del reloj de demo, firma simulada base58
- [x] Comercio: `settlementBalance += merchantReceives`, `plansCount + 1`, `Sale` con anticipo, financiado, fee, recibido y firma
- [x] Pool: evento `Advance` por `financiado − fee`, `outstandingCredit += financiado`, `accruedFees += fee`, `available` baja; `nav` coherente
- [x] `Reputation.activeExposure` sube; actividad `PlanOpened`
- [x] Tests: compra de 1.000 en escalón 0 → comercio 951, pool adelanta 651, outstanding 700; segunda compra con plan activo → `has_active_plan`
- [x] typecheck, lint, test y build pasan
