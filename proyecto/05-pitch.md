# 05 — Pitch y demo de Lazo

Actualizado 2026-10-07. Borrador para ensayar; el equipo adapta los guiones a su voz. Textos de video/deck en inglés; instrucciones internas en español. Los campos del formulario los redacta el equipo con sus palabras, usando esta estructura como guía.

## Fuentes de entrega y consejos de From the chapter

Consultadas el 7/10/2026:

- [Road to Colosseum, entrega](https://superteam.ar/colosseum#entrega): pitch de 2 minutos, demo hasta 3, nombre/descripción, imagen, herramientas, repo, validación/distribución y equipo. Repo privado: habilitar revisión para hackathon@superteam.ar y hackathon@colosseum.com. Envío en Colosseum y Earn. Cierre del track: **12/10 a las 23:59 de Argentina**; preparar todo para ese horario.
- [Listing del track](https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-argentina-track): mostrar producto accesible, evidencia, punto de partida, changelog, aportes y uso material de IA. Esos requisitos se agregan al checklist visual enviado por el equipo.
- [Colosseum FAQ](https://colosseum.com/hackathon): presentación de 2–3 minutos y demo máximo 3. Usamos 2 para cumplir también Superteam. Evaluación: equipo/mercado, insight, ejecución, tamaño potencial, comunicación, viabilidad y tracción.
- [What a winning hackathon submission looks like](https://superteam.ar/blog/hackathon-submission-that-wins): abrir con producto funcionando, mostrar un recorrido corto y el motivo de usar cadena; probar link móvil/incógnito, repo e instrucciones antes de entregar. Se consultó la página pública directamente porque el lector web no la recuperaba.
- [Pitching when every deck is AI-generated](https://superteam.ar/blog/pitching-in-the-ai-era): empezar por una persona concreta; respaldar afirmaciones con evidencia y reconocer qué sigue incierto. El equipo aporta su voz y sus datos; IA ayuda a cuestionar y editar. Sin tomar sus ejemplos como métricas propias.
- [How to pitch, when nobody knows who you are](https://superteam.ar/blog/how-to-pitch): explicar el resultado en una frase entendible, ordenar problema/solución/aprendizaje y terminar con un pedido concreto. Consejos editoriales, no reglas adicionales de entrega. Su ejemplo de mainnet no aplica: Lazo sigue sólo devnet.

## Historia y evidencia disponible

**One-liner para practicar:** “Lazo helps students without their own credit card pay in installments, backed by a guarantor, and build a payment history they can use across stores.”

**Producto decidido:** 1/3 sin interés, 6 con interés moderado aún sin tasa; comercio elige plazo y comisión; cobertura del fiador 100% en todos los escalones. **Producto demostrable hoy:** recorrido mock de 3 cuotas; integración real pendiente del upgrade y credenciales, según `04-plan.md` y `handoff-demo-devnet.md`. No se volvió a probar el runtime en esta sesión documental.

**Evidencia propia registrada:** test de mesa con tres casos del entorno; dos compras de PC usaron tarjeta de los padres. No equivale a tres clientes, ni demanda minorista validada. No hay nueva alianza, venta ni rendimiento acreditado. Las cifras de competidores del guion viejo no se usan sin una cotización comparable y actual.

**Lo que debe resultar cierto:** comercios aceptan pagar por esta conversión/financiación; compradores y fiadores completan el alta; recupero efectivo y costos dejan margen; una billetera acepta distribuirlo. Son hipótesis. Investigación y experimentos: `07-go-to-market-y-alianzas.md` y `08-minorista-y-economia.md`.

**Roadmap comercial recuperado:** H se adapta al pedido actual; las ideas elegidas son seis cuotas, fecha de liquidación, descuentos para el fiador al día y tesorería propia ociosa. Detalle en `09-alcance-opcion-h-y-mejoras.md`. Presentar las dos últimas como roadmap; no atribuirles menor mora o rentabilidad lograda. Las tasas/TIR del pitch histórico de `07-plan-de-negocio/` no aplican automáticamente a esta política. D8 registra originación 4% + administración 2% anual como reparto, no como margen neto.

## Video de pitch — 2:00

Reservar pausas; aproximadamente 230 palabras. Equipo y problema en cámara, producto en pantalla. No abrir con animación de logo.

| Tiempo | Pantalla | Guion EN para adaptar |
|---|---|---|
| 0:00–0:20 | Founder + checkout | “When we needed a computer for university, we used our parents' credit cards. The purchase was ours, but the payment history was not. Lazo gives students without their own card an installment plan backed by a guarantor.” |
| 0:20–0:40 | Comprador y fiador | “The buyer pays their own installments. The guarantor accepts a clear maximum and is only charged after a missed payment under the agreed terms. Each completed plan builds a payment record that can unlock a lower down payment or a higher limit.” |
| 0:40–1:00 | Tres opciones, rotuladas roadmap | “Our model offers one or three installments without buyer interest, and six with a modest interest charge. Merchants choose when to receive their money and pay a fee for that option. Pricing for the new options is still being tested.” |
| 1:00–1:20 | Registro del plan/pool, modo visible | “Solana is designed to make the plan, pool movements and payment record verifiable across stores. This prototype uses test tokens on devnet. The current browser demo is simulated; end-to-end blockchain and provider verification remain pending.” |
| 1:20–1:40 | Aprendizaje y canal inicial | “Our first conversations exposed reliance on family cards. Next we will test smaller retail purchases with students, guarantors and local merchants, measuring completion, repeat use and contribution margin. We are researching wallet partnerships for distribution and peso conversion.” |
| 1:40–2:00 | Equipo + pedido | “We are building from Tucumán, Argentina. Our next milestone is a verified devnet flow and documented merchant demand. We are looking for merchant design partners and a wallet team willing to evaluate a bounded pilot.” |

Antes de grabar: completar nombres, contribución de cada integrante y experiencia real. La apertura sólo la dice el integrante que vivió esa compra. Las alianzas son candidatas; no poner logos de Lemon/Ripio/belo como respaldo ni decir “partnered with”. Si cambia la evidencia técnica, reemplazar el bloque de estado por hechos y links observados, no por objetivos.

## Video demo — hasta 3:00

Un recorrido en pantalla, controles visibles, sin maquillar errores. Guion principal para **mock**, que es el modo registrado hoy. Antes de cada toma verificar modo y datos. Se puede actualizar a real sólo tras completar el gate devnet y observar cada operación; toda firma/envío requiere aprobación explícita del usuario.

| Tiempo | Acción visible | Voiceover EN |
|---|---|---|
| 0:00–0:15 | Abrir checkout, badge mock/test tokens | “This is Lazo's browser simulation. It uses test amounts and does not send blockchain transactions or charge a card. We will show one purchase, a payment and an overdue recovery.” |
| 0:15–0:35 | Fiador: link, límites y consentimiento | “The guarantor reviews the maximum exposure. Identity checks and card onboarding are mocked in this recording. Our new policy keeps the guarantee at one hundred percent; the implementation and contractual cap still need alignment.” |
| 0:35–1:10 | PC 1.000; anticipo 300; 3 cuotas; confirmar | “The buyer sees a three-hundred down payment and seven hundred financed without interest in three installments. In this immediate-settlement example, the merchant fee is seven percent of the financed amount, leaving nine hundred fifty-one. These are simulated balances.” |
| 1:10–1:30 | Pagar primera cuota; panel | “A simulated payment reduces the outstanding balance. The full schedule adds up to the amount accepted at checkout. Completing an eligible plan can improve the buyer's terms for the next purchase.” |
| 1:30–2:05 | Reloj; mora; recupero mock | “We advance the demo clock. After the grace period and the configured recovery date, the prototype simulates the guarantor recovery and updates the record. A real charge can fail or be disputed; a guarantee is not a promise of full recovery.” |
| 2:05–2:30 | Comercio y pool | “The merchant's earlier advance is separate from the buyer's remaining obligation. The pool view follows advances, payments and recoveries. There are no real investors or verified investment returns in this demo.” |
| 2:30–3:00 | Cierre y estado futuro | “Next we will verify this flow on Solana devnet with sandbox providers. One and six installments, merchant settlement choices and the retail QR flow are planned additions. No real money is used. The repository documents what works, what is simulated and what remains.” |

No mostrar 1/6 cuotas, calendario diferido ni cobertura nueva como botones funcionando si el código no los ofrece. Si el alta falla por política/credenciales, mostrar ese estado; no afirmar que se aceptó una fianza. Los paneles de mock que conserven cobertura vieja deben rotularse como prototipo anterior hasta C2–C6.

**Después del gate real:** separar en el video los pasos devnet confirmados, los pasos del procesador sandbox y cualquier simulación restante. Mostrar firma aprobada, confirmación y Explorer reales sólo para operaciones realizadas. Un hash acredita el registro, no acredita por sí solo KYC, cobro de tarjeta o recupero fiat.

## Deck breve para ensayo / preselección

Una idea por slide; se adapta al formato que confirme la organización. Títulos en inglés:

1. **A purchase of our own, a card borrowed from family** — caso real y aprendizaje.
2. **Installments with a clear, capped guarantee** — roles y quién paga.
3. **See the working prototype** — recorrido probado, modo visible.
4. **A shared payment record on Solana** — adelantos/repagos/reputación; dependencia offchain explícita.
5. **What we learned, and what remains unproven** — tres casos de entorno y los límites.
6. **Start with students and local retail** — un canal inicial; experimento de 07/08.
7. **Wallet distribution is a hypothesis** — candidato elegido tras investigación, responsabilidades y piloto acotado; ningún acuerdo.
8. **Pricing must cover capital and operations** — 1/3 cero, 6 interés, comisión por plazo; sin APY ni margen logrado.
9. **Built in Tucumán, Argentina** — nombres, experiencia y contribuciones verificadas.
10. **Our next milestone and ask** — completar gate devnet y conseguir feedback/compromisos de comercios, no inversión masiva sin validación.

## Checklist de entrega y ensayo

- [ ] Pitch 2:00 y demo ≤3:00, ambos en inglés, audio claro y links accesibles.
- [ ] Nombre/descripcion escritos por el equipo; logo con derechos; equipo y país completos.
- [ ] Herramientas separadas entre integradas, pendientes y sandbox; arquitectura y riesgos descritos.
- [ ] Repo público o acceso privado revisable; README EN, modo mock/devnet, instrucciones y program ID.
- [ ] GTM y validación con evidencia; metas futuras separadas de resultados; sin alianzas inventadas.
- [ ] Punto de partida, cambios semanales, trabajo previo, uso material de IA y aportes registrados.
- [ ] Registro de integrantes y ubicación del proyecto revisados; doble envío Colosseum + Earn.
- [ ] Revisar cierre operativo 12/10 23:59 Argentina y guardar recibos de ambos envíos.
- [ ] Link en móvil/incógnito; repetir recorrido sin ayuda; si falla, corregir o declarar el bloqueo.
- [ ] Completar nombres, horas y estado técnico real antes de grabar. No se verificaron esos datos en esta sesión.

## Preguntas duras para ensayar

- ¿Por qué el estudiante no usaría directamente las cuotas sin interés de la tarjeta del familiar?
- ¿Por qué un comercio paga esta comisión y cuándo le conviene esperar para cobrar?
- ¿Qué cuesta adquirir y verificar a alguien que compra un ticket chico?
- ¿Qué pasa si el cargo al fiador falla y quién absorbe la pérdida?
- ¿Quién aporta el capital, quién gana cada comisión y quién asume riesgo cambiario?
- ¿Qué parte necesita Solana y qué depende de un proveedor fuera de la cadena?
- ¿Qué observaron con usuarios reales y qué sigue siendo una hipótesis?

## Nota técnica: divergencias mock ↔ programa

Para el jurado y para quien retome el programa — que no quede escondida:

- **Lo que se ve en la demo:** el estudiante puede tener varios planes en paralelo, como el margen de una tarjeta de crédito: el `maxPurchase` del escalón hace doble función (tope por compra y línea total). `quote()` bloquea con `exceeds_credit_limit` cuando `activeExposure + repayable` supera ese margen (`app/src/lib/cuotas/mock.ts:95-105`).
- **Lo que hace el programa on-chain hoy:** fuerza **un solo plan por estudiante** — el `Plan` PDA se crea con seeds `[PLAN_SEED, student]` vía `init`, que falla si ya existe (`programa/programs/cuotas/src/instructions/open_plan.rs:146`). El cliente real (`app/src/lib/cuotas/real.ts`) mantiene la semántica vieja y emite `has_active_plan`.
- **Por qué:** la demo corre sobre el cliente mock (`NEXT_PUBLIC_CUOTAS_MODE=mock`); el margen de crédito se implementó solo ahí (decisión del equipo, `.scratch/demo-polish/spec.md` §"Divergencia conocida"). No afecta lo que se muestra porque nada en la demo pega al programa real todavía (pendiente Fase A3, ver `proyecto/handoff-demo-devnet.md`).
- **Evolución futura del programa (upgrade):** seeds `[PLAN_SEED, student, generation]` para permitir planes en paralelo + chequeo `active_exposure + repayable ≤ tope del escalón` en `open_plan`. Hasta entonces, el mock y el cliente real difieren en este punto.

### Términos comerciales de la demo (tanda web completa, 2026-10-07)

- **Lo que se ve en la demo:** 3 cuotas sin interés o 6 con 3% total sobre lo financiado (provisional); el comercio elige cobrar hoy (7%), a 30 (6,25%), 60 (5,5%) o 90 días (5,25%) y su venta queda pendiente hasta la fecha; cobertura del fiador 100% del capital pendiente en todos los escalones. Todo sale de `ProtocolConfig` del mock (`app/src/lib/cuotas/demo-config.ts`) y se calcula en `app/src/lib/cuotas/terms.ts`.
- **Lo que hace el programa on-chain hoy:** solo 3 cuotas y cobro inmediato; el seed (`app/scripts/seed.ts`) conserva la cobertura 100/90/80/70 por escalón.
- **Cómo decirlo en el pitch:** "la demo corre en devnet con un cliente simulado; las 6 cuotas y el cobro diferido son términos provisionales que todavía no están en el programa". No mostrarlos como funcionalidad on-chain.
