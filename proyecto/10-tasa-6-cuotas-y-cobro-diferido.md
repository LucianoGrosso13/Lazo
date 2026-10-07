# 10 — Tasa de 6 cuotas y tarifa del comercio por plazo de cobro en tramos

Fecha: 2026-10-07. Pedido de Luciano: "6 cuotas al 3 o 2%, hacé un análisis, fijate qué conviene y documentalo"; "solo 3 o 6 cuotas"; "si el comercio cobra a 30 días baja un % del 7, a 60 un poco más que a 30, y así"; "que se vaya liberando a medida que se van pagando las cuotas".

**Estado: Decidido 2026-10-07.** Política comercial adoptada para el protocolo (programa en devnet y mock). Respaldada por el análisis de sensibilidad y los supuestos de 08 (hipótesis de trabajo, no métricas históricas de Lazo). Los parámetros se configuran en `ProtocolConfig`.

## Resultado

| Decisión | Valor decidido | Por qué |
|---|---|---|
| Cuotas ofrecidas | **3 (sin interés) y 6 (con interés)**. Se saca 1 cuota | Pedido explícito. En 08 "1 cuota a 30 días" da margen negativo con cualquier ticket |
| Interés de 6 cuotas | **3% total sobre lo financiado** (no anual) | Ver § Interés. 2% y 2,5% dan positivo en caso base, pero 3% baja el punto de equilibrio a US$ 217 y cubre mejor un plazo que duplica la inmovilización de capital |
| Mínimo para 6 cuotas | **US$ 350** de precio de compra | Colchón de seguridad sobre el ticket de equilibrio de US$ 217 para clientes nuevos |
| Comisión comercio, cobro inmediato | **7%** sobre lo financiado (3 y 6 cuotas) | Referencia base vigente (06) |
| Cobro a 30 días | **6,25%** (1 tramo a 30 días) | Neutra con tramos: 6,10% (3 cuotas) / 6,13% (6 cuotas). Traslada ahorro sin subsidio |
| Cobro a 60 días | **5,75%** (2 tramos mensuales: 50% día 30, 50% día 60) | Neutra con tramos: 5,65% (3 cuotas) / 5,68% (6 cuotas). Se fijó 5,75% (en vez de 5,50%) porque al pagar 50% al día 30 la neutra sube a 5,65% |
| Cobro a 90 días | **5,25%** (3 tramos mensuales: ⅓ día 30, ⅓ día 60, ⅓ día 90) | Neutra con tramos: 5,23% (3 cuotas) / 5,24% (6 cuotas). El último tramo absorbe el redondeo |

Ejemplo, PC de 1.000 en Tier 1 · Starter (anticipo 300, financiado 700):

- **3 cuotas:** el comprador paga 1.000 (300 de anticipo + 3 × 233,33). El anticipo (300) se cobra siempre en el momento. Lo financiado neto (700 menos comisión) se paga según la opción elegida:
  - Hoy (7% = comisión 49): cobra 651 en el momento. Neto total comercio: **951,00**.
  - 30 días (6,25% = comisión 43,75): 1 tramo de 656,25 el día 30. Neto total comercio: **956,25**.
  - 60 días (5,75% = comisión 40,25): 2 tramos de 329,875 (día 30 y día 60). Neto total comercio: **959,75**.
  - 90 días (5,25% = comisión 36,75): 3 tramos de 221,083333 el día 30, 221,083333 el día 60 y 221,083334 el día 90. Neto total comercio: **963,25**.
- **6 cuotas al 3%:** interés 21, total comprador 1.021 (300 de anticipo + 6 cuotas de 120,166667 que suman 721). El comercio cobra exactamente el mismo calendario de tramos que en 3 cuotas: el interés del comprador remunera la mayor duración del préstamo para el pool, no reemplaza la comisión comercial.

## Modelo usado

Es el de `08-minorista-y-economia.md` § Economía reproducible por compra, con sus mismos supuestos hipotéticos: anticipo 30%, probabilidad de default 8% con 1 cuota pagada, recupero efectivo 80%, costo de capital 12% anual simple, arancel sobre recupero 5%, cobros 1% de P, rampa 0,5% de P, devoluciones/fraude 0,2% de P, K repetido 1,40 / nuevo 4,00. Script reproducible: [`research/modelo-tarifas-6-cuotas-y-diferido.py`](research/modelo-tarifas-6-cuotas-y-diferido.py). El script verifica primero mediante asserts que reproduce exactamente los números publicados en 08 (3/hoy/7%: m = 0,98384%, C(P=100) = −0,42; 6/hoy 9%/4%: m = 4,01742%).

`m` es el margen de contribución consolidado por unidad de precio; `C = P·m − K` por compra. **No es ganancia de la empresa ni rendimiento del pool**: el reparto D8 (4% originación + 2% anual de administración para Lazo) se aplica aparte y no crea ingreso consolidado.

