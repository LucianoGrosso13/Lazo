# Lazo: cuentas por rol

**Status:** ready-for-agent — aprobado por Luciano el 2026-10-03; tracker local y frontera de rutas públicas en navegador.

## Problem Statement

El estudiante, su fiador y el comercio necesitan seguir una compra financiada después del checkout. Hoy todavía no hay cuentas por rol: no pueden ver vencimientos, pagar una cuota, conocer la exposición de la fianza ni comprobar los cobros y recuperos. El administrador y los jurados necesitan recorrer la misma historia sin confundir una simulación con una operación real.

## Solution

Una entrada común identifica al estudiante, comercio o administrador por la wallet conectada. El fiador entra y vuelve por su enlace, sin wallet. Cada cuenta presenta primero lo que su usuario necesita hacer o entender. Los paneles públicos de comercio y pool permiten consultar sin conectar. Un modo demo explícito permite recorrer las cuatro cuentas y adelantar el reloj usando el mismo estado compartido de la compra. Toda la aplicación opera exclusivamente en devnet con devUSDC.

## User Stories

1. As an estudiante, I want entrar con una wallet compatible, so that pueda acceder a mis planes sin compartir claves.
2. As an usuario nuevo, I want una explicación breve de wallet y devnet, so that entienda cómo entrar y qué está probando.
3. As an estudiante, I want ver dirección, red y saldo de devUSDC, so that sepa si puedo pagar.
4. As an estudiante sin saldo, I want instrucciones para conseguir devUSDC de prueba, so that pueda completar la demo.
5. As an usuario conectado, I want que mi rol se detecte usando la configuración y mi cuenta de comercio, so that llegue al panel correcto.
6. As an usuario nuevo, I want crear mi reputación con revisión y aprobación explícita, so that pueda empezar mi historial.
7. As an presentador, I want cambiar entre cuentas de ejemplo solo en modo demo, so that pueda mostrar todos los roles rápidamente.
8. As an estudiante, I want ver primero la próxima cuota y su vencimiento, so that sepa qué tengo que pagar.
9. As an estudiante, I want distinguir al día, gracia, punitorio y cobro al fiador, so that entienda mi situación.
10. As an estudiante, I want revisar destino, monto, token, pagador de comisiones y red antes de aprobar el pago, so that pueda decidir con información.
11. As an estudiante, I want que cancelar o fallar el pago conserve la deuda, so that la pantalla no muestre un pago inexistente.
12. As an estudiante, I want que un pago confirmado actualice mi plan, saldo y movimientos, so that pueda comprobar el resultado.
13. As an estudiante, I want ver producto, precio, anticipo y cuotas, so that pueda entender mi plan activo.
14. As an estudiante, I want ver mi escalón, planes que cuentan y condiciones siguientes, so that entienda cómo mejora mi reputación.
15. As an estudiante, I want ver que la mora baja un escalón y bloquea compras nuevas, so that conozca sus consecuencias.
16. As an estudiante, I want invitar a mi fiador por WhatsApp o copiar un enlace, so that pueda sumar su respaldo.
17. As an estudiante, I want ver el fiador vinculado, tarjeta enmascarada y tope, so that conozca mi respaldo actual.
18. As an estudiante, I want ver mi historial y referencias comparativas declaradas, so that pueda entender el beneficio sin confundir estimaciones con cotizaciones.
19. As an fiador, I want entrar sin wallet por una invitación válida, so that no necesite aprender cripto para respaldar al estudiante.
20. As an fiador, I want saber a quién respaldo, cuánto puedo pagar como máximo y cuándo, so that pueda decidir si acepto.
21. As an fiador, I want elegir un tope de compras y ver las condiciones por escalón, so that pueda limitar mi exposición.
22. As an fiador, I want completar la verificación de identidad y conocer si está simulada, so that entienda el estado del alta.
23. As an fiador, I want leer y descargar la fianza antes de aceptarla, so that pueda conservar sus términos y hash.
24. As an fiador, I want cargar una tarjeta mediante el procesador sandbox o una simulación declarada, so that mis datos sensibles no queden en el repositorio ni en almacenamiento del navegador.
25. As an fiador, I want volver por el mismo enlace, so that pueda consultar el respaldo que acepté.
26. As an fiador, I want ver exposición actual, estado del estudiante y avisos, so that pueda anticipar un cargo.
27. As an fiador, I want ver cargos y comprobantes con hash, so that pueda auditar lo cobrado.
28. As an comercio, I want consultar mis cobros y saldo públicamente, so that pueda comprobar que cobré al instante.
29. As an comercio, I want ver comisión y alternativas señaladas como referencias, so that pueda entender el costo del servicio.
30. As an comercio, I want copiar un enlace de checkout integrable, so that pueda probarlo en mi tienda.
31. As an administrador, I want ver NAV, tramos, utilización, préstamos, moras y recuperos, so that pueda seguir el pool.
32. As an administrador, I want consultar eventos del keeper y hashes de comprobantes, so that pueda seguir la recuperación.
33. As an administrador, I want consultar escalones y cambiar el estado del protocolo con revisión previa, so that pueda controlar su operación.
34. As an administrador, I want registrar un comercio con revisión previa, so that pueda habilitarlo para cobrar.
35. As an presentador, I want adelantar días solo en el mock, so that pueda mostrar aviso, punitorio y recuperación en menos de un minuto.
36. As an inversor o jurado, I want consultar el pool sin login, so that pueda seguir préstamos, pagos y recuperos.
37. As an jurado, I want distinguir movimientos simulados de transacciones devnet reales, so that pueda evaluar la evidencia presentada.
38. As an usuario móvil, I want navegación, estados vacíos, errores y controles accesibles, so that pueda completar el recorrido desde el celular.

