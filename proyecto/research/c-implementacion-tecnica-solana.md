# C — Implementación técnica en Solana

Investigación del 2026-10-03 para "Cuotas sin tarjeta" (BNPL para estudiantes en Tucumán, entrega Colosseum 12/10/2026). Fuentes primarias oficiales; lo no confirmado está marcado **SIN VERIFICAR**.

## Resumen ejecutivo

- **Un solo programa Anchor (v1.2.x) alcanza para todo el MVP**: 5–6 PDAs (`Config`, `Pool`, `LpPosition`/shares, `Merchant`, `Reputation`, `Plan`) + vaults como token accounts del pool. Los shares del LP pueden ser un mint SPL con autoridad en el PDA del pool (patrón receipt-token tipo ERC-4626, el mismo que usan Huma/PST y Yumi).
- **El débito automático es real pero revocable**: SPL `ApproveChecked` delega un monto tope a un PDA del programa y cualquier crank puede cobrar la cuota a la fecha; el usuario puede revocar o vaciar la cuenta en cualquier momento — es comodidad, no garantía (consistente con `02-validacion.md`). Clockwork está **muerto desde oct-2023**; la alternativa viva es TukTuk (Helium) y, para el MVP, un crank permisionless + keeper propio.
- **Onboarding más corto: Phantom embedded** (login Google/Apple, gratis, soporta devnet/testnet oficialmente). Privy, Para, Dynamic y Web3Auth/MetaMask Embedded también soportan Solana con free tiers. Solana Pay *transaction requests* resuelven "pagar cuota con QR" sin app propia.
- **Rampas AR confirmadas para USDC por Solana**: Bitso (depósitos y retiros SPL), Belo (depósitos y retiros), Binance y Ripio Trade (API). **Lemon y Buenbit: SIN VERIFICAR** — planificar el off-ramp del comercio por Bitso/Ripio y el on-ramp del estudiante por cualquiera de las confirmadas.
- **Competencia y composabilidad**: Yumi Finance (1.º DeFi Cypherpunk, aceleradora C4) es la referencia a diferenciar — nuestra cuña es la reputación escalonada visible on-chain + foco local. Huma (PST ~7–9% APR) y Kamino (~5,5–12% en vaults USDC) pueden hacer rendir el pool ocioso *en mainnet* (roadmap, no MVP). Credix es la advertencia: exploit de ~USD 4,5M por llave admin comprometida (ago-2025) → autoridad en multisig desde el día uno.

---

## 1. Diseño del programa Anchor

### 1.1 Stack y versiones

- **Anchor**: la línea 1.x es la estable actual. `v1.0.0` salió el 2026-04-02 y `v1.2.0` el 2026-09-04; apunta a Solana 3.x (Solana CLI recomendado 3.1.10) y el repo migró de `coral-xyz`/`otter-sec` a `solana-foundation/anchor`. El CLI ya no depende del binario `solana` externo. Para un proyecto nuevo: `anchor init` con template múltiple (`lib.rs` + `instructions/` + `state/`).
- **Programa único** para el MVP (no multi-programa): la separación de privilegios se logra con PDAs y una cuenta de estado global con enum `OperatingState { Normal, Halted, WithdrawsOnly }` como kill switch.
- **Token program**: usar `token_interface` + `transfer_checked` (compatible con SPL clásico y Token-2022), nunca `transfer` a secas.
- **USDC en devnet**: mint oficial de Circle `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`, con faucet público (20 USDC cada 2 h por dirección). Recomendación práctica para el demo: crear un mint propio "devUSDC" para fondos ilimitados y usar el de Circle solo si se quiere realismo.

### 1.2 Cuentas (PDAs y seeds propuestos)

