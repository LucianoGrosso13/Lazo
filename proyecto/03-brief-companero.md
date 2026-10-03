# Brief para arrancar: núcleo del programa Anchor

Para: el compañero de equipo (o el agente que use: Claude Code, Devin, etc.). Escrito el 2026-10-03. Lo que se pide es autocontenido. Si querés más contexto, la fuente de verdad es `proyecto/02-validacion.md`.

## El proyecto en 30 segundos

Hackathon Colosseum (track Superteam Argentina, sede Tucumán). La entrega es el **12/10/2026**, con producto funcional en **devnet** y video de 3 minutos, en inglés.

**Qué hacemos:** cuotas en USDC para estudiantes sin tarjeta de crédito propia. Un **familiar con tarjeta de crédito firma como fiador**: solo se le cobra si el estudiante no paga, con un tope. El comercio cobra al instante. Cada plan pagado sube al estudiante de **escalón**: baja el anticipo, sube el tope, baja el interés y baja la exposición del fiador, que **nunca se libera del todo**. La reputación queda onchain, pero **solo el escalón y los contadores**, nunca el detalle de las compras.

**Cómo se mueve la plata en un plan:**
1. El estudiante compra por P. Paga el anticipo (P × anticipo%) directo al comercio.
2. El pool adelanta el resto (A) al comercio, menos una comisión de 1,5% sobre A.
3. El estudiante devuelve A + interés en **3 cuotas mensuales**.
4. Si no paga, el backend (keeper) le cobra al fiador fuera de la cadena (tarjeta en el sandbox de Mobbex). Después deposita ese recupero en el pool con la instrucción `registrar_recupero` y deja el hash del comprobante.

**Pool:** en el MVP es plata del equipo en devnet. Tiene **dos tramos**: el **junior**, que es del equipo y absorbe primero las pérdidas, y el **senior**, que fondean wallets de prueba. Nunca se ofrece a inversores reales.

## Tu tarea: el núcleo del programa (lo que no depende de decisiones abiertas)

Todavía falta cerrar la **tabla de escalones** (anticipo, tope, interés y cobertura del fiador por escalón). Por eso **nada de esos números va hardcodeado**: todo vive en `ProtocolConfig` y se carga con valores de ejemplo. El flujo de compra (`open_plan`, cuotas, mora) es la tarea siguiente, cuando cerremos esa tabla y el recorte del MVP.

### Stack

- **Anchor 1.2** (línea 1.x estable) con **Solana CLI 3.1.x**. Usar `anchor init` con el template de varios archivos (`lib.rs` + `instructions/` + `state/`).
- **Un solo programa.** Nombre provisorio: `cuotas`. Va en la carpeta `programa/`, en la raíz del repo.
- **Token:** `token_interface` + `transfer_checked`. Nunca `transfer` a secas.
- **USDC:** un **mint propio "devUSDC"** en devnet (6 decimales) para tener fondos ilimitados.
- **Tests:** LiteSVM o Surfpool. Si usás Claude Code, el repo ya trae la skill `solana-dev` en `.claude/skills/`: usala.

### Cuentas

| Cuenta | Seeds | Contenido |
|---|---|---|
| `ProtocolConfig` | `["config"]` | `admin`, `keeper` (autoridad del backend que registra fiadores y recuperos), `usdc_mint`, `fee_bps` (150), `penalty_bps` (500: 5% fijo sobre la cuota vencida), `grace_days` (5), `guarantor_charge_day` (15), `seconds_per_day` (**configurable**: en la demo, un "día" dura segundos), tabla de escalones `[TierParams; 4]` + parámetros del tramo sin fiador, `state` (`Normal / Halted / WithdrawsOnly`), `treasury`, `bump` |
| `TierParams` (struct) | — | `down_payment_bps`, `max_purchase`, `interest_bps`, `guarantor_coverage_bps` |
| `Pool` | `["pool", usdc_mint]` | `junior_shares`, `senior_shares`, `junior_capital`, `senior_capital`, `outstanding_credit`, `accrued_fees`, `bump` |
| Vault del pool | token account con authority = PDA `Pool` | USDC disponible |
| Mints LP | `["lp_junior", pool]`, `["lp_senior", pool]` | Tokens de recibo de cada tramo. Mint authority = PDA `Pool` |
| `Merchant` | `["merchant", merchant_wallet]` | `owner`, `settlement_ata`, `active`, `plans_count`, `bump` |
| `Reputation` | `["reputation", student_wallet]` | `tier` (0-3), `plans_completed`, `late_count` (moras), `active_exposure`, `bump` |
| `Guarantee` | `["guarantee", student_wallet]` | `coverage_max` (USDC), `mandate_hash: [u8; 32]` (hash del PDF de la fianza), `active`, `registered_at`, `bump`. **El fiador no tiene wallet**: esta cuenta la crea y modifica solo el `keeper` |

### Instrucciones de esta tarea

- `admin_init_config`, `admin_update_config` (para cargar la tabla de escalones después), `admin_set_state`.
- `lp_deposit(tramo, amount)` y `lp_withdraw(tramo, shares)`. Las shares se calculan según el NAV de cada tramo. Un retiro solo puede usar la liquidez del vault que no está adelantada.
- `admin_apply_loss(amount)`: aplica una pérdida **primero al junior** y, si el junior se agota, después al senior. Sirve para probar la cascada de pérdidas antes de tener el flujo de mora. Las ganancias se reparten de forma proporcional al capital de cada tramo; si te parece mal, avisá.
- `merchant_register` (la firma el admin).
- `student_init_reputation` (arranca en el escalón 0).
- `keeper_register_guarantee(student, coverage_max, mandate_hash)` y `keeper_revoke_guarantee`.

### Reglas

- Usar `init`, nunca `init_if_needed`. Guardar el bump canónico. Hacer toda la matemática de shares en `u128` con `checked_*`.
- `has_one` / `constraint` en todas las relaciones (keeper, admin, mint, settlement_ata).
- Con `state != Normal` no se origina nada. `WithdrawsOnly` permite retirar.
- Solo devnet. Ninguna clave privada en el repo (las keypairs van a `.gitignore`).

### Cuándo está terminado

1. `anchor build` compila sin warnings relevantes.
2. Hay tests de cada instrucción **con su caso negativo**: firmante incorrecto, retiro sin liquidez, pérdida mayor que el junior y config pausada.
3. El programa está desplegado en devnet y existe el mint devUSDC.
4. `programa/README.md` tiene el program ID, la dirección del mint, cómo correr los tests y una línea por cada decisión que tomaste y que este brief no cubría.

## Qué NO hacer ahora

- El flujo de compra (`open_plan`, cuotas, delegate/crank, mora, `registrar_recupero`) viene en la próxima tarea.
- El frontend, Mobbex, Didit y Tiendanube los encara Luciano en paralelo.
- No editar `proyecto/*.md`. Las dudas de diseño se las preguntás a Luciano, no las resolvés inventando.
