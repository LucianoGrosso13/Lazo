# 03: Verificar el recorrido completo y dejarlo listo para grabar

**What to build:** dejar una pasada completa y reproducible del recorrido acordado: conectar Phantom, comprar la PC, mostrar cuotas con fechas normales, pagar anticipadamente la primera y terminar con dos pendientes. El equipo cuenta con evidencia de movimientos reales y una guía breve en inglés para repetir la toma.

**Blocked by:** preparación real de devnet y pasada con Phantom. Los tickets 01 y 02 están mergeados en `main` (PR #6).

**Status:** blocked-real-run

- [x] Las comprobaciones apropiadas de tipos, lint, pruebas y compilación pasan para los cambios implementados. Se corrigen regresiones del recorrido sin ampliar esta tarea a un rediseño o nuevas funcionalidades.
- [x] Se verifica visualmente todo el flujo en móvil y escritorio, con copys ingleses de la toma, y se comprueba que aprobación, procesamiento, resumen y CTA son comprensibles con teclado y movimiento reducido.
- [ ] Una pasada real con Phantom en devnet evidencia anticipo de 300, apertura del plan con 700 pendientes, pago anticipado de 233,333333 y resultado de 466,666667 con dos cuotas pendientes. Los importes salen de datos reales; se registran red, fecha y comprobantes públicos de las dos transacciones.
- [ ] Se verifica que las fechas permanecen normales, que las cuotas posteriores no se desplazan y que una recarga conserva el resultado. El saldo de la wallet refleja los movimientos en devUSDC; SOL se identifica como saldo para costos.
- [x] Evidencia y guía distinguen lo observado en cadena de pruebas automatizadas con respuestas controladas. Se declara cualquier bloqueo real; el ticket no queda done mientras no se haya completado la pasada real.
- [x] Se comprueban rechazos y recuperación de resultados inciertos con pruebas controladas, sin generar por ese motivo transacciones adicionales en devnet ni cobros duplicados.
- [x] Se deja una guía breve en inglés con preparación previa, pasos de la toma, resultados esperados y enlaces públicos de verificación. No se incluyen frases semilla, claves privadas ni credenciales.
- [x] Se documenta cómo repetir la toma: otra wallet elegible preparada o plan previo saldado/cerrado mediante operaciones autorizadas. Borrar datos del navegador nunca se presenta como borrado de deuda onchain; no es necesario crear un nuevo botón de reset.
- [x] Toda operación real de preparación o ensayo que firme o envíe una transacción cuenta con aprobación explícita por transacción. Solo devnet y tokens de prueba sin valor.
- [x] La explicación del atraso respeta la política vigente y no implica que en esta toma se cobró al fiador o se corrigió la discrepancia de punitorios del recupero.

**Parent:** especificación «Demo: compra real y pago de la primera cuota en devnet» del tracker local, publicada el 2026-10-09.

**Scope boundary:** verificación y guía de grabación, sin producción del video final, publicación del sitio ni ejecución del circuito de mora.

## Verification update — 2026-10-09

Local code corrections, browser rehearsal and recording instructions are complete on `t3-verificar-recorrido`; see [verification evidence](../../../docs/demo-happy-path-verification.md) and the [English runbook](../../../docs/demo-happy-path-runbook.md). Desktop/mobile screenshots were visually inspected. Automated wallet rejection and uncertain-result tests use controlled responses. No preparation or payment transaction was signed or sent; the approval requirement remains mandatory for the pending real work.

The exact amounts and unchanged dates are verified in the mock rehearsal, including a full reload. Their real-chain acceptance box stays open. Public receipt links remain pending; the runbook is complete as a rehearsal guide, not as evidence of an observed real run.

Read-only RPC checks found the old deployed artifact, no protocol accounts and zero devUSDC supply. The current artifact was rebuilt and passed 36 Rust unit tests and 142 LiteSVM tests. The first buffer-close proposal was simulated without signing/sending. The authorized signer environment, student public address, individually approved preparation transactions and real Phantom purchase/payment are still required. Ticket 03 is not done.
