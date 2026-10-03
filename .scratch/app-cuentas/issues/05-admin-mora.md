# 05: Admin y mora con reloj demo

**What to build:** Seguir pool/keeper, controlar estado y registrar comercio con revisión, y recorrer mora usando reloj mock compartido.

**Blocked by:** 01, 02, 03, 04

**Status:** ready-for-agent

- [ ] Acciones admin verifican actor en frontera ejecutora; cambiar rol visual o dirección de URL no concede permisos reales.
- [ ] Config de escalones readonly; cambiar estado/registrar comercio con revisión y confirmación en mock o indisponible real.
- [ ] Reloj visible solo mock admin y cambios compartidos con checkout, estudiante, fiador, comercio/pool.
- [ ] Aviso/gracia/punitorio/primer recupero/baja/bloqueo según config, sin cobros duplicados; segundo recupero acelera saldo según regla de sesión A.
- [ ] Bitácora de keeper y hashes de recibo identificados como simulados; sin firmas inventadas.
- [ ] Pruebas por rutas públicas de autorización/mode gating y primer/segundo cobro con recarga; capturas mobile/desktop.
