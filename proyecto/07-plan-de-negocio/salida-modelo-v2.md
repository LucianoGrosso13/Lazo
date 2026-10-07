# Lazo — salida del modelo v2

Base: PC US$1.000, escalón 0 (anticipo 30%), 3 cuotas, mora d=30%, k=1,
cobertura 100%, recupero r=80%, desconocimiento 5%, procesamiento 5%.
Pool: 80% prestado, ocioso 4,5%, senior 80% al 8%. Escenarios, no promesas.

## 0. Corrección del modelo v1 (esquema B)

| Concepto | v1 (06-viabilidad) | v2 corregido |
|---|---|---|
| Desembolso del pool t=0 | 679 | 665 |
| Servicing pagado por el pool | 0 (no se descontaba) | 5.83 |
| Rendimiento anual del libro (×4) | 16,0% | 21.2% |
| TIR anual del libro (cuotas mensuales) | — | 35.4% |

## 1. Esquemas de precio — libro con fiador al 100%

| Esquema | Costo real comprador | Costo comercio (% precio) | Libro d=20% | Libro d=30% | Libro d=40% | Mora de equilibrio | TIR d=30% | Senior / Junior d=30% | Empresa por plan* |
|---|---|---|---|---|---|---|---|---|---|
| A. Actual (0% comprador, 7% comercio todo al pool) | 0.0% | 4.9% | 16.2% | 9.3% | 2.4% | 43.4% | 14.4% | 8.0% / 9.7% | -5.00 |
| B. Recomendado en 06 (6% comprador, 7% comercio = 5 pool + 2 empresa, svc 5%) | 4.2% | 4.9% | 28.4% | 21.2% | 14.0% | 59.5% | 35.4% | 8.0% / 57.4% | +15.03 |
| H1. El comercio elige — modo SIN INTERÉS (0% comprador, 10% comercio = 8 pool + 2 empresa) | 0.0% | 7.0% | 20.8% | 13.7% | 6.7% | 49.6% | 21.9% | 8.0% / 27.5% | +9.00 |
| H2. El comercio elige — modo CON COSTO (8% comprador, 3% comercio = 1 pool + 2 empresa) | 5.6% | 2.1% | 22.3% | 15.3% | 8.2% | 51.7% | 24.5% | 8.0% / 33.5% | +9.32 |
| M. Mixto suave (3% comprador, 8% comercio = 6 pool + 2 empresa) | 2.1% | 5.6% | 24.2% | 17.1% | 10.0% | 54.2% | 27.8% | 8.0% / 40.9% | +9.12 |

\* margen de la empresa por plan (US$) = origination + servicing + FX − KYC/gas (US$1) − CAC (US$8).

## 1b. Comisión del comercio en % del precio: entre el banco y Mercado Pago

Modo sin interés, origination 3%. La comisión se fija en % del precio (como la publican
banco y MP); el programa la traduce a % de lo financiado según el anticipo del escalón.
Referencia (tabla de Google modo IA, SIN VERIFICAR): banco ~8,5% + IVA a 8 días hábiles;
MP ~18-19% + IVA al instante, ambos con tarjeta del comprador.

| Comisión (% precio) | Sobre financiado (esc. 0) | Libro d=30% | Junior d=30% | Mora de equilibrio | Estrés d=40% r=65% | Tarjeta 20% desconoc. | Lazo + junior por plan** | Planes/mes opex US$20k |
|---|---|---|---|---|---|---|---|---|
| 7.0% | 10.0% | 9.3% | 9.7% | 43.4% | -13.9% | -1.0% | +23.82 | 840 |
| 9.0% | 12.9% | 22.3% | 61.6% | 61.1% | -1.7% | 11.6% | +42.39 | 472 |
| 12.6% | 18.0% | 47.8% | 163.8% | 93.0% | 22.4% | 36.6% | +75.82 | 264 |

\*\* economía consolidada empresa + junior, A=650 financiado, CAC US$5: no depende del reparto pool/empresa.

**Comisión fija del 9% del precio en la escalera v2**

| Escalón | Anticipo | Cobertura | Sobre financiado | Libro d=30% plano | Libro si d baja 30/25/20/15% |
|---|---|---|---|---|---|
| 0 | 30.0% | 100.0% | 12.9% | 22.3% | 22.3% |
| 1 | 20.0% | 100.0% | 11.2% | 14.9% | 18.4% |
| 2 | 15.0% | 95.0% | 10.6% | 8.6% | 16.7% |
| 3 | 10.0% | 90.0% | 10.0% | 2.8% | 16.4% |

