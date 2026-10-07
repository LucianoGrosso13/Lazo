# 11 — Masividad: ¿billetera propia o alianza con una fintech?

**Fecha de investigación: 2026-10-07.** Pregunta de Luciano: para que Lazo sea rentable hace falta masividad, y como medio de pago de cuotas no llega. ¿Hacemos una billetera tipo Lemon (con exchange y DeFi) o nos aliamos con una fintech y repartimos la plata? Complementa `07-go-to-market-y-alianzas.md`, que analiza las rampas (Ripio, belo) y Lemon Mini-Apps; acá no se repite eso.

## Veredicto

1. **Billetera propia: no.** Es otra empresa, con otra regulación y otro problema de adquisición. No resuelve la masividad: la traslada.
2. **Alianza: sí, pero cambia lo que vendemos.** Las billeteras grandes ya dan crédito propio. No les vendemos "cuotas"; les vendemos **aprobar a los usuarios que su scoring rechaza o limita, con el fiador asumiendo el riesgo y sin usar el balance de la billetera.**
3. **Antes de escalar hay que tener economía por plan positiva.** Con contribución negativa (tickets de US$20, ver `08`), la masividad multiplica la pérdida.

## 1. "Masividad" en números del propio modelo

`07-plan-de-negocio/pitch-negocio.md` §3 (escenario, sin validar) ubica el equilibrio en **~450 compras por mes en Tucumán** y ~1.100 a escala nacional. Eso es mucho para un equipo sin comercios firmados, pero no son millones de usuarios. El cuello no es tener una app masiva: es conseguir compras pagadas con un costo de adquisición (CAC) bajo y que cada plan deje plata. Una alianza sirve si baja ese CAC; una billetera propia lo sube.

## 2. Por qué no una billetera propia

