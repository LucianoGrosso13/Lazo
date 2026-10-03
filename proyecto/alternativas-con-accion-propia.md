# Alternativas con una acción económica propia

Fecha: 3 de octubre de 2026. Equipo: dos estudiantes. Estado: ideas por elegir, sin implementación ni demanda validada. El usuario cuestionó el diferencial de Compra Clara y pidió ampliar la propuesta. Se mantienen las prioridades de bonus universitario, experiencia, pitch y, si hay uso posterior, tracción.

## Corrección de enfoque

Compra Clara es una vista previa de compra. Artificial Inu es una memecoin con un par de acciones tokenizadas y una tesorería financiada por comisiones. Sus mecánicas son distintas, pero la objeción sobre el escaso diferencial del MVP es válida. La siguiente versión debe ejecutar una decisión útil sobre fondos y demostrarla; agregar gráficos o un chat no resuelve esa debilidad.

## Cuatro direcciones

| Idea | Usuario propuesto | Acción central | Qué cambia frente a una pantalla de compra | Riesgo principal |
|---|---|---|---|---|
| Cobro con reserva e inversión personal | Persona que cobra trabajos en USDC y reparte ingresos irregulares | Aplicar a cada cobro una regla elegida por el usuario, respetando una reserva líquida | Conecta cobrar, reservar gastos y destinar un excedente a una posición propia | La mecánica de reparto ya existe; probar necesidad, integración y diferencia |
| Tesorería compartida con salida proporcional | Grupo pequeño que quiere gestionar un capital común | Registrar aportes, decisiones y retiro proporcional de activos | El aporte da una participación verificable y una salida definida | Custodia, derechos, contabilidad y posible estructura de fondo; demasiado alcance para la jornada |
| Pago de factura desde una posición tokenizada | Titular de xStocks que necesita pagar a un proveedor | Vender una cantidad limitada y entregar el importe completo de USDC al receptor | Uso de un activo dentro de un pago completo | Checkout con swaps ya tiene antecedentes; necesitamos un caso distinto y soporte real del instrumento |
| Plan de salida para una meta personal | Persona con una posición y un gasto futuro definido | Autorizar ventas parciales con límites para acumular el monto líquido de la meta | Une una obligación concreta a reglas de venta, cancelación y trazabilidad | Las ventas programadas ya existen; no garantiza alcanzar la meta ni evita pérdidas |

## Recomendación provisional: Cobro con reserva

Una persona define: «Destiná hasta el 20% de cada cobro a este instrumento, manteniendo al menos 150 USDC para mis gastos». Es una regla configurada por el usuario, no una recomendación de porcentaje ni de activo.

Ejemplos hipotéticos que muestran el valor:

- Saldo líquido inicial 80 USDC, cobro de 50: saldo disponible 130; inversión cero porque no alcanza la reserva.
- Saldo líquido inicial 80 USDC, cobro de 100: una inversión de 20 deja 160 líquidos, por encima del mínimo.

La inversión debe ser el menor valor entre el porcentaje del cobro y el excedente que permite mantener la reserva. Los costos deben considerarse antes de ejecutar. Si no hay una ruta válida, ese dinero permanece en USDC. La reserva es un límite de asignación; no elimina los riesgos propios de USDC o del activo comprado.

Las posiciones son personales. La compra conserva las restricciones y derechos del instrumento original; no se emite una participación en un fondo propio. [Documentación legal de xStocks](https://docs.xstocks.fi/docs/product-legal-overview).

## MVP revisado: tres funciones

1. Configurar reserva mínima y porcentaje de un cobro para un único instrumento.
2. Recibir un pago de prueba y aplicar la regla, con confirmación del usuario para la operación. Mostrar ejecución y rechazo por violación de la reserva. La regla debe imponerse en la operación, no sólo en la interfaz.
3. Ver los destinos del cobro, el saldo restante y el historial verificable. Las posiciones y el dinero de devnet se rotulan como prueba.

La autonomía sin una nueva firma en cada cobro queda para después: requiere autorización limitada, revocación y un disparador de ejecución. No se presenta como ya resuelta.

Durante la jornada se busca demostrar la regla y el movimiento de fondos con activos de prueba. La lectura del instrumento real se puede incorporar; la compra de acciones tokenizadas reales no se supone habilitada. Probar la viabilidad de ejecución en el primer bloque de 45 minutos, antes de comprometer el alcance.

En los días siguientes, integrar el instrumento, atender multiplicadores y cotizaciones vencidas, incorporar cancelación o cambio de reglas y comprobar si usuarios con cobros reales quieren repetir el flujo. Las transacciones de prueba no se presentan como facturación o volumen comercial.

## Competencia comprobada y límites de la investigación

- Jupiter documenta compras recurrentes y condicionadas por precio. Agregar sólo una compra semanal no constituye diferenciación. [DCA de Jupiter](https://developers.jup.ag/docs/trigger/dca).
- Squads documenta gestión compartida de tesorería, permisos y límites. Un club que sólo vota transferencias también tiene alternativas. [Squads](https://docs.squads.so/main/getting-started/treasury-management-overview).
- Se hicieron búsquedas en Colosseum Copilot con y sin filtro de ganadores. Se leyeron los registros completos de Finora Pay y Settlix.
- Finora Pay presentó reparto de cobros entre gasto, ahorro e inversión. La evidencia histórica incluye una demo con pagos simulados; su sitio no fue accesible en la consulta actual. No se concluye que esa limitación histórica persista hoy. [Proyecto](https://colosseum.com/projects/explore/finora-pay).
- Settlix presentó pagos desde diferentes tokens con recepción de USDC, facturas y reparto de cobros. El registro incluye demostración de checkout en un entorno local. No se verificó aquí disponibilidad comercial actual ni soporte específico de xStocks. [Proyecto](https://colosseum.com/projects/explore/settlix).
- The Grid devolvió registros de pagos e infraestructura financiera; los registros consultados no permiten establecer que la combinación de reserva y acciones esté libre de competidores.

La diferencia propuesta es una experiencia para ingresos irregulares con reserva de gastos, ejecución verificable y posiciones personales. Sigue siendo una hipótesis; no se afirma novedad absoluta.

## Relación con los bonus

- Experiencia: introducir una regla cotidiana y mostrar de manera comprensible dónde quedó cada parte del cobro.
- Pitch: ejecutar dos cobros que producen resultados distintos por la reserva, con un intento inválido rechazado.
- Universitario: documentar la contribución real de ambos y verificar condición académica al inicio de la competencia.
- Tracción: buscar personas del público que vuelvan para aplicar la regla a otro cobro; registrar feedback y distinguir testers de clientes.

Pregunta pendiente: a qué personas puede acceder el equipo hoy. Si no conocemos a nadie que cobre en dólares digitales y viva este problema, la recomendación pierde fuerza y corresponde elegir otra dirección.
