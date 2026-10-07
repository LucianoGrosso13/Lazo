# 02 — Flujos de caja completos: cada actor, cada peso, cada mes

Análisis de `proyecto/06-viabilidad/`. Todos los números de las tablas salen de `modelo-financiero.py` (correr `python3 modelo-financiero.py`, salida completa en `salida-modelo.md`). Los datos externos llevan fuente y fecha. Los supuestos propios están marcados.

---

## 1. Mapa de flujos del sistema

```
                         ┌─────────────────────────────┐
   Fiador (familiar)     │                             │
   tarjeta guardada ─────┼──► solo si el estudiante     │
   (fianza con tope)     │    no paga (día 15)         │
                         ▼                             │
   Estudiante ──anticipo─┼──► COMERCIO ◄── adelanto ───┼── POOL (junior 20%
   (paga cuota mes 1-3)  │    cobra P − fee hoy        │    + senior 80%)
        │                │                             │      │
        └── cuotas ──────┼─────────────────────────────┼──────┘
                         │         ▲ fee split         │
                         │         └───────────────────┼──► EMPRESA
                         │     (origination+servicing) │    (operadora)
                         └─────────────────────────────┘
```

- El **estudiante** paga el anticipo directo al comercio y las cuotas al pool (o en pesos vía rampa).
- El **pool** adelanta al comercio `A·(1−fee)` en la misma transacción y cobra las cuotas.
- El **fiador** solo se activa en mora (día 15): cargo a su tarjeta con evidencia onchain del comprobante.
- La **empresa** cobra una porción del fee del comercio (origination), servicing sobre cartera y spread FX; es además la dueña del tramo junior (equipo/sponsor).

---

## 2. Ejemplo trabajado: la PC de US$1.000 (escalón 0, esquema recomendado B)

Parámetros: anticipo 30%, financiado A=US$700, 3 cuotas, interés estudiante 6% sobre financiado, fee comercio 7% split **5% pool + 2% empresa**, punitorio 5% sobre cuota vencida, cobertura fiador 100%.

### 2.1 Estudiante — paga ~4,2% real sobre el precio

| Momento | Flujo | Detalle |
|---|---|---|
| t=0 | **−300,00** | anticipo directo al comercio (USDC) |
| Mes 1 | −247,33 | cuota = 700·1,06/3 |
| Mes 2 | −247,33 | idem |
| Mes 3 | −247,33 | idem |
| **Total** | **−1.042,00** | **+4,2% sobre contado** |

Comparación verificada: en Mercado Pago 3 cuotas sin tarjeta el costo real es ~+29% (CFTEA publicado 76–1.376% TNA; caso real documentado CFTEA 367%). En MP el mismo equipo sale ~1.290 reales. Rampa ARS→USDC estimada +1-2% adicional si paga en pesos (**supuesto propio**, no verificado). Incluso con rampa, ≤6% real vs ~29%.

### 2.2 Comercio — cobra hoy, sin riesgo

| Momento | Flujo | Detalle |
|---|---|---|
| t=0 | **+951,00** | anticipo 300 + adelanto del pool 651 (= 700 − 7%·700) |
| Después | 0 | no toca nada más; la mora es del pool |
| **Costo** | **−49,00** | 7% sobre financiado = **4,9% del precio** |

Comparación comercio (verificada oct-2026): Cuotas MiPyME ~6,9% y cobro a 10 días hábiles (solo MiPyMEs certificadas); GOcuotas 4,9–9,9% y cobro a 22–65 días hábiles; Mercado Libre 3 cuotas sin interés ~8,9–12,5%. **Lazo al instante y a 4,9% es hoy el precio comercio más barato verificado del mercado argentino.**

### 2.3 Pool — la máquina de intereses

| Momento | Flujo | Detalle |
|---|---|---|
| t=0 | **−679,00** | adelanto al comercio 651 + fee origination a la empresa 14 + (se queda su fee 35 en la diferencia: desembolsa 665 del capital pero solo paga 651 al comercio) |
| Meses 1-3 | +742,00 | tres cuotas de 247,33 |
| Esperado con mora | **E ≈ 705** | (1−d)·742 + d·[k·q + f·r·(1−cb)(1−π)·U·(1+pun)] con d=30%, r=80% |

Resultado del libro (libro 100% con fiador, r efectivo ≈72% neto de desconocimiento y procesamiento):

| Morosidad d | Retorno ciclo (3m) | Anualizado ×4 | Break-even |
|---|---|---|---|
| 20% | +5,7% | **+23,0%** | |
| 30% | +4,0% | **+16,0%** | |
| 40% | +2,2% | +8,9% | |
| — | 0 | 0 | **d ≈ 52,6%** |

