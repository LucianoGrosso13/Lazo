# 02 - Validación: "Cuotas sin tarjeta"

Sesión del 2026-10-03 (sede Tucumán). Skill: `/solana-tuc-validar`.

## La idea en una línea

"Ayudamos a estudiantes sin tarjeta de crédito en Tucumán a comprar en cuotas sin interés en comercios cerca de la facultad, para que accedan hoy a lo que necesitan y cada cuota pagada les abra más crédito."

### Decisiones de diseño anotadas (a revisar en `/grill-me`)

- **Anticipo:** es parte del pago y va directo al comercio. No es colateral bloqueado. Baja la exposición del pool.
- **Escalones (reputación):** cada plan pagado a tiempo sube de escalón. El escalón define el anticipo (50% → 30% → 15% → 0%) y el tope de compra (ej.: escalón 0 hasta 150 USD). Los montos por escalón están pendientes de definir.
- **Comisión al comercio:** se calcula sobre lo que adelanta el pool, no sobre el total de la venta. Ejemplo: venta de 1000, anticipo de 500, el pool adelanta 500, comisión del 6% = 30, el comercio cobra 970 al instante. Opción futura: comisión escalonada según cuándo quiera cobrar (instante 6%, 30 días 5%, 60 días 3%). Para el MVP, una sola opción.
- **Mora:** si se pasa la fecha de pago, corren intereses punitorios (como una tarjeta), baja de escalón y la wallet queda marcada.
- **Débito automático onchain (delegate de SPL Token):** solo cobra si hay saldo. El usuario puede sacar los fondos o revocar la autorización. Es comodidad, no garantía.
- **Identidad:** hace falta KYC para tener a quién cobrarle de verdad y evitar que el moroso empiece de cero con otra wallet. Proveedor y alcance en el MVP: pendientes.
- **Fondeo:** tiene que ser rentable para quien invierte. Es un punto crítico y está abierto (equipo/sponsor, inversores con rendimiento por comisiones o pool propio del comercio).

## Supuestos y evidencia

Ordenados de más a menos riesgoso. "Creencia" = lo afirma el equipo, sin evidencia todavía.

| # | Supuesto | Tipo | Evidencia hoy |
|---|---|---|---|
| 1 | **Morosidad baja** como para que el pool sea rentable. El equipo la marca como su mayor preocupación | Viabilidad | Ninguna. Es el supuesto central |
| 2 | El comercio acepta cobrar en USDC o con conversión rápida a pesos | Valor | Creencia. No hay ningún comercio con nombre todavía |
| 3 | Los estudiantes tienen wallets (Lemon, Belo, Ripio) para pagar cuotas | Uso | Creencia ("la mayoría tiene"). Ojo: son wallets custodiales. El débito automático por delegate requiere wallet propia (Phantom) |
| 4 | Hay inversores que ponen USDC con incentivos y es legal captarlos | Valor/viabilidad | Creencia. Argumento del equipo: la inflación en USD es ~3% anual y en pesos ~3% mensual. Un ~6% cada 60 días equivale a ~40% anual en USD, muy atractivo si la morosidad es baja (cuenta del equipo, sin verificar) |
| 5 | Los estudiantes sin tarjeta quieren cuotas para compras de 50 a 1000 USD | Dolor | Creencia ("es algo que pasa") |
| 6 | Se llega a construir en devnet antes del 12/10 | Viabilidad | Creencia del equipo |

Preguntas abiertas del equipo: cómo asegurar el cobro (morosidad), cómo integrarse con Ripio/Lemon y qué otros beneficios tiene el comercio.

## Competencia y patrón de mercado

### Colosseum Copilot (verificado 2026-10-03, búsqueda sin filtro de ganadores y otra solo con ganadores)

