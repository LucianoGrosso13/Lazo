# Opción H y mejoras 1, 2, 10 y 11 — alcance para implementar

Actualizado: 2026-10-07. **Especificación y tareas; no implementación nueva.** Todo se prueba en devnet (red de Solana con fondos sin valor) y con proveedores sandbox. La demo actual sigue siendo mock; no se verificó un nuevo recorrido real en esta tarea.

## Fuente y orden de decisiones

La numeración corresponde al §10 del [plan de negocio recuperado](07-plan-de-negocio/plan-de-negocio.md), no a otras listas del proyecto. La opción H está en §3 y las decisiones en §14. El archivo de Downloads coincide byte por byte con el de GitHub.

Origen: [LucianoGrosso13/Lazo, main fijado a a0b804d](https://github.com/LucianoGrosso13/Lazo/tree/a0b804d7c2a71a64229325588f23c456e1a82784/proyecto). Se recuperaron los documentos y modelos faltantes de `06-viabilidad/` y `07-plan-de-negocio/`; no se incorporaron los cambios de código de esa rama. Los archivos originales se conservan como antecedentes, con sus cifras y contradicciones visibles.

Orden de autoridad: instrucciones actuales del equipo → [decisiones vigentes](06-decisiones-comerciales.md) y este alcance → propuestas y escenarios del plan original. La elección de una idea no aprueba todas las tasas, proyecciones o plazos sugeridos en su fila.

| Selección | Definición recuperada | Recorte vigente |
|---|---|---|
| H | El comercio elige entre esquemas de costo H1/H2 | Adaptar a duración y fecha de liquidación: 3 sin interés; 6 con 3% total y comisión comercial por plazo en tramos |
| 1 | Incorporar 6 cuotas; 12 más adelante | Solo 6 con 3% total sobre financiado (mínimo US$ 350); 3 sin interés |
| 2 | Comercio elige cobrar hoy, a 30 o a 60 días con distinto precio | Cobro en tramos mensuales: hoy 7%, 30d 6,25%, 60d 5,75%, 90d 5,25% con compromiso onchain y chequeo de liquidez |
| 10 | Capital ocioso a DeFi, solo con tesorería propia | Fondos propios identificados, nunca fondos ajenos ni reservas; prueba simulada hasta verificar compatibilidad devnet |
| 11 | Descuentos para el fiador cuyo estudiante paga a tiempo | **DESCARTADA (2026-10-07):** eliminada de MVP, UI y roadmap; diluye el foco y subsidia sin evidencia |
| Mostrador | Venta minorista presencial por link/QR propio | **PRIORIZADA EN MVP (2026-10-07):** el cajero genera orden/QR y el estudiante paga con su fianza vigente |

## H adaptada: dos elecciones independientes

El comprador elige 1, 3 o 6 cuotas entre opciones realmente habilitadas. El comercio configura cuándo cobra y acepta su tarifa. Checkout presenta un único presupuesto que combina ambas elecciones; no cambia el plan después de que fue aceptado.

- **1 y 3:** interés comprador cero. Está pendiente si 1 significa contado o crédito a un vencimiento; no inventar ese plazo. Si es contado, no asumir adelanto del pool ni remuneración por originar crédito inexistente.
- **6:** interés positivo total sobre lo financiado, con tasa pendiente. Mostrar precio, anticipo, capital, interés, total y fechas. La comisión comercial continúa; no sustituirla por el interés del comprador.
- **Comercio:** ver comisión, base de cálculo, neto y fecha contractual de liquidación antes de entregar. Cobrar luego reduce el adelanto inicial, pero deja una obligación y riesgo de liquidez; no equivale a no tener riesgo.
- **Fiador:** 100% del principal pendiente en todos los escalones. Mostrar también el máximo contratado y el alcance pendiente sobre interés/punitorios. No liberar la fianza por subir de escalón ni por recibir un cupón.

El H2 histórico cobraba interés en 3 cuotas, y H1 permitía 6 sin interés. Ambos quedan reemplazados por este pedido. Tampoco se adoptan automáticamente 8/9% del precio, una rampa de 1%, DEBIN, tramos de inversores, retiros o varios planes simultáneos.

**Base del 7% por resolver:** la demo cobra 7% del financiado; H1 histórico usa 10% del financiado, equivalente a 7% del precio únicamente con anticipo de 30%. No son la misma tarifa. Se conserva la referencia de la demo mientras el equipo aclara la base; no publicarla como precio definitivo nuevo.

## Idea 1 — seis cuotas

**Experiencia:** en una venta minorista por link/QR o en una compra grande, la persona compara 3 sin interés con 6 con interés. El cajero reutiliza la identidad y fianza vigentes, no exige un alta nueva en cada venta. Mantener por ahora un plan activo en el programa; no asumir que los planes paralelos del mock ya existen onchain.

**Datos propuestos para configuración y copia inmutable por plan:** cantidad de cuotas habilitada, tasa total, fechas, política de redondeo, tarifa y base del comercio, calendario de liquidación, versión de términos, techo y referencia de la fianza. Los nombres de campos son de diseño; no se afirma que ya existan en `ProtocolConfig`.

**Aceptación:** suma exacta de anticipo y cuotas = total comprador; interés cero en 1/3 y tasa positiva aprobada en 6; redondeo final conserva unidades mínimas. Rechazar seis cuotas sin tasa, calendario o fianza suficiente; comprobar pagos adelantados, mora, recuperación y devolución sin duplicar capital/interés. Recalcular capital inmovilizado y retiros: una cartera de seis meses no cierra con un modelo que supone que todo vuelve en tres.

## Idea 2 — elegí cuándo cobrar

**Experiencia:** la cuenta del comercio compara opciones habilitadas con neto y fecha, y permite elegir una como predeterminada para compras futuras. La orden muestra la opción concreta. No mover su fecha unilateralmente ni confundirla con los vencimientos del comprador.

**Diseño propuesto:** separar el anticipo recibido, el adelanto financiado y la obligación de liquidación pendiente. Definir expresamente si el anticipo llega en el momento o sigue otro calendario. Aunque el comprador se atrase, la obligación hacia el comercio sigue el contrato elegido: no convertir una fecha prometida en “cuando el cliente pague” sin acuerdo previo.

Proponer inicialmente hoy y una fecha diferida para validar; 60 días después, si el equipo aprueba precio y reservas. No restar mecánicamente 2/4 puntos: si Lazo cobra originación 4% del financiado, una comisión comercial de 3% no paga ni esa partida por sí sola. Un subsidio explícito puede cubrir la diferencia, pero no es rentabilidad independiente.

**Aceptación:** reserva de liquidez contra obligaciones fechadas; liquidación exactamente una vez; reintentos idempotentes; no pagar una orden cancelada sin conciliar; reportar deuda al comercio incluso con mora. Probar devoluciones antes/después de liquidar, falta de caja, pago concurrente y caída del proveedor. El keeper ejecuta obligaciones aprobadas; no inventa tarifas.

## Economía de Lazo y del pool

El §14, D8, del plan registra como decidido por el equipo el 6/10: **4% de originación sobre lo financiado, incluido en la comisión comercial; 2% anual de administración sobre saldo, pagado por el pool**. Se recupera ese antecedente; no agregar ambos cargos al comprador de 1/3 cuotas. El recupero de mora pertenece al pool, no es una comisión adicional para Lazo. Definir aún cuándo se devenga/cobra, impuestos, cálculo temporal y tratamiento tras cancelación/default.

Ejemplo contable, no prueba de rentabilidad, con la referencia provisional de 7% del financiado:

| Partida | Precio 1.000 / anticipo 300 / capital 700 / 3 cuotas |
|---|---|
| Comisión total comercio | 49 |
| Neto comercio | 951 = 300 de anticipo + 651 de adelanto |
| Originación para Lazo | 28 = 4% × 700; sale de los 49 |
| Salida inicial del pool | 679 = 651 al comercio + 28 a Lazo |
| Principal a cobrar | 700, si cumple el comprador |
| Diferencia bruta pool antes de administración/costos | 21; no 49 y no ganancia neta |
| Administración ilustrativa, meses completos sobre saldo inicial | 2,333333 = 2%/12 × (700 + 466,666667 + 233,333333) |
| Resto pool antes de fondeo, pérdidas y demás costos | 18,666667 |

La administración es ingreso de Lazo y egreso del pool: no crea ingreso consolidado. Interés de 6 entra una sola vez en los flujos de cobro; su reparto debe quedar explícito. Distinguir empresa, pool y consolidado, como en [08](08-minorista-y-economia.md). Antes de elegir tasas, recalcular con cobertura 100%, plazos 1/3/6, costo del procesador, recupero efectivo, rampa y tickets pequeños; las TIR y márgenes del plan original corresponden a otros supuestos.

## Idea 10 — capital propio ocioso

DeFi son protocolos financieros ejecutados mediante programas en una blockchain. Depositar allí agrega riesgos técnicos y de liquidez: no usarlo como base para cumplir cuotas o pagar comercios. “Pool ocioso” del título original se recorta a **tesorería propia identificada y separada**, no dinero de inversores, depósitos de usuarios ni fondos comprometidos.

**Flujo propuesto:** tablero interno, no un paso del comprador. Primero conciliar caja propia y obligaciones; después calcular excedente habilitado, simular depósito/retiro y registrar resultados separados de los pagos de estudiantes. La autorización de esta idea no autoriza transacciones: cada firma/envío sigue requiriendo aprobación explícita.

`disponible_estrategia = max(0, caja_propia_libre - compromisos_propios - reserva_operativa_aprobada)`

Limitar además por tope configurado; no valorar posiciones como caja inmediata ni doble contar intereses. Si no hay excedente o compatibilidad verificada con devnet y el mint propio devUSDC, no invertir. Pérdida, retiro demorado o pausa no pueden consumir reservas comerciales ni interrumpir la contabilidad de planes. Simular fallos y demoras, no solo un rendimiento positivo.

La investigación oficial está en [compatibilidad de tesorería](research/g-capital-ocioso-devnet.md): Kamino publica despliegue devnet, pero no quedó verificado un mercado para nuestro mint; Jupiter publica direcciones Mainnet sin confirmar esta compatibilidad devnet. Por eso el alcance inicial recomendado es un adaptador simulado explícitamente rotulado. No se prometen 4,5% ni los +0,6–0,9% del escenario antiguo. No cambiar a mainnet para hacer funcionar una demo.

## Idea 11 — fiador al día [DESCARTADA 2026-10-07]

**Estado: DESCARTADA.** Decisión del 2026-10-07: se elimina de la UI, del MVP y de la hoja de ruta. Motivo: la fianza es obligatoria y cubre el 100% de capital + interés en todos los planes; sumar un esquema de descuentos comerciales para fiadores añade fricción operativa, complejidades contractuales y subsidios cruzados sin evidencia de reducir mora.

*(Texto original conservado como antecedente):*
El familiar entra a su panel mediante su identidad verificada y ve descuentos disponibles en comercios participantes. La compra sigue garantizada al 100%; el descuento no modifica su máximo contratado. Cada comercio define beneficio, presupuesto, vigencia y condiciones.

## Venta en mostrador por link/QR [PRIORIZADA EN MVP 2026-10-07]

**Estado: INCORPORADA AL MVP.** Decisión del 2026-10-07: el recorrido minorista presencial forma parte del producto final demostrado.
- El comercio genera la orden con importe y descripción desde su panel (`/app/comercio/mostrador`), obteniendo un link y un código QR propio en SVG.
- El estudiante escanea el QR desde su teléfono móvil y es redirigido a `/orden/[id]`, donde confirma la compra en 3 o 6 cuotas reutilizando su identidad y su fianza activa ya verificadas.
- La orden vence a las 24 h y no requiere que el estudiante instale una app específica ni cargue los datos en el mostrador.

## Tareas y orden de trabajo

Se anota el plan; ninguna tarea se declara implementada. [04-plan](04-plan.md) mantiene C1–C8 como dependencias de configuración, programa, cliente, UI, keeper y validación.

| Mejora | Cortes verificables y dueño propuesto | Dependencias / salida |
|---|---|---|
| 1 | Compañero: configuración/cotización/calendario; Luciano: cliente/selector; ambos: pagos y mora | C1–C6; 6 cuotas al 3% (mínimo US$ 350) en mock y programa |
| 2 | Compañero: obligación/reserva; Luciano: cuenta comercio; ambos: liquidación/conciliación | C1–C6; tramos mensuales (hoy 7%, 30d 6,25%, 60d 5,75%, 90d 5,25%) con compromiso onchain |
| Mostrador | Luciano: panel cajero (`/app/comercio/mostrador`) y checkout (`/orden/[id]`); compañero: orden mock | MVP funcionando de punta a punta con QR y link |
| 10 | Compañero: contabilidad propia y adaptador simulado; Luciano: tablero/rotulado | Módulo interno aislado (roadmap / simulación) |
| 11 | **Descartada** por decisión de producto | Fuera de alcance |

Prioridad decidida: cerrar reglas y coherencia de la demo → 1 (6 cuotas al 3%) / 2 (cobro en tramos) → venta en mostrador (link/QR) en el MVP → 10 como simulación aislada. La idea 11 queda eliminada. Una rama y commit por corte; no ampliar videos con funcionalidades no verificadas.

## Pendientes concretos

- Base definitiva del 7%, significado/vencimiento de 1 cuota y tasa total de 6.
- Tarifas, fechas y tratamiento del anticipo por liquidación; devengo de originación y administración.
- Techo contractual de fianza con interés/punitorios; no revocación desde la app mientras hay obligaciones sin confundirla con poder impedir revocación al emisor.
- Política/presupuesto de beneficios, reservas y topes de tesorería. Son valores de configuración, no números a inventar en código.

No se obtuvieron nuevos clientes, partners ni retornos. El [issue abierto de bloqueos](https://github.com/LucianoGrosso13/Lazo/issues/1) sigue siendo evidencia de trabajo pendiente, no una certificación de operación real.