## 2. Cartera mixta H1/H2 (qué pasa según cuántos comercios eligen "sin interés")

| % ventas en modo SIN INTERÉS | Libro d=30% | Junior d=30% | Margen empresa/plan |
|---|---|---|---|
| 100.0% | 13.7% | 27.5% | +9.00 |
| 70.0% | 14.2% | 29.3% | +9.09 |
| 50.0% | 14.5% | 30.5% | +9.16 |
| 30.0% | 14.8% | 31.7% | +9.22 |
| 0.0% | 15.3% | 33.5% | +9.32 |

## 3. Escalera de escalones (precio H1 = modo sin interés)

**Actual (cobertura baja 100→70%)**

| Escalón | Anticipo | Cobertura | Exposición máx. fiador (% precio) | Costo comercio (% precio) | Libro d=30% plano | Libro si d baja 30/25/20/15% |
|---|---|---|---|---|---|---|
| 0 | 30.0% | 100.0% | 73.5% | 7.0% | 13.7% | 13.7% |
| 1 | 20.0% | 90.0% | 75.6% | 8.0% | 7.2% | 11.8% |
| 2 | 10.0% | 80.0% | 75.6% | 9.0% | 0.6% | 12.0% |
| 3 | 0.0% | 70.0% | 73.5% | 10.0% | -6.0% | 14.4% |

**v2 (piso de anticipo 10%, cobertura ≥90%)**

| Escalón | Anticipo | Cobertura | Exposición máx. fiador (% precio) | Costo comercio (% precio) | Libro d=30% plano | Libro si d baja 30/25/20/15% |
|---|---|---|---|---|---|---|
| 0 | 30.0% | 100.0% | 73.5% | 7.0% | 13.7% | 13.7% |
| 1 | 20.0% | 100.0% | 84.0% | 8.0% | 13.7% | 17.3% |
| 2 | 15.0% | 95.0% | 84.8% | 8.5% | 10.5% | 18.6% |
| 3 | 10.0% | 90.0% | 85.0% | 9.0% | 7.2% | 21.0% |

## 4. Sensibilidad: recupero del fiador y rail de cobro (H1, d=30%)

| Rail / supuesto | r | desconocimiento | procesamiento | Libro anual | Mora de equilibrio |
|---|---|---|---|---|---|
| Tarjeta, caso base | 80.0% | 5.0% | 5.0% | 13.7% | 49.6% |
| Tarjeta, muchos desconocimientos | 80.0% | 20.0% | 5.0% | 3.3% | 33.2% |
| Tarjeta, recupero pobre | 60.0% | 15.0% | 5.0% | -7.9% | 24.4% |
| DEBIN/CBU del fiador | 75.0% | 2.0% | 1.0% | 14.3% | 50.9% |
| Fiador paga en USDC (mandato) | 70.0% | 0.0% | 0.2% | 11.6% | 45.0% |

| d \ r (H1) | 50% | 65% | 80% | 90% |
|---|---|---|---|---|
| 15.0% | 11.9% | 18.1% | 24.3% | 28.4% |
| 25.0% | -3.3% | 7.0% | 17.3% | 24.1% |
| 30.0% | -11.0% | 1.4% | 13.7% | 22.0% |
| 35.0% | -18.6% | -4.2% | 10.2% | 19.9% |
| 45.0% | -33.9% | -15.3% | 3.2% | 15.6% |

## 5. Tramo sin fiador (S0: anticipo 50%, tope US$150, modo H1)

| Mora | Resultado por plan (US$) | Anual |
|---|---|---|
| 10.0% | +1.00 | 5.8% |
| 20.0% | -4.00 | -23.2% |
| 30.0% | -9.00 | -52.2% |

## 6. Capital necesario y P&L mensual por etapa (régimen estable)

Economía consolidada empresa + tramo junior (la empresa/sponsor pone el junior).
Cartera: 3 cuotas, 50% modo sin interés (H1) / 50% con costo (H2), financiado medio US$500.