## Implementation Decisions

- Conservar la interfaz compartida de cuotas como única puerta a la cadena y al mock. Extensiones necesarias serán aditivas y se integrarán en commits separados.
- Reutilizar el diseño Prisma de Lazo y los proveedores de wallet e idioma que publique la sesión de landing; no crear otra aplicación ni reemplazar sus páginas.
- Prioridad de rol: administrador configurado, comercio registrado, estudiante. El selector demo no otorga permisos reales. Autorizar acciones en la frontera que las ejecuta, además de ocultar controles.
- Fiador por token: asociación explícita en mock; token firmado HMAC en backend para real, validado antes de mostrar información o aceptar cambios. No aceptar direcciones arbitrarias como credenciales.
- Solo un plan activo por estudiante. Los datos de ejemplo y el reloj comparten estado con checkout, paneles y pool, conservándolo durante la navegación y recarga del recorrido demo.
- Montos en unidades enteras del mint; distribuir el resto entre cuotas para conservar el total. No usar aritmética de punto flotante para saldos, comisiones ni exposición.
- Todas las condiciones salen de ProtocolConfig. Prevalecen las decisiones de precio más recientes: interés cero, comisión al comercio sobre financiado y cuotas fijas en USDC.
- Mora según la decisión vigente: gracia, aviso, punitorio, recuperación y segundo cobro con caducidad de plazos. Derivar tiempos y tasas de la configuración; no duplicarlos en componentes.
- La fianza deriva del tope elegido y de las reglas vigentes sin interés. No inventar la conversión a pesos ni una cobertura agregada ausente en la configuración; mostrar indisponibilidad y documentar cualquier decisión pendiente.
- Antes de una firma real mostrar revisión, simulación y confirmación explícita. Ninguna prueba automática firma ni envía transacciones. Si falta programa/cliente o integración, declarar la limitación y no simular éxito real.
- No inventar firmas ni enlaces Explorer para operaciones mock. Los comprobantes simulados se identifican y los vínculos reales apuntan expresamente a devnet.
- Didit y Mobbex se simulan explícitamente mientras no estén conectados; ninguna pantalla afirma KYC real o un cobro real. No pedir credenciales ni almacenar tarjetas completas.
- Google, depósitos del pool, pagos en pesos e integraciones comerciales oficiales quedan en roadmap.

## Testing Decisions

- Frontera propuesta: comportamiento del recorrido por rutas públicas en navegador usando modo demo. Observar lo que ve y hace cada usuario; no acoplarse a componentes privados.
- Cubrir entrada y rol, cancelación/pago de cuota, invitación y alta del fiador, exposición, comercio, avance del reloj, recupero y pool. Verificar que los cuatro roles reflejan la misma compra y que mock no crea evidencia onchain falsa.
- Cubrir enlaces inválidos y acciones no autorizadas mediante las interfaces públicas de aplicación.
- La base incorporada del 2026-10-03 incluye Vitest, lint y typecheck; todavía no incluye archivos de pruebas ni herramienta de recorrido en navegador. Reutilizar lo que aporte la sesión A y acordar la frontera de navegador antes de añadir pruebas. El gate sigue pendiente.
- Comprobar tipos y archivos de prueba afectados regularmente; suite completa una vez al integrar, además de lint, build y revisión visual móvil/escritorio con capturas.
- Conexión real de wallet se comprueba sin solicitar claves ni aprobar transacciones por el usuario. Registrar lo que no pudo comprobarse por falta de wallet o programa.

## Out of Scope

Landing, catálogo, checkout, tokens de diseño, programa Anchor y keeper real (propiedad de otras sesiones); deploy manual, mainnet, dinero real, varias compras simultáneas por estudiante, firma digital certificada, Google, tramo sin fiador en UI, depósitos senior, conversión a pesos sin fuente, integraciones Tiendanube/WooCommerce oficiales y promesas de rendimiento garantizado.

## Further Notes

Fuente: handoff del 2026-10-03 y memoria del equipo. La base app de front-esqueleto fue incorporada por fast-forward a 4234262; incluye contratos y proveedores, pero la mayoría de las operaciones del mock aún son pendientes. Su disponibilidad no aprueba este spec ni habilita lanzar trabajo dependiente de contratos ausentes. Las comparaciones de terceros son referencias del equipo sin nueva verificación; no presentarlas como tasas vigentes. Luciano autorizó integrar y subir el resultado a main al terminar, preservando el trabajo de las otras sesiones, sin force push. La entrega a jurados se escribe en inglés y declara devnet y simulaciones.
