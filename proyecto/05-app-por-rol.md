# 05 — Cuentas por rol de Lazo

Fecha: 2026-10-03. Estado: implementación en curso, gate de seis tickets/tracker local/rutas públicas aprobado. Sólo devnet (red de prueba, sin dinero real). No presentar el recorrido como real mientras programa/IDL, Didit y Mobbex no estén comprobados.

## Decisiones del handoff

- Estudiante entra con Wallet Standard (Phantom, Solflare, Backpack); Google queda para B3. Wallet es la billetera digital que controla la cuenta y aprueba operaciones.
- Fiador entra y vuelve por el mismo enlace, sin wallet. Mock: token aleatorio asociado al estudiante y metadata persistida. Real: necesita validación backend HMAC; por ahora falla explícitamente si integración falta.
- Lectura de comercio y pool pública, sin wallet. Cuenta admin por ProtocolConfig.admin, comercio por cuenta Merchant, estudiante por descarte de lecturas válidas. Errores no conceden permisos.
- Selector sólo mock; permite recorrer los cuatro roles y un estudiante en escalón3. No autoriza acciones reales.
- Cuentas nuevas /app/estudiante y /app/comercio conservan /panel y /comercio del header de sesión A.
- Topes, interés cero, comisión comercio y mora salen de config; exposición del saldo, cobertura para habilitar compra y máximo de fianza se muestran como conceptos distintos. No conversión a pesos sin cotización.
- Simulaciones de KYC, tarjeta de crédito, recibos y tiempo visibles. No firmas ficticias ni enlaces Explorer de mock. USDC de esta demo es devUSDC, un token de prueba sin valor.

## Reparto

Sesión A mantiene landing, diseño, tienda, checkout y todo estado financiero/mock/mora/persistencia. Sesión cuentas mantiene entrada, paneles, fiador, roles y extensión aditiva mínima. Cuotas es la única puerta a datos; getAccountCuotas agrega metadata y delega garantías a getCuotas, sin duplicar planes/pool/reloj.

Tickets 01–06 en .scratch/app-cuentas/issues. Run run_fa4df6a795be; workers Devin SWE-2 Max en Orca, owner por objetivo y coordinador único para git/config/dependencias. Estado/evidencia vigente en .scratch/app-cuentas/progress.md.

## Pendientes de verificación

- Recorrido checkout → cuota → mora → fiador/pool consistente y persistente, primer/segundo cargo, pagos cancelados/fallidos y autorización.
- Capturas desktop/mobile, tipos/lint/build y pruebas de rutas públicas en navegador.
- Conexión de Phantom sólo se declara comprobada si se observa una wallet real; tests automáticos no firman ni envían transacciones.
- Hooks admin del mismo mock A: setProtocolState y registerMerchantAccount. No éxito fingido mientras faltan.
- Máximo final de fianza: pregunta puntual Q1 para supervisor; nunca asumir que coverageMax determina el cargo completo.
- Integración con remoto actualizado y push normal main autorizados; deploy manual fuera del alcance.
