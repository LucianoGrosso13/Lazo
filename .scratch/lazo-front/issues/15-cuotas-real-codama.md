# 15: cuotas.ts real con el cliente Codama

**What to build:** la implementación real de `CuotasClient` contra el programa en devnet, con el cliente generado por Codama en `app/src/generated/`, firmando con la wallet conectada.

**Blocked by:** programa desplegado + IDL del compañero (T1.4 de `proyecto/04-plan.md`)

**Status:** blocked

- [ ] Lecturas de cuentas (config, reputation, guarantee, plan, merchant, pool) mapeadas a los tipos
- [ ] `openPlan` y `payInstallment` firmados con Phantom (muestra destino, monto, token y red antes)
- [ ] `NEXT_PUBLIC_CUOTAS_MODE=real` cambia sin tocar pantallas
