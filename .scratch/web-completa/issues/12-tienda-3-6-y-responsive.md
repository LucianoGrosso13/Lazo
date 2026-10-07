# 12: Tienda — textos 3/6 cuotas, productos de Voltia y responsive

**What to build:** `/tienda` sigue siendo la tienda de Voltia (el guion de la demo), ahora con los productos de Voltia tomados del catálogo extendido, el texto "3 sin interés o 6 con interés" desde la config, un link al marketplace para ver más comercios, y una versión móvil prolija.

**Blocked by:** 01, 02

**Status:** done

**Archivos propios:** `app/src/components/store/*`, `app/src/app/tienda/page.tsx` (incluida su `metadata`: hoy dice "3 cuotas sin interés"), `app/src/i18n/dictionaries/tienda.ts`. Solo lectura: `landing/split.ts`.

Notas:
- Productos: los del comercio `DEMO_MERCHANT` según el directorio/catálogo (no el array entero, que ahora trae todos los comercios).
- Cada tarjeta: desglose de 3 cuotas como hoy + una línea "o 6 cuotas de X (interés total N%, provisional)" con `quote(..., { installments: 6 })` si la opción existe en la config.
- Audit 390 px: el chip del reloj tapa la esquina (lo arregla el 04, no lo toques); revisá densidad, CTA "Install Phantom" y tarjetas.

- [x] Tienda muestra solo Voltia; precios y desglose de 3 cuotas iguales a hoy
- [x] Línea de 6 cuotas con interés y "provisional" desde `quote()`; oculta si la config no trae la opción
- [x] Link a `/comercio` ("Ver más comercios")
- [x] Sin scroll horizontal a 390 px; tap targets ≥ 40×40
- [x] Capturas 390/1440 en `.scratch/web-completa/evidence/12-*`
- [x] typecheck / lint / test / build en verde
