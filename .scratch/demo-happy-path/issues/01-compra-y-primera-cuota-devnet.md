# Demo: compra real y pago de la primera cuota en devnet

**Status:** ready-for-agent

**Fecha:** 2026-10-09

**Origen:** sesión `grill-with-docs`, decisiones Q1–Q7 y solicitud explícita `/to-spec`. Publicación en el tracker Markdown local del proyecto.

## Problem Statement

Luciano necesita grabar una demo realista de Lazo: conectar Phantom, pagar el anticipo de una compra con fondos de prueba, ver la confirmación y las cuotas pendientes, y pagar la primera cuota. Hoy conectar la wallet no demuestra que una compra mueva fondos: el modo predeterminado es simulado. El procesamiento se limita a un botón ocupado, el éxito no presenta el calendario completo y el panel del estudiante no ofrece una acción para pagar aunque el cliente y el programa admiten ese pago.

El fiador visible por defecto es un fixture del simulador; no demuestra que exista una garantía para la wallet real. La preparación del programa, las cuentas y los fondos en devnet debe comprobarse antes de grabar. Una demora visual por sí sola tampoco prueba que el pago se confirmó.

## Solution

Un recorrido de compra y repago verificable en devnet, con fiador preparado antes de grabar. El caso acordado es una PC de 1.000 devUSDC, anticipo de 300 y financiación de 700 en tres cuotas sin interés. Los vencimientos son normales, a 30, 60 y 90 días desde la apertura, conforme a la configuración real.

La interfaz distingue aprobación en Phantom, envío/procesamiento y éxito confirmado. Una transición de procesamiento de unos dos segundos como mínimo hace legible la toma, pero la confirmación real determina el resultado. Tras la compra aparecen el anticipo pagado, el saldo, todas las cuotas y una primera cuota destacada con importe, fecha, días restantes y acción de pago. Una explicación desplegable describe las consecuencias del atraso sin ejecutar mora durante el video.

El usuario paga anticipadamente la primera cuota mediante una segunda aprobación en Phantom. La interfaz confirma el pago, muestra dos cuotas pendientes, actualiza el saldo y conserva esos datos al recargar. Los movimientos reales se respaldan con comprobantes de devnet.

## User Stories

