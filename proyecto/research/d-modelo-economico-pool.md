# D — Modelo económico del pool y stress test

Investigación del 03/10/2026. Modelo propio construido sobre los parámetros del proyecto; cada dato externo lleva URL y fecha. Lo no confirmado contra fuente primaria está marcado **SIN VERIFICAR**. Todas las cifras del modelo son resultados del cálculo explícito mostrado, no datos de mercado.

## Resumen ejecutivo (5 bullets)

- **El modelo solo se sostiene con fiador.** Con d=30% (la mora de referencia: préstamos personales de PNFC 34,1% feb-2026, BCRA), el libro con-fiador efectivo (r=80%) rinde ~**+20%/año** reciclando capital cada 3 meses; el mismo libro **sin fiador pierde ~48%/año**. Break-even de mora: sin fiador 14%; fiador r=50% 26%; fiador r=80% 58% (y aguanta ≥10%/año hasta d≈44%).
- **Sí existe combinación ≥10%/año con d=30% y costo al estudiante muy por debajo de MP — pero exige que el fiador cubra ≥~74% del capital desplegado.** Con i=8–12% sobre lo adelantado, c=1,5–2% al comercio y r≥60–80%, el estudiante paga 4–7% real sobre el precio (vs ~29% real en MP). **Sin fiador no existe combinación honesta:** requiere i≥29%, que implica costo ~14,5% real y una TNA-equivalente ~116–170%, dentro del rango publicado de MP — deja de ser "muy más barato".
- **La comisión al comercio casi no mueve la aguja.** Pasar c de 1,5% a 3% baja el i mínimo requerido solo ~1 p.p.; la variable decisiva es el recupero del fiador (f·r), seguida de i. El anticipo no cambia el rendimiento porcentual del capital — cambia el costo real del estudiante (surcharge = i·(1−a)) y acota la pérdida absoluta por plan.
- **Benchmarks USDC Solana (03/10/2026):** Jupiter Lend ~4,9–5,1%, Kamino Lend ~5,9–6,3%, Kamino vaults 5,6–12%, Huma PST ~7,7–8%. Nuestro pool con-fiador al 14–20% esperado paga prima real sobre PST, pero un senior al 8% con colchón junior del 20% es lo vendible; el junior (equipo/sponsor) captura +36% a +103%/año según mora y absorbe la primera pérdida.
- **Tabla MVP recomendada:** anticipo 50/30/15/0%, topes US$75→500 sin fiador y US$150→750 con fiador, i=15%→10% sin fiador / i=10%→6% con fiador, c=1,5% sobre lo adelantado, punitorio moderado ≤+50% sobre cuota vencida, tramo junior ≥20% + reserva 10%. El tramo sin-fiador se vende como **costo de adquisición acotado** (tope chico), no como centro de ganancia.

---

## 1. El modelo

### 1.1 Parámetros

| Símbolo | Qué es | Valor base |
|---|---|---|
| P | Precio de la compra (USDC) | 150 |
| a | Anticipo del estudiante al comercio, en t=0 | 50% |
| A = P·(1−a) | Monto adelantado por el pool | 75 |
| c | Comisión al comercio sobre A (el comercio cobra P − c·A hoy) | 1,5% |
| i | Interés total al estudiante sobre A, en 3 cuotas iguales | 10% |
| q = A·(1+i)/3 | Cuota mensual (meses 1, 2 y 3) | 27,50 |
| d | Probabilidad de default (pérdida final del plan, no solo atraso) | 10–35% |
| k | Cuotas pagadas en promedio antes de defaultear | 1 (supuesto) |
| f | % de planes con fiador (tarjeta registrada) | 0–100% |
| r | Recupero del fiador sobre el saldo impago | 50% / 80% |
| π | Costo de procesar el cobro a la tarjeta del fiador | 5% (**SIN VERIFICAR**: procesadores AR ~3–6%+IVA) |
| κ | Costo fijo por plan (KYC amortizado + gas/rent + ops) | US$1 |

**Fórmulas.**

```
Cuota                 q = A·(1+i)/3
Impago tras default   U = (3−k)·q
Recaudo esperado      E = (1−d)·3q + d·[ k·q + f·r·(1−π)·U ]
Capital desplegado    K = A·(1−c)
Ganancia por plan     G = E − K − κ
Retorno por plan      R_3m = G / K
Anualizado (4 ciclos) R_an ≈ 4·R_3m      [simple]
                      R_an = (1+R_3m)^4 − 1   [compuesto]
Costo real estudiante = P·[1 + i·(1−a)]  →  surcharge = i·(1−a)
```

