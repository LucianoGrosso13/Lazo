# G — Idea 10: tesorería propia ociosa y demo solo devnet

**Investigación: 2026-10-07. Estado: propuesta documental, sin implementación ni transacciones.** Este reporte desarrolla exclusivamente la idea 10 de §10 de `/Users/lucianogrosso/Downloads/plan-de-negocio.md` (fechado 2026-10-06). Se consultaron `AGENTS.md`, las decisiones vigentes de `06-decisiones-comerciales.md` y `02-validacion.md`, el MVP y el estado del plan. El coordinador integra el documento fuente de GitHub y las restantes ideas; este reporte no modifica sus documentos canónicos.

## Recomendación

**Para la hackathon, demostrar el control de excedentes propios con un adaptador simulado explícito. No presentar depósitos/retiros reales en Kamino o Jupiter como disponibles con el mint propio devUSDC.** Kamino publica un despliegue devnet y parámetros de red, pero no se verificó un mercado/reserva utilizable que acepte nuestro token. Las páginas oficiales de Jupiter Lend consultadas publican direcciones Mainnet; no confirman un despliegue devnet ni un mercado para devUSDC. Esto es falta de confirmación de compatibilidad, no prueba de imposibilidad técnica.

**Devnet** es la red de prueba de Solana: los tokens no tienen valor. **USDC** es un token diseñado para seguir el dólar; **devUSDC** es el token de prueba propio de Lazo, distinto del emitido por Circle. El **mint** es la dirección que identifica exactamente un token: el nombre y seis decimales no vuelven compatibles dos mints. Un **SDK** es una biblioteca para integrar un protocolo; poder elegir la conexión de red no crea los mercados que necesita. Un **adaptador** traduce las operaciones de Lazo al proveedor o al simulador.

La fuente llama a la idea “Ocioso del pool a DeFi” y la restringe a tesorería propia. Su tasa orientativa y el incremento anual propuesto para el pool **no están aprobados ni validados**: no son una oferta, una promesa ni entradas del caso base de Lazo. Las cifras históricas de yield en el addendum tampoco acreditan soporte de devUSDC. **Yield** significa rendimiento de una colocación; **PnL** significa ganancias y pérdidas. La rentabilidad del crédito debe analizarse con yield externo igual a cero, incluyendo sus costos y pérdidas propios.

## Evidencia primaria y límites

Todas las fuentes siguientes se consultaron el **2026-10-07**. Las páginas no muestran una fecha editorial inequívoca; la fecha indicada es de consulta, no de publicación. Los enlaces a `master` son referencias vivas, no versiones fijadas. La revisión fue documental: no se consultaron cuentas por RPC, no se construyeron operaciones de Lazo, no se firmó ni envió nada y no se operó en mainnet.

