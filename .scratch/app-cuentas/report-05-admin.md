# Ticket 05 — Admin y mora con reloj demo

Worker: term_9b5f2641-b992-449d-8afe-4b1d0421a72b · task_dd2d5e3c43b6

## Alcance entregado

Panel `/app/admin` implementado sobre `useAccount` + `getAccountCuotas().getAdminSnapshot(actor)` — la API ejecutora es la única que concede autoridad (`requireAdmin` adentro de cada método). Ningún control ni dato interno se renderiza para un actor no-admin; en modo real sin autoridad configurada se falla cerrado (sin fixture, sin reloj).

### Secciones del panel (todas desde el snapshot, nada hardcodeado)

- **Autoridad y fuente**: dirección verificada + origen (`config` vs `demo-fixture` declarado) + keeper si la base lo trae. Chips `pendiente` por cada sección que la base no responde (`snapshot.pending`).
- **Estado del protocolo**: estado actual con `StateMark`, selector de los 3 estados y botón "Cambiar estado" que abre revisión inline (from→to + nota de alcance). Cancelar no ejecuta; confirmar llama `adminSetState`.
- **Escalones y reglas** (solo lectura): tabla de `guaranteedTiers` (anticipo, cobertura fiador, tope, interés), línea de `unguaranteedTiers`, y reglas derivadas de `ProtocolConfig` — gracia, aviso al fiador, punitorio, día de cargo, cuotas, comisión, mínimo, mint/cluster.
- **Pool**: NAV (`BigNumber`), capital total, junior/senior, utilización (calculada outstanding/capital), crédito vigente, disponible, comisiones; movimientos con firma + receipt vía `EvidenceMark` (etiquetados simulados en mock, jamás link a Explorer).
- **Mora y recupero**: timeline de 4 pasos derivado 100% de `ProtocolConfig` (gracia → aviso → punitorio → cargo/baja de escalón/segundo cargo) + eventos reales de `snapshot.activity` con 1er/2do cargo distinguido por plan.
- **Bitácora del keeper**: toda la actividad con fecha, estudiante, plan, monto y `EvidenceMark` por firma simulada.
- **Comercios**: lista de `snapshot.merchants` (tag `demo-fixture` cuando aplica) + formulario owner/nombre con validación base58, revisión y confirmación.
- **Reloj demo** (SOLO `mode === "mock"`, nunca se consulta en real): día actual y hora del protocolo vía `getClock()`; botones +1/+7/+15 días con revisión → `base.advanceDays(n)`; "Reiniciar demo" con revisión → `useAccount().resetDemo()` (limpia metadata de cuentas + estado financiero + selección demo). Sin keeper/reloj paralelo: mismo store, revalidación por `subscribe`.

### Revisiones

Una sola revisión activa a la vez, inline en su sección, con nota "operación simulada" en mock. Confirmar deshabilita mientras ejecuta; el error se mapea por código (`not_implemented` → "pendiente en la base: falta el hook del owner del mock", `unauthorized`, `demo_only`, genérico). Cancelar deja el estado compartido intacto.

## E2E (rutas públicas, Chromium, server del coordinador 3012)

`app/e2e/admin.spec.ts` — 5 tests en `describe` mock (skip si `PW_CUOTAS_MODE=real`):

1. Estudiante en `/app/admin` → denied declarado, cero controles/datos/Explorer.
2. Admin demo → panel completo (autoridad, estado Normal, escalones, pool NAV/junior/senior, mora, bitácora, comercios, "simulado" declarado, sin Explorer).
3. Cambio de estado → revisión, cancelar sin mutar, confirmar → `not_implemented` honesto.
4. Alta de comercio → validación base58, revisión, cancelar sin mutar, confirmar → `not_implemented` honesto.
5. Reloj → avance 7d por revisión, persiste tras `page.reload()`, reset por revisión → `admin-sin-cuenta` → re-selección admin → día 0.

## Archivos modificados (solo los del ticket)

- `app/src/app/(cuenta)/app/admin/page.tsx` — entrada client, delega en `AdminPanel`.
- `app/src/components/cuenta/admin.tsx` — gating + dashboard + revisión + secciones.
- `app/src/i18n/dictionaries/admin-cuenta.ts` — ES/EN completas.
- `app/e2e/admin.spec.ts` — 5 tracers comportamiento.

Nada fuera del target: no se tocó API/context/layout/shared ni mock ni config de A; sin commits ni package/lock.

## Limitaciones declaradas (bloqueos de owner A)

- `adminSetState` y `adminRegisterMerchant` rechazan `not_implemented`: el mock de A no publica `setProtocolState` ni `registerMerchantAccount`. La UI lo declara con texto honesto y la UI nunca afirma éxito. Cuando A publique los hooks en `accounts-types.ts`/`accounts.ts`, el flujo queda completo sin cambios acá.
- Sin planes sembrados ni checkout público funcional (botón de compra sin `onConfirm` todavía, scope de A): la sección de mora muestra su timeline de config + lista de eventos vacía honesta. El avance de reloj corre `applyKeeper` del mock, pero sin planes no genera eventos. Cuando exista apertura por ruta pública, los eventos aparecerán en `admin-mora-eventos`/`admin-bitacora` sin cambios.
- `Activity.signature`/`PoolEvent.receiptHash` son datos simulados del mock — se muestran con `EvidenceMark` que los etiqueta simulados y no linkea Explorer (en real sí linkearía con `?cluster=devnet`).

## Estado verificado

- typecheck `tsc --noEmit`: 0 errores en los 4 archivos propios (baseline del repo tiene errores ajenos en `fiador/alta.tsx`, trabajo en vivo de otro worker).
- La app sigue devnet-only: `cluster: devnet` en config, mock declarado en todo punto, ninguna firma simulada linkea a Explorer.

## Ejecución de checks

A pedido del coordinador (owner único del server 3012 y de las ejecuciones), cada run se solicitó por Orca y lo ejecuta él serial: e2e ciclos 1–4 verdes previos al cambio de modelo; ciclo 5 + spec completo pedidos por `ask`.
