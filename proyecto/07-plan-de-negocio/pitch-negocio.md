# Lazo: el negocio en 5 minutos

**Para leer rápido y encontrar qué está mal.** Cada bloque tiene un titular, un gráfico, lo que hay que entender y **qué revisar**. Los números salen de `modelo-v2.py` (§8 y §9 de `salida-modelo-v2.md`) y los gráficos, de `graficos.py`.

**Todo es un escenario, no un pronóstico.** No hay usuarios, comercios ni inversores reales, y el MVP corre en devnet (la red de prueba de Solana, con plata de mentira). Supuestos base: mora del 30%, al fiador se le recupera el 80% de lo que debe, ticket financiado medio de US$650 y 3 cuotas.

Los gráficos se ven en la vista previa de VS Code (`Cmd+Shift+V`) o en GitHub. El detalle completo está en `plan-de-negocio.md`.

---

## 1. Lazo se queda con US$3,4 de cada US$100 vendidos, como Klarna y Affirm

![Cuánto se queda la empresa](graficos/pitch-1-take-rate.svg)

- **Decidido por el equipo (6/10):** la comisión de Lazo queda en 4% de originación + 2%/año de administración. Es un porcentaje razonable para la industria y no se sube.
- De una PC de US$1.000, Lazo cobra **US$34**: US$28 de originación, US$2,33 de administración y ~US$4 de rampa. Restando los costos por plan (verificación de identidad, comisión de red y adquisición), le quedan **US$26 limpios**.
- **¿Es poco?** Es lo normal de la industria. Klarna se queda con ~US$2,7 de cada US$100 y Affirm con ~US$4,0 después de costos de transacción. Las fintech de crédito no ganan por compra: **ganan por volumen y por recompra**.
- **Lazo no pone la plata del préstamo:** los US$700 los ponen los inversores del pool. Lazo cobra por el trabajo: consigue comercios, verifica, cobra y recupera.

**Qué revisar:** la comparación no es exacta. El número de Affirm ya descuenta mora y costo de fondeo, y el de Lazo no, porque la mora la absorbe el pool. Lo de Klarna sale de una fuente secundaria (Sacra).

## 2. La comisión del comercio es una torta: si Lazo se lleva más, el inversor se va

![A dónde va la comisión](graficos/02-a-donde-va-la-comision.svg)

- El comercio paga US$90. **US$34 se van en mora que no se recupera.** Quedan US$56 para repartir entre Lazo (US$30) y los inversores (US$26).
- Si Lazo cobrara 6% de originación en vez de 4%, el pool rendiría 7% por año y el junior 1,5%. Nadie pondría plata.
- **Cómo gana más Lazo sin sacarle al inversor:**
  1. **Bajar la mora:** 10 puntos menos de mora dejan **+US$11 por plan** para repartir.
  2. **Volumen y recompra:** la escalera hace que el mismo estudiante vuelva, y la adquisición se reparte entre más compras.
  3. **Tickets más altos y 6 cuotas.**
  4. **Poner parte del junior** (ver 5).
  5. **Ingresos nuevos:** suscripción para comercios, graduación a tarjeta propia y API de reputación. Ninguno está validado (`plan-de-negocio.md` §10).

**Ojo, no es que "no cobramos nada de la mora".** El modelo supone que 3 de cada 10 estudiantes dejan de pagar y que al fiador se le cobra el 80% de lo que debe. Los US$34 son **lo que no se llega a recuperar** después de cobrarle al fiador:

| Cuánto se le cobra al fiador | Pérdida por PC de US$1.000 | Ganancia del pool |
|---|---|---|
| Nada (el peor caso posible) | US$140 | **−US$80** |
| 50% | US$74 | −US$14 |
| **80% (lo que usa el modelo)** | **US$34** | **+US$26** |
| 90% | US$21 | +US$39 |
| 95% (tarjeta ejecutada, ver 7) | US$11 | +US$48 |

**Todo lo que se recupera, y el punitorio, queda en el pool rindiendo:** es plata de los inversores, no de Lazo. Eso ya funciona así en el programa (`keeper_register_recovery`).

