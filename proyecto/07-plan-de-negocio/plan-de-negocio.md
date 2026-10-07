# Lazo: plan de negocio para que sea rentable (v3)

> **Nota de actualización a v3 (2026-10-07):** Este plan de negocio fue reescrito para incorporar la política comercial y operativa definitiva decidida por el equipo para el producto final. Se basa en el modelo financiero [`modelo-v3.py`](modelo-v3.py) (con salida reproducible en [`salida-modelo-v3.md`](salida-modelo-v3.md)) y los gráficos generados en [`graficos/`](graficos/).
>
> **Qué cambió respecto de la versión v2:**
> 1. **Política comercial vigente:**
>    - Se descartan las tarifas preliminares de 9% y 10% del precio y los esquemas provisionales H1/H2.
>    - La comisión comercial base es del **7% sobre lo financiado** para cobro inmediato (hoy).
>    - Se incorpora el **cobro en tramos mensuales**: 30 días al **6,25%** (1 tramo), 60 días al **5,75%** (2 tramos mensuales: 50% día 30, 50% día 60) y 90 días al **5,25%** (3 tramos mensuales: ⅓ día 30, ⅓ día 60, ⅓ día 90). El ajuste a 5,75% a 60 días (en lugar de 5,50%) responde a que con tramos mensuales la comisión neutra sin subsidio es 5,65%.
>    - **6 cuotas definidas:** tasa del **3% total sobre lo financiado** para compras a partir de **US$ 350** (colchón sobre los US$ 217 de equilibrio para nuevos usuarios). 3 cuotas se mantienen sin interés (0%) y sin compra mínima. 1 cuota queda eliminada.
> 2. **Fianza obligatoria y cobertura:**
>    - Se elimina cualquier tramo o compra sin fiador: **sin fiador activo no hay plan**.
>    - El fiador cubre el **100% del saldo de capital financiado + interés del plan**. Los recargos punitorios por mora quedan fuera de la fianza.
>    - Se descarta formalmente la idea 11 ("descuentos comerciales para el fiador al día") por complejidad operativa y falta de evidencia en reducción de mora.
> 3. **Venta en mostrador en el MVP:**
>    - Se incorpora al MVP el flujo de venta en mostrador por link y código QR propio (`/app/comercio/mostrador` y `/orden/[id]`).
> 4. **Gobernanza y arquitectura onchain:**
>    - Modelo de **compromiso onchain (`PayoutSchedule`) + verificación de liquidez libre** en el pool (`pool.liquid >= desembolso_hoy + tramos_comprometidos`), evitando una bóveda escrow que inmovilizaría capital anulando el ahorro financiero.
> 5. **Cumplimiento de reglas de hackathon:**
>    - No se nombran competidores comerciales ("la competencia con tarjeta al instante", "la alternativa bancaria tradicional").
>    - Todos los números se rotulan como hipótesis de modelado económico, nunca como métricas medidas o promesas de Lazo. Corre sobre devnet y tokens simulados (devUSDC).

---

## Índice

