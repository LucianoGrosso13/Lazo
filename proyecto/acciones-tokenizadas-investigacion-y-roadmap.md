# Acciones tokenizadas: investigación y roadmap propuesto

Fecha: 3 de octubre de 2026. Estado: propuesta por elegir y validar; no hay implementación. El usuario confirmó un equipo de dos estudiantes. Las estimaciones de la jornada suponen cinco horas disponibles y capacidad para construir una aplicación web con integración de wallet. Las capacidades técnicas, las instituciones y la matrícula al inicio de la competencia todavía no están confirmadas.

## Recomendación provisional

**Revisión posterior:** el equipo cuestionó que Compra Clara tenga suficiente diferencial. Esta propuesta inicial queda en discusión. Se exploraron alternativas con una acción económica propia en [alternativas-con-accion-propia.md](alternativas-con-accion-propia.md). No hay nueva idea elegida por el equipo.

Explorar **EquityLens**, nombre de trabajo: una experiencia para personas argentinas que ya usan una billetera con dólares digitales y quieren entender una acción tokenizada antes de operar. La primera versión cubre un solo instrumento en Solana, por ejemplo NVDAx, un importe y un recorrido.

La propuesta muestra identidad y derechos del instrumento, unidades económicas recibidas y cotizaciones de entrada y salida disponibles. Su utilidad diferencial y la disposición a volver a usarla todavía no están probadas. Tener un token no implica poseer directamente acciones de la empresa subyacente.

Veredicto: **angostar la idea y validar hoy**. La investigación confirma que hay productos y antecedentes; no demuestra demanda por nuestra versión.

## Estrategia para los bonus de Superteam Argentina

La ficha publica cuatro premios especiales de 500 dólares: experiencia de producto, pitch de Demo Day, tracción y universitario. Son acumulables. El universitario exige un integrante matriculado en una universidad argentina al inicio de la competencia, con contribución sustantiva. La ficha mezcla USDG en la cabecera y USDC en el texto. [Reglas del track](https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-argentina-track).

Con el equipo confirmado de **dos estudiantes**, la prioridad propuesta es **universitario + experiencia + pitch**. Verificar que la condición académica informada cumpla la regla de universidad argentina y matrícula al inicio de la competencia; ambos deben poder mostrar sus contribuciones. Para tracción, incorporar observación de usuarios desde la jornada y buscar retorno durante la semana. Orientar el público a estudiantes no satisface por sí mismo el requisito.

| Idea | Experiencia | Pitch | Tracción durante el plazo | Decisión propuesta |
|---|---|---|---|---|
| EquityLens / Compra Clara | Potencial fuerte: una decisión financiera explicada en una pantalla | Contraste visible entre ticker y derechos, o importe solicitado y unidades recibidas | Media; conseguir usuarios que estén explorando estos activos | Primera opción si podemos probarla hoy con personas del público |
| Radar de posiciones y salida | Potencial fuerte para titulares que hoy consultan varias fuentes | Fácil mostrar un cambio o una referencia vencida | Mayor posibilidad de retorno si conocemos titulares reales; sin ellos, débil | Alternativa si hay dos usuarios con posiciones reales accesibles al equipo |
| Laboratorio educativo de acciones tokenizadas | Puede simplificar prácticas de splits y transferencias | Un cambio de multiplicador y una transferencia se demuestran bien | Puede probarse con estudiantes; el retorno y la necesidad de cadena deben validarse | Alternativa si el equipo tiene acceso a una clase o grupo; no implica elegibilidad universitaria automática |
| Memecoin con tesorería, como Artificial Inu | El instrumento sigue siendo difícil de explicar | Narrativa llamativa, sin resolver aún una necesidad concreta | Débil sin una comunidad previa con uso real | Menor prioridad para esta estrategia |

Estas valoraciones son juicio de producto, no probabilidades de ganar. Cambian con las capacidades del equipo y con las personas a las que se pueda llegar hoy.

### Evidencia que vamos a construir

- Experiencia: una persona nueva completa el recorrido; anotar dónde se confunde, mejorar y observar el resultado. Registrar usuarios únicos que lo intentan y que lo completan, sin inventar umbrales oficiales.
- Pitch: demo funcional antes/después y respuestas claras sobre emisor, derechos, datos vencidos y qué está simulado. Preparar una grabación de respaldo.
- Tracción: registrar fechas, sesiones completadas, regreso a la aplicación y feedback concreto. Los cinco primeros testers son una meta de trabajo; no un requisito ni una garantía de premio. No presentar seguidores o impresiones como usuarios activos.
- Universitario: si corresponde, documentar matrícula y aporte real al código, producto o validación. No agregar un integrante nominal para cumplir el casillero.

