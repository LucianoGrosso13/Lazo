# Handoff: demo funcional en devnet (plan aprobado)

Escrito el 2026-10-06 para retomar en una sesión nueva, con o sin otro agente. Resume lo verificado en la sesión del 5-6/10 y el plan que el usuario ya aprobó con `go`. Worktree: `side-work`, rama `feat/animate-ui-polish` (tiene cambios sin commitear en `app/src/app/layout.tsx`, diccionarios i18n y `proyecto/05-pitch.md` sin trackear: no pisarlos). El usuario escribe en español rioplatense. **Solo devnet; toda transacción que se firme o envíe necesita su aprobación explícita.**

## Leer antes de tocar nada (no se repite acá)

1. `AGENTS.md`: reglas, stack y convenciones.
2. `proyecto/02-validacion.md`: decisiones de negocio (Q2 mora, Q13-Q16, tablas ronda 4, decisiones de precio).
3. `proyecto/03-mvp.md`: guion de la demo, real vs. simulado, definición de listo.
4. `proyecto/03-brief-companero.md`: especificación del núcleo del programa (ya implementado).
5. `proyecto/04-plan.md`: bloques B0-B3 y tareas T0-T3 (los casilleros de § Estado están desactualizados: todo sin tildar).
6. `programa/README.md`, `programa/TEST_REPORT.md`, `programa/DEPLOYMENT_REPORT.md`: estado real del programa.

## Estado verificado en la sesión (no asumir otra cosa)

- **Programa:** desplegado en devnet (`E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`) con mint devUSDC propio (`8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y`, supply 0). Solo tiene el núcleo: config, pool LP, `admin_apply_loss` provisorio, merchant, reputación, garantías. **Nunca se inicializó** (`admin_init_config`/`pool_init` sin llamar) y **no existen** `open_plan`, `pay_installment`, mora ni recupero. Suite verde: 97 LiteSVM + 29 unitarios. Se buscó `open_plan` en todas las ramas (`main`, `front-esqueleto`, `lazo-ui`, locales de nacho1706 y de front): no está en ninguna; el ciclo de crédito vive solo en el mock del front.
- **Front:** `app/src/lib/cuotas.ts` anda solo en modo mock (completo: compra, cuotas, mora, reloj demo, persistencia). `real.ts` es un stub (`not_implemented`); no existe `app/src/generated/` (falta el cliente Codama y el IDL nuevo).
- **Login/demo:** lo único real es el botón de wallet (Phantom en devnet vía Wallet Standard). El resto es fixture: identidades inventadas (`LazoAdminDemo…`, ni siquiera pubkeys válidas), 2.000 USDC simulados, config copiada del doc, invitaciones como tokens random en `localStorage`, reloj de demo. Didit y Mobbex no están integrados.
- **Cómo testear hoy:** `cd programa && NO_DNA=1 anchor build --arch v1 && cargo test -p cuotas --lib && cargo +stable test --manifest-path tests/Cargo.toml` (nunca `anchor test` a secas: despliega a devnet). Deploy: solo lectura (`solana program show … --url devnet`). Front: `cd app && npm run dev` (mock), `npm run test`, `npm run test:e2e`.

## El plan aprobado (el usuario dijo `go`)

**Meta:** compra, cuotas, mora con cobro al fiador y recupero corriendo contra devnet, front en modo real. Fases con gates; cada una termina mostrable.

**Decisiones clave (no reabrir):** `Plan` en PDA única `["plan", student]` + `close` al saldar (calza con Q5, no toca `Reputation`); vencimiento cuota i = `opened_at + (i+1) × 30 × seconds_per_day` (copiado del mock); cranks `crank_mark_late` permisionless + `keeper_register_recovery` firmado por keeper; delegate/`crank_collect` fuera (MVP "Después"); cliente TS con Codama en `app/src/generated/`, commiteado; `admin_apply_loss` no se toca (política pendiente, fuera de alcance).

- **Fase 0:** localizar la keypair del deployer (`BY6ZB2…Mehf`, vive fuera del repo). Sin ella no hay upgrade ni `mint-to`: fallback = re-desplegar con nuevo ID.
- **Fase A (compra onchain):** A1 `Plan` + `open_plan` + `pay_installment` + suba de escalón (reglas solo de validación + brief, números desde `ProtocolConfig`); A2 tests LiteSVM + negativos; A3 upgrade + init + fondeo + `merchant_register` en devnet (**cada tx con aprobación explícita del usuario, simular antes**); A4 cliente Codama + `real.ts` (lecturas y escrituras de compra) + `scripts/seed.ts`. Gate: PC 1.000 → comercio recibe 951, 3 × 233,33, comprada con Phantom y visible en Explorer.
- **Fase B (mora onchain):** `crank_mark_late` (día 6: punitorio 5%, deja de contar) + `keeper_register_recovery` (día 15: baja escalón, `late_count+1`, bloquea planes; 2.ª cuota al fiador: caducan plazos) + `keeper/run.ts` en loop local + `seconds_per_day` chico. Gate: paso 4 del guion en vivo en < 60 s.
- **Fase C (fiador real):** spikes Mobbex sandbox + Didit (si Mobbex falla: plan B/C del MVP) + route handlers + `/fiador/[token]` → `keeper_register_guarantee` con hash. Gate: alta de fiador punta a punta.
- **Fase D (cierre):** paneles comercio/pool en real, Vercel, README en inglés, guion de 3 min.
- **No entra:** delegate, depósito senior en UI, pesos, Google login, Tiendanube, mainnet.

