# 05 - Pitch (borrador video demo 3 min)

Estructura: slide 7 "Qué mira el jurado" (charla Bienvenidos): Equipo / Producto / Mercado / Negocio.
Orden en el video (vende mejor): Hook → Mercado → Producto (demo, lo más largo) → Negocio → Equipo + cierre.
Todo el voiceover en inglés simple. Direcciones en español.

## Historia en tres frases

1. In Argentina, millions of people with income have no credit card and no credit history — financing costs 61-388% a year.
2. We let them pay in 3 interest-free installments in USDC, backed by a guarantor with a capped, onchain-registered guarantee.
3. The store gets paid instantly, every loan and recovery is verifiable onchain, and each plan paid builds the buyer's portable onchain reputation.

## Guion video demo (3:00)

### 0:00-0:10 HOOK (cámara, plano pecho)
VOICEOVER: "In Argentina, millions of people earn money but can't access installments. No credit card, no credit history, no options. We built the rails to fix that."
VER: cara a cámara, fondo liso, gesto serio. Corte duro a pantalla.
ANIMADO: texto gigante "Income ≠ access to credit" → "3 installments, 0% interest".

### 0:10-0:40 MERCADO — "¿Cuánta gente lo necesita?"
VOICEOVER: "Over 40% of Argentina's economy is informal. Students and workers with real income have no credit history, so financing costs up to 388% a year — or they borrow someone else's card, exposing its full limit with zero protection for the owner and building no history of their own. We replace that with a formal guarantee: capped, registered onchain, and only charged on default."
VER: cámara 10s, después pantalla con comparador.
ANIMADO: "40% informal" + barra MP ~1,290 vs nosotros 1,000 (PC USD 1,000). Flecha "388% CFTEA" en rojo.

### 0:40-1:50 PRODUCTO — "¿Funciona y se puede usar?" (demo real, 70s)
VOICEOVER:
- (0:40) "Meet Luciano. He wants this PC for 1,000 dollars."
- (0:50) "His guarantor onboards in one minute: invitation link, ID verification with Didit, 1,000 dollar cap, backup card saved in sandbox. The guarantee hash goes onchain."
- (1:05) "Luciano pays a 300 dollar down payment with Phantom. Watch: the store receives 951 instantly. One transaction on devnet."
- (1:25) "He pays the first installment, 233 dollars in test USDC. Progress and tier, on his dashboard."
- (1:35) "Now he misses the second one. Days pass in seconds. Day 15: our keeper charges the guarantor's card, and registers the receipt hash onchain. Luciano drops a tier. The store already had its money since day one."
VER: screencast 1080p. Checkout → Phantom approve → Explorer (firmar + confirmada) → panel estudiante → reloj demo → aviso fiador → recupero onchain → Explorer del recupero.
ANIMADO: zoom al approve de Phantom; círculo en "951" del comercio; timeline días 1→6→15; highlight del receipt hash en Explorer.

### 1:50-2:25 NEGOCIO — "¿Cómo se sostiene?"
VOICEOVER: "Stores pay 7% of the financed amount — that's 4.9% of the price, cheaper than Cuota Simple at 5.4 and Mercado Pago at 12.5. They get paid instantly with zero default risk. Investors fund the pool in tranches: senior earns around 8%, junior takes the first loss. Every loan, payment and recovery is auditable onchain."
VER: pantalla panel comercio + panel pool. Cámara solo al final del bloque (5s).
ANIMADO: tabla 4.9% vs 5.4% vs 12.5% con check verde; diagrama pool junior/senior con flechas.

### 2:25-3:00 EQUIPO + CIERRE — "¿Son los indicados?"
VOICEOVER: "We're two builders from Tucumán. We researched this with real students: without a credit history, financing is either unaffordable or borrowed on someone else's card. This runs on Solana devnet with test USDC — real transactions, fake money. Interest-free installments for buyers, instant cash for stores, verifiable for everyone."
VER: cámara, los dos si pueden, plano pecho. Últimos 5s: logo + link + "devnet" en pantalla.
ANIMADO: lower-third con nombres + "UNT, Tucumán"; placa final con URL demo + Explorer + GitHub.

## Checklist grabación

- [ ] Screencast 1080p, cursor grande, reload antes de cada toma
- [ ] Audio con micrófono de cerca, cuarto silencioso
- [ ] Datos de ejemplo cargados (seed), reloj demo probado 3 veces
- [ ] Decir "devnet / test USDC / sandbox" a cámara (no presentar como plata real)
- [ ] Tomar Explorer real de cada transacción (2 links mínimo)

## Nota técnica: margen de crédito (divergencia mock ↔ programa)

Para el jurado y para quien retome el programa — que no quede escondida:

- **Lo que se ve en la demo:** el estudiante puede tener varios planes en paralelo, como el margen de una tarjeta de crédito: el `maxPurchase` del escalón hace doble función (tope por compra y línea total). `quote()` bloquea con `exceeds_credit_limit` cuando `activeExposure + repayable` supera ese margen (`app/src/lib/cuotas/mock.ts:95-105`).
- **Lo que hace el programa on-chain hoy:** fuerza **un solo plan por estudiante** — el `Plan` PDA se crea con seeds `[PLAN_SEED, student]` vía `init`, que falla si ya existe (`programa/programs/cuotas/src/instructions/open_plan.rs:146`). El cliente real (`app/src/lib/cuotas/real.ts`) mantiene la semántica vieja y emite `has_active_plan`.
- **Por qué:** la demo corre sobre el cliente mock (`NEXT_PUBLIC_CUOTAS_MODE=mock`); el margen de crédito se implementó solo ahí (decisión del equipo, `.scratch/demo-polish/spec.md` §"Divergencia conocida"). No afecta lo que se muestra porque nada en la demo pega al programa real todavía (pendiente Fase A3, ver `proyecto/handoff-demo-devnet.md`).
- **Evolución futura del programa (upgrade):** seeds `[PLAN_SEED, student, generation]` para permitir planes en paralelo + chequeo `active_exposure + repayable ≤ tope del escalón` en `open_plan`. Hasta entonces, el mock y el cliente real difieren en este punto.

✔ 4/6 (borrador). Pasos 1,2,3,5,6: [PENDIENTE].