Notas:

- **Anticipo:** entra al modelo solo vía A=P(1−a). No cambia R_3m porcentual (la exposición escala con A) pero sí el costo del estudiante y el daño absoluto por default. Hipótesis no modelada (**SIN VERIFICAR**): el anticipo + KYC + tope chico reducen d en el tramo sin fiador (filtra fraude puro); si es cierto, los resultados sin fiador mejoran mucho.
- **d se interpreta como pérdida final** (plan incobrable). La referencia BCRA (34,1% feb-2026) es *irregularidad*, que incluye morosos que después curan; PayJoy reportó 80–98% de retoma de pagos tras una mora. Tratar irregularidad=pérdida es **conservador**; punitorios y curas quedan como colchón no modelado.
- **Anualización:** 4 ciclos/año sobre capital comprometido K es el número conservador. Como las cuotas devuelven capital mes a mes, la TIR money-weighted es mayor: en el caso fiador r=80%, i=10%, d=30% → **TIR ~27%/año** vs 20% del ×4.

### 1.2 Costos unitarios (κ ≈ US$1/plan)

| Concepto | Costo | Fuente |
|---|---|---|
| KYC Didit (bundle + RENAPER) | US$0,53 por usuario nuevo; **US$0 en piloto** (500 verif./mes gratis) | didit.me/pricing, docs.didit.me (consultado 03/10/2026) |
| Gas Solana | 5.000 lamports/firma × ~5 tx ≈ US$0,003 | solana.com/docs/core/fees (consultado 03/10/2026) |
| Rent ATA + cuenta Plan | ~0,002 SOL ≈ US$0,24 (SOL≈US$119) | exa.ai/Fazen, SOL 118–120 al 01–03/10/2026 |
| Rampa ARS↔USDC | Bitso: depósito USDC-Solana gratis, retiro ~US$0,21; spread estimado 0,5–1% por lado — **SIN VERIFICAR** | bitso.com/fees/transactions (consultado 03/10/2026) |
| κ consolidado | **US$1/plan** (conservador; incluye keeper/RPC y amortización KYC a ~2 planes/usuario) | — |

La rampa la pagan estudiante y comercio, no el pool, pero **suma ~1–2% al costo real del estudiante** — hay que contarla al comparar contra MP.

### 1.3 Ejemplo trabajado

Compra P=US$150, escalón 0, a=50%, i=10%, c=1,5%:

- Estudiante: anticipo 75 hoy + 3 cuotas de 27,50 → paga **157,50** (+5% sobre contado; MP ≈ +29% real).
- Comercio: cobra hoy 75 + 75·(1−0,015) = **148,88**; fee pool = 1,12.
- Pool: K=73,88 desplegados; κ=1.

| d | E[recaudo] | G | R_3m | Anual ×4 |
|---|---|---|---|---|
| 0% (sin fiador) | 82,50 | +7,62 | +10,3% | +41% |
| 10% (sin fiador) | 81,51* | +2,9% plan | +2,9% | +12% |
| 30% (sin fiador) | 66,00 | −8,88 | −12,0% | **−48%** |
| 30% (fiador r=80%) | 78,54 | +3,66 | +5,0% | **+20%** |

\* E[recaudo] con d=10% sin fiador = 0,9·82,5 + 0,1·(1·27,5) = 77,0 → G = 77,0 − 73,88 − 1 = +2,15 → R_3m = +2,9%.

## 2. Stress test

Parámetros fijos: P=150, a=50% (A=75), i=10%, c=1,5%, k=1, κ=US$1, π=5%. Celda = retorno 3 meses / anualizado ×4.

| Mora d | Sin fiador | Fiador r=50% (f=100%) | Fiador r=80% (f=100%) | Mixto f=50%, r=60% |
|---|---|---|---|---|
| **10%** | +2,9% / **+12%** | +6,4% / **+26%** | +8,5% / **+34%** | +5,0% / **+20%** |
| **20%** | −4,6% / **−18%** | +2,5% / **+10%** | +6,7% / **+27%** | −0,3% / **−1%** |
| **30%** | −12,0% / **−48%** | −1,4% / **−6%** | +5,0% / **+20%** | −5,6% / **−23%** |
| **35%** | −15,7% / **−63%** | −3,4% / **−13%** | +4,1% / **+16%** | −8,3% / **−33%** |

