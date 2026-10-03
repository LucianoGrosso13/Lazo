# Pago: revisión vigente y falla por comportamiento público

Owner02 al arrancar. No agregar seam unitario ni knobs internos al mock. La historia aprobada requiere cancelar/fallar pago sin cambiar deuda. Un caso público útil es dos pestañas del mismo navegador y estudiante: A abre revisión de cuota1; B paga cuota1; A intenta confirmar esa revisión antigua. La UI debe rechazar/actualizar revisión y no pagar silenciosamente cuota2 con un monto/destino ya distinto del aprobado. Observar deuda/historial/URL y recargar, sin importar private modules ni escribir ledger en storage.

Antes de confirmar, re-leer plan por getCuotas/getPlans y verificar estado, índice y monto de la cuota revisada; si cambió mostrar error y pedir nueva revisión. Real sin cliente transacción permanece bloqueado. Base payInstallment hoy elige próxima impaga por planId, por lo que no alcanza confiar en estado viejo del componente. Si se necesita garantía ejecutora adicional en interfaz, coordinar extensión mínima conA, nunca editar mock propio.

Secuencia TDD: un tracer de cancelar revisión; implementar mínimo; después confirmar pago; después escenario de revisión obsoleta como caso de falla pública. No batch antes del código. No test tautológico de estado privado.
