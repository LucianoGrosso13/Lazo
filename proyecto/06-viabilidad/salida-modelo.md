# Modelo financiero Lazo — salida del script

```
Parámetros base riesgo: d=30%, k=1 cuota, f=100% fiador, r=80% recupero,
cb=5% desconocimiento, pi=5% procesamiento | pool: u=80%, idle 6%,
senior 80% @ 8% | empresa: κ=US$1, CAC=US$8, fx 1% (60% cuotas en pesos),
opex fijo US$15k/mes
```

## 1. Flujos por actor — PC US$1.000, escalón 0 (anticipo 30%, 3 cuotas, i=0, fee comercio 7%: 5% pool + 2% empresa)

| Actor | t=0 | Mes 1 | Mes 2 | Mes 3 | Total |
|---|---|---|---|---|---|
| Estudiante | −300.00 (anticipo) | −233.33 | −233.33 | −233.33 | −1,000.00 |
| Comercio | +951.00 | 0 | 0 | 0 | +951.00 (−49.00 = 4.9% del precio) |
| Pool | −679.00 (adelanto −35.00 fee + fee empresa 14.00) | +cuota | +cuota | +cuota | esperado 666.13 |
| Empresa | +14.00 (origination 2%) | +servicing+fx | +servicing+fx | +servicing+fx | 22.37 bruto |
| Fiador | 0 | 0 | solo si default | cargo 80.0%·(1−5.0%−5.0%)·saldo | costo esperado 117.60 / peor caso 735.00 |

## 2. Rendimiento del libro con-fiador (f=100%, r=80%, cb=5%) según esquema de precio

| Esquema | i est. | fee comercio | d=20% | d=30% | d=40% | break-even d | Costo real estudiante |
|---|---|---|---|---|---|---|---|
| A. Actual (0% est, 7% com → todo al pool) | 0.0% | 7.0% | 16.2% | 9.3% | 2.4% | 43.4% | 0.0% |
| B. v2 recomendado (6% est, 7% com: 5% pool + 2% empresa) | 6.0% | 7.0% | 23.0% | 16.0% | 8.9% | 52.6% | 4.2% |
| C. Interés est + fee bajo (10% est, 1,5% com) | 10.0% | 1.5% | 32.3% | 25.1% | 17.9% | 64.8% | 7.0% |
| D. Comercio-friendly (6% est, 3% com: 2% pool + 1% empresa) | 6.0% | 3.0% | 14.5% | 7.6% | 0.7% | 40.9% | 4.2% |

## 3. Libro por escalón (esquema B: i decreciente, fee 7% → 5% pool + 2% empresa)

| Escalón | anticipo | cobertura fiador | i | pool anual d=30% | break-even d | costo real est. |
|---|---|---|---|---|---|---|
| 0 | 30.0% | 100.0% | 6.0% | 16.0% | 52.6% | 4.2% |
| 1 | 20.0% | 90.0% | 5.0% | 5.5% | 36.0% | 4.0% |
| 2 | 10.0% | 80.0% | 4.0% | -4.9% | 25.7% | 3.6% |
| 3 | 0.0% | 70.0% | 3.0% | -15.1% | 18.6% | 3.0% |

## 4. Sensibilidad rendimiento anual del libro (esquema B, f=100%) — d × recupero r

| d \ r | 50% | 65% | 80% | 90% |
|---|---|---|---|---|
| 15.0% | 14.1% | 20.3% | 26.5% | 30.7% |
| 25.0% | -1.2% | 9.1% | 19.5% | 26.4% |
| 30.0% | -8.9% | 3.5% | 16.0% | 24.3% |
| 35.0% | -16.6% | -2.1% | 12.4% | 22.1% |
| 45.0% | -31.9% | -13.2% | 5.4% | 17.8% |

## 5. Waterfall del pool (u=80%, ocioso en Kamino 6%, senior 80% @ 8% anual)

| Escenario del activo (anual) | Pool total | Senior | Junior |
|---|---|---|---|
| d=20% esquema B (23.0%) | 19.6% | 8.0% | 66.1% |
| d=30% esquema B (16.0%) | 14.0% | 8.0% | 37.9% |
| d=40% esquema B (8.9%) | 8.3% | 8.0% | 9.7% |
| d=30% esquema A (actual) (9.3%) | 8.6% | 8.0% | 11.2% |
| catástrofe sin fiador d=30%, esq. B (-50.3%) | -39.0% | -23.8% | -100.0% |

## 6. Mezcla: qué pasa si parte del libro no tiene fiador (esquema B, d=30%)

| % del capital con fiador | rendimiento anual libro |
|---|---|
| 100.0% | 16.0% |
| 90.0% | 9.3% |
| 74.0% | -1.3% |
| 60.0% | -10.5% |
| 50.0% | -17.2% |

## 7. P&L mensual de la empresa (esquema B; financiado medio A=US$500; pool US$1M, junior 20% del equipo)

| Planes/mes | Ingresos (orig+svc+fx) | Costos variables | Carry junior | Opex fijo | EBITDA mes |
|---|---|---|---|---|---|
| 50 | 807.56 | 450.00 | 6,310.57 | 15,000.00 | -8,331.87 |
| 200 | 3,230.23 | 1,800.00 | 6,310.57 | 15,000.00 | -7,259.20 |
| 500 | 8,075.58 | 4,500.00 | 6,310.57 | 15,000.00 | -5,113.85 |
| 1000 | 16,151.15 | 9,000.00 | 6,310.57 | 15,000.00 | -1,538.28 |
| 3000 | 48,453.45 | 27,000.00 | 6,310.57 | 15,000.00 | 12,764.03 |

**Punto de equilibrio operativo (sin carry del junior): 2,098 planes/mes.**

## 8. Unit economics por plan (esquema B, d=30%)

| Concepto | Empresa | Pool |
|---|---|---|
| **A=500.00** ingreso | orig 10.00 + svc 3.12 + fx 3.03 = **16.15** | fee 25.00 + interés/recuperos |
|        costo variable | κ 1.00 + CAC 8.00 = 9.00 | pérdidas esperadas (en E) |
|        **margen/plan** | **7.15** | 4.0% por ciclo → 16.0%/año |
| **A=700.00** ingreso | orig 14.00 + svc 4.38 + fx 4.24 = **22.61** | fee 35.00 + interés/recuperos |
|        costo variable | κ 1.00 + CAC 8.00 = 9.00 | pérdidas esperadas (en E) |
|        **margen/plan** | **13.61** | 4.0% por ciclo → 16.0%/año |

---
Notas: d = pérdida final del plan (conservador: irregularidad BCRA 34% incluye
curas). E incluye punitorio cobrado al fiador. Servicing = 5%/año sobre saldo
vivo medio (~A/2 por 3 meses). FX = 1% sobre cuotas cobradas en pesos (60%).
Todo es escenario, no proyección garantizada.