1. As an estudiante, I want to conectar mi wallet Phantom, so that puedo comprar y pagar desde mi propia identidad.
2. As an estudiante, I want to ver que estoy en devnet y usando tokens sin valor, so that entiendo el entorno de prueba.
3. As an estudiante, I want to consultar mi saldo devUSDC, so that sé si puedo pagar el anticipo y la primera cuota.
4. As an estudiante, I want to ver mi fiador activo ya preparado, so that puedo comprar sin repetir su alta durante la demo.
5. As an estudiante, I want to recibir una explicación si falta la garantía real, so that entiendo por qué no puedo abrir el plan.
6. As an estudiante, I want to elegir la PC y tres cuotas sin interés, so that entiendo el caso de compra que estoy aceptando.
7. As an estudiante, I want to distinguir precio, anticipo y capital financiado, so that no confundo el anticipo con la primera cuota.
8. As an estudiante, I want to revisar monto, token, destino y red antes de cada pago, so that mi aprobación corresponde a una operación concreta.
9. As an estudiante, I want to aprobar el anticipo en Phantom, so that solo se paga con mi consentimiento explícito.
10. As an estudiante, I want to ver cuándo debo responder en Phantom, so that no interpreto la espera de aprobación como un pago enviado.
11. As an estudiante, I want to ver un estado de procesamiento después del envío, so that sé que la red todavía está confirmando.
12. As an estudiante, I want to ver éxito únicamente tras confirmar la compra y recuperar mi plan, so that el resultado mostrado corresponde a la cadena.
13. As an estudiante, I want to cancelar la aprobación sin activar un plan, so that puedo abandonar la compra sin un éxito engañoso.
14. As an estudiante, I want to recibir una explicación ante saldo insuficiente o fallo del pago, so that puedo resolverlo antes de intentar de nuevo.
15. As an estudiante, I want to evitar envíos repetidos por doble clic, so that no pago varias veces por una misma acción.
16. As an estudiante, I want to conocer el estado de un envío cuyo resultado tardó demasiado, so that no repito un pago que puede haberse confirmado.
17. As an estudiante, I want to ver el anticipo pagado y el saldo pendiente después de comprar, so that entiendo cuánto debo todavía.
18. As an estudiante, I want to ver las tres cuotas con importes, fechas y estados, so that puedo organizar mis próximos pagos.
19. As an estudiante, I want to ver la primera cuota destacada con su vencimiento y días restantes, so that sé cuál es mi próxima obligación.
20. As an estudiante, I want to consultar qué pasa si me atraso, so that conozco la gracia, los recargos y la intervención del fiador.
21. As an estudiante, I want to pagar la primera cuota antes del vencimiento, so that puedo adelantar el pago durante el recorrido acordado.
22. As an estudiante, I want to aprobar la cuota por separado en Phantom, so that la aprobación del anticipo no se convierte en autorización para otros pagos.
23. As an estudiante, I want to ver procesamiento y confirmación de la cuota, so that sé cuándo se actualiza mi deuda.
24. As an estudiante, I want to ver «Cuota 1 pagada · Quedan 2» y el saldo actualizado, so that reconozco el resultado del repago.
25. As an estudiante, I want to conservar las fechas de las cuotas siguientes cuando pago anticipadamente, so that el calendario sigue siendo previsible.
26. As an estudiante, I want to conservar el plan y los pagos al recargar, so that el resultado no depende de una animación o del estado del navegador.
27. As an estudiante, I want to abrir los comprobantes reales de compra y cuota, so that puedo verificar ambos movimientos.
28. As an fiador, I want to que la explicación excluya los punitorios de mi cobertura, so that se respetan los términos comerciales vigentes.
29. As an comercio, I want to que la compra respete mi modalidad de liquidación configurada, so that el cobro no depende de números inventados para el video.
30. As an grabador de la demo, I want to que el procesamiento sea visible el tiempo suficiente, so that la audiencia puede entender cada paso.
31. As an grabador de la demo, I want to preparar cuentas y fondos antes de la toma, so that la grabación se concentra en la compra y el repago.
32. As an grabador de la demo, I want to repetir la toma sin borrar ni ocultar deudas onchain, so that la demostración sigue siendo verificable.
33. As an jurado, I want to ver la demo y sus textos finales en inglés, so that puedo comprender el producto y comprobar qué funciona realmente.

## Implementation Decisions