| Cuenta | Seeds | Contenido clave |
|---|---|---|
| `ProtocolConfig` | `["config"]` | `admin` (idealmente multisig Squads), `usdc_mint`, `fee_bps` comercio, `penalty_bps_per_day`, `reserve_bps`, tabla de escalones `[ {down_payment_bps, max_purchase} × 4 ]`, `state` (enum kill switch), `treasury`, `bump` |
| `Pool` | `["pool", usdc_mint]` | `total_shares`, `outstanding_credit` (suma de principal adelantado no repagado), `reserve_balance` contable, `accrued_fees`, `bump` |
| Vault del pool | token account con authority = `Pool` PDA | USDC líquido disponible para adelantar |
| Vault de reserva | token account con authority = `Pool` PDA (o PDA propio `["reserve", pool]`) | Reserva de pérdidas separada del capital disponible |
| Shares LP (mint) | `["lp_mint", pool]`, mint authority = `Pool` PDA | Receipt token del inversor (1 share = fracción del NAV del pool) |
| `Merchant` | `["merchant", merchant_wallet]` | `owner`, `settlement_ata` (dónde cobra), `kyc_ok` (flag mock en MVP), `active`, `plans_count`, `bump` |
| `Reputation` | `["reputation", user_wallet]` | `tier` (0–3), `plans_completed`, `plans_defaulted`, `active_exposure`, `bump`. Solo el escalón y contadores on-chain, **no el detalle de compras** (privacidad, ya decidido en validación) |
| `Plan` | `["plan", user, plan_id]` (con `plan_id` = contador del usuario) | `merchant`, `user`, `purchase_amount`, `advance_amount` (lo que puso el pool), `fee_amount`, `installments = 3`, `installment_amount`, `next_due_at`, `paid_count`, `penalty_accrued`, `status` enum `Active / Settled / Defaulted / Closed`, `bump` |
| Collector (authority del delegate) | `["collector"]` | PDA sin data (o mínima) que actúa como delegate SPL para el débito automático |

**NAV del pool** = `vault_usdc + outstanding_credit + reserve`; precio de share = NAV / `total_shares`. Los punitorios y comisiones incrementan NAV (beneficio a LPs), menos lo que absorbe la reserva y las pérdidas.

### 1.3 Instrucciones propuestas

Convención `sujeto_verbo_objeto`:

- `admin_init_config`, `admin_set_state` (pause), `admin_collect_fees` → treasury.
- `lp_deposit(usdc_amount)` → transfiere USDC al vault y mintea shares al ATA del LP según NAV previo.
- `lp_withdraw(shares)` → quema shares y transfiere USDC `pro-rata`; **validar liquidez**: el vault solo puede pagar lo que no está adelantado (`vault_balance ≥ amount`); retiros parciales/queue son roadmap.
- `merchant_register` (firma admin en MVP) → crea `Merchant` con `kyc_ok` manual.
- `user_init_reputation` (payer = usuario o sponsor) → crea `Reputation` en tier 0.
- `user_open_plan(plan_id, purchase_amount)` — el corazón del flujo:
  1. Lee `Reputation.tier` → deriva `down_payment_bps` (50/30/15/0) y tope del escalón; rechaza si `purchase_amount` excede el tope.
  2. En la misma tx: el usuario transfiere el anticipo al comercio + firma `ApproveChecked` delegando `advance_amount` (o el total de cuotas) al PDA `collector` + paga rent del `Plan`.
  3. El programa transfiere `advance_amount − fee` del vault al `settlement_ata` del comercio, y `fee` a treasury (la comisión es sobre lo adelantado, como se definió).
  4. Actualiza `outstanding_credit`, `active_exposure`, crea `Plan` con `status = Active`.
- `user_pay_installment(plan)` → pago voluntario: transfiere cuota (+ punitorio si `now > due_at`) al vault; si `paid_count == 3` → `Settled`, actualiza `Reputation` (sube tier, baja `active_exposure`), reparte punitorio a pool/reserva.
- `crank_collect(plan)` — **permisionless**: si `now ≥ next_due_at`, CPI `transfer_checked` desde el ATA del usuario (delegate = `collector` PDA, firma con seeds) al vault por `installment_amount + penalty`. Si falla (revocado / sin saldo) → el crank puede llamar `crank_mark_default` tras el período de gracia.
- `crank_mark_default(plan)` — **permisionless** tras `due_at + grace`: `status = Defaulted`, `Reputation.tier` baja a 0 (o −1 escalón), `plans_defaulted++`, la reserva absorbe la pérdida (`outstanding_credit` se mueve a loss).
- `user_close_plan` (settled) → devuelve rent.

### 1.4 Validaciones clave

- `has_one` entre `Plan.merchant` ↔ `Merchant`, `Plan.user` ↔ `Reputation`, `Merchant.settlement_ata` ↔ ATA real del mint USDC.
- `seeds` + bump canónico almacenado (evitar `find_program_address` en caliente: validar con `create_program_address` y el bump guardado).
- `constraint` de estado: `config.state == Normal` para originar; `WithdrawsOnly` bloquea `open_plan` pero permite `pay/collect/withdraw`.
- Matemática de shares en `u128` con `checked_*`; punitorios con `i64` timestamps del `Clock` sysvar.
- Invariante al final de cada instrucción: `vault + outstanding + reserve ≥ total_shares × min_nav` y `advance_amount = purchase − down_payment`.
- `init`, nunca `init_if_needed` (riesgo de reinicialización); `close = user` en `close_plan`.

