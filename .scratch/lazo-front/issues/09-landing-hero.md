# 09: Landing — hero interactivo con el prisma

**What to build:** el primer viewport de la landing según el FIRST VIEWPORT del contrato: el prisma grande con el precio entrando y saliendo partido en anticipo + 3 cuotas, slider de precio (120-1.500), chips de productos (PC 1.000, notebook 650, curso 120) y de escalón (0-3) que re-refractan en vivo, la banda gris de MP (referencia) y el CTA "Comprar en 3 cuotas sin interés" + "Ver demo".

**Blocked by:** 03, 08

**Status:** done (coordinador; el hero usa el prisma SVG de components/landing/prism-stage.tsx hasta que el ticket 08 lo reemplace por WebGL)

**Archivos tuyos:** `app/src/components/landing/hero.tsx` y `app/src/components/landing/hero/**`, `app/src/i18n/dictionaries/landing-hero.ts`.

- [x] Los montos salen de `getCuotas().quote()`/`getConfig()` (para el escalón elegido usar los `guaranteedTiers` de la config; nada hardcodeado)
- [x] Titular con el 0% a escala de titular; bajada en una línea que explica el fiador ("solo paga si vos no pagás")
- [x] Comparación con MP etiquetada "referencia" desde `REFERENCE_FIGURES`
- [x] Al subir de escalón se acorta la banda del anticipo; si el precio supera el tope del escalón se muestra el motivo, no un error
- [x] CTA primario → `/tienda` (o `/checkout/<producto>` si eligió un producto); secundario "Ver demo" → `/tienda` por ahora
- [x] 1440 px: prisma ~60% a la izquierda, texto y CTA en el tercio derecho. 390 px: prisma arriba, controles y CTA abajo, sin scroll horizontal
- [x] ES/EN completos
- [x] Capturas en `.impeccable/review/hero-desktop.png` y `hero-mobile.png`
- [x] typecheck, lint, test y build pasan
