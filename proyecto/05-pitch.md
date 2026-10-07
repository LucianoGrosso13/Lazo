# 05 — Pitch y entrega de Lazo

Actualizado 2026-10-07 (tanda "producto final", ticket 14). Fuente de números y decisiones: `.scratch/producto-final/spec.md` § "Decisiones". Los guiones de video van en inglés (la entrega es en inglés); las instrucciones internas, en español. Textos listos para pegar en el formulario: [`05-entrega-en.md`](05-entrega-en.md).

Lazo **corre en Solana devnet** (la red de prueba de Solana: la plata es de prueba y no vale nada). Nunca mainnet. Decirlo en los dos videos y en el formulario.

## Fuentes de entrega y consejos de From the chapter

Consultadas el 7/10/2026:

- [Road to Colosseum, entrega](https://superteam.ar/colosseum#entrega): pitch de 2 minutos, demo hasta 3, nombre/descripción, imagen, herramientas, repo, validación/distribución y equipo. Repo privado: habilitar revisión para hackathon@superteam.ar y hackathon@colosseum.com. Envío en Colosseum y Earn. Cierre del track según esa página: **12/10 a las 23:59 de Argentina**; preparar todo para ese horario. (El spec anota "límite 13/10 03:59 ART, a confirmar": ante la duda, vale el horario más temprano.)
- [Listing del track](https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-argentina-track): mostrar producto accesible, evidencia, punto de partida, changelog, aportes y uso material de IA.
- [Colosseum FAQ](https://colosseum.com/hackathon): presentación de 2–3 minutos y demo máximo 3. Usamos 2 para cumplir también Superteam. Evaluación: equipo/mercado, insight, ejecución, tamaño potencial, comunicación, viabilidad y tracción.
- [What a winning hackathon submission looks like](https://superteam.ar/blog/hackathon-submission-that-wins): abrir con producto funcionando, mostrar un recorrido corto y el motivo de usar cadena; probar link móvil/incógnito, repo e instrucciones antes de entregar.
- [Pitching when every deck is AI-generated](https://superteam.ar/blog/pitching-in-the-ai-era): empezar por una persona concreta; respaldar afirmaciones con evidencia y reconocer qué sigue incierto. El equipo aporta su voz y sus datos; la IA ayuda a cuestionar y editar.
- [How to pitch, when nobody knows who you are](https://superteam.ar/blog/how-to-pitch): explicar el resultado en una frase entendible, ordenar problema/solución/aprendizaje y terminar con un pedido concreto. Su ejemplo de mainnet no aplica: Lazo sigue solo en devnet.

## Historia

**El problema.** En Argentina, comprar en cuotas es la forma normal de acceder a algo que cuesta más que un sueldo o que una mensualidad. Pero las cuotas sin interés viven en la tarjeta de crédito, y un estudiante joven no suele tenerla: no está bancarizado o no tiene historial. Le quedan tres caminos: pedir prestada la tarjeta de un familiar, pagar la alternativa de cuotas sin tarjeta (con un costo financiero mucho más alto) o no comprar. Y en ninguno construye un historial propio.

**Lo que ya pasa.** En el test de mesa del equipo (3 personas del entorno, `02-validacion.md`), dos resolvieron con la tarjeta de los padres y descartaron la alternativa sin tarjeta por el costo; la tercera no compró. Es una muestra chica y casi interna: la contamos como indicio, no como validación.

**La idea.** Lazo formaliza el "prestame la tarjeta": el familiar no presta el plástico, **firma como fiador**. El estudiante paga sus propias cuotas en dólares digitales (USDC: un token que sigue el valor del dólar; en devnet usamos devUSDC, un token de prueba propio). El fiador solo paga si el estudiante no paga. Cada plan pagado a tiempo sube al estudiante de Tier, con menos anticipo y más tope.

**One-liner:** "Lazo lets students without a credit card buy in installments, backed by a family guarantor, and build their own payment history on Solana."

### El producto decidido

| Pieza | Regla |
|---|---|
| Cuotas | **3 cuotas sin interés** (sin mínimo) o **6 cuotas con 3% de interés total** sobre lo financiado, **desde US$ 350** (mínimo configurable) |
| Fiador | **Obligatorio: sin fiador no hay plan.** Cubre el **100% de lo que falta pagar** (capital + interés); el recargo por mora queda afuera. Paga solo si el estudiante no paga |
| Tiers | **Tier 1 · Starter** (anticipo 30%, tope US$ 1.000), **Tier 2 · Steady** (20%, US$ 1.000), **Tier 3 · Trusted** (10%, US$ 1.250), **Tier 4 · Full** (0%, US$ 1.500). Todos con fiador al 100% |
| Reglas de Tier | Subís 1 Tier al saldar un plan con financiado ≥ US$ 100 sin pagos después de la gracia. Si pagaste después de la gracia, ese plan no suma ni resta. Bajás 1 Tier si se le cobra al fiador |
| Mora | Día 0 vence la cuota · días 1–5 de gracia sin recargo · día 3 aviso al fiador · día 6 recargo del 5% sobre la cuota vencida · día 15 se le cobra al fiador (cuota + recargo) y el estudiante baja 1 Tier |
| Cobro del comercio | El anticipo lo cobra siempre en el momento. Lo financiado, según elija: **hoy 7%** · **30 días 6,25%** (100% el día 30) · **60 días 5,75%** (50% día 30, 50% día 60) · **90 días 5,25%** (⅓ a los 30, 60 y 90 días). Comisión sobre lo financiado. **Lazo garantiza cada tramo en su fecha**, pague o no el estudiante |
| Liquidez | No se abre un plan si el pool no tiene liquidez libre para el desembolso de hoy más todos los tramos ya comprometidos |
| Venta en mostrador | El cajero carga monto y descripción, muestra un QR (un link de Lazo, no un QR de pagos interoperable) y el cliente confirma en su celular con su fianza vigente |

**Ejemplo base (compra de US$ 1.000, Tier 1 · Starter):** anticipo 300, financiado 700.
- 3 cuotas: 3 × 233,33; total 1.000.
- 6 cuotas: interés 21; 6 cuotas que suman 721 (≈ 120,17 cada una); total 1.021. El fiador cubre hasta 721.
- Comercio: hoy cobra 951 · a 30 días 300 hoy + 656,25 el día 30 · a 60 días 300 hoy + 2 × 329,875 · a 90 días 300 hoy + 3 tramos de ≈ 221,08 (663,25 en total).

**Modelo de negocio.** Ingresos: comisión del comercio (5,25–7% sobre lo financiado según el plazo) e interés de 6 cuotas. Reparto registrado (D8): 4% de originación sobre lo financiado para Lazo, incluido en la comisión, y 2% anual de administración sobre saldo, a cargo del pool. Las comisiones por plazo salen de un modelo que deja a Lazo con el mismo margen que cobrar hoy (comisiones neutras con tramos: 6,10 / 5,65 / 5,23% en 3 cuotas; `10-tasa-6-cuotas-y-cobro-diferido.md`). Pool: tesorería del equipo en devnet; tramo junior (primera pérdida) y senior con **rendimiento objetivo del 8%** (objetivo, no resultado).

**Supuestos del modelo (hipótesis, no métricas medidas):** anticipo 30%, default 8%, recupero del fiador 80%, costo de capital 12% anual. Con eso, 6 cuotas al 3% cubren su costo desde ~US$ 217 para un cliente nuevo (al 2% harían falta ~US$ 267): por eso el mínimo de US$ 350. Ninguna tasa salva el escenario adverso (default 20%, recupero 50%); lo que decide es el fiador y los topes.

**Lo que tiene que resultar cierto (hipótesis a validar):** que los comercios paguen esta comisión por vender a quien no tiene tarjeta; que estudiantes y fiadores completen el alta; que el recupero real sobre la tarjeta del fiador deje margen; que una billetera argentina acepte distribuirlo. Investigación y experimentos: `07-go-to-market-y-alianzas.md` y `08-minorista-y-economia.md`.

**Qué viene (solo dos cosas):** billeteras argentinas como canal de distribución y conversión pesos↔USDC (candidatas a investigar, **ninguna alianza**), y una tesorería propia en DeFi, simulada y separada del pool.

## Video de pitch — 2:00

Unas 260 palabras con pausas. Equipo en cámara al principio y al final; producto en pantalla en el medio. Sin animación de logo al arrancar. Lo dice quien esté más cómodo; no contar la anécdota de la PC.

| Tiempo | Pantalla | Guion EN |
|---|---|---|
| 0:00–0:18 | Luciano e Ignacio en cámara | "In Argentina, installments are how people buy anything that matters. But interest-free installments live on credit cards, and a student without their own card is left out. They borrow a parent's card, pay a much higher cost for no-card installments, or simply don't buy." |
| 0:18–0:38 | Home de Lazo, hero | "We're Lazo. Students pay in three interest-free installments, or six with a three percent total charge, from three hundred fifty dollars. A family member doesn't lend their card: they sign as guarantor, and they're only charged if the student stops paying." |
| 0:38–0:58 | Checkout 6 cuotas + Tiers | "No guarantor, no plan: that's what makes the numbers work. The guarantor covers exactly what's left to pay, nothing more. Every plan paid on time moves the student up a Tier, from Starter to Full: a lower down payment and a higher limit." |
| 0:58–1:18 | Cuenta del comercio con tramos | "Merchants choose when to get paid: today for seven percent of the financed amount, or in monthly tranches over thirty, sixty or ninety days, down to five and a quarter. Lazo guarantees every tranche on its date, whether the student pays or not." |
| 1:18–1:38 | Pool y registro en Explorer de devnet | "Why Solana? The plan, the pool and the merchant's payout schedule are public accounts anyone can audit, and the student's Tier travels with their wallet to any store. Lazo runs on Solana devnet, with test dollars." |
| 1:38–1:50 | Mostrador con QR | "And it works at the counter: the cashier shows a QR, the student confirms on their phone." |
| 1:50–2:00 | Equipo en cámara | "We're Luciano and Ignacio, computer engineering students at UNSTA in Tucumán. We're looking for merchants and an Argentine wallet to run a small pilot with us." |

Antes de grabar: confirmar que la toma de Explorer (1:18) muestra una cuenta real del programa en devnet; si el upgrade todavía no está, mostrar el program ID y el pool del simulador y cambiar la frase por "The program is deployed on Solana devnet". No mostrar logos de billeteras ni decir "partnered with".

## Video demo — 3:00

Un solo recorrido en pantalla, controles visibles, sin cortes que escondan errores. Grabar desde la URL pública o `localhost` en modo simulador. Verificar antes de cada toma que el aviso de devnet esté visible.

| Tiempo | Acción visible | Voiceover EN |
|---|---|---|
| 0:00–0:12 | Home, línea de devnet del hero, "Probalo en 2 minutos" | "This is Lazo, running on Solana devnet with test dollars. The web app includes a built-in simulator, so you can try the full flow without a wallet." |
| 0:12–0:35 | Fiador: link de invitación, cobertura, aceptación | "First, the guarantor. A student invites a family member by link. The guarantor sees exactly what they cover: one hundred percent of what's left to pay, principal plus interest, never late fees. Identity check and card registration run in sandbox mode." |
| 0:35–1:05 | `/tienda` → producto de 1.000 → checkout, Tier 1 · Starter, 3 vs 6 cuotas | "Now the student buys a thousand-dollar item at Tier 1, Starter: three hundred down, seven hundred financed. Three installments, no interest, total one thousand. Or six installments at three percent total: twenty-one dollars of interest, one thousand twenty-one in total. Under three hundred fifty dollars, the six-installment option is locked, and without an active guarantor the plan won't open." |
| 1:05–1:25 | Elegir cobro a 90 días; calendario de tramos | "The merchant chose to get paid over ninety days, at five and a quarter percent. They get the down payment today and three tranches of about two hundred twenty-one dollars on days thirty, sixty and ninety. That schedule is a commitment recorded at purchase." |
| 1:25–2:05 | Reloj de demo: leyenda; adelantar 30 días; dejar vencer una cuota hasta el día 15 | "This clock moves time forward. At day thirty, the first tranche is released to the merchant. Now the student misses a payment: five days of grace with no surcharge, the guarantor is notified on day three, a five percent surcharge on day six, and on day fifteen the guarantor's card is charged and the student drops one Tier. The merchant's next tranche is still paid on time." |
| 2:05–2:35 | `/app/comercio/mostrador`: monto, QR, "Abrir como cliente", confirmar, venta pagada | "In-store sales work the same way. The cashier enters an amount, Lazo shows a QR, and the student scans it and confirms with their existing guarantee. The sale shows up instantly on the merchant's panel." |
| 2:35–3:00 | Tiers y reglas; sección "Qué corre en la cadena y qué en el simulador"; program ID | "Every rule is visible: how to move up a Tier and what moves you down. Here is what runs on chain and what runs in the simulator. Lazo runs on Solana devnet, never mainnet. Thanks for watching." |

Reglas para la grabación:
- No mostrar como "en la cadena" algo que en la toma corre en el simulador. Si se muestra Explorer, que sea una transacción u operación realmente observada en devnet; un hash no prueba identidad, cobro de tarjeta ni recupero.
- Si alguna pantalla del mostrador o de tramos no quedó mergeada al momento de grabar, cortar ese bloque y redistribuir el tiempo; no simularlo con capturas.
- Toda firma o envío de transacciones para la toma necesita aprobación explícita de Luciano.

## Equipo

Mismos datos que la sección "Quiénes somos" de la web (ticket 06):

- **Luciano Grosso**, 22 · Product Owner.
- **Ignacio Albarracín**, 22 · Full Stack Developer.
- Los dos estudian Ingeniería en Informática en la Universidad del Norte Santo Tomás de Aquino (UNSTA), en Tucumán, Argentina; se reciben en diciembre de 2026. Son amigos desde hace años.
- Aportes de cada uno al repo para el formulario: [A CONFIRMAR].
- Uso de IA (lo pide el listing): el equipo construyó con agentes de código (Claude Code como coordinador y workers Devin y Gemini en worktrees, ver `04-plan.md` § Estado) bajo su revisión. Declararlo tal cual.

## Preguntas duras para ensayar

Respuestas cortas de borrador, con la fuente al lado. Si una respuesta no tiene fuente, se dice "no lo sabemos todavía".

1. **¿Por qué no usa directamente la tarjeta de un familiar con cuotas sin interés?** Porque no todos tienen un familiar con tarjeta que la preste, la promo sin interés no está en todos lados y prestarla consume el límite del familiar en cada compra. Con Lazo el familiar no presta nada: solo paga si hay impago, y el estudiante construye su propio historial (02, ronda 3).
2. **¿Cómo garantizan los tramos del comercio si el estudiante no paga?** Al abrir el plan se registra el calendario de tramos a favor del comercio; la plata queda en el pool y se libera en cada fecha (la libera el keeper o la reclama el comercio). El riesgo de crédito lo asume el pool, que recupera del fiador. El tramo se paga aunque el estudiante esté en mora.
3. **¿Y si el pool se queda sin liquidez?** Regla dura: no se abre un plan nuevo si la liquidez libre no alcanza para el desembolso de hoy más todos los tramos comprometidos, y los retiros de inversores no pueden dejar el pool por debajo de lo comprometido. Hoy el pool es tesorería del equipo en devnet; capital de terceros solo con un régimen regulado (02, hallazgo 5).
4. **¿Por qué 6 cuotas recién desde US$ 350?** Porque 6 cuotas inmoviliza el capital casi el doble de tiempo que 3. Con los supuestos del modelo, al 3% una compra de un cliente nuevo cubre su costo desde ~US$ 217; 350 deja margen. Es configurable y se recalibra con datos reales (10).
5. **¿Por qué no hay plan sin fiador?** Porque el modelo solo cierra con fiador: en el análisis del 3/10, con 30% de mora (cerca de la irregularidad del crédito no bancario argentino, 26,9% en feb-2026) el mismo libro perdía ~48% anual sin fiador y rendía ~+20% con fiador (hipótesis de recupero 80%). Además, con anticipo alto y sin respaldo, alguien se lleva el producto y no paga el resto (02, hallazgos 3 y D).
6. **¿Qué pasa si el cargo al fiador falla o lo desconoce?** Pasa: el 83–86% de los desconocimientos de cargos se resuelve a favor del titular de la tarjeta (BCRA, 2025, en 02). Por eso la cobertura es una fianza escrita con tope y el recupero del 80% es una hipótesis, no un dato. La primera pérdida la absorbe el tramo junior.
7. **¿Por qué un comercio pagaría hasta 7%?** Porque vende a alguien que hoy no le compra, y puede bajar a 5,25% si espera en tramos. Las comisiones de referencia del mercado varían mucho según el canal; no afirmamos ser más baratos. Falta validarlo con comercios reales: no tenemos ninguno firmado.
8. **¿Para qué Solana?** El plan, el pool y el compromiso de cobro del comercio son cuentas públicas que cualquiera audita, y el Tier del estudiante (solo Tier y contadores, nunca el detalle de cada compra) es legible por cualquier comercio. Identidad, tarjeta y conversión a pesos quedan fuera de la cadena, con proveedores.
9. **¿Qué validaron con usuarios reales?** Solo un test de mesa de 3 personas del entorno. No hay ventas, comercios aliados ni tracción. La próxima prueba es un piloto chico con estudiantes, fiadores y comercios de Tucumán.
10. **¿Y el riesgo cambiario?** La deuda está en USDC; el estudiante puede pagar en pesos al tipo del día y asume ese riesgo en plazos cortos. Se muestra claro en el checkout. Cuotas fijas en pesos quedan fuera del MVP.

## Nota técnica: qué corre en la cadena y qué en el simulador

Para el jurado y para quien retome el código. Misma información que la sección de la web.

**En la cadena (programa `cuotas`, Anchor, Solana devnet, program ID `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`):**
- Pool con tramos junior y senior, `open_plan`, `pay_installment`, mora (`crank_mark_late`), registro del recupero del fiador, reputación (Tier y contadores) y registro de la garantía (hash de la fianza).
- Ticket 02: **3 y 6 cuotas** (`open_plan(price, installments)`, hasta 6 slots), **fiador obligatorio** (`GuarantorRequired`), **cobertura con interés** (`required_coverage = financiado + interés`) y mínimo por opción. Se quita el tramo sin fiador.
- Ticket 03, **si entra**: cuenta `PayoutSchedule` con los tramos del comercio, `release_payout` (cualquiera puede llamarla en fecha), `Pool.committed_payouts` y error `PoolLiquidity`. Estado al cierre: [A CONFIRMAR: si 03 se mergeó].
- Estado del deploy: el binario que corre hoy en devnet es el anterior al ciclo de crédito; el upgrade y la inicialización de la config los aprueba Luciano aparte (`programa/UPGRADE_DEVNET.md`). Si al grabar o entregar ya está hecho: [A CONFIRMAR: upgrade e init en devnet con las 6 cuotas].

**En el simulador (cliente mock del navegador, el que usa la web pública):**
- El recorrido completo para el jurado, sin wallet ni tarjeta: checkout 3/6 cuotas, Tiers, mora y cobro al fiador, cuentas de estudiante, fiador, comercio y pool.
- **Reloj de demo** para adelantar días.
- **Venta en mostrador con QR** (solo simulador; el cliente real responde `option_unavailable`).
- **Cobro en tramos** del comercio, si 03 no entró en la cadena.
- Identidad (Didit) y cobro a la tarjeta del fiador (Mobbex): código listo, en modo sandbox; credenciales y flujo real pendientes.
- Comercios del marketplace: de ejemplo.

**Divergencia conocida que sigue:** el simulador permite varios planes en paralelo dentro del tope del Tier (como el margen de una tarjeta); el programa permite **un plan activo por estudiante** (`Plan` PDA con seeds `[PLAN_SEED, student]`). Evolución prevista: seeds con generación y chequeo de exposición total en `open_plan`.

## Checklist de entrega

- [ ] Pitch 2:00 y demo ≤ 3:00, en inglés, audio claro, links públicos.
- [ ] Formulario: pegar [`05-entrega-en.md`](05-entrega-en.md); revisar cada `[A CONFIRMAR]` antes de enviar.
- [ ] Repo con acceso para hackathon@superteam.ar y hackathon@colosseum.com si es privado; README en inglés con modo simulador, instrucciones y program ID.
- [ ] Evidencia y GTM: solo el test de mesa y la investigación; metas separadas de resultados; sin alianzas.
- [ ] Punto de partida, changelog, aportes de cada integrante y uso material de IA.
- [ ] Doble envío Colosseum + Earn; guardar comprobantes. Cierre 12/10 23:59 ART.
- [ ] Probar el link en celular e incógnito y repetir "Probalo en 2 minutos" sin ayuda.