### 1.5 Errores de seguridad típicos (checklist)

Los clásicos de programas Solana/Anchor que aplican directo a este diseño:

- **Missing signer / owner checks**: un `Merchant` o `Reputation` falso pasado por un atacante. Mitigación: cuentas tipadas `Account<'info, T>` (discriminador + owner automáticos) y `has_one`.
- **PDA sharing**: seeds de `Reputation` o `Plan` que no incluyan la wallet del usuario permiten reusar la cuenta de otro. Siempre `user` (y `plan_id`) en seeds.
- **Ataque de inflación de shares (primer depósito)**: el primer LP deposita 1 wei, recibe 1 share, "dona" USDC al vault para inflar el NAV y roba por redondeo al próximo depositante. Mitigación: exigir depósito mínimo inicial, mintear shares "muertas" a una cuenta quemada, o arrancar con `NAV_virtual` (offset tipo OpenZeppelin ERC-4626).
- **`init_if_needed`**: permite reinicializar cuentas ya creadas. Usar `init` puro.
- **Approve sin tope**: delegar `u64::MAX` al collector es un pozo de riesgo. Delegar exactamente `advance_amount` (o lo restante por pagar).
- **No manejar el camino "revocado"**: `crank_collect` debe fallar *limpio* y llevar a `mark_default` por gracia; un collect que revierte sin camino alternativo deja el plan zombie.
- **Duplicate mutable accounts**: pasar el mismo token account dos veces (ej. `settlement_ata` = vault) rompe contabilidad; chequear `key() !=`.
- **CPI a programa no validado**: usar `Program<'info, Token>`/`token_interface` tipado; no aceptar `token_program` arbitrario.
- **Cierre inseguro de cuentas**: `close` de Anchor (drain + realloc a 0) para evitar *revival attacks*.
- **Llave admin única**: el exploit de Credix (ago-2025, ~USD 4,5M) fue un rol privilegiado en una wallet comprometida → `admin` = multisig Squads y permisos mínimos.
- **`transfer` en vez de `transfer_checked`**: rompe con Token-2022 y no valida mint/decimales.
- **Redondeo a favor del usuario**: punitorios y shares siempre redondear a favor del pool.

## 2. Débito automático

### 2.1 Cómo funciona SPL approve/delegate

Según la documentación oficial de Solana:

- `Approve`/`ApproveChecked` graba en el token account un **único** delegate + un monto delegado; el owner firma. `ApproveChecked` es preferible porque exige mint + decimales.
- El delegate puede transferir (o quemar) hasta el tope; el tope baja con cada transferencia. **El owner conserva la custodia**: puede mover fondos o ejecutar `Revoke` (que pone delegate y monto a cero) en cualquier momento. En Token-2022 el propio delegate también puede revocarse.
- Un nuevo `Approve` **reemplaza** al delegate anterior — solo hay uno por token account.
- El delegate puede ser un **PDA**: el programa lo firma vía `invoke_signed` con sus seeds dentro de `crank_collect`. Es el patrón estándar para "cobrador autorizado".

**Límites honestos para el pitch**: la delegación es por token account (el ATA de USDC), no por wallet — si el usuario mueve saldo a otra cuenta o revoca, el cobro falla. Es "débito automático con consentimiento revocable", no garantía de cobro. Eso está bien para el demo: la reputación y el punitorio son la zanahoria/garra, no el débito.

### 2.2 Quién dispara el cobro