Es decir: el libro con-fiador aguanta una mora del 52% antes de perder plata. La referencia dura del mercado: irregularidad PNFC argentina ~30-34% (BCRA feb-2026, incluye curas), Ualá consumo llegó a 43% (mar-2026, antes del write-off), Mercado Crédito NPL 15-90d solo 7%.

### 2.4 Fiador — costo esperado chico, peor caso acotado

| Escenario | Flujo | Detalle |
|---|---|---|
| Camino feliz (70%) | 0 | nunca se le cobra |
| Default (30%) | −(saldo impago + 5% punitorio) | cargo a su tarjeta el día 15; aquí: 2 cuotas impagas ≈ 494,67 + 5% ≈ **−519** |
| Costo **esperado** | **≈ −147** por plan | d·r·cargo = 0,30·0,80·~613 |
| Peor caso (fianza máx) | ≈ −735 | monto máximo de la fianza (art. 1578 CCyC) |

Lo que el fiador gana: no presta el plástico ni inmoviliza su límite para cada compra (la fianza tiene tope, no consumo por adelantado), y la exposición se mide al firmar.

### 2.5 Empresa — el revenue que hoy no existe

| Fuente | Por plan (A=700) | Anual | Base |
|---|---|---|---|
| Origination (2% del fee del comercio) | **+14,00** | por plan | split del 7% |
| Servicing (5%/año sobre saldo vivo ~A/2) | +4,38 | por plan | modelo Affirm (servicing income US$173M FY26) |
| Spread FX (1% sobre cuotas cobradas en pesos; 60% en pesos) | +4,24 | por plan | si la empresa opera la rampa |
| Costos variables | −9,00 | κ US$1 (KYC+gas+keeper) + CAC amortizado US$8 | Didit US$0,33/verif. |
| **Margen por plan** | **≈ +13,60** | | ~1,9% del financiado |
| Carry del junior (equity en el pool) | — | junior rinde ~38%/año en el escenario base | ver §4 |

### 2.6 Senior LP — el inversor del pool

Deposita USDC, cobra cupón 8%/año con prioridad de pago, protegido por 20% de junior + reserva. Alternativas verificadas de USDC en Solana (6-oct-2026): Jupiter Lend ~4-5,4%, Kamino ~4,5%, Huma PST ~7,7-8%, Maple syrupUSDC ~5-6%. **8% con protección estructural es vendible** (Credix cobraba ~10-12% a originadores con senior ~12% target).

### 2.7 Junior (equipo/sponsor) — donde está la ganancia de riesgo

Absorbe la primera pérdida y captura el residuo. En el escenario base (d=30%, esquema B): **+38%/año**. Es el incentivo correcto: quien origina y administra el riesgo es quien lo absorbe primero — la estructura exacta de Centrifuge/New Silver (junior 15-20% fondeado por el emisor) y Credix (80/20).

---

## 3. Comparación de esquemas de precio (la decisión central)

| Esquema | Estudiante | Comercio | Pool d=30% | Break-even | Lectura |
|---|---|---|---|---|---|
| A. Actual | 0% | 7%→pool | +9,3%/año | d≈43% | Fino: senior 8% queda expuesto; empresa $0 |
| **B. Recomendado** | **6% i** | **7% (5+2)** | **+16,0%/año** | **d≈53%** | Equilibrio: todos ganan vs. alternativas |
| C. Conservador comercio | 10% i | 1,5% | +25,1%/año | d≈65% | Máximo margen pool, fee mínimo comercio (estilo research/d) |
| D. Comercio-friendly | 6% i | 3% | +7,6%/año | d≈41% | Barato comercio, pool débil — no recomendado |

El estudiante paga en B ≈ 4,2% real (A=0%), en C ≈ 7% real — ambos muy por debajo del ~29% de MP. La diferencia es quién subsidia: en B el subsidio se reparte entre estudiante y comercio; en C lo pone el estudiante casi todo.

**Recomendación:** esquema B para el piloto (la historia "cuotas casi gratis" se mantiene, el fee del comercio ya es el más barato del mercado y la empresa nace con revenue). Mantener C como fallback si el comercio rechaza el 7%.

---

## 4. Waterfall del pool (u=80% desplegado, ocioso en Kamino ~6%, senior 80% @ 8%)

| Escenario del activo | Pool total | Senior | Junior |
|---|---|---|---|
| d=20%, esq. B (+23,0%) | +19,6% | **+8,0%** | **+66,1%** |
| d=30%, esq. B (+16,0%) | +14,0% | **+8,0%** | **+37,9%** |
| d=40%, esq. B (+8,9%) | +8,3% | +8,0% | +9,7% |
| d=30%, esq. A actual (+9,3%) | +8,6% | +8,0% | +11,2% |
| Catástrofe sin-fiador d=30% (−50,3%) | −39,0% | **−23,8%** | **−100%** |

