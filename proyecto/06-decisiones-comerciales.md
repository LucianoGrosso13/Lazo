# Decisiones comerciales vigentes de Lazo

Actualizado: 2026-10-07. Fuentes: pedido explícito de Luciano en esta sesión y antecedente D8 del plan recuperado de GitHub (ver 09). Este documento y el addendum vigente de `02-validacion.md` prevalecen sobre tablas históricas. Estado: **decisiones de producto documentadas; nuevas modalidades aún no implementadas ni validadas comercialmente**.

## Cuotas y cobro al comercio

| Modalidad | Costo para el comprador | Costo para el comercio | Estado |
|---|---|---|---|
| 1 cuota | Sin interés | Según plazo elegido para recibir el dinero | A definir si es contado o pago financiado a 30 días |
| 3 cuotas | Sin interés | 7% sobre el monto financiado como referencia de cobro inmediato; otra tarifa si elige esperar | Flujo base de la demo actual; nuevas opciones de liquidación pendientes |
| 6 cuotas | Interés moderado sobre el monto financiado | También paga comisión según el plazo de liquidación elegido | Modalidad aprobada; tasa y tarifas pendientes de calibrar |

El comercio elige **cuándo recibir el dinero**. Recibirlo inmediatamente requiere adelantar capital; esperar reduce esa necesidad. La propuesta es ofrecer precios menores al esperar, sujetos a una cuenta económica y al contrato de quién asume la mora. No hay fechas ni descuentos nuevos aprobados. El 7% no pasa a ser una tasa obligatoria para todos los planes y plazos. **Base por aclarar:** H1 del plan histórico equivale a 7% del precio con anticipo de 30%, mientras la demo usa 7% de lo financiado; se mantiene esta última como referencia provisional, sin confundir ambas cifras.

El interés de 6 cuotas se expresa como porcentaje **total del plan sobre el capital financiado**, con importe total, cronograma y costo efectivo visibles. Estar denominado en dólares digitales no prueba que sea barato ni rentable; quien cobra en pesos conserva riesgo cambiario. USDC es un token diseñado para seguir el valor del dólar; la demo usa **devUSDC, un token propio sin valor**, en **devnet, la red de prueba de Solana**.

Si `P` es precio, `D` anticipo y `A=P-D` capital financiado:

- Interés del comprador: `I=A×i(n)`, con `i(1)=i(3)=0` y `i(6)>0`, tasa pendiente.
- Total comprador: `D+A+I`. Cuotas sobre el saldo: `(A+I)/n`, con redondeo en unidades mínimas y ajuste final para conservar exactamente el total.
- Comisión comercio: `F=A×f(n, plazo_liquidación)`. Neto total comercio: `P-F`, salvo costos adicionales expresamente informados. El anticipo nunca se cobra dos veces.
- Reparto recuperado del §14, D8, del plan: **4% de originación sobre financiado para Lazo, incluido en la comisión comercial; 2% anual de administración sobre saldo pagado por el pool**. El recupero de mora queda en el pool. Devengo, base temporal y aplicación a liquidación diferida siguen pendientes; comisión bruta no equivale a ganancia de la empresa. Cuenta sin doble cobro en `09-alcance-opcion-h-y-mejoras.md`.

Ejemplo base vigente: precio 1.000, anticipo 300, financiación 700, 3 cuotas sin interés → total comprador 1.000 y neto comercio 951 con liquidación inmediata al 7%. En precisión de 6 decimales: dos cuotas de 233,333333 y última de 233,333334. La pantalla puede mostrar 233,33 redondeado, pero la contabilidad debe conservar el total.

Ejemplo exclusivo de sensibilidad, **no tarifa aprobada**: con `i(6)=4% total`, interés 28, saldo a devolver 728 y total comprador 1.028. El neto comercio depende de la tarifa de 6 cuotas y del plazo elegido; no se presume que sea 951.

## Fiador al 100%