- **Clockwork: CONFIRMADO muerto.** El equipo anunció el 27-ago-2023 el cese de operaciones por falta de viabilidad comercial y apagó los nodos de devnet/mainnet el 31-oct-2023. El código quedó open-source pero el SDK no soporta versiones actuales de Solana/Anchor. No usar.
- **TukTuk (Helium): la alternativa viva y mantenida.** Servicio permisionless de cranks: se crea una *task queue* (depósito mínimo 1 SOL, reembolsable al cerrar), se encolan tareas con triggers cron o por tiempo, y "crank turners" ejecutan a cambio de una recompensa en SOL por ejecución. Solo requiere un RPC; puede proveer firmas PDA (`task_queue` como autoridad). Requisito de diseño: la instrucción debe ser "más o menos permisionless" — nuestro `crank_collect` ya lo es. Activo en 2026 (docs con copyright 2026, mantenido por Helium).
- **Keeper propio (recomendado para el MVP)**: un script Node/TS con cron (Vercel Cron, un VPS, o hasta un loop local durante el demo) que cada X horas busca `Plan` con `next_due_at` vencido (`getProgramAccounts` con memcmp sobre `status`/`next_due_at`) y envía `crank_collect`. Como la instrucción es permisionless, el mismo diseño sirve para TukTuk en producción y para que *cualquiera* pueda cobrar en la demo en vivo (incluso manualmente desde la UI).
- Otras opciones del ecosistema: webhooks de Helius/QuickNode + server que envía la tx (funciona pero es infra a medida). Para 9 días: keeper propio, mencionar TukTuk como camino productivo.

## 3. Wallets para estudiantes no cripto-nativos

| Proveedor | Solana | Devnet | Costo | Notas |
|---|---|---|---|---|
| **Phantom embedded** (Phantom Connect / Browser SDK) | Nativo (es la casa) | **Sí** — mainnet, devnet y testnet soportados oficialmente | **Gratis** (requiere `appId` del Phantom Portal) | Login Google/Apple o extensión; non-custodial. Restricciones: embedded solo soporta `signAndSendTransaction` (no `signTransaction`), límite de gasto default ~USD 1.000/día/app/usuario, sesiones sociales ~7 días. **Recomendado para el MVP**: cero costo, devnet nativo, marca conocida |
| **Privy** | Sí (EVM+Solana) | **Sí** — mainnet/devnet/testnet vía `config.solana.rpcs` | Free ≤500 MAU (50k firmas/mes); Core USD 299/mes, Scale USD 499/mes | Comprada por Stripe (jun-2025). Madura, pero sobredimensionada para 9 días si Phantom alcanza |
| **Para** (ex-Capsule) | Sí (MPC + passkeys) | Sí — sus docs usan `api.devnet.solana.com` en ejemplos | SIN VERIFICAR | Portable entre apps (la wallet sirve en cualquier app Para) |
| **Dynamic** | Sí (conectores `@dynamic-labs/solana`, embedded via Turnkey) | Sí (el connector acepta devnet) | Free ≤1.000 MAU; Growth USD 249/mes (fuente secundaria: agregador de precios) | Multi-chain; también permite conectar wallets externas |
| **Web3Auth → MetaMask Embedded Wallets** | Sí (`chainNamespace: SOLANA`, devnet chainId `0x3`) | Sí (`sapphire_devnet`) | SIN VERIFICAR (tier free histórico generoso) | Rebranded a MetaMask Embedded Wallets; API/paquetes siguen nombrados `web3auth` |

**Solana Pay para pagar cuotas con QR** (documentación oficial, vigente):

- *Transfer request* (simple): URL `solana:<recipient>?amount&spl-token&reference&label&message` → QR escaneable por wallets compatibles; el `reference` único permite reconciliar el pago on-chain server-side.
- *Transaction request* (la útil para nosotros): URL `solana:<https-endpoint>` — la wallet hace `GET` (label/icono del "comercio") y `POST` con la cuenta del usuario; **el servidor devuelve una transacción arbitraria** (ej. nuestra instrucción `user_pay_installment`) que la wallet firma y envía. El estudiante puede pagar la cuota escaneando un QR en el comercio sin abrir nuestra app. SDK: `@solana/pay` y `@solana-commerce/solana-pay` (ambas referenciadas en docs oficiales de solana.com), `createQR` incluido.
- Nota UX: las wallets embebidas no escanean QR; el QR es para wallets Solana Pay clásicas (Phantom móvil, Solflare). En el MVP se puede demostrar con Phantom móvil apuntando a devnet.

## 4. Rampas Argentina ↔ USDC en red Solana

Verificado en centros de ayuda / páginas de fees oficiales (consulta 2026-10-03):

