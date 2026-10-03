# Spec: refinamiento de UI de Lazo — Prisma, claridad y recorrido de compra

**Status:** ready-for-agent · Fecha: 2026-10-03.
**Tracker:** local existente `.scratch`; no setup, issues externos ni nuevos workers en esta planificación.
**Autorización:** el coordinador informó que el usuario autorizó to-spec → to-tickets → implementación dentro de este alcance; la consulta de desglose/frontera es refinamiento opcional, no un bloqueo nuevo.

Fuentes: `AGENTS.md`, `PRODUCT.md`, `/tmp/lazo-handoff.md`, `proyecto/03-mvp.md`, `proyecto/04-plan.md`, `proyecto/handoff-desarrollo-front.md`, decisiones de precio de `proyecto/02-validacion.md`, spec/tickets de `.scratch/lazo-front`, contrato Prisma y referencias impeccable animate/polish. Se inspeccionaron landing, header, metadata, diccionarios, PrismStage, Prism WebGL/fallback y checkout actuales; capturas incumbentes desktop/mobile proporcionadas por el coordinador. El handoff reciente y el código prevalecen para describir el estado actual: el plan antiguo todavía figura sin tildar y el cliente real sigue pendiente del programa/IDL.

## Problem Statement

Quien visita Lazo necesita entender rápidamente cuánto paga hoy, qué saldo paga después y quién respalda la compra. La página actual dedica demasiado espacio a separaciones, usa lenguaje familiar informal y muestras técnicas visibles, y puede sugerir que tres cuotas incluyen el anticipo. También presenta como operaciones reales partes que hoy están simuladas. El usuario quiere una UI más vistosa y fluida dentro del mundo Prisma, con una fisura refractiva contenida en lugar de una rotura agresiva.

## Solution

Una landing Prisma más compacta, legible y expresiva: vidrio grueso, luz espectral, números claros y un único momento de animación protagonista. Copy profesional ES/EN con “garante”, bajada “Cuotas sin interés. Respaldadas por un garante.” y equivalente inglés “Zero-interest installments. Backed by a guarantor.” La compra se describe como anticipo hoy más tres cuotas del saldo cuando corresponde. La tienda y el checkout conservan su lógica y acompañan esa claridad, sin exponer nombres de fixtures ni presentar la simulación como dinero o comprobantes reales. El navbar deja de ofrecer Diseño; la página de diseño puede seguir disponible por su URL técnica.

## User Stories

1. Como visitante, quiero entender que Lazo ofrece cuotas sin interés respaldadas por un garante, para evaluar la propuesta sin asumir que necesariamente sea un familiar.
2. Como estudiante, quiero saber que el garante sólo paga si yo no pago, para entender su responsabilidad.
3. Como estudiante, quiero distinguir el anticipo pagado hoy de las tres cuotas posteriores, para entender el número real de pagos.
4. Como estudiante, quiero leer que el anticipo es parte del precio y no un depósito que se pierde, para decidir con información correcta.
5. Como estudiante, quiero ver “sin anticipo” cuando corresponde, para reconocer que en ese caso hay sólo tres pagos.
6. Como visitante, quiero ver el total junto al desglose, para entender que anticipo más saldo financiado completan el precio.
7. Como visitante, quiero cambiar producto, precio y escalón y ver cómo cambia la luz, para entender la financiación de forma visual.
8. Como visitante, quiero entender un precio que supera el tope con un aviso legible, para no confundirlo con mora o deuda impaga.
9. Como visitante, quiero una composición más compacta con jerarquía clara, para recorrer los beneficios sin grandes vacíos entre bloques.
10. Como visitante en celular, quiero controles y texto cómodos sin desbordes ni etiquetas solapadas, para usar la demo con una mano.
11. Como usuario de teclado, quiero operar slider, escalones, menú y CTAs con foco visible, para completar el recorrido sin mouse.
12. Como jurado, quiero cambiar a inglés y conservarlo durante la navegación, para evaluar la demo completa.
13. Como visitante, quiero textos profesionales en ambas lenguas, para entender el producto sin “mamá/mom”, nombres de fixture o jerga interna.
14. Como visitante, quiero una navegación de producto sin el link Diseño, para encontrar tienda y compra con claridad.
15. Como visitante, quiero que el menú móvil cierre al navegar y que sus controles tengan nombre accesible, para orientarme.
16. Como visitante, quiero distinguir demo simulada, red devnet y capacidades pendientes, para saber qué estoy probando.
17. Como jurado, quiero que el comprobante mock figure como simulado y no como transacción onchain real, para evaluar con honestidad.
18. Como visitante, quiero ver el rol del garante con etiquetas genéricas en la demo, para no ver datos técnicos o personales de ejemplo como si fueran míos.
19. Como visitante, quiero que las cifras comparativas sigan etiquetadas como referencia, para no confundirlas con cotizaciones actuales verificadas.
20. Como visitante, quiero percibir una fisura de luz localizada y una recuperación suave, para comprender el estado sin una rotura visual agresiva.
21. Como usuario con movimiento reducido, quiero todos los montos, avisos y estados legibles con un prisma quieto, para comprender lo mismo sin movimiento espacial.
22. Como usuario sin WebGL, quiero una representación estática completa, para no perder el desglose.
23. Como visitante, quiero que cambios rápidos de controles no salten ni acumulen animaciones, para mantener continuidad.
24. Como estudiante, quiero ir de landing a tienda y checkout y confirmar una compra mock, para comprobar la propuesta sin dinero real ni firma real.
25. Como equipo, quiero que la mejora visual conserve config, cálculos y contrato de cuotas, para integrarla sin romper los paneles de la otra sesión.