El evento oficial de Buenos Aires/remoto anuncia preselección el **4/10 a las 16:00** y Demo Day a las **19:30**, con registro sujeto a aprobación. Confirmar cómo participa el equipo de Tucumán y si esa presentación es la instancia relevante para el bonus; no asumirlo. [Agenda oficial](https://luma.com/9duum73r).

## Qué es Artificial Inu

El sitio artificialinu.com presenta $AI, una memecoin que se negocia contra el token de NVIDIA de Robinhood Chain mediante LONG y Uniswap v4. Según su explicación, las comisiones de compra en NVDA se distribuyen 80% a la tesorería y 20% al receptor original; las de venta en AI se dividen entre quema y bloqueo permanente. Son porcentajes de las comisiones, no del importe invertido. [Mecánica publicada](https://artificialinu.com/how-it-works).

La web declara que AI no representa equity de NVIDIA y que sus titulares no pueden rescatar los activos de la tesorería. Comprar AI agrega exposición a la demanda por la propia memecoin; no replica automáticamente la acción. [Sitio del proyecto](https://artificialinu.com/).

El crecimiento de una cantidad de tokens en tesorería no garantiza que su valor en dólares crezca. Reducir circulación tampoco garantiza una suba del precio. No se revisaron bytecode, permisos administrativos, auditorías ni ejecución de las distribuciones; aquí se describe lo que publica el proyecto.

El token NVDA tampoco debe confundirse con titularidad directa de acciones: Robinhood describe sus Stock Tokens como títulos de deuda tokenizados con exposición económica al subyacente. [Descripción del emisor](https://robinhood.com/rhj/stocktokens/).

## Problemas donde podría haber una oportunidad

| Problema | Qué debería resolver el producto | Límite |
|---|---|---|
| Identidad | Verificar dirección, red, emisor y documentación | El nombre o ticker por sí solo no identifica un instrumento |
| Derechos | Explicar participación directa, certificado o derivado, voto y rescate | No reemplaza la documentación legal ni crea derechos |
| Salida | Mostrar venta secundaria y requisitos de rescate del emisor | Una cotización presente no garantiza liquidez futura |
| Precio | Mostrar referencia, timestamp, comisiones y efecto del tamaño de la orden | Último cierre bursátil no equivale a precio justo del fin de semana |
| Eventos corporativos | Convertir correctamente tokens internos y unidades económicas | Evitar confundir splits o dividendos con rendimiento de mercado |
| Acceso | Mostrar condiciones del instrumento y la plataforma | Autocustodia no elimina restricciones de distribución |

xStocks son certificados que dan exposición económica y carecen de voto societario. Las condiciones de distribución dependen de la jurisdicción. [Descripción legal](https://docs.xstocks.fi/docs/product-legal-overview). El mercado primario requiere KYC/AML y wallets habilitadas. [Emisión y rescate](https://docs.xstocks.fi/docs/issuance-and-redemption).

En Solana, xStocks aplica un multiplicador a las cantidades visibles; la cantidad interna usada en las transacciones puede permanecer constante. Esta distinción debe estar cubierta al comparar precios y construir operaciones. [Guía del emisor](https://docs.xstocks.fi/developers/multipliers), [extensión de Solana](https://solana.com/docs/tokens/extensions/scaled-ui-amount).

La negociación secundaria y la emisión/rescate tienen horarios diferentes. xStocks documenta negociación en plataformas compatibles durante 24/7 y operación del emisor durante 24/5. [Documentación](https://docs.xstocks.fi/docs). Ondo ya ofrece emisión y rescate 24/7 para una selección creciente, con excepciones. No generalizar que todos los tokens cierran el fin de semana. [Ondo Stocks](https://ondo.finance/ondo-stocks).

## Competencia y alternativas

- Bitso anunció xStocks para usuarios argentinos: una aplicación de acceso básico ya tiene competencia y distribución local. El anuncio de lanzamiento también distingue límites de retiro de ese producto. [Anuncio de Kraken](https://blog.kraken.com/product/xstocks/bitso-integration).
- Takenos presenta inversión en ETFs y oro tokenizado desde su aplicación. Su oferta vuelve menos defendible la idea genérica de una app de inversión para Latinoamérica. [Producto actual](https://takenos.com/inversiones).
- Colosseum Copilot: se consultaron ganadores y proyectos sin filtro de premios. Se leyeron los registros completos de Autonom y Stratalink.
- **Autonom**, primer premio RWA de Cypherpunk, presentó oráculos con ajustes por eventos corporativos y módulos de riesgo; el registro de demo describe verificación de datos en devnet. No se concluye aquí cuál es su estado comercial actual. [Proyecto](https://colosseum.com/projects/explore/autonom-unleashing-rwas-in-solana), [premio oficial](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/).
- **Stratalink** presentó un prototipo de análisis de liquidez y riesgo. Eso es evidencia histórica de un enfoque parecido, no prueba de que todo su roadmap posterior se haya ejecutado. [Proyecto](https://colosseum.com/projects/explore/stratalink-labs-liquidity-truth-layer).
- El repositorio **Reckonz** describe controles de ejecución y riesgo para acciones tokenizadas en X Layer. Su sitio no fue accesible mediante la herramienta de lectura; no se verificó operabilidad actual. [Repositorio publicado](https://github.com/wngstnr-code/reckonz).

Patrón provisional: **mecánicas existentes, público y experiencia por validar**. La combinación de explicación de derechos, unidades correctas y salida antes de comprar es una hipótesis de diferenciación. Un semáforo genérico o el mínimo de recepción de un swap no bastan como novedad.

## Ideas comparadas

| Idea | Evaluación para este equipo |
|---|---|
| Memecoin con tesorería de acciones, inspirada en Artificial Inu | Demo visual atractiva; dolor del usuario y valor económico poco claros; depende mucho de especulación y comunidad |
| Emisor propio de acciones tokenizadas | Custodia y estructura legal fuera del alcance de la jornada y del plazo restante |
| App para comprar acciones con USDC | Factible con infraestructura existente; competencia fuerte; necesita una diferencia específica |
| EquityLens: entender instrumento, importe y salida antes de firmar | Mejor candidata para explorar; acotar a un activo y demostrar datos y operación, sin prometer seguridad absoluta |

## MVP: tres funciones

1. **Ficha del instrumento:** dirección oficial, red, emisor, derechos y condiciones de rescate, con fuentes y fecha de revisión. Datos legales revisados a mano para un solo instrumento.
2. **Vista previa:** importe, cantidad de tokens, equivalente económico, comisiones y cotización de venta disponible. Cotizaciones separadas e indicativas; no tratarlas como una garantía de compra y venta simultáneas ni ignorar el cambio de reservas producido por una compra.
3. **Operación demostrable:** ejecución con activos de prueba en Solana devnet, con identidad del token y mínimo de recepción. Mostrar un caso aceptado y uno rechazado. Los tokens y la contraparte de prueba no representan acciones reales ni prueban liquidez comercial.

La cotización, el multiplicador y las restricciones tienen fuentes y timestamps separados. Si una fuente no responde, se muestra «dato no disponible». El sábado 3 de octubre la bolsa estadounidense no está en sesión regular; el último cierre debe identificarse como tal.

La acción en cadena aporta liquidación verificable y cumplimiento del mínimo de recepción dentro de la operación. Un control de interfaz no cuenta como regla impuesta por el programa. Esa protección tampoco verifica custodia, habilitación legal del usuario o reservas fuera de la cadena.

La documentación de xStocks distingue endpoints públicos de información y endpoints autenticados de ejecución. Se comprobó que el catálogo público responde y está paginado; no se validaron aún la entrada NVDAx, su dirección, su precio ni una ruta ejecutable. La primera prueba de implementación debe resolver esto. [API del emisor](https://docs.xstocks.fi/developers/quickstart).

## Caso A: terminar durante la jornada presencial

Reparto propuesto para dos personas, ajustable a sus capacidades: una lleva interfaz, lenguaje y sesiones con usuarios; la otra lleva fuentes, cantidades, wallet y operación en devnet. Ambos revisan juntos el recorrido y pueden explicar el funcionamiento. Guardar tareas, cambios y sesiones para documentar aportes reales.

| Tiempo acumulado | Trabajo | Entregable / decisión |
|---|---|---|
| 0–45 min | Confirmar equipo, participación universitaria y acceso a Demo Day; nombrar testers; comprobar identidad, multiplicador y cotización; probar ruta mínima de operación en devnet | Usuario concreto, premios objetivo y evidencia de viabilidad. Si no, reducir alcance antes de construir pantallas |
| 45–90 min | Construir ficha de un instrumento y textos comprensibles | Una persona distingue el token de la acción subyacente |
| 90–180 min | Integrar importe, unidades, entrada y salida; mostrar vigencia y ausencia de datos | Vista previa con información real disponible y cálculos reproducibles |
| 180–240 min | Conectar la operación de prueba y mínimo de recepción; caso de rechazo | Operación real en devnet, con enlace al explorador y simulaciones rotuladas |
| 240–300 min | Observar a cinco personas usarlo; medir recorrido; corregir confusiones; dejar URL y grabación | Evidencia para experiencia y testers para tracción; demo de hasta tres minutos y decisión de continuar |

Si la prueba de ejecución no sale en el primer bloque, el entregable de hoy pasa a ser una vista previa funcional con datos verificables. Se registra la ejecución como pendiente; no se agrega una transferencia irrelevante para aparentar integración.

**Definición de listo:** una persona abre el enlace, identifica el instrumento, interpreta los importes y comprende qué es real y qué es de prueba. Si incluye ejecución, se puede observar recepción real o rechazo real en devnet.

Si se termina hoy, este es un prototipo. Las hipótesis de demanda, distribución y operación con instrumentos reales siguen abiertas.

## Puerta para continuar

Se propone seguir si hay: datos reproducibles, recorrido técnico viable y al menos tres de cinco usuarios que entiendan la diferencia y describan una decisión útil que pudieron tomar. Buscar además dos personas que pidan volver a usarlo o una conversación concreta con una wallet sobre integrarlo. Son señales pequeñas; no validan por sí solas un negocio.

No seguir ampliando si el usuario solo quiere una compra más simple que ya resuelve su aplicación, los datos esenciales no son accesibles o la diferencia respecto de alternativas no se puede mostrar.

## Caso B: avanzar después de la jornada

La entrega oficial vence el **12 de octubre de 2026**; el horario exacto no se verificó. [Evento oficial](https://colosseum.com/worldsfair).

| Fecha | Trabajo | Resultado esperado |
|---|---|---|
| 4 de octubre | Revisar feedback y comparar con las aplicaciones que ya usan; hablar con usuarios reales; atender la preselección y Demo Day si el equipo está habilitado | Elegir continuar, angostar o cambiar de idea; primera presentación funcional |
| 5–6 de octubre | Consolidar un instrumento: multiplicador, horarios, datos faltantes y operación de prueba; preparar integración con ruta secundaria real y simularla sin mover dinero | Resolver el riesgo central antes de agregar activos |
| 7–8 de octubre | Repetir uso con 5–10 personas; observar quién regresa; mejorar lenguaje y explorar una integración en wallet | Evidencia para experiencia y tracción, además de recorrido más claro |
| 9 de octubre | Congelar funciones; corregir fallas y comprobar operación, unidades y rechazo | Versión estable y alcance documentado |
| 10–11 de octubre | Preparar demo y respuestas; explicar limitaciones; reunir evidencia de uso y contribuciones; ordenar repositorio y completar requisitos de ambos portales | Entrega preparada y enviada con margen, con respaldo para los bonus |
| 12 de octubre | Resolver contingencias y confirmar recepción | Margen final; no incorporar funciones nuevas |

La operación con dinero real es una fase distinta: requiere comprobar elegibilidad, condiciones de distribución y accesos del proveedor. La entrega puede mostrar lectura real y ejecución de prueba sin presentarlas como operación comercial habilitada.

## Demo propuesta

1. Una persona quiere exposición a NVIDIA con dólares digitales.
2. Ve qué instrumento recibiría, quién lo emite y qué derechos tiene.
3. Introduce un importe y entiende unidades, costos, estado de la referencia y salida disponible.
4. Una operación de prueba que incumple el mínimo se rechaza; otra válida se confirma en devnet.
5. Se explican con claridad las partes reales, de prueba y pendientes.

## Negocio y supuestos pendientes

Hipótesis de negocio: integración de la vista previa en wallets o aplicaciones que ya tengan usuarios, mediante componente o servicio de datos. La existencia de posibles pagadores y el precio no se validaron.

Supuestos peligrosos: los usuarios necesitan más información antes de operar; hay datos de calidad accesibles a tiempo; la integración aporta valor suficiente frente a lo que ya ofrecen wallets y exchanges. El siguiente paso es ejecutar las comprobaciones del primer bloque y nombrar usuarios reales para probar el recorrido.
