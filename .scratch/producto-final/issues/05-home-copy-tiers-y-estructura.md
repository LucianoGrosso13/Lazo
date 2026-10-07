# 05: Home — copy profesional, tiers con reglas, línea de mora con leyenda, comparación, supuestos y "Qué corre en la cadena"

**What to build:** el home cuenta el producto decidido, con un tono serio y sin "provisional", "ilustrativo" ni "demo" sueltos. Cambios:
- **Tiers con reglas:** reemplaza la "escalera" e incluye la tabla de reglas para subir y bajar.
- **Línea de mora con leyenda:** cada día explicado.
- **Comparación de costo total** frente a la alternativa sin tarjeta.
- **"Los números" con "Supuestos".**
- **"Qué viene"** con 2 ítems.
- **"Qué corre en la cadena y qué en el simulador".**
- **Aviso único de devnet** (footer + una línea en el hero).
- **Integración** de `QuienesSomos` y `Probalo` (ticket 06).

**Blocked by:** 01 (06 para integrar sus componentes; si 06 todavía no se mergeó, el coordinador los integra al mergear)

**Status:** done

**Archivos propios:** `app/src/app/page.tsx`, `app/src/components/landing/{hero.tsx,sections.tsx,landing.module.css,split.ts,reference.ts}`, `app/src/i18n/dictionaries/{landing-hero.ts,landing-sections.ts,common.ts}`, `app/src/components/site-footer.tsx`, `app/src/app/layout.tsx` (solo metadata).

Notas:
- Copy: rioplatense profesional, frases cortas, verbos concretos. El hero promete lo que hay: "3 cuotas sin interés o 6 con 3% total. Un familiar te respalda. El comercio cobra hoy o en tramos".
- **Tiers:** `tierLabel()` de `tiers.ts`; por tier, anticipo, tope y cobertura del fiador ("100% de lo que falta pagar"). Arrancan en Tier 1.
- **Reglas** (de la config, spec § Web): subís / no suma / bajás / sin fiador no hay plan.
- **Línea de mora:** al lado de cada marca, una línea de qué pasa y quién se entera (día 0 compra, vencimiento, gracia sin recargo, aviso al fiador, recargo, cobro al fiador y −1 tier).
- **Comparación:** compra de US$ 1.000 con Lazo (3 cuotas: total 1.000; 6 cuotas: 1.021) frente a "la competencia, sin tarjeta" (cifra verificada de `REFERENCE_FIGURES`, con su fuente). Sin marcas.
- **Números:** comercio 5,25–7% según cuándo cobra; pool con el "rendimiento objetivo del tramo senior"; "Supuestos" lista `modelAssumptions`.
- **"Qué viene":** solo billeteras argentinas como canal y tesorería propia en DeFi (simulada, nunca el pool). Sin descuento al fiador ni mostrador (ya está hecho).
- **"Qué corre en la cadena y qué en el simulador":**
  - en la cadena (devnet): programa con 3/6 cuotas, fiador obligatorio, pool; tramos si entra 03;
  - en el simulador: reloj, pagos con tarjeta, identidad, mostrador, comercios de ejemplo.

- [x] Cero "provisional", "ilustrativo", "escalón" o "nivel" en el home (es y en)
- [x] Tabla de reglas de tiers desde la config
- [x] Leyenda de la línea de mora
- [x] Comparación de costo total con fuente
- [x] "Supuestos", "Qué viene" (2 ítems) y "Qué corre en la cadena y qué en el simulador"
- [x] Aviso de devnet único en el footer + línea del hero
- [x] 390/1440 sin scroll horizontal; capturas `evidence/05-*`
- [x] typecheck / lint / test / build en verde