## Implementation Decisions

- Refinamiento del mundo Prisma existente; conservar Bricolage Grotesque, Martian Mono, vidrio con canto y fondo casi negro violeta. No nueva identidad, tipografía ni grilla genérica de cards.
- Reducir padding y gaps locales con una escala coherente; objetivos iniciales: márgenes laterales desktop 24–40 px y móvil 16–20 px, separación vertical principal 40–64 px desktop y 28–40 px móvil, ajustables por legibilidad. Acercar particularmente encabezado/escalera y bloques de la regla de mora, que hoy dejan grandes vacíos. Conservar blancos entre grupos distintos y targets táctiles de al menos 44 px.
- Copy público: “garante” en ES y “guarantor” en EN; no requerir vínculo familiar en los textos. Mantener “fiador”, tipos, claves de diccionario e identificadores internos si ya forman parte del dominio. Es un ajuste editorial, no una ampliación de elegibilidad ni un nuevo onboarding.
- El anticipo es pago parcial del precio hoy; el saldo se financia en tres cuotas. Cuando el anticipo es positivo, mostrar “Anticipo hoy + 3 cuotas sin interés” / “Down payment today + 3 interest-free installments” cerca del beneficio y la acción. Con anticipo cero mostrar “Sin anticipo: 3 cuotas” / “No down payment: 3 installments”. No cambiar la economía para cumplir el titular.
- Ejemplo de negocio sólo como validación: compra de 1.000 en escalón 0 → anticipo 300, financiado 700, cuotas que absorben el redondeo, total 1.000 y comercio 951. Los importes renderizados proceden de config/cotización, no de estos ejemplos hardcodeados.
- La landing lee config y mode por el cliente existente. El checkout mantiene quote/openPlan. No cambiar el contrato, schema, persistencia, fixtures, topes, tasas, comisiones, cantidad de cuotas ni reglas de mora.
- Eliminar nombres de fixture y muestra de tarjeta del recorrido público mock en presentación: “Garante de la demo · simulado” / “Demo guarantor · simulated”. No borrar los fixtures internos ni modificar sus tests. La declaración de simulación sigue visible: quitar fixture no significa esconder que es una demo.
- Titulares, bajadas, metadata y secciones usan el mismo vocabulario. Mantener los números comparativos actuales como “referencia” sin inventar pruebas, clientes ni nuevos claims financieros.
- Honestidad por estado efectivo: en mock, compra, plan, reputación, pagos y recuperos son simulados; Didit/Mobbex están pendientes, no afirmar sandbox conectado. Devnet es la red de prueba de Solana con dinero sin valor real; devUSDC es el token de prueba. El flag real por sí solo no prueba que exista integración: si sigue incompleta, mostrar pendiente/error accionable, sin afirmar programa desplegado ni comprobante real.
- Quitar Diseño/Design del navbar desktop y móvil sin eliminar la ruta técnica. No agregar destinos inexistentes ni construir los paneles de otra sesión. Mantener el resto de navegación salvo ajuste puntual que autorice el supervisor.
- Tesis de movimiento: la luz se mueve, el vidrio permanece estable. Foco en refracción al cambiar precio/escalón (400–700 ms con desaceleración), feedback de controles 100–150 ms y estados rutinarios 150–300 ms. Sin rebotes, fragmentos, sacudidas, destellos repetidos ni reveals encadenados de todas las secciones.
- Fisura refractiva localizada dentro del prisma/banda afectada, con canto luminoso sutil y desviación de luz; nada invade texto, controles o otras bandas. El refill vuelve a iluminar desde atrás y recompone el haz suavemente. Cambios rápidos parten del estado visual actual, sin colas ni flashes. Mora/recupero se muestran sólo por estado existente o demostración visual explícitamente identificada, nunca como pago ocurrido por mover un slider.
- Superar el tope es una advertencia de cotización, no mora: conservar el aviso y usar presión/refracción contenida sin fingir una cuota impaga. La implementación de esta mejora usa PrismStage SVG incumbente; preservar sus props públicas porque checkout lo consume. No migrar landing a WebGL ni editar el renderer del owner design.
- Reduced-motion ofrece estado quieto completo, con texto/trama que distingue estados además del color. Detener loops fuera de pantalla y en pestaña oculta, contener blur/filtros al objeto SVG y evitar dependencias nuevas para efectos realizables con el stack actual.
- No edición concurrente de archivos compartidos: el nuevo UI owner hace 01 y 02 secuencialmente en su worktree porque comparten CSS/PrismStage; header/globals/layout y cierre quedan en el integrador original A/B, sin nuevos edits de esta sesión en esos archivos. Ownership exacto vive en el documento de scopes, no en estos tickets.