- BNPL onchain: alrededor de 10 intentos parecidos y **un solo ganador**.
  - [Yumi Finance](https://colosseum.com/projects/explore/yumi-finance): 1.º DeFi en Cypherpunk y después entró al accelerator C4. Demo funcional con checkout SDK, underwriting con datos de wallets, exchanges y bancos (zkTLS), vault de LPs en USDC (ERC-4626), cuotas con y sin interés y verificación de identidad con zkTLS y passkeys. Es lo más parecido a nuestra idea y está mucho más completo.
  - Sin premio: [FlexFi](https://colosseum.com/projects/explore/flexfi-1), [SOLSPLIT](https://colosseum.com/projects/explore/solsplit), [MicroPay](https://colosseum.com/projects/explore/micropay), [Kyro](https://colosseum.com/projects/explore/kyro-1), [BUYDL](https://colosseum.com/projects/explore/buydl), Buy Now Pay Never, FlexxCash. La mayoría son BNPL **con colateral cripto**: le sirven a quien ya tiene cripto, no al que no tiene tarjeta.
- Microcrédito estudiantil o social (búsqueda anterior): CampusFi, CreditChain, uLendMe, Saathi Loan, MINJAME, CrediSOL. Cero premios.

### Detalle de Yumi Finance (registro completo de Copilot + sitio, 2026-10-03)

- **Qué presentó en Cypherpunk (sept-oct 2025):** BNPL onchain en Solana que "maneja underwriting, financiamiento, originación y la deuda incobrable". Equipo de 4. 1.º DeFi y después accelerator C4 de Colosseum. Repo privado.
- **Cómo funciona según su demo:**
  1. Tienda online de ejemplo, donde en el checkout se elige "Buy Now, Pay Later".
  2. El usuario se loguea (Privy o Solflare, con passkeys) y conecta fuentes de datos para que lo evalúen: exchanges (Bybit), cuentas bancarias, tarjetas cripto, wallets y redes. Verificación de identidad con escaneo de pasaporte (zkMe, Vouch, zkTLS).
  3. Un algoritmo calcula el límite en tiempo real.
  4. Ofrece "Pay in 4" (4 pagos quincenales al 0%) o planes a 3 meses con interés. La primera cuota se paga onchain.
  5. Inversores depositan USDC en un vault estilo ERC-4626. Las cuotas e intereses vuelven al vault como rendimiento.
- **Modelo para el comercio (pitch):** 3% de comisión fija, cobro al instante, underwriting global. También SDK para tarjetas cripto y BNPL B2B.
- **Sitio hoy ([yumi.finance](https://yumi.finance)):** "Yumi Labs Inc., Est. 2025", "a software lab building credit products on stablecoin rails", "financial systems for assets banks can't underwrite". No muestra detalles operativos (países, mainnet, rendimientos). No se puede concluir si el BNPL está en producción.
- **Diferencias con nuestra idea:** Yumi apunta a usuarios web3 y e-commerce global, y evalúa crédito con datos que el usuario ya tiene (bancos, exchanges). Nosotros apuntamos a estudiantes sin historial en comercios físicos de Tucumán, y el crédito se gana con la escalera de anticipo. **Ojo:** su comisión (3%) es la mitad de nuestro 6% supuesto.

### Web

- **Mercado Pago "Cuotas sin Tarjeta"** ya existe en Argentina, con el mismo nombre: "el valor total de la compra se acredita por completo al vendedor" y el cliente paga "en hasta 12 cuotas fijas mensuales, sin tarjeta". Requiere validar identidad. [Docs de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/tiendanube/payments-configuration/mercado-credito), [iProfesional](https://www.iprofesional.com/finanzas/442026-linea-credito-mercado-pago-como-activar-cuotas-sin-tarjeta).
- **PayJoy (México):** financia celulares a personas sin acceso bancario, con anticipo de ~25-30%, y **bloquea el celular si no pagás**. El producto mismo es la garantía. [Expansión](https://expansion.mx/emprendedores/2018/05/08/payjoy-la-start-up-que-te-bloquea-el-celular-si-no-lo-pagas), [HelloSafe](https://hellosafe.com.mx/prestamos/personales/payjoy). Referencia para la morosidad.
- **Lemon y USDC en Solana:** según el resumen de búsqueda, Lemon retira USDC por BEP20, ERC-20 y Polygon, no por Solana. **Sin verificar**: la página de ayuda dio 404. Si se confirma, pegarle al supuesto 3 (wallets). Belo y Ripio, sin verificar.

### Dónde falla la competencia para ESTE usuario

- Mercado Pago: el riesgo lo pone su propio balance, en pesos, y el límite lo decide su scoring. El estudiante sin historial puede tener límite bajo o nulo (sin verificar). Para el comercio **ya cobra todo al instante**, así que "cobrás al toque" **no es diferencial** frente a MP.
- BNPL cripto: exige colateral cripto. No sirve para nuestro usuario.

### Patrón de mercado: **Clon vivo (fuera de cripto)**

La mecánica para el consumidor (cuotas sin tarjeta, comercio cobra al instante) ya la tiene Mercado Pago con distribución masiva. En Colosseum el BNPL es casi cementerio y el único ganador (Yumi) está muy adelante. La cuña tiene que salir de lo que MP **no puede** hacer: de dónde viene el capital (pool abierto en USD), reputación portable entre comercios, cobro en USD para el comercio, o una garantía tipo PayJoy. Pasa al test de cadena.

## Test de cadena

Respuesta del equipo: Solana es clave para **el pool** y para **la reputación entre comercios**, que permite ver el historial del comprador. Además, el comercio cobra en la moneda que prefiera: si quiere pesos, se le transfieren pesos y se cobra un spread por el cambio.

Evaluación:

| Parte | ¿Necesita cadena? | Nota |
|---|---|---|
| Pool abierto en USD: cualquiera fondea y cualquiera audita préstamos, pagos e impagos | **Sí, fuerte** | Es lo que MP no puede ofrecer: capital global para crédito argentino, con pérdidas visibles. Es el eje del pitch |
| Reputación portable (escalón por wallet que lee cualquier comercio o protocolo) | **Sí, media** | Solo vale si hay varios comercios o prestamistas leyéndola (arranque en frío). **Riesgo de privacidad:** publicar el historial de deudas de un estudiante es delicado. Propuesta: onchain solo el escalón y los contadores (pagos a tiempo, moras), no el detalle de cada compra |
| El comercio cobra en USDC o en pesos con spread | **No** | Es un off-ramp, se resuelve fuera de la cadena (y quizás requiere un socio PSAV). Es un beneficio comercial, no el argumento de cadena. Además, convertir a pesos le agrega trabajo operativo al equipo |
| "Más barato que MP" | **No** | Un banco también podría hacerlo. Es un argumento de producto, no de cadena |

Frase para el pitch (borrador): "Mercado Pago presta con su propia plata y su propio scoring. Nosotros abrimos el crédito a capital de cualquier lugar del mundo, en dólares, y cada cuota pagada es reputación que el estudiante se lleva a cualquier comercio."

## Puntajes

El equipo coincide en general (2026-10-03).

| Criterio | Puntaje | Por qué |
|---|---|---|
| Funcionalidad | 4 | Programa + web en devnet entra en 9 días si se recorta |
| Impacto | 4 | Las cuotas son enormes en Argentina, pero MP ocupa mucho espacio |
| Novedad | 2 | MP lo hace fuera de cripto y Yumi ganó con BNPL onchain. Lo nuevo es el pool abierto + la escalera + el foco en estudiantes de comercios físicos |
| UX | 3 | Login con mail + QR puede ser excelente. Fricción para cargar USDC en Solana. Idea del equipo: el estudiante transfiere pesos a un CVU y se convierte a USDC solo (requiere socio de rampa, sin verificar; tocar pesos suma regulación) |
| Open source / composabilidad | 4 | Escalón legible por otros; pool ocioso en Kamino |
| Plan de negocio | 2 | Margen vs. morosidad sin cerrar; captación de inversores posiblemente regulada (sin verificar); Yumi cobra 3% al comercio |

Decisión de privacidad: onchain solo el escalón y los contadores (pagos a tiempo, moras), no cada compra.

## 3 razones de fracaso

1. **La morosidad se come el margen.** Si el estudiante paga 0% de interés y el comercio ~6% de lo adelantado, pocos impagos alcanzan para que el pool pierda plata y los inversores no entren. Cuenta aproximada: sin recupero, se pierde plata con una morosidad mayor a ~6% de lo prestado. Si el moroso paga en promedio la mitad de las cuotas antes de dejar de pagar, el punto de equilibrio sube a ~12%. Dato preliminar de Devin (a confirmar en `research/b-...`): la irregularidad de los proveedores no financieros de crédito en Argentina rondaría el 27% (BCRA, feb-2026).
2. **Selección adversa.** El estudiante que tiene límite en Mercado Pago no se cambia. Llegan los que MP rechazó, que son los de más riesgo. Apuntar a "alguien que no tiene nada" es lo más difícil de financiar.
3. **Fricción y regulación del dinero.** Cobra en pesos y paga en USDC (riesgo cambiario y rampa). Captar inversores y prestar podría requerir registro BCRA o CNV. Los jurados lo van a preguntar.

Nota del equipo: MP también ofrece su propia tarjeta de crédito, que cobra caro (sin verificar, Devin buscando el CFT). Es una alternativa más del usuario, no una razón de fracaso.

## Test de mesa

Respuesta del equipo (2026-10-03): "generalmente se le pide la tarjeta a algún familiar".

- **Lectura:** es el comportamiento casero actual y es la mejor evidencia que tenemos. El estudiante **ya** resuelve las cuotas con la tarjeta de un familiar. El producto formaliza ese "prestame la tarjeta": el familiar pasa a ser **fiador** y solo paga si el estudiante no paga, sin prestar la tarjeta para cada compra.
- **Qué gana cada uno frente a hoy:** el estudiante construye su propio historial (la escalera). El familiar no usa su límite en cada compra ni presta el plástico, y queda cubierto con un tope.
- **Mecánica propuesta por el equipo:** el fiador registra una tarjeta de crédito o débito. Si el estudiante no paga, se le cobra a esa tarjeta. Tener fiador da mejores condiciones (menos anticipo o más tope). Cobrar a una tarjeta guardada se hace fuera de la cadena, con un procesador de pagos (proveedor sin verificar).
- **Nombres (2026-10-03):**
  - **Luciano Grosso:** compró con la tarjeta de los padres porque el CFT de MP es muy alto.
  - **Ignacio Albarracín:** igual, tarjeta de los padres por el CFT alto de MP.
  - **Mateo Antenucci:** no compró (se resignó).
- **Lectura:** 2 de 3 resolvieron con la tarjeta de un familiar y descartaron MP explícitamente por el costo. Coincide con el hallazgo de Devin sobre el CFT. Mateo es el caso "se resignó", que también es mercado. **Sesgo:** Luciano es parte del equipo (y si Ignacio también, la muestra es casi interna). Hace falta sumar personas de afuera del equipo.
- **Pendiente:** saber qué compraron y por cuánto (para calibrar el tope del escalón 0) y si los padres aceptarían ser fiadores con tarjeta en vez de prestarla.

## Hallazgos de la investigación con Devin (2026-10-03)

Detalle y fuentes en `research/a-costos-mercado-pago-y-competencia.md`, `research/b-morosidad-garantias-regulacion.md` y `research/c-implementacion-tecnica-solana.md`.

| # | Hallazgo | Efecto en la idea |
|---|---|---|
| 1 | **Precio al consumidor: confirmado.** MP Cuotas sin Tarjeta publica CFTEA de 61% a 388% (TNA 40-140%). Caso real: CFTEA 367%. Naranja X "Cuotas sin tarjeta": CFTEA de 70% a 403%. 3 cuotas en MP ≈ +29% real; cuota en USDC al 0% ≈ 0% real (el MEP subió +3,4% en 12 meses vs. IPC +33,5%) | ✅ Es la cuña de producto más fuerte. Ojo: el último año favoreció al deudor en USD, pero eso **no es estructural** (riesgo de salto cambiario) |
| 2 | **Comisión al comercio:** MP cobra **1,35% + IVA** por Cuotas sin Tarjeta, al instante y asumiendo el riesgo | ❌ Nuestro 6% no compite. El ingreso tiene que salir sobre todo del consumidor (un interés moderado, muy por debajo de MP) y la comisión al comercio tiene que quedar en ~1-1,5% |
| 3 | **Morosidad:** irregularidad de los prestamistas no bancarios 26,9% (feb-2026); **préstamos personales 34,1%**; familias en bancos 12,8% (may-2026), máximo histórico. Ualá tuvo que dar de baja ~1/4 de su cartera de consumo | ❌❌ El supuesto "morosidad baja" no se sostiene. El modelo tiene que aguantar 20-35% de mora o cortar la pérdida con garantías |
| 4 | **Garantías:** PayJoy bajó el default de 13% a 7% bloqueando el celular, pero **no opera en Argentina** y bloquear por mora no tiene base legal clara (ENACOM solo habilita bloqueo por robo) | El fiador con tarjeta pasa de opcional a **central** en los primeros escalones. Sin bloqueo de bienes en el piloto |
| 5 | **Regulación del pool:** prestar con fondos propios es legal como "proveedor no financiero de crédito" (registro BCRA). Un **pool con plata de inversores es intermediación financiera** (Ley 21.526) y requiere autorización. El régimen P2P (PSCPP) solo cubre préstamos en pesos y no permite garantizar el repago. Custodiar cripto de terceros requiere registro PSAV en CNV | ❌ Pega en nuestro mejor argumento de cadena. Para la hackathon: pool fondeado por el equipo o un sponsor, con el pool abierto regulado como roadmap. Explicarlo así suma credibilidad ante los jurados |
| 6 | **Rampas USDC por Solana:** Belo, Bitso, Binance y Ripio sí. **Lemon y Buenbit sin verificar.** Ripio tiene API para retirar a CVU en pesos | ✅ La idea del equipo de cargar con pesos o pagarle al comercio en pesos es viable vía Ripio o Bitso |
| 7 | **KYC:** Didit da 500 verificaciones gratis por mes, con cruce contra RENAPER | ✅ KYC real y demostrable en la hackathon a costo $0 |
| 8 | **Técnica:** un programa Anchor 1.2 con 6 PDAs, delegate SPL para débito (revocable), Phantom embedded (login con Google, soporta devnet), Solana Pay para QR. Clockwork está muerto: usar un crank propio o TukTuk | ✅ Factible en 9 días |
| 9 | **Competencia adicional:** Naranja X (QR, hasta 6 cuotas, hasta $300.000), Ualá (cuotificar, solo usuarios seleccionados), MODO (lo prestan los bancos), GoCuotas y Wibond (BNPL con débito, de Córdoba). MP **sí** aprueba sin recibo de sueldo, con scoring de uso | El relato correcto no es "los estudiantes no acceden a MP" sino "pagan el CFT más caro o tienen límites bajos" |

### Modelo revisado (propuesta a validar con el equipo)

- Estudiante: interés moderado en USD (ej.: +5% total en 3 cuotas), frente a +29% real en MP. Sigue siendo mucho más barato.
- Comercio: ~1,5%, para competir con el 1,35% de MP. Su beneficio diferencial: clientes que MP no atiende bien y cobro en USD o pesos a elección.
- Riesgo: anticipo + tope chico + KYC Didit + **fiador con tarjeta obligatorio en escalón 0-1** + reputación. El fiador deja de ser obligatorio al subir de escalón.
- Pool: fondos del equipo o un sponsor en el MVP. Inversores externos, solo en el roadmap y con un régimen regulado.

### Notas del equipo sobre el modelo (2026-10-03)

- Comisión y tasa: ajustables, no cerradas.
- Pool: el equipo propone estructurarlo "web3 afuera", con una entidad o pool fuera de Argentina. **A consultar con un abogado.** Advertencias de la investigación: (a) la Ley 21.526 art. 19 prohíbe la publicidad para captar recursos del público en Argentina sin autorización, así que no se puede ofrecer el pool a inversores argentinos; (b) prestarles a consumidores argentinos igual requiere registro como PNFC en el BCRA, aunque el capital venga de afuera (sin verificar para fondeo offshore).

## Criterio de abortar

Acordado con el equipo (2026-10-03):

1. **Usuarios:** el equipo considera que ya tiene evidencia (3 casos con nombre, 2 con tarjeta de los padres por el CFT de MP). No es criterio de abortar. Queda como **meta de tracción** para el bonus: sumar testers de afuera del equipo durante la semana.
2. **Fiador:** opcional, impulsado por el estudiante, y con **beneficios** si lo suma (menor anticipo, mayor tope). Sin fiador, el escalón 0 arranca con anticipo alto y tope muy chico. Si nadie suma fiador en las pruebas, se revisa la gestión del riesgo.
3. **Comercio:** sirve cualquier comercio, también online. Si no hay comercio físico dispuesto antes del 8/10, la demo usa una tienda online.
4. **Números del pool:** hay que ajustarlos hasta que sean viables. **Línea de abortar:** si con 30% de mora ninguna combinación razonable de tasa, comisión, anticipo, tope y fiador da rendimiento positivo y un precio todavía mucho más barato que MP, se cambia la mecánica antes de seguir construyendo.

### Calibración del test de mesa y pedido del equipo (2026-10-03)

- **Qué compraron:** Luciano e Ignacio, **una PC de ~1000 USD cada uno, en 3 cuotas sin interés con la tarjeta de los padres.**
- **Alerta (abogado del diablo):** el competidor real de estos dos casos no es el CFT de MP sino **"3 cuotas sin interés con la tarjeta de papá"**, un costo 0% subsidiado por el comercio. Frente a eso, un plan con interés, anticipo del 50% y tope chico es **peor** en precio. El valor tiene que estar en otro lado (independencia, historial propio, no usar el límite del familiar) o el usuario es otro: el que **no** tiene un familiar con tarjeta o compra donde no hay promo sin interés (caso Mateo).
- **Ticket:** la necesidad real es de ~1000 USD en la primera compra. Un tope de 150 USD en el escalón 0 no la cubre. Con fiador, el escalón 0 podría habilitar tickets altos.
- **Pedido del equipo:** aprovechar más la descentralización del pool: staking y más. Ideas a evaluar con la investigación E:
  - LP token componible (usarlo como colateral en otros protocolos).
  - **Staking de "avaladores"** en un tramo junior por cohorte (ej.: estudiantes de la UNT): comercios, egresados o el centro de estudiantes ponen capital de primera pérdida, ganan más y eligen o avalan a quién se le presta. Es underwriting descentralizado, al estilo de los backers de Goldfinch.
  - Advertencia: ofrecer rendimiento al público es justo lo que regula la Ley 21.526 (ver E).

## Hallazgos de la segunda tanda (Devin, 2026-10-03)

Detalle y fuentes en `research/d-modelo-economico-pool.md`, `research/e-estructura-legal-pool.md` y `research/f-fiador-y-comercios-online.md`.

- **D. Números:** **el modelo solo cierra con fiador.** Con 30% de mora: el libro con fiador (recupero del 80%) rinde ~+20% anual. El mismo libro **sin fiador pierde ~48% anual**. Mora de equilibrio: sin fiador 14%, con fiador r=50% 26%, con fiador r=80% 58%. Hay combinación viable: interés de 6-12% sobre lo adelantado, comisión al comercio de 1,5-2% y un costo real para el estudiante de 4-7% (frente a ~29% en MP), **siempre que ~3/4 del capital esté respaldado por fiadores**. La comisión al comercio casi no mueve el resultado; lo que decide es el recupero del fiador. Benchmarks USDC en Solana: Jupiter Lend ~5%, Kamino ~6%, Huma PST ~8%. Lo vendible: un senior al ~8% con un junior del 20% (equipo o sponsor).
- **D. Tabla MVP propuesta:** anticipo 50/30/15/0%. Topes de US$75→500 sin fiador y US$150→750 con fiador. Interés de 15%→10% sin fiador y 10%→6% con fiador. Comisión 1,5%. Junior ≥20% + reserva del 10%. El tramo sin fiador es **costo de adquisición acotado**, no ganancia.
- **E. Legal:** el "pool afuera" resuelve el lado del inversor extranjero, pero no exime de registrarse como PNFC al que origina en Argentina, ni permite ofrecer el pool al público argentino (art. 19). **Precedente en Solana:** Credix (originador local → trust → nota en USDC para inversores acreditados; Solana Foundation fue LP). **Vía local regulada:** el fideicomiso financiero, que es como MercadoLibre tituliza Mercado Crédito. **Recomendación MVP:** pool = tesorería del equipo en devnet. El crédito se origina como **venta en cuotas del comercio, cedida a la plataforma** (subrogación, art. 915 inc. c CCyC, modelo GOcuotas). Roadmap: offshore tipo Credix + fideicomiso con inversores calificados.
- **F. Fiador:** cobrarle a una tarjeta guardada (crédito **o débito**) es estándar: MP Pagos Automáticos o Mobbex, ambos con sandbox. Stripe no opera para comercios argentinos. No es garantía irrevocable (el titular puede desconocer el cargo dentro de 30 días); la cobertura legal es la **fianza solidaria escrita con tope**. Precedentes: GOcuotas (cuotas con **débito**, PNFC, reporta al BCRA, **le paga al comercio a 22 días hábiles**), Hoggax y Finaer (fiador digital).
- **F. Canal:** Tiendanube (180.000+ tiendas). Para el MVP, "medio de pago personalizado" sin aprobación o un plugin de WooCommerce. Talo Pay ya cobra USDC en Tiendanube. Topes según precios reales: escalón 0 ≈ US$150, con fiador US$300-500, avanzado US$700-1.000.
- **Competidor nuevo a tener en cuenta:** **GOcuotas** (cuotas con débito, en Tiendanube). Lo que lo diferencia de nosotros: le paga al comercio a 22 días hábiles (nosotros al instante), no tiene escalera hacia el crédito propio y no opera en USD.

### Aclaración del equipo sobre el usuario

"Las tarjetas son de nuestros papás, no nuestras. No todo el mundo tiene esa ventaja, es difícil de conseguir, y no todos dan cuotas sin interés." → El usuario es el estudiante **sin tarjeta de crédito propia**, cuya familia **no tiene o no presta** una tarjeta de crédito, o que compra donde no hay promo sin interés.

**Tensión a resolver:** el modelo (D) necesita fiador, y el usuario es justo el que no tiene un familiar con tarjeta de crédito. **Salida:** el fiador puede respaldar con **débito**, que es mucho más común (cualquier familiar con cuenta sueldo la tiene). MP y Mobbex cobran a débito guardado y GOcuotas ya opera así.

## Veredicto

**2026-10-03 — Angostar a la cuña + clon consciente.** Lo eligió el equipo.

**Frase de una línea (versión angostada):** "Ayudamos a estudiantes sin tarjeta de crédito a comprar en cuotas con el débito de un familiar como respaldo, para que cada plan pagado los acerque a su propio crédito, sin fiador y a una fracción del costo de Mercado Pago."

**La cuña:**
1. **Respaldo con débito de un familiar** (no hace falta que la familia tenga tarjeta de crédito). El familiar solo paga si el estudiante no paga, con tope y fianza escrita.
2. **Escalera hacia el crédito propio:** cada plan pagado baja el anticipo, sube el tope y, al llegar a cierto escalón, **libera al fiador**. La reputación (solo escalón y contadores) queda onchain y es portable entre comercios.
3. **El comercio cobra al instante** (GOcuotas paga a 22 días hábiles), en USDC o en pesos.
4. **Costo real ~4-7%** para el estudiante, contra ~29% real en 3 cuotas de MP (CFTEA 61-388%).

**Clon consciente:** "Somos el intento N de cuotas sin tarjeta. MP, Naranja X y GOcuotas lo hacen fuera de cripto, y Yumi ganó con BNPL onchain. Nuestra apuesta es el respaldo familiar con débito más la escalera que gradúa al estudiante a su propio crédito, financiado por un pool en USD con tramos."

**Re-chequeo de competencia de la versión angostada (Copilot, 2026-10-03):** la búsqueda de "familiar fiador que solo paga si hay default + graduación a crédito propio" no devolvió ningún proyecto con esa mecánica. Aparecen CreditChain, PartPay, uLendMe y CredIA (crédito con scoring o avales sociales, sin premio) y Yumi (ganador, sin fiador). En TradFi, GOcuotas es lo más cercano (débito, sin fiador separado, sin escalera). Hueco: **plausible**. Que no haya resultados no prueba que no existan competidores.

**Decisiones que heredan las próximas etapas:**
- Pool = tesorería del equipo en devnet. El crédito se arma como venta en cuotas cedida (modelo GOcuotas). Roadmap: offshore tipo Credix + fideicomiso con inversores calificados. Nunca ofrecer el pool al público argentino.
- Tabla de escalones de partida: la de `research/d-modelo-economico-pool.md`, ajustable.
- KYC real con Didit (gratis). Cobro al fiador en sandbox con MP o Mobbex. Canal: medio de pago personalizado en Tiendanube o WooCommerce.
- Abiertos para `/grill-me`: diseño del staking o tramo junior descentralizado, en qué escalón se libera al fiador, ticket alto en la primera compra (el caso de la PC de 1000 USD) y riesgo cambiario del estudiante que cobra en pesos.

## Decisiones de diseño (`/grill-me`, ronda 1, 2026-10-03)

| # | Decisión | Elegido |
|---|---|---|
| Q1 | Moneda de la deuda | **Deuda en USDC. El estudiante puede pagar cada cuota en pesos al tipo de cambio del día** (CVU → Ripio/Bitso). Se le muestra el riesgo cambiario con claridad; plazo corto de 3 meses. En la demo, el pago en pesos se simula |
| Q2 | Ticket alto en la primera compra | **Tope dinámico con fiador: tope = cobertura del fiador ÷ (1 − anticipo).** Sin fiador, tope fijo chico (~150 USD). Ej.: fiador cubre 500, anticipo 50% → PC de 1000 |
| Q3 | Tramos / staking en el MVP | **Dos tramos en el programa:** junior (primera pérdida, equipo) y senior (wallets de prueba). En la demo, un impago le pega primero al junior. Avaladores por cohorte: roadmap |
| Q4 | Cómo ve el precio el estudiante | **Interés explícito y chico**, con el CFT de MP al lado para comparar. "Sin interés absorbido por el comercio": roadmap |

Pendiente para la ronda 2: cuándo y cómo se libera al fiador; flujo de mora (gracia, cuándo se cobra al fiador, punitorio, pérdida de escalón); onboarding del fiador (KYC, fianza con tope, débito guardado); qué pasa si el fiador revoca el débito; tabla final de escalones; canal de la demo (Tiendanube vs. tienda propia).

## Decisiones de diseño (`/grill-me`, ronda 2, 2026-10-03)

| # | Decisión | Elegido |
|---|---|---|
| Q1 | Liberación del fiador | **El fiador nunca se libera.** Si el estudiante no paga, se le ejecuta al fiador. La escalera mejora las condiciones del estudiante, pero no lo gradúa a "sin fiador" |
| Q2 | Flujo de mora | Día 0 vence (cobro por delegate si hay saldo). Días 1-5 de gracia, y el día 3 se le avisa al fiador. Día 6: punitorio fijo de 5% sobre la cuota vencida y el plan no cuenta para subir de escalón. Día 15: se le cobra al fiador la cuota vencida + punitorio, el estudiante baja un escalón, `moras += 1` onchain y no puede abrir planes nuevos. Segunda cuota cobrada al fiador en el mismo plan: caducan los plazos y se cobra el saldo |
| Q3 | Onboarding del fiador | Sin wallet. Link por WhatsApp → KYC Didit (real) → resumen con tope en USD y pesos → fianza por click-wrap (PDF + hash onchain) → tarjeta en Mobbex "suscripción manual", en sandbox. Plan B: MP Pagos Automáticos. Simulado: el cargo con plata real y la firma digital certificada |
| Q4 | Medio del fiador y desconocimiento | **Solo tarjeta de crédito, no débito.** El fiador firma la fianza con los métodos de cobro explícitos y queda aceptada antes de cualquier cargo, para cubrirse si después la desconoce |
| Q5 | Cobertura | El equipo no lo considera relevante: si el estudiante no paga, se le cobra a la tarjeta. Implementación por defecto: **una fianza con monto máximo** (el art. 1578 del CCyC lo exige para la fianza de deudas futuras), un plan activo por estudiante y un fiador por estudiante |
| Q6 | Canal de la demo | **Tienda propia con nuestro botón de checkout** + "integraciones a los métodos de pago" (alcance a definir en la ronda 3) |
| Q7 | Recupero onchain | El keeper del backend firma `registrar_recupero`, deposita USDC de la tesorería y emite un evento con el hash del comprobante del procesador. El mismo keeper ejecuta los vencimientos |

## Decisiones de diseño (`/grill-me`, ronda 3, 2026-10-03)

| # | Decisión | Elegido |
|---|---|---|
| Q8 | Usuario y argumento contra "la tarjeta de papá" | **Fiador solo con tarjeta de crédito en el MVP.** Usuario: el estudiante que no quiere o no puede pedir la tarjeta para cada compra y quiere su propio historial. La ventaja según el equipo está en **el sistema de cuotas e intereses**: no consume el límite del familiar y es más barato que las cuotas con interés cuando no hay promo. La familia sin tarjeta de crédito va al tramo sin fiador (tope chico). El débito queda para el roadmap |
| Q9 | Qué gana el estudiante al subir de escalón | **Mejores condiciones** (menos anticipo, más tope, menos interés) y **la exposición del fiador baja** con cada escalón, aunque nunca llega a cero. La reputación sigue onchain (escalón + contadores) |
| Q10 | "Integraciones a los métodos de pago" | Que **los comercios puedan ofrecerlo** como medio de pago en sus plataformas (Tiendanube, WooCommerce). La demo es la tienda propia con nuestro botón. El alcance de la integración se define en `/solana-tuc-mvp` |

Pendiente para la ronda 4: **la tabla final de escalones** (anticipo, tope, interés y cobertura exigida al fiador por escalón; tramo sin fiador).
