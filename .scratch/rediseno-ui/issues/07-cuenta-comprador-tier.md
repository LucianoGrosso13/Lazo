# 07: Cuenta del comprador — Tier credencial y planes visuales

**What to build:** en la cuenta del comprador, con acento violeta: (a) **tarjeta de Tier tipo credencial**, con el color del nivel, el nombre del Tier y los beneficios desbloqueados (anticipo y tope, desde los escalones de la config); (b) **barra de progreso al próximo Tier** con el texto de qué falta ("Te falta 1 plan saldado a tiempo de US$ X o más"), derivada de las reglas de la config, con una función pura testeada (en el Tier máximo dice "Tier máximo"); (c) **planes como tarjetas con anillo de progreso** de cuotas pagadas; (d) **"Ver planes" y "Ver comercios"** como tarjetas con ícono, no botones apagados. "Comprador nuevo" y "Comprador Tier 4" se ven claramente distintos. Sin escalera de 5 Tiers.

**Blocked by:** 01, 03

**Status:** done · **Asignado:** Devin

**Archivos propios:** `components/cuenta/estudiante.tsx`, la sección `student` de `i18n/dictionaries/cuentas.ts`, archivos nuevos en `components/cuenta/comprador/`.

- [x] Tarjeta de Tier + progreso + beneficios para las dos personas
- [x] Test de Vitest del progreso (Tier 1, intermedio, máximo)
- [x] Planes con anillo; accesos como tarjetas
- [x] `checkout-first-payment.spec.ts` y `entry.spec.ts` en verde; capturas 390/1440 de las dos personas en `evidence/07-*`

**Entregado:** `comprador/tier-card.tsx` (credencial con `--tier`/`--tier-next` por escalón, beneficios desde `guaranteedTiers`, barra al próximo Tier con `tierProgress`), `comprador/tier-progress.ts` + `.test.ts` (pura, 5 casos), `comprador/plan-card.tsx` (anillo pagadas/total con entrada animada), `comprador/accesos.tsx` (tarjetas con ícono a `#planes` y `/comercio`), `comprador.module.css` (movimiento finito + reduced-motion). Spec propio `e2e/rui-07-cuenta-comprador.spec.ts` (3 tests en verde). Evidencia: `07-comprador-nuevo-{390,1440}`, `07-comprador-tier4-{390,1440}`, `07-plan-anillo-{390,1440}` (+ `-credencial`/`-plan` de detalle).
