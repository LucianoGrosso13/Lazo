# 02: Programa — 6 cuotas con interés, cobertura con interés, fiador obligatorio y mínimo por opción

**What to build:** el programa Anchor ofrece 3 o 6 cuotas según `plan_options` de la config (interés total y precio mínimo por opción), exige una garantía activa para abrir un plan y pide cobertura por capital + interés. Se eliminan los tiers sin fiador.

**Blocked by:** —

**Status:** ready

**Archivos propios:** `programa/programs/cuotas/src/**`, `programa/tests/**`, `programa/README.md` (§ Tests si cambian comandos), `programa/TEST_REPORT.md`. **No** tocar `app/` (el cliente lo regenera el 04).

Notas:
- Diseño en spec § "Programa". `MAX_INSTALLMENTS = 6`, `Plan.installment_count`, loops por `installment_count`, `split_installments(repayable, n)` con la última cuota que absorbe el redondeo.
- `open_plan(price, installments: u8)`; errores nuevos `GuarantorRequired`, `BelowOptionMin`, `OptionUnavailable`.
- El config de devnet nunca se inicializó: cambiar el layout es libre (no hace falta migrar). Actualizá `ConfigParams` y la validación de `admin_init_config` / `admin_update_config` (interés ≤ un tope razonable, opción de 3 cuotas siempre presente).
- **Nunca `anchor test` ni `anchor deploy`.** Solo los comandos LiteSVM de `README.md`.
- Revisá `SECURITY_REVIEW.md`: los invariantes de cuotas deben seguir valiendo con n = 6 (suma exacta, sin overflow, sin slots fantasma pagables).

- [ ] Config con `plan_options`, sin `unguaranteed_tiers`
- [ ] 6 cuotas: 1.000 / tier 0 → interés 21, seis cuotas que suman 721 exacto, vencimientos cada `installment_interval_days`
- [ ] Sin garantía activa → `GuarantorRequired`; precio < mínimo → `BelowOptionMin`; cobertura < financiado + interés → `InsufficientGuaranteeCoverage`
- [ ] `pay_installment`, `crank_mark_late`, cobro al fiador y recovery funcionan con 6 cuotas (tests nuevos)
- [ ] Suite existente adaptada y en verde; `TEST_REPORT.md` actualizado
