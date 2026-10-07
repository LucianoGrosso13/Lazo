# 10: Página /para-comercios

**What to build:** una página que le explica a un comercio cómo vende con Lazo, cuánto cobra y cuándo, cómo opera en mostrador y online, y qué está pendiente. Fuentes: `proyecto/06-decisiones-comerciales.md` (addendum), `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`, `proyecto/08-minorista-y-economia.md` § "Flujo minorista" e "Idempotencia, fallos y devoluciones", `proyecto/07-go-to-market-y-alianzas.md` § 4 (responsabilidades, sin nombrar partners).

**Blocked by:** 01, 03

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/audience/para-comercios.tsx` (reemplazás el placeholder), nuevo diccionario `app/src/i18n/dictionaries/para-comercios.ts`, la `metadata` de `app/src/app/para-comercios/page.tsx`. Usá las primitivas de `components/audience/`.

Contenido mínimo:
- Propuesta: vendé en 3 o 6 cuotas a clientes sin tarjeta; el cliente tiene un familiar que respalda; vos elegís cuándo cobrar.
- Cuánto cobrás: comisión sobre lo financiado (no sobre el precio) según plazo, tabla desde `settlementOptionsOf(config)` con el ejemplo 1.000 / anticipo 300 / financiado 700 → neto por plazo calculado con `quote()`; todas las diferidas "provisional". Aclarar que el anticipo llega en el momento y el resto en la fecha elegida, garantizada por Lazo aunque el cliente se atrase (supuesto de la demo).
- En 6 cuotas el interés lo paga el comprador; tu comisión no cambia.
- Cómo se opera: link de checkout para vender online; en mostrador, una orden con QR/link de Lazo que el cliente abre con la cámara (roadmap; aclarar que no es un QR de pagos interoperable); panel con ventas, cobros y pendientes.
- Frente a otras formas de vender en cuotas: `REFERENCE_FIGURES`, etiqueta "referencia", sin marcas.
- Riesgos y pendientes honestos: devoluciones (política en definición), qué asume cada parte, tarifas provisionales.
- Aparecer en el marketplace (link a `/comercio`): hoy con comercios de ejemplo.
- FAQ (5–7) y CTAs: ver el panel demo del comercio (`/app/comercio`), ver el marketplace.

- [ ] Todo lo de arriba en ES y EN, con números de la config/`quote()` y etiquetas correctas
- [ ] Sin competidores ni billeteras nombradas; sin aliados ni métricas inventadas
- [ ] Tabla de plazos legible en 390 px (tarjetas o scroll contenido)
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/10-*`
- [ ] typecheck / lint / test / build en verde
