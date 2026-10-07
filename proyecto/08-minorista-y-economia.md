# 08 — Minorista fácil y economía por compra

Fecha: **07/10/2026**. Investigación y propuesta documental; no implementa cambios ni aprueba precios. Todas las pruebas propuestas corren en **devnet**, la red de prueba de Solana donde la plata no vale nada, con devUSDC, un token de prueba que representa USDC en la demo. USDC es una moneda digital que busca mantener el valor de un dólar; la deuda denominada en ella implica riesgo cambiario para quien cobra en pesos.

## Recomendación y límites

Probar un **link/QR propio de Lazo para compras minoristas**, con alta del fiador reutilizable y oferta calculada antes de confirmar. Empezar por compras concretas de estudio y trabajo con compradores ya dados de alta, sin ampliar todavía los planes simultáneos del MVP. Un QR reduce pasos de entrada; no resuelve el costo de fondeo ni el riesgo de cobro. La compra chica debe pasar el mismo análisis económico que una PC.

El modelo ilustrativo de este documento da contribución negativa para tickets de US$20 en todas las variantes financiadas examinadas. No demuestra que el minorista sea imposible: identifica cuánto deben mejorar costos, recupero y precio para habilitarlo. Tampoco demuestra rentabilidad para tickets mayores: faltan evidencia de comportamiento, cotizaciones completas y validación de costos y riesgos.

Leídos: `AGENTS.md`, `02-validacion.md` (rondas y addendum), `03-mvp.md`, `04-plan.md` (Estado) y `research/d-modelo-economico-pool.md`. El Estado informa integraciones Didit/Mobbex pendientes de credenciales; **no se da por probado el cobro real al fiador**. El addendum refiere una carpeta `06-viabilidad/` que no estaba disponible en este checkout al revisar; no se usó su contenido como evidencia. Los retornos históricos de research/d responden a otros precios y coberturas, omiten costos relevantes para retail y no son promesas actuales.

### Decisiones recibidas para esta propuesta

Estas instrucciones actuales reemplazan, para el diseño de este documento, las alternativas anteriores incompatibles; el coordinador debe integrarlas a los documentos canónicos.

| Tema | Decisión actual / pendiente |
|---|---|
| Comprador | **1 y 3 cuotas sin interés; 6 cuotas con interés chico, sin tasa definida**. No extrapolar interés por escalón de research/d |
| Comercio | Elige cuándo cobrar y una tarifa según plazo. **7% sobre lo financiado es referencia de cobro inmediato a 3 cuotas**. Otras tarifas no aprobadas |
| Fiador | **Cobertura obligatoria del 100% en todos los escalones**. La obligación no equivale a recupero efectivo del 100% |
| Escalera | Mejora anticipo y límite; no disminuye cobertura. Menor anticipo puede aumentar exposición absoluta del fiador |
| Reparto | Empresa/pool pendiente; no tratar 7% como ingreso de ambos simultáneamente |
| 1 cuota | Resolver si significa **contado hoy** o **financiación a un mes**. No presentar las dos cosas como equivalentes |
| Alcance | Documento de propuesta. Demo devnet; tarifas, múltiples planes y devoluciones aquí diseñadas no están implementadas |

No se dispone de la definición de la opción H ni de las ideas 1/2/10/11. No se les atribuye contenido ni se declara que esta propuesta las desarrolla.

## Fuentes oficiales y qué permiten concluir

Consulta web: **07/10/2026** en todas las filas. Son capacidades/precios publicados, no cotizaciones a Lazo ni prueba de habilitación de su actividad. Se separa la fecha de consulta de la publicación cuando la página no informa esta última.