- Mantener la API única de cuotas como límite de integración con la cadena. Checkout y cuenta del estudiante usan sus operaciones existentes de cotización, apertura, consulta y pago; la UI no construye transacciones ni habla directamente con RPC.
- Mantener un único origen para cada valor operativo: configuración del protocolo, cotización, plan y saldo consultados. El caso 1.000/300/700 es una expectativa de aceptación, nunca una configuración hardcodeada adicional.
- El anticipo se paga en devUSDC, token propio de prueba sin valor. SOL es un saldo distinto usado para costos de red y cuentas; no implementar conversión SOL/devUSDC.
- Mantener fiador obligatorio. Su preparación precede a la grabación y la lectura real debe corroborar garantía activa, cobertura y disponibilidad suficientes. Una garantía del mock no satisface este requisito.
- El caso de referencia usa liquidación inmediata del comercio. Verificar la configuración real antes de grabar; no extender en esta tarea la arquitectura de liquidación ni cambiar condiciones de negocio.
- Exponer desde el límite de integración el progreso observable de cada operación: aprobación pendiente, envío/procesamiento y resultado confirmado. La forma técnica de exponerlo puede adaptarse a los contratos existentes; no fijar un nuevo mecanismo global ni un esquema onchain.
- Mostrar revisión comprensible antes de cada aprobación explícita en Phantom. Reutilizar las validaciones, simulación previa y guardia de devnet existentes.
- Un éxito exige confirmación de la transacción y recuperación del plan actualizado. Si la transacción se confirmó pero falla la lectura, mostrar sincronización pendiente y recuperar datos; no ofrecer pagar de nuevo como si la operación hubiera fallado.
- La transición de procesamiento dura aproximadamente dos segundos como mínimo para resultados exitosos, desde la entrada al estado posterior al envío. No agrega dos segundos extra si la confirmación ya tardó más. Rechazos y errores se comunican sin esa espera mínima.
- Compra exitosa muestra resumen y calendario, con acceso claro al plan del estudiante. Destacar la primera cuota impaga y permitir su pago anticipado. Tras el primer pago, actualizar su estado y mostrar dos pendientes sin disparar automáticamente el siguiente pago.
- Preservar precisión de seis decimales en importes y transacciones. Para el caso base, las cuotas esperadas son 233,333333; 233,333333; 233,333334. Tras la primera quedan 466,666667. La presentación abreviada puede mostrar aproximadamente 233,33 y saldo 466,67 con detalle preciso accesible y total exacto.
- Mostrar fechas provenientes del plan y configuración reales, expresadas claramente para el usuario. Días restantes se calculan desde ese vencimiento y el tiempo de referencia real; no usar el reloj acelerado del simulador. Pagar anticipadamente no desplaza los vencimientos siguientes.
- La explicación de mora usa parámetros verificados de configuración. Referencia vigente: cinco días de gracia; después, recargo único del 5% sobre la cuota vencida a cargo del estudiante; a los quince días de atraso se solicita cobro al fiador; un recupero registrado afecta el Tier y bloquea nuevos planes. Distinguir vencimiento, fin de gracia, solicitud de cobro y recupero efectivo.
- Respetar la política vigente: la fianza cubre capital pendiente e interés contractual, excluye punitorios. El código de recupero aún contiene una discrepancia respecto de esa política; registrarla sin demostrar ni prometer un cargo corregido en esta tarea.
- Bloquear doble envío mientras una operación está pendiente. Ante timeout o pérdida de conexión, reconciliar la transacción y el plan antes de habilitar otro intento. Las confirmaciones y actualizaciones deben pertenecer a la wallet y el plan que originaron la operación.
- Mantener comprobantes reales de devnet para compra y cuota. Una simulación se identifica como tal y no presenta una firma inventada como comprobante real.
- Reutilizar el sistema visual y de traducciones existente. Estados, importes, fechas y acciones deben ser accesibles en móvil y escritorio; respetar movimiento reducido sin perder información de progreso. Los textos finales de la grabación van en inglés.
- Preparar una toma repetible con cuentas elegibles y fondos de prueba. Un plan real no se elimina borrando almacenamiento del navegador: repetir exige otra wallet preparada o saldar/cerrar el plan mediante operaciones autorizadas.
- El alcance no presupone cambios de esquema del programa. Si la verificación descubre una incompatibilidad necesaria para compra o repago, documentar la dependencia concreta antes de ampliar este ticket.

## Testing Decisions