Reglas invariantes a implementar (estándar Centrifuge/Goldfinch):
- **Coverage ratio ≥20%**: el senior no puede crecer si junior/(junior+senior) < 20%. Invariante del contrato, no promesa.
- **Reserva de pérdidas**: 10% del fee bruto a un fondo separado que absorbe pérdidas antes que el junior.
- **El senior solo financia planes con fiador.** El libro sin-fiador vive dentro del junior (unitranche, como hizo Goldfinch con sus unitranche pools).
- **Early amortization trigger**: si 30+DPD de la cohorte supera umbral, se frena originación nueva con capital senior y el cash cobrado va primero al senior.

## 5. Mezcla de cartera — cuánto libro puede estar sin fiador

| % capital con fiador | Rendimiento anual (d=30%, esq. B) |
|---|---|
| 100% | +16,0% |
| 90% | +9,3% |
| 74% | −1,3% |
| 60% | −10,5% |
| 50% | −17,2% |

**El libro viable exige ~80-85%+ del capital con fiador.** El tramo sin-fiador se mantiene como costo de adquisición con tope chico (US$75-150) y dentro del junior.

## 6. P&L de la empresa a escala (esquema B, A medio US$500, opex US$15k/mes, pool US$1M con junior 20% propio)

| Planes/mes | Ingresos (orig+svc+fx) | Variables | Carry junior | EBITDA/mes |
|---|---|---|---|---|
| 50 | $808 | $450 | $6.311 | −$8.332 |
| 200 | $3.230 | $1.800 | $6.311 | −$7.259 |
| 500 | $8.076 | $4.500 | $6.311 | −$5.114 |
| 1.000 | $16.151 | $9.000 | $6.311 | −$1.538 |
| 3.000 | $48.453 | $27.000 | $6.311 | **+$12.764** |

- **Break-even operativo (sin carry): ~2.100 planes/mes** a A=US$500 (~US$1,05M financiados/mes). A A=US$700 (ticket PC): ~1.100 planes/mes.
- El carry del junior sobre US$200k propios cubre ~$6,3k/mes del opex — el equity en el pool no es solo absorción de riesgo, es la línea de ingreso más grande al principio.
- Sensibilidad: si CAC real es US$20 en vez de US$8 (benchmarks BNPL globales US$44-300, LatAm sin verificar), el margen/plan cae ~US$12 → break-even ~3.700 planes/mes. Medir CAC real en piloto.

## 7. Los tres supuestos que lo definen todo (KPIs del piloto)

| # | Supuesto | Valor base | Si falla | Cómo medirlo |
|---|---|---|---|---|
| 1 | **Mora d** | 30% (irregularidad PNFC BCRA, conservador: incluye curas) | d>45% → solo escalón 0-1 sobrevive; d>53% → libro pierde | Cohorte mensual: 30+DPD, roll rate, FPD |
| 2 | **Recupero fiador r** | 80% bruto → ~72% neto (cb 5%, π 5%) | r=50% → libro −9%/año | % cargos al fiador exitosos, % desconocidos, % revertidos |
| 3 | **Mora por escalón** | se asume que baja (d3≈15-19% para que escalón 3 cierre) | si d es plano en 30%, los escalones 2-3 pierden | Mora por tier en la cohorte — definir regla: subir cobertura si tier>1 confirma d≈30% |

## 8. Fraude — el riesgo que el modelo NO captura

El comercio cobra al instante. Una "venta" fantasma entre comercio y estudiante cómplices extrae el pool directamente. Es exactamente lo que mató a Goldfinch (información oculta del borrower → defaults). Mitigaciones: KYC del comercio, tope de exposición por comercio y por estudiante, retención de un % del adelanto (ej.: pagar 90% hoy, 10% tras primera cuota pagada), clawback si la cohorte del comercio fraudea, y revisión manual de comercios nuevos antes de habilitar cobro instantáneo.

---

## 9. Metodología y reproducibilidad

- Script: `modelo-financiero.py` (stdlib, sin dependencias). Fórmulas del recaudo esperado idénticas a `research/d-modelo-economico-pool.md`, extendidas con: split de fee, servicing, FX, desconocimiento (cb), waterfall con utilización parcial y carry del junior en el P&L.
- Fuentes externas: citadas inline en cada documento (BCRA, CACE, MELI 8-K, Affirm/Klarna results, CNV, GOcuotas, ruedas de protocolos). Lo marcado SIN VERIFICAR no se presenta como hecho.
- Divergencia honesta: este modelo es una simplificación (3 cuotas, mora binaria, k=1 cuota pagada pre-default). Sirve para decidir estructura y precios; no reemplaza un loan tape real. La primera cohorte piloto tiene que alimentar los parámetros d, r y d-por-escalón.
