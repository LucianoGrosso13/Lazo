# 01: Compra confirmada en devnet, calendario y explicación del atraso

**What to build:** el estudiante conecta Phantom, encuentra su fiador real ya preparado, compra la PC de 1.000 devUSDC con anticipo de 300 y ve el procesamiento, la compra confirmada y los 700 pendientes en tres cuotas sin interés. La primera cuota queda destacada con vencimiento normal, días restantes y una explicación desplegable de las consecuencias del atraso. Este ticket reúne los antiguos 1, 2 y 3 por pedido explícito del usuario.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Con Phantom conectada, la interfaz muestra devnet, saldo devUSDC y garantía activa leída del modo real. Si falta garantía, cobertura, elegibilidad o saldo suficiente, explica el bloqueo y no fabrica un fiador ni una compra exitosa.
- [ ] Se verifican programa desplegado, configuración, mint, comercio, liquidez del pool y cuentas necesarias para el caso acordado. Preparación faltante queda registrada como operaciones revisables; toda firma o envío requiere aprobación explícita por transacción. Nunca se guardan secretos en el repo o en el chat.
- [ ] El entorno queda preparado para comprar y luego pagar la primera cuota: devUSDC suficiente y SOL de prueba para costos. Si falta una aprobación o un recurso externo, se registra el bloqueo y se continúa el desarrollo verificable con respuestas controladas; la compra real no se declara completada hasta observarla.
- [ ] Precio, anticipo, financiación, número de cuotas y términos del comercio provienen de configuración/cotización reales a través de la API única de cuotas. Para la toma se comprueba el caso 1.000/300/700, tres cuotas sin interés y liquidación inmediata, sin agregar números de negocio hardcodeados.
- [ ] Antes de aprobar el anticipo se muestran monto, token, destino y red. Conectar Phantom no envía ni autoriza el pago.
- [ ] La operación distingue aprobación pendiente en Phantom, envío/procesamiento y resultado confirmado, reutilizando el transporte y la simulación previa existentes. El progreso llega a la UI mediante la API de cuotas, sin RPC directo desde componentes.
- [ ] Para una operación exitosa, el procesamiento posterior al envío es visible aproximadamente dos segundos como mínimo; si la confirmación tarda más, se sigue esperando. Un contador nunca decide el éxito. Rechazo y error se comunican sin una espera artificial.
- [ ] «Compra exitosa» exige transacción confirmada y plan recuperado. Si se confirma pero falla la lectura, se muestra sincronización pendiente y se recupera el plan sin volver a cobrar.
- [ ] Doble clic o repetición de la acción mientras está pendiente no produce otro envío. Ante timeout o pérdida de conexión se verifica la operación original antes de permitir otro intento; cambios de wallet no muestran resultados de otra identidad.
- [ ] Tras confirmar aparecen anticipo pagado 300, saldo pendiente 700, las tres cuotas con sus fechas/estados y acceso al plan del estudiante. Las fechas son normales, a 30/60/90 días desde la apertura según configuración y plan reales; no se acelera el reloj.
- [ ] La primera cuota se destaca con importe, fecha exacta y días restantes. Las unidades mínimas conservan importes de 233,333333; 233,333333; 233,333334 devUSDC en el caso base. La presentación abreviada indica redondeo/aproximación y permite consultar precisión completa.
- [ ] La explicación desplegable de atraso usa parámetros verificados: referencia de cinco días de gracia, recargo único del 5% a cargo del estudiante y solicitud de cobro al fiador a los quince días; explica el efecto del recupero registrado sobre Tier y nuevas compras. Excluye punitorios de la fianza y no presenta como demostrado un cargo o aviso real.
- [ ] El resumen ofrece un comprobante real de devnet. Recargar conserva el plan y el calendario consultando la cadena. En pruebas simuladas se identifica la simulación sin enlaces de transacciones inventadas.
- [ ] Los textos están disponibles en español e inglés, funcionan en móvil/escritorio y con teclado, y mantienen información de progreso con movimiento reducido.
- [ ] Pruebas de navegador y del cliente mediante los límites existentes cubren compra, garantía ausente, fondos insuficientes, confirmación rápida/lenta, rechazo, doble clic, timeout y lectura posterior fallida. Observan comportamiento externo; no firman transacciones reales automáticamente.
- [ ] Se observa una compra con Phantom en devnet, con aprobación explícita y evidencia pública de transacción, saldo y plan. Si este hito está bloqueado, se conserva separado del avance de implementación.

**Parent:** especificación «Demo: compra real y pago de la primera cuota en devnet» del tracker local, publicada el 2026-10-09.

**Scope boundary:** el pago de la primera cuota pertenece a 02. Aquí la primera cuota queda visible y claramente identificada, sin un botón de pago habilitado que no funcione. No ejecutar mora, recuperar del fiador, cambiar reglas comerciales ni realizar un rediseño general. La discrepancia existente del recupero respecto de punitorios se registra para trabajo separado.