## Criterio de listo

El de `03-mvp.md`: link público con compra real en devnet < 2 min, mora completa < 60 s, fiador con KYC real + tarjeta sandbox, programa desplegado con tests y program ID en README, todo devnet.

## Nota: delegación intentada y fallida (2026-10-06, fuera del alcance pedido)

Se intentó ejecutar con Orca orchestration (Run `run_25f3d7917a43`, 7 tareas creadas: Fase 0, A1, A2, A3, A4a, A4b, C1). No existe agente `devin` en Orca, se usó `muse`. Los 6 `worker-start` fallaron en `agent_readiness` (timeout; el agente `muse` arranca en la terminal pero Orca nunca lo da por listo), incluso con `--timeout-ms 180000`. Los 3 primeros dispatches se liberaron (`ctx_02a3d0fb04ba`, `ctx_305d689019f5`, `ctx_00e52353d307`); los 3 reintentos (`ctx_36142e1495b7`, `ctx_f99f9a7bc781`, `ctx_f59c7c96a2bf`) quedaron fallados sin liberar. El próximo agente puede implementar el plan directamente en esta sesión o reintentar delegación con otro agente/terminal.

## Estado real al 2026-10-06 (verificado, rama `t-demo-devnet`)

La sesión del 5/10 ejecutó el plan directamente y quedó commiteado en 9 commits:

- **Programa:** `open_plan`, `pay_installment`, `crank_mark_late`, `keeper_register_recovery` + `Plan` PDA implementados y en verde: 137 LiteSVM + 36 unitarios (artifact `cuotas.so` sha `751cba9d`, ver `programa/TEST_REPORT.md`). **No desplegado**: en devnet sigue el artifact viejo (`8d05b07f`, sin ciclo de crédito). El upgrade es Fase A3.
- **Cliente Codama:** generado en `app/src/generated/` (`npm run generate` / `--check`).
- **Front real:** `app/src/lib/cuotas/real.ts` completo (lecturas + `openPlan`/`payInstallment` simulados antes de firmar, guard de génesis devnet); `providers.tsx` lo cablea. `NEXT_PUBLIC_CUOTAS_MODE=real` activa. `scripts/seed.ts` arma las tx de init/fondeo como propuestas dry-run con aprobación por tx.
- **Keeper:** `keeper/` con adapter Codama, journal idempotente y gateway Mobbex; 46 tests + 9 e2e con RPC scripteado.
- **Fiador sandbox:** `/api/fiador/*` (invitaciones HMAC, Didit, Mobbex, cotización onchain, registro verify-only) + `app/src/components/cuenta/fiador/real.tsx`. Contrato en `docs/fiador-sandbox.md`.
- **Cuenta:** `/app/estudiante` implementada (resuelve identidad compartida, falla cerrado en rol no-student); `/account` mantiene el tablero mock.
- Verificado en esta sesión: `npm run typecheck` ✓, `npx vitest run` 178/178 ✓, `npm run lint` sin errores ✓, `npm run build` ✓, keeper 46/46 ✓.

**Lo que falta (bloqueos reales):**

1. **Fase A3 — upgrade devnet + init + fondeo** (`npm run seed`): necesita (a) la keypair del deployer `BY6ZB2…Mehf` — no está en esta máquina, la tiene el operador fuera del repo (`$CUOTAS_KEYS`); (b) ~2 SOL devnet más (deployer tiene 0.22 SOL; el buffer nuevo de ~610 KB cuesta ~4.3 SOL y el buffer varado `DUgcg4Y2…` puede cerrarse para recuperar 2.39 SOL); (c) aprobación explícita del usuario por cada tx.
2. **Credenciales sandbox** (Didit `DIDIT_API_KEY`/`DIDIT_WORKFLOW_ID`/`DIDIT_WEBHOOK_SECRET`, Mobbex `MOBBEX_*`, `FIADOR_INVITE_SECRET`, `FIADOR_COVERAGE_POLICY` = decisión pendiente del usuario): sin ellas el alta de fiador queda en `didit_not_configured`/`coverage_policy_pending` (falla cerrado, por diseño).
3. **E2E real contra devnet** post-upgrade (compra con Phantom visible en Explorer) y Fase D (Vercel, README en inglés, guion).
4. Wiring estudiante→invitación server-side: `invitar-fiador.tsx` sigue minteando links mock (ver sección "Student-side wiring" en `docs/fiador-sandbox.md`).
5. Gap conocido del programa: reopen en el mismo segundo acepta una cuote vieja (KNOWN-GAP en `plan_pay` tests; fix = discriminador de generación).