## Interés de 6 cuotas: 2,5% vs 3%

6 cuotas, cobro inmediato al 7%:

| Interés | Margen (m) | US$ 1.000, cliente que repite | Escenario malo | Un cliente nuevo da ganancia desde |
|---|---:|---:|---:|---:|
| 2,5% | 1,50% | +13,59 | −57,47 | US$ 267 |
| **3%** | **1,84%** | **+17,04** | **−54,28** | **US$ 217** |

Sensibilidad extendida (6 cuotas, cobro hoy, 7%):

| Interés total | m | C P=300 rep / nuevo | C P=1.000 rep / nuevo | Ticket de equilibrio rep / nuevo | Interés pagado comprador (P=1.000) |
|---|---:|---:|---:|---:|---:|
| 0% | −0,22% | −2,07 / −4,67 | −3,63 / −6,23 | no existe | 0 |
| 2% | 1,15% | +2,06 / −0,54 | +10,15 / +7,55 | 121 / 346 | 14 |
| 2,5% | 1,50% | +3,10 / +0,50 | +13,59 / +10,99 | 93 / 267 | 17,50 |
| **3%** | **1,84%** | **+4,13 / +1,53** | **+17,04 / +14,44** | **76 / 217** | **21** |
| 4% | 2,53% | +6,20 / +3,60 | +23,92 / +21,32 | 55 / 158 | 28 |

Referencia: 3 cuotas / hoy / 7% → m = 0,98%, C(P=1.000) = +8,44.

Estrés (6 cuotas, hoy, 7%, compra repetida P=1.000), mismos escenarios que 08:

| Escenario (d / r / h) | i = 2,5% | i = 3% | 3 cuotas (referencia) |
|---|---:|---:|---:|
| Favorable (2% / 95% / 8%) | +32,46 | +35,96 | +21,31 |
| Base (8% / 80% / 12%) | +13,59 | +17,04 | +8,44 |
| Adverso (20% / 50% / 20%) | −57,47 | −54,28 | −42,51 |

### Por qué 3% y mínimo de US$ 350

1. **Equilibrio de adquisición:** un cliente nuevo cuesta US$ 4,00 en CAC y KYC. Con 2,5%, el ticket mínimo para que un cliente nuevo no dé pérdida es de US$ 267. Con 3%, ese umbral baja a **US$ 217**.
2. **Colchón de US$ 350:** fijar el precio mínimo para 6 cuotas en **US$ 350** asegura que cualquier primera compra supere con holgura el umbral de rentabilidad de US$ 217, cubriendo desviaciones operativas o retrasos de cobro.
3. **Costo imperceptible para el comprador:** sobre una compra de US$ 700 financiados a 6 meses, el 3% representa apenas US$ 21 totales (US$ 3,50 por mes), significativamente inferior a cualquier opción del mercado sin tarjeta y con transparencia total.

## Cobro en tramos mensuales

### 1. Mecánica de tramos

En el esquema original de liquidación diferida (bullet), el comercio cobraba el 100% al vencimiento final (por ejemplo, a los 90 días). Ningún comercio de ticket alto aceptaría esperar 3 meses completos por una venta de hoy.

Con la modalidad de **cobro en tramos mensuales**:
- El anticipo se transfiere inmediatamente al comercio el día 0.
- Lo financiado neto (`A − F`) se divide en tramos iguales con fechas fijadas:
  - **Hoy (0 días):** 100% al abrir (t=0).
  - **30 días:** 100% el día 30 (1 tramo).
  - **60 días:** 50% el día 30 y 50% el día 60 (2 tramos mensuales).
  - **90 días:** ⅓ el día 30, ⅓ el día 60 y ⅓ el día 90 (3 tramos mensuales; el último tramo absorbe el redondeo).

Lazo **garantiza contractualmente cada tramo en su fecha**, pague o no el estudiante.

### 2. Fórmula de exposición con tramos ($W$)

En cada mes $j$ (días $30j$ a $30(j+1)$), la exposición de capital que el pool adelanta al comercio (como fracción de $A$) se calcula comparando lo desembolsado acumulado al comercio contra lo cobrado acumulado al estudiante:

$$\text{Exposición}_j = \max\left(\text{desembolsado}_j \times (1 - c) - \frac{j}{n}, 0\right)$$

En el escenario de mora ($d$), el estudiante solo paga hasta la cuota $k$ ($k=1$), y la recuperación ocurre tras el vencimiento final:

$$W = (1 - d) \times 30 \sum_{j=0}^{n-1} \max\left(\text{desemb}_j(1-c) - \frac{j}{n}, 0\right) + d \times 30 \sum_{j=0}^{n+1} \max\left(\text{desemb}_j(1-c) - \frac{\min(j, k)}{n}, 0\right)$$

### 3. Por qué con tramos alineados Lazo casi no adelanta capital

