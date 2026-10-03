# Handoff: desarrollo del front (Luciano)

Escrito el 2026-10-03 para retomar el desarrollo en una sesión nueva. El repo es `https://github.com/LucianoGrosso13/hackaton-solana-cuotas` (privado). El usuario escribe en español rioplatense y quiere un sparring directo. **Antes de cualquier acción grande o hacia afuera** (deploy, cuentas de terceros, push a `main`), avisarle y esperar el OK.

## Leer antes de tocar nada (no se repite acá)

1. `AGENTS.md`: reglas, stack y convenciones.
2. `proyecto/03-mvp.md`: guion de la demo, **los tres beneficios**, qué entra y qué es real o simulado.
3. `proyecto/04-plan.md`: tareas con ID, criterio de listo y estado.
4. `proyecto/02-validacion.md`: todas las decisiones de diseño. Las que importan para el front: ronda 2 (Q2 mora, Q3 onboarding del fiador), ronda 4 (tabla de escalones, Q14 tope del fiador) y las **decisiones de precio Q15-Q16** (0% interés, 7% al comercio, cuotas en USDC).

## Estado al 2026-10-03

- Diseño cerrado (grilling, rondas 1 a 4 + precio). MVP y plan escritos.
- El compañero arranca con el programa Anchor (`proyecto/03-brief-companero.md`, tareas C del plan). **Todavía no hay programa desplegado ni IDL.**
- Todavía no hay código del front. No hay cuentas de Mobbex ni de Didit, ni proyecto en Vercel.

## Tu trabajo (en este orden)

Rama `front-esqueleto`, sin tocar `main`. PR al final.

1. **T0.1** `app/`: Next.js App Router + TS + Tailwind, con Phantom en devnet vía `@solana/kit` + `@solana/kit-plugin-wallet` + `@solana/react`. **Usar la skill `solana-dev`** (ya está en `.claude/skills/`) y su `references/frontend.md`. Nada de `@solana/wallet-adapter-*`.
2. **T1.5** `app/src/lib/cuotas.ts`: interfaz única hacia la cadena con dos implementaciones, **mock** (en memoria/localStorage, con el reloj de demo) y **real** (cliente Codama, se conecta cuando el compañero publique el IDL). Funciones mínimas: `getConfig`, `getReputation(wallet)`, `getGuarantee(wallet)`, `quote(precio, wallet)`, `openPlan`, `payInstallment`, `getPlans`, `getMerchant`, `getPool`, `advanceDays(n)` (solo en el mock o en modo demo). Los nombres tienen que espejar las instrucciones del brief del compañero.
3. **T1.6** `/tienda` + `/checkout/[producto]`: catálogo con 3 productos (PC US$1.000, notebook US$650, curso US$120). En el checkout, el desglose: anticipo, 3 cuotas, total y **comparación con MP**.
4. **T1.7** `/panel`: plan activo, cuotas, botón de pago, escalón y "qué ganás en el próximo escalón".
5. **T1.8** `/comercio`: saldo, ventas y **cuánto pagó de comisión frente a Cuota Simple y MP**.
6. **T1.9** `/pool`: NAV, junior y senior, préstamos, pagos y recuperos con link a Explorer, y rendimiento esperado frente a Kamino y Jupiter.
7. Reloj de demo (T3.2) desde el mock: un control "adelantar N días" que dispara la línea de tiempo de la mora.

Las tareas que dependen del usuario (T0.2 Vercel, T0.3 spike Mobbex, T0.4 spike Didit) **se piden, no se hacen solas**: el usuario abre las cuentas y pone las claves en `app/.env.local`. Nunca se pegan en el chat.

## Los tres beneficios: la regla de todas las pantallas

Cada pantalla clave muestra un beneficio con números, al lado de la alternativa:
- **Estudiante** (checkout, panel): **0% de interés**, sin tarjeta propia, sin usar el límite del familiar. PC de 1.000 → paga 300 + 3 × 233,33 = 1.000, contra ~1.290 reales en MP (CFTEA 61-388%). La escalera baja el anticipo y sube el tope.
- **Comercio** (`/comercio`): cobra **al instante**. Comisión de 7% sobre lo financiado = 4,9% del precio en el escalón 0, contra 5,41% de Cuota Simple y ~12,49% de MP. Sin riesgo de mora. GOcuotas paga a 22 días hábiles.
- **Pool** (`/pool`): rendimiento en USD respaldado por fiadores, en tramos, todo auditable onchain. Senior objetivo ~8% (Kamino ~6%, Jupiter ~5%).

Las cifras de terceros son **sin verificar en la fuente oficial** (ver `02-validacion.md`). En la UI, citarlas como "referencia".

## Reglas de negocio para el mock (fuente: `02-validacion.md`)

- Escalones con fiador (anticipo / cobertura exigida / tope absoluto): 0 = 30% / 100% / 1.000; 1 = 20% / 90% / 1.000; 2 = 10% / 80% / 1.250; 3 = 0% / 70% / 1.500. Sin fiador: S0 = 50% / 150; S1 = 30% / 300. Interés 0% en todos.
- Una compra pasa si precio ≤ tope del escalón **y** cobertura × financiado ≤ `coverage_max` del fiador.
- Lo que cobra el comercio = precio − 7% × financiado. Cuota = financiado / 3.
- Para subir, el plan tiene que financiar ≥ 100 y pagarse sin pasar la gracia.
- Mora: días 1-5 de gracia (día 3, aviso al fiador) → día 6, punitorio de 5% sobre la cuota vencida → día 15, cobro al fiador, baja de escalón, `late_count + 1` y no puede abrir planes nuevos.

## Criterio de listo de este handoff

- `npm run dev` en `app/`: Phantom conecta en devnet y, **con el mock**, se completa el guion del `03-mvp.md` (compra → cuota → mora → recupero → pool) en menos de 3 minutos.
- `npm run build` y `npm run lint` pasan.
- `proyecto/04-plan.md § Estado` tiene tildadas las tareas hechas.
- El PR de `front-esqueleto` está abierto, con capturas.

## Skills útiles

`solana-dev` (Kit, wallet, Codama), `impeccable` (UX de las pantallas, pasada en B3), `nextjs`.
