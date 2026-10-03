# B — Morosidad, garantías y regulación (Argentina)

Sesión del 2026-10-03. Pregunta: ¿qué tan probable es que pague un estudiante sin historial, qué mecanismos reducen el default, qué exige la ley argentina para prestar y captar fondos, y cuánto cuesta verificar identidad? Cada dato lleva su fuente con fecha; lo no confirmado está marcado **SIN VERIFICAR**.

## Resumen ejecutivo

- **La morosidad del crédito de consumo argentino está en máximos históricos y subiendo:** familias 12,8% (mayo-2026) y préstamos personales de proveedores no financieros 34,1% (feb-2026), según el BCRA. El supuesto "morosidad baja" del modelo no se sostiene en este ciclo: hay que diseñar el pool para absorber ~20-35% de pérdida en la primera cohorte, no para 5%.
- **El único mecanismo probado que corta el default a la mitad en este segmento es la garantía sobre el bien** (PayJoy bajó el default de 13% a 7% bloqueando el celular financiado), pero PayJoy **no opera en Argentina** y no hay norma ni fallo que autorice bloquear un bien por mora: el régimen ENACOM solo habilita bloqueo por robo/extravío. Para el MVP la combinación realista es anticipo alto + escalones de reputación + identidad real (KYC) + reporte a centrales + fiador opcional.
- **Prestar fondos propios a consumidores es legal como "Otro proveedor no financiero de crédito"** (registro BCRA, umbral ~$10M de financiaciones). Pero un **pool que junta plata de inversores para prestarla es intermediación financiera** (art. 1 Ley 21.526): la vía legal local es el registro PSCPP (Com. A 7406), que **solo cubre préstamos en pesos** y prohíbe garantizar el repago. Un pool en USDC queda fuera de todo régimen claro → zona gris con riesgo de "captación de recursos del público" (art. 19) y, si hay custodia de cripto de terceros, registro PSAV de CNV (RG 994/2024 y RG 1058/2025).
- **Punitorios:** en tarjetas de crédito, tope de +50% sobre la tasa compensatoria (y la compensatoria, +25% sobre la media de personales de la entidad, Ley 25.065). Fuera de tarjetas se pactan libremente, pero solo computan sobre cuotas vencidas y los jueces los reducen si exceden "desproporcionadamente" el costo medio del dinero (art. 771 CCyC; criterio judicial de referencia ~1,5× la tasa BNA). Para el producto conviene punitorio moderado + pérdida de escalón, no punitorio usurario.
- **KYC de costo casi nulo existe hoy:** Didit da 500 verificaciones gratis/mes y luego US$0,33 por KYC completo (cruce contra RENAPER a US$0,20/consulta). El KYC **sí es demostrable en la hackathon**; lo que no es demostrable es el cobro real de un moroso — el piloto debe venderse como prueba del mecanismo de incentivos, no como recuperación de cartera.

---

## 1. Morosidad publicada

### 1.1 Argentina — sistema bancario y crédito no bancario (BCRA)

Evolución de la morosidad de préstamos a **familias** (Informe sobre Bancos, BCRA, salvo indicación):

| Período | Morosidad familias | Morosidad total sector privado | Fuente |
|---|---|---|---|
| feb-2025 | 2,94% | 1,76% | BCRA Informe sobre Bancos feb-2025 |
| ago-2025 | 6,6% (personales 8,2%, tarjetas 6,7%) | 3,7% | CFIN citando BCRA, 18/10/2025 |
| sep-2025 | 7,3% | 4,2% | BCRA Informe sobre Bancos sep-2025 |
| oct-2025 | 7,8% | 4,5% | EntreRíosYA citando Informe sobre Bancos |
| dic-2025 | 9,3% | — | La Nación citando BCRA, 17/3/2026 |
| ene-2026 | 10,6% | — | La Nación citando BCRA, 17/3/2026 |
| may-2026 | 12,8% | 7,7% | El Destape citando Informe sobre Bancos may-2026, 11/8/2026 |

La serie se multiplicó por ~4 en 15 meses. Es la más alta desde que hay serie (2010 según CFIN; "máximo en más de dos décadas" según La Nación).

**Crédito no bancario (PNFC: fintech, billeteras, emisoras) — Informe de Proveedores No Financieros de Crédito del BCRA:**

- jul-2025: irregularidad total **16,2%** (BCRA, Informe PNFC nov-2025).
- feb-2026: irregularidad total **26,9%** (+9,7 p.p. vs ago-2025; +17,4 p.p. interanual). Por tipo: **préstamos personales 34,1%**, tarjetas 19,4%. Todos los grupos subieron salvo "Leasing & Factoring" (cartera garantizada, orientada a personas jurídicas). Rango por grupo: 20% a 58% (BCRA, Informe PNFC jun-2026, PDF).
- Estimaciones privadas previas: EcoGo 23,9% y 1816 >27% para ene-2026; la cifra oficial de feb-2026 (26,9%) confirmó el nivel (La Nación 17/3/2026; TN 6/6/2026).
- Contexto de deuda: a mayo-2026 habría 20,9 millones de personas endeudadas y 5,8 millones en mora en el sistema (Tercer Puente citando datos BCRA, 2026). **SIN VERIFICAR** el desglose exacto en el informe primario.

