# 00 — Resumen ejecutivo: análisis de viabilidad de Lazo

**Fecha:** 6 de octubre de 2026 · **Autor:** análisis orquestado por Devin (4 workers de investigación en paralelo + modelo financiero propio) · **Estado del proyecto:** MVP funcional en devnet con USDC de prueba. **Nada de lo que sigue es tracción real: es un plan de negocio con escenarios.**

## Documentos de esta carpeta

| Doc | Para quién | Idioma |
|---|---|---|
| `00-resumen-ejecutivo.md` (este) | El equipo | ES |
| `01-investor-paper-en.md` | Inversores y jurados de la hackathon | EN |
| `02-flujos-de-caja.md` | Inversores / equipo: cada peso, cada actor | ES |
| `03-memo-legal.md` | Tribunales / regulador / abogados | ES |
| `04-cambios-rentabilidad.md` | El equipo: qué reglas arreglar y cuáles sacar | ES |
| `modelo-financiero.py` + `salida-modelo.md` | Reproducibilidad: el modelo que genera cada número | ES |

## El veredicto en una línea

**El negocio es viable y puede ser muy rentable, pero no con las reglas que tiene hoy.** La versión actual (0% al estudiante, 7% al comercio todo al pool, fiador que reduce cobertura al subir de escalón, empresa sin ingresos) deja al pool en ~9%/año con mora del 30% — apenas arriba de lo que pagaría un senior — y a la empresa en $0. Con tres correcciones (un interés chico al estudiante, split del fee del comercio, y una escalera que no destruye margen) el libro rinde ~16%/año con mora del 30% y la empresa tiene un P&L que escala.

## Los cinco hallazgos que cambian la conversación

**1. La empresa hoy no tiene ningún flujo de ingresos.** El 7% del comercio va íntegro a los LPs del pool (`merchant_fee` se acredita a LPs en `open_plan`). Una empresa sin revenue no es una empresa: es un costo. La corrección es split del fee (ej.: 5% pool + 2% empresa) + servicing + spread FX. Es un cambio de configuración, no de arquitectura — el programa ya tiene `treasury`.

**2. La escalera de reputación está invertida económicamente.** Hoy, al subir de escalón el estudiante paga menos anticipo **y** el fiador cubre menos (100%→70%). Con mora constante del 30%, el escalón 0 rinde +16%/año pero el escalón 3 pierde −15%/año (modelo, `salida-modelo.md` §3). La escalera solo cierra si la mora **cae** al subir de escalón (de ~30% a ~15-19% en el escalón 3). Es LA hipótesis a medir en el piloto — y mientras no esté medida, la cobertura exigida no debería bajar de ~85-90% en ningún escalón.

**3. El fiador con tarjeta es a la vez el activo y el agujero del modelo.** Evidencia a favor: en EEUU el 94% de los préstamos estudiantiles privados se originan con cosigner; la evidencia causal muestra que el cosigner **reduce el default** (resuelve selección adversa). Evidencia en contra: en Argentina el desconocimiento de cargos a tarjeta es el reclamo #1 ante el BCRA y se resuelve **a favor del tarjetahabiente en 83-86% de los casos**. Si el recupero efectivo `r` baja de 80% a 50%, el libro pasa de +16% a −9%/año. El chargeback es el talón de Aquiles: se mitiga con mandato de débito expreso, 3DS al onboarding, aviso 72h antes del cargo, y la fianza firmada como cobertura legal cuando el cargo se revierte. Medir `r` real es el KPI #1 del piloto.

**4. El pricing actual deja al senior sin margen.** Con 0% al estudiante y 7% al comercio, el pool rinde ~9%/año con mora 30%: el senior al 8% cobra justo y el junior queda en ~11% (fino para ser primera pérdida). Con un interés de 6% al estudiante (costo real ~4,2% vs ~29% en MP — sigue siendo 7× más barato), el libro rinde ~16%/año, el senior cobra holgado y el junior gana ~38%. Alternativa: subir el fee al comercio a 9-10% (GOcuotas ya cobra 4,9-9,9% y paga a 22-65 días hábiles; nosotros pagamos al instante). Las dos palancas funcionan; la del interés estudiantil es más vendible que la del fee comercial.

