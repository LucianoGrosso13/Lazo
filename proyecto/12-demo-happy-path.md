# Happy path para grabar la demo

Fecha: 2026-10-09. Estado: decisiones Q1–Q7 resueltas y sintetizadas a pedido del usuario con `/to-spec`. Especificación canónica publicada en el tracker local: [compra y primera cuota en devnet](../.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md), estado `ready-for-agent`. Este archivo conserva antecedentes de la entrevista. No se modificó la app ni se ejecutaron transacciones en esta sesión.

## Objetivo pedido

Conectar Phantom, pagar un anticipo con fondos de prueba, mostrar el procesamiento, confirmar la compra y mostrar las cuotas pendientes del estudiante. La grabación debe reflejar qué partes son reales.

## Hechos encontrados

- Phantom está conectado mediante Wallet Standard en devnet. Conectar no demuestra que la compra transfiera fondos.
- `app/src/lib/cuotas.ts` selecciona mock por defecto; el cliente real requiere `NEXT_PUBLIC_CUOTAS_MODE=real`.
- El cliente real cobra el anticipo en devUSDC, no en SOL (`app/src/lib/cuotas/real.ts`, `openPlan`). SOL cubre costos de red y creación de cuentas. devUSDC es el token propio de prueba de Lazo, sin valor.
- El checkout tiene revisión, confirmación y éxito. Mientras abre el plan, muestra un botón ocupado; no distingue aprobación en Phantom, envío y confirmación (`checkout-screen.tsx`, `confirm-panel.tsx`).
- El cliente real espera confirmación y luego lee el plan antes de retornar éxito. La pantalla final muestra anticipo, resumen de cuotas y enlace a Explorer para una operación real; no muestra todo el calendario (`confirm-success.tsx`).
- El handoff del 6/10 registra upgrade, inicialización y fondeo pendientes. No se comprobó hoy el estado de la cadena ni se completó una compra con Phantom.
- Fiador obligatorio según la política comercial vigente: no se propone omitirlo para grabar.
- Pagar una cuota antes del vencimiento está permitido tanto por el cliente real como por `pay_installment` del programa. Falta una acción de pago en la UI actual del estudiante; las tarjetas solo muestran importe, fecha y estado.
- Discrepancia de mora: `keeper_register_recovery.rs` y el mock aún incluyen punitorio en el cargo al fiador. La política vigente (`06`, addendum de cierre; `10`, cobertura) lo excluye. Corregir antes de demostrar ese cargo; el texto explicativo debe respetar la política vigente.

Fuentes de negocio: `06-decisiones-comerciales.md`, addendum de cierre, y `10-tasa-6-cuotas-y-cobro-diferido.md`. Algunos encabezados históricos todavía indican condiciones reemplazadas.

## Recorrido definido por Q1–Q7

1. Antes de grabar: wallet con devUSDC y SOL de prueba, fiador activo registrado, comercio y pool preparados; verificar programa/config y liquidez.
2. Conectar Phantom y mostrar red devnet y saldo devUSDC.
3. Elegir PC de 1.000 devUSDC, anticipo 300 y financiación 700 en tres cuotas sin interés. El comercio cobra inmediatamente en el caso de referencia; cotejar sus términos con la configuración real.
4. Revisar monto, token, destinatario y red; solicitar aprobación explícita del anticipo en Phantom. Conectar no autoriza el pago.
5. Mostrar «Confirmá en Phantom» durante la aprobación y «Procesando tu pago» después del envío. Transición visible de aproximadamente dos segundos como mínimo para una operación exitosa; esperar más si hace falta confirmar. No demorar la comunicación de rechazo o error.
6. Mostrar «Compra exitosa» solamente tras confirmar la operación y recuperar el plan. Ofrecer comprobante real en Explorer.
7. Mostrar anticipo pagado 300, saldo pendiente 700 y las tres cuotas con sus fechas y estados. Primera cuota destacada, botón «Pagar primera cuota», fecha de vencimiento y días restantes.
8. Abrir explicación desplegable de atraso, sin ejecutar ni representar como demostrado un cobro al fiador.
9. Pagar la primera cuota anticipadamente: nueva revisión y aprobación en Phantom, procesamiento y confirmación real.
10. Mostrar «Cuota 1 pagada · Quedan 2», saldo restante y calendario actualizado. Actualizar saldo de wallet; ofrecer comprobante del pago.
11. Recargar y comprobar que plan, cuota pagada y saldo restante se conservan leyendo la cadena.

El temporizador mínimo es una decisión de presentación aceptada en Q7: nunca determina el éxito ni sustituye la confirmación de red. Rechazar en Phantom no muestra éxito ni activa un plan.

## Importes y calendario

