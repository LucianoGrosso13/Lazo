# Lazo — Modelo Financiero y Plan de Negocio v3

**Fecha de actualización:** 2026-10-07 · **Entorno:** devnet / mock.
Todos los parámetros representan hipótesis de trabajo y calibración económica, no métricas históricas.

## 1. Planes vigentes y economía unitaria (PC US$ 1.000, Tier 1 · Starter)
Anticipo 30% (US$ 300), financiado US$ 700. Fianza obligatoria al 100% (capital + interés).
Reparto Lazo (D8): originación 4% sobre financiado (US$ 28) + administración 2% anual (US$ 2,33 a 3 cuotas).

| Plan / Plazo | Anticipo | Financiado | Total Comprador | Comisión Comercio | Neto Comercio | Pool Ganancia (G) | Retorno Anual Pool | Margen Lazo |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1. 3 cuotas, cobro hoy (7% comercio, 0% comprador) | 300 | 700 | 1,000 | 7.0% | 951 | +8.29 | 4.9% | +28.63 |
| 2. 3 cuotas, 30 días (6,25% comercio, 0% comprador, 1 tramo) | 300 | 700 | 1,000 | 6.2% | 956 | +3.04 | 1.8% | +28.63 |
| 3. 3 cuotas, 60 días (5,75% comercio, 0% comprador, 2 tramos) | 300 | 700 | 1,000 | 5.8% | 960 | -0.46 | -0.3% | +28.63 |
| 4. 3 cuotas, 90 días (5,25% comercio, 0% comprador, 3 tramos) | 300 | 700 | 1,000 | 5.2% | 963 | -3.96 | -2.3% | +28.63 |
| 5. 6 cuotas, cobro hoy (7% comercio, 3% comprador, desde US$ 350) | 300 | 700 | 1,021 | 7.0% | 951 | +24.55 | 7.2% | +30.47 |
| 6. 6 cuotas, 30 días (6,25% comercio, 3% comprador, 1 tramo) | 300 | 700 | 1,021 | 6.2% | 956 | +19.30 | 5.6% | +30.47 |
| 7. 6 cuotas, 60 días (5,75% comercio, 3% comprador, 2 tramos) | 300 | 700 | 1,021 | 5.8% | 960 | +15.80 | 4.6% | +30.47 |
| 8. 6 cuotas, 90 días (5,25% comercio, 3% comprador, 3 tramos) | 300 | 700 | 1,021 | 5.2% | 963 | +12.30 | 3.6% | +30.47 |

## 2. Sensibilidad de riesgo de mora (Escenarios base y de estrés)
| Escenario | Mora Estudiante (d) | Recupero Fiador (r) | 3 cuotas hoy (Retorno) | 6 cuotas hoy (Retorno) | Senior | Junior |
|---|---:|---:|---:|---:|---:|---:|
| Favorable | 4.0% | 90.0% | 8.9% | 9.8% | 8.0% | 18.7% |
| Base doc 08/10 | 8.0% | 80.0% | 4.9% | 7.2% | 8.0% | -1.4% |
| Moderado | 15.0% | 75.0% | -2.3% | 2.6% | 8.0% | -36.4% |
| Estrés severo | 30.0% | 65.0% | -23.1% | -10.8% | -1.2% | -100.0% |

## 3. Rampa de crecimiento a 36 meses
Ticket financiado promedio: US$ 650. Rampa: piloto -> Tucumán -> 3 ciudades -> nacional.

| Mes | Planes/mes | Opex/mes | Pool Necesario | Junior (20%) | EBITDA Lazo (sola) | EBITDA Lazo (+25% junior) |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 40 | 6,000 | 65,000 | 13,000 | -4,954 | -4,987 |
| 6 | 90 | 6,000 | 146,250 | 29,250 | -3,646 | -3,721 |
| 12 | 400 | 14,000 | 650,000 | 130,000 | -3,539 | -3,872 |
| 18 | 700 | 14,000 | 1,393,438 | 278,688 | 4,667 | 4,584 |
| 24 | 1120 | 25,000 | 2,229,500 | 445,900 | 4,867 | 4,735 |
| 30 | 1540 | 25,000 | 3,065,562 | 613,112 | 16,066 | 15,885 |
| 36 | 1960 | 25,000 | 3,901,625 | 780,325 | 27,266 | 27,035 |

## 4. Estructura de la ronda de financiamiento
Legal: US$ 65k · Colchón: 6 meses de opex (US$ 84k) · Tramo junior fondeado hasta mes 18.

| Participación Junior | Pozo de Pérdida | Colchón | Legal | Junior Propio | Ronda Total | Mes Equilibrio |
|---|---:|---:|---:|---:|---:|---|
| 0.0% | 69,317 | 84,000 | 65,000 | 0 | **218,317** | Mes 15 (550 planes/mes) |
| 25.0% | 71,126 | 84,000 | 65,000 | 69,672 | **289,798** | Mes 15 (550 planes/mes) |
| 50.0% | 72,934 | 84,000 | 65,000 | 139,344 | **361,278** | Mes 15 (550 planes/mes) |
| 100.0% | 76,552 | 84,000 | 65,000 | 278,688 | **504,239** | Mes 15 (550 planes/mes) |