| App | USDC por Solana | Evidencia | Detalle |
|---|---|---|---|
| **Belo** | **SÍ — depósitos y retiros** | help.belo.app art. 5964418 | Lista Solana para USDT, USDC, ETH y SOL en ambos sentidos; solo USDC nativo (no USDC.e) |
| **Bitso** | **SÍ — depósitos y retiros** | bitso.com/fees/transactions | USDC "Solana SPL Token": depósitos gratis (2 confirmaciones), retiros ~USD 0,21; habilitado desde feb-2025 |
| **Binance** | **SÍ** | usdc.org/directory/exchanges/binance + anuncios de soporte | USDC multi-red incl. Solana; P2P ARS disponible |
| **Ripio** | **SÍ (Ripio Trade/API)** | docs.rio.trade/currencies | Lista "USDC Solana" (`SOL_USDC_PTHX`) como activo soportado; API de retiros cripto + retiros ARS a CVU para cuentas AR — candidato a off-ramp programático del comercio |
| **Lemon** | **SIN VERIFICAR** | help.lemon.me art. 6577042 (AR) no enumera redes; art. Colombia sí lista Solana entre redes de depósito; lemon.me/crypto devuelve 404 | La validación previa sugirió solo BEP20/ERC-20/Polygon para USDC; hay que confirmar en-app antes de afirmarlo |
| **Buenbit** | **SIN VERIFICAR** | No se encontró artículo de ayuda con redes de USDC; sus TyC solo mencionan Solana entre las redes donde operan protocolos de inversión | No afirmar soporte |

**Cómo convierte el comercio USDC → pesos rápido**: recibe USDC-SPL en su propia wallet o directo en Bitso/Ripio/Belo → vende por ARS → retiro a CVU/CBU (Ripio además expone API de retiro a CVU para `country=AR`, útil para automatizar). En el demo se simula con una pantalla de "cobrar en pesos" o narrado; lo importante para el pitch es que el comercio también puede optar por quedarse en dólares, algo que Mercado Pago no ofrece.

## 5. Protocolos existentes (componer o competir)

- **Huma Finance — "la primera red PayFi", viva y creciendo.** Pools de USDC que financian pre-fondeo cross-border T+0 (Arf, regulada en Suiza) y trade finance; depósitos permissionless desde abr-2025 → receipt token **PST** (~USD 322M de cap a sep-2026, rendimiento ~7–9% anual, >USD 17B de volumen acumulado, "cero defaults crediticios" según su blog). Adoptó Chainlink CCIP (abr-2026) y anunció nueva etapa institucional (ago-2026). **Para nosotros**: es la arquitectura de referencia (receipt token del LP + financiamiento de pagos reales) y un posible destino de yield para el pool ocioso en mainnet; no hace BNPL al consumidor en punto de venta.
- **Kamino — el money market dominante.** ~USD 1,4–1,5B TVL (DefiLlama, oct-2026); Kamino Lend + Liquidity + "Institutional Yield" (vaults de crédito institucional, lanzado ago-2026). Vaults USDC entre ~5,5% y ~12% net APY (Steakhouse USDC 5,59%, Private Credit 12,02% — datos ago-2026). **Uso**: depositar el USDC ocioso del pool en un vault Kamino para rendimiento extra (liquidez instantánea salvo utilización extrema). **No está en devnet → roadmap post-hackathon**, se menciona en el pitch.
- **Yumi Finance — el competidor directo.** 1.º DeFi en Cypherpunk (dic-2025), accelerator Colosseum cohort 4. Checkout SDK/API para merchants, underwriting con datos on-chain + off-chain (zkTLS), vaults de LPs en USDC estilo ERC-4626, identidad con passkeys. Hoy "Yumi Labs: sistemas financieros para activos que los bancos no pueden evaluar". **Diferenciación nuestra**: escalera de anticipo 50→0% como narrativa visual simple, foco en red de comercios universitarios local (Tucumán) y rampa ARS; ellos van por infraestructura horizontal de underwriting.
- **Credix — la advertencia.** Crédito privado para fintechs LatAm con tramos senior/junior; explotado el 4-ago-2025 (~USD 4,5M) por una wallet con rol privilegiado comprometida (acuñó colateral falso y drenó pools); prometió reembolso, pivotó a "CrediPay" B2B Brasil y quedó con TVL ~0 e inactividad social. **Lección**: claves privilegiadas en multisig (Squads), permisos mínimos por instrucción, y tranche/reserva de pérdidas como diseño, no como promesa.

## 6. Recorte para la hackathon (9 días, 2 personas, devnet + Next.js)

