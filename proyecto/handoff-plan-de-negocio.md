# Handoff — plan de negocio (6/10/2026)

Sesión del 2026-10-06. Pedido del equipo: leer todo `proyecto/`, ver qué tan viable es Lazo y armar un plan de negocio completo (rentabilidad, ideas nuevas, flujos de caja y plan por actor). **No se tocó código, landing ni pitch:** el equipo pidió esperar a definir el esquema de precios.

## Qué se hizo

- Se leyó todo: `02-validacion.md` (rondas 1-4, Q15-Q16 y el addendum del 6/10), `research/a-f`, `03-mvp.md`, `PRODUCT.md`, `05-pitch.md` y los 7 archivos de `06-viabilidad/`.
- **Se encontró un error en `06-viabilidad/modelo-financiero.py`:**
  - El desembolso del pool contaba dos veces el fee de la empresa: daba 679 en vez de 665 en la PC de US$1.000.
  - El servicing no se le descontaba al pool.
  - Con la corrección, el esquema B pasa de 16% a **21%/año** con mora del 30%. El esquema A (el actual) queda igual: 9,3%.
- Se creó `proyecto/07-plan-de-negocio/`:
  - `plan-de-negocio.md`: el documento principal, con 15 secciones.
  - `modelo-v2.py`: el modelo corregido y extendido. Usa solo la librería estándar de Python. Se corre con `python3 modelo-v2.py`.
  - `salida-modelo-v2.md`: la salida del modelo.
- Un agente investigó en la web las ideas adyacentes. Lo que encontró está en `plan-de-negocio.md` §10.1, con fuentes y marcado como P/S/SIN VERIFICAR.
- Se agregó en `04-plan.md` (sección Estado) una línea que apunta al plan.

## Conclusiones clave

1. Con los precios de hoy (0% al estudiante, 7% del comercio todo al pool), el libro rinde 9,3%, el senior queda justo y la empresa gana US$0.
2. **Recomendación: "el comercio elige".**
   - Modo sin interés (H1): el estudiante paga 0% y el comercio 10% de lo financiado, que es 7% del precio.
   - Modo con costo (H2): el estudiante paga 8% y el comercio 3%.
   - Libro: 13,7-15,3% con mora del 30%.
   - Alternativa: el esquema B, si se prefiere un solo modo.
3. La empresa gana poco por plan solo con fees. La plata está en **poner el junior** (el pool rinde ~17,5% en régimen estable y el junior ~55%).
4. La escalera actual pierde plata en los escalones altos. Se propone una **escalera v2 con pisos** (anticipo ≥10%, cobertura ≥90%) que se afloja con datos. "La fianza baja con el escalón" no es cierto en ninguna de las dos.
5. El riesgo #1 es cuánto se le recupera de verdad al fiador (`r`). Recomendación: **DEBIN o CBU** como medio principal para cobrarle y la tarjeta como respaldo.
6. Ronda semilla en escenario: ~US$430-490k para 18 meses. El caso de estrés (mora 40%, recupero 65%) no llega al equilibrio.

## Qué falta (en orden)

1. **El equipo responde las decisiones D1-D7** (`plan-de-negocio.md` §14):
   - D1: esquema de precios.
   - D2: escalera.
   - D3: medio de cobro al fiador.
   - D4: quién pone el junior.
   - D5: qué hacer con el tramo sin fiador.
   - D6: si 6 cuotas va al roadmap.
   - D7: qué ideas van al pitch.

   Archivos mínimos para decidir: `plan-de-negocio.md` §1, §3, §4, §6.2 y §14, más `02-validacion.md` (Q15-Q16 y el addendum).
2. Con las decisiones tomadas:
   - Registrar la Q17 y la escalera en `02-validacion.md`.
   - Corregir la cifra de "16%" en `06-viabilidad/` (salida, flujos, resumen, investor paper) o apuntar al v2.
   - Actualizar `PRODUCT.md` y `AGENTS.md`: la línea "el comercio paga 7% sobre lo financiado".
3. Landing y demo, con la checklist de `plan-de-negocio.md` §13.1:
   - Modos en el checkout.
   - Selector de modo en el panel del comercio.
   - Senior, junior y reserva separados en el panel del pool.
   - Textos del fiador.
   - Los parámetros nuevos van en `ProtocolConfig`, nada hardcodeado.