| Fuente | Hallazgo verificable | Aplicación y límite |
|---|---|---|
| [Mobbex Smart Checkout](https://www.mobbex.com/smart-checkout/) | Ofrece modalidades redirect, embebida y transparent; SDK/API, tokenización y webhooks | Propuesta: checkout alojado para el alta de tarjeta, con menos manejo de datos sensibles. No prueba ahorro monetario ni aprobación de cargos |
| [Mobbex Panel de suscriptor](https://ayuda.mobbex.com/panel-de-suscriptor) | Permite cobro manual sobre tarjeta tokenizada y gestionar el medio de pago | Es la capacidad relevante para cobrar ante mora; falta probar monto variable, autorización comercial, revocación, reintentos y conciliación en sandbox |
| [Mobbex Suscripciones con wallet](https://mobbex.dev/suscripciones-con-wallet) | La documentación indexada describe tarjetas compartidas por `customerreference` entre suscriptores | Evidencia parcial: apertura directa dio error interno, el contenido oficial se pudo leer en el índice. No dar por habilitado en la cuenta de Lazo ni asumir portabilidad del token entre comercios/entidades |
| [Mobbex FAQ](https://www.mobbex.com/faq/) | La decisión de aprobar/rechazar corresponde al emisor; la acreditación depende del medio y acuerdo con procesadora | Tarjeta registrada y fianza aceptada no son dinero reservado. La liquidación de recuperos tiene su propia demora |
| [Mercado Pago, tarjetas guardadas](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/saved-cards?scope=prod) | Reutiliza tarjetas tokenizadas, pero este flujo exige volver a capturar CVV | No sirve como evidencia de cargo automático sin presencia del fiador. Cualquier alternativa recurrente requiere revisar su flujo específico |
| [Mercado Pago, procesamiento QR](https://www.mercadopago.com.ar/developers/es/docs/qr-code/payment-processing) | Orders por sucursal/caja, clave `X-Idempotency-Key`, consulta de estados y reembolso | Referencia para conciliación e idempotencia. Su integración QR no incorpora automáticamente el crédito de Lazo |
| [BCRA, Transferencias 3.0](https://www.bcra.gob.ar/transferencias-3-0/) | Publica pagos con transferencia interoperables y rango de precio **0,6–0,8% más IVA** | Benchmark específico de ese circuito, no costo de una tarjeta ni de un préstamo. Lazo no es un aceptador interoperable por generar una URL |
| [Mobbex, planes](https://www.mobbex.com/planes/) | Essential: **1,9% + IVA débito; 2,6% + IVA crédito/prepagas; 3,9% + IVA suscripciones**, por transacción aprobada. Enterprise: arancel a medida | Precios publicados sin fecha de publicación visible. Confirmar por cotización qué incluyen, adquirencia, mínimos, cargo manual al fiador, contracargos y costos no reintegrados. No sumar ni reemplazar aranceles sin conocer su alcance |
| [Didit, pricing](https://didit.me/pricing/) | Publica **500 Full KYC gratis/mes** y **US$0,33 por Full KYC**; módulos adicionales tienen precios separados. Anuncia cambio el **01/11/2026** | KYC es verificación de identidad. Presupuestar costo de escala y revalidaciones; el beneficio gratis no vuelve estructuralmente gratuita la operación. Revisar precios antes del cambio anunciado |

No se utiliza como precio vigente el 6,60% de Link de Pago de Mercado Pago encontrado en su ayuda: la apertura de la página falló y el índice no permite cerrar provincia, impuestos y plazo aplicables. Tampoco se arrastran CFTEA, promociones de cuotas ni rendimientos de fuentes anteriores sin nueva verificación. Las cifras de financiación/rampa de abajo son **hipótesis internas**, no tarifas de proveedores.

**Inferencia de diseño:** reutilizar identidad y tarjeta puede bajar el costo de una compra repetida y usar checkout alojado puede reducir pasos y complejidad. Medirlo; las fuentes no prueban la tasa de conversión o recupero de Lazo.

## Flujo minorista propuesto

### Venta en mostrador y online

1. El comercio genera una orden con importe, moneda, detalle del producto, sucursal y vencimiento. Para mostrador presenta un QR dinámico; online comparte el mismo link. Un cartel QR estático puede abrir la página del comercio, pero el cajero confirma la orden y el importe desde su panel antes de financiar.
2. El QR contiene una **URL de Lazo**. Se abre con la cámara/navegador; no se promete que Lemon, Mercado Pago o cualquier lector de QR de pagos lo procese. Una integración con QR interoperable exigiría un circuito y un socio habilitado separados.
3. El estudiante se identifica y ve su anticipo, límite disponible y fiador vigente. Una wallet es la aplicación/cuenta con la que autoriza movimientos en Solana; conectarla no reemplaza validar identidad. Si falta alta, la orden puede quedar pendiente mientras el familiar completa su invitación; el cajero no debe esperar sosteniendo una venta aprobada ficticia.
4. Lazo muestra opciones elegibles: 1/3 sin interés y 6 con el interés total a definir. Antes de confirmar: anticipo, cuota, fechas, total en devUSDC, equivalente indicativo en pesos, vigencia del cambio y exposición del fiador. “Sin interés” no significa pesos fijos ni rampa gratuita. Los costos adicionales deben verse antes de aceptar; no afirmar igualdad con contado si hay recargo encubierto.
5. El comercio elige una opción de liquidación previamente acordada. Ve **neto, tarifa sobre financiado, fecha y riesgos**. Si cambia el precio, plazo o tarifa se emite una cotización nueva y el comprador acepta de nuevo.
6. Se reserva límite y se crea un solo plan por orden. La firma es la autorización del movimiento desde la wallet; las firmas/transacciones de demo necesitan aprobación explícita y solo operan en devnet. Pantalla final de caja confirmada desde backend/cadena, no desde una captura del cliente o URL de retorno.

Para compra repetida: no pedir otra vez DNI, tarjeta y fianza si la verificación sigue vigente, no hubo cambios relevantes y alcanza el límite. Mostrar “Tu fiador sigue vigente; esta compra utiliza X de Y disponibles”. **La aprobación de cada compra y su cotización siguen siendo explícitas**. No guardar número completo de tarjeta ni CVV en Lazo; guardar referencia del proveedor, estado y datos mínimos para reconocerla.

### Límite agregado y reutilización segura

El **programa actual** permite un plan activo por estudiante; el **mock ya permite planes paralelos con margen compartido**, divergencia documentada en `05-pitch.md`. Propuesta para la primera prueba minorista del programa: conservar un plan y repetir después de cerrar el anterior. La migración onchain para varios planes sigue pendiente; debe impedir que varias compras pequeñas eludan el tope.

Para esa ampliación, propuesta de control:

```
exposición_por_plan = principal pendiente + interés adeudado
                     + reserva de punitorios contractualmente posibles
disponible_fianza = máximo total consentido
                   - suma(exposición de todos sus planes)
                   - reservas de órdenes aún no finalizadas
```

La decisión vigente exige 100% del capital financiado pendiente. Cubrir también interés y reserva de punitorios es una **propuesta contractual pendiente**, no una extensión ya aprobada del 100%. Definir el alcance exacto, duración y techo antes de modificar contratos. Una aprobación de tarjeta no verifica capacidad de cubrir toda esa suma. Aplicar límites por estudiante **identificado**, fiador, comercio y cohorte, incluyendo distintos comercios y wallets. Reservar de forma atómica para evitar dos checkouts concurrentes que consuman el mismo saldo; expirar reservas abandonadas y liberar solo ante cierre confirmado.

Mantener versión/hash del consentimiento, vigencia de identidad y tarjeta, y regla de revalidación por vencimiento, cambio o señal de riesgo. Si revoca el medio de pago, bloquear nuevos planes y tratar la deuda existente conforme al acuerdo; no asumir que desaparece ni que puede cobrarse igual. Reutilizar alta no significa transferir tokens de tarjeta a cualquier adquirente.

**Escalera:** conservar el criterio vigente `min_financed_to_count` (US$100 financiados según Q13) hasta decisión explícita. Una compra de US$20 no debe subir reputación por defecto; varias microcompras tampoco deben producir crédito ilimitado. No ajustar ese umbral para fabricar frecuencia o métricas de éxito.

### Idempotencia, fallos y devoluciones

Idempotencia significa que repetir una solicitud por problemas de conexión no duplica sus efectos. Propuesta documental:

| Evento | Regla |
|---|---|
| Doble clic / recarga / dos dispositivos | Clave única orden+versión de cotización; unicidad de plan; rechazar misma clave con contenido diferente |
| Timeout al crear plan | Consultar estado/confirmación antes de reintentar; conservar orden, intento y referencia de cadena |
| Cargo manual al fiador | Clave plan+cuota+intento lógico; un resultado desconocido se concilia antes de otro cobro. No atribuir soporte nativo de idempotencia a Mobbex sin probarlo |
| Webhook duplicado o fuera de orden | Verificar autenticidad y consultar proveedor cuando corresponda; deduplicar evento/transacción y permitir solo transiciones válidas |
| Recupero | Relacionar cobro confirmado, conversión y depósito devnet; impedir doble registro y registrar reversos. Aprobación de tarjeta no equivale a fondos definitivos |
| Caja offline | Estado pendiente, no entrega como financiada hasta confirmación confiable; límites de expiración claros |

Devolución total antes de liquidación: cancelar orden/plan, devolver pagos ya recibidos y liberar exposición tras confirmaciones. Después de liquidación: recuperar neto del comercio vía reserva/clawback acordado (derecho de recuperar fondos), separar monto que cancela deuda del monto que vuelve al comprador y, si pagó el fiador, devolverle lo que corresponda. Nunca devolver todo al estudiante y dejar al fiador debitado.

Devolución parcial: política pendiente; propuesta prorratear capital y revisar calendario/interés/comisión sin exceder el valor realmente devuelto. Suspender el cobro de la porción disputada mientras se concilia según política acordada; no borrar la mora automáticamente. Definir quién absorbe procesador no reintegrable, diferencia cambiaria, faltante del comercio y fraude. Usar una identidad por devolución y conciliar referencias originales. Si el comercio no devuelve, es una exposición distinta del default estudiantil, incluida en reservas y sensibilidad. No se declara soporte implementado de reembolsos en el programa.

## Categorías y tickets: candidatos, no demanda validada

| Candidato | Banda de ticket propuesta, equivalente USD | Razón para entrevistar / objeción |
|---|---|---|
| Material de estudio, librería, insumos de cursado | 20–80 | Compra verificable, pero costos fijos y necesidad de cuotas pueden no justificar crédito |
| Mochila, calzado, periféricos, reparación documentada | 80–250 | Puede concentrar una necesidad concreta; medir margen comercial y reversibilidad de devolución |
| Herramientas/equipamiento de estudio y trabajo | 250–600 | Mayor capacidad de absorber costo fijo; sigue expuesto a mora y fraude |
| PC/electrónica grande | 600–1.500 | Continuidad con demo; no implica aceptación del comercio ni capacidad de pago validada |

Estas bandas no son nuevos topes aprobados ni resultados de entrevistas. Usar topes vigentes hasta aprobación. Evitar como primera expansión crédito recurrente para comida/gastos diarios, productos fácilmente convertibles a efectivo y compras simuladas entre comercio y estudiante. Un carrito puede reunir productos de una compra real para repartir costos; no incentivar sobrecompra ni acumular deuda para alcanzar el mínimo.

## Economía reproducible por compra

### Separar caja, ingresos y contribución

Anticipo y devolución de principal **no son ingresos**. La comisión al comercio y el interés cobrado son ingresos; el capital devuelto recupera el préstamo. Medir por orden cerrada, cohorte y unidad de capital/tiempo, sin anualizar como APY prometido.

| Variable | Definición |
|---|---|
| P, a, F | Ticket; fracción de anticipo; financiado `F=P(1-a)` |
| n, i, c, D | Cuotas mensuales; interés total sobre F; tarifa comercio sobre F; día de liquidación de la parte financiada |
| d, k, u | Probabilidad de entrar en el escenario de default del modelo; cuotas pagadas antes; fracción pendiente `u=(n-k)/n` |
| r | Recupero bruto efectivo del saldo impago, neto de posteriores reversos/contracargos **pero antes** del arancel del procesador. Puede incluir curas del estudiante; distinguir origen en medición |
| phi, p, x, z | Arancel sobre recupero del fiador; costo de cobros ordinarios; FX/rampa; pérdida/costo adicional de devoluciones y fraude comercial, estos últimos expresados como porcentaje efectivo de P |
| h, W | Costo anual simple del capital como hipótesis, y días equivalentes de capital comprometido por unidad de F |
| K | Identidad amortizada + red/operación + soporte + costos fijos asignados + CAC amortizado. CAC es el costo de conseguir un cliente |

Cobertura contractual del fiador = **100%**, distinta de `r`. Default en este modelo no es una tasa de atraso de BCRA ni un dato medido de Lazo. Se permite recupero posterior; pérdidas finales son la parte no recuperada.

```
interés esperado = i F [1 - d u (1-r)]
pérdida principal = d u F (1-r)
procesador recupero = phi d u F (1+i) r
costo capital = h F W / 365
C = cF + interés esperado - pérdida principal - procesador recupero
    - pP - xP - zP - costo capital - K
```

La fórmula supone el mismo patrón de pago/recupero para principal e interés, comisión efectivamente cobrable al comercio, sin ingresos por punitorios, sin ingresos por fondos ociosos y sin duplicar fraude/contracargos en `r` y `z`. Si el recupero viene de varias vías, reemplazar el costo de tarjeta por la suma de cada canal; acá se presupuesta todo el recupero como cargo al fiador. Impuestos no recuperables deben incluirse en los costos efectivos y en la cotización; no son margen. Un modelo fiscal definitivo exige cotización y revisión profesional.

Para calcular W de manera repetible: cuotas vencen en días 30,60,...,30n; anticipo llega al comercio hoy; la parte financiada neta `F(1-c)` se liquida en D=0 o 30. En el escenario de default se pagan k cuotas y el resto se recupera o se reconoce como pérdida al día `30(n+2)`, **60 días después de la última cuota**. No se considera dinero liberado antes del recupero/escritura de pérdida. Las cobranzas anteriores a liquidación permanecen segregadas para esa obligación.

```
j0 = D / 30                    # solo D=0 o 30 en estos ejemplos
W_normal  = 30 sum(max(1-c-j/n, 0), j=j0,...,n-1)
W_default = 30 sum(max(1-c-min(j,k)/n, 0), j=j0,...,n+1)
W = (1-d) W_normal + d W_default
```

Se financia el neto descontada la comisión; las amortizaciones de principal reducen capital. Intereses cobrados no se usan para reducir W, una simplificación conservadora. La integración real debe incorporar fechas de recupero y acreditación, retrasos adicionales, reservas, liquidez ociosa y pagos parciales. Reconocer la pérdida requiere capital que la absorba: no genera una devolución de efectivo.

### Supuestos numéricos: todos son hipótesis salvo la referencia 7%

- `a=30%`, `d=8%`, `r=80%`, `h=12% anual simple`, `phi=5% efectivo`, `p=1% de P`, `x=0,5% de P`, `z=0,2% de P`. **No son métricas de Lazo ni tasas aprobadas.** El 5% reserva un costo de procesamiento ilustrativo; no es una cotización completa de Mobbex.
- `k=0` para una cuota financiada; `k=1` para tres/seis. Sin interés en 1/3; para explorar sensibilidad de 6 se usa **i=4% total sobre F, hipótesis sin aprobación** (no mensual y no sugerencia de tasa final).
- `K_nuevo=4`: identidad 0,66 (dos bundles Didit de 0,33 como referencia, sin extras), red/operación 0,14, soporte 0,80, costos fijos asignados 0,90, CAC 1,50. Todo salvo el precio de referencia del bundle es presupuesto hipotético.
- `K_repetido=1,40`: identidad/revalidación amortizada 0,10, red/operación 0,10, soporte 0,50, costos fijos asignados 0,40, CAC amortizado 0,30. No equivale a costo marginal puro.
- Los costos fijos se asignan como presupuesto del período / órdenes reales; CAC como costo de adquisición / compras completadas observadas, no sobre una recurrencia soñada. El menor K repetido es una hipótesis a contrastar. El gratuito de Didit no se usa para probar economía sostenible.

### Sensibilidad de ticket y plazo

Cada celda es **C por compra repetida / nueva**, en USDC equivalente; redondeo a dos decimales. Anticipo siempre 30% para aislar ticket/plazo. El caso “1” aquí significa **financiación hasta día 30**; contado requiere otro modelo, con F=0, sin default del préstamo y sin tarifa calculada sobre financiado.

| Cuotas / cobro comercio | c / i usados | W días | P=20 | P=100 | P=1.000 |
|---|---|---:|---:|---:|---:|
| 1 / hoy | 3% / 0%, tarifa hipotética | 33,756 | -1,74 / -4,34 | -3,12 / -5,72 | -18,61 / -21,21 |
| 3 / hoy | **7% referencia** / 0% | 57,364 | -1,20 / -3,80 | -0,42 / -3,02 | +8,44 / +5,84 |
| 6 / hoy | 9% / 4%, ambas hipótesis | 96,368 | -0,60 / -3,20 | +2,62 / +0,02 | +38,77 / +36,17 |
| 3 / día 30 | 5% / 0%, tarifa hipotética | 30,760 | -1,36 / -3,96 | -1,20 / -3,80 | +0,56 / -2,04 |
| 6 / día 30 | 7% / 4%, ambas hipótesis | 72,164 | -0,77 / -3,37 | +1,77 / -0,83 | +30,34 / +27,74 |

En diferido se supone que **Lazo garantiza la liquidación en día 30 y absorbe el riesgo crediticio**, incluso si ya hay mora; el comercio acepta esperar y el riesgo de contraparte/liquidez de Lazo. No se aprueba esa garantía por hacer una tabla. Si el comercio solo cobra conforme paga el estudiante, estaría aceptando riesgo de crédito y plazos inciertos: es un contrato/producto distinto que no se modela como liquidación garantizada ni se vende como “cobrás sin riesgo”. La reserva y su costo deben añadirse si superan los ya contemplados.

Ejemplo trabajado: P=100, F=70, tres cuotas, c=7%, K repetido=1,40. Comercio cobra `30+70(1-0,07)=95,10` hoy. Comprador paga 30 hoy y principal en tres cuotas (redondeo final hasta completar 70); total base 100, antes de costos de conversión explicitados. Lazo registra ingreso por comisión **4,90 una vez**; pérdida esperada 0,746667; procesador de recupero 0,149333; capital `0,12×70×57,364/365=1,320158`; cobros 1,00; rampa 0,50; devoluciones/fraude 0,20; K 1,40. **C=-0,416158 ≈ -0,42**.

La rebaja de tarifa en tres cuotas del 7% al 5% cuesta 1,40 en ese ticket, mientras el ahorro de capital ronda 0,61. Cobrar más tarde no habilita cualquier descuento. Para el comercio, `neto=P-cF` tampoco es ganancia: debe restar mercadería, operación, impuestos y devoluciones. Entrevistar con su margen real y sus días de reposición.

### Mínimo económico y escenarios adversos

Con costos proporcionales y K constante, `C=P m-K`, donde:

```
m = (1-a)[c + i(1-d u(1-r)) - d u(1-r)
          - phi d u(1+i)r - h W/365] - p-x-z
P_equilibrio = K/m si m>0
```

Si `m<=0`, aumentar ticket no resuelve el déficit. Para exigir una contribución mínima B por orden, `P_min=(K+B)/m`; B y el margen de seguridad están pendientes. Estos mínimos **no son límites comerciales aprobados** ni implican que cada persona pueda pagar.

| Variante del cuadro | m | Equilibrio repetido / nuevo |
|---|---:|---:|
| 1 mes / hoy | -1,72085% | No existe con estos supuestos |
| 3 / hoy | 0,98384% | 142,30 / 406,57 |
| 6 / hoy, interés hipotético | 4,01742% | 34,85 / 99,57 |
| 3 / día 30 | 0,19610% | 713,93 / 2.039,79 |
| 6 / día 30, interés hipotético | 3,17444% | 44,10 / 126,01 |

Sensibilidad adicional, **3 cuotas cobro hoy y compra repetida**, cobertura contractual siempre 100%; solo cambia default, recupero y costo de capital:

| Escenario hipotético | d / r / h | C ticket 20 / 100 / 1.000 |
|---|---|---|
| Favorable | 2% / 95% / 8% | -0,95 / +0,87 / +21,31 |
| Base ilustrativa | 8% / 80% / 12% | -1,20 / -0,42 / +8,44 |
| Adverso | 20% / 50% / 20% | -2,22 / -5,51 / -42,51 |
| Sin recupero efectivo | 30% / 0% / 20% | -4,08 / -14,79 / -135,27 |

Conclusión condicional: ni la cobertura 100% ni un ticket grande aseguran resultado positivo. El anticipo también importa: bajar de 30% a 0% aumenta F y comisión, pero también exposición/costo y obligación del fiador; recalcular por escalón y cohorte. No extrapolar una tasa de default constante a estudiantes que recién ingresan ni mezclar rentabilidad de retail con el libro de PCs para ocultar subsidios.

### Reparto empresa/pool sin doble contar

Propuesta de contabilidad, **sin porcentajes aprobados**:

1. Registrar comisión e interés cobrado una sola vez a nivel consolidado.
2. Asignar a quien corresponda costo de capital, pérdidas y procesamiento de recupero; operación, KYC, soporte, rampa, fraude comercial y adquisición. No duplicar el costo de capital como “h” y además otro rendimiento fijo al pool.
3. Definir `R_empresa + R_pool = ingresos externos totales`. Una transferencia interna de comisión disminuye ingreso de uno y aumenta el del otro; no aumenta C consolidada.
4. Calcular `C_empresa=R_empresa-costos_empresa` y `C_pool=R_pool-costos_pool`; su suma debe coincidir con C consolidada. Ambos deben satisfacer sus restricciones de liquidez/capital; un resultado consolidado positivo puede dejar a uno deficitario.

Alternativas a discutir: tarifa fija por operación para empresa, porcentaje de ingresos netos o waterfall después de costos/reserva. Todas pendientes. Cobrar suscripción al comercio o conseguir subsidio explícito podría financiar tickets chicos, pero exige aceptación y costo de servicio medidos; no es ingreso aprobado ni convierte la contribución subsidiada en rentabilidad independiente. No ofrecer APY ni rendimiento garantizado al inversor.

## Validación medible y condiciones para ampliar

**No se realizaron entrevistas ni tests en esta tarea.** Los siguientes tamaños y umbrales son propuestas para tomar decisiones, no métricas logradas.

### Entrevistas y prueba de oferta

- Proponer 8 comercios externos al equipo: dos por categoría del cuadro; pedir ticket y margen de ventas recientes, alternativas de cobro, reposición, devoluciones y tolerancia a esperar 30 días. Mostrar netos con el mismo anticipo y pedir elección entre hoy/diferido. Una intención verbal no cuenta como contrato ni demanda demostrada.
- Proponer 12 estudiantes y 6 familiares externos: reconstruir una compra reciente, quién financió, monto/plazo y pasos abandonados. Con prototipo, preguntar qué entienden por una cuota, interés total, deuda en dólares y máximo agregado del fiador. No conducirlos a responder que quieren cuotas.
- Entrevistar al procesador solo en una fase posterior autorizada: este documento **no contacta terceros**. Checklist de cotización: habilitación del modelo, merchant of record, monto variable, consentimiento, revocación, reintentos, CVV/autenticación, contracargos, liquidación, mínimos, impuestos y devolución de aranceles. Comparar costo efectivo de extremo a extremo, no solo porcentaje publicitado.

### Test de uso exclusivamente devnet

Proponer 10 recorridos de primera compra y 10 de repetición con órdenes de prueba, sin tarjetas reales. Medir por paso: entrada QR/link → cotización → identidad/fiador → aprobación → confirmación de caja; tiempos p50/p90, abandonos, necesidad de ayuda y comprensión del riesgo. Usar sesiones de sandbox sin afirmar que su tasa de aprobación anticipa producción.

Casos obligatorios: QR vencido, monto cambiado, doble clic, timeout, dos reservas concurrentes, fiador al límite agregado, medio revocado, devolución parcial/total, webhook duplicado/fuera de orden, cargo desconocido y reverso posterior al recupero. Registrar número de escenarios y fallos con evidencia. Para ejecutarlos onchain, obtener aprobación explícita de cada firma/envío y mantener devnet.

Umbral propuesto de usabilidad: al menos 8/10 repeticiones sin ayuda en ≤60 segundos; primera alta medir aparte, objetivo inicial ≤5 minutos. Seguridad operacional: **cero** doble plan, doble cargo, sobregiro de límite o entrega marcada aprobada con estado desconocido en los escenarios del test. Estos umbrales no prueban economía ni seguridad completa.

### Gates de expansión y pricing

| Gate | Evidencia requerida antes de habilitar |
|---|---|
| Retail repetido | Uso comprensible, alta vigente, límite atómico, trazabilidad de orden y devolución, sin cambiar simultáneamente todas las reglas del MVP |
| Ticket mínimo | Cotizaciones completas + K medido; contribución positiva bajo base y margen de seguridad acordado. Si depende de subsidio, presupuesto/cap de pérdida explícito |
| Seis cuotas | Tasa aprobada, total y fechas visibles, plazo/FX comprendidos y nueva sensibilidad de capital/default; no deducir tasa de una celda rentable |
| Cobro diferido | Fecha, moneda, garantía o riesgo asumido por comercio, reserva y tratamiento de devoluciones por escrito; no financiar retiros con cobranzas segregadas |
| Varios planes | Consentimiento agregado, límites por identidad/fiador/comercio, reglas de reputación y concurrencia verificadas; autorización de alcance aparte |
| Cambio de pricing/reparto | c(n,D) e i aprobados, versión de cotización/contrato, costo capital contado una vez, presupuesto empresa/pool separado y viable bajo estrés |
| Riesgo económico | Datos de cohortes con vencimientos completos, recupero **después de reversos**, costo de recuperación y exposición máxima; reportar tamaño e incertidumbre. Devnet no produce evidencia de voluntad/capacidad real de pago |

Definir antes de expandir caps de exposición y pérdidas, reglas de pausa por fraude/mora/revocaciones y quién cubre déficit. Las futuras conversaciones legales/comerciales no autorizan pasar a dinero real: durante la hackathon se mantiene **solo devnet**.

## Decisiones concretas para el equipo

1. ¿Una cuota es contado o crédito a 30 días? Si contado, definir si Lazo es solo iniciador de pago y cómo cobra ese servicio; no aplicar 7% a un F inexistente.
2. Elegir categoría inicial y banda a probar con comercios, conservando límites/reputación actuales hasta aprobación.
3. Definir matriz de tarifa por cuotas/plazo, interés total de seis, moneda/fecha de liquidación y riesgo que acepta cada parte.
4. Aprobar política de devolución, exposición agregada y revisión del consentimiento del fiador. Cobertura siempre 100%; recupero se mide.
5. Obtener costos completos y decidir reparto empresa/pool con conciliación consolidada. No prometer “rentable”, “sin riesgo” o rendimiento al pool a partir de esta sensibilidad.

La acción siguiente es probar y cotizar una oferta minorista concreta; el documento deja lista esa conversación sin convertir las hipótesis en reglas del producto.
