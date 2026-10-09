# Spec: rediseño de UI — más visual, cada rol ve lo suyo, pool con orbe

**Status:** ready-for-agent · Fecha: 2026-10-09 · Rama de integración: `t4-rediseno-ui` (sale de `main` + `t3-quienes-somos` + `t3-verificar-recorrido`)

Fuentes: entrevista con Luciano del 2026-10-09 (Q1–Q24, resumidas en "Decisiones"), `CLAUDE.md`, `proyecto/06-decisiones-comerciales.md`, `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`. Antecedente de formato: `.scratch/web-completa/spec.md`.

**Plazo:** se termina **hoy (9/10)**. Mañana a la mañana es la demo en vivo; la entrega cierra el domingo. El video del pitch ya está grabado y no se rehace.

## Problem Statement

La web funciona pero se siente apagada: casi todo es texto blanco sobre negro, en bloques iguales que se repiten al bajar. El jurado, que mañana va a abrir el link, no tiene nada que le llame la atención. Lo que más vende (el respaldo del fiador, la línea de mora, lo barato que sale frente a la competencia, el rendimiento del pool, el Tier que crece) está escrito pero no se ve. Además hay fugas de información entre roles: el comprador ve en el checkout cuánto cobra el comercio ("Voltia cobra US$ 427,95 hoy, sin esperar"), un dato que no le importa y que lo confunde. Y todas las cuentas tienen rótulos de "Datos simulados" o "Mock" que ensucian la pantalla y no aportan.

## Solution

1. **Color y movimiento con la identidad actual.** Se mantiene el fondo oscuro, el prisma, Bricolage y Martian Mono. Se suma un **color de acento por rol** (comprador, comercio, pool), propuesto desde la paleta de Lazo y aprobado en `/design`, más animaciones que *significan* algo.
2. **Cada usuario ve lo que le corresponde.** El comprador y el garante no ven montos ni plazos de cobro del comercio. Se audita cada vista por rol.
3. **"Compradores y garantes".** En el texto visible en español, "estudiante" pasa a "comprador" y "fiador" a "garante". Rutas y código no cambian.
4. **Landing:** los 3 pasos del garante se animan al entrar y se destacan en hover o toque. La línea "Qué pasa si una cuota no se paga" avanza sola. "Los números de Lazo" y "Comparación de costo total" pasan a ser visuales, con barras y porcentajes grandes.
5. **Pool:** un **orbe 3D abstracto tipo Siri** en WebGL con los colores de Lazo, que representa al pool (disponible vs prestado), con el rendimiento anual flotando arriba. La utilización pasa a ser un medidor, los movimientos un historial plegable y los rendimientos de referencia barras.
6. **Comercio:** "Cobrado" arriba y más estético, junto con lo **garantizado por cobrar** (tramos con fecha). Abajo va la venta en mostrador y después las ventas en cuotas como historial plegable.
7. **Comprador:** una tarjeta de Tier tipo credencial con progreso al próximo Tier y beneficios. Los accesos "Ver planes" y "Ver comercios" pasan a ser tarjetas vivas.
8. **Admin:** un dashboard arriba con 4 KPIs, planes por estado y "requiere atención".
9. **Páginas "Cómo funciona"** (compradores y garantes, comercios, inversores): un set común de bloques visuales que alternan ritmo, cada página con su acento.

## Decisiones (tomadas por Luciano, 2026-10-09 — no se renegocian sin preguntarle)