**Casos concretos:**

- **Ualá:** cartera de consumo irregular: 0,60% (dic-2024) → 35,77% (dic-2025) → 43,19% (feb-2026) → 24,77% (abr-2026) tras dar de baja ~$82.230 M de créditos irrecuperables (write-off). Con criterio de write-off comparable al sistema, la empresa estima ~18% ene / ~17% feb; Bloomberg Línea estima ~14% abr / ~13% may. En su libro **no bancario** (fintech previa al banco) la mora reportada llegó a ~63% según iProUP; Ualá discontinuó la originación P2P a mediados de 2025 y migró la cartera a su banco (Bloomberg Línea, La Nación, El Destape, Tercer Puente, iProUP — todos 2026).
- Lectura: aun el jugador más grande, con datos de millones de usuarios, tuvo que depurar ~1/4 de la cartera de consumo.

### 1.2 LatAm — BNPL y microcrédito

| Empresa | Métrica publicada | Valor | Fecha / fuente |
|---|---|---|---|
| **PayJoy** (financia celulares) | Default sin bloqueo → con bloqueo (México) | **13% → 7%** | Whitepaper PayJoy/Mobile World Live ~ene-2020 |
| | Clientes que tras fallar un pago retoman pagos | 80-98% | Mismo whitepaper |
| | Clientes que repagan total en el año del vencimiento | >60% | payjoy.com/pe/public-benefits (consultado 3/10/2026) |
| | Aprobación de solicitudes | ~90% | Mismo whitepaper / payjoy.com/mx/celulares |
| **Addi** (Colombia/Brasil) | NPL >90 días, cierre Q1-2026 | **4,2%-4,8%** | cicloderiesgo.com (prensa especializada en riesgo), 2026 — **SIN VERIFICAR** en estados financieros |
| **Kueski** (México) | NPL ratio no ajustado (datos Condusef) | 8,6% (may-2024) → 9,1% (dic-2024) → **12,8% (may-2025)** | Miranda Intelligence citando Condusef, jun-2025 (PDF) |
| | "Delinquency de un dígito bajo" | — | Claim de la empresa (Mexico Business News, 2025); inconsistente con Condusef — métricas distintas |
| **Mercado Pago / Mercado Crédito** | NPL 15-90 días, cartera total | 8,2% (Q1-25) → 6,7% (Q2-25) → 6,8% (Q3-25) | Shareholder letters MELI (SEC), ago/oct-2025 |
| | NPL >90 días | ~18,5% (Q2-25) | MELI Q2'25 Earnings Presentation |
| **Ualá** | ver §1.1 | ~14-18% ajustado; ~24-43% bruto | 2026 |

Patrones que se repiten:

- **La mora sube con el ciclo** (Argentina 2025-26; Addi sufrió la suba de tasas global 2022-23 con despidos y reestructuración).
- **La garantía sobre el bien es lo único que mostró reducción estructural** (PayJoy −46% de default).
- Las fintech que informan "low single digit" suelen medirlo distinto (first-payment-default, cohortes recientes, post write-off) que las autoridades (Condusef/BCRA).
- México SOFOM: mediana NPL 2,8% Q1-2025, pero ~16% de las entidades >15% (Margin citando datos oficiales, 2025).

### 1.3 Benchmark global (referencia, no comparable 1:1)

