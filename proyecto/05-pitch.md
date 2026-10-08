# 05 — Pitch y entrega de Lazo

Actualizado **2026-10-07**, revisión del relato pedida por Luciano: trabajadores informales y estudiantes sin acceso a crédito; equipo al inicio; cobro inmediato y QR; distribución mediante fintech como cierre propuesto. Los guiones van en inglés; las notas internas, en español. **Borrador para ensayar**, no anuncio comercial ni envío de formulario.

Fuente de condiciones: `06-decisiones-comerciales.md` y `10-tasa-6-cuotas-y-cobro-diferido.md`, que prevalecen sobre el spec y tablas históricas. Evidencia del nuevo relato: [hook, Solana y comisiones](research/i-hook-inclusion-solana-y-comisiones.md) y [distribución fintech](research/h-distribucion-fintech-y-billetera.md). El formulario `05-entrega-en.md` quedó de la versión anterior: el equipo debe revisar el nuevo enfoque con sus palabras antes de enviarlo.

Lazo **corre en Solana devnet** (la red de prueba de Solana: la plata es de prueba y no vale nada). Nunca mainnet.

## Fuentes de entrega y consejos de From the chapter

Consultadas el 7/10/2026:

- [Road to Colosseum, entrega](https://superteam.ar/colosseum#entrega): pitch de 2 minutos, demo hasta 3, nombre/descripción, imagen, herramientas, repo, validación/distribución y equipo. Repo privado: habilitar revisión para hackathon@superteam.ar y hackathon@colosseum.com. Envío en Colosseum y Earn. Cierre del track según esa página: **12/10 a las 23:59 de Argentina**; preparar todo para ese horario. (El spec anota "límite 13/10 03:59 ART, a confirmar": ante la duda, vale el horario más temprano.)
- [Listing del track](https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-argentina-track): mostrar producto accesible, evidencia, punto de partida, changelog, aportes y uso material de IA.
- [Colosseum FAQ](https://colosseum.com/hackathon): presentación de 2–3 minutos y demo máximo 3. Usamos 2 para cumplir también Superteam. Evaluación: equipo/mercado, insight, ejecución, tamaño potencial, comunicación, viabilidad y tracción.
- [What a winning hackathon submission looks like](https://superteam.ar/blog/hackathon-submission-that-wins): abrir con producto funcionando, mostrar un recorrido corto y el motivo de usar cadena; probar link móvil/incógnito, repo e instrucciones antes de entregar.
- [Pitching when every deck is AI-generated](https://superteam.ar/blog/pitching-in-the-ai-era): empezar por una persona concreta; respaldar afirmaciones con evidencia y reconocer qué sigue incierto. El equipo aporta su voz y sus datos; la IA ayuda a cuestionar y editar.
- [How to pitch, when nobody knows who you are](https://superteam.ar/blog/how-to-pitch): explicar el resultado en una frase entendible, ordenar problema/solución/aprendizaje y terminar con un pedido concreto. Su ejemplo de mainnet no aplica: Lazo sigue solo en devnet.

## Historia en tres frases

**Problema:** hay personas que trabajan y cobran, pero no consiguen una tarjeta o un límite útil para comprar en cuotas; incluye trabajadores con ingresos informales o parcialmente registrados y estudiantes sin tarjeta propia.

**Solución:** buscamos que Lazo sea la capa de crédito con fiador que conecta a personas sin acceso a cuotas con las fintech que ya usan. El comprador paga sus cuotas, un fiador con tarjeta respalda el plan y el comercio puede cobrar la venta en el momento.

**Por qué nosotros / hacia dónde:** Luciano e Ignacio construyen desde Tucumán una solución a un problema cercano; Solana permite registrar financiación y pagos con costos de red bajos, y las billeteras existentes son un canal propuesto para llegar a más gente.

**Gancho ES:** «En Argentina, podés ganarte la vida y aun así tener dificultades para comprar en cuotas».

**One-liner EN:** “Lazo is a guarantor-backed credit layer designed to connect people without access to installments with the fintech wallets they already use.”

### Qué sostiene el relato

- **Contexto verificable:** INDEC informa **45,0% de informalidad laboral en 31 aglomerados urbanos, segundo trimestre de 2026**, dato provisional publicado el 17/09/2026. No es el porcentaje de argentinos sin tarjeta ni prueba de demanda de Lazo. [Informe, cuadros 1.3 y 2.4](https://biblioteca.indec.gob.ar/bases/minde/mercado_trabajo_eph_2trim26.pdf).
- **Palabras precisas:** “sin acceso a crédito” incluye personas que ya tienen cuenta o billetera. BCRA describe exclusión por falta de cuentas prácticamente nula y una cobertura de financiamiento del 54,7% a diciembre de 2025; tener cuenta no implica acceder a crédito suficiente. [BCRA](https://www.bcra.gob.ar/publicaciones/informe-de-inclusion-financiera-segundo-semestre-de-2025/). “Unbanked” no es el término principal del guion.
- **Ingresos y tarjeta:** BBVA publica comprobantes/documentación de ingresos como requisito de una tarjeta concreta. Inferimos una barrera posible para ingresos informales; no afirmamos que todos los bancos rechacen a toda persona sin recibo. La informalidad parcial del salario no está cuantificada por las fuentes consultadas. [BBVA Mastercard Gold](https://www.bbva.com.ar/personas/productos/tarjetas/credito/mastercard-gold.html).
- **Evidencia propia:** el test de mesa registrado en `02-validacion.md` sigue siendo de 3 personas del entorno; dos recurrieron a la tarjeta de sus padres y una no compró. Es un indicio, no tracción. Todavía no hay entrevistas documentadas a la nueva cohorte de trabajadores, ventas ni acuerdos.
- **Alcance real del usuario:** sin tarjeta propia **y con un fiador con tarjeta dispuesto a respaldarlo**. El producto actual no cubre a quien carece también de ese respaldo. No presentar como mercado alcanzable a toda la población informal.

### El producto y los números para responder preguntas

Condiciones provisionales del mock, no precios comerciales ni funcionalidades demostradas en cadena. Se mantienen en configuración; este documento no cambia código.

| Pieza | Condición / límite |
|---|---|
| Cuotas | 3 sin interés; 6 con 3% total provisional sobre lo financiado. El borrador anterior registra mínimo de compra de US$350 para 6: confirmar contra la configuración vigente antes de mostrarlo |
| Fiador | Obligatorio, tarjeta de crédito, cobertura del 100% del capital financiado pendiente en todos los escalones. Interés, punitorios, máximo agregado y duración requieren política contractual explícita; cobertura no equivale a recupero garantizado |
| Reputación | Pagar puede mejorar anticipo y límite según reglas vigentes; no libera al fiador ni garantiza que un banco reconozca el historial |
| Cobro del comercio | Promesa principal del pitch: **opción de cobro inmediato**, comisión provisional 7% del financiado. El producto también contempla esperar: 30 días 6,25%, 60 días **5,5%**, 90 días 5,25%. No dedicar el pitch a explicar esas alternativas |
| Mostrador | Con alta y fiador vigentes: el comercio muestra QR, comprador escanea, elige cuotas y confirma. QR propio con URL de Lazo; no interoperabilidad con todas las billeteras |
| Fondeo | Pool: fondo común que adelanta dinero al comercio. Tesorería y tokens de prueba; rendimiento no medido. Disponibilidad de capital, mora, fraude y recupero condicionan la economía |

**Ejemplo de cobro inmediato:** compra de 1.000 devUSDC, anticipo 300, financiado 700, comisión comercial 49, neto comercio 951. Tres cuotas que suman exactamente 700 (ajuste de redondeo en la última); con seis al 3%, interés 21 y total comprador 1.021. devUSDC es un token propio de prueba, sin valor; USDC es un activo digital diseñado para seguir el valor de un dólar. La deuda propuesta está en dólares digitales: ingresos en pesos conservan riesgo de cambio.

**Modelo de negocio:** comisión comercial e interés de seis cuotas. Reparto D8 registrado: 4% de originación del financiado para Lazo, incluido en la comisión, y administración del 2% anual sobre saldo pagada por el pool, con devengo pendiente. No confundir capital devuelto, comisión bruta, margen de la empresa ni rendimiento del pool. No agregar un porcentaje para el partner sin cotizar.

**Economía:** el modelo de `10` usa hipótesis de anticipo 30%, impago 8%, recupero 80% y capital al 12% anual. Con ellas, seis cuotas al 3% y cobro inmediato cubren costos desde una compra nueva de ~US$217; al 2%, ~US$346. Es sensibilidad, no evidencia de rentabilidad. El escenario adverso pierde. El modelo minorista de `08` contiene compras chicas deficitarias: la escala no arregla pérdidas por compra.

### Cómo presentar los tres beneficios

**Comprador:** cuotas sin tarjeta propia, con fiador, y un historial de pagos verificable que puede mejorar sus condiciones dentro de Lazo. No prometer acceso universal ni cuotas fijas en pesos.

**Comercio:** el cliente paga en cuotas; el comercio puede recibir la venta en el momento, menos una comisión clara. Esto describe la liquidación digital diseñada, no acreditación instantánea en una cuenta bancaria en pesos. La simulación todavía no es venta comercial real.

**Solana / capital:** pagos rápidos, costos de red bajos y registros verificables. Solana lo documenta para pagos y Visa anunció liquidación USDC en esta red; eso sostiene el encaje, no que toda Web3 esté allí. [Solana Payments](https://solana.com/docs/payments), [Visa](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.19881.html). El rendimiento buscado nace de financiar compras, sujeto a pérdidas y costos; no lo produce la rapidez de Solana. DeFi significa servicios financieros mediante programas en blockchain; la tesorería propia allí es un desarrollo adicional simulado, separado del fondo de crédito.

**Comisiones frente a competencia:** Mercado Pago publica 12,49% por ofrecer 3 cuotas sin interés, desde el 07/04/2026, sin impuestos/retenciones ajenos. Es un componente publicado, no una cotización comparable completa. Lazo propone 7% de lo financiado: con anticipo 30%, 4,9% del precio. Bases, procesamiento, moneda y liquidación difieren; falta cotizar costo final antes de decir “menos que la competencia”. [Ayuda oficial](https://www.mercadolibre.com.ar/ayuda/19304). El guion principal usa “clearly disclosed fee”; el ahorro queda como hipótesis comercial.

## Deck — estructura revisada

Esquema de contenido en inglés, no deck gráfico terminado. Una idea por slide; las etiquetas de ejemplo y simulación deben verse.

| Slide | Headline EN | Qué mostrar / límite |
|---|---|---|
| 1 — Hook + Team | “You can earn a living and still have no way to pay in installments.” | Luciano e Ignacio al inicio. Experiencia personal solo si la confirman; no usar “unbanked” para afirmar que no tienen cuenta |
| 2 — Problem | “Having income doesn't always mean having access to credit.” | Trabajadores con ingresos informales/parciales y estudiantes. Pie de fuente: INDEC, 45% informal employment, 31 urban areas, Q2 2026, provisional; no llamarlo tamaño de mercado |
| 3 — Solution | “A credit layer connecting people and fintech wallets.” | Integración propuesta, comprador paga y fiador respalda. Tres cuotas sin interés y seis con interés pequeño; sin porcentaje en la voz del pitch |
| 4 — Demo | “Choose installments. Confirm. Track your payments.” | Mostrar el checkout disponible y su estado de simulación. El recorrido final con fintech/tarjeta queda pendiente; el QR propio sigue como demo existente, no alcance universal |
| 5 — Merchant | “Customers pay over time. Merchants can get paid upfront.” | Ejemplo 1.000/300/700/49/951 rotulado provisional y en tokens de prueba; distinguir liquidación digital de pesos |
| 6 — Why Solana | “Fast payments. Low network costs. Verifiable financing.” | Registro de planes/pagos; pool diseñado para obtener ingreso del crédito, sin APY prometido ni datos personales públicos |
| 7 — Learning + Economics | “Validate each purchase before scaling.” | Test de mesa de 3 personas; nuevas entrevistas pendientes. Comisión + interés menos capital, pérdidas, operación y partner |
| 8 — Distribution + Ask | “Bring Lazo to the wallets people already use.” | Alianzas propuestas; ninguna confirmada. Pedido: comercios y fintech para evaluar integración y economía en una prueba acotada |

## Guion video pitch — 2:00

**Versión vigente (8/10), elegida por Luciano.** Apertura "Imagine…" y término "Buy Now, Pay Later"; pool del comercio que lleva a Solana; Solana explicado como programa auditable por quien fondea. Unas 260 palabras: ~1:55 a ritmo normal. **Ensayo con cronómetro pendiente.** Si se pasan de tiempo, lo primero que sale es la frase de las comisiones de red.

| Tiempo | Pantalla | Guion EN |
|---|---|---|
| 0:00–0:08 | Equipo; sobreimpreso breve “Income ≠ access to credit” | “Imagine working hard every single day, earning a steady income, but remaining completely invisible to the banking system.” |
| 0:08–0:27 | Contexto argentino; pie de fuente “INDEC: 45% informal employment, 31 urban areas, Q2 2026, provisional” | “In Argentina, over 40% of the workforce operates in the informal economy. Without a formal paystub or traditional credit history, millions of workers and students are locked out of basic financial tools like credit cards. They simply have no way to pay over time.” |
| 0:27–0:37 | Luciano e Ignacio por nombre; esquema personas → Lazo → billetera; “Planned integration” | “We're Luciano and Ignacio, and we're building Lazo: a credit layer that plugs directly into the fintech wallets people already use every day.” |
| 0:37–0:50 | Checkout disponible y respaldo del fiador; “Simulator” | “We enable a Buy Now, Pay Later model where users can split purchases into three interest-free monthly payments, or six with a small interest charge. A trusted person backs your plan.” |
| 0:50–0:56 | Cliente elige cuotas y confirma en el checkout actual; “Simulator” | “For buyers, it's three steps: pick your product, choose your installments, and confirm.” |
| 0:56–1:11 | Comercio y esquema simple del fondo | “For merchants, it's easy: they get paid upfront for a small fee, while the customer pays over time. The money comes from a shared credit pool, and every repayment fills it back up.” |
| 1:11–1:38 | Fondo y registro; “Prototype”; rótulo visible “Running on Solana devnet” | “That pool lives on Solana. It runs as a program that pays merchants and collects installments automatically, by rules anyone can check. Every loan and repayment is recorded on chain, and each payment flows back into the pool in seconds, ready to fun the next purchase.” |
| 1:38–1:55 | Producto y pedido concreto; sin logos de partners | “We're launching our first pilot in Argentina, and we're looking for fintech partners and investors to join us in scaling credit access across Latin America. Because earning a living should be enough to get access to credit.” |

**Notas de esta versión:**

- **Solana:** la frase describe el programa de `programa/` (pool con `lp_deposit`/`lp_withdraw`, `open_plan`, `release_payout`, `pay_installment`, `crank_mark_late`, `keeper_guarantee`). La versión nueva todavía no está desplegada en devnet y la web corre en simulador: en pantalla, rótulo "Prototype" y nada de Explorer salvo una operación realmente observada en devnet. El programa tiene instrucciones de admin (`admin_config`, `admin_set_state`, `admin_apply_loss`): no decir "nobody can change the rules"; "rules anyone can check" sí es cierto. "Under a cent" se refiere a la comisión de red de Solana, no a la de Lazo.
- **Devnet en voz alta:** no es obligatorio (Luciano sacó esa regla del `CLAUDE.md` el 8/10); la frase final de Solana queda por elección del equipo.
- **Fiador:** “A trusted person backs your plan” queda corta a propósito (decisión de Luciano). La demo explica tarjeta del fiador, cobertura y que solo paga ante impago.
- **Riesgos aceptados por Luciano** (marcados en la revisión, preparar respuesta si los preguntan): "invisible to the banking system" (BCRA: casi todos tienen cuenta; lo que falta es crédito), "millions of workers and students" (no calculado con la fuente) y "We're launching our first pilot" (todavía no hay piloto ni socio: la respuesta honesta es que es el próximo paso).
- “Small fee” e “interest charge” son posicionamiento provisional; tarifas en `06-decisiones-comerciales.md` y `10-tasa-6-cuotas-y-cobro-diferido.md`. No se promete rendimiento del pool ni fondeo conseguido.

### Apertura personal — confirmada, no usada

Luciano confirmó que ambos trabajan y no tienen tarjeta propia, pero prefirió abrir con el dato del INDEC. Queda como alternativa o respuesta en preguntas:

> “We're Luciano and Ignacio. We work, but we don't have our own credit cards to pay in installments.”

### Cierre: dirección elegida y propuesta tras el handoff

**Actualización tras leer `handoff-masividad-alianza.md` y `11-masividad-billetera-vs-alianza.md` §7:** Luciano ya eligió presentar Lazo como **capa de crédito con fiador para billeteras cripto**, con infraestructura repetible entre partners. Tucumán es la primera cohorte propuesta, no el mercado total. La búsqueda de alianzas es dirección elegida; aceptación, integración y resultados siguen sin demostrar.

El handoff registra esta frase aprobada: “Lazo doesn't compete as a wallet: it's the guarantor-backed credit layer a wallet plugs in to approve the users it rejects today.” Para el cierre hablado propongo la versión siguiente, que expresa la intención de atender a esa cohorte sin asegurar aprobación automática ni integración ya disponible.

**Versión extensa del mensaje de distribución, conservada como referencia:**

> “We're building Lazo as the guarantor-backed credit layer for wallets to serve people their existing credit products leave out. Tucumán is our proposed first pilot; wallet integrations are our path to scale. We're looking for a fintech to validate distribution, funding and the economics of that pilot.”

La nueva revisión adelanta la capa de crédito a la solución y reserva el cierre para el pedido de integración/fondeo. Ninguna de las dos versiones promete funcionar en cualquier QR. El alcance de compra sigue abierto: comercios adheridos, QR abierto o dos recorridos con costos distintos. No asumir que el comercio paga la comisión fuera de un acuerdo de adhesión; tres cuotas sin interés requieren una fuente de ingresos que cubra la financiación.

**Fondeo del partner:** el equipo propuso que la fintech aporte capital a los tramos senior y junior. El senior recibe pagos con prioridad; el junior absorbe primero las pérdidas. Es una hipótesis de acuerdo, no capital comprometido ni rendimiento demostrado. Si la fintech invierte en el junior, asume riesgo de crédito: no combinar esa propuesta con la promesa de que no usa su balance o no arriesga capital. En el pitch breve alcanza con pedir validación de fondeo; el reparto se explica en preguntas, cuando esté definido.

**Antes de negociar:** medir la cohorte que la billetera rechaza o limita, verificar aceptación del fiador, margen por compra después del socio y capacidad de fondeo. Definir si el partner cobra servicio/distribución, rendimiento por su capital o ambos, y registrar cada ingreso una vez. El aporte de capital y la promoción dentro de la app son acuerdos diferentes. No anunciar porcentaje de reparto, aprobación universal o piloto reclutado.

Ripio/belo son candidatos de infraestructura; Lemon publica Mini-Apps pero su SDK no incluye Solana y ya ofrece crédito respaldado en bitcoin. No usar cifras de audiencia como clientes adquiridos. Tampoco trasladar al guion la mora juvenil de fuentes secundarias ni los ejemplos históricos de CFTEA del handoff sin fuente primaria vigente y condiciones completas. El guion actual no contiene la comparación errónea de “tres cuotas → 2,5 veces”. Evidencia y límites en [informe fintech](research/h-distribucion-fintech-y-billetera.md).

Antes de grabar: confirmar pantallas disponibles, rótulos de simulación y estado del programa. Mostrar Explorer únicamente para una operación realmente observada en devnet; una cuenta de programa no prueba el checkout completo. No mostrar logos que sugieran acuerdos. Toda firma/envío de transacción requiere aprobación explícita.

## Video demo — 3:00

Un solo recorrido en pantalla, controles visibles, sin cortes que escondan errores. Grabar desde la URL pública o `localhost` en modo simulador. Verificar antes de cada toma que el aviso de devnet esté visible.

| Tiempo | Acción visible | Voiceover EN |
|---|---|---|
| 0:00–0:12 | Home, línea de devnet del hero, "Probalo en 2 minutos" | "This is Lazo, running on Solana devnet with test dollars. The web app includes a built-in simulator, so you can try the full flow without a wallet." |
| 0:12–0:35 | Fiador: link de invitación, cobertura, aceptación | "First, the guarantor. A buyer invites a guarantor by link. The guarantor sees the proposed coverage and maximum liability. Identity checks and card charges are simulated in this walkthrough; their provider integrations still need verification." |
| 0:35–1:05 | `/tienda` → producto de 1.000 → checkout, Tier 1 · Starter, 3 vs 6 cuotas | "Now the buyer buys a thousand-dollar item at Tier 1, Starter: three hundred down, seven hundred financed. Three installments, no interest, total one thousand. Or six installments at three percent total: twenty-one dollars of interest, one thousand twenty-one in total. These are provisional demo terms. Without an active guarantor, the plan won't open." |
| 1:05–1:25 | Cobro inmediato y neto 951 en simulador | "The merchant selects upfront settlement. The proposed fee is seven percent of the seven hundred financed: forty-nine. In this simulation, the store receives nine hundred fifty-one immediately while the buyer pays over time." |
| 1:25–2:05 | Reloj de demo y simulación de impago/recupero | "This clock moves time forward. Now the buyer misses a payment. The simulator shows the grace period, notifications and recovery from the guarantor. The merchant has already received the sale. This is a simulated recovery, not a real card charge." |
| 2:05–2:35 | `/app/comercio/mostrador`: monto, QR, "Abrir como cliente", confirmar, venta pagada | "In-store sales work the same way. The cashier enters an amount, Lazo shows a QR, and the buyer scans it, chooses installments and confirms with their existing guarantee. The sale shows up instantly on the merchant's panel." |
| 2:35–3:00 | Tiers y reglas; sección "Qué corre en la cadena y qué en el simulador"; program ID | "Every rule is visible: how to move up a Tier and what moves you down. Here is what runs on chain and what runs in the simulator. Lazo runs on Solana devnet, never mainnet. Thanks for watching." |

Reglas para la grabación:
- El mínimo de seis cuotas y los textos de cobertura deben coincidir con la configuración/política observadas al grabar; no usar el guion como comprobación técnica.
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

## Preguntas difíciles y respuestas

1. **¿Por qué decir sin acceso a crédito y no no bancarizados?** Porque muchos ya tienen cuenta o billetera; el problema es la tarjeta/límite para cuotas. Trabajadores y estudiantes son dos grupos a investigar, no dos mercados ya validados.
2. **¿Cómo ayudás al que no tiene fiador?** El producto actual no lo cubre. La entrada exige fiador con tarjeta y condiciones de aprobación; no decir “para todos”.
3. **¿Por qué no pedir la tarjeta del familiar?** Lazo propone que el comprador pague y construya su propio historial dentro del sistema; el fiador respalda y solo paga ante impago. Un cargo posterior puede consumir límite de su tarjeta. Hay que probar si esa diferencia justifica el alta y el costo.
4. **¿Por qué Solana?** Liquidación digital rápida, costos de red bajos, financiación programable y registros verificables del fondo/repagos. La conversión a pesos y tarjeta siguen dependiendo de proveedores. Rendimiento no es una propiedad automática de la red.
5. **¿Cuánto rinde el pool?** No tenemos rendimiento medido. Comisión e interés podrían remunerar capital después de pérdidas y costos; el modelo es hipotético. No presentar 8% u otro APY como obtenido o garantizado.
6. **¿Son más baratos?** Es una hipótesis: nuestra tarifa de demo cobra sobre financiado y las referencias de mercado usan otras bases/costos. Falta comparar cotizaciones completas y aceptar precios con comercios. No afirmar ahorro universal.
7. **¿La masividad hace rentable el negocio?** Solo si cada compra deja margen positivo después del socio y las pérdidas; después el volumen ayuda a cubrir costos fijos. Las compras chicas del modelo interno pueden perder plata.
8. **¿Por qué no construir una billetera propia?** Priorizaría comprobar el crédito y la experiencia de comercio/fiador, y buscar distribución en cuentas existentes. Una billetera nueva suma adquisición, custodia, operación y productos; su audiencia no está garantizada.
9. **¿Por qué una fintech se asociaría si ya da crédito?** Hay que demostrar una cohorte que hoy no atiende y un ingreso incremental. Lemon ya ofrece una tarjeta con BTC en garantía; nuestro respaldo externo puede diferir, pero aún no demostramos complementariedad ni interés comercial.
10. **¿Qué validaron?** Un test de mesa de 3 personas cercanas y fuentes oficiales. No hay ventas, usuarios de pago, acuerdos ni repago real medido. Trabajadores sin crédito deben incorporarse a la próxima ronda de entrevistas.
11. **¿Qué pasa si falla el cobro al fiador?** Cobertura 100% es obligación, no cobro asegurado. Rechazo de tarjeta, fraude o contracargo pueden dejar pérdidas. Recupero y pérdidas requieren medirlos; están separados en el modelo.
12. **¿Son cuotas fijas en pesos?** No. El diseño denomina deuda en USDC; quien cobra en pesos asume riesgo de cambio. La rampa de pesos sigue pendiente. Hoy solo hay tokens sin valor en devnet y recorrido simulado.

## Nota técnica: estado documentado, no revalidado en esta sesión

Fuente: `03-mvp.md`, `04-plan.md` § Estado y `handoff-demo-devnet.md`. Esta revisión es del relato: **no ejecutó la aplicación, no corrió pruebas, no desplegó ni envió transacciones**. La tanda anterior del pitch mezclaba tickets objetivos con estado de cadena; no reutilizarla como evidencia de funcionamiento.

- Programa `cuotas`, program ID registrado `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`: núcleo/ciclo de crédito con código y pruebas locales registrados. Upgrade, inicialización y recorrido real de devnet permanecen pendientes en la memoria consultada. Confirmar estado actual antes de grabar.
- El recorrido público documentado usa mock del navegador. No afirmar que el QR, seis cuotas, mora/cobro a tarjeta o calendario diferido mostrado ejecutaron operaciones en cadena.
- Configuración de referencia del programa: tres cuotas y cobro inmediato. Tres/seis y cobro diferido son ampliaciones del mock documentadas en `10`; su disponibilidad técnica exacta debe observarse antes de mostrarla.
- Didit/Mobbex: código de integración registrado, credenciales y flujo observado pendientes. “Sandbox” significa entorno de pruebas del proveedor; no llamar sandbox a una pantalla enteramente simulada sin aclararlo.
- Tesorería, compradores y comercios de ejemplo. devUSDC es un mint propio de prueba, no USDC emitido por Circle; no hay rendimiento ni volumen comercial real.
- Divergencia registrada: el mock permite planes paralelos dentro del margen; el programa mantiene un plan activo por comprador. No prometer portabilidad a cualquier comercio/billetera ni capacidad de planes múltiples demostrada en cadena.
- Fianza 100% del capital pendiente según `06`. Alcance de interés/punitorios, techo y duración pendientes; los textos legales de la demo requieren sincronizar esa política antes de un alta real.

## Estado de los seis pasos

Historia y esquema del deck revisados; guiones pitch/demo editados; checklist heredada pendiente de comprobación; preguntas difíciles preparadas, ensayo pendiente. No se creó un deck visual ni se grabaron videos. Dos puntos más flojos: **demanda de trabajadores y aceptación del fiador sin entrevistas nuevas**, y **economía/canal de distribución sin cotizaciones ni acuerdos**. Próximo paso: confirmar apertura personal y ensayar; después medir la nueva cohorte y cotizar integración.

## Checklist de entrega

- [ ] Pitch 2:00 y demo ≤ 3:00, en inglés, audio claro, links públicos.
- [ ] Formulario: el equipo revisa [`05-entrega-en.md`](05-entrega-en.md) con sus palabras, el segmento ampliado y el estado real; resolver cada `[A CONFIRMAR]` antes de enviar.
- [ ] Repo con acceso para hackathon@superteam.ar y hackathon@colosseum.com si es privado; README en inglés con modo simulador, instrucciones y program ID.
- [ ] Evidencia y GTM: solo el test de mesa y la investigación; metas separadas de resultados; sin alianzas.
- [ ] Punto de partida, changelog, aportes de cada integrante y uso material de IA.
- [ ] Doble envío Colosseum + Earn; guardar comprobantes. Cierre 12/10 23:59 ART.
- [ ] Probar el link en celular e incógnito y repetir "Probalo en 2 minutos" sin ayuda.
