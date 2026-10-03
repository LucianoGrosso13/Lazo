# 10: Landing — escalera, fiador, tres beneficios y lo simulado

**What to build:** las secciones debajo del hero, con ritmo de estudio (denso/quieto alternado): la escalera de reputación interactiva, cómo funciona el fiador, los tres beneficios con números al lado de la alternativa y el cierre con "qué es real y qué es simulado" + devnet.

**Blocked by:** 03, 07

**Status:** done (coordinador; el hero usa el prisma SVG de components/landing/prism-stage.tsx hasta que el ticket 08 lo reemplace por WebGL)

**Archivos tuyos:** `app/src/components/landing/sections.tsx` y `app/src/components/landing/sections/**`, `app/src/i18n/dictionaries/landing-sections.ts`.

- [x] Escalera: los 4 escalones como láminas de vidrio apiladas (anticipo / tope / cobertura del fiador desde `getConfig()`); al pasar o tocar un escalón se ve qué cambia para una PC de 1.000
- [x] Fiador en 3 pasos (invita con un link → elige tope y carga tarjeta → solo paga si no pagás, con aviso el día 3 y cobro el día 15), con los días tomados de la config
- [x] Tres beneficios con número grande y alternativa al lado: estudiante (0% vs MP ~+29%), comercio (cobra al instante; 7% de lo financiado = 4,9% del precio en escalón 0 vs Cuota Simple 5,41% y MP ~12,49%; GOcuotas paga a 22 días hábiles), pool (senior ~8% vs Kamino ~6% y Jupiter ~5%, todo verificable onchain). Cifras de terceros con `ReferenceTag`
- [x] Sección "Real vs. simulado" (de `03-mvp.md`) y footer con devnet, link al repo y "Built for Colosseum Crypto World's Fair · Superteam Argentina"
- [x] Movimiento: reveals orquestados una vez (luz que entra), nada de hovers sueltos; reduced-motion quieto
- [x] ES/EN completos; 390 px sin scroll horizontal
- [x] Captura full-page en `.impeccable/review/landing-desktop.png` y `landing-mobile.png`
- [x] typecheck, lint, test y build pasan
