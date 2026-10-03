# 01: Landing compacta, profesional y clara sobre los pagos

**What to build:** desde el primer viewport, una persona entiende la propuesta respaldada por un garante y el esquema anticipo hoy + tres cuotas del saldo; puede probar precio/producto/escalón, recorrer beneficios con menos vacíos y llegar a tienda/checkout en el mundo Prisma actual.

**Blocked by:** None (can start immediately). El gate de archivos compartidos sólo aplica si se necesita editarlos; no bloquea la landing y sus diccionarios propios.

**Status:** ready-for-agent

**Owner:** nuevo UI owner; boundaries exactos en worker-scopes. No WebGL ni cuotas.

- [ ] Se conserva vidrio grueso, fondo violeta, espectro Solana y Bricolage/Martian; desktop y móvil muestran una composición más compacta y vistosa frente a las capturas iniciales, sin grandes separaciones injustificadas.
- [ ] Copy ES/EN profesional: “Cuotas sin interés. Respaldadas por un garante.” / “Zero-interest installments. Backed by a guarantor.”; sin mamá/mom, familia como requisito, jerga de fixture ni claims nuevos.
- [ ] Anticipo > 0 muestra pago hoy + tres cuotas del saldo junto al beneficio/acción; anticipo = 0 muestra sin anticipo + tres cuotas. Se explica que anticipo es parte del precio y no depósito confiscable.
- [ ] Precio/producto/escalón siguen recalculando desde config existente; montos, total, tope y regla de redondeo se conservan. Un precio sobre el tope comunica aviso, sin fingir mora.
- [ ] Honestidad visible según mode/capacidad: mock no afirma programa, pagos o recibos reales; KYC y tarjeta pendientes no se presentan conectados. Devnet y comparativas “referencia” siguen declarados.
- [ ] CTAs llegan a destinos existentes previstos; el idioma se conserva. No se agregan funciones del panel ni invitación real.
- [ ] Slider, selección de escalones, CTAs y lectura son usables con teclado/foco visible; a 390 px, 1440 px, EN y 200% de zoom no hay texto recortado, etiquetas montadas o scroll horizontal.
- [ ] Movimiento de apoyo acotado a feedback/luz; versión reduced-motion quieta y legible. No nueva dependencia ni animaciones de aparición en todas las secciones.
- [ ] Se entrega evidencia desktop/mobile ES/EN, contraste/espaciado comparado y checks habituales de typecheck/lint/test/build; no tests unit que reflejen CSS.
