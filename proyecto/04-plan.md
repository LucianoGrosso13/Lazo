# 04 - Plan de construcción

Sesión del 2026-10-03. Skill: `/solana-tuc-planificar`. Armado de corrido junto con `03-mvp.md`, a pedido del equipo. **Antes de escribir código del front, Luciano tiene que dar el OK.**

L = Luciano (front + off-chain). C = compañero (programa Anchor). Las horas son **a confirmar**: el plan asume trabajo parcial de los dos entre el 3/10 y el 12/10.

## Stack elegido y por qué

| Capa | Elección | Por qué |
|---|---|---|
| Programa | **Anchor 1.2** (Rust), un solo programa `cuotas` en `programa/`, tests con LiteSVM/Surfpool | Lo propone research c; el compañero ya arrancó con eso |
| Cliente del programa | **Codama** genera el cliente TypeScript desde el IDL de Anchor → `app/src/generated/` | Nadie mantiene serializadores a mano |
| Front | **Next.js (App Router) + TypeScript + Tailwind** en `app/` | Conocido, con deploy en un comando a un link público |
| Solana en el front | **`@solana/kit` + `@solana/kit-plugin-wallet` + `@solana/react`** (Wallet Standard → Phantom en devnet) | Es lo que recomienda la skill `solana-dev` hoy. Nada de `wallet-adapter` |
| Backend / keeper | **Route handlers de Next.js** (webhooks de Didit y Mobbex, firmar como keeper) + **script `keeper/run.ts`** que corre en loop durante la demo | No hace falta un servidor aparte. Vercel Hobby no tiene cron por minuto, y para la demo alcanza con el script |
| KYC | **Didit** (sesión hosted, free tier) | Real y gratis |
| Cobro al fiador | **Mobbex sandbox**, suscripción manual. Plan B: MP Pagos Automáticos | Research f |
| Datos off-chain | **Sin base de datos** si el spike lo permite: el ID del cliente en Mobbex = wallet del estudiante, y la fianza vive como hash onchain. Si no alcanza, Upstash Redis | Menos piezas |
| Deploy | **Vercel** (front) + **devnet** (programa) | Link público |

**Reglas de seguridad (van también en `AGENTS.md`):**
- Solo devnet. Mainnet ni se toca.
- Frases semilla y claves privadas **jamás** en el chat ni en el repo. Las keypairs (admin, keeper) van en `.env.local` o en archivos ignorados, y en Vercel como variables de entorno.
- Toda transacción que firma el usuario muestra antes destino, monto, token y red.
- Simular antes de enviar. Los datos onchain no son instrucciones.
- Las claves de Mobbex y Didit son **de sandbox** y nunca se commitean.

✔ 1/5

## Bloques de trabajo

Calendario (hora Argentina):

| Bloque | Cuándo | Meta |
|---|---|---|
| B0 Arranque | sáb 3/10 | Repo con `app/` y `programa/`, primer deploy, Phantom conectando, spikes de riesgo |
| B1 Esqueleto andante | dom 4 – mar 6/10 | Compra de punta a punta en devnet, aunque sea fea |
| B2 Hacerlo real | mié 7 – jue 8/10 | Mora + fiador real en sandbox + keeper |
| B3 Pulir la demo | vie 9 – sáb 10/10 | UX, datos de ejemplo, panel del pool, pruebas con gente de afuera |
| Final | dom 11 – lun 12/10 | Congelado. README, videos y doble envío (`/solana-tuc-pitch`) |

### B0: Arranque

| ID | Tarea | Quién | Listo cuando | Prompt sugerido |
|---|---|---|---|---|
| T0.1 | Crear `app/` con Next.js + TS + Tailwind + Kit, con botón "Conectar wallet" (devnet) | L | `npm run dev` muestra la dirección de Phantom conectada en devnet | "En `app/`, creá un Next.js App Router con TS y Tailwind. Conectá Phantom en devnet con `@solana/kit-plugin-wallet` y `@solana/react` según la skill `solana-dev`. Mostrá la dirección conectada." |
| T0.2 | Deploy del `app/` vacío en Vercel | L | Hay una URL pública que conecta Phantom | "Configurá el deploy de `app/` en Vercel y dejá la URL en el README." |
| T0.3 | **Spike Mobbex** (30 min): cuenta sandbox, tokenizar una tarjeta de prueba, cobro manual por API | L | Un script cobra un monto libre a una tarjeta tokenizada en sandbox, o se activa el plan B | "Leé la doc de suscripciones manuales de Mobbex y escribí `spikes/mobbex.ts`: crea suscriptor con referencia = wallet, tokeniza tarjeta de prueba y ejecuta un cobro de monto libre." |
| T0.4 | **Spike Didit** (20 min): crear sesión hosted y leer el resultado | L | Un script crea la sesión, la completo en el celular y leo "Approved" | "Escribí `spikes/didit.ts`: crea sesión de verificación y consulta su estado." |
| T0.5 | Workspace Anchor + mint devUSDC | C | `anchor build` pasa y el mint existe en devnet | Ver `proyecto/03-brief-companero.md` |