- Límite principal propuesto: API pública de cuotas. Se pidió corroboración al usuario mediante una consulta breve; la respuesta, si llega, se incorpora sin reabrir la entrevista de producto.
- Una buena prueba observa resultados externos: mensajes y acciones disponibles, número de envíos, estado de cuotas, saldos, fechas y comprobantes. Evitar assertions sobre hooks, clases CSS, nombres privados o secuencias internas que no cambian el resultado.
- Probar el recorrido completo en navegador con Playwright: compra, calendario, pago anticipado de primera cuota y persistencia al recargar. Antecedentes: suites existentes de checkout, condiciones de liquidación y marketplace, que ya distinguen comprobante simulado de real.
- Para aprobación lenta, confirmación lenta, rechazo y timeout, controlar respuestas mediante el límite público de cuotas o el transporte de pruebas existente, sin inventar una segunda API de negocio. Las pruebas no requieren una clave privada ni firman en devnet.
- Ampliar pruebas del cliente real con el transporte/RPC controlado existente solo donde falte cobertura: progreso observable, confirmación, lectura posterior y recuperación de un resultado incierto. Reutilizar las pruebas existentes de apertura y pago del mock para matemática y actualización de deuda.
- Verificar que superar el mínimo visual sin confirmación no produce éxito; confirmar antes del mínimo conserva una transición legible; error o rechazo no esperan artificialmente. Usar control determinista del tiempo para estos escenarios.
- Verificar importes exactos y fechas: anticipo 300, financiación 700, tres cuotas que suman 700, saldo 466,666667 tras la primera, vencimientos a 30/60/90 días y fechas siguientes intactas tras repago anticipado.
- Verificar doble clic, aprobación cancelada y timeout sin nuevo envío automático; una compra confirmada con lectura fallida debe poder recuperar el plan sin volver a cobrar.
- Verificar ausencia de garantía real y fondos insuficientes: mensaje accionable, compra bloqueada y ningún éxito fabricado.
- Validar estados y acción de pago en móvil/escritorio, teclado y movimiento reducido, además de copys en español e inglés.
- Separar los resultados de pruebas automatizadas controladas de la evidencia final: pasada manual con Phantom en devnet, saldo antes/después, transacciones confirmadas, consulta del plan y recarga. Mock o RPC programado no demuestran movimientos reales.
- La pasada manual requiere aprobación explícita de cada transacción. Registrar evidencia pública de las dos operaciones, red, fecha y estado de las cuotas, sin secretos. El flujo implementado puede estar listo antes que el entorno; el objetivo de demo real solo se declara cumplido con esta evidencia.

## Out of Scope

- Mainnet, fondos reales, compra en SOL, conversión de moneda o rampas de entrada/salida.
- Alta de fiador en cámara, nuevas integraciones de identidad o procesadores de tarjeta, o atribuir una tarjeta real al fixture del mock.
- Ejecutar atraso, cobrar al fiador, demostrar recupero, enviar avisos reales o corregir integralmente el subsistema de mora. Su discrepancia de punitorios requiere trabajo separado antes de grabar ese circuito.
- Adelantar el reloj, usar vencimientos comprimidos o simular una confirmación como si fuera real.
- Cambiar tasas, topes, número de cuotas o política comercial; este caso usa tres cuotas y respeta otras modalidades existentes.
- Planes paralelos onchain, rediseño general, nueva base de datos, nueva arquitectura de liquidación, deploy del sitio o producción del video final.
- Enviar, firmar, fondear, inicializar o desplegar automáticamente por el hecho de que el ticket tenga la etiqueta ready-for-agent. Esas acciones mantienen el requisito de aprobación explícita por transacción.

## Further Notes

- Los siete acuerdos de producto están cerrados por respuestas explícitas del usuario. `/to-spec` solicita su síntesis sin nueva entrevista; este documento es el alcance canónico para ejecutar la tarea.
- Preparación previa: comprobar versión desplegada, configuración, mint, comercio, liquidez del pool, elegibilidad del estudiante y garantía. Preparar devUSDC para anticipo más primera cuota y SOL de prueba para los costos. El handoff histórico registra preparación pendiente, pero no certifica el estado actual de devnet.
- Ante discrepancias de configuración, resolverlas antes de grabar mediante propuestas concretas de operaciones autorizadas, nunca alterando solo los números que muestra la UI.
- El fiador precargado de la simulación no sustituye una garantía real; la aprobación para preparar el recorrido no acredita un consentimiento contractual externo ni un cargo sandbox ya ejecutado.
- Hay dos hitos: implementación verificable con pruebas controladas, y recorrido real observado con Phantom. Si faltan cuentas o fondos, registrar el bloqueo de la prueba real sin declararla completada.
- El texto explicativo de atraso debe describir la política vigente y las capacidades verificadas; la solicitud de cobro no garantiza que una tarjeta pague. El video de este ticket muestra compra y primera cuota puntual.
- No se envió ni firmó ninguna transacción al escribir esta especificación. No se requieren ADRs nuevos para estas decisiones reversibles de demo.