- **Regulación doble.** Una billetera que guarda pesos es un PSP: el BCRA le exige tener el 100% de los fondos de clientes depositados en cuentas a la vista de bancos ([Com. A 6859 vía O'Farrell](https://www.estudio-ofarrell.com/el-bcra-establecio-nuevas-disposiciones-para-las-billeteras-virtuales/)). La parte cripto requiere registro como PSAV ante la CNV: la propia página de Lemon promete que los builders de Mini-Apps **no necesitan licencia PSAV** porque la custodia la pone Lemon ([lemon.me/build](https://lemon.me/build)). Y el crédito va por el régimen de proveedores no financieros de crédito ([registro BCRA](https://www.bcra.gob.ar/solicitar-inscripcion-actualizacion-o-dar-de-baja-para-otros-proveedores-no-financieros-de-credito/)). No verificamos el alcance exacto de cada registro para Lazo; hay que consultarlo con un abogado.
- **El mercado está lleno.** Lemon declara más de 5 millones de usuarios verificados ([lemon.me/build](https://lemon.me/build)) y Mercado Pago más de 13 millones con crédito preaprobado ([MP Developers, jun-2025](https://www.mercadopago.com.ar/developers/en/news/2025/06/12/Mercado-Pago-Cuotas-sin-Tarjeta-now-available-on-Shopify)). Además compiten Ualá, belo, Ripio, Naranja X y otras. Una billetera nueva tiene que ganarles en adquisición, que es justo lo que nos falta.
- **Cómo escaló el BNPL afuera.** El BNPL (comprá ahora, pagá después) creció en el checkout de los comercios y recién después se metió en billeteras. Afterpay se integró a Cash App cuando Block lo compró ([Finovate](https://finovate.com/block-rebrands-afterpay-to-cash-app-afterpay/)). Kueski se integró con más de 1.000 comercios, Walmart entre ellos ([Electronic Payments Intl.](https://www.electronicpaymentsinternational.com/news/mexican-bnpl-firm-kueski-gets-202m-infusion)), y llegó a Amazon México ([HeyFuture](https://www.heyfuturenexus.com/fintech-kueski-takes-bnpl-to-amazon-mexico)). La integración en billeteras vino por otro lado: Marqeta, por ejemplo, empezó a meter Affirm y Klarna dentro de billeteras ([American Banker](https://www.americanbanker.com/payments/news/marqeta-partners-with-affirm-and-klarna-to-boost-bnpl)). No encontramos casos de BNPL que hayan escalado armando su propia billetera.

## 3. La alianza: con quién y qué les ofrecemos

**El dato incómodo:** Mercado Pago "Cuotas sin Tarjeta" hace nuestro producto base: hasta 12 cuotas sin tarjeta, y **el comercio elige cuándo liberar los fondos: al instante o a 10, 18 o 35 días** ([MP Developers](https://www.mercadopago.com.ar/developers/en/news/2025/06/12/Mercado-Pago-Cuotas-sin-Tarjeta-now-available-on-Shopify)). Ni "cuotas sin tarjeta" ni "el comercio elige cuándo cobrar" nos diferencian frente a MP. Ualá da préstamos de hasta $5.000.000 en 24 cuotas a mayores de 18 sin deudas en mora en los últimos 24 meses ([iProUP, may-2026](https://www.iproup.com/finanzas/67498-como-pedir-un-prestamo-en-uala-en-2026)). En Lemon Mini-Apps figura **Lendoor** como "Soon": crédito de hasta 1.000 USDC ([lemon.me/build](https://lemon.me/build)).

**Qué no tienen: el fiador.** Prestarles a los jóvenes es caro: según un informe de Provincia Microcréditos citado por la prensa, la irregularidad del crédito en personas de 18 a 21 años llegó al **39,3% en abril de 2026**, contra 19,7% un año antes ([Perfil](https://www.perfil.com/noticias/economia/crece-mora-jovenes-9-de-cada-10-entran-registro-deudores-antes-conseguir-empleo-formal-a40.phtml)). No vimos el informe original. La consultora 1816 da 42,8% para 18 a 25 años (misma nota). Es razonable que el scoring de una billetera rechace o limite a esos usuarios. Lazo los vuelve financiables con un familiar que cubre el 100%.

**Propuesta a una billetera (hipótesis, nadie la aceptó):** "Monetizá a los usuarios que tu scoring rechaza. El riesgo lo cubre el fiador y lo fondea el pool, no tu balance. Vos ponés distribución, KYC y rampa; nosotros, el plan, el fiador y la cobranza." El fiador muchas veces ya es usuario de la billetera, así que la alianza también le da un motivo para activar a un familiar.

| Candidato | Encaje | Freno |
|---|---|---|
| **Lemon (Mini-Apps)** | Es el modelo que describe Luciano: app de terceros dentro de una billetera, con 5M+ usuarios, KYC, custodia y rampas incluidas | SDK solo para redes tipo Ethereum, no ejecuta nuestro programa Solana (ver `07` §2). Lendoor puede ser competencia directa o el slot de crédito ya ocupado. No publica cómo se reparte la plata |
| **belo / Ripio** | Cripto nativas, con USDC en Solana en sus wallets (ver `07`) | Ofrecen API y rampas, no un programa público de distribución. Hay que negociar la promoción aparte |
| **Mercado Pago / Ualá** | Son las de mayor alcance | Ya tienen crédito propio: somos competencia, no complemento, salvo como "segunda opinión" para los rechazados. No operan en Solana. Poco realista para un equipo sin tracción |

Orden sugerido: Lemon Mini-Apps (postular y preguntar por Solana y Lendoor) y belo/Ripio en paralelo. MP y Ualá, recién con datos de recupero propios.

## 4. Cómo se divide la plata

**No encontramos términos públicos** de reparto entre BNPL y billeteras: ni Cash App/Afterpay, ni Shop Pay/Affirm, ni Lemon Mini-Apps. Los esquemas posibles para negociar son:

| Esquema | Qué cobra el partner | Cuándo conviene |
|---|---|---|
| CPA por activación | Monto fijo por usuario que completa su primer plan **pagado** | Al principio: costo acotado y medible |
| Revenue share | % del ingreso neto **cobrado** de Lazo (no del capital ni de la cartera) | Cuando hay volumen y conciliación confiable |
| Fondeo por el partner | El partner pone capital en el pool y cobra rendimiento | Solo si quiere exposición al crédito. Es otro contrato |

**Techo de lo que podemos pagar:** lo que el partner nos ahorra en CAC, KYC y rampa por plan, más el volumen incremental que trae. Lazo cobra 4% de originación sobre lo financiado más 2% anual de administración (D8, `09` y el plan de negocio). Lo que se lleve el partner sale de ahí o sube la comisión al comercio. No prometer porcentajes hasta tener costos cotizados (`08` §modelo K).

## 5. Lo que tenemos que averiguar antes de negociar

1. **¿Los estudiantes ya tienen línea en Mercado Pago?** Preguntarles a 10 estudiantes de Tucumán si les aparece "Cuotas sin Tarjeta" y con qué límite. Si la mayoría tiene un límite suficiente, el mercado de Lazo es mucho más chico de lo que suponemos. Si no la tienen o el límite es bajo, ese es el argumento para la billetera aliada. Es la validación más barata y la más importante.
2. Las 9 métricas del piloto de `07` §8, sobre todo comprensión del fiador y checkout autónomo.
3. Postular a Lemon Mini-Apps solo cuando el equipo lo decida. No se contactó a nadie.

## 6. Para la hackathon

No cambia el producto ni el código. Cambia una frase del go-to-market en el pitch: **"Lazo no compite como billetera: es la capa de crédito con fiador que una billetera suma para aprobar a los usuarios que hoy rechaza."** Todo sigue en devnet. Las alianzas se presentan como plan, no como hechos.

## 7. Ronda 2 (2026-10-07): dirección elegida por Luciano

**Decidido (dirección, no contrato):**
- Lazo se presenta como **capa de crédito con fiador para billeteras**: la billetera suma cuotas sin poner su balance; las pérdidas las absorbe el pool (primero el junior). Frase aprobada: *"Lazo doesn't compete as a wallet: it's the guarantor-backed credit layer a wallet plugs in to approve the users it rejects today."*
- Partner prioritario: **una que venda cripto** (Lemon, belo, Ripio), por encaje con USDC/Solana y Web3.
- Relato para venture: infraestructura iterable. Cada billetera nueva suma distribución sin que Lazo construya otra app; estudiantes de Tucumán son la primera cohorte de prueba, no el mercado total.
- Idea a desarrollar: **la fintech aliada entra al pool** con una parte senior y otra junior y cobra rendimiento. Forma exacta: pendiente.

**Corrección de un dato:** $100.000 a ~$250.000 corresponde a **12 cuotas**, no a 3. Con CFTEA de 367% (caso publicado), 3 cuotas ≈ $134.000 y 12 cuotas ≈ $260.000 ([Informate Salta, nov-2025](https://informatesalta.com.ar/sociedad/ojo-al-cyber-monday--financiar-tus-compras-en-mercado-libre-puede-costarte-hasta-367--anual_a695d56ca583e69812800be5a); ver `research/a`). Un ejemplo de jul-2026 da +22,1% en 3 cuotas ([iProfesional](https://www.iprofesional.com/finanzas/442026-linea-credito-mercado-pago-como-activar-cuotas-sin-tarjeta)). El rango oficial publicado es CFTEA 61%–388% ([Mercado Libre](https://www.mercadolibre.com.ar/creditos/cuotas-sin-tarjeta)). En el pitch usar "hasta 388% CFTEA" o el ejemplo de 3 cuotas, nunca "3 cuotas → 2,5x".

**Preguntas abiertas (no completar por cuenta propia):**
1. **¿Dónde compra el usuario de la billetera?** Si es en cualquier QR (como Naranja X), el comercio no firmó nada y no paga el 7%: el ingreso tendría que salir de interés al comprador, y se cae el "3 sin interés". Si es solo en comercios adheridos, se conserva la comisión pero la escala depende de adherir comercios, igual que hoy.
2. **Fintech en el junior:** si pone primera pérdida, está tomando riesgo de crédito. ¿Por qué no presta sola? Respuesta candidata: el fiador, la cobranza y el senior lo fondean terceros. Validar con ellos.
3. **Usuarios de la billetera como senior** ("ahorrá en USDC financiando cuotas"): sumaría los dos lados del mercado con un solo partner, pero ofrecer rendimiento a minoristas puede ser oferta pública (CNV). Necesita abogado; no prometer APY (ver `08`).
4. Si la fintech entra al pool y además cobra por distribución, evitar doble cobro: definir si su retorno es solo el rendimiento del tramo o también CPA/revenue share.