- **Affirm (EE.UU.):** delincuencia 30+ días ~2,4-2,8% de la cartera (FY2025); 90+ ~0,6-0,8%; charge-off a los 120 días; provisión ~5,6% de los préstamos (Shareholder letters FQ3/FQ4'25).
- **Klarna (global):** pérdidas crediticias 0,63% del GMV en FY2025 (vs 0,49% FY2024) — métrica sobre volumen, no sobre cartera (informe anual vía MarketScreener).
- Ojo: ambos operan en mercados con burós maduros y cobranza ejecutiva real; no son piso esperable para Tucumán 2026.

### 1.4 Lectura para el proyecto

El segmento objetivo (estudiante sin historial, crédito de consumo no garantizado) es **el que peor está rindiendo en Argentina**: personales PNFC 34,1% de irregularidad. El modelo debe asumir mora estructural alta y pagarla con diseño (anticipo que reduce exposición ex ante, montos chicos, escalones, reputación portátil con valor, reporte a centrales), no con la esperanza de que el segmento se comporte como una cartera prime.

---

## 2. Mecanismos de garantía para clientes sin historial

### 2.1 Modelo PayJoy (la referencia)

Cómo funciona, según sus propios canales:

- **Estructura jurídica:** "producto de arrendamiento financiero" (leasing con opción a compra), no préstamo: el celular **respalda** la operación y PayJoy conserva título hasta el final (payjoy.com/mx, /co, /pe — consultado 3/10/2026; términos Perú).
- **Anticipo:** 15-20% del precio (México, según su sitio; prensa citaba ~25-30%).
- **Lock app:** app preinstalada con permisos que restringe el acceso al sistema/apps si hay mora; se desbloquea al instante al pagar; llamadas de emergencia y soporte siguen funcionando.
- **Sin cargos por mora ni intereses punitorios:** "los pagos no se acumulan"; tope de costo total 2× el precio del equipo en un año; devolver el equipo cierra la obligación sin mancha crediticia.
- **Reporte crediticio:** informa el comportamiento (construye historial del usuario y disuade el default estratégico); en Perú sus T&C prevén reportar el IMEI como robado si el equipo desaparece.
- **Resultados publicados:** default 13%→7% (México), 80-98% retoman pago tras una mora, ~90% aprobados (whitepaper MWL/PayJoy ~2020; PR Newswire 20/2/2019).
- **Países:** México, Colombia, Panamá, Ecuador, Perú, Brasil, Sudáfrica, Filipinas, Indonesia (payjoy.com/sobre-nosotros; La República, Colombia). **No opera en Argentina.**

### 2.2 Otros mecanismos y su estado

| Mecanismo | Cómo reduce mora | Costo/fricción | Viabilidad MVP |
|---|---|---|---|
| **Anticipo** | Reduce LTV ex ante (con anticipo 50%, el pool expone la mitad); filtra a quien no puede juntar nada | Reduce el mercado (no todos tienen el anticipo) | Ya está en el diseño; es la herramienta principal |
| **Fiador / garante** | Recupero contra un tercero con patrimonio; presión social | Onboarding del fiador; legalmente sólido (fianza, CCyC arts. 1794 y ss.; aval en pagaré) | Demostrable onchain como "aval depositado" |
| **Débito automático** | Comodidad de pago, menor olvido | En TradFi requiere adhesión CBU/CVN; onchain el delegate SPL es revocable y solo cobra si hay saldo | Demostrable (delegate) pero **no es garantía** — ya anotado en 02-validacion |
| **Retención del producto** (layaway/"separe") | Riesgo casi nulo: el comercio entrega el bien recién al final | Mata el valor del BNPL (el usuario no se lleva el bien hoy) | No aplica a la propuesta |
| **Bloqueo del bien (PayJoy)** | Incentivo continuo de pago | Técnica y legalmente complejo en AR (ver 2.3) | **No implementable en el piloto**; mencionable como roadmap |
| **Reporte a centrales de riesgo** | Costo reputacional real y duradero (art. 26 Ley 25.326: 5 años) | Requiere inscripción/relación contractual con Veraz o ser PNFC reportante al BCRA | Parcialmente demostrable (ver §3d) |
| **Reputación onchain con valor** (escalones) | El activo "no re-empezar de cero" solo sirve si el usuario lo valora | Requiere que varios comercios lo respeten | Corazón de la demo |

### 2.3 ¿Es legal bloquear un celular financiado en Argentina?

**SIN VERIFICAR — no hay norma ni fallo que lo autorice expresamente.** Hallazgos:

- El régimen de bloqueo de terminales del ENACOM (Res. 2459/2016, Res. 1360/2023, Res. 1368/2023) habilita la lista negra de IMEI **solo por robo, hurto o extravío** — no por mora.
- El bloqueo por incumplimiento es autotutela del acreedor sobre un bien en poder del consumidor: expuesto al art. 37 de la Ley 24.240 (cláusulas que amplíen los derechos del proveedor o restrinjan los del consumidor se tienen por no convenidas) y a la lista enunciativa de cláusulas abusivas de la Res. 53/2003 (SCDyDC). Estructurarlo como "arrendamiento" (como hace PayJoy) no lo inmuniza: en relación de consumo manda la realidad de la operación, no el rótulo del contrato.
- Un bloqueo que corte comunicación puede chocar además con derechos de acceso a las comunicaciones; PayJoy mitiga esto dejando llamadas de emergencia activas.
- Defensas parciales si algún día se implementa: información previa clara y destacada (art. 4 LDC), bloqueo parcial (apps no esenciales), aviso antes de bloquear, desbloqueo inmediato al pagar, y consentimiento expreso. Pero hoy es una zona gris: **no usarlo en el piloto**.

---

## 3. Regulación argentina

### 3.a Prestar a consumidores sin ser banco: "Otros proveedores no financieros de crédito" (PNFC)

- **Quién debe inscribirse** (Texto ordenado "Proveedores no financieros de crédito", BCRA, t-apnf.pdf): personas jurídicas que ofrecen crédito al público de manera habitual, si son vinculadas a una entidad financiera o si registran **financiaciones > $10.000.000** según último balance auditado (punto 1.3.1.2.ii). Umbral nominal bajo → en la práctica casi todo prestamista operativo debe registrarse. **Verificar si el monto fue actualizado en el TO vigente.**
- **Qué implica:** inscripción vía ARCA (clave fiscal 3), documentación societaria y responsables de PUSF; obligación de informar deudores mensualmente a la Central de Deudores y clasificarlos por mora (Régimen Informativo RI-DSF / Sección 59 de "Presentación de informaciones").
- **Qué NO habilita:** el propio texto ordenado aclara que la inscripción "no implica autorización para realizar operaciones de intermediación financiera, captación de recursos del público" (punto 1.3).
- Para el proyecto: **prestar fondos propios (o del equipo) a estudiantes es viable y legalmente claro** como PNFC registrado. El problema no es el lado prestamista: es el lado del fondeo.

### 3.b Captar fondos de inversores para el pool

- **Ley 21.526 (Entidades Financieras):** alcanza a quien haga "intermediación habitual entre la oferta y la demanda de recursos financieros" (art. 1) y exige autorización previa del BCRA para operar (art. 7). Prohíbe "toda publicidad o acción tendiente a captar recursos del público por parte de personas o entidades no autorizadas", con cese, sanciones del art. 41 y acción penal querellante (art. 19). El BCRA puede requerir información y allanar a intermediarios no autorizados que "actúen en el mercado del crédito" (art. 38).
- **Un pool de inversores que fondea préstamos a terceros es, económicamente, intermediación habitual.** Las vías legales existentes:
  - **Registro PSCPP** ("Proveedores de servicios de créditos entre particulares a través de plataformas", Com. A 7406, vigente 3/1/2022): la plataforma acerca oferentes y demandantes, **no puede asumir riesgo crediticio ni garantizar devolución** (el inversor asume el riesgo), no puede recomprar los créditos, y **el régimen cubre solo préstamos en pesos**. Un pool en USDC no entra en este régimen.
  - **Estructurar como entidad financiera** (compañía financiera/banco): fuera de alcance para una hackathon.
  - **Solo fondos propios**: el pool lo fondean los fundadores/sponsor → no hay captación; es lo que permite el demo.
- **CNV / PSAV:** si la plataforma custodia, intercambia o administra activos virtuales para clientes, es "Proveedor de Servicios de Activos Virtuales" y debe inscribirse **antes de operar** en el Registro PSAV de la CNV (RG 994, B.O. 25/3/2024; régimen completo RG 1058/2025, vigente desde 26/5/2025, con patrimonio neto mínimo en USD, responsable de cumplimiento, etc.). Además, si el "pool" se presenta al público como inversión con rendimiento, puede configurar una oferta de instrumentos de inversión colectiva sujeta a la Ley de Mercado de Capitales 26.831 — **SIN VERIFICAR**, no hay precedente regulatorio publicado para pools BNPL en USDC en Argentina.
- **Precedente revelador:** Ualá discontinuó su originación P2P a mediados de 2025 y migró la cartera a su banco (La Nación, 17/3/2026) — el único jugador local con modelo tipo marketplace de crédito lo cerró.

### 3.c Tope a intereses punitorios

- **CCyC:** los moratorios se determinan por convención, ley o, subsidio, las tasas que fije el BCRA (art. 768); los punitorios funcionan como cláusula penal (art. 769, doctrina) y los jueces **pueden reducir** los intereses que excedan "sin justificación y desproporcionadamente" el costo medio del dinero para operaciones similares (art. 771; punitorios reducibles también por art. 794). La CSJN rechazó un cálculo de "doble tasa activa" por violar arts. 768 y 771 (jurisprudencia citada por Liga del Consorcista). Criterio judicial de referencia para "exceso": ~1,5× la tasa del Banco Nación para la operación análoga (jurisprudencia de Cámara, infojudicial 2019).
- **Normas BCRA (entidades financieras):** los punitorios se pactan libremente pero **solo sobre las cuotas vencidas e impagas**, no sobre el saldo total (TO "Tasas de interés", punto 1.6.2); en tarjetas de crédito la punitoria no puede superar en más del **50%** la compensatoria (punto 2.2.1, origen Com. A 5849/2015) y la compensatoria no puede superar en más del **25%** el promedio de tasas de préstamos personales de la propia entidad del mes anterior (límite del art. 16 de la Ley 25.065 de Tarjetas de Crédito).
- Estos techos BCRA aplican a entidades financieras/emisoras; para un PNFC no bancario rigen el CCyC (morigeración judicial) y la LDC. Referencia comparada: en Colombia la tasa de mora tope es 1,5× el interés bancario corriente (página de tasas de Addi).
- **Diseño sugerido:** punitorio contractual visible pero moderado (p.ej. compensatoria +50% máx. sobre la cuota vencida), con la pérdida de escalón y el reporte a centrales como sanciones principales — más baratas legalmente y mejor UX que un punitorio agresivo.

### 3.d Informar morosos a centrales de riesgo

- **Central de Deudores del BCRA:** es **obligatoria** para los PNFC inscriptos (Régimen Informativo Contable Mensual – Deudores del Sistema Financiero; Com. A 6347 para la difusión). Los deudores quedan clasificados por situación (1 normal → 5 irrecuperable) y la información es consultable por entidades y por el propio deudor.
- **Veraz/Nosis (burós privados):** el art. 26 de la Ley 25.326 permite tratar datos de cumplimiento/incumplimiento "facilitados por el acreedor" sin consentimiento previo del titular cuando se vincula con la actividad crediticia del cesionario (incs. 2 y 5); los datos solo pueden conservarse **5 años** desde el incumplimiento, reducido a **2 años** tras cancelar la obligación (inc. 4). Requisito de fondo: la deuda debe ser cierta y exigible; el deudor puede pedir corrección/supresión (reclamo primero a la entidad informante, luego al BCRA si es la Central).
- Para el MVP: reportar a la Central de Deudores exige ser PNFC registrado; reportar a Veraz exige contrato comercial con la empresa. En la demo se puede mostrar el flujo y el consentimiento en los T&C, aclarando que la publicación real requiere registro.

---

## 4. KYC barato para el MVP

| Opción | Qué valida | Precio | Plan gratis | Fuente |
|---|---|---|---|---|
| **Didit** | DNI/Doc + liveness + face match + IP; **cruce RENAPER** (`arg_renaper`) con face-match contra la foto registral; AFIP `arg_citizens`; buró `arg_credit_bureau` | Bundle US$0,33/KYC; RENAPER US$0,20; AFIP US$1,84; buró US$2,15 (por consulta exitosa) | **500 verificaciones/mes gratis, permanente**, sin tarjeta | didit.me/pricing, docs.didit.me (consultado 3/10/2026) |
| **RENAPER directo (SID)** | Validación de datos del DNI (API REST), vigencia, prueba de vida | ~$60/consulta hasta 40.000 ops/mes; $35 hasta 2M; $20 >2M; prueba de vida $70 (aranceles actualizados mar-2026) | No | argentina.gob.ar/sid + Infobae 3/3/2026 |
| **MetaMap** | Doc + biometría + watchlists + GovChecks | No publica precios; venta consultiva por volumen | Trial 300 verificaciones / 3 meses | metamap.com FAQ; apis.io (consultado 3/10/2026) |
| **Truora** | Doc + OCR + liveness + WhatsApp | **SIN VERIFICAR** — no publica; estimadores de terceros sugieren ~US$0,60-0,90/verif. en entrada | No confirmado | truora.com/precios; spendbase.co (estimación no oficial) |
| **Nosis VID** | DNI vs AFIP + vigencia RENAPER | Consultiva | — | servicios.nosis.com (consultado 3/10/2026); "requiere credenciales Renaper" propias |

Notas:

- El acceso directo a RENAPER exige Convenio Único vía TAD, interés legítimo dictaminado por Renaper, cumplir Ley 25.326 (art. 11: no se puede receder el servicio a terceros) y medidas de seguridad. **Para un MVP, la vía indirecta (Didit u otro agregador) es mucho más rápida** y ya incluye liveness + face-match que el SID cobra aparte.
- Con 500 verificaciones gratis/mes, el costo de KYC para un piloto de ~100-500 estudiantes es **$0**.

---

## 5. Recomendación

### 5.1 Combinación que minimiza morosidad para el piloto en Tucumán

Ordenadas por relación reducción-de-riesgo/viabilidad:

1. **Anticipo alto en los primeros escalones** (el diseño actual: 50%→0%). Es la única "garantía" real al origen: con 50% de anticipo el pool expone la mitad y filtra fraudes puros. No bajarlo hasta tener datos propios.
2. **Montos chicos y topes por escalón** (ej. primer plan ≤ US$100-150). La granularidad es lo que hace sobrevivible a una cartera con 20-35% de mora.
3. **KYC con cruce RENAPER** (Didit free tier). Sin identidad real no hay ni reporte ni fiador ni reputación que valga; además corta el "borrar wallet y empezar de cero".
4. **Reputación onchain con valor real**: escalones que bajan anticipo y suben tope + marca de moroso. Funciona si el usuario quiere seguir comprando — por eso el ancla es la red de comercios, no el token.
5. **Reporte a centrales declarado en los T&C** (consentimiento informado) aunque la publicación real requiera registro PNFC/contrato Veraz.
6. **Fiador opcional** para montos mayores o primer crédito sin DNI validado al 100%: aval en USDC bloqueado, demostrable onchain y culturalmente reconocido.
7. **Débito automático delegate** como comodidad (reduce mora por olvido), nunca presentado como garantía.
8. **Punitorio moderado** (+50% máx. sobre cuota vencida) + pérdida de escalón. Evitar punitorios agresivos: reducibles judicialmente y mala señal ante jurados.
9. **Bloqueo del bien (PayJoy): NO en el piloto.** Sin habilitación legal clara en Argentina y PayJoy eligió no operar acá. Si el producto estrella es un bien inutilizable (p.ej. licencia de software/curso con acceso revocable), una "pausa de acceso" del servicio adquirido es una versión doméstica más defendible — revisar con abogado antes de prometerla.

**El fondeo es el punto legalmente más débil:** para la hackathon, pool fondeado por el equipo/sponsor (sin captación). Todo pool con plata de terceros y promesa de rendimiento entra en la órbita de la Ley 21.526 (y si es en pesos, exige registro PSCPP con el inversor asumiendo el riesgo sin garantías). Presentarlo como "pool propio + diseño de un futuro pool PSCPP/PSAV regulado" es la narrativa honesta y defensible.

### 5.2 Qué es demostrable en una hackathon — y qué no

Demostrable (devnet + gratis):

- Checkout del comercio cobrando al instante desde el pool en USDC (anticipo a la wallet del comercio + plan del estudiante).
- Escalones onchain: anticipo 50%→30%→15%→0% y tope creciente al registrar planes pagados.
- Mora onchain: punitorio acumulando sobre la cuota vencida, marca de moroso, pérdida de escalón.
- Delegate de débito automático (con la advertencia de que es revocable).
- KYC real con Didit (500 gratis/mes) o RENAPER mock si el TAD no llega.
- Panel del inversor del pool: capital, exposición, comisiones del comercio, tasa de mora simulada.

No demostrable — decirlo explícito al jurado:

- Cobro real a un moroso (no hay ejecutivo sin título/registro; lleva meses).
- Datos de mora propios: presentar los benchmarks de este documento (PNFC personales 34,1%; PayJoy 7% con garantía real) y el stress del modelo con esos números, no con mora ideal.
- Registros PNFC/PSCPP/PSAV: son trámites post-hackathon; nombrarlos en el roadmap suma credibilidad regulatoria.

---

## Fuentes

Morosidad Argentina:

1. BCRA, Informe sobre Bancos sep-2025 (familias 7,3%, privado 4,2%): https://www.bcra.gob.ar/publicaciones/informe-sobre-bancos-septiembre-de-2025/ (sep-2025)
2. BCRA, Informe sobre Bancos feb-2025 (familias 2,94%): https://www.bcra.gob.ar/publicaciones/informe-sobre-bancos-febrero-2025/ (feb-2025)
3. CFIN citando BCRA (ago-2025: familias 6,6%, personales 8,2%, tarjetas 6,7%): https://www.cfin.com.ar/economia/morosidad-creditos-familiares-record-historico-banco-central/ (18/10/2025)
4. EntreRíosYA citando Informe sobre Bancos (oct-2025: familias 7,8%, privado 4,5%): https://entreriosya.com.ar/la-morosidad-de-las-familias-se-triplico-y-es-la-mas-alta-en-15-anos/ (2025)
5. La Nación (dic-2025: 9,3%; ene-2026: 10,6%; no bancario EcoGo 23,9% / 1816 >27%; Ualá ~38% ene y P2P discontinuado): https://www.lanacion.com.ar/economia/ruido-en-redes-por-uala-la-morosidad-en-el-credito-no-bancario-sigue-en-alza-nid17032026/ (17/3/2026)
6. El Destape citando Informe sobre Bancos may-2026 (familias 12,8%, privado 7,7%; Ualá 0,60%→43,19%→24,77%): https://www.eldestapeweb.com/economia/uala-peor-todas-202681123730 (11/8/2026)
7. BCRA, Informe de Proveedores No Financieros de Crédito jun-2026 (irregularidad 26,9% feb-2026; personales 34,1%, tarjetas 19,4%; rango por grupo 20-58%): https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/informes/informe-proveedores-no-financieros-credito-junio-2026.pdf (jun-2026)
8. BCRA, Informe PNFC nov-2025 (16,2% jul-2025): https://www.bcra.gob.ar/publicaciones/informe-de-proveedores-no-financieros-de-credito-noviembre-de-2025/ (nov-2025)
9. TN (confirma 26,9%; estimaciones privadas 29,9%): https://tn.com.ar/economia/2026/06/06/la-morosidad-en-los-creditos-no-bancarios-llego-al-269-y-duplica-los-niveles-de-hace-un-ano/ (6/6/2026)
10. Bloomberg Línea (Ualá: 33,48% dic-2025 → 39,57% feb → 22,07% abr; ajustada ~14%/13%): https://www.bloomberglinea.com/latinoamerica/argentina/desde-carrefour-a-voii-los-neobancos-argentinos-con-la-mayor-morosidad-segun-el-bcra/ (2026)
11. Tercer Puente (Ualá write-off $82.230 M; 20,9M endeudados / 5,8M morosos may-2026): https://tercerpuente.com/uala-crecio-a-toda-velocidad-pero-la-mora-le-paso-la-factura/ (2026)
12. iProUP (Ualá no bancario ~63%; réplica de la empresa): https://www.iproup.com/economia-digital/65856-crisis-de-impagos-uala-enfrenta-mora-critica-y-crece-la-preocupacion-fintech (2026)

BNPL / microcrédito LatAm y global:

13. PayJoy/Mobile World Live whitepaper (13%→7%; 80-98% retoman; ~90% aprobados): https://assets.mobileworldlive.com/wp-content/uploads/2020/01/16120540/23667-MWL-Payjoy-whitepaper-1.pdf (~ene-2020)
14. PR Newswire, PayJoy Lock API ("cutting defaults in half"): https://www.prnewswire.com/news-releases/payjoy-announces-global-access-to-lock-api-to-enable-finance-for-the-next-billion-300799028.html (20/2/2019)
15. PayJoy México (anticipo 15-20%; arrendamiento; sin cargos por atraso): https://www.payjoy.com/mx/celulares (consultado 3/10/2026)
16. PayJoy Colombia (bloqueo temporal; arrendamiento con opción a compra): https://www.payjoy.com/co/celulares-a-cuotas (consultado 3/10/2026)
17. PayJoy Perú, beneficios públicos (60%+ repago total; tope 2×; reporte crediticio): https://www.payjoy.com/pe/public-benefits y T&C https://www.payjoy.com/pe/terminos-y-condiciones (consultado 3/10/2026)
18. La República (Colombia) — países PayJoy: https://www.larepublica.co/finanzas/como-adquiero-los-productos-de-payjoy-4233295 (2023); y https://www.payjoy.com/mx/sobre-nosotros (consultado 3/10/2026)
19. Miranda Intelligence citando Condusef (Kueski NPL 8,6→12,8% may-24→may-25): https://miranda-intelligence.com/wp-content/uploads/2025/06/MI-MxFintechChatter-061625.pdf (jun-2025)
20. Mexico Business News (Kueski "low single digits", claim de empresa): https://mexicobusiness.news/finance/news/financial-inclusion-mexico-expands-through-bnpl-kueski (2025)
21. Ciclo de Riesgo (Addi NPL >90: 4,2-4,8% Q1-2026; licencia Compañía de Financiamiento): https://www.cicloderiesgo.com/colombia/la-nueva-batalla-del-retail-addi-entra-al-terreno-de-los-gigantes-regulados (2026)
22. Addi, tasas y tarifas oficiales (tasa de mora = 1,5× bancario corriente): https://co.addi.com/tasas-tarifas (consultado 3/10/2026)
23. MELI Q2'25 shareholder letter (SEC; NPL 15-90: 6,7%): https://www.sec.gov/Archives/edgar/data/1099590/000109959025000041/meli-20250804xex991.htm (ago-2025)
24. MELI Q3'25 shareholder letter (SEC; NPL 15-90: 6,8%): https://www.sec.gov/Archives/edgar/data/1099590/000109959025000048/meli-20251029xex991.htm (oct-2025)
25. MELI Q2'25 Earnings Presentation (NPL >90 ~18,5%): https://s3-2.valuesense.io/IR_presentations/MELI/Investor_presentations/MELI_Q2_2025.pdf (ago-2025)
26. Affirm FQ4'25 shareholder letter + Q3'25 supplement (30+ ~2,4-2,8%; 90+ ~0,6-0,8%; charge-off 120 días): https://www.sec.gov/Archives/edgar/data/1820953/000182095325000078/affirmfq425designedshare.htm y https://investors.affirm.com/static-files/817961a9-b01f-497c-b068-45995ebe85ec (2025)
27. Klarna FY2025 (pérdidas 0,63% del GMV): https://ca.marketscreener.com/news/klarna-subsidiary-financial-and-regulatory-reports-klarna-holding-ab-financials-eng-q4-2025-ce7e5cdfdc8ef424 (2026)

Regulación y garantías:

28. Ley 21.526 texto (arts. 1, 7, 19, 38): https://www.argentina.gob.ar/normativa/nacional/ley-21526-16071/texto (1977; consultado 3/10/2026)
29. BCRA, Texto ordenado "Proveedores no financieros de crédito" (definición, umbral $10M, inscripción ≠ intermediación): https://www.bcra.gob.ar/archivos/pdfs/texord/t-apnf.pdf (consultado 3/10/2026)
30. BCRA, trámite de inscripción PNFC: https://www.bcra.gob.ar/solicitar-inscripcion-actualizacion-o-dar-de-baja-para-otros-proveedores-no-financieros-de-credito/ (consultado 3/10/2026)
31. BCRA Com. A 7406, PSCPP (registro obligatorio; sin asumir riesgo; préstamos en pesos): https://www.bcra.gob.ar/archivos/Pdfs/comytexord/a7406.pdf (2021, vigente 3/1/2022) y TO https://www.bcra.gob.ar/archivos/Pdfs/Texord/t-pscpp.pdf
32. BCRA, registro e inscripción PSCPP: https://www.bcra.gob.ar/registro-de-proveedores-de-servicios-de-creditos-entre-particulares-a-traves-de-plataformas/ y https://www.bcra.gob.ar/inscripcion-registro-proveedores-credito-particulares/ (consultado 3/10/2026)
33. CNV, RG 1058/2025 (régimen PSAV completo; inscripción previa; TAD desde 26/5/2025): https://www.boletinoficial.gob.ar/detalleAviso/primera/322539/20250314 y https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-1058-2025-410635/texto (14/3/2025); RG 994/2024 citada en su considerando; trámites https://www.argentina.gob.ar/cnv/registro-de-proveedores-de-servicios-de-activos-virtuales
34. CCyC Ley 26.994 texto (arts. 768-771; 1794 y ss. fianza; 794): https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/texto (2014; consultado 3/10/2026); art. 771 verbatim https://leyes-ar.com/codigo_civil_y_comercial/771.htm
35. Jurisprudencia morigeración (criterio 1,5× BNA): https://www.infojudicial.com.ar/areas/jurisprudencia/jurisprudencia-2019/juicio-ejecutivo-saldo-deudor-cuenta-corriente-mora-intereses-morigeracion-judicial/131831/ (2019); CSJN vs doble tasa activa https://ligadelconsorcista.org/jurisprudencia-corte-suprema-de-justicia-de-la-nacion-rechaza-calculo-de-intereses-por-doble-tasa-activa-por-violar-codigo-civil-y-comercial
36. BCRA, TO "Tasas de interés en las operaciones de crédito" al 28/12/2023 (punitorios solo sobre cuotas vencidas 1.6.2; tarjetas 2.2.1 tope +50%; compensatorio tope +25% Ley 25.065 art. 16): https://www.bcra.gob.ar/archivos/Pdfs/texord/texord_viejos/v-tasint_24-01-02.pdf y origen https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A5849.pdf (2015); cómputo actualizado https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7937.pdf
37. Ley 24.240 art. 37 (cláusulas abusivas) y art. 38: https://www.argentina.gob.ar/normativa/nacional/ley-24240-638/actualizacion (consultado 3/10/2026)
38. Res. SCDyDC 53/2003, anexo de cláusulas prohibidas: https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-53-2003-84410/texto (2003)
39. ENACOM bloqueo de terminales solo por robo/extravío: Res. 2459/2016; Res. 1360/2023 https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-1360-2023-391779/texto; Res. 1368/2023 https://www.boletinoficial.gob.ar/detalleAviso/primera/296593/20231023
40. Ley 25.326 art. 26 (texto vigente; 5 años/2 años; cesión sin consentimiento): https://www.argentina.gob.ar/normativa/nacional/ley-25326-64790/texto (consultado 3/10/2026)
41. BCRA, Central de Deudores y régimen informativo PNFC/PSCPP (RI-DSF): https://www.bcra.gob.ar/situacion-crediticia/ ; https://www.bcra.gob.ar/regimen-informativo-proveedores-no-financieros-faq/ ; difusión https://www.bcra.gob.ar/archivos/Pdfs/comytexord/a6347.pdf ; rectificación https://www.bcra.gob.ar/rectificacion-supresion-central-deudores/ (consultado 3/10/2026)

KYC:

42. Didit pricing (500 gratis/mes; $0,33 bundle; módulos): https://didit.me/pricing/ y https://help.didit.me/getting-started/free-plan (consultado 3/10/2026)
43. Didit RENAPER `arg_renaper` ($0,20; face-match): https://docs.didit.me/api-reference/database-validation/argentina/renaper y https://didit.me/es/solutions/countries/argentina/ (AFIP $1,84; buró $2,15) (consultado 3/10/2026)
44. RENAPER SID (convenio vía TAD; art. 11 Ley 25.326; API REST): https://www.argentina.gob.ar/sid/modalidades-y-productos (consultado 3/10/2026)
45. Infobae, aranceles RENAPER mar-2026 ($60/$35/$20 por consulta; prueba de vida $70): https://www.infobae.com/sociedad/2026/03/03/aumentan-los-dni-y-otros-tramites-cuales-son-los-nuevos-valores-del-renaper/ (3/3/2026)
46. MetaMap FAQ (trial 300 verif./3 meses; precios consultivos): https://www.metamap.com/frequently-asked-questions/ y estructura comercial https://apis.io/plans/metamap/metamap-plans-pricing/ (consultado 3/10/2026)
47. Truora precios (sin precio público): https://www.truora.com/precios ; estimación no oficial (SIN VERIFICAR): https://www.spendbase.co/es/vendors/truora/ (consultado 3/10/2026)
48. Nosis VID (requiere credenciales Renaper propias): https://servicios.nosis.com/prevencion-fraude (consultado 3/10/2026)
