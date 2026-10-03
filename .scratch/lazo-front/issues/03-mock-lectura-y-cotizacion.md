# 03: Mock de cuotas.ts — estado, lectura y cotización

**What to build:** el mock de `CuotasClient` guarda estado (memoria + localStorage, SSR-safe), siembra los datos de demo y cotiza cualquier precio para cualquier wallet según su escalón y su fiador, con los motivos de bloqueo.

**Blocked by:** 01

**Status:** ready-for-agent

**Archivos tuyos:** `app/src/lib/cuotas/mock.ts` (y los módulos que quieras crear bajo `app/src/lib/cuotas/mock/`), `app/src/lib/cuotas/reference-figures.ts`, tests `app/src/lib/cuotas/*.test.ts`. No cambies `types.ts` sin avisar en el commit.

- [ ] Estado del mock serializable, persistido en localStorage con clave versionada (`lazo.mock.v1`); en servidor vive en memoria sin tocar `window`
- [ ] `resetDemo()` siembra: comercio "Tienda Demo" (`DEMO_MERCHANT`), pool con junior y senior de ejemplo, estudiante `DEMO_STUDENT_TIER3` en escalón 3 con fiador
- [ ] `getReputation(w)` crea la reputación en escalón 0 si no existe; `initReputation` es idempotente
- [ ] Una wallet nueva arranca **con** un fiador de ejemplo (`display: { guarantorName: "Mamá", cardLabel: "Visa •••• 4242" }`, `maxPurchase` 1.000, `coverageMax` 1.000) para que el guion corra sin la pantalla del fiador
- [ ] `registerGuarantee` / `revokeGuarantee` / `getGuarantee` funcionan y registran actividad
- [ ] `quote(price, w)`: anticipo = `downPaymentBps` del escalón, financiado, 3 cuotas (la última absorbe el redondeo), interés 0, total, `merchantFee` = `feeBps` × financiado, `merchantReceives`, `requiredCoverage`, `eligible` y `reasons` (`exceeds_tier_max`, `exceeds_guarantor_max_purchase`, `exceeds_guarantee_coverage`, `no_guarantee`, `blocked_after_default`, `has_active_plan`, `protocol_halted`)
- [ ] `getConfig`, `getClock` (con `daysAdvanced`), `subscribe` (notifica en cada mutación)
- [ ] `REFERENCE_FIGURES` exportado (MP ~1.290 por 1.000 en 3 cuotas = +29%, CFTEA 61-388%, Cuota Simple 5,41%, MP comercio ~12,49%, GOcuotas 22 días hábiles, Kamino ~6%, Jupiter ~5%, senior objetivo ~8%), con nota "referencia, sin verificar en la fuente oficial"
- [ ] Tests: PC 1.000 escalón 0 → anticipo 300, financiado 700, cuotas 233,333333/233,333333/233,333334, fee 49, comercio 951; escalón 3 → anticipo 0; 1.200 en escalón 0 → `exceeds_tier_max`; sin fiador → `no_guarantee`; cobertura insuficiente → `exceeds_guarantee_coverage`; persistencia entre instancias; `resetDemo`
- [ ] typecheck, lint, test y build pasan