**Qué revisar:** la mora del 30% es un supuesto pesimista a propósito. Si sale menor, o si al fiador se le cobra casi todo, ganan todos.

## 3. Lazo empieza a ganar plata en el mes 13, con ~450 compras por mes

![Cuándo es rentable](graficos/pitch-2-cuando-es-rentable.svg)

![Cuántos planes por mes](graficos/pitch-4-planes-para-equilibrio.svg)

- Cada plan le deja a Lazo **US$27 solo con comisiones** (con algo de 6 cuotas), o **US$31 si además pone el 25% del junior**.
- Con el 25% del junior, para cubrir los gastos de cada etapa hacen falta ~190 compras por mes en el piloto, ~450 en Tucumán, ~800 en tres ciudades y ~1.100 a escala nacional.
- El mes 19 vuelve a cero porque se pasa a 3 ciudades y el opex sube de US$14k a US$25k por mes.

**Qué revisar:** el volumen y el opex son supuestos propios. **¿Llegamos a 450 compras por mes en Tucumán en un año?** Esa es la pregunta que va a hacer un inversor, y hoy no tenemos un solo comercio firmado.

## 4. La ronda: ~US$280k para llegar a ser rentable

![Cuánta plata hace falta](graficos/pitch-3-cuanta-plata.svg)

| Uso | Monto | Para qué |
|---|---|---|
| Pozo hasta el equilibrio | US$59k | Las pérdidas de los primeros 12 meses |
| Colchón | US$84k | 6 meses de opex (US$14k) por si algo se demora |
| Legal y estructura | US$65k | Registro en el BCRA como proveedor de crédito (PNFC), contratos, AAIP, UIF, vehículo para el senior |
| Junior propio (25%) | US$70k | La piel en juego de Lazo en el pool, al mes 18 |
| **Total** | **~US$280k** | |

- Fuera de la empresa: un **sponsor** pone el resto del junior (~US$210k al mes 18) e **inversores calificados** ponen el senior (~US$1,1M al mes 18).
- El plan anterior decía US$430-490k porque suponía que Lazo ponía todo el junior.

**Qué revisar:** sin sponsor no hay junior, y sin junior no hay senior. Conseguir el sponsor (hay precedente: Solana Foundation fue LP de Credix) es tan importante como la ronda.

## 5. Senior y junior, explicado en simple

**El pool es plata de varios inversores. Hay dos maneras de poner plata, y cada una le conviene a un tipo distinto de inversor:**

| | **Senior = "tramo protegido"** | **Junior = "tramo de primera pérdida"** |
|---|---|---|
| A quién le sirve | Al que quiere dólares tranquilos, como un plazo fijo | Al que conoce el riesgo y quiere el premio grande: Lazo, los fundadores, un sponsor |
| Qué parte del pool pone | 80% | 20% |
| Cuándo cobra | **Primero** | Después del senior |
| Si un estudiante no paga y el fiador tampoco | No pierde nada mientras el junior aguante | **Pierde primero** |
| Cuánto gana | Un número fijo (8%) | Todo lo que sobra |

**Es como una hipoteca.** El banco que presta (senior) cobra su tasa pase lo que pase. El dueño del departamento (junior) se queda con la ganancia si sube de valor y con la pérdida si baja.

![Senior vs. junior](graficos/pitch-5-senior-vs-junior.svg)

- **Por qué el junior gana más:** porque es el que pierde primero. Si ganara menos que el senior y encima pusiera la cara, nadie lo pondría. Y sin junior no hay senior: nadie presta sin alguien que absorba las primeras pérdidas.
- **"Si en un buen año el senior gana solo 8%, no tiene sentido."** Para el que busca seguridad, sí lo tiene: en un año malo sigue cobrando su 8% mientras el junior pierde 55%. Paga la seguridad renunciando a lo que sobra. **Pero tenés razón en que se puede mejorar:**

![Estructuras del senior](graficos/pitch-8-estructuras-senior.svg)