| Etapa | Planes/mes | Originado/mes | Pool necesario | Junior 20% | Fees empresa | Variables | Resultado junior | Opex | EBITDA/mes |
|---|---|---|---|---|---|---|---|---|---|
| Piloto (2-3 comercios) | 50 | 25,000 | 62,500 | 12,500 | 648 | 450 | 581 | 6,000 | -5,221 |
| Ciudad 1 (Tucumán, 10-20 comercios) | 300 | 150,000 | 375,000 | 75,000 | 3,891 | 2,700 | 3,484 | 12,000 | -7,325 |
| 3 ciudades + Tiendanube | 1000 | 500,000 | 1,250,000 | 250,000 | 12,969 | 9,000 | 11,613 | 20,000 | -4,418 |
| Escala nacional | 3000 | 1,500,000 | 3,750,000 | 750,000 | 38,907 | 27,000 | 34,840 | 35,000 | 11,747 |

Rendimiento anual del pool en régimen estable: 17.5%; junior: 55.7%.
Cartera viva = (n+1)/2 meses de originación. Opex por etapa: supuesto propio.

## 6b. Palancas: planes/mes para cubrir el opex (EBITDA = 0)

| Configuración | Margen fees/plan | Resultado junior/plan | Equilibrio opex US$20k | Equilibrio opex US$35k | Pool a US$35k |
|---|---|---|---|---|---|
| Base: 3 cuotas, A=500, CAC 8, origination 2% | +3.97 | +11.61 | 1,284 | 2,246 | 2,807,675 |
| + ticket medio A=650 (notebooks/PC) | +7.86 | +15.10 | 871 | 1,525 | 2,477,461 |
| + origination 3% (en vez de 2%) | +14.36 | +8.60 | 871 | 1,525 | 2,477,461 |
| + CAC US$5/plan (recompra: US$15 por usuario, 3 planes) | +17.36 | +8.60 | 771 | 1,348 | 2,191,126 |
| + 40% de la originación en 6 cuotas (mora 35%) | +17.39 | +20.64 | 526 | 920 | 1,944,031 |
| + otros ingresos US$3/plan (graduación/datos/SaaS — hipótesis) | +23.39 | +20.64 | 487 | 853 | 1,801,899 |

## 6c. Rampa a 36 meses y cuánta plata hace falta (escenario, no pronóstico)

Mix: 3 cuotas 50/50 H1/H2 + desde el mes 13, 30% en 6 cuotas; A=650; CAC US$5; origination 3%.
Volumen y opex por mes: supuestos propios para dimensionar la ronda.

**Base (d=30%, r=80%)**

| Mes | Planes/mes | Originado/mes | Pool | EBITDA/mes | Acumulado |
|---|---|---|---|---|---|
| 6 | 90 | 58,500 | 146,250 | -3,664 | -25,877 |
| 12 | 400 | 260,000 | 650,000 | -3,617 | -67,048 |
| 18 | 700 | 455,000 | 1,393,438 | 10,510 | -30,249 |
| 24 | 1120 | 728,000 | 2,229,500 | 14,216 | 18,280 |
| 30 | 1540 | 1,001,000 | 3,065,562 | 28,922 | 155,046 |
| 36 | 1960 | 1,274,000 | 3,901,625 | 43,628 | 380,046 |

Equilibrio mensual: mes 13. Pérdida acumulada máxima: US$67,048. Junior máximo a fondear: US$780,325.

**Estrés (d=40%, r=65%)**

| Mes | Planes/mes | Originado/mes | Pool | EBITDA/mes | Acumulado |
|---|---|---|---|---|---|
| 6 | 90 | 58,500 | 146,250 | -6,971 | -40,207 |
| 12 | 400 | 260,000 | 650,000 | -18,315 | -142,007 |
| 18 | 700 | 455,000 | 1,393,438 | -14,249 | -227,235 |
| 24 | 1120 | 728,000 | 2,229,500 | -25,399 | -379,253 |
| 30 | 1540 | 1,001,000 | 3,065,562 | -25,548 | -532,169 |
| 36 | 1960 | 1,274,000 | 3,901,625 | -25,698 | -685,981 |

Equilibrio mensual: no llega en 36 meses. Pérdida acumulada máxima: US$685,981. Junior máximo a fondear: US$780,325.

## 7. Caso PC US$1.000, escalón 0 — cada actor

**H1 sin interés**: comprador paga 1,000 (+0.0%); comercio cobra hoy 930 (7.0% del precio); pool desembolsa 644 y espera recuperar 666; empresa cobra 14.00 de origination; fiador: costo esperado 118, máximo 735.

**H2 con costo**: comprador paga 1,056 (+5.6%); comercio cobra hoy 979 (2.1% del precio); pool desembolsa 693 y espera recuperar 719; empresa cobra 14.00 de origination; fiador: costo esperado 127, máximo 794.

