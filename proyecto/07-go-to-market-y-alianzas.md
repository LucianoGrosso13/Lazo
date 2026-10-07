# 07 — Go to market y alianzas de Lazo

**Fecha de investigación y consulta de las fuentes: 2026-10-07.** Documento interno en español; la entrega para jurados va en inglés. Leídos `AGENTS.md`, `02-validacion.md`, `03-mvp.md` y `04-plan.md`, incluida su sección Estado. Las fuentes externas son oficiales y describen ofertas publicadas: no prueban un acuerdo, acceso aprobado ni una integración de Lazo.

**Recomendación:** buscar primero una conversación técnica y comercial con **Ripio para rampas**, con **belo como alternativa**. Evaluar **Lemon Mini-Apps como canal de distribución**, sujeto a resolver la incompatibilidad que muestra su SDK publicado con nuestro programa Solana. Mientras tanto, validar una cuña universitaria con comercios minoristas y el checkout web propio: la masividad no es un requisito para aprender si Lazo sirve.

La demo y cualquier piloto autorizado durante la hackathon siguen **solo en devnet**, la red de prueba de Solana donde el dinero no tiene valor. **devUSDC es un token propio de prueba, no USDC emitido por Circle**; USDC es un activo digital diseñado para seguir el valor del dólar. Una wallet o billetera sirve para guardar y mover activos; en una custodial, el proveedor administra las claves. Una rampa convierte entre pesos y cripto. Una API permite que dos sistemas se comuniquen; un SDK reúne herramientas para integrar un producto. KYC es la verificación de identidad, y compliance es el trabajo de cumplimiento normativo.

## 1. Reglas de negocio que lleva esta propuesta

Estas son las decisiones recibidas para este trabajo, aunque haya versiones anteriores diferentes en los documentos:

| Tema | Decisión actual para presentar | Pendiente; no completar por cuenta propia |
|---|---|---|
| Comprador | 1 o 3 cuotas sin interés; 6 cuotas con interés chico a cargo del comprador | Tasa del plan de 6; costo total y condiciones detalladas |
| Comercio | Elige plazo de cobro; la comisión depende de ese plazo | Plazos alternativos y sus precios |
| Referencia comercial | 7% **sobre lo financiado**, para cobro inmediato con 3 cuotas | Comisión de 1 cuota, de 6 cuotas y de otros plazos; impuestos y costos adicionales |
| Fiador | Cobertura del 100% siempre; no se libera por subir de escalón | Instrumentación contractual y alcance del monto máximo frente a accesorios |
| Reputación | Puede mejorar anticipo y tope | No prometer que baja la cobertura del fiador |

Ejemplo de precio de referencia, no cotización de un partner: venta de 1.000, anticipo de 300, financiado de 700, comisión de 49; comercio recibe 951 antes de cualquier otro costo pendiente. No presentar el 7% como margen libre para repartir: todavía debe pagar fondeo, pérdidas, operación y rampas.

La instrucción actual reemplaza la cobertura decreciente de versiones anteriores. El tramo histórico sin fiador sigue fuera de la UI del MVP; no se decidió borrarlo de la configuración ni lanzarlo comercialmente. No cambia el código ni certifica que la demo implemente 1/6 cuotas o cobro diferido: `03-mvp.md` tiene como recorrido base 3 cuotas y cobro inmediato. El coordinador integra las decisiones en los documentos canónicos. **No tenemos definida la opción H ni las ideas 1, 2, 10 y 11: no les asignamos correspondencia.**

## 2. Scorecard: qué está publicado y qué falta demostrar

V = verificado en fuente oficial; H = hipótesis o condición abierta. Los criterios son binarios o cualitativos: no se asignan puntos ficticios a tamaño de audiencia ni voluntad comercial.

