# 04: Cliente real — Codama regenerado, real.ts, crank de tramos en el keeper y runbook de upgrade

**What to build:** el front en modo real habla con el programa nuevo: 3/6 cuotas, sin tiers sin fiador, cobertura con interés y, si 03 entró, cobro en tramos. El keeper identifica los tramos vencidos y deja propuestas dry-run de `release_payout`, sin firmar ni enviar transacciones. El runbook de upgrade y los parámetros de init quedan listos para que el coordinador pida aprobación y despliegue.

**Blocked by:** 02 (y 03 si entra; si 03 se corta, `settlement` distinto de inmediato sigue en `option_unavailable` en modo real)

**Status:** done

**Archivos propios:** `app/src/generated/**`, `app/src/lib/cuotas/real.ts`, `real.test.ts`, `keeper/**`, `app/scripts/seed.ts` y `app/src/seed.test.ts` (parámetros de `admin_init_config`), `programa/UPGRADE_DEVNET.md`.

Notas:
- Init params: fee 7%, gracia 5, aviso día 3, cobro día 15, tiers con fiador 30/20/10/0% de anticipo con topes 1.000/1.000/1.250/1.500, `plan_options` (3: 0 bps sin mínimo; 6: 300 bps, mínimo 350), `settlement_options` 700/625/575/525.
- Mostrador en modo real: `option_unavailable` (solo mock, se dice en "Qué corre en la cadena y qué en el simulador").
- **Nada se firma ni se envía.** El runbook detalla costo en SOL de devnet, pasos y verificación; el upgrade lo corre el coordinador con aprobación explícita de Luciano.

- [x] Codama regenerado desde el IDL nuevo; `real.ts` mapea `planOptions` y `settlementOptions`
- [x] `real.test.ts` cubre 6 cuotas, `guarantor_required` y tramos
- [x] Keeper: descubre tramos vencidos, arma la instrucción `release_payout` sin firmar/enviar y lo prueba contra RPC mockeado
- [x] `UPGRADE_DEVNET.md` actualizado (artefacto, sha, costo, pasos, parámetros de init)
- [x] typecheck / lint / test / build en verde; keeper test/e2e/typecheck y programa host + LiteSVM también