| Opción | Senior en un año bueno / normal / malo | Junior en un año bueno / normal / malo | Lectura |
|---|---|---|---|
| A. Senior fijo (lo de hoy) | 8% / 8% / 8% | 92% / 59% / −55% | Simple, pero el senior no comparte nada |
| **B. Senior con participación** | **11% / 10% / 8%** | **79% / 51% / −55%** | **Recomendada:** el senior tiene piso de 8% y además se lleva 20% de lo que el pool gane por encima de eso. El junior sigue bien pago |
| C. Un solo tramo, todos iguales | 25% / 18% / −5% | (no hay junior) | Todos ganan y pierden lo mismo. Sin protección es más difícil conseguir plata grande |

**Qué revisar:** el 20% de participación es una propuesta. Se ajusta en `ProtocolConfig` y se negocia con los primeros inversores. En el programa de hoy el senior es fijo (opción A).

## 6. Si los inversores quieren retirar: la plata vuelve rápido, con reglas claras

![Liquidez](graficos/pitch-6-liquidez.svg)

![Caja vs. rendimiento](graficos/pitch-7-caja-vs-rendimiento.svg)

- **Los planes son cortos.** Si Lazo deja de prestar hoy, en 1 mes vuelve el 59% del pool y en 2 meses el 85%. No hace falta bloquear la plata por años.
- **Igual hacen falta reglas, porque si todos piden a la vez el pool se traba.** La propuesta (`plan-de-negocio.md` §9.1):

| | Tramo protegido (senior) | Tramo de primera pérdida (junior) |
|---|---|---|
| Plazo mínimo | **3 meses** (lo que dura un plan) | **6 meses** (antes proponíamos 12: era mucho) |
| Aviso para retirar | 30 días | 60 días |
| Tope de retiros | **Hasta 20% del pool por mes**, en orden de llegada | Puede retirar si la protección del senior sigue arriba del 20% del pool, o si otro junior entra en su lugar |
| Rendimiento | 8%. Opción: **9% si bloquea 12 meses** | Lo que sobra |
| Si piden más de lo que hay | Se frena la originación nueva y todo lo que entra de cuotas paga retiros | — |

- **Para que el junior no quede atado (tenías razón: 12 meses es mucho):**
  1. **Plazo de 6 meses** en vez de 12.
  2. **Puede vender su parte a otro inversor en cualquier momento.** Su participación es un token en Solana, así que se puede transferir sin sacar plata del pool. Solo entre inversores calificados, por la regulación.
  3. **Roadmap, junior por tanda:** cada depósito respalda los planes de los 3 meses siguientes y vuelve cuando esos planes se terminan de cobrar, a los ~6 meses.
- **Cuánto dejar quieto:** con 20% del pool en caja (o en Kamino al ~4,5%), el pool rinde 18%. Con 40% en caja baja a ~15%. El senior cobra 8% igual; lo que cambia es lo que le queda al junior.

**Qué revisar:** hoy el programa solo deja retirar si hay plata en la bóveda (`lp_withdraw`). El plazo mínimo, el aviso, la cola y el tope son cambios al programa y a `ProtocolConfig`. Están en el roadmap, no en la demo.

## 7. ¿Es mucho 9% para el comercio? Depende de cuánto le cobremos al fiador

**Contra qué compite** (tabla de Google modo IA, sin verificar): el banco cobra ~8,5% + IVA por 3 cuotas sin interés y paga a 8 días hábiles. Mercado Pago cobra ~18-19% + IVA y paga al instante. Los dos necesitan que el comprador tenga tarjeta. **9% es el precio del banco, y vos sentís que es mucho.** Se puede bajar si se cumple tu idea: que al fiador se le cobre siempre.

![Precio vs. recupero](graficos/pitch-9-precio-vs-recupero.svg)

| Comisión al comercio | Si al fiador se le cobra 80% | 90% | 95% (tarjeta ejecutada) |
|---|---|---|---|
| 6% | pool −2% ❌ | pool 7% ⚠️ | pool 13,5% ✅ |
| 7% | pool 5% ⚠️ | pool 14% ✅ | pool 20% ✅ |
| **8%** | **pool 12% ✅** | **pool 21% ✅** | **pool 27% ✅** |
| 9% | pool 19% ✅ | pool 28% ✅ | pool 34% ✅ |

