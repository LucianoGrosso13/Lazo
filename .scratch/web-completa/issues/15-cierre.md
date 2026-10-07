# 15: Cierre — e2e, verificación completa, documentación y README en inglés

**What to build:** la tanda queda verificada de punta a punta, con e2e que la protegen y la documentación del equipo al día.

**Blocked by:** 01–14

**Status:** ready-for-agent

**Archivos propios:** `app/e2e/*`, `app/playwright.config.ts` (si hace falta), `README.md`, `PRODUCT.md`, `proyecto/04-plan.md` (§ Estado), `proyecto/05-pitch.md` (§ Nota técnica), `.scratch/web-completa/evidence/15-*`. Arreglos chicos en otros archivos solo si un e2e descubre un bug, listados en el `worker_done`.

- [ ] Deuda detectada en revisión: `components/audience/para-estudiantes.tsx` (y partes de `para-inversores.tsx`, y `para-comercios.tsx` si pasa lo mismo) recalculan anticipo/interés/cuotas/comisión a mano en vez de usar la cotización. Extraer el cálculo puro de la cotización (anticipo, financiado, interés, cuotas con redondeo en la última, comisión por plazo, adelanto/pendiente del comercio) a `lib/cuotas/terms.ts`, hacer que `computeQuote` del mock lo use, y reemplazar las cuentas locales de esas páginas por ese helper. Tests: el helper da exactamente lo mismo que `quote()` del mock para 3/6 cuotas × los 4 plazos (archivos propios ampliados: `lib/cuotas/terms.ts`, `terms.test.ts`, `mock.ts`, `components/audience/para-*.tsx`)
- [ ] e2e nuevo: a 390×844, todas las rutas públicas sin scroll horizontal (`/`, `/tienda`, `/checkout/pc`, `/comercio`, perfil de un comercio, `/para-estudiantes`, `/para-comercios`, `/para-inversores`, `/pool`, `/app`, `/app/estudiante`, `/app/comercio`, `/app/admin`, `/account`, `/design`)
- [ ] e2e nuevo: marketplace (buscar, filtrar por categoría, abrir perfil, ir al checkout de un producto de otro comercio y comprar en el mock; la venta aparece en ese comercio)
- [ ] e2e nuevo: checkout con 6 cuotas muestra interés, total y "provisional"; cuenta del comercio con cobro a 30 días pasa de pendiente a cobrado al adelantar el reloj
- [ ] e2e existentes actualizados a los copys nuevos; `npm run test:e2e` en verde
- [ ] typecheck / lint / test / build en verde en la rama de integración
- [ ] Capturas 390 y 1440 de todas las rutas en `.scratch/web-completa/evidence/15-*`
- [ ] `proyecto/04-plan.md` § Estado y `proyecto/05-pitch.md` § Nota técnica: divergencias mock ↔ programa (3/6 cuotas, cobertura 100%, plazos de cobro solo en el mock; el programa sigue con 3 cuotas, 100/90/80/70 y cobro inmediato)
- [ ] `PRODUCT.md` actualizado (3/6, plazos de cobro, marketplace demo, páginas por audiencia)
- [ ] `README.md` (inglés): páginas nuevas, marketplace demo, términos provisionales, todo en devnet