**Puntos de quiebre (i=10%, c=1,5%):**

| Escenario | d donde G=0 | d donde anual = +10% |
|---|---|---|
| Sin fiador | 14% | 11% |
| Fiador r=50% | 26% | 20% |
| Fiador r=80% | **58%** | **44%** |
| Mixto f=50% r=60% | 19% | 15% |

**Sensibilidad al momento del default k** (d=30%, mismo resto): con k=0,5 (media cuota pagada) el libro fiador r=80% da +14%/año y sin fiador −70%; con k=2, −3% y +31% respectivamente. El resultado "sin fiador no cierra" es robusto a cualquier k razonable.

**Sin fiador con i=15%** (precio máximo defendible para tier 0): d=10% → +30%/año; d=20% → ~0%; d=30% → −32%; d=35% → −47%. Ni i=25% salva d=30% (break-even ~29%). 

**Utilización:** si el 20% del pool queda ocioso en un vault USDC ~6%, el libro fiador r=80% rinde 17%/año con d=30% (vs 20% a utilización plena). El capital ocioso baja ~3 p.p. el rendimiento pero da liquidez para retiros.

## 3. ¿Existe la combinación? (d=30%, pool ≥10%/año, estudiante ≪ MP)

**i mínimo sobre A para ≥10%/año** (k=1, κ=1, π=5%, A=50 — el caso más duro por peso del costo fijo):

| Escenario | c=1,5% | c=2% | c=3% |
|---|---|---|---|
| Sin fiador | i ≥ 29,0% | 28,5% | 27,0% |
| f=50%, r=80% | 18,0% | 17,0% | 16,0% |
| f=100%, r=50% | 15,5% | 14,5% | 13,5% |
| f=100%, r=80% | **8,5%** | **8,0%** | **7,0%** |

Costo real del estudiante = i·(1−a). Con a=50%:

- **Con fiador dominante (f→100%, r≥60–80%): SÍ EXISTE.** i=8–12%, c=1,5–2% → 10–20%/año para el pool con costo estudiante de **4–7% real**, ~5× más barato que el ejemplo típico de MP (+29%) e incluso por debajo del mejor CFTEA publicado de MP (61%).
- **Zona intermedia (f≈50%, r≈80%):** existe con i≈16–18% → costo ~8–9% real, aún ~3,4× más barato que MP. Viable pero con margen fino: exige que la mitad de la cartera tenga fiador *y* que el recupero sea alto.
- **SIN fiador: NO EXISTE bajo la restricción "muy por debajo de MP".** i≥29% → costo ~14,5% real (la mitad de MP, no "muy por debajo") y TNA-equivalente implícita ~116–170%, dentro del rango publicado de MP (40–140%). Qué tendría que cambiar: (a) que d efectivo del tramo sin fiador resulte ≤15–20% (selección por anticipo+KYC+tope chico — **SIN VERIFICAR**, es la hipótesis a medir en el piloto); (b) aceptar ese tramo como pérdida acotada/costo de adquisición; (c) alguna garantía adicional (bloqueo del bien — sin base legal clara hoy, ver research/b); (d) exigir fiador para cualquier tope >US$75–100.

**Mezcla de cartera** (ocioso 10% al ~6%, sin-fiador i=15%, fiador-book i=10% r=80%, d uniforme 30%): el pool supera 10%/año solo si el **tramo con fiador ≥ ~74%** del capital desplegado (60% → +3%; 74% → +10,3%; 80% → +13,4%; 90% → +18,6%). Esta es la restricción de diseño más importante del modelo: **el fiador no es un feature, es la unidad económica**.

**Honestidad sobre la comparación con MP:** nuestra "tasa flat" equivale a TNA ~59% (i=10%), ~88% (i=15%), ~116% (i=20%) sobre saldo deudor — *dentro* del rango TNA de MP. El costo real termina muy por debajo porque el interés se aplica solo a la porción financiada (el anticipo baja la base) y porque se cobra en moneda dura con cuotas que se licúan contra salarios en pesos. La promesa correcta es "costo total 4–6× más barato", no "tasa baja".

## 4. Benchmarks y tramos