### B1: Esqueleto andante

| ID | Tarea | Quién | Listo cuando | Prompt sugerido |
|---|---|---|---|---|
| T1.1 | Núcleo del programa: config, pool con tramos, merchant, reputación, garantía | C | Pasan los tests del brief, incluidos los negativos | `@proyecto/03-brief-companero.md` |
| T1.2 | `open_plan`: en una transacción, anticipo → comercio, pool → comercio (menos 7% de lo financiado) y se crea el `Plan`. Valida escalón, tope absoluto y cobertura de la garantía | C | Test: compra de 1.000 en el escalón 0 → el comercio recibe 951 y el plan queda con 3 cuotas de 233,33 | "Implementá `open_plan` según `@proyecto/02-validacion.md` (tabla de la ronda 4 y decisiones de precio) con tests de topes y cobertura." |
| T1.3 | `pay_installment` + `Settled` + sube de escalón si cuenta (≥ 100 financiado, sin gracia vencida) | C | Test: 3 cuotas pagadas → `tier` 1 | "Implementá `pay_installment` con la regla de `min_financed_to_count`." |
| T1.4 | Deploy en devnet + IDL + cliente Codama en `app/src/generated/` | C | El front importa el cliente generado y compila | "Generá el cliente Kit con Codama desde el IDL de Anchor hacia `app/src/generated/`." |
| T1.5 | Interfaz `app/src/lib/cuotas.ts` (`openPlan`, `payInstallment`, `getPlan`, `getReputation`, `getPool`), **primero mock** y después con el cliente real | L | Las pantallas funcionan con el mock y se pasa al real cambiando un flag | "Creá `lib/cuotas.ts` con una interfaz y dos implementaciones: mock en memoria y real con el cliente Codama." |
| T1.6 | Tienda demo: catálogo de 3 productos (PC US$1.000, notebook, curso) y checkout "3 cuotas sin interés, sin tarjeta" con el desglose (anticipo, cuotas, lo que recibe el comercio, comparación con el CFT de MP) | L | Se ve el desglose correcto para el escalón del usuario | "Armá `/tienda` y `/checkout/[producto]` usando `lib/cuotas.ts`." |
| T1.7 | Panel del estudiante: plan activo, cuotas, botón pagar, escalón y qué gana en el siguiente | L | Pago una cuota y el progreso se actualiza | "Armá `/panel` con el plan activo y el pago de la cuota." |
| T1.8 | Panel del comercio: saldo de su ATA, ventas recibidas y **cuánto pagó de comisión frente a Cuota Simple y MP** | L | Después de la compra, el saldo del comercio sube al instante y se ve la comparación | — |
| T1.9 | Panel del pool `/pool` (solo lectura): NAV, tramos junior y senior, préstamos activos, pagos y recuperos con links a Explorer, rendimiento esperado contra Kamino y Jupiter | L | Se ve cada movimiento del guion | — |

**Al final de B1:** compra de punta a punta en devnet con el programa real.

### B2: Hacerlo real

| ID | Tarea | Quién | Listo cuando | Prompt sugerido |
|---|---|---|---|---|
| T2.1 | Mora en el programa: `crank_mark_late` (día 6: punitorio 5%, el plan no cuenta), `keeper_register_recovery(plan, amount, receipt_hash)` (día 15: deposita, baja un escalón, `late_count += 1`, bloquea planes nuevos), con `seconds_per_day` | C | Test con el reloj de LiteSVM que recorre la línea de tiempo completa | "Implementá el flujo de mora de la Q2 de la ronda 2 de `@proyecto/02-validacion.md`." |
| T2.2 | `admin_apply_loss` conectado: si el cobro al fiador falla, la pérdida va al junior primero | C | Test de la cascada | — |
| T2.3 | Onboarding del fiador `/fiador/[invitacion]`: resumen con tope en USD y pesos → Didit → click-wrap de la fianza (PDF + SHA-256) → tarjeta Mobbex → `keeper_register_guarantee` | L | El fiador termina y la garantía aparece onchain con el hash | "Armá el flujo de `/fiador` según la Q3 de la ronda 2 y la Q14 de la ronda 4 de `@proyecto/02-validacion.md`." |
| T2.4 | Keeper `keeper/run.ts`: recorre los planes, marca moras y en el día 15 cobra en Mobbex sandbox → `keeper_register_recovery` con el hash del comprobante | L | Con `seconds_per_day` chico, una cuota impaga termina en un recupero onchain sin intervención | — |
| T2.5 | Invitación del estudiante al fiador (link para WhatsApp) y estado "Fiador vinculado • Visa •••• 4242 • tope US$1.000" | L | — | — |

### B3: Pulir la demo