| Criterio | Lemon | Ripio | belo |
|---|---|---|---|
| Oferta para terceros | **V:** Mini-Apps con SDK, postulación, rampas, custodia y KYC anunciados. También Pack Business para uso no personal de la cuenta; eso no prueba una API B2B general. [Mini-Apps](https://lemon.me/build), [Pack Business](https://help.lemon.me/es/articles/17220248-que-necesito-para-contratar-el-pack-business) | **V:** rampas, Crypto as a Service y widget anunciados en el sitio B2B. [Oferta](https://www.ripio.com/es) | **V:** cuenta empresa y oferta de APIs para cuentas, cobros, conversión y retiros. [Business](https://www.belo.app/business), [APIs](https://www.belo.app/apis) |
| Documentación técnica abierta | **V:** SDK de Mini-Apps documentado. **H:** no equivale a API de crédito o firma Solana. [Quickstart](https://lemoncash.mintlify.app/quickstart/quickstart) | **V:** documentación B2B con sandbox e integración directa o widget; requiere credenciales. **H:** acceso para Lazo. [Introducción](https://docs.ripio.com/crypto-as-a-service/overview/introduction), [Autenticación](https://docs.ripio.com/crypto-as-a-service/access-token/get-access-token) | **V:** oferta de API publicada. **H:** no verificamos un contrato técnico público completo ni sandbox accesible para Lazo. [APIs](https://www.belo.app/apis) |
| USDC por Solana | **H:** sin confirmación para Argentina en las páginas consultadas; las guías remiten a la app/web para consultar redes vigentes. No deducirlo de que liste SOL. [Depósitos](https://help.lemon.me/es/articles/5579116-que-red-selecciono-para-recibir-crypto), [Retiros](https://help.lemon.me/es/articles/6577042-que-red-elijo-para-retirar-crypto) | **V:** la tabla de Ripio Wallet lista USDC en Solana. **H:** habilitación en la cuenta/API B2B contratada. [Redes de Wallet](https://help-ar.ripio.com/space/HC/1524301898) | **V:** su ayuda incluye USDC en Solana y exige la versión nativa. **H:** disponibilidad y condiciones en la API empresarial. [Redes](https://help.belo.app/es/articles/5964418-cuales-son-las-redes-soportadas-por-belo), [USDC nativo](https://help.belo.app/es/articles/8973178-usdc-precaucion-al-momento-de-transferir-hacia-tu-billetera) |
| Pagos y conciliación | **V:** SDK publica depósitos, retiros y llamadas a contratos. **H:** aplicar esas funciones al flujo de Lazo. [Índice SDK](https://lemoncash.mintlify.app/llms.txt) | **V:** catálogo técnico publica balances, retiros y cotizaciones. **H:** conciliación del plan de cuotas y plazos bancarios específicos. [Índice API](https://docs.ripio.com/llms.txt) | **V:** belopay ofrece links/QR; pagos desde belo se acreditan al receptor en USD₮. **H:** no es pago directo de una cuota USDC de Lazo; haría falta conversión y conciliación. [belopay](https://help.belo.app/es/articles/8441336-belopay-como-cobrar-a-tus-clientes-en-pesos-reales-o-criptomonedas) |
| Distribución | **V:** programa explícito de Mini-Apps. **H:** aceptación de Lazo, exposición y alcance efectivo. [Programa](https://lemon.me/build) | **H:** API y widget no garantizan promoción dentro de Ripio Wallet | **H:** cuenta empresa/API/belopay no garantizan promoción dentro de belo |
| Adecuación al primer piloto | Canal atractivo, con bloqueo técnico publicado | Mejor punto de partida para evaluar rampas por documentación y sandbox | Alternativa con cuentas/cobros locales; requiere profundizar contrato técnico |

**Bloqueo concreto de Lemon:** `ChainId` enumera redes compatibles con Ethereum, sin Solana, y las llamadas usan direcciones `0x` y estándar ERC20. Eso indica que el SDK documentado no ofrece una vía directa para ejecutar nuestro programa Anchor. No demuestra que Lemon no pueda desarrollar otra vía. Antes de prometer una Mini-App funcional, pedir confirmación sobre firma de transacciones Solana, USDC nativo, entorno devnet y acceso desde su navegador interno. No portar el programa ni agregar un puente entre redes para ganar distribución durante la hackathon. [Types](https://lemoncash.mintlify.app/types/types), [Call Smart Contract](https://lemoncash.mintlify.app/functions/call-smart-contract).

**Lectura de los hechos:** soporte de transferencias de una app no prueba soporte de instrucciones arbitrarias, débito automático, cuentas empresariales ni tokens de prueba. Documentación pública tampoco significa alta automática. Ninguna fuente demuestra que alguno acepte financiar crédito, asumir mora, cobrar a un fiador o distribuir Lazo. Las ofertas de KYC/custodia no son una aprobación regulatoria del negocio de crédito.

## 3. Partner inicial y alternativa

### Ripio: primera conversación para infraestructura

Pedir una evaluación de entrada de pesos, conversión a USDC, salida por Solana y conversión del cobro del comercio a pesos. La combinación de documentación B2B, sandbox publicado y USDC/Solana en Wallet justifica **investigar primero** esta ruta; no alcanza para declararla integrada.

La solicitud inicial debe ser chica: un responsable comercial, un responsable técnico, confirmación del caso de uso y evaluación de pruebas sin dinero real. No pedir de entrada que agreguen crédito en toda su app. Si no habilitan el flujo Solana o no hay forma de ensayarlo en devnet/sandbox compatible, se usa un adaptador simulado declarado; no se prueba con fondos reales.

### belo: alternativa para rampas y cobro minorista

Evaluar cuentas/cobros locales y conversión de saldos; pedir esquema técnico, sandbox, precios y restricciones. La oferta de APIs anuncia CVU/alias, conversión USDC y eventos firmados, pero falta comprobar el recorrido exacto de Lazo. belopay podría reducir fricción en comercios que ya lo usan; su liquidación en USD₮ obliga a resolver la diferencia con nuestra deuda USDC antes de tratarlo como medio de pago. Esto es una hipótesis de integración, no un comercio adherido. [APIs](https://www.belo.app/apis), [belopay](https://help.belo.app/es/articles/8441336-belopay-como-cobrar-a-tus-clientes-en-pesos-reales-o-criptomonedas).

### Lemon: conversación de distribución en paralelo al aprendizaje local

Usar el canal Mini-Apps para preguntar por el encaje del producto y la brecha Solana. Primera opción: distribución hacia el checkout web, si su política lo permite; segunda: integración futura cuando exista una vía técnica confirmada. No afirmar que admite enlaces externos, ni que aceptará una categoría de crédito. Su página muestra Lendoor como **Soon**: preguntar por complementariedad y conflictos, sin asumir lanzamiento o funcionalidad equivalente. [Mini-Apps](https://lemon.me/build).

## 4. Valor para ambos y responsabilidades propuestas

**Para Lazo:** reducir pasos para pagar, facilitar cobro del comercio, aprovechar infraestructura existente y eventualmente acceder a distribución. **Para el partner:** hipótesis de más uso transaccional, operaciones de conversión y retención de una cohorte que compra y paga cuotas. **Para el comercio:** ventas adicionales y elección de liquidez. Son beneficios a medir; no declaramos aumento de ventas, retención ni usuarios activos logrados.

La wallet no tiene que convertirse en prestamista para ofrecer una rampa. Tampoco podemos trasladarle el riesgo en una diapositiva: la siguiente división es una propuesta para negociar, sujeta a contratos y revisión especializada.

| Área | Lazo / entidad que se defina | Partner de rampas/distribución | Comercio / proveedor de cobro |
|---|---|---|---|
| Riesgo crediticio | Definir aprobación, topes, fondeo, reservas, mora y pérdidas; en demo, tesorería de prueba | No asume crédito por prestar API o distribuir | Fiador respalda 100%, pero no garantiza recupero efectivo; procesador no asegura cobro |
| Originación y contratos | Identificar quién otorga o adquiere el crédito, acreedor y responsable de reclamos | Aprobar el caso de uso; no inferir licencia de crédito desde servicio cripto | Comercio identifica venta, precio, entrega y cesión si correspondiera |
| Custodia | Programa/pool y operación de prueba con controles propios; no ofrecer cuenta de depósito nueva | Solo custodia de los saldos efectivamente alojados bajo su servicio y contrato | Custodia del comercio depende del destino elegido |
| Pagos y cambio | Asociar cada pago a su plan, mostrar tipo de cambio, importe neto y estado | Cotización, conversión, transferencias y comprobantes según servicio habilitado | Confirmar cobro, entrega, cancelación y devolución |
| Fiador | Consentimiento, fianza con tope, avisos, recupero y atención | No sustituye fianza, ni autoriza débito por hacer KYC | Procesador de tarjeta gestiona tokenización y cargos; sandbox en demo |
| Soporte | Primera línea de Lazo para planes, precios, vencimientos y disputas | Incidentes de cuenta, conversión o transferencia en su infraestructura | Reclamos del bien/servicio y contracargos; protocolo compartido |
| Compliance y datos | Revisión del crédito, protección de datos, consentimiento y publicidad; no poner identidad en cadena | Alcance de KYC/monitoreo de su servicio por escrito | Documentación del comercio y tratamiento de reclamos |

Acordar un responsable único de cada incidente y cómo escalarlo. Reutilizar verificación de identidad solo con base y permisos adecuados; no asumir acceso al padrón del partner ni que su KYC sustituye la evaluación crediticia. La cobertura del 100% expresa obligación contractual: límite insuficiente, rechazo de tarjeta o desconocimiento pueden dejar pérdidas.

## 5. Negociación económica sin inventar tasas

Separar tres contratos o anexos: **servicio de rampa**, **distribución** y, solo si alguna vez se propone, **fondeo/riesgo**. Pedir precios por operación, diferencia entre compra y venta, mínimos mensuales, costos de implementación, retiro, soporte, impuestos, devoluciones y tiempos de acreditación. Una tarifa al consumidor no es una cotización B2B argentina; no copiar precios de otro país.

Negociar primero prueba acotada sin exclusividad y con salida clara. Si hay reparto de ingresos, definir ingreso **efectivamente cobrado**, operación atribuida, período de atribución, descuentos, devoluciones, impuestos, conciliación y límites. Opciones a cotizar: tarifa por rampa ejecutada, comisión por usuario activado con pago verificable o participación del ingreso neto atribuible. No prometer porcentaje, comisión sobre toda la cartera ni garantía mínima antes de hacer números.

Modelo que debe completar el equipo por plan y plazo de cobro:

`margen esperado = comisión comercial + interés comprador − costo de fondeo − pérdida esperada − rampas/procesador − operación/soporte − impuestos − costo del acuerdo`

No repartir el capital de las cuotas como revenue. En 1/3 cuotas, interés comprador es cero; en 6, la tasa sigue pendiente. La comparación entre cobrar hoy y esperar debe considerar el capital que realmente adelanta Lazo. Proponer precios con escenarios de mora, fraude y contracargo; no vender «más barato que todo» con tarifas antiguas. Tampoco asegurar que los mismos 7% alcanzan para pagar pool, empresa y partner.

## 6. Cuña universitaria primero, expansión después

**Hipótesis a poner a prueba:** una wallet masiva no arregla un checkout que nadie termina, una comisión que el comercio rechaza o un fiador que no entiende su obligación. Primero conseguir evidencia en un circuito chico; después negociar distribución con algo que mostrar.

Propuesta de cohorte, **todavía no reclutada**: estudiantes mayores de edad de una facultad de Tucumán, familiares fiadores y 3 comercios cercanos que vendan herramientas de estudio o bienes minoristas con necesidad concreta de cuotas. No afirmar convenio con la UNT, centros de estudiantes, locales o marcas. Pedir permiso para difusión solo si se decide hacer ese acercamiento; no usar logos sin autorización.

Validar entrevistas y recorridos con la web existente, selección de productos y recibo de prueba. Comparar con la solución que usa cada entrevistado, incluida la tarjeta familiar: no asumir que todos necesitan Lazo. Preguntar por precio al contado, plazo de cobro preferido, costo tolerable, devoluciones, tamaño de ticket y objeciones del fiador. La investigación minorista del otro worker complementa este recorte; este documento no afirma sus resultados.

Escalamiento propuesto: una cohorte → otra facultad con comercios comparables → evaluación de distribución desde una app → otras ciudades. Cada paso depende de conversión, economía y soporte de la etapa anterior; no de cantidad de seguidores ni tamaño declarado por el partner.

## 7. Secuencia de acercamiento y presentación del piloto

No se contactó a terceros, no se enviaron mails ni se completaron formularios. Lo siguiente es una secuencia futura que ejecuta el equipo cuando decida hacerlo.

| Paso | Responsable propuesto | Acción / entregable | Condición para seguir |
|---|---|---|---|
| 1 — Preparar | Luciano + compañero | Ficha de una página: problema, usuario, flujo, decisiones de precio, riesgos, demo devnet y lista explícita de lo simulado | Datos comprobables, sin clientes ni alianzas ficticias; tasa de 6 y precios alternativos marcados pendientes |
| 2 — Ensayar | Equipo | Pruebas de comprensión y checkout con cohorte chica; guardar resultados agregados | Saber dónde abandonan comprador, fiador y comercio |
| 3 — Primer contacto | Responsable business del equipo | Solicitar reunión exploratoria de 25 minutos a Ripio; belo si el encaje/acceso falla; Lemon para distribución condicionada | Respuesta de equipo oficial; no tratar silencio como aprobación |
| 4 — Evaluar | Producto/business + ingeniería/compliance de ambos | Revisar diagrama de fondos, USDC/Solana, firma, sandbox/devnet, permisos, callbacks y liquidación | Confirmación escrita del recorrido permitido y responsables |
| 5 — Acordar | Equipo + contraparte | Documento de intención no exclusivo: alcance, fechas, costos cotizados, datos, soporte y criterios | Sin promesa de dinero real; rechazo o falta de sandbox activa fallback |
| 6 — Probar | Equipo | Piloto de usabilidad devnet y simulación declarada de rampas; publicar resultados internos | Informe con denominadores, fallas y límites |
| 7 — Decidir | Equipo | Continuar, cambiar partner o descartar integración según evidencia | Cualquier negocio futuro real requiere evaluación separada; no entra en la hackathon |

**Guion para producto/business:** «Lazo está probando cuotas para estudiantes sin tarjeta propia, con fiador al 100% y elección de plazo de cobro para el comercio. Tenemos una demo en devnet con dinero de prueba; no tenemos una alianza ni evidencia de escala. Buscamos evaluar si su infraestructura reduce pasos de pago y conversión en una cohorte acotada, con el riesgo crediticio separado. Queremos confirmar compatibilidad Solana, entorno de prueba, responsabilidades y precios antes de hablar de distribución amplia».

Llevar cinco piezas: ficha, video corto marcado devnet, diagrama de fondos, matriz de responsabilidades y hoja de métricas. Para ingeniería: qué paga quién, moneda/red, identificador del plan, confirmación, reintentos y devolución. Para business: cuál es la hipótesis de ingreso incremental y cuánto cuesta probarla. Para compliance: acreedor/originador pendientes de definición, fianza, privacidad, publicidad y alcance de custodia. No presentar un problema pendiente como resuelto por el registro del partner.

### Canales públicos exactos

Todos consultados el **2026-10-07**; estos links no autorizan contacto en esta tarea.

| Empresa | Ruta pública | Límite de la evidencia |
|---|---|---|
| Ripio | [Sitio oficial: Hablar con Ventas](https://www.ripio.com/es), [Soporte para API](https://help-ar.ripio.com/space/HC/2051768378) | El enlace de ventas no expuso un destino de formulario distinto en la consulta; usar el sitio, sin inventar correo de partnerships. Soporte API no prueba reunión comercial concedida |
| belo | [Formulario empresarial/API](https://www.belo.app/apis), [Hablemos de tu integración — agenda enlazada desde esa página](https://calendar.app.google/AEN9oMHtkcnsSvqN6) | Formulario pide información empresarial. La agenda está enlazada oficialmente, pero la herramienta no pudo verificar horarios o completar acceso. No reservar turno |
| Lemon | [Programa y postulación](https://lemon.me/build), [Formulario nuevo indicado por documentación](https://tally.so/r/3NGJQB), [Canales oficiales](https://lemon.me/redes) | El botón antiguo lleva a [aviso de nuevo formulario](https://tally.so/r/wkMeL1); el nuevo también figura en el índice SDK. No pudimos inspeccionar sus campos. `soporte@lemon.me` es soporte, no correo probado de partnerships |

Preguntas para la reunión: ¿admiten este caso de crédito?, ¿cuentas de empresa y terceros?, ¿USDC nativo por Solana en API, entrada y salida?, ¿permiten pagos hacia cuentas de programa y conciliación por plan?, ¿firma de instrucciones o solo transferencias?, ¿devnet y token propio de prueba?, ¿cómo se prueban conversiones?, ¿quién controla claves y fondos?, ¿qué KYC puede compartirse y con qué consentimiento?, ¿qué costos/plazos/límites aplican?, ¿quién resuelve fallas y devoluciones?, ¿qué distribución concreta pueden comprometer por escrito?

## 8. Éxito medible propuesto; no tracción lograda

Piloto sugerido de dos semanas de usabilidad, ajustable a disponibilidad del equipo; no obliga a agregar funciones antes del cierre. Registrar por separado resultados del mock, de devnet y de cualquier sandbox. Ninguna prueba acelerada mide mora real a tres meses.

| Métrica | Definición / denominador | Umbral propuesto para decidir |
|---|---|---|
| Comprensión | Compradores y fiadores que explican cuota, cambio y obligación antes de confirmar / entrevistados | ≥80% entre 10 compradores y 10 fiadores propuestos |
| Checkout autónomo | Intentos que completan compra de prueba sin ayuda / intentos iniciados | ≥80% sobre al menos 20 intentos; mediana ≤2 minutos |
| Fiador | Invitados que terminan recorrido de prueba y aceptan conscientemente / invitados | ≥60% de al menos 10; anotar motivos de rechazo |
| Comercio | Comercios entrevistados que aceptarían probar el precio de referencia / entrevistados | 3 de 5 propuestas de participación; intención documentada, no venta lograda |
| Conciliación | Pagos de prueba asignados una sola vez al plan correcto / pagos confirmados | 100% sobre 30 casos; incluir duplicado, demora y fallo |
| Liquidación | Diferencias entre recibido y desglose prometido / operaciones de prueba | Cero diferencias sin explicación; tiempos reportados por entorno |
| Soporte | Recorridos que requieren ayuda / recorridos completados | ≤20%; registrar minutos y causa para estimar costo |
| Integración | Capacidades críticas confirmadas por el partner / lista de capacidades necesarias | Todas antes de prometer integración; contrato técnico y costos pendientes no cuentan como confirmados |
| Economía | Margen esperado por plan/plazo, con precios cotizados y supuestos visibles | Positivo en escenario base y pérdida máxima tolerable definida por el equipo en estrés; si faltan costos, resultado indeterminado |

Son metas de trabajo, no tasas observadas ni estimaciones estadísticas de demanda. Medir también fraude, mora, recuperación y contracargos sería necesario para un negocio futuro, pero **no se pueden validar con dinero ficticio ni con un reloj acelerado**. No escalar por cumplir solo el checkout si fiador, costos o responsabilidades siguen abiertos.

## 9. Fallback propio sin crear otra wallet

Lazo conserva su web y botón de checkout; no construye una billetera ni exige una cuenta custodial nueva de Lazo. Quien ya tenga una wallet compatible puede usarla en devnet; el fiador mantiene el recorrido sin wallet previsto en el MVP. Para quien solo tiene Lemon/Ripio/belo, hacer recorrido de usabilidad simulado con confirmaciones de prueba: no asumir que esas apps manejan devnet o nuestro devUSDC.

El checkout, el plan, la reputación y los estados de cobro quedan bajo la interfaz propia; las rampas futuras serían adaptadores reemplazables. Mostrar «conversión a pesos simulada» cuando no hay integración. No enviar devUSDC a depósitos de wallets comerciales ni confundir su dirección con un entorno de prueba.

Si en una alianza futura se quiere pagar desde una cuenta custodial existente sin abrir otra wallet, habría que confirmar un flujo de transferencia autorizado, identificar el pago y adaptar la autorización del programa: un retiro común no ejecuta automáticamente `open_plan` o `pay_installment`. Es trabajo técnico y contractual pendiente, no funcionalidad entregada. La reputación asociada a la wallet actual también exige resolver identidad y continuidad; no prometer portabilidad inmediata entre proveedores.

La captación propia puede empezar con invitaciones del comercio y recomendaciones entre estudiantes, sin convenio universitario ni exposición masiva. El equipo tiene que aprender quién acepta el producto antes de pagar por distribución. Si ninguna wallet prioriza Lazo, todavía puede validar problema, precio y usabilidad con esta ruta, siempre en devnet durante la hackathon.

## 10. Registro de evidencia y límites

Todas las fuentes enlazadas arriba se consultaron el **2026-10-07**. Las páginas de Ripio Wallet indican actualización del **2026-07-06** para redes y creación del **2026-04-14** para soporte API; Lemon depósitos indica **2026-07-21**, retiros **2025-04-09** y envío **2026-05-14**. Las páginas con «actualizado ayer/hoy» son dinámicas: no convertir ese texto en fecha editorial exacta ni usar el crawling del buscador como fecha de publicación.

El hallazgo positivo más relevante es la existencia de programas de terceros: SDK de Lemon, API/sandbox de Ripio y oferta de APIs de belo. Los huecos más relevantes son acceso de Lazo, costos, soporte específico Solana en el contrato B2B, ejecución del programa desde wallets custodiales y aprobación del caso de crédito. No verificamos integración operativa con ninguno; no hay contacto ni aceptación obtenidos en esta investigación.

Para cerrar la decisión, faltan tasa de 6 cuotas, precios por plazo de cobro, reparto económico, entidad responsable del crédito y evaluación de recupero del fiador. Son pendientes del equipo y de la negociación; este documento no los reemplaza con supuestos silenciosos.