## 8. Reparto recomendado (v3): rentabilidad de la empresa, el pool y los inversores

Lazo cobra 4% de lo financiado (originación) + 2%/año sobre saldo (administración) en todos los modos.
H1 = 9% del precio; H2 = 8% al comprador + 5% de lo financiado al comercio. CAC US$5. Desde el mes 13, 30% en 6 cuotas.

| Modo | Costo comprador | Costo comercio (% precio) | Libro d=30% | Junior d=30% |
|---|---|---|---|---|
| H1 3 cuotas | 0.0% | 9.0% | 16.2% | 37.2% |
| H2 3 cuotas | 5.6% | 3.5% | 13.9% | 28.1% |
| H1 6 cuotas (d=35%) | 0.0% | 11.2% | 13.1% | 25.0% |
| H2 6 cuotas (d=35%) | 9.8% | 2.8% | 14.0% | 28.4% |

**PC US$1.000 en H1:** comercio paga 90.00; originación 28.00; administración 2.33; pérdida esperada neta de mora y cobro 33.87; ganancia esperada del pool 25.80. Rampa (lo paga el estudiante aparte): 3.98.

**Empresa por plan (ticket financiado medio US$650, 3 cuotas 50/50):** originacion +26.00, administracion +2.17, rampa +3.85, kyc_gas +1.00, adquisicion +5.00, margen +26.01

| d | Pool | Senior | Junior |
|---|---|---|---|
| 10.0% | 31.4% | 8.0% | 125.1% |
| 20.0% | 24.8% | 8.0% | 92.0% |
| 30.0% | 18.2% | 8.0% | 58.9% |
| 40.0% | 11.5% | 8.0% | 25.7% |
| 50.0% | 4.9% | 8.0% | -7.4% |

**Rampa 36 meses, Base (d=30%, r=80%)**

| Mes | Planes | Empresa sola | Junior (resultado) | Empresa + 50% junior | Empresa + 100% junior | Pool anual | Junior anual |
|---|---|---|---|---|---|---|---|
| 6 | 90 | -3,659 | 1,414 | -2,952 | -2,244 | 18.0% | 58.0% |
| 12 | 400 | -3,595 | 6,287 | -451 | 2,692 | 18.0% | 58.0% |
| 18 | 700 | 4,565 | 13,669 | 11,399 | 18,234 | 18.2% | 58.9% |
| 24 | 1120 | 4,704 | 21,870 | 15,639 | 26,574 | 18.2% | 58.9% |
| 30 | 1540 | 15,843 | 30,071 | 30,878 | 45,914 | 18.2% | 58.9% |
| 36 | 1960 | 26,982 | 38,273 | 46,118 | 65,254 | 18.2% | 58.9% |

- Empresa sola: equilibrio mensual mes 15; pozo máximo US$69,737; acumulado a 36 meses US$142,195.
- Empresa +50% junior: equilibrio mensual mes 13; pozo máximo US$50,902; acumulado a 36 meses US$431,796.
- Empresa +100% junior: equilibrio mensual mes 11; pozo máximo US$38,169; acumulado a 36 meses US$721,397.

**Rampa 36 meses, Estrés (d=40%, r=65%)**

| Mes | Planes | Empresa sola | Junior (resultado) | Empresa + 50% junior | Empresa + 100% junior | Pool anual | Junior anual |
|---|---|---|---|---|---|---|---|
| 6 | 90 | -3,679 | -1,873 | -4,615 | -5,551 | -9.0% | -76.8% |
| 12 | 400 | -3,682 | -8,324 | -7,844 | -12,006 | -9.0% | -76.8% |
| 18 | 700 | 4,406 | -12,812 | -2,000 | -8,406 | -4.6% | -55.2% |
| 24 | 1120 | 4,450 | -20,500 | -5,800 | -16,050 | -4.6% | -55.2% |
| 30 | 1540 | 15,493 | -28,187 | 1,400 | -12,694 | -4.6% | -55.2% |
| 36 | 1960 | 26,537 | -35,874 | 8,600 | -9,338 | -4.6% | -55.2% |

- Empresa sola: equilibrio mensual mes 15; pozo máximo US$70,400; acumulado a 36 meses US$135,388.
- Empresa +50% junior: equilibrio mensual mes 29; pozo máximo US$177,464; acumulado a 36 meses US$-142,267.
- Empresa +100% junior: equilibrio mensual no llega; pozo máximo US$419,921; acumulado a 36 meses US$-419,921.

