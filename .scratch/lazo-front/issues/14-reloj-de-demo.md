# 14: Reloj de demo global

**What to build:** un control flotante (solo en modo demo/mock) para adelantar el tiempo: muestra el día de demo y botones +1, +5, +15 días y "reiniciar demo". Es la regla de días del contrato (sellos 1 · 3 · 6 · 15) por la que avanza la luz. Lo usan todas las pantallas, incluidas las de la otra sesión.

**Blocked by:** 06, 07

**Status:** done

**Archivos tuyos:** `app/src/components/demo-clock/**`, `app/src/i18n/dictionaries/demo-clock.ts`, una línea en `app/src/app/layout.tsx` para montarlo.

- [x] Llama a `advanceDays(n)` y `resetDemo()`; se oculta si `getCuotas().mode === "real"`
- [x] Muestra días adelantados y, si hay un plan con atraso, en qué tramo de la mora está (gracia / aviso / punitorio / cobro al fiador) con los días de la config
- [x] Colapsable, no tapa CTAs en 390 px; accesible por teclado
- [x] ES/EN
- [x] typecheck, lint, test y build pasan
