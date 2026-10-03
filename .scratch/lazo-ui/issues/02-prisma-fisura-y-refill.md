# 02: Prisma SVG con fisura refractiva contenida y refill suave

**What to build:** al cambiar importes/estado, la luz mantiene continuidad dentro del prisma; la marca de fisura queda localizada y el refill recompone el haz desde atrás sin una rotura agresiva. Se demuestra en la landing SVG actual, con el mismo desglose legible en movimiento reducido; no migrar a WebGL.

**Blocked by:** 01: Landing compacta, profesional y clara sobre los pagos. Secuenciar en el mismo UI owner porque comparte CSS y PrismStage con 01; no es una dependencia de negocio ni un requisito de WebGL.

**Status:** ready-for-agent

**Owner:** mismo UI owner de 01, sólo PrismStage SVG y CSS/diccionarios de landing; componentes prism WebGL y marcas globales del design existente fuera de scope.

- [ ] La luz se mueve y el vidrio queda estable; transiciones de refracción 400–700 ms con desaceleración, sin rebotes, fragmentos, sacudidas ni flashes agresivos.
- [ ] Fisura fina de luz/reflexión contenida en la banda/objeto afectado; no oscurece todo el desglose ni invade importes, texto o controles. El estado mantiene etiqueta/trama distinguible además del color.
- [ ] Refill suave ilumina desde atrás y devuelve continuidad al haz. Cambios repetidos o rápidos interrumpen desde el estado actual sin cola de animaciones ni saltos.
- [ ] Se preservan props públicas y consumers existentes; el warning de precio sobre tope no se presenta como cuota impaga o cobro ocurrido. Toda muestra de mora/refill sigue identificada como demostración visual; no requiere crear deuda, cobrar ni cambiar cuotas.
- [ ] El prisma SVG independiente de WebGL y reduced-motion conservan labels, importes y marcas completos en una composición quieta; la UI permanece legible sin una animación activa.
- [ ] Loops se detienen fuera de viewport y con pestaña oculta; blur/filtros SVG contenidos. Se revisa fluidez en el hardware disponible y se registra evidencia, no una promesa universal de 60 fps.
- [ ] Se muestra el antes/después y estados normal/fisura/refill en desktop/mobile; checks habituales y tests existentes de geometría siguen pasando. No se duplica la lógica de cálculo.