## 9. Liquidez del pool y cuánta plata necesita la empresa

**Si se deja de originar, cuánto del pool vuelve a caja** (cartera 3 cuotas, régimen estable):

| Mes | % del pool en caja (acumulado) |
|---|---|
| 0 | 20.0% |
| 1 | 59.5% |
| 2 | 85.1% |
| 3 | 101.1% |
| 4 | 101.1% |

**Rendimiento según cuánto del pool se presta** (el resto queda en caja/Kamino al 4,5%):

| Prestado | Pool | Junior |
|---|---|---|
| 60.0% | 14.8% | 41.8% |
| 70.0% | 16.5% | 50.3% |
| 80.0% | 18.2% | 58.9% |
| 90.0% | 19.9% | 67.4% |

**Senior y junior en años buenos y malos** (régimen estable):

| Año | Mora | Recupero | Pool | Senior | Junior |
|---|---|---|---|---|---|
| Bueno | 20.0% | 80.0% | 24.8% | 8.0% | 92.0% |
| Normal | 30.0% | 80.0% | 18.2% | 8.0% | 58.9% |
| Malo | 40.0% | 65.0% | -4.6% | 8.0% | -55.2% |
| Muy malo | 50.0% | 50.0% | -35.2% | -19.0% | -100.0% |

**Ronda de la empresa** (legal US$65,000, colchón 6 meses de opex de US$14k, junior al mes 18):

| Parte del junior que pone Lazo | Pozo de opex | Colchón | Legal | Junior propio | Total | Equilibrio mensual | Junior que pone el sponsor | Acumulado 36 meses |
|---|---|---|---|---|---|---|---|---|
| 0.0% | 69,737 | 84,000 | 65,000 | 0 | **218,737** | mes 15 (550 planes/mes) | 278,688 | 142,195 |
| 25.0% | 58,917 | 84,000 | 65,000 | 69,672 | **277,589** | mes 13 (450 planes/mes) | 209,016 | 286,995 |
| 50.0% | 50,902 | 84,000 | 65,000 | 139,344 | **339,246** | mes 13 (450 planes/mes) | 139,344 | 431,796 |
| 100.0% | 38,169 | 84,000 | 65,000 | 278,688 | **465,856** | mes 11 (350 planes/mes) | 0 | 721,397 |

## 10. Si el fiador paga casi siempre: precio al comercio y reparto entre tramos

**Pérdida por mora en una PC de US$1.000 (H1, 9% del precio, mora 30%) según el recupero del fiador:**

| Recupero del fiador | Desconocimientos | Pérdida neta | Ganancia del pool |
|---|---|---|---|
| 0.0% | 5.0% | 140.00 | -80.33 |
| 50.0% | 5.0% | 73.67 | -14.00 |
| 80.0% | 5.0% | 33.87 | +25.80 |
| 90.0% | 5.0% | 20.60 | +39.07 |
| 95.0% | 3.0% | 11.31 | +48.35 |

**Pool / junior en régimen estable, todo modo sin interés a 3 cuotas, según la comisión (% del precio) y el recupero:**

| Comisión | Recupero 80% | Recupero 90% | Recupero 95% (tarjeta ejecutada) |
|---|---|---|---|
| 5.0% | -8.8% / -76.2% | 0.3% / -30.7% | 6.6% / 1.1% |
| 6.0% | -2.0% / -41.9% | 7.1% / 3.6% | 13.5% / 35.4% |
| 7.0% | 4.9% / -7.6% | 14.0% / 37.9% | 20.3% / 69.7% |
| 8.0% | 11.7% / 26.7% | 20.8% / 72.2% | 27.2% / 104.0% |
| 9.0% | 18.6% / 61.0% | 27.7% / 106.4% | 34.1% / 138.3% |

**Tres formas de repartir entre senior y junior** (régimen estable, cartera recomendada):

| Año | Pool | A. Senior fijo 8% / junior | B. Senior 8% + 20% del excedente / junior | C. Un solo tramo |
|---|---|---|---|---|
| Bueno | 24.8% | 8.0% / 92.0% | 11.4% / 78.6% | 24.8% |
| Normal | 18.2% | 8.0% / 58.9% | 10.0% / 50.7% | 18.2% |
| Malo | -4.6% | 8.0% / -55.2% | 8.0% / -55.2% | -4.6% |
| Muy malo | -35.2% | -19.0% / -100.0% | -19.0% / -100.0% | -35.2% |