| Fuente oficial | Qué confirma | Qué no confirma |
|---|---|---|
| [Kamino KLend — README y despliegues](https://github.com/Kamino-Finance/klend) | Publica Devnet con program ID `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`. “Staging” figura como Mainnet | Que el despliegue esté operativo hoy, que exista un mercado devnet de Lazo o que acepte su mint |
| [Kamino Buildkit](https://kamino.com/docs/build) | Documenta SDK/API, depósitos/retiros y creación de bóvedas; los ejemplos usan RPC mainnet. Bóveda: cuenta que administra depósitos y posiciones | Que crear una bóveda baste para tener reservas, liquidez o rendimiento en devnet |
| [Kamino SDK — README](https://github.com/Kamino-Finance/klend-sdk) | Carga un mercado y reservas concretas; construye acciones de depósito con dirección de reserva. El ejemplo de ejecución usa `mainnet-beta` | Que cambiar la conexión haga aparecer esos mercados en devnet |
| [Kamino — historial de una reserva](https://kamino.com/docs/build/kamino-lend-markets/get-klend-reserve-history) | El esquema acepta `env=devnet` y `localnet`; por defecto usa `mainnet-beta` | Que haya una reserva para cualquier mint o datos para nuestro devUSDC |
| [Kamino — configuración de mercados V2](https://kamino.com/docs/build/kamino-lend-markets/get-all-kamino-markets-config) | V2 filtra por program ID, en vez de cluster, y muestra un mercado de mainnet en su ejemplo | Que compartir program ID entre redes convierta la respuesta en evidencia de devnet |
| [Kamino — inicialización de reserva](https://github.com/Kamino-Finance/klend/blob/master/programs/klend/src/handlers/handler_init_reserve.rs) | Vincula la reserva al mint y mercado concretos; exige un firmante permitido por el mercado y valida características del token | Que Lazo tenga autorización para agregar su mint a un mercado existente |
| [Jupiter Lend — overview](https://developers.jup.ag/docs/lend) | Distingue Earn (depositar) y Borrow (tomar préstamos); SDK/API construyen operaciones. Ejemplo RPC mainnet y SDK basado en `@solana/web3.js` | Que una conexión genérica pruebe despliegue o mercados devnet |
| [Jupiter Lend — direcciones](https://developers.jup.ag/docs/lend/program-addresses) | Las filas publicadas figuran como Mainnet, incluyendo Earn y Liquidity | No publica en esa página una tabla devnet; eso no prueba ausencia absoluta de despliegues |
| [Jupiter Earn — estructura y riesgos](https://developers.jup.ag/docs/lend/earn) | Existe una cuenta Lending por mint subyacente soportado; advierte riesgo de pérdida. Retiros sujetos a Automated Debt Ceiling, mecanismo que limita/suaviza la salida | No garantiza rescate inmediato o principal íntegro; no declara devUSDC soportado |
| [Jupiter Earn — depósito SDK](https://developers.jup.ag/docs/lend/earn/deposit) y [retiro SDK](https://developers.jup.ag/docs/lend/earn/withdraw) | Builders de instrucciones para entrar/salir; depósito ejemplificado con mint USDC y RPC mainnet | Recibir un parámetro `asset` no implica que todo mint sea admitido |
| [Jupiter Earn — lectura de datos](https://developers.jup.ag/docs/lend/earn/read-data) | SDK de lectura lista tokens soportados y consulta posiciones/cuentas vía RPC | No aporta una lista devnet que incluya devUSDC de Lazo |
| [Jupiter Earn — API beta](https://developers.jup.ag/docs/lend/earn/api) | Deposit/withdraw operan por activos; mint/redeem por shares, las participaciones que representan el depósito. Ejemplos conectan a mainnet | No documenta aquí un selector devnet que habilite nuestro activo |

**Conclusión por proveedor:** Kamino tiene soporte devnet **declarado a nivel programa/esquema**, con confianza alta en lo que publican esas fuentes; una ida y vuelta operativa con nuestro mint sigue **sin verificar**. En Jupiter, las operaciones de lending están documentadas, pero el soporte devnet y del mint propio está **sin confirmar**. No hay fundamento para calificar la integración de “bajo esfuerzo” ni para prometer rendimiento.

**Inferencia técnica:** un programa desplegado, un SDK con RPC configurable, un mercado existente y una reserva que acepte el mint son cuatro condiciones distintas. Crear/configurar un mercado o reserva de prueba sería otro trabajo, con permisos, liquidez y dependencias de precios que habría que verificar. Aunque lograra depósitos y retiros, eso no demostraría un rendimiento de mercado: necesita actividad de prestatarios. No se propone desplegarlo en esta entrega.

## Alcance específico de la idea 10

1. **Origen propio y segregado.** Solo excedente libre de la empresa, identificado en una cuenta de tesorería y en un registro de origen. Nunca fondos senior o junior de terceros (tramos con distinta prioridad y riesgo), dinero de estudiantes/comercios, anticipos, recuperos por aplicar ni reservas contractuales. Tampoco capital propio ya comprometido como primera pérdida o garantía de obligaciones del pool. Si no puede probarse el origen/libre disponibilidad, el monto elegible es cero. No usar el saldo del vault común del pool como permiso de inversión.
2. **Liquidez antes que rendimiento.** Separar y mantener en caja el principal requerido para vencimientos, liquidaciones a comercios, devoluciones, retiros exigibles y reservas. Las posiciones externas no cuentan como caja inmediata. No contar cuotas futuras, cargos pendientes al fiador ni yield esperado como dinero disponible. Si cambia el calendario, la caja se recalcula antes de una colocación nueva.
3. **Sin deuda ni transformación del activo.** Solo depósito/retiro del token de prueba admitido. Fuera de alcance: borrow, apalancamiento, swaps, puentes, derivados, JLP y usar recibos como garantía. “Jupiter” acá significa Jupiter Lend Earn; no su agregador de swaps ni otros productos.
4. **PnL de tesorería propio.** Atribuir ganancias, pérdidas y costos únicamente a la empresa y a esta estrategia; no mezclarlos con intereses de cuotas, mora, recuperos, comisiones ni resultado senior/junior. No alterar la cascada del pool. Si luego se aporta ganancia realizada al pool, registrarla como un aporte separado y explícito, nunca como yield crediticio.
5. **Límite y salida.** Estrategia deshabilitada por defecto; topes en `ProtocolConfig`, sin cifras de negocio hardcodeadas. Pausar depósitos conserva lectura/retiro. Reversibilidad significa poder detener la estrategia y solicitar/deshacer la exposición, no garantizar que un protocolo devuelva todo inmediatamente.

La protección propuesta es **mantener fuera de la estrategia el principal comprometido**, no asegurar el excedente expuesto. El capital colocado puede perderse o quedar ilíquido; el modelo debe poder soportar ese escenario sin gastar la caja reservada para obligaciones.

### Regla propuesta de elegibilidad

Variables en unidades mínimas del token, sin tasas/plazos comerciales inventados:

- `C`: caja propia elegible verificada, excluidos fondos de terceros y compromisos de capital/garantías.
- `R`: caja protegida adicional para obligaciones y colchón de liquidez; obligaciones sin duplicar importes entre categorías. El horizonte y el estrés quedan pendientes de aprobación. Compromisos fuera del horizonte no pasan a ser excedente automáticamente.
- `E`: exposición actual, incluyendo depósitos pendientes y retiros aún no acreditados. Una caída de valuación no libera cupo para reponer riesgo automáticamente; considerar capital expuesto y valoración prudente.
- `L`: límite absoluto configurado; `p`: porcentaje máximo configurado sobre capital propio elegible de referencia, que no incluye ganancia externa no realizada; `B`: esa base de referencia.

`nuevo_deposito_max = max(0, min(C − R, L − E, floor(p × B) − E))`.

La propuesta necesita definir `R`, `L`, `p`, `B` y límites de pérdida antes de habilitarla; hasta entonces queda en cero. Validar caja nuevamente al ejecutar y reservar la operación para evitar que dos solicitudes consuman el mismo excedente. Capital en estrategia más caja residual debe reconciliar con el libro propio; shares no son caja.

### Contrato del futuro adaptador

Propuesta de interfaz interna detrás de `app/src/lib/cuotas.ts`, conforme a la convención del proyecto. Nombres orientativos, no API ya implementada:

- `getCapabilities`: modo `simulated` o `devnet-real`, red, program ID, mercado/reserva/bóveda, mint y evidencia de compatibilidad.
- `quoteDeposit` / `quoteWithdraw`: monto, recibos, caja remanente, costos, liquidez disponible y fecha/slot de lectura. RPC es la interfaz para leer la red; slot identifica un momento de esa lectura.
- `getPosition`: capital neto aportado, participaciones, valor estimado, cantidad rescatable ahora y operaciones pendientes.
- `prepareDeposit` / `prepareWithdraw`: preparar intención para revisión; la ejecución real requiere aprobación explícita de la transacción antes de firmar/enviar.
- `reconcile`: conciliar resultado confirmado por cuenta/red o por evento del simulador. Una respuesta del SDK o una firma enviada no equivale a ejecución confirmada.

Registro separado: depósitos `D`, retiros confirmados `W`, valor restante estimado `V` y costos externos `F`; `PnL_total = W + V − D − F`, cuidando no restar dos veces costos ya incluidos en importes netos. Separar costo de capital rescatado de ganancia realizada mediante una regla contable consistente; mostrar PnL estimado y realizado por separado. Si faltan datos recientes, marcar valoración desconocida, bloquear depósitos y no asumir rendimiento cero como dato medido.

Config propuesta: habilitación, modo, red fija devnet, mint esperado, destinos permitidos, topes absoluto/porcentual, reserva/horizonte, antigüedad máxima de datos y umbral de pérdida. Valores nuevos pendientes; no modifica config ni préstamos aceptados. Un cambio de destino con exposición abierta no debe ocultar la posición vieja ni impedir su retiro.

## Demo mínima y checks observables

El simulador es un modelo explícito, **sin llamadas de escritura a Kamino/Jupiter**. Puede acompañar la app devnet existente sin mover tokens ni inventar actividad en cadena. Mostrar “Devnet — simulated treasury adapter” y “No real Kamino/Jupiter deposits”; eventos simulados sin firma ni link falso a Explorer. Escenarios deterministas, sin una tasa positiva por defecto y sin convertir el reloj de demo en un APY comercial.

| Check futuro | Resultado que debe verse |
|---|---|
| Origen de fondos | Intentar depositar desde senior, junior de terceros o caja comprometida falla; no cambia ningún saldo del pool |
| Reserva y concurrencia | Depósito hasta el excedente permitido deja `R` intacto; excederlo o correr dos solicitudes simultáneas no consume dos veces la caja |
| Token/red/destino | Mint distinto, mercado ajeno, conexión no devnet o destino no permitido bloquean la preparación/ejecución; nunca hay fallback a mainnet |
| Ida y vuelta sin yield | Depósito y retiro simulados concilian capital y costos en unidades mínimas, sin ganancia inventada; retirar más de la posición falla |
| Contabilidad | Shares, caja propia y valor de posición no se suman dos veces; PnL de crédito y senior/junior permanecen separados |
| Demora o pérdida | Escenario de retiro parcial/ilíquido y pérdida del excedente muestra faltante externo, bloquea nuevas colocaciones y conserva la caja de vencimientos/liquidaciones/retiros |
| Estado incierto | Timeout no se registra como éxito; consulta/reintento idempotente no duplica depósito/retiro. La caja solo aumenta tras retiro confirmado |
| Pausa y salida | Deshabilitar depósitos permite consultar y retirar; cambiar config mantiene visible la exposición anterior. Reset de demo solo borra simulación identificada |
| Cambio de obligaciones | Una nueva obligación recalcula excedente; si no hay caja suficiente se bloquea el nuevo compromiso, sin depender de un rescate incierto |
| Rentabilidad autónoma | Escenario yield cero y escenario pérdida externa se presentan separados del margen crediticio; no se aprueba un crédito por rendimiento esperado |
| Presentación | Etiqueta simulada persistente en panel y resumen; README/video para jurados en inglés, indicando devnet y qué movimientos son simulados |

### Condiciones para evaluar un adaptador real devnet más adelante

Primero verificar solo con lecturas: cluster devnet real (incluida identidad de red), programa ejecutable y cuentas/dependencias existentes, propietarios correctos, mercado y reserva/bóveda para **la dirección exacta del mint devUSDC configurado**, decimales/programa de token admitidos, permisos y estado habilitado, liquidez suficiente y restricciones de rescate. Fijar versión de SDK/IDL y documentar direcciones y fecha/slot; el nombre “USDC”, un program ID compartido o `env=devnet` no pasan este check por sí solos.

Después preparar y simular sin firma/envío una ida y vuelta, revisar todas las instrucciones y destinos, y evaluar integración sin introducir conexiones a cadena fuera de `cuotas.ts`. Una simulación exitosa tampoco prueba una transacción confirmada. **Solo con aprobación explícita para cada transacción** se podrá probar depósito y retiro en devnet y comparar balances/recibos confirmados, con link Explorer que indique `cluster=devnet`. No se habilita envío automático por haber aprobado esta investigación.

Si faltan mercado, mint admitido, liquidez o permisos, conservar el simulador y dejar el adaptador real bloqueado con motivo visible. No reemplazar devUSDC por USDC real, no pasar a mainnet y no convertir un despliegue propio/fork local en evidencia de integración con el servicio público del proveedor.

## Pendientes y entrega

- Aprobar presupuesto de riesgo propio, reservas/horizonte, límites, permisos de operador y criterio de pérdidas; no se deducen del plan de negocio.
- Implementar y probar en pantalla el simulador y sus checks cuando el coordinador lo incluya en tareas; nada de esto está implementado por este reporte.
- Una integración real sigue condicionada a evidencia operativa devnet para el mint propio y autorización explícita de transacciones. No se contactaron proveedores ni se prometieron tasas.

Texto sugerido para una futura demo, si se implementa: **“Lazo runs on Solana devnet with a custom test token. Idle proprietary treasury allocation is simulated; no live Kamino or Jupiter deposits are made. Customer and third-party investor funds are excluded, and credit economics do not rely on external yield.”**