### 4.1 Rendimiento verificable de USDC en Solana (consultado 03/10/2026)

| Alternativa | Rendimiento | Riesgo | Fuente |
|---|---|---|---|
| Jupiter Lend USDC | ~4,9–5,1% APY | Money market sobrecolateralizado | defillama.com/yields/pool/d783c8df…, aprscope.com |
| Kamino Lend USDC | ~5,9–6,3% APY | Idem | defillama.com/yields/pool/ca537616…, /3cb152e8… |
| Kamino vaults USDC | ~5,6–12% APY | Estrategia/curador (Steakhouse 5,6%, Private Credit ~12%, ago-2026) | Kamino/DefiLlama (research/c) |
| Huma PST | ~7,7–8% APY | Crédito privado institucional (trade finance; "cero defaults" claim) | app.rwa.xyz/assets/PST (30D 7,72%), docs.huma.finance (8%), Blockworks H1-2026 (~8%) |
| **Nuestro pool (con-fiador, i=10%)** | **+16–20%/año esperado a d=30–35%** | Consumo sin garantía real, AR, modelo sin track record, smart contract | este documento |

### 4.2 Estructura junior/senior (junior j=20%, senior prometido s=8%)

| Escenario del activo (anual) | Senior | Junior |
|---|---|---|
| Libro fiador, d=20% (+27%) | +8% | **+103%** |
| Libro fiador, d=30% (+20%) | +8% | **+68%** |
| Libro fiador, d=35% (+16%) | +8% | **+48%** |
| Libro fiador, d≈45% (~+6%) | +8% | ~0% |
| Catástrofe sin fiador, d=30% (−48%) | **−35%** | **−100%** |

El tramo junior del 20% blinda el senior hasta que el rendimiento del activo cae a ~+6%/año (d≈45% en el libro con fiador). El inversor senior al 8% queda a la par de PST (~8%) pero con otro riesgo (consumo argentino vs trade finance institucional): elegible para quien busque diversificación; el rendimiento real para quien absorbe el riesgo está en el junior, que paga 48–103% según mora. **Un inversor racional no fondea el libro sin-fiador a ninguna tasa disponible** bajo d=30% — ese tramo lo pone el equipo/sponsor como primera pérdida o se estructura dentro del junior. Advertencia regulatoria (research/b): ofrecer el senior públicamente en Argentina es intermediación financiera (Ley 21.526) y custodia cripto (PSAV/CNV) — MVP = pool propio; pool abierto = roadmap regulado.

## 5. Tabla final de escalones recomendada (MVP)

| Escalón | Planes pagados | **Sin fiador** — anticipo / tope / i | **Con fiador** — anticipo / tope / i | Costo real estudiante |
|---|---|---|---|---|
| 0 | 0 | 50% / US$75 / **15%** | 30% / US$150 / **10%** | 7,5% / 7,0% |
| 1 | 1 | 30% / US$150 / **12%** | 20% / US$250 / **8%** | 8,4% / 6,4% |
| 2 | 2 | 15% / US$300 / **10%** | 10% / US$400 / **7%** | 8,5% / 6,3% |
| 3 | 3+ | 0% / US$500 / **10%** | 0% / US$750 / **6%** | 10% / 6,0% |

Parámetros fijos: c = **1,5% sobre lo adelantado** (compite con MP 1,35%+IVA y queda debajo del 3% de Yumi); punitorio ≤ +50% sobre la cuota vencida (marco CCyC/BCRA, research/b); KYC Didit obligatorio antes del primer plan; fiador = familiar con tarjeta registrada + cargo al default (r objetivo ≥80% bruto, ~76% neto de procesamiento); reserva de pérdidas 10% + tramo junior ≥20%.

Lectura del modelo para esta tabla:

- Escalones 0–1 **sin fiador son matemáticamente deficitarios** con d≈30%: se sostienen como costo de adquisición con tope muy chico (US$75–150) y como embudo hacia el fiador; si el piloto mide d_sinfiador≤20% pasan a ~break-even.
- El pool **productivo es el libro con-fiador** (i=10%→6% decreciente porque el fiador también mejora con el historial: a mayor reputación del estudiante, menor r necesario).
- Condición de operación: si la mezcla con-fiador cae <~74% del capital desplegado y d se confirma ≈30%, **subir i del tramo sin-fiador a 18–20%** (costo 9–10%, sigue ≪29% de MP) o subir topes solo a planes con fiador.
- El diferencial de precio (menos i y menos anticipo con fiador) es el incentivo de venta del fiador — el test de mesa ya mostró que "pedirle la tarjeta a un familiar" es el comportamiento existente (02-validacion.md).

