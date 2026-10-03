# Checkpoint de cierre solicitado

2026-10-03. El usuario pidió subir todo a main antes de agotar la cuota y cerrar ahora. Se guarda el avance actual; **el MVP de cuentas no está completo**.

## Guardado

- Entrada y selector por rol, contrato aditivo de cuentas, invitaciones y límites honestos del mock.
- Lecturas públicas de comercio y pool, cuenta del comercio, fiador y admin con reloj de demo.
- Integración de los commits publicados de landing, tienda, diseño, checkout y mock financiero.
- Plan, tickets, pruebas de navegador existentes y evidencia disponible.

## Pendientes funcionales

- Ticket02: panel del estudiante y pago desde su cuenta. La ruta `/app/estudiante` todavía no está implementada; `/panel` redirige allí.
- Q1: fórmula del máximo contractual de la fianza. El alta permanece bloqueada; no se inventó el techo.
- Hooks admin del mismo mock financiero y consumo de la identidad compartida por checkout; pendientes de integración con el owner original.
- Verificación integrada de compra, saldo, pago, mora, fiador, comercio y pool; reviews Standards/Spec y capturas finales.
- Phantom real, programa/IDL, Didit, Mobbex y tokens HMAC backend no comprobados. Invitaciones mock sólo funcionan en el navegador que las crea.

## Comprobación de este corte

`npm run typecheck` pasó con Node24 antes del snapshot. Las corridas parciales anteriores no equivalen a aceptación de todo el recorrido. El build y el deployment se registran al completar el cierre técnico.

Sólo devnet y mock declarado. No se firmaron ni enviaron transacciones, ni se cargaron tarjetas reales.