**5. El timing regulatorio y de mercado es sorprendentemente bueno.** Cuota Simple murió en jun-2025; su reemplazo (Cuotas MiPyME) solo cubre MiPyMEs certificadas, cobra ~6,9% y paga a 10 días. GOcuotas cobra 4,9-9,9% y paga a 22-65 días hábiles. Nuestro 4,9% del precio con cobro instantáneo es el más barato verificado. Y Argentina es el mercado #1 del mundo en adopción de stablecoins (61,8% de la actividad cripto local) — el mejor lugar posible para un pool en USDC.

## Qué hay que cambiar (detalle completo en `04-cambios-rentabilidad.md`)

| # | Cambio | Por qué |
|---|---|---|
| 1 | Interés al estudiante: 0% → 6→3% por escalón (o fee comercio 7%→9%) | El pool no paga el senior con el esquema actual en tickets chicos |
| 2 | Split del fee del comercio: 5% pool + 2% empresa + servicing 5%/año + FX 1% | La empresa necesita revenue propio: origination + servicing + carry del junior |
| 3 | Cobertura del fiador no baja de 85-90% hasta medir mora por escalón | La escalera actual destruye el margen en los escalones altos |
| 4 | Libro sin fiador = solo junior, nunca senior (unitranche) | Con d≈30% el libro sin fiador pierde ~48-50%/año; es costo de adquisición acotado, no activo financiable |
| 5 | Cobro al fiador por DEBIN/CBU o USDC, no por tarjeta si se puede | La suscripción de tarjeta cuesta ~4,7% del cobro; DEBIN <1% |
| 6 | Cláusula anti-recargo en el contrato del comercio | Res. 51/2017: si el comercio traslada el costo al precio, no podés decir "sin interés" |
| 7 | Antifraude comercio×estudiante: KYC del comercio, tope por comercio, clawback | Es el riesgo que mató a Goldfinch; hoy no está mitigado en el modelo |
| 8 | Reserva de pérdidas (~10% del fee bruto) antes del junior + coverage ratio ≥20% invariante onchain | Estándar Centrifuge/Goldfinch; convierte la promesa del junior en invariante |

## Lo que NO hay que hacer

- No ofrecer el pool al público argentino (art. 19 Ley 21.526; el caso Belo/ARGt de mar-2026 confirmó que yield prometido = valor negociable). Senior solo a inversores calificados por oferta privada (RG 1016/2024+1088/2025) o no residentes.
- No poner plata de inversores en DeFi para rendimiento extra (zona gris fuerte). Plata propia del pool ocioso: sí, es legal y recomendado (Kamino/Jupiter ~4,5-6%).
- No custodiar cripto de usuarios sin registro PSAV (PN mínimo USD 35-150k + sujeto UIF). Mantener pagos self-custody.
- No prometer "sin interés" si el comercio puede recargar el precio financiado.

## Cómo se hizo este análisis

1. **Lectura del estado real:** `proyecto/` (validación, MVP, plan, pitch) + el programa Anchor (`ProtocolConfig`, `Plan`, tier params) para usar los parámetros que el código realmente ejecuta.
2. **4 workers de investigación en paralelo** (subagentes, cada uno con web_search/webfetch, todo dato con fuente y fecha): (a) mercado y competencia Argentina/LatAm, (b) marco legal argentino, (c) protocolos de crédito onchain y yield en Solana, (d) unit economics de BNPL públicos y privados.
3. **Modelo financiero propio** (`modelo-financiero.py`): flujos por actor, rendimiento del libro por esquema de precio, waterfall junior/senior con utilización parcial, P&L de la empresa a escala, break-evens y sensibilidades. Todo número de los documentos sale de ese script o de una fuente citada.
4. **Síntesis honesta:** lo verificado vs. lo supuesto está marcado en cada documento. Los tres supuestos que definen todo: mora `d`, recupero del fiador `r`, y si la mora cae por escalón. Ninguno está medido todavía — son los 3 KPIs del piloto.
