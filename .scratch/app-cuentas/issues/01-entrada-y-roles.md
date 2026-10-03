# 01: Entrada y ruteo por rol

**What to build:** Entrar por wallet o selector mock declarado, detectar el rol y llegar a su cuenta con red, dirección y saldo disponible.

**Blocked by:** None (base app incorporada; contrato de cuotas existente)

**Status:** ready-for-agent

- [ ] Reutiliza wallet e idioma existentes; admin configurado tiene prioridad, comercio registrado después, estudiante al final; errores de lectura no conceden rol.
- [ ] Selector solo en mock; roles de ejemplo persistidos, claramente simulados, sin autorizar operaciones reales.
- [ ] Muestra devnet/devUSDC, dirección y saldo o indisponibilidad honesta; crear reputación requiere revisión y confirmación.
- [ ] Layout y navegación móvil/desktop accesibles; estados de carga, error y sin conexión.
- [ ] Contratos faltantes admin/saldo/invitación tienen owner único y extensión aditiva separada, sin reescribir mock financiero.
- [ ] Prueba de entrada por rutas públicas; tipos y lint pasan.