4. Pitch y video para Superteam (§13.2): bloque de negocio nuevo, con la propuesta en inglés en el documento.
   - **Antes de grabar:** confirmar desde una cuenta de vendedor lo que cobra Mercado Pago por 3 cuotas sin interés. Las fuentes no coinciden (~10%+IVA, 12,49% o 3-5%), y el 12,49% está en la landing y en el guion.
5. Bonus de Superteam (a confirmar en el listing): registrar con fecha los testers de afuera del equipo y documentar la matrícula y el aporte de cada integrante.

## Reglas que siguen vigentes

Solo devnet. No inventar métricas ni usuarios: todo lo del plan es escenario. No tocar código hasta que el equipo decida el esquema de precios.

## Addendum (6/10, más tarde)

- **Precio del comercio:** se agregó `plan-de-negocio.md` §3.4, que compara contra el banco y Mercado Pago con una tabla de Google modo IA, **sin verificar**. Recomendación: modo sin interés en **9% del precio + IVA al instante** ("precio de banco, velocidad de MP"), o 7% cobrando a 30 días. Sumado a D1. Los números están en `modelo-v2.py` §1b; `salida-modelo-v2.md` se regeneró y el resto de la salida no cambió.
- **Ojo:** "Lazo hoy" es 7% **de lo financiado** = 4,9% del precio. El 7% del precio es el H1 propuesto.
- **Integración:** nuevo `07-plan-de-negocio/integracion-y-flujo-del-dinero.md`. Explica sin app ni Posnet: QR, link, botón, USDC en Solana y pesos en los bordes. Tiene diagramas Mermaid y marca qué está hecho, simulado o en roadmap.
- **La empresa gana por sí misma** (`plan-de-negocio.md` §7.3 y D8): originación del 4% de lo financiado + administración del 2%/año = **US$26 por plan sin poner capital**. Llega al equilibrio mensual en el mes 15. Lazo pone 25-50% del junior para alinearse con los inversores. Con este reparto, el modo con costo sube al 3,5% del precio para el comercio. Está en `modelo-v2.py` §8.
- **Gráficos:** `graficos.py` genera 8 SVG en `07-plan-de-negocio/graficos/`: precio, reparto de la comisión, empresa por plan, empresa mensual y acumulada, tramos según mora y recupero, y comparación de rendimientos. Están embebidos en `plan-de-negocio.md` §16.
- **Pitch del negocio:** nuevo `07-plan-de-negocio/pitch-negocio.md`, que se lee en 5 minutos, con 7 gráficos `graficos/pitch-*.svg`.
  - Responde tres dudas del equipo: por qué Lazo se queda con ~3,4% de cada venta (como Klarna 2,7% y Affirm 4,0%), por qué el junior gana más que el senior, y qué pasa si los inversores quieren retirar.
  - Agrega cuándo la empresa es rentable (mes 13, ~450 planes por mes) y cuánta plata hace falta (~US$280k con 25% del junior propio).
  - Las reglas de liquidez quedaron en `plan-de-negocio.md` §9.1 y D9. El modelo agregó la §9.

## Addendum 2 (6/10): respuestas del equipo

- **D8 decidida:** Lazo cobra 4% + 2%/año y no se sube. Lo que se recupera de la mora queda en el pool.
- **Mora:** se aclaró que el modelo no supone "no cobrar nada". Supone que al fiador se le cobra el 80%; cobrarle 0% sería una pérdida de US$140 por PC (`salida-modelo-v2.md` §10).
- **Fiador (regla del equipo):** se le cobra directo a la tarjeta y no la puede sacar con planes activos → recupero esperado de 90-95%, a medir. Quedó en `plan-de-negocio.md` §6.2.
- **Precio al comercio:** al equipo el 9% le parece mucho. Nueva recomendación: lanzar a 8% y bajar a 7% (o 6%) con datos de recupero (§3.4 y D1). Los gráficos de rentabilidad de la empresa siguen con la base conservadora de 9% y recupero 80%; la empresa cobra lo mismo con cualquier precio.
- **Senior/junior:** mejor explicado en `pitch-negocio.md` §5. Hay una opción B (senior con 8% + 20% del excedente), en D11. El junior pasa a 6 meses y puede vender su parte (§9.1, D9).
- **Varios planes a la vez:** propuesta 1-1-2-3 por escalón con tope de exposición. **A decidir (D10)**, no es una regla todavía.
- **Gráficos nuevos:** `pitch-8-estructuras-senior.svg` y `pitch-9-precio-vs-recupero.svg`. El modelo agregó la §10.