Principio: el video de 3 minutos tiene que mostrar **una compra completa** (pool fondeado → comercio cobra al instante → estudiante paga cuota → sube de escalón) y **una mora** (punitorio + baja de escalón + reserva). Todo lo que no esté en ese camino, se simula o se menciona.

**Orden de construcción (programa primero, UI cuando el programa ya cierra):**

1. **Días 1–2 — Núcleo del programa**: `Config` + `Pool` + vault + `lp_deposit`/`lp_withdraw` + `Merchant` + `Reputation`. Tests con LiteSVM/Surfpool. Mint propio "devUSDC" en devnet.
2. **Días 3–4 — Flujo de compra**: `user_open_plan` (anticipo → comercio, adelanto del pool menos fee) + `ApproveChecked` al collector PDA + `user_pay_installment`. Acá muere o vive el demo.
3. **Día 5 — Morosidad y reputación**: punitorios, `crank_collect`, `crank_mark_default`, cambio de escalón. Keeper script permisionless.
4. **Días 6–7 — Frontend Next.js**: Phantom embedded (gratis, devnet) para estudiante; tres vistas: LP (depositar/retirar + NAV), checkout de compra (botón "pagar en cuotas"), dashboard del estudiante (plan, cuotas, escalón). Wallet del comercio = Phantom normal.
5. **Día 8 — Solana Pay QR** para pagar cuota + keeper corriendo + seeds/demo data + deploy Vercel.
6. **Día 9 — Video, repo, changelog** (el track ARG pide producto funcional + demo).

**Se construye de verdad**: el programa completo en devnet, la UI, el delegate/cobro, la reputación, el QR.

**Se simula**: KYC (flag `kyc_ok` manual), el off-ramp a pesos (pantalla/narrativa), TukTuk (keeper propio con la misma instrucción permisionless), el scoring real (tabla de escalones fija), USDC real (mint propio devnet).

**Roadmap a mencionar, no construir**: yield del pool ocioso en Kamino/Huma (mainnet), tramos senior/junior, insurance fund formal, TukTuk en mainnet, zkTLS/underwriting con datos externos (terreno de Yumi), multi-comercio con reputación cruzada.

---

## Fuentes

Consultadas el 2026-10-03. Se indica la fecha del contenido cuando la fuente la declara.

**Solana / Anchor / SPL**

- Solana Docs — Approve delegate: https://solana.com/docs/tokens/basics/approve-delegate
- Solana Docs — Revoke delegate: https://solana.com/docs/tokens/basics/revoke-delegate
- Solana Docs — Spend permissions (delegación, límites, revoke): https://solana.com/docs/payments/advanced-payments/spend-permissions
- SPL Token docs — Authority delegation: https://spl.solana.com/token
- Anchor v1.0.0 release notes (Solana 3.x, sin dep. del CLI solana): https://www.anchor-lang.com/docs/updates/release-notes/1-0-0
- Anchor repo / última release v1.2.0 (2026-09-04): https://github.com/solana-foundation/anchor/releases (redirige desde otter-sec/anchor)
- Circle — faucet testnet (20 USDC/2h; mint devnet `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`): https://faucet.circle.com/ y https://developers.circle.com/stablecoins/usdc-contract-addresses

**Automatización**

- Clockwork cesa operaciones (29-ago-2023; nodos off 31-oct-2023): https://crypto.news/clockwork-to-cease-operations-over-limited-commercial-viability/ ; guía archivada QuickNode que recomienda TukTuk: https://www.quicknode.com/guides/solana-development/legacy/automation-with-clockwork.md
- TukTuk docs (Helium): https://www.tuktuk.fun/docs ; repo: https://github.com/helium/tuktuk ; StackExchange "is clockwork obsolete" (respuesta del equipo Helium): https://solana.stackexchange.com/questions/17395/is-clockwork-framework-obsolete

**Wallets embebidas**

