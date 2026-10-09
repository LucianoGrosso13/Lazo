# Handoff — ticket 03: verificación y pasada real pendiente

Fecha: 2026-10-09. Rama `t3-verificar-recorrido`, base `main` en `5dfb706`.

## Dónde está el trabajo

Checkout aislado: `/var/tmp/lazo-ticket03`. La carpeta original está siendo usada por otra sesión en `t3-quienes-somos`; no cambiarle la rama ni tocar sus cambios. El servidor de esta tarea está en `http://127.0.0.1:3015`, con build de producción y fondos simulados. El servidor 3014 es de la otra sesión.

Commit inicial de correcciones: `e93111c`. Ver commits siguientes en la rama para el ajuste final de importes, fixture y evidencia. La rama tiene un PR borrador; consultar `gh pr view t3-verificar-recorrido`. No se mergeó a main.

## Resuelto

- Errores de refs durante render y warnings de lint; aserción vieja del calendario; configuración Vitest ESM.
- Recuperación de cuota incierta: abre la revisión tras recarga y conserva el índice/importe original sin reenviar. El CTA de la siguiente cuota conserva su propio importe.
- Resultados tardíos de una operación anterior no borran una operación nueva.
- Foco para teclado y fallo de hidratación con movimiento reducido.
- Ensayo en inglés en escritorio/móvil: compra, pago anticipado, importes exactos, fechas normales, recarga y capturas revisadas visualmente.
- Guía de grabación en inglés, evidencia separada entre simulación y cadena y runbook de upgrade actualizado al artefacto nuevo.

Resultado final: tipos, lint y build limpios; 380 tests de app; 56 e2e pasaron y 1 omitido esperado por ser de modo real; 36 tests Rust y 142 LiteSVM. Resultados completos: `docs/demo-happy-path-verification.md`. Node requerido: `/Users/lucianogrosso/.nvm/versions/node/v24.13.0/bin`; el Node por defecto en la carpeta app era 20.18. No usar ese Node para estas pruebas.

## Falta para cerrar el ticket

La pasada real con Phantom sigue pendiente. Las lecturas públicas muestran programa viejo, cero cuentas del protocolo y supply devUSDC cero. El programa nuevo se compiló y probó localmente; no se desplegó. No se firmó ni envió ninguna transacción durante este trabajo.

Se preparó y simuló el cierre exclusivo del buffer sobrante `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW`, con devolución de 2,38758476 SOL de devnet a `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf`. Propuesta pública local: `/tmp/lazo-ticket03-close-buffer-proposal.json`. No enviarla con el blockhash viejo: regenerar, verificar red/autoridad/destino y simular de nuevo después de recibir aprobación explícita. La pregunta de aprobación fue enviada; no hay aprobación registrada todavía.

`CUOTAS_KEYS` no estaba configurado. Falta dirección pública del estudiante y entorno autorizado de firma (claves siempre fuera de repo/chat). El faltante estimado para upgrade, después de recuperar el buffer, es 1,79904168 SOL de prueba antes de comisiones; refrescar balances/rent antes de ejecutar. Los importes y el hash nuevo están en `docs/demo-happy-path-readiness.md` y `programa/UPGRADE_DEVNET.md`.

Luego preparar protocolo con días normales (`seconds_per_day=86400`), comercio, liquidez, estudiante y fianza activa, con aprobación por cada transacción. Finalmente observar compra y primera cuota con aprobaciones separadas en Phantom y completar los comprobantes públicos y estados reales en `docs/demo-happy-path-runbook.md`. No marcar done antes de eso. No producir de nuevo el video ni tocar `video-pitch/`.