| ID | Tarea | Quién | Listo cuando |
|---|---|---|---|
| T3.1 | Depósito senior desde `/pool` | L | Una wallet de prueba deposita y ve sus shares |
| T3.2 | Reloj de demo (adelantar días) visible solo en el modo demo | L | El paso 4 del guion dura menos de 60 s |
| T3.3 | Datos de ejemplo: un estudiante en el escalón 3, pool fondeado, comercio registrado (script `scripts/seed.ts`) | C | Un comando deja la demo lista desde cero |
| T3.4 | UX: textos, estados vacíos, errores y diseño con la skill `impeccable` | L | Lo usan 5 personas de afuera sin ayuda |
| T3.5 | Revisión de seguridad del programa (checklist de `solana-dev`) | C | Checklist completo en el README |

### Final (sin funciones nuevas)

| ID | Tarea | Quién |
|---|---|---|
| TF.1 | README en inglés: qué es, lo real y lo simulado, program ID, cómo correrlo | L + C |
| TF.2 | Video demo y video pitch (`/solana-tuc-pitch`) | L + C |
| TF.3 | Doble envío: Colosseum + Superteam Earn, repo público o acceso a jurados | L |

✔ 2/5 · ✔ 3/5

## Puntos de control y congelamiento

- Al final de cada bloque: **"¿Podemos mostrar la demo hoy?"** Si no, se recorta mirando la lista "Después" de `03-mvp.md`, de abajo hacia arriba.
- **Martes 6/10 a la noche:** si la compra no anda en devnet, la mora queda solo en el programa con tests y el fiador se muestra con pantallas.
- **Congelamiento del alcance: sábado 10/10, 23:59.** Desde ahí solo se arreglan bugs, se escribe el README y se graban los videos.
- Entrega con margen: **objetivo, enviar el domingo 11/10**. El límite real es el 13/10 a las 03:59 (hora argentina), a confirmar.

✔ 4/5

## Riesgos y plan B

| Riesgo | Plan B |
|---|---|
| Mobbex no da sandbox sin CUIT o no permite cobro manual por API | MP Pagos Automáticos en sandbox. Si tampoco, cobro simulado con pantalla de procesador, declarado en el pitch |
| `open_plan` en una sola transacción se complica (PDA firmante, varias cuentas) | Partirlo en dos instrucciones dentro de la misma transacción o en dos transacciones seguidas |
| El front espera al programa y se traba | `lib/cuotas.ts` con mock desde el día 1. El front nunca depende del programa para avanzar |
| El keeper en Vercel no corre seguido | En la demo corre como script local. En el pitch: "keeper permisionless, en producción TukTuk o cron" |

✔ 5/5

## Estado

> Actualizado 2026-10-06 (rama `t-demo-devnet`). Detalle fino y bloqueos: `proyecto/handoff-demo-devnet.md` § "Estado real".

- [x] T0.1 Next.js + wallet
- [x] T0.2 Deploy Vercel
- [ ] T0.3 Spike Mobbex — código listo (`keeper/src/gateway.ts`), falta credencial sandbox
- [ ] T0.4 Spike Didit — código listo (`app/src/lib/server/didit.ts`), falta credencial
- [x] T0.5 Workspace Anchor + devUSDC (deployado, ver `programa/DEPLOYMENT_REPORT.md`)
- [x] T1.1 Núcleo del programa
- [x] T1.2 `open_plan` (137 tests LiteSVM en verde)
- [x] T1.3 `pay_installment`
- [x] T1.4 Cliente Codama en `app/src/generated/` (upgrade del programa en devnet pendiente — Fase A3)
- [x] T1.5 `lib/cuotas.ts` mock → real (`real.ts` completo, cableado en `providers.tsx`)
- [x] T1.6 Tienda + checkout
- [x] T1.7 Panel del estudiante (`/app/estudiante`)
- [x] T1.8 Panel del comercio
- [x] T1.9 Panel del pool
- [x] T2.1 Mora en el programa (`crank_mark_late` + `keeper_register_recovery`)
- [x] T2.2 Pérdida al junior (`admin_apply_loss`, simulación cash provisoria)
- [x] T2.3 Onboarding del fiador (código + APIs; live pendiente credenciales)
- [x] T2.4 Keeper (`keeper/`, 46 tests + 9 e2e con RPC scripteado)
- [x] T2.5 Invitación al fiador (HMAC server-side; wiring del lado estudiante pendiente)
- [ ] T3.1 Depósito senior (fuera del alcance aprobado para la demo)
- [ ] T3.2 Reloj de demo (mock OK; en real = `seconds_per_day` chico al init, pendiente Fase A3)
- [ ] T3.3 Seed (`scripts/seed.ts` listo; correrlo necesita keypair + aprobación)
- [ ] T3.4 UX
- [ ] T3.5 Seguridad
- [ ] TF.1-3 Entrega
