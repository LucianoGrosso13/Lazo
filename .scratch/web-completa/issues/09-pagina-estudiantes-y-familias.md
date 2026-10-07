# 09: Página /para-estudiantes (estudiantes y familias)

**What to build:** una página que explica de punta a punta cómo funciona Lazo para quien compra y para el familiar fiador, con números de la config. Fuentes: `PRODUCT.md`, `proyecto/06-decisiones-comerciales.md` (addendum incluido), `proyecto/08-minorista-y-economia.md` § "Flujo minorista" (compra repetida sin nueva alta), `proyecto/09-…` § Idea 11.

**Blocked by:** 01, 03

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/audience/para-estudiantes.tsx` (reemplazás el placeholder), nuevo diccionario `app/src/i18n/dictionaries/para-estudiantes.ts`, la `metadata` de `app/src/app/para-estudiantes/page.tsx`. Usá las primitivas de `components/audience/`; si te falta una, pedila al coordinador o hacela local en tu archivo.

Contenido mínimo:
- Qué es en dos líneas (cuotas en dólares digitales para estudiantes sin tarjeta, con un familiar que respalda). Explicar devnet y devUSDC en una línea.
- Cómo comprar: elegir comercio/producto → 3 sin interés o 6 con interés total provisional (ejemplo con `quote()`: 1.000 → anticipo, cuotas, interés, total) → aprobar → pagar cuotas.
- Escalera (desde la config): anticipo y tope por escalón; qué la hace subir (plan pagado ≥ mínimo de la config sin pasar la gracia).
- Qué pasa si me atraso (días de la config: gracia, aviso, recargo, cobro al fiador, baja de escalón, bloqueo de planes nuevos).
- Para la familia: cubre el 100% del capital pendiente en todos los escalones, solo paga si el estudiante no paga, tope acordado antes de aceptar, no se libera por subir de escalón; alcance sobre interés/recargos pendiente de definir (decirlo). Sin jerga cripto.
- Próximamente (roadmap, rotulado): comprar en el local con un QR/link de Lazo sin repetir el alta; descuentos en comercios para fiadores cuyo estudiante paga al día.
- FAQ (5–7): ¿necesito tarjeta?, ¿qué es una wallet?, ¿en pesos o en dólares? (riesgo cambiario, sin prometer que es barato), ¿puedo tener más de un plan? (en la demo, dentro del margen de tu escalón), ¿qué pasa con mis datos? (identidad fuera de la cadena), ¿es real? (demo en devnet).
- CTAs: ir a la tienda / ver comercios / mi cuenta.

- [ ] Todo lo de arriba en ES y EN, con números de la config y etiquetas "provisional"/"demo" donde corresponda
- [ ] Sin competidores ni billeteras nombradas; sin testimonios ni métricas inventadas
- [ ] Sin scroll horizontal a 390 px; FAQ accesible por teclado
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/09-*`
- [ ] typecheck / lint / test / build en verde
