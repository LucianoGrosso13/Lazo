# 10 — Tasa de 6 cuotas y tarifa del comercio por plazo de cobro

Fecha: 2026-10-07. Pedido de Luciano: "6 cuotas al 3 o 2%, hacé un análisis, fijate qué conviene y documentalo"; "solo 3 o 6 cuotas"; "si el comercio cobra a 30 días baja un % del 7, a 60 un poco más que a 30, y así".

**Estado: valores provisionales para la demo mock (devnet), no tarifas comerciales aprobadas.** Salen de un modelo con supuestos hipotéticos; ninguno es una métrica medida de Lazo. Cambian en la config del protocolo, no en el código.

## Resultado

| Decisión | Valor provisional | Por qué |
|---|---|---|
| Cuotas ofrecidas | **3 (sin interés) y 6 (con interés)**. Se saca 1 cuota | Pedido explícito. Además, en 08 "1 cuota a 30 días" da margen negativo con cualquier ticket |
| Interés de 6 cuotas | **3% total sobre lo financiado** (no anual) | Ver § Interés. 2% también da positivo en el caso base, pero con poco colchón para un plazo que duplica el capital inmovilizado |
| Comisión comercio, cobro inmediato | **7%** sobre lo financiado (3 y 6 cuotas) | Referencia vigente (06) |
| Cobro a 30 días | **6,25%** | Traslada al comercio el ahorro de capital, sin subsidio |
| Cobro a 60 días | **5,5%** | Ídem |
| Cobro a 90 días | **5,25%** | Ídem; el ahorro marginal se achica porque en 3 cuotas casi todo el capital ya volvió |

Ejemplo, PC de 1.000 en escalón 0 (anticipo 300, financiado 700):

- **3 cuotas:** el comprador paga 1.000 (300 + 3 × 233,33). Comercio neto: hoy 951 · 30 días 956,25 · 60 días 961,50 · 90 días 963,25.
- **6 cuotas al 3%:** interés 21, total 1.021 (300 + 6 cuotas que suman 721). El comercio cobra lo mismo que en 3 cuotas según el plazo que elija: la comisión no se reemplaza por el interés del comprador (09).

## Modelo usado

Es el de `08-minorista-y-economia.md` § Economía reproducible por compra, con sus mismos supuestos hipotéticos: anticipo 30%, probabilidad de default 8% con 1 cuota pagada, recupero efectivo 80%, costo de capital 12% anual simple, arancel sobre recupero 5%, cobros 1% de P, rampa 0,5% de P, devoluciones/fraude 0,2% de P, K repetido 1,40 / nuevo 4. Script reproducible: [`research/modelo-tarifas-6-cuotas-y-diferido.py`](research/modelo-tarifas-6-cuotas-y-diferido.py). El script verifica primero que reproduce los números publicados en 08 (3/hoy/7%: m = 0,98384%, C(P=100) = −0,42; 6/hoy 9%/4%: m = 4,01742%).

`m` es el margen de contribución consolidado por unidad de precio; `C = P·m − K` por compra. **No es ganancia de la empresa ni rendimiento del pool**: el reparto D8 (4% originación + 2% anual de administración) se aplica aparte y no crea ingreso consolidado.

## Interés de 6 cuotas: 2% vs 3%

6 cuotas, cobro inmediato al 7%:

| Interés total | m | C P=300 rep / nuevo | C P=1.000 rep / nuevo | Ticket de equilibrio rep / nuevo | Interés que paga el comprador (P=1.000) |
|---|---:|---:|---:|---:|---:|
| 0% | −0,22% | −2,07 / −4,67 | −3,63 / −6,23 | no existe | 0 |
| **2%** | 1,15% | +2,06 / −0,54 | +10,15 / +7,55 | 121 / 346 | 14 |
| **3%** | 1,84% | +4,13 / +1,53 | +17,04 / +14,44 | 76 / 217 | 21 |
| 4% (sensibilidad de 06) | 2,53% | +6,20 / +3,60 | +23,92 / +21,32 | 55 / 158 | 28 |