1. **Dirección visual (Q3):** se mantiene la identidad actual y se suma color de acento por rol, movimiento e ilustración. No se cambia a un tema claro.
2. **Paleta por rol (Q22):** la propone el ticket 01 desde los tokens existentes (violet `#9945ff`, cyan `#00c2ff`, green `#19fb9b`, backlight `#c4a3ff`) y Luciano la aprueba en `/design` antes de que se aplique en el resto. Propuesta inicial: comprador = violeta, comercio = cyan, pool/inversor = verde.
3. **3 pasos del garante (Q4):** aparecen en secuencia al entrar en pantalla y en hover o toque se eleva y se ilumina el paso y se dibuja la línea que los une. El texto se lee siempre (nada se esconde detrás de un flip).
4. **Línea de mora automática (Q5):** arranca al entrar en pantalla y avanza un hito cada ~2,5 s (Día 0 → vencimiento → gracia → aviso → recargo → cobro al garante), con una barra de progreso. Corre en loop, se pausa cuando el usuario toca o pasa el mouse por un hito y queda quieta (todos los hitos visibles) con `prefers-reduced-motion`.
5. **Costos (Q6 = C):** arriba porcentajes grandes (0% · 3% vs CFTEA min–max) y abajo barras horizontales de **costo total en US$** de la misma compra: Lazo 3, Lazo 6 y la competencia.
6. **"Los números de Lazo" (Q19):** en la landing **sí** se muestra la comisión del comercio (5,25–7% según plazo) vs financiación de mostrador y billeteras, y el rendimiento del pool vs Kamino y Jupiter, como barras comparativas. "Ahí hay que ser transparentes." La regla de no mostrar fees del comercio aplica solo al video.
7. **El comprador no ve lo del comercio (Q7, Q20):** se sacan las líneas "X cobra US$ … hoy / a N días" del checkout, la confirmación y la pantalla de éxito. Se auditan todas las vistas por rol. Lo obvio (montos del comercio frente al comprador o al garante) se saca directo; los casos dudosos se le consultan a Luciano antes de tocarlos.
8. **Comercio (Q8, Q18):** el orden es (1) **Cobrado** + **Garantizado por cobrar** (tramos comprometidos con fecha y monto, en una mini línea de tiempo, a partir del calendario de tramos del mock); (2) **Venta en mostrador**, destacada; (3) **Ventas en cuotas** como historial plegable, con las últimas 3 visibles y "Ver todas (N)". El resto del panel queda como está ("me gusta bastante").
9. **Sin "Datos simulados" / "Mock" en ninguna cuenta (Q9):** se sacan de admin, pool, comprador, comercio y del selector de identidad. Se **conservan** la sección "Qué corre en la cadena y qué en el simulador" de la landing y el aviso de devnet del footer.
10. **Dashboard del admin (Q10):** arriba, 4 KPIs grandes (planes activos, volumen financiado, % en mora, liquidez del pool), un gráfico de planes por estado (al día / gracia / mora / cobrado al garante) y una lista "requiere atención". Solo con datos que el mock ya expone, sin métricas inventadas.
11. **"Compradores y garantes" (Q11 + Q17 = B):** todo el texto visible en español pasa de "estudiante/s" a "comprador/es" y de "fiador/es" a "garante/s", incluidos las cuentas ("Comprador nuevo", "Comprador Tier 4", "Garante"), el menú, los títulos, el checkout y las FAQs. **No** se tocan rutas (`/app/estudiante`, `/fiador/[token]`, `/para-estudiantes`), identificadores, tipos ni el programa. En inglés ya dice "guarantor"; "student/students" pasa a "buyer/buyers" donde nombra al rol.
12. **"Cómo funciona" (Q12):** un set común de bloques (hero con ilustración, pasos con diagrama, número grande, comparativa, FAQ en acordeón) que se alternan, con el acento del rol de cada página. Las tres páginas usan el mismo set.
13. **Cuenta del comprador (Q13 = a):** tarjeta de Tier tipo credencial con el color del nivel, barra de progreso al próximo Tier ("te falta 1 plan saldado") y beneficios desbloqueados. Los planes van como tarjetas con anillo de progreso de cuotas. "Ver planes" y "Ver comercios" pasan a ser tarjetas con ícono. **Sin** la escalera de 5 Tiers.
14. **Orbe del pool (Q14 = C, Q21, Q23 = a):** abstracto, tipo logo de Siri: una esfera de cristal con cintas de luz que giran y se cruzan, en 3D y con movimiento, con los colores de Lazo. **Representa datos:** el reparto de color sigue disponible vs prestado y el brillo o tamaño sigue la liquidez total. Arriba flota el rendimiento anual con count-up ("~X% anual si dejás tu plata"). Se implementa como **shader WebGL** reutilizando la infraestructura del prisma y la niebla, con un respaldo CSS (gradientes con blur y rotación en perspectiva) para dispositivos sin WebGL y para `prefers-reduced-motion` (estático).
15. **Quiénes somos (Q16):** queda la versión de Codex (`t3-quienes-somos`, ya mergeada en la rama). Ningún ticket toca `quienes-somos.tsx`, `team.module.css` ni `landing-equipo.ts`. "Probalo en 2 minutos", la cuenta del garante y el panel del comercio (fuera de lo de la decisión 8) quedan como están.
16. **Prioridad (Q24):** (1) checkout, cada rol ve lo suyo, sin "Datos simulados", compradores y garantes → (2) pool con orbe y panel del comercio → (3) landing → (4) cuenta del comprador → (5) páginas "Cómo funciona" y colores por rol → (6) dashboard del admin. Si alcanza el tiempo, todo en paralelo.
17. **Publicación:** push, PR y merge a `main` (que publica en https://lazo-cuotas.vercel.app) **solo con OK explícito de Luciano**. No se firma ni se envía ninguna transacción y no se toca el programa.

## User Stories

### Comprador

1. Como comprador, quiero que el checkout me muestre solo lo que pago yo (anticipo, cuotas, interés, total y fechas), para no confundirme con lo que cobra el comercio.
2. Como comprador, quiero que la pantalla de éxito me confirme mi plan sin decirme cuándo ni cuánto cobra el comercio, para quedarme con la información que me importa.
3. Como comprador, quiero que la web me llame "comprador" y a mi familiar "garante", para entender los roles sin jerga.
4. Como comprador nuevo, quiero ver mi Tier como una credencial con su color, para sentir que tengo un nivel que puede crecer.
5. Como comprador nuevo, quiero una barra que me diga cuánto me falta para el próximo Tier, para saber qué hacer para subir.
6. Como comprador de Tier 4, quiero ver los beneficios que desbloqueé (anticipo menor, tope mayor), para valorar mi historial.
7. Como comprador, quiero ver cada plan como una tarjeta con un anillo de cuotas pagadas, para saber de un vistazo cuánto me falta.
8. Como comprador, quiero que "Ver planes" y "Ver comercios" sean tarjetas llamativas, para encontrar rápido a dónde ir.
9. Como comprador, quiero que mi cuenta no diga "Datos simulados" ni "Mock", para que se sienta como una app de verdad.
10. Como comprador en el celular, quiero que todo lo nuevo se vea bien a 390 px, porque es donde abro el link.

### Garante

11. Como garante, quiero entender en tres pasos qué implica respaldar un plan, con una animación que me guíe, para decidir tranquilo.
12. Como garante, quiero ver la línea de mora avanzar sola de punta a punta, para entender en qué momento me cobran sin tener que apretar nada.
13. Como garante, quiero poder pausar la línea de mora tocando un hito, para leerlo con calma.
14. Como garante, quiero que mi panel no me muestre cuánto cobra el comercio, porque no me corresponde.

### Comercio

15. Como comercio, quiero ver lo cobrado en grande y bien presentado apenas entro, para saber cómo voy.
16. Como comercio, quiero ver al lado de lo cobrado lo que Lazo me garantiza cobrar, con fecha y monto de cada tramo, para planificar mi caja.
17. Como comercio, quiero tener la venta en mostrador justo abajo de lo cobrado, para arrancar una venta en el local sin buscarla.
18. Como comercio, quiero que las ventas en cuotas sean un historial plegable que muestre las últimas, para que la pantalla no crezca sin fin cuando se acumulan.
19. Como comercio que mira la landing, quiero ver la comisión de Lazo frente a la financiación de mostrador y las billeteras en barras, para comparar de un vistazo.
20. Como comercio, quiero una página "Cómo funciona" con mi color, diagramas y números grandes, para no leer un bloque de texto tras otro.

### Inversor / pool

21. Como visitante del pool, quiero ver un orbe 3D animado que representa la plata del pool, para que el pool se sienta vivo.
22. Como visitante del pool, quiero ver arriba el rendimiento anual en grande ("~X% anual si dejás tu plata"), para entender rápido qué gano.
23. Como visitante del pool, quiero que el orbe cambie según cuánto está prestado y cuánto disponible, para que la animación me diga algo real.
24. Como visitante del pool, quiero ver la utilización en un medidor grande, para entender qué parte del pool trabaja.
25. Como visitante del pool, quiero los movimientos en un historial plegable (los últimos 3 y "ver todos"), para no perderme en una lista larga.
26. Como visitante del pool, quiero comparar el rendimiento del pool con Kamino y Jupiter en barras, para ver la diferencia sin hacer cuentas.
27. Como visitante del pool en un celular sin WebGL o con "reducir movimiento" activado, quiero ver igual un orbe estático y los datos, para que la página no se rompa.
28. Como inversor, quiero una página "Cómo funciona" con el mismo set visual y mi color, para que se lea distinta de las otras dos.

### Admin

29. Como admin, quiero ver arriba 4 KPIs grandes (planes activos, volumen financiado, % en mora, liquidez del pool), para leer el estado del protocolo en segundos.
30. Como admin, quiero un gráfico de planes por estado (al día, gracia, mora, cobrado al garante), para ver la salud de la cartera.
31. Como admin, quiero una lista "requiere atención" con los planes en mora o pendientes de revisión, para saber qué hacer primero.
32. Como admin, quiero que el panel no diga "Datos simulados", porque ya se sabe que es una demo.

### Jurado / visitante de la landing

33. Como jurado, quiero que la landing tenga movimiento y color sin perder la identidad, para que el producto se recuerde.
34. Como jurado, quiero ver en porcentajes grandes y en barras de costo total en US$ cuánto más barato es Lazo que la competencia, para entender la propuesta en segundos.
35. Como jurado, quiero ver "Los números de Lazo" como comparativas visuales, para entender por qué le conviene a cada actor.
36. Como jurado, quiero que el menú diga "Compradores y garantes", para entender que Lazo sirve a quien compra y a quien respalda.
37. Como jurado, quiero que la sección "Qué corre en la cadena y qué en el simulador" siga ahí, para saber qué es real.
38. Como visitante con "reducir movimiento" activado, quiero que ninguna animación nueva corra en loop, para no marearme.
39. Como visitante con teclado, quiero llegar a los 3 pasos, a los hitos de mora y a los historiales plegables y activarlos, para no depender del mouse.
40. Como visitante en inglés, quiero que todo lo nuevo esté traducido, porque la web es bilingüe.

### Equipo

41. Como equipo, quiero aprobar la paleta por rol en `/design` antes de que se aplique, para que el resultado sea coherente.
42. Como equipo, quiero que la demo de mañana (checkout, primera cuota, comercio, pool) siga funcionando igual después del rediseño, para no arriesgar la presentación.
43. Como equipo, quiero que nada se publique en `main` ni en Vercel sin mi OK, para elegir cuándo sale.

## Implementation Decisions

- **Tokens de acento por rol.** Se agregan tokens de tema (uno por rol, con sus variantes suaves y de brillo) junto a los existentes y una forma de aplicarlos por sección o página (atributo o clase de rol que redefine el acento). `/design` muestra la paleta propuesta con muestras de botones, chips, barras y la tarjeta de Tier. Todo lo demás consume los tokens, nunca hex sueltos.
- **Primitivas visuales compartidas.** Se extiende el set de primitivas de audiencia (hero, sección, lista de pasos, FAQ, callout, stat card) con: lista de pasos animada (entrada escalonada + realce en hover/foco/toque), número grande con count-up, barras comparativas horizontales (valor, etiqueta, resaltado del ganador), medidor de utilización, historial plegable (N visibles + "Ver todas (N)", accesible con `aria-expanded`) y FAQ en acordeón. Las usan la landing, las tres páginas "Cómo funciona" y las cuentas. Todas respetan `prefers-reduced-motion` mediante el hook de reduced-motion existente.
- **Línea de mora automática.** El estado del hito activo vive en el componente: avanza con un temporizador que solo corre mientras la sección está en pantalla (IntersectionObserver), se pausa con hover, foco o toque y no arranca con reduced-motion. Los hitos salen de la config del protocolo (gracia, aviso, recargo, cobro); no se hardcodea ningún día.
- **Costos y números.** Los montos de las barras salen del cálculo único de términos (`quoteTerms`) y de las cifras de referencia ya existentes (CFTEA, comisiones de mostrador y billeteras, Kamino y Jupiter). Ningún número nuevo se hardcodea en la UI. La CFTEA se convierte a costo total en US$ de la compra de referencia con una función pura documentada.
- **Fugas del comprador.** Las vistas de checkout, confirmación y éxito dejan de recibir y mostrar los montos y plazos del comercio. Se borran los textos asociados de los diccionarios que queden sin uso. La auditoría por rol recorre comprador, garante, comercio, pool y admin, y su resultado (qué se sacó y qué quedó en consulta) se anota en el ticket.
- **Renombre de texto.** Solo en los diccionarios de i18n y en los textos visibles de los componentes. Las claves de diccionario, rutas, nombres de componentes y tipos no cambian. Los e2e que buscan texto se actualizan.
- **Panel del comercio.** "Garantizado por cobrar" se arma con el calendario de tramos pendientes del comercio que ya expone la interfaz de cuotas (mock). Si en modo real no está disponible, el bloque no se muestra (no rompe). El historial plegable de ventas usa la primitiva compartida.
- **Cuenta del comprador.** La tarjeta de Tier y el progreso se derivan del Tier actual del comprador y de las reglas de subida de la config (monto mínimo financiado, gracia). Los beneficios (anticipo y tope) salen de los escalones de la config. Las dos personas de demo ("Comprador nuevo", "Comprador Tier 4") muestran estados distintos.
- **Orbe del pool.** Un componente nuevo con dos capas: un renderer WebGL (shader de cintas de luz sobre una esfera, reutilizando el andamiaje de contexto, resize y loop del prisma y la niebla) y un respaldo CSS. Recibe un estado derivado del pool calculado por una **función pura** (`pool → { disponibleRatio, prestadoRatio, intensidad }`), que es su única interfaz con los datos. Pausa el loop cuando no está en pantalla o con la pestaña oculta. Con reduced-motion o sin WebGL se usa el respaldo estático. No se usan librerías 3D nuevas.
- **Dashboard del admin.** Una franja nueva arriba del panel con los 4 KPIs, el gráfico por estado (barras CSS/SVG, sin librería de gráficos nueva) y "requiere atención", todo derivado del snapshot que el panel ya carga. Las secciones actuales siguen abajo.
- **Sin rótulos de simulación en cuentas.** Se sacan las cadenas `datosSimulados`, `mockTag`, `modeMock` y similares de las vistas de cuentas (y sus usos). Se mantienen el footer de devnet y la sección honesta de la landing.
- **Archivos exclusivos por ticket** para poder paralelizar. Los diccionarios compartidos se tocan solo en el ticket dueño.

## Testing Decisions

- **Un buen test** verifica lo que ve el usuario (textos, presencia o ausencia de datos, estados tras interactuar), no la estructura interna ni clases CSS.
- **Seam principal: Playwright e2e contra la app en modo mock** (prior art: `checkout-settlement.spec.ts`, `comercio-pool.spec.ts`, `landing-motion.spec.ts`, `admin.spec.ts`, `responsive.spec.ts`, `demo-recording.spec.ts`). Cubre:
  - El checkout, la confirmación y el éxito **no** contienen el nombre del comercio con "cobra" ni montos del comercio; el panel del comercio sí.
  - Ninguna cuenta contiene "Datos simulados", "Simulated data" ni "Mock".
  - El menú dice "Compradores y garantes" y la landing no dice "fiador" en español.
  - La línea de mora cambia de hito sola (con el reloj de Playwright) y no cambia con reduced-motion.
  - Los historiales plegables muestran N ítems y se expanden.
  - El pool renderiza el orbe (canvas o respaldo) y el rendimiento; con reduced-motion se ve el respaldo.
  - Sin scroll horizontal a 390 px en todas las rutas (extender `responsive.spec.ts` si hace falta).
  - El recorrido de la demo de mañana (`demo-recording.spec.ts`, `checkout-happy-path.spec.ts`) sigue en verde.
- **Vitest solo para funciones puras nuevas:** el mapeo pool → estado del orbe, la conversión CFTEA → costo total y el progreso al próximo Tier (prior art: `band-color.test.ts`, `plan-calendar.test.ts`, `prism-3d-slices.test.ts`).
- **Evidencia visual:** capturas a 390 y 1440 px de cada pantalla tocada en `.scratch/rediseno-ui/evidence/<ticket>-*`, antes de marcar el ticket como done.
- Antes de cerrar la tanda: typecheck, lint, tests de Vitest, build y e2e en verde.

## Out of Scope

- Rehacer el video del pitch (ya está grabado y finalizado).
- Quiénes somos (queda la versión de Codex), "Probalo en 2 minutos", la cuenta del garante (salvo la auditoría de fugas y el renombre de texto) y el resto del panel del comercio.
- Cambiar rutas, identificadores, tipos o el programa Anchor; deploy de programa; firmar o enviar transacciones.
- Tema claro o cambio de tipografía o identidad.
- La escalera visual de 5 Tiers en la cuenta del comprador.
- Librerías nuevas de 3D o de gráficos.
- Publicar en `main` o Vercel sin OK explícito.

## Further Notes

- El orbe es el elemento estrella: si el WebGL se complica, primero se entrega el respaldo CSS funcionando y después se mejora.
- Hay que cuidar el rendimiento en la landing: ya corren el prisma 3D y la niebla. El orbe vive solo en `/pool`.
- "Garante" es un cambio de vocabulario que también conviene reflejar en `proyecto/05-pitch.md` y en `CLAUDE.md` en una pasada posterior. Este spec no los toca.
- Los rótulos de comercios "de ejemplo" del marketplace **no** son "Datos simulados" de cuentas: se mantienen.