Observemos qué ocurre en 3 cuotas a 90 días con tramos mensuales:
- **Día 0:** El pool desembolsa 0 al comercio (el anticipo fue directo del comprador). Exposición = 0.
- **Día 30:** El estudiante paga la cuota 1 ($33,33\%$ de $A$). El pool libera el tramo 1 al comercio ($31,58\%$ de $A$, descontada la comisión del 5,25%). El ingreso del estudiante financia el pago al comercio.
- **Día 60:** El estudiante paga la cuota 2 ($33,33\%$). El pool libera el tramo 2 ($31,58\%$).
- **Día 90:** El estudiante paga la cuota 3 ($33,33\%$). El pool libera el tramo 3 ($31,58\%$).

En el escenario normal (92% de los casos), la exposición de capital del pool es **cero**. Los días-capital de inmovilización ($W$) se reducen drásticamente de 57,4 días (cobro hoy) a apenas **3,7 días** (originados exclusivamente en el 8% de mora donde el estudiante se atrasa pero Lazo cumple su garantía al comercio).

### 4. Comisiones neutras vs. propuesta adoptada

La comisión neutra es aquella que deja a Lazo con exactamente el mismo margen consolidado que el cobro inmediato al 7%:

| Plazo | Tramos | Neutra 3 cuotas | Neutra 6 cuotas (3%) | Propuesta adoptada | Margen resultante (3 cuotas / 6 cuotas) |
|---|---|---:|---:|---:|---:|
| Hoy | Inmediato | 7,00% | 7,00% | **7,00%** | 0,98% / 1,84% |
| 30 días | 1 tramo (día 30) | 6,10% | 6,13% | **6,25%** | 1,09% / 1,93% |
| 60 días | 2 tramos (50% d30, 50% d60) | 5,65% | 5,68% | **5,75%** | 1,06% / 1,89% |
| 90 días | 3 tramos (⅓ d30, ⅓ d60, ⅓ d90) | 5,23% | 5,24% | **5,25%** | 0,99% / 1,85% |

**Por qué 5,75% y no 5,50% a 60 días:**
En el modelo diferido anterior (un solo pago al día 60), la neutra era 5,51%. Pero al pagar en tramos (50% liberado ya al día 30), el pool devuelve capital antes, por lo que la comisión neutra sube a **5,65%**. Si mantuviéramos 5,50%, Lazo estaría subsidiando al comercio. Al fijar **5,75%**, se preserva el principio de no subsidio, se traslada un descuento atractivo al comercio (1,25 puntos menos que cobrar hoy) y se asegura que todas las opciones cubran la tarifa de originación de Lazo del 4%.

### 5. Modelo "compromiso en la cadena + chequeo de liquidez"

Durante el diseño se evaluaron dos arquitecturas para garantizar el cobro al comercio:

1. **Bóveda bloqueada desde el día 1 (escrow dedicado):**
   Apartar y congelar los fondos del pago al comercio en un contrato escrow desde el momento de la compra.
   *Por qué se descartó:* Si el capital se inmoviliza en una bóveda el día 1, el pool ya no puede utilizarlo para originar otros planes ni generar rendimientos. El costo de capital para el protocolo sería exactamente el mismo que si se hubiera desembolsado el día 1. No existiría ningún ahorro de capital real y, por lo tanto, no habría justificación económica para ofrecerle un descuento de comisión al comercio (el 5,25% sería deficitario).

2. **Compromiso en la cadena + chequeo de liquidez (modelo adoptado):**
   - Al originar el plan, se registra en una cuenta onchain (`PayoutSchedule`) el calendario público e inmutable de tramos a favor del comercio.
   - El dinero permanece en el pool de liquidez, rotando y financiando operaciones mientras no llega la fecha del tramo.
   - En cada fecha de vencimiento, cualquier agente (el keeper de Lazo o el propio comercio invocando `release_payout`) puede gatillar la liberación de los fondos hacia el comercio.
   - **Garantía de solvencia:** Para que el compromiso sea 100% creíble y a prueba de corridas, el protocolo exige que `open_plan` verifique:
     $$\text{pool.liquid} \ge \text{desembolso\_hoy} + \sum \text{tramos\_comprometidos\_pendientes}$$
     Si la liquidez libre del pool no cubre el compromiso futuro, el protocolo bloquea la apertura de nuevos planes (`pool_liquidity`) hasta que ingresen cuotas o liquidez.

## Cobertura de la fianza

- **Fiador obligatorio:** Sin fiador activo y verificado no se abre ningún plan (eliminados los tiers sin fiador).
- **Alcance de la cobertura:** El fiador garantiza el **100% de capital financiado + interés contractual** que quede pendiente de pago.
- **Punitorios:** Los recargos punitorios por mora quedan fuera de la fianza del fiador (se exigen solo al estudiante).