Referencia: 3 cuotas / hoy / 7% → m = 0,98%, C(P=1.000) = +8,44.

Estrés (6 cuotas, hoy, 7%, compra repetida P=1.000), mismos escenarios que 08:

| Escenario (d / r / h) | i = 2% | i = 3% | 3 cuotas (referencia) |
|---|---:|---:|---:|
| Favorable (2% / 95% / 8%) | +28,97 | +35,96 | +21,31 |
| Base (8% / 80% / 12%) | +10,15 | +17,04 | +8,44 |
| Adverso (20% / 50% / 20%) | −60,67 | −54,28 | −42,51 |

Lectura:

1. **Sin interés, 6 cuotas pierde plata** con estos supuestos: el capital queda inmovilizado ~100 días-equivalentes contra ~57 de 3 cuotas.
2. **2% alcanza en el caso base**, pero apenas supera el margen de 3 cuotas por compra financiada mientras duplica el plazo, y una compra nueva de 300 queda negativa.
3. **3% es la recomendación provisional:** casi duplica el margen de 3 cuotas para cubrir el plazo más largo, deja positivas las compras nuevas desde ~217 y para el comprador sigue siendo un costo bajo y fácil de explicar (21 sobre 700 financiados en seis meses).
4. **Ninguna tasa salva el escenario adverso.** Los topes, el fiador al 100% (que no garantiza el recupero) y la validación con cohortes reales importan más que elegir entre 2 y 3 puntos.

## Tarifa por plazo de cobro: cómo se calculó

Para cada plazo, la tarifa "neutra" es la que deja a Lazo con **el mismo margen que el cobro inmediato al 7%**: el comercio recibe exactamente el ahorro de capital que genera esperar, y no hay subsidio. Se resolvió por bisección con el modelo de 08.

| Plazo de cobro | Neutra 3 cuotas | Neutra 6 cuotas (2% o 3%) | Propuesta | Margen con la propuesta, 3 / 6 cuotas (3%) |
|---|---:|---:|---:|---:|
| Hoy | 7,00% | 7,00% | **7%** | 0,98% / 1,84% |
| 30 días | 6,10% | 6,13% | **6,25%** | 1,09% / 1,93% |
| 60 días | 5,51% | 5,40% | **5,5%** | 0,98% / 1,92% |
| 90 días | 5,21% | 4,80% | **5,25%** | 1,01% / 2,17% |

La propuesta redondea a cuartos de punto, una sola escala para 3 y 6 cuotas, sin quedar por debajo de la neutra (salvo 0,01 punto a 60 días en 3 cuotas, despreciable). Todas cubren el 4% de originación D8. No se adoptan los "−2/−4 puntos" del plan histórico: con originación de 4%, una comisión de 3% no paga ni esa partida (09).

**Supuesto fuerte heredado de 08:** en el cobro diferido Lazo garantiza pagar al comercio en la fecha elegida y absorbe el riesgo de crédito aunque el comprador se atrase. Si el comercio cobrara solo cuando paga el estudiante, sería otro producto. Las cobranzas anteriores a la fecha de cobro quedan reservadas para esa obligación.

## Pendientes

- Validar costo de capital, default y recupero con datos reales; recalcular por escalón (con 0% de anticipo cambia todo).
- Decidir si el anticipo también se difiere o se cobra en el momento (en la demo: se cobra en el momento).
- Política de devoluciones antes y después de la fecha de cobro; reservas de liquidez contra obligaciones con fecha.
- Techo de la fianza con interés y punitorios (la cobertura al 100% es sobre el capital).
- Implementación onchain: el programa sigue con 3 cuotas, cobro inmediato y cobertura 100/90/80/70. Estas opciones existen solo en el mock.