## Testing Decisions

- **Frontera propuesta en consulta opcional:** un único recorrido de navegador landing → tienda → checkout → confirmación y éxito mock. Es la frontera más alta: verificar lo que ve y hace una persona, sin mocks internos de componentes ni duplicar cálculos en tests de UI. El alcance ya está autorizado; avanzar con esta frontera salvo corrección del usuario.
- Reutilizar mode mock y dirección pública de demo existentes; contexto de navegador limpio por caso para aislar idioma, localStorage y planes previos. No Phantom, seed phrase, firma ni transacción reales. La forma de inyectar la dirección entre rutas se resuelve en la integración de checkout/tienda con el coordinador, sin modificar cuotas.
- Matriz del mismo recorrido: 1440×900 y 390×844, ES/EN y movimiento normal/reducido. El recorrido completo incluye CTA a tienda, selección de producto, checkout, desglose, confirmación informada, comprobante simulado y retorno que reconoce el plan activo; no requiere navegar al panel de otra sesión.
- Aserciones públicas: bajada aprobada, ausencia de mamá/mom y nombres/card fixture, Diseño ausente de ambos menús, idioma persistente y atributo lang coherente, anticipo separado de tres cuotas, caso sin anticipo, montos/totales, etiquetas de simulación/devnet y comparaciones de referencia. No afirmar igualdad exacta de micros a partir de importes redondeados a centavos: el cálculo exacto queda cubierto por unit existentes.
- Operar teclado: slider, chips/escalones, toggle idioma, menú móvil, tienda, confirmación y vuelta; comprobar nombres accesibles, foco visible, orden lógico y foco de dialog si aplica. Corregir semántica de radio/teclado en su owner. Revisar contraste AA, lectura a 200% y que controles/etiquetas no queden tapados por reloj o efecto.
- En reduced-motion y sin WebGL, verificar montos, estados y acciones completos. No automatizar la belleza del shader ni detectar fluidez con sleeps arbitrarios: revisar en pantalla secuencia, interrupciones y fallback, sin snapshots frágiles de un frame animado.
- Evidencia visual antes/después a desktop y móvil en ES/EN; contrastar compactación y legibilidad con capturas incumbentes. Medir fluidez en el navegador usado y anotar el dispositivo; objetivo ~60 fps en laptop, sin prometer rendimiento en hardware no probado. Una inspección batched y una confirmación después de correcciones, sin pulido abierto.
- Prior art: Vitest existente cubre quote, apertura, pagos, mora y persistencia; también hay tests de split de compra y geometría del prisma. Conservarlos; no escribir unit tests que reproduzcan CSS/copy o recalculen reglas. El E2E ya era compromiso del cierre anterior; hoy no hay runner Playwright en package, su setup mínimo pertenece al cierre/integración, no a cuotas.
- En implementación: typecheck, lint, suite Vitest y build habituales, seguidos de verificación de pantalla. Esta entrega de planificación no ejecuta tests del producto ni afirma que la UI mejorada exista.

## Out of Scope

Paneles estudiante/comercio/pool, fiador/admin y tour de la sesión app-cuentas; programa/IDL/Codama, keeper, integración Didit/Mobbex; cambiar reglas de financiación, config o cuotas; ampliar a personas/garantes distintos por lógica; mainnet y dinero real; deploy, push, merge, commits o lanzar workers desde esta planificación. No rehacer el sistema de diseño ni cambiar archivos de otro owner por conveniencia.

## Further Notes

- Tres verticales propuestas: **01 Landing compacta y clara** (sin blockers), **02 Prisma SVG con fisura/refill contenido** (después de 01 por ownership compartido), **03 Compra mock coherente y verificada** (bloqueada por 01/02 y entrega existente tienda/confirmación). Header/global/layout quedan en el integrador existente; no bloquean el inicio de 01.
- El supervisor ya presentó seam y desglose al usuario; los tickets quedan publicados localmente como ready-for-agent por autorización expresa informada. Puede asignar UI-01 y UI-02 al mismo owner SVG en secuencia, y entregar UI-03 al integrador A/B existente, incorporando ajustes de la consulta si llegan. Esta tarea termina en documentos y no hace dispatch.
- La ausencia del programa/IDL bloquea el cliente real existente, pero no estas mejoras mock. Integrar reloj sólo es gate cuando se toca el layout compartido o se verifica su overlay; no obliga a serializar la landing o el prisma.
- Gramática aprobada por steering: **“Respaldadas por un garante”**. No recuperar la bajada anterior “familia” de PRODUCT o metadata por accidente.

- Steering final del coordinador: la sesión original sigue siendo autoridad de workers front-08/11/13/14 y merges; esta sesión owns únicamente refinamiento landing/SVG en worktree lazo-ui. WebGL no es requisito ni blocker; no intervenir en workers originales, main o deploy.