- Phantom Browser SDK / Phantom Connect: https://docs.phantom.com/sdks/browser-sdk ; network support Solana mainnet/devnet/testnet y restricciones embedded: https://github.com/phantom/wallet-sdk (README) y https://github.com/phantom/phantom-connect-cursor-plugin/blob/main/CLAUDE.md ; template oficial Solana: https://solana.com/developers/templates/phantom-embedded-react ; testnet mode: https://docs.phantom.com/developer-powertools/testnet-mode
- Privy — config de clusters Solana (mainnet/devnet/testnet): https://docs.privy.io/basics/react/advanced/configuring-solana-networks ; embedded wallets multi-chain: https://docs.privy.io/wallets/overview/embedded ; precios (fuente secundaria que verificó privy.io el 26-sep-2026): https://dappatlas.com/projects/privy/ y https://costbench.com/software/web3-wallet-sdk/privy/
- Para — Solana support (blog + docs con ejemplos devnet): https://blog.getpara.com/introducing-para-embedded-wallets-on-solana/ ; https://docs.getpara.com/v3/flutter/guides/solana
- Dynamic — setup embedded wallets con `@dynamic-labs/solana`: https://www.dynamic.xyz/docs/react/wallets/embedded-wallets/mpc/setup ; precios (secundaria): https://costbench.com/compare/dynamic-vs-privy/
- Web3Auth/MetaMask Embedded Wallets — Solana (chainNamespace SOLANA, devnet 0x3, sapphire_devnet): https://docs.metamask.io/embedded-wallets/connect-blockchain/solana/ y https://docs.metamask.io/metamask-connect/solana/quickstart/web3auth/

**Solana Pay**

- Overview: https://solana.com/docs/tools/solana-pay/overview ; QR: https://solana.com/docs/tools/solana-pay/quickstart/qr-codes ; transaction requests: https://solana.com/docs/tools/solana-pay/quickstart/transaction-requests y https://docs.solanapay.com/core/transaction-request/merchant-integration ; accept-payments: https://solana.com/docs/payments/accept-payments/solana-pay

**Rampas Argentina**

- Belo — redes soportadas (Solana para USDC depósito+retiro): https://help.belo.app/es/articles/5964418-cuales-son-las-redes-soportadas-por-belo
- Bitso — fees/redes USDC (Solana SPL): https://bitso.com/fees/transactions ; anuncio USDC-Solana (05-feb-2025): https://financialit.net/news/cryptocurrencies/bitso-expands-stablecoin-offering-enabling-usdt-polygon-and-usdc-solana
- Binance — USDC multi-red incl. Solana: https://usdc.org/directory/exchanges/binance
- Ripio — monedas/redes soportadas en la API (USDC Solana `SOL_USDC_PTHX`): https://docs.rio.trade/currencies ; retiros cripto + CVU ARS por API: https://apidocs.ripio.com/
- Lemon — centro de ayuda AR (no enumera redes; lemon.me/crypto da 404): https://help.lemon.me/es/articles/6577042-que-red-elijo-para-retirar-crypto ; art. Colombia que sí lista Solana: https://help.lemon.me/colombia/es/articles/11328167-que-red-selecciono-para-recibir-crypto
- Buenbit — solo TyC sin desglose de redes para USDC: https://buenbit.com/ar/tyc/terminos-y-condiciones-inversiones

**Protocolos**

- Huma — qué es (PayFi, permissionless desde abr-2025): https://docs.huma.finance/about-huma/what-is-huma ; PST USD 322M cap en Solana (15-sep-2026, ~7–9% APR, USD 17B acumulado): https://solanacompass.com/news/huma-finances-pst-crosses-322m-market-cap-solanas-largest-yield-bearing-asset ; CCIP (30-abr-2026): https://blog.huma.finance/huma-finance-selects-chainlink-ccip-to-power-cross-chain-yield ; nuevo capítulo (25-ago-2026): https://blog.huma.finance/huma-built-payfi.-now-institutions-build-on-huma
- Kamino — TVL/composición (DefiLlama, oct-2026): https://defillama.com/protocol/kamino-lend ; Risk Insights ago-2026 (APYs de vaults USDC, Institutional Yield): https://gov.kamino.finance/t/kamino-lend-monthly-risk-insights-august-2026/889
- Credix — exploit 04-ago-2025 (~USD 4,5M, rol BRIDGE comprometido): https://www.diariobitcoin.com/estafas/credix-protocolo-defi-registra-perdidas-por-usd-45-millones-tras-hackeo/ ; estado/pivote a CrediPay: https://solanacompass.com/projects/credix-finance ; TVL: https://defillama.com/protocol/credix
- Yumi Finance — portfolio Colosseum: https://colosseum.com/companies/yumi-finance ; cohort 4 del accelerator: https://www.linkedin.com/posts/markhee_announcing-colosseums-accelerator-cohort-activity-7412637235013152768-fvxS ; proyecto Colosseum (checkout SDK, zkTLS, vaults USDC): https://colosseum.com/projects/explore/yumi-finance ; sitio actual: https://www.yumi.finance/
