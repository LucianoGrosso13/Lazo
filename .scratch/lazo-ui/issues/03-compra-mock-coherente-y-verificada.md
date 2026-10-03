# 03: Recorrido de compra mock coherente, accesible y verificado

**What to build:** un visitante navega landing → tienda → checkout → confirmación y compra simulada en ES/EN, con anticipo claro, garante genérico, navbar de producto y avisos honestos; el mismo recorrido funciona en celular, con teclado y movimiento reducido.

**Blocked by:** 01: Landing compacta, profesional y clara sobre los pagos; 02: Prisma SVG con fisura refractiva contenida y refill suave; entregas existentes lazo-front 11: Tienda demo y 13: Confirmación y apertura del plan (incluye 12: desglose). Esto bloquea el cierre completo, no los ajustes de copy que checkout/tienda pueden anticipar en sus propias ramas.

**Status:** ready-for-agent

**Owner:** integrador A/B de la sesión original integra y verifica; checkout/tienda reciben follow-up sólo por su coordinador original. La nueva sesión UI no edita header/global/layout ni lanza otro coordinador de cierre o owner de cuotas.

- [ ] Diseño/Design desaparece del navbar desktop/móvil; ruta técnica conservada. Menú, switch ES/EN, wallet y badge siguen operables con foco visible y nombres accesibles.
- [ ] Metadata y copy común usan garante/guarantor y la bajada aprobada; no familia como requisito. No se pierde el montaje del reloj ni las fuentes al integrar layout/header.
- [ ] Tienda, desglose y confirmación muestran anticipo hoy + tres cuotas del saldo; sin anticipo son tres pagos. No modificar precios, porcentajes, config, quote, openPlan ni fixtures internos.
- [ ] Checkout mock no expone “Mamá/Mom”, nombre de fixture ni tarjeta 4242; presenta “Garante de la demo · simulado” / “Demo guarantor · simulated”. El role y la declaración de simulación permanecen visibles; no se enmascaran datos reales por una regla global.
- [ ] Confirmación mock muestra destino, monto, token y devnet, explicita que la operación es simulada y nunca pide firma real. Éxito/comprobante no ofrecen un hash falso como evidencia de transacción real.
- [ ] Un único E2E a nivel navegador cubre landing → tienda → checkout → confirmar → éxito mock y volver a estado plan activo; contexto limpio por caso y dirección pública de demo por la vía existente, sin tocar cuotas ni depender de Phantom.
- [ ] Matriz del mismo recorrido: 1440×900 / 390×844, ES / EN y normal / reduced-motion. Aserciones sobre copy, nav, idioma persistente/lang, anticipo/cuotas/total, modo simulado/devnet y comparativas de referencia.
- [ ] Teclado completa controles, navegación y confirmación; dialog gestiona foco si existe. AA, 200% zoom, ausencia de overflow/solapados, fallback sin WebGL y overlay del reloj se verifican en pantalla.
- [ ] Vitest existente de cálculo/mock/geometría, typecheck, lint y build pasan; evidencia visual y resultado E2E durables. No duplicar reglas de cálculo en unit de UI ni depender de capturas de un frame WebGL.
- [ ] No se entra a paneles/fiador/admin de app-cuentas para dar este ticket por completo; no deploy/push/merge sin el flujo del coordinador.