✅ el senior cobra su 8% y al junior le queda bastante · ⚠️ el senior cobra, pero al junior le queda poco o pierde · ❌ el pool pierde. Todo modo sin interés, 3 cuotas, mora 30%.

**Tu regla para el fiador** (la sumamos al plan, `plan-de-negocio.md` §6.2):

- Si el estudiante no paga, **se le cobra directo a la tarjeta del fiador**, sin pedirle permiso cada vez. Lo firmó en la fianza.
- **No puede sacar la tarjeta mientras haya un plan activo.** Solo puede cambiarla por otra válida. Se libera cuando no queda ningún plan.
- **Lo que no podemos controlar, y por eso el recupero nunca es 100%:**
  - el fiador puede dar de baja la tarjeta en su banco, o quedarse sin cupo;
  - puede desconocer el cargo;
  - si firmó online, tiene 10 días hábiles para arrepentirse (ley de defensa del consumidor).
  - La respuesta: la fianza firmada (respaldo legal), el DEBIN como segundo medio de cobro y avisar antes de cada cargo.

**Recomendación:**

- **Lanzar a 8% del precio:** un poco menos que el banco. Funciona aunque al fiador se le cobre solo el 80%.
- **Bajar a 7% (o 6%) cuando el piloto muestre que se le cobra al fiador el 90-95%.** La comisión vive en `ProtocolConfig`, así que se cambia sin tocar código.
- Lo que cobra Lazo no cambia (4% + 2%/año): lo que baja es lo que gana el pool.

## 8. ¿Varios planes al mismo tiempo? (a decidir)

Hoy el estudiante tiene **un plan por vez**: varios planes quedaron fuera del MVP (`03-mvp.md`). Vos planteás permitir más según el escalón. **Propuesta para discutir, no es una decisión:**

| Escalón | Planes activos a la vez | Límite |
|---|---|---|
| 0 | 1 | La suma de lo que debe no puede pasar el tope del escalón ni la fianza que firmó el fiador |
| 1 | 1 | Igual |
| 2 | 2 | Igual |
| 3 | 3 | Igual |

- **Lo que importa es el total que debe, no la cantidad de planes.** Si la fianza del fiador es de US$1.000, la suma de todos los planes activos no puede pasar de US$1.000.
- **A favor:** más volumen por estudiante, que es justo lo que hace falta (§3).
- **En contra:** más exposición por familia, y en el programa hay que pasar de "un plan activo" a sumar exposición (el campo `active_exposure` ya existe).

---

## Lo que puede estar mal (en orden de importancia)

1. **El recupero del fiador.** Si se le cobra menos del ~66% de lo que debe, el junior pierde (`plan-de-negocio.md` §16, gráfico 07). Es la métrica #1 del piloto.
2. **La mora.** El 30% es un supuesto conservador tomado del BCRA, no un dato nuestro.
3. **El volumen.** 450 compras por mes en Tucumán al mes 13 no tiene ninguna validación.
4. **El precio al comercio.** Ningún comercio aceptó todavía ni 8% ni 9%, y las cifras de banco y Mercado Pago contra las que lo comparamos están sin verificar (`plan-de-negocio.md` §3.4). Bajarlo depende de que al fiador se le cobre de verdad (§7).
5. **El sponsor del junior.** Sin él, la ronda pasa de ~US$280k a ~US$470k.
6. **El costo de adquisición.** US$5 por plan es optimista para una empresa chica.

## Fuentes de la comparación con la industria

- Klarna 2024: ingresos US$2.810M sobre un volumen de US$105.000M, ~2,7% ([Sacra](https://sacra.com/c/klarna/), fuente secundaria; registro original en la [SEC](https://www.sec.gov/Archives/edgar/data/2003292/000162827924000428/filename1.htm)).
- Affirm FY2025: ingresos menos costos de transacción = 4,0% del volumen ([carta a accionistas Q4 FY2025, SEC](https://www.sec.gov/Archives/edgar/data/1820953/000182095325000078/affirmfq425designedshare.htm)).