- Importes esperados del caso base: anticipo 300; cuotas de 233,333333, 233,333333 y 233,333334 devUSDC. Tras pagar la primera quedan 466,666667 devUSDC.
- La UI puede resumir como aproximadamente 233,33 por cuota y saldo restante 466,67, con precisión completa accesible y total exacto. No cambiar el monto enviado para ajustar la presentación a dos decimales.
- Vencimientos normales, sin adelantar el reloj: 30, 60 y 90 días desde la apertura según configuración vigente y fecha onchain. Mostrar fecha exacta y días restantes; el pago anticipado no desplaza las fechas siguientes.
- Todos los números operativos salen de `ProtocolConfig`, cotización y plan real. Los anteriores son resultados esperados del escenario, no constantes nuevas para la app. Si la configuración real difiere, resolver antes de grabar.

## Explicación del atraso

Texto de referencia, condicionado a corroborar los parámetros de la configuración real:

«Tenés 5 días de gracia después del vencimiento. Pasado ese plazo se aplica un recargo único del 5% sobre la cuota vencida, a tu cargo, y el plan deja de contar para mejorar tu nivel. A los 15 días de atraso se solicita el cobro al fiador; si se registra ese cobro, baja tu nivel y no podés abrir nuevos planes. El recargo no está cubierto por la fianza.»

Puede incluir detalle de que un segundo cobro al fiador en el mismo plan anticipa la exigibilidad del saldo, si corresponde a la configuración y política verificadas. No afirmar que existe una notificación real por WhatsApp ni que el cargo siempre se recupera. El recorrido de esta grabación no incluye atraso ni cargo al fiador: solo explica la consecuencia.

## Primera ronda resuelta

Respuestas explícitas del usuario, 2026-10-09:

1. Compra real en devnet con anticipo en devUSDC. No implica autorización para enviar o firmar transacciones desde el agente.
2. Fiador precargado; no mostrar su alta durante la grabación. El usuario cree que ya figura así: falta distinguir el fixture mock de una garantía registrada para su wallet real.
3. Tras el anticipo, mostrar cuotas pendientes, acción para pagar la primera, tiempo disponible y explicación de qué pasa si no paga a tiempo.

## Segunda ronda resuelta

Respuestas explícitas del usuario, 2026-10-09:

4. PC de 1.000, anticipo de 300, tres cuotas sin interés.
5. Vencimientos normales, sin reloj acelerado.
6. Completar pago real de la primera cuota en el video y mostrar dos restantes.
7. Estados de aprobación/procesamiento y transición mínima de aproximadamente dos segundos, condicionando éxito a confirmación real.

## Trabajo necesario y preparación

- Verificar en lectura el despliegue, configuración, mint y cuentas actuales; el handoff histórico no prueba el estado de hoy.
- Verificar garantía precargada para la wallet elegida. El fixture automático existe solo en mock. Prepararla en cadena si falta, con aprobación explícita de cada transacción.
- Asegurar saldo devUSDC para anticipo más primera cuota, SOL suficiente para costos y cuentas, y liquidez del pool para la operación. Fondeo/init/deploy requieren aprobación explícita de cada transacción.
- Implementar estados visibles del checkout, resumen/calendario posterior y CTA de primera cuota usando la API `app/src/lib/cuotas.ts`.
- Prevenir doble clic y nuevas operaciones mientras un envío está pendiente. Si hay timeout, consultar el estado de esa transacción antes de proponer otro pago; no reenviar a ciegas.
- Aplicar el mismo comportamiento a la primera cuota: cancelar no modifica deuda; confirmar actualiza datos reales.
- La discrepancia de punitorios al fiador se registra como trabajo separado previo a cualquier demostración de recupero. No ampliar este happy path a mora ejecutada.
- Para repetir una toma, usar otra wallet de prueba preparada o saldar/cerrar el plan existente mediante el flujo autorizado. Borrar datos del navegador no borra un plan onchain. Ningún reseteo debe ocultar una deuda real de prueba.

## Criterios de listo

- Compra y cuota observadas en pantalla con Phantom, solo devnet y tokens sin valor.
- Anticipo descontado en devUSDC, plan creado y comprobante de red válido; no éxito por temporizador.
- Tres cuotas inicialmente pendientes con fechas normales y acción para pagar la primera antes de vencer.
- Tras el pago: primera pagada, dos pendientes, saldo y wallet actualizados; persistencia correcta al recargar.
- Rechazo en Phantom y doble clic no generan éxito ni cargos adicionales; timeout no invita a duplicar un envío sin verificarlo.
- Explicación de atraso respeta los términos reales y la política que excluye punitorios de la fianza.
- Grabación y textos finales para jurados en inglés, con devnet y tokens de prueba identificados. Copys españoles de este documento son referencias internas.

No se requiere ADR: estas decisiones de demo son reversibles. El vocabulario acordado está en `../CONTEXT.md`.