1. [El resumen en una página](#1-el-resumen-en-una-página)
2. [Evolución del modelo financiero (v1 → v2 → v3)](#2-evolución-del-modelo-financiero-v1--v2--v3)
3. [El esquema de precios y cobro en tramos](#3-el-esquema-de-precios-y-cobro-en-tramos)
4. [La escalera de Tiers](#4-la-escalera-de-tiers)
5. [Flujos de caja por actor (Caso PC de US$ 1.000)](#5-flujos-de-caja-por-actor-caso-pc-de-us-1000)
6. [El plan para cada actor](#6-el-plan-para-cada-actor)
7. [Cómo gana plata la empresa (Lazo)](#7-cómo-gana-plata-la-empresa-lazo)
8. [Proyección a 36 meses y dimensión de la ronda](#8-proyección-a-36-meses-y-dimensión-de-la-ronda)
9. [Estructura del pool y gobernanza](#9-estructura-del-pool-y-gobernanza)
10. [Otras ideas evaluadas y estado](#10-otras-ideas-evaluadas-y-estado)
11. [Salida al mercado (Go-To-Market)](#11-salida-al-mercado-go-to-market)
12. [Métricas críticas y gestión de riesgos](#12-métricas-críticas-y-gestión-de-riesgos)
13. [Gráficos y evidencia reproducible](#13-gráficos-y-evidencia-reproducible)

---

## 1. El resumen en una página

**Veredicto: el negocio es viable y sostenible.** Lazo formaliza una práctica cotidiana en las familias argentinas ("prestame la tarjeta"), protege el balance mediante un fiador solidario con tarjeta tokenizada que asume el 100% de la deuda impaga, y permite a los comercios cobrar en el acto o programar su caja a un costo sustancialmente menor que las alternativas tradicionales con tarjeta.

**Las claves del modelo v3:**

1. **Reparto claro entre la empresa y el pool (D8):**
   Lazo percibe **4% de originación sobre el monto financiado** (descontado de la comisión comercial del 7%) más **2% anual de administración sobre el saldo vivo** pagado por el pool. Esto le otorga a Lazo **~US$ 28 limpios por plan** sin tener que arriesgar su propio balance para fondear préstamos.
2. **Cobro del comercio en tramos mensuales alineados:**
   El comercio elige cuándo cobrar lo financiado neto:
   - **Hoy:** 7,00% de comisión (cobra al instante).
   - **30 días:** 6,25% (1 tramo el día 30).
   - **60 días:** 5,75% (50% día 30 y 50% día 60).
   - **90 días:** 5,25% (⅓ día 30, ⅓ día 60 y ⅓ día 90).
   Con tramos alineados al cobro de las cuotas del estudiante, en el escenario normal Lazo prácticamente no adelanta capital ($W$ cae de 57,4 días a 3,7 días). El ahorro de capital se traslada al comercio de forma transparente y sin subsidios.
3. **6 cuotas con interés sostenible:**
   Se habilitan 6 cuotas con un **3% de interés total sobre lo financiado** para compras desde **US$ 350**. Esto asegura que cualquier cliente nuevo supere el umbral de rentabilidad operativa (US$ 217) y otorga colchón financiero frente a la inmovilización de capital.
4. **Fianza 100% obligatoria en todos los Tiers:**
   Sin fiador no se autoriza ningún plan. El fiador garantiza el 100% del capital financiado pendiente más el interés contractual de 6 cuotas. Los recargos punitorios se cobran exclusivamente al estudiante.
5. **Régimen de autosuficiencia y ronda:**
   Con una estructura de costos prudente (US$ 6k piloto, US$ 14k etapa 2, US$ 25k etapa 3), Lazo alcanza el **equilibrio operativo mensual en el mes 15**, con una originación de **~550 planes/mes**. Una ronda de **~US$ 290k** fondea el déficit operativo inicial (US$ 71k), un colchón de contingencia de 6 meses de opex (US$ 84k), los costos legales/regulatorios de registro BCRA como PNFC (US$ 65k) y la coinversión en el 25% del tramo junior propio (US$ 70k).

---

## 2. Evolución del modelo financiero (v1 → v2 → v3)

| Versión | Alcance y correcciones | Conclusiones sobre la viabilidad |
|---|---|---|
| **v1** (`06-viabilidad/`) | Modelo inicial de viabilidad. Tenía doble conteo de originación en el desembolso del pool y no descontaba el servicio del pool. | Demostró que el fiador reduce el riesgo crediticio, pero subestimó la rentabilidad real del pool y no contemplaba cobro diferido. |
| **v2** (`07-plan-de-negocio/`) | Corrigió el doble desembolso y el servicing. Exploró esquemas H1 (sin interés, 9-10% comercio) y H2 (con costo, 8% comprador / 3% comercio). | Mostró que Lazo no podía depender solo del tramo junior y fijó la regla D8 (4% originación + 2% anual adm). Introdujo el tramo junior como primera pérdida. |
| **v3** (Vigente, 2026-10-07) | **Política comercial definitiva adoptada:** 7% base comercio, tramos mensuales (6,25% / 5,75% / 5,25%), 6 cuotas al 3% (desde US$ 350), fiador obligatorio 100% (capital + interés, sin punitorios), venta en mostrador por QR en MVP, y compromiso onchain con chequeo de liquidez. | El negocio cierra de forma robusta: el comercio ahorra comisiones esperando en tramos sin que Lazo subsidie capital, y el inversor senior cobra su 8% anual con holgura. |

---

## 3. El esquema de precios y cobro en tramos

### 3.1 Modalidades para el comprador

- **3 cuotas sin interés:** 0% de recargo para el comprador. El precio de lista se divide exactamente en 3 pagos iguales cada 30 días, tras abonar el anticipo de su Tier. Sin mínimo de compra.
- **6 cuotas fijas al 3% total:** 3% sobre el monto financiado ($A \times 1,03 / 6$). Disponible exclusivamente para compras de **US$ 350 o más**.
  - *Justificación económica:* en el modelo con costo de adquisición ($K_{new} = \text{US\$} 4,00$), un cliente nuevo en 6 cuotas requiere un ticket mínimo de US$ 217 para no generar pérdida marginal (contra US$ 267 si la tasa fuera 2,5%). El piso de US$ 350 provee un margen de seguridad operativo frente a imprevistos de cobro.

### 3.2 Opciones de liquidación para el comercio (cobro en tramos)

El comercio elige cuándo percibir el capital financiado neto (`A − F`). El anticipo va siempre directo al comercio en el momento de la venta.

| Opción | Comisión sobre financiado | Costo sobre precio (30% anticipo) | Calendario de pagos garantizado | Comisión Neutra sin subsidio |
|---|---:|---:|---|---:|
| **Hoy (inmediato)** | **7,00%** | 4,90% | 100% al abrir el plan (t=0) | 7,00% |
| **30 días** | **6,25%** | 4,38% | 100% el día 30 (1 tramo mensual) | 6,10% |
| **60 días** | **5,75%** | 4,03% | 50% día 30 · 50% día 60 (2 tramos) | 5,65% |
| **90 días** | **5,25%** | 3,68% | ⅓ día 30 · ⅓ día 60 · ⅓ día 90 (3 tramos) | 5,23% |

*Por qué 5,75% a 60 días:* En una liquidación diferida en una sola cuota al día 60, la comisión neutra calculada era 5,51%. Pero al abonar en 2 tramos mensuales (liberando el 50% ya al día 30), el pool devuelve liquidez antes, elevando la comisión neutra a **5,65%**. Fijar la tarifa en **5,75%** garantiza que Lazo no subsidie costo de capital, otorgando al comercio un descuento atractivo de 1,25 puntos respecto de cobrar hoy y asegurando que todas las opciones cubran la tarifa de originación de Lazo del 4%.

### 3.3 Mecánica de tramos y exposición de capital ($W$)

En cada mes $j$, la exposición neta del pool frente al comercio se modela como:
$$\text{Exposición}_j = \max\left(\text{desembolsado}_j \times (1 - c) - \frac{j}{n}, 0\right)$$

En 3 cuotas a 90 días con tramos mensuales:
- El día 30 el estudiante abona la cuota 1 ($33,33\%$ de $A$) y el pool libera el tramo 1 al comercio ($31,58\%$ de $A$).
- El día 60 el estudiante abona la cuota 2 ($33,33\%$) y el pool libera el tramo 2 ($31,58\%$).
- El día 90 el estudiante abona la cuota 3 ($33,33\%$) y el pool libera el tramo 3 ($31,58\%$).

En el escenario normal (92% de cumplimiento), los ingresos de los estudiantes fondean exactamente las salidas al comercio. Los días-capital de exposición inmovilizada ($W$) caen de **57,4 días** a apenas **3,7 días** (originados únicamente en el 8% de atraso donde Lazo garantiza el pago puntual al comercio).

### 3.4 Compromiso onchain vs. Bóveda escrow

Se evaluó bloquear el dinero en un contrato escrow desde el día 1, pero se descartó:
- Si el capital se congela en una bóveda el día 1, el pool ya no puede rotarlo para financiar otras ventas. El costo de capital sería idéntico al cobro inmediato, eliminando el ahorro financiero que sustenta la rebaja de comisión al 5,25%.
- **Solución adoptada:** los tramos se asientan como un compromiso público inmutable en la cuenta onchain `PayoutSchedule`. El dinero permanece en el pool generando liquidez, pero el protocolo impone una regla estricta de solvencia: `open_plan` exige que la liquidez disponible cubra el desembolso inicial más la suma de todos los tramos comprometidos pendientes.

---

## 4. La escalera de Tiers

Para incentivar la conducta de pago sin incurrir en riesgos desproporcionados, se estandarizan las denominaciones y reglas de los Tiers:

| Tier | Nombre | Planes saldados requeridos | Anticipo mínimo | Cobertura del fiador | Límite de compra |
|---|---|---:|---:|---:|---:|
| **Tier 1** | Starter | 0 | 30% | 100% | US$ 1.000 |
| **Tier 2** | Steady | 1 | 20% | 100% | US$ 1.000 |
| **Tier 3** | Trusted | 2 | 10% | 100% | US$ 1.250 |
| **Tier 4** | Full | 3+ | 0% | 100% | US$ 1.500 |

- **Fiador obligatorio siempre:** La cobertura del fiador se mantiene fija en el **100% del saldo financiado + interés** en todos los Tiers. El premio para el estudiante es abonar menos anticipo y acceder a mayor límite; el fiador se beneficia de una probabilidad decreciente de atraso conforme el estudiante consolida su historial.
- **Regla de descenso:** Si un plan incurre en mora y se ejecuta el cobro sobre el fiador, el estudiante desciende automáticamente un Tier.

---

## 5. Flujos de caja por actor (Caso PC de US$ 1.000)

Compra de US$ 1.000 en Tier 1 · Starter (anticipo 30% = US$ 300, capital financiado = US$ 700), a 3 cuotas con cobro inmediato al 7%:

| Actor | Momento t=0 (Hoy) | Mes 1 (Día 30) | Mes 2 (Día 60) | Mes 3 (Día 90) | Total / Resultado |
|---|---:|---:|---:|---:|---|
| **Estudiante** | −300,00 | −233,33 | −233,33 | −233,34 | **−1.000,00** (0% de interés) |
| **Comercio** | **+951,00** (300 anticipo + 651 neto) | 0,00 | 0,00 | 0,00 | **+951,00** (comisión total US$ 49 = 4,9% del precio) |
| **Empresa (Lazo)** | +28,00 (originación 4%) | +0,78 (adm) | +0,78 (adm) | +0,78 (adm) | **+30,33 bruto** (~US$ 28 neto tras KYC/gas/CAC) |
| **Pool (Inversores)** | −679,00 (651 comercio + 28 Lazo) | +232,56 | +162,56 | +292,17 (cuota + recupero) | **+8,29 ganancia neta** (4,9% retorno anualizado) |
| **Fiador** | 0,00 | 0,00 | 0,00 | Solo ante impago | Costo esperado: US$ 31; máximo firmado: **US$ 700** |

En 6 cuotas al 3% (total comprador US$ 1.021, cuotas de US$ 120,17): el comercio percibe exactamente los mismos US$ 951 netos, y el interés de US$ 21 remunera la mayor permanencia del capital en el pool, elevando la ganancia neta del pool a **US$ 24,55** (7,2% anualizado).

---

## 6. El plan para cada actor

### 6.1 Estudiante
- **Propuesta de valor:** accede a cuotas transparentes (3 sin interés o 6 al 3%) sin tarjeta bancaria propia y sin pedirle la tarjeta a un familiar para que la entregue al comercio.
- **Construcción de historial:** cada plan saldado en fecha eleva su Tier onchain, habilitando anticipos menores hasta llegar al 0% en Tier 4.

### 6.2 Fiador
- **Propuesta de valor:** no presta la tarjeta ni cede su límite crediticio comercial en un pago total; respalda a su familiar firmando una fianza digital con tope conocido e inmutable.
- **Ejecución automática:** ante atraso del estudiante superado el período de gracia, el protocolo ejecuta el cobro sobre el medio tokenizado del fiador por las cuotas vencidas de capital e interés. La tarjeta no puede desvincularse mientras existan planes activos.

### 6.3 Comercio
- **Cobro garantizado y sin contracargos:** cobra el anticipo al instante y el saldo financiado neto en la fecha o tramos elegidos, absorbiendo Lazo el riesgo de crédito.
- **Herramienta de mostrador en el MVP:** puede vender online o generar un link/QR en caja (`/app/comercio/mostrador`) para que el cliente confirme en su propio teléfono móvil.

### 6.4 Inversores del Pool
- **Tramo Senior (80% del pool):** retorno preferente del **8,0% anual en dólares**, cobro prioritario y blindaje frente a primeras pérdidas mediante el tramo junior.
- **Tramo Junior (20% del pool):** retorno subordinado con objetivo de 18% a 25% anual en escenario base, absorbiendo la primera pérdida por insolvencia.

---

## 7. Cómo gana plata la empresa (Lazo)

Lazo opera como originador, calificador y gestor tecnológico de la cartera crediticia.

### 7.1 Fuentes de ingresos unitarios
1. **Comisión de originación (4% sobre lo financiado):** se retiene de la comisión abonada por el comercio al momento de la venta.
2. **Comisión de administración (2% anual sobre saldo vivo):** devengada mensualmente y abonada por el pool por la gestión de cobranza y keeper.
3. **Intermediación de rampa (1% sobre cuotas pagadas en moneda local):** spread por conversión de moneda local a devUSDC.
4. **Retorno de coinversión junior (opcional):** dividendos derivados de la participación propia de Lazo en el tramo junior del pool.

### 7.2 Margen unitario por compra financiada
Sobre un ticket financiado promedio de **US$ 650**:
- Ingresos brutos por servicios: **~US$ 34,50** (US$ 26 originación + US$ 4,33 administración + US$ 4,17 rampa).
- Costos variables directos: **~US$ 6,00** (US$ 1,00 KYC/gas Solana + US$ 5,00 costo de adquisición amortizado).
- **Margen de contribución neto para Lazo:** **~US$ 28,50 por plan**.

---

## 8. Proyección a 36 meses y dimensión de la ronda

### 8.1 Rampa operativa y punto de equilibrio

| Mes | Etapa | Planes/mes | Opex mensual | Pool vivo necesario | EBITDA Lazo (solo servicios) | EBITDA (+25% Junior) |
|---|---|---:|---:|---:|---:|---:|
| 1 | Piloto | 40 | US$ 6.000 | US$ 65.000 | −US$ 4.954 | −US$ 4.987 |
| 6 | Fin de piloto | 90 | US$ 6.000 | US$ 146.250 | −US$ 3.646 | −US$ 3.721 |
| 12 | Expansión local | 400 | US$ 14.000 | US$ 650.000 | −US$ 3.539 | −US$ 3.872 |
| **15** | **Equilibrio mensual** | **550** | **US$ 14.000** | **US$ 1.021.875** | **+US$ 564** | **+US$ 456** |
| 18 | Consolidación plaza 2 | 700 | US$ 14.000 | US$ 1.393.438 | +US$ 4.667 | +US$ 4.584 |
| 24 | Multiciudad | 1.120 | US$ 25.000 | US$ 2.229.500 | +US$ 4.867 | +US$ 4.735 |
| 36 | Escala nacional | 1.960 | US$ 25.000 | US$ 3.901.625 | +US$ 27.266 | +US$ 27.035 |

El punto de equilibrio operativo mensual (EBITDA positivo) se alcanza en el **mes 15** con 550 planes originados en el mes.

### 8.2 Dimensionamiento de la ronda de financiamiento

Para fondear a la compañía hasta su autosuficiencia operativa con márgenes de seguridad prudentes:

| Concepto | Monto | Racional |
|---|---:|---|
| Déficit acumulado pre-equilibrio | US$ 71.126 | Pérdidas operativas acumuladas durante los primeros 14 meses |
| Colchón de liquidez | US$ 84.000 | 6 meses de opex de etapa 2 (US$ 14k/mes) ante eventuales demoras comerciales |
| Gastos legales, regulatorios y licencias | US$ 65.000 | Inscripción BCRA como Proveedor No Financiero de Crédito (PNFC), contratos y compliance |
| Aporte al tramo junior (25%) | US$ 69.672 | Coinversión de Lazo en la primera pérdida del pool al mes 18 |
| **Total Ronda Semilla** | **US$ 289.798** | Capital total requerido para alcanzar rentabilidad sostenida |

---

## 9. Estructura del pool y gobernanza

- **Ratio de cobertura senior/junior:** el pool mantiene una relación fija de 80% senior y 20% junior. Si el tramo junior cae por debajo del 20% debido a pérdidas por mora no recuperada, la originación de nuevos créditos se detiene automáticamente hasta recapitalizar el junior.
- **Retiros de capital:** los inversores senior pueden rescatar liquidez con preaviso de 30 días, sujeto a un tope del 20% mensual del valor del pool para preservar la solvencia operativa.
- **Tesorería ociosa:** el 20% de la liquidez no colocada en préstamos se reserva para retiros y compromisos de tramos, pudiendo colocarse en protocolos de préstamo de bajo riesgo en Solana (Kamino ~4,5%).

---

## 10. Otras ideas evaluadas y estado

- **Idea 1 (6 cuotas):** Incorporada a la oferta con 3% de interés total desde US$ 350.
- **Idea 2 (Cobro en tramos):** Incorporada a la oferta comercial (30, 60 y 90 días).
- **Venta en mostrador por QR:** Incorporada al MVP (`/app/comercio/mostrador`).
- **Idea 10 (Tesorería en DeFi):** Limitada estrictamente a tesorería propia ociosa de forma simulada; nunca con depósitos de usuarios ni compromisos comerciales.
- **Idea 11 (Descuentos para el fiador al día):** **Descartada formalmente** por dispersión de foco y complejidad operativa sin impacto medido en mora.

---

## 11. Salida al mercado (Go-To-Market)

1. **Foco vertical inicial:** Comercios de informática, tecnología y equipamiento de estudio en San Miguel de Tucumán (UNSTA y UNT), donde el ticket promedio (~US$ 650) y la falta de financiamiento bancario juvenil generan tracción inmediata.
2. **Integración presencial en mostrador:** Adhesión rápida mediante link y código QR sin requerir integración técnica de software en el punto de venta.
3. **Distribución online:** Botón de pago Lazo para tiendas web independientes y posterior integración con plataformas de e-commerce regionales.

---

## 12. Métricas críticas y gestión de riesgos

1. **Efectividad del cobro al fiador ($r$):** El modelo asume un 80% de recupero sobre la tarjeta de crédito del fiador ante impago del estudiante. Umbral mínimo de viabilidad: 66%.
2. **Mora inicial del estudiante ($d$):** Hipótesis de calibración base de 8% de planes que requieren cobro sobre el fiador.
3. **Control de devoluciones y desconocimientos ($cb$):** Límite máximo proyectado del 5%, respaldado contractualmente por la fianza digital suscrita por el titular de la tarjeta.

---

## 13. Gráficos y evidencia reproducible

Todos los gráficos e indicadores han sido regenerados a partir de `modelo-v3.py` y se encuentran en [`graficos/`](graficos/):
- Take rate consolidado frente a BNPL globales: [`pitch-1-take-rate.svg`](graficos/pitch-1-take-rate.svg)
- Punto de equilibrio mensual: [`pitch-2-cuando-es-rentable.svg`](graficos/pitch-2-cuando-es-rentable.svg)
- Estructura de la ronda: [`pitch-3-cuanta-plata.svg`](graficos/pitch-3-cuanta-plata.svg)
- Planes necesarios por etapa: [`pitch-4-planes-para-equilibrio.svg`](graficos/pitch-4-planes-para-equilibrio.svg)
- Rendimiento Senior vs. Junior: [`pitch-5-senior-vs-junior.svg`](graficos/pitch-5-senior-vs-junior.svg)
- Liquidez y velocidad de desendeudamiento: [`pitch-6-liquidez.svg`](graficos/pitch-6-liquidez.svg)
- Comparación de comisiones de comercio: [`01-precio-comercio.svg`](graficos/01-precio-comercio.svg)
- Desglose de la comisión comercial: [`02-a-donde-va-la-comision.svg`](graficos/02-a-donde-va-la-comision.svg)
- Margen unitario de Lazo: [`03-empresa-por-plan.svg`](graficos/03-empresa-por-plan.svg)
