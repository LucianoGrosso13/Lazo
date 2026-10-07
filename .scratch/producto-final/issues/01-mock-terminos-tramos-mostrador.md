# 01: Mock — 6 cuotas decididas, tramos del comercio, sin fiador no hay plan, órdenes de mostrador y tiers

**What to build:** la costura `lib/cuotas` (tipos + mock + `terms.ts`) refleja las decisiones del spec: 6 cuotas al 3% desde US$ 350, cobertura = capital + interés, sin fiador no hay plan, cobro del comercio en tramos garantizados con chequeo de liquidez del pool, órdenes de mostrador y el diccionario de tiers. Es la base de los tickets de UI; tiene que salir rápido y con la interfaz estable.

**Blocked by:** — (el coordinador carga antes la cifra verificada de la comparación; si no llegó, dejá `REFERENCE_FIGURES` como está y avisá)

**Status:** ready

**Archivos propios:** `app/src/lib/cuotas/{types.ts,demo-config.ts,mock.ts,terms.ts,format.ts,reference-figures.ts,accounts*.ts}`, `app/src/lib/cuotas/mock/*`, sus `*.test.ts`, `app/src/lib/cuotas/real.ts` (solo lo mínimo para compilar: métodos de mostrador → `option_unavailable`, sin `unguaranteedTiers`), nuevo `app/src/i18n/dictionaries/tiers.ts`. Arreglos mínimos de compilación en componentes que leen `unguaranteedTiers` o `provisional`, listados en el `worker_done`.

Notas:
- Interfaz exacta en spec § "Mock — términos". Si cambiás `CuotasClient`, explicalo en el commit (lo usan 08, 09 y 12 en paralelo).
- `terms.ts` es la fuente única: `payoutSchedule()` lo usan el mock y las páginas.
- `tiers.ts`: `tierLabel(i)` → "Tier 1 · Starter" … "Tier 4 · Full"; `tierShort(i)` → "Tier 1". Iguales en es y en.
- Actividad nueva `PayoutReleased` (para el panel del comercio y el pool).

- [ ] Tipos y config mock según spec (6c 300 bps + minPrice 350; 700/625/575/525 con 0/1/2/3 tramos; sin `unguaranteedTiers`; todo `provisional: false`)
- [ ] `quote`: `guarantor_required`, `below_option_min`, `requiredCoverage = financed + interest`, `payoutTranches`
- [ ] `openPlan`: chequeo de liquidez (`pool_liquidity`), tramos guardados en la venta, `orderId`
- [ ] `advanceDays` libera tramos una sola vez, aunque el estudiante esté en mora
- [ ] `createCounterOrder` / `getCounterOrder` / `listCounterOrders` con vencimiento a 24 h y `order_unavailable`
- [ ] `tiers.ts` y `REFERENCE_FIGURES.modelAssumptions`
- [ ] Todos los tests de spec § Testing (Mock) en verde; caso por defecto idéntico (951)
- [ ] typecheck / lint / test / build en verde
