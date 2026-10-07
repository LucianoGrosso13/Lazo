# 11: Página /para-inversores

**What to build:** una página que explica de dónde sale el rendimiento del pool, cómo se reparte cada compra (D8), los tramos, los riesgos y qué es verificable, sin prometer APY. Fuentes: `proyecto/09-alcance-opcion-h-y-mejoras.md` § "Economía de Lazo y del pool" e "Idea 10", `proyecto/08-minorista-y-economia.md` § "Reparto empresa/pool" y escenarios, `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`, `proyecto/research/g-capital-ocioso-devnet.md`.

**Blocked by:** 01, 03

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/audience/para-inversores.tsx` (reemplazás el placeholder), nuevo diccionario `app/src/i18n/dictionaries/para-inversores.ts`, la `metadata` de `app/src/app/para-inversores/page.tsx`. Usá las primitivas de `components/audience/`.

Contenido mínimo:
- Cómo funciona el pool: capital en devUSDC (devnet) que adelanta al comercio; vuelve con las cuotas; tramos junior (absorbe pérdidas primero) y senior. Datos en vivo de `getPool()` (NAV, utilización) con link a `/pool`.
- Una compra, paso a paso: el desglose de `d8Breakdown(config, quote)` para 1.000 / escalón 0 / 3 cuotas: comisión 49, originación 28 para Lazo, adelanto 651, salida del pool 679, principal 700, diferencia bruta 21, administración ilustrativa ~2,33, resto ~18,67. Decir que no es ganancia neta ni prueba de rentabilidad.
- 6 cuotas: interés del comprador (provisional 3%) y plazo más largo; cobro diferido reduce el capital adelantado. Resumen de `proyecto/10-…` sin copiar tablas enteras.
- Riesgos: mora; el fiador cubre el 100% del capital pero el recupero no está garantizado (rechazo de tarjeta, contracargo); liquidez en planes de 6 meses; escenarios favorable/base/adverso de 08 como sensibilidad (adverso negativo).
- Rendimiento: "ilustrativo, no validado" junto a Kamino/Jupiter con etiqueta "referencia" (de `REFERENCE`). Nada de APY garantizado.
- Transparencia: cada adelanto, pago, recupero y pérdida es un movimiento verificable en la cadena (devnet en la demo).
- Roadmap rotulado: tesorería propia en DeFi solo con fondos propios, simulada, nunca con capital del pool.
- FAQ (5–7) y CTAs: ver el pool, leer cómo funciona para comercios/estudiantes.

- [ ] Todo lo de arriba en ES y EN, con números de la config/helpers; nada hardcodeado
- [ ] Sin APY prometido; riesgos explícitos; etiquetas "referencia"/"ilustrativo"/"provisional"
- [ ] Desglose legible a 390 px
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/11-*`
- [ ] typecheck / lint / test / build en verde
