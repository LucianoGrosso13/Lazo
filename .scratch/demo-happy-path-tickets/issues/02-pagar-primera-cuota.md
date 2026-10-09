# 02: Pagar la primera cuota y actualizar el plan

**What to build:** desde el plan recién comprado, el estudiante elige «Pagar primera cuota», revisa y aprueba un pago independiente en Phantom antes del vencimiento. Tras la confirmación ve «Cuota 1 pagada · Quedan 2», saldo actualizado, calendario y comprobante; el resultado se conserva al recargar.

**Blocked by:** 01 — Compra confirmada en devnet, calendario y explicación del atraso.

**Status:** ready-for-agent

- [ ] La primera cuota impaga ofrece un botón funcional desde el plan accesible tras comprar. No se exige esperar al vencimiento: se permite el pago anticipado ya admitido por el cliente y el programa.
- [ ] La revisión muestra importe exacto, token, destino y red; Phantom solicita una aprobación nueva. La autorización del anticipo nunca autoriza automáticamente la cuota.
- [ ] La UI invoca el pago a través de la API única de cuotas y reutiliza el progreso observable implementado en 01: aprobación, envío/procesamiento y confirmación con lectura posterior del plan.
- [ ] El mínimo visual de aproximadamente dos segundos se aplica al procesamiento exitoso sin sustituir la confirmación; cancelación y error no muestran pago ni esperan artificialmente.
- [ ] Tras pagar 233,333333 devUSDC del caso base, la primera cuota figura pagada, quedan dos pendientes y el saldo exacto es 466,666667, presentado como 466,67 si se abrevia. Se actualiza el saldo de la wallet consultando datos reales.
- [ ] El pago anticipado no desplaza las fechas de la segunda y tercera cuota. No inicia otro pago ni cobra automáticamente la siguiente cuota al terminar el primero.
- [ ] La transacción del repago tiene su propio comprobante real de devnet. La recarga y el regreso al plan mantienen la cuota pagada y los importes restantes leyendo la cadena.
- [ ] Un rechazo, saldo insuficiente o error verificable conserva la deuda previa y ofrece una explicación accionable. Doble clic no duplica el envío; timeout o lectura fallida tras confirmación recupera el resultado sin pagar a ciegas una cuota distinta.
- [ ] Cambiar o desconectar wallet durante la operación no aplica un resultado al estudiante equivocado. Las acciones corresponden al plan y la identidad que originaron el pago.
- [ ] Acción, revisión, progreso y resultado funcionan en español e inglés, móvil/escritorio, teclado y movimiento reducido, usando el sistema visual existente.
- [ ] Las pruebas observan el recorrido de compra seguido de pago anticipado, importes, fechas, estados, comprobantes y persistencia. Se reutilizan navegador, API de cuotas y transporte controlado existentes para rechazo, doble clic, confirmación lenta y resultado incierto.
- [ ] El pago anticipado se observa con Phantom en devnet con aprobación explícita, evidencia de la transacción y del plan actualizado. Las pruebas con RPC o datos simulados se registran como evidencia distinta.

**Parent:** especificación «Demo: compra real y pago de la primera cuota en devnet» del tracker local, publicada el 2026-10-09.

**Scope boundary:** un pago puntual de primera cuota, sin ejecución de mora ni cargo al fiador; respetar otras modalidades existentes sin extender el caso de grabación a seis cuotas o nuevos planes paralelos.