## Fuentes

Datos de mercado y costos:

1. BCRA, Informe PNFC jun-2026 (irregularidad 26,9%; personales 34,1% feb-2026): https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/informe-proveedores-no-financieros-credito-junio-2026.pdf (jun-2026)
2. Mercado Libre — Cuotas sin Tarjeta, CFTEA 61%–388% publicado: https://www.mercadolibre.com.ar/mercado-credito (consultado 03/10/2026)
3. Informate Salta — caso real CFTEA 367,45% y simulación $100k (base del "+29% real en 3 cuotas" de research/a): https://informatesalta.com.ar/sociedad/ojo-al-cyber-monday--financiar-tus-compras-en-mercado-libre-puede-costarte-hasta-367--anual_a695d56ca583e69812800be5a (nov-2025)
4. Mercado Pago — costo QR Mercado Crédito 1,35%+IVA al instante: https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr (consultado 03/10/2026)
5. PayJoy/Mobile World Live whitepaper (default 13%→7%; 80–98% retoman pagos): https://assets.mobileworldlive.com/wp-content/uploads/2020/01/16120540/23667-MWL-Payjoy-whitepaper-1.pdf (~ene-2020)
6. Didit — pricing (500 gratis/mes; US$0,33 bundle; RENAPER US$0,20): https://didit.me/pricing/ y https://docs.didit.me/api-reference/database-validation/argentina/renaper (consultado 03/10/2026)
7. Solana — estructura de fees (5.000 lamports/firma): https://solana.com/docs/core/fees/fee-structure y https://solana.com/docs/core/fees (consultado 03/10/2026)
8. Precio SOL ~US$118–119: https://exa.ai/library/markets/crypto/SOL (01/10/2026) y https://fazen.markets/en/solana-holds-119-traders-slash-october-fed-rate-hike-odds (03/10/2026)
9. Bitso — fees (depósito USDC-SPL gratis, retiro ~US$0,21): https://bitso.com/fees/transactions (consultado 03/10/2026)
10. Ley 21.526 (intermediación financiera; arts. 1, 7, 19): https://www.argentina.gob.ar/normativa/nacional/ley-21526-16071/texto (consultado 03/10/2026)

Benchmarks de rendimiento USDC:

11. DefiLlama — Kamino Lend USDC (supply ~5,9–6,3% APY): https://defillama.com/yields/pool/ca537616-5cc3-429a-aded-ebe307121d1f y https://defillama.com/yields/pool/3cb152e8-1de7-4a2b-8510-f04014c5fe82 (consultado 03/10/2026)
12. DefiLlama — Jupiter Lend USDC (~5,1% APY; ~4,9% vía AprScope): https://defillama.com/yields/pool/d783c8df-e2ed-44b4-8317-161ccc1b5f06 y https://aprscope.com/yields/pool/jupiter-lend-solana-usdc-earn/ (consultado 03/10/2026)
13. RWA.xyz — Huma PST (7D 7,70%; 30D 7,72%): https://app.rwa.xyz/assets/PST (consultado 03/10/2026)
14. Huma — modos (Classic ~8% APY objetivo): https://docs.huma.finance/products/huma-2.0/modes (consultado 03/10/2026)
15. Blockworks — Huma Protocol Report H1-2026 (PST ~8% accretion anualizada; PST US$181,8M): https://blockworks.com/api/investor-report/huma-finance-protocol-report-h1-2026/pdf (2026)
16. Kamino — docs de vaults y APYs (APY blended; Steakhouse/Private Credit citados en research/c, ago-2026): https://kamino.com/docs/build/recipes/earn/get-vault-apys (consultado 03/10/2026)

Supuestos propios marcados **SIN VERIFICAR**: π=5% (procesamiento de cargo a tarjeta del fiador); k=1 cuota pagada antes del default; spread de rampa 0,5–1%; hipótesis de que anticipo+KYC+tope chico baja d en el tramo sin fiador; r=80% alcanzable con tarjeta registrada (depende de que el cobro off-chain entre — no demostrable en la hackathon).