Decisión aprobada: **todo plan con fiador mantiene cobertura del 100% del capital financiado pendiente en todos los escalones**. La escalera mejora anticipo y límite; no reduce ese porcentaje ni libera al fiador. Anticipos y topes heredados siguen como referencia de configuración, sujetos a validación económica, no como oferta comercial.

| Escalón con fiador | Anticipo de referencia | Cobertura de capital | Tope de compra de referencia |
|---|---|---|---|
| 0 | 30% | 100% | 1.000 devUSDC |
| 1 | 20% | 100% | 1.000 devUSDC |
| 2 | 10% | 100% | 1.250 devUSDC |
| 3 | 0% | 100% | 1.500 devUSDC |

**Pendiente contractual:** confirmar si el máximo también cubre íntegramente interés de 6 cuotas y punitorios, su techo y duración, y cómo se convierte un cargo a pesos. El 100% no autoriza cargos ilimitados ni determina por sí solo `FIADOR_COVERAGE_POLICY`. Para habilitar planes debe existir un monto máximo aceptado que cubra la exposición correspondiente; el alta real sigue bloqueada si falta esa política.

La cobertura contractual no garantiza recuperar el dinero: la tarjeta puede rechazar el cargo o producir un contracargo. Usar escenarios de recupero efectivo separados. Un fiador no puede respaldar planes paralelos por encima del máximo agregado aceptado. El mock permite planes paralelos; el programa actual aún tiene un plan por estudiante. No trasladar esa capacidad a la cadena sin migración y pruebas.

El tramo histórico sin fiador permanece fuera de la UI del MVP; no es una excepción para bajar cobertura de los planes garantizados ni una oferta lista para el piloto.

## Distribución y minorista

Construir Lazo como medio de pago integrable y buscar una billetera como canal de distribución y conversión pesos↔USDC. Lemon, Ripio y belo son **candidatos a investigar, no aliados**. No hace falta construir un exchange propio para comprobar la demanda. Plan detallado y evidencia en `07-go-to-market-y-alianzas.md`.

Añadir un recorrido minorista mediante link o QR propio, reutilizando identidad y fianza vigentes dentro de sus límites. Menor ticket no significa menor costo: debe cubrir procesador, capital, pérdidas, rampa, soporte y adquisición. Propuesta, sensibilidad y validación en `08-minorista-y-economia.md`. Es una ampliación propuesta para validar, no tracción ni integración ya obtenida.

## H e ideas seleccionadas: fuente recuperada

La opción **H** significa “el comercio elige”. Se adapta al pedido vigente: 1/3 sin interés y 6 con interés comprador, más comisión comercial según cuándo cobra. No conserva el interés en 3 cuotas ni el modo de 6 sin interés del H histórico.

Del §10 del plan: **1 = seis cuotas; 2 = elegir cuándo cobrar; 10 = capital ocioso a DeFi solo con tesorería propia; 11 = descuentos comerciales para el fiador al día**. Alcance, flujos, pendientes, economía y criterios de aceptación en `09-alcance-opcion-h-y-mejoras.md`. Sus tarifas y rendimientos originales no quedaron aprobados al elegir las ideas.

## Próximas decisiones para implementar

1. Qué significa 1 cuota y cuándo vence; calendario de 3/6 cuotas.
2. Tasa total de 6, base del 7%, tarifas por modalidad/plazo, devengo del reparto 4%/2% y costos visibles.
3. Plazos de liquidación, exposición del pool y tratamiento de mora, devolución y cancelación para cada opción.
4. Máximo de fianza con interés, punitorios y exposición agregada.
5. Elegibilidad/presupuesto de beneficios y reserva/tope de tesorería; compatibilidad devnet antes de integrar protocolos.

Ninguna de estas cifras nuevas se hardcodea: el contrato de configuración debe extender `ProtocolConfig`, guardando una copia de términos en cada plan. Cambiar la config no modifica deudas ya aceptadas. Solo devnet y sandbox; cualquier transacción firmada o enviada requiere aprobación explícita.
