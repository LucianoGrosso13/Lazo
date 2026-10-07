# Handoff: masividad y alianza con una billetera (7/10/2026)

Sesión del 2026-10-07, en la rama `t-producto-final`. Luciano planteó que, como medio de pago de cuotas, Lazo no llega a la masividad que necesita para ser rentable, y propuso dos caminos: armar una billetera propia o aliarse con una fintech. **No se tocó código, pitch ni textos de entrega. No se contactó a terceros.**

## Qué se hizo

- Se leyeron `07-go-to-market-y-alianzas.md`, `08-minorista-y-economia.md`, `06-decisiones-comerciales.md`, `handoff-plan-de-negocio.md` y `research/a-costos-mercado-pago-y-competencia.md`.
- Se investigó en la web: Mercado Pago "Cuotas sin Tarjeta", préstamos de Ualá, Lemon Mini-Apps (con Lendoor), regulación de billeteras y crédito del BCRA, mora en jóvenes y cómo escalaron otros servicios de cuotas (Afterpay, Kueski, Marqeta).
- Se creó **`proyecto/11-masividad-billetera-vs-alianza.md`**, con el veredicto, las fuentes y la sección 7 de la "Ronda 2" (las decisiones de Luciano y las preguntas abiertas).
- El archivo **no está commiteado** y `04-plan.md` § Estado no tiene todavía un puntero a él.

## Conclusiones

1. **No hacer una billetera propia.** Exigiría los registros de billetera (PSP) ante el BCRA y de cripto (PSAV) ante la CNV, más el régimen de crédito, y enfrentaría a Lemon (5M+ usuarios) y Mercado Pago (13M+ con crédito preaprobado). El crédito en cuotas creció afuera desde el checkout de los comercios, no armando billeteras propias.
2. **Mercado Pago ya hace el producto base:** hasta 12 cuotas sin tarjeta, y el comercio elige cobrar al instante o a 10, 18 o 35 días. Ni las cuotas ni el plazo de cobro nos diferencian. **Lo que nos diferencia es el fiador:** la mora de jóvenes de 18 a 21 años fue 39,3% en abril de 2026 (Provincia Microcréditos, citado por Perfil; no vimos el informe original).
3. **Dirección elegida por Luciano** (es dirección, no hay contrato):
   - Lazo es la **capa de crédito con fiador que una billetera suma** para aprobar a los usuarios que hoy rechaza. Las pérdidas las absorbe el pool, primero el junior.
   - Partner prioritario: una billetera que venda cripto (**Lemon, belo o Ripio**).
   - Relato para venture: infraestructura que se puede repetir con cada billetera. Tucumán es la primera cohorte, no el mercado.
   - Idea: **la fintech aliada pone plata en el pool**, una parte senior y otra junior, y cobra rendimiento. La forma exacta está pendiente.
   - Frase aprobada para el pitch: *"Lazo doesn't compete as a wallet: it's the guarantor-backed credit layer a wallet plugs in to approve the users it rejects today."*
4. **Dato corregido:** que $100.000 terminen en ~$250.000 corresponde a **12 cuotas**. En 3 cuotas el total es ~$134.000, con CFTEA de 367%. En el pitch usar "hasta 388% CFTEA" (el rango oficial) o el ejemplo correcto de 3 cuotas.
5. **Lemon Mini-Apps** es el modelo más parecido a lo que propuso Luciano, pero tiene dos frenos. Su SDK solo funciona con redes compatibles con Ethereum, no con Solana. Y Lendoor (crédito de hasta 1.000 USDC, marcado "Soon") puede ser competencia directa.
6. **Reparto de la plata:** no hay términos públicos. Hay tres esquemas posibles: pago por usuario activado (CPA), porcentaje del ingreso cobrado (revenue share) o fondeo del pool. El tope de lo que podemos pagarle al partner es lo que nos ahorra en CAC, KYC y rampa. Su parte saldría del 4% de originación (D8) o de una comisión más alta al comercio.

## Qué falta (en orden)

1. **El equipo decide dónde compra el usuario de la billetera** (§7, pregunta 1 de `11`). Opciones:
   - Cualquier QR: escala, pero el comercio no paga el 7% y se cae "3 cuotas sin interés".
   - Solo comercios adheridos: se conserva la comisión, pero la escala depende de adherir comercios.
   - Una mezcla de las dos.
   Esta es la pregunta que se le hizo a Luciano al cerrar la sesión.
2. Con esa decisión tomada:
   - Meter la frase y la sección de go-to-market en `05-pitch.md` y `05-entrega-en.md` (en inglés).
   - Corregir cualquier "3 cuotas → 2,5x" que haya en el pitch, la landing o el guion.
   - Agregar el puntero en `04-plan.md` § Estado.
   - Commitear.
3. Validación barata: preguntarles a 10 estudiantes de fuera del equipo si les aparece "Cuotas sin Tarjeta" en Mercado Pago y con qué límite.
4. Diseñar la entrada de la fintech al pool: preguntas 2 a 4 de `11` §7 (por qué no presta sola, sus usuarios como senior, cómo evitar el doble cobro). Ofrecer rendimiento a minoristas necesita consulta legal; no prometer un APY.
5. Postular a Lemon Mini-Apps o contactar a belo o Ripio, **solo cuando el equipo lo decida**. Las preguntas para esa reunión están en `07` §7.

## Reglas que siguen vigentes

Solo devnet. Las alianzas se presentan como plan, no como hechos. No inventar usuarios, métricas ni términos de reparto. Ningún número de negocio va hardcodeado: todo vive en `ProtocolConfig`.
