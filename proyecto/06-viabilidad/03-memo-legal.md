# 03 — Memo legal y regulatorio: Lazo (Argentina)

**Para:** tribunales, regulador, estudio jurídico, inversores institucionales.
**Fecha:** 6 de octubre de 2026.
**Alcance:** análisis de diseño, no opinión legal formal. Cada norma se cita con número; lo no confirmado contra fuente oficial se marca **SIN VERIFICAR**. Antes de salir de devnet hay que contratar estudio local.
**Aclaración de estado:** el producto corre hoy 100% en devnet de Solana con un token de prueba (devUSDC, sin valor). Nada de lo que sigue está en operación con plata real.

---

## 1. Estructura del crédito: venta en cuotas del comercio + subrogación (art. 915 CCyC)

**El diseño:** el crédito lo origina **el comercio** (venta en cuotas al consumidor). Cuando la plataforma abona el precio al comercio, opera la **subrogación legal de pleno derecho** del art. 915 (incs. b y c) del CCyC: la plataforma sucede al comercio como acreedor de las cuotas.

**Firmeza: media-alta.** Es el mecanismo que GOcuotas documenta en sus T&C y opera en producción en Argentina (PNFC registrado, reporta al BCRA). Tres condiciones para que resista:

1. **El comercio debe ser el originante real**: la venta a plazo existe primero; el pago de la plataforma, después. Nunca desembolsar antes de perfeccionada la venta, y conservar evidencia del acto (factura/remito/checkout firmado). Si económicamente la plataforma "adelanta plata" sin venta genuina, un juez puede recalificar como **mutuo encubierto** → cae todo el esquema.
2. **Invocar incs. b y c alternativamente** en los T&C (el inc. b es el encuadre más limpio si el deudor asintió).
3. Documentar "condiciones precedentes" del descuento: operación existente, libre de gravámenes, no revocable.

**Importante:** esta estructura evita la calificación de "préstamo" pero **no evita el régimen PNFC**: el TO del BCRA alcanza financiaciones "independientemente de la forma de su instrumentación jurídica" (Com. A 7146/2020).

## 2. Proveedor No Financiero de Crédito (BCRA)

- **Registro:** obligatorio al superar el umbral de financiaciones (Com. A 7146/2020, ~$10M referencia 2020 — **verificar TO vigente**). La inscripción **no** habilita intermediación ni captación (reserva expresa de la norma).
- **Obligaciones:** informar deudores a la Central de Deudores (sección 59, desde $25.000/deudor); clasificación por mora criterio consumo; régimen informativo mensual.
- **Transparencia/CFT:** alcanzados por el TO "Tasas de interés en operaciones de crédito" (Com. A 6541/2018, act. A 8203/2025): documentar tasa y CFT. **Si no se consigna, el tope automático es la tasa pasiva BCRA** — en la práctica, casi nada. Con tasa 0% hay que documentar igualmente "tasa 0% / CFT 0%".

## 3. La fianza del familiar

- **Art. 1578 CCyC:** válida la fianza de obligaciones futuras/indeterminadas; exige **monto máximo expreso** y no cubre deudas contraídas después de 5 años; la indeterminada es retractable. La fianza con tope del diseño encaja en la norma — pero el tope debe estar en "rigurosa correlación" con el crédito (doctrina concursal): no inflarla.
- **Click-wrap:** el consentimiento electrónico vale (arts. 288, 1106-1107 CCyC; Ley 25.506 + Decreto 182/2019), **pero si el fiador niega la firma electrónica, quien la invoca debe probarla** (art. 5 Ley 25.506). Blindaje: evidencia KYC (Didit: DNI+selfie+liveness) vinculada a la aceptación, sello de tiempo, OTP, log de IP/dispositivo, contrato reenviado por email/WhatsApp, y **primera autorización en la tarjeta (3DS/ZDA)** como acto propio de ejecución.
- **Recomendación de buena fe:** dar retractación fácil de la fianza (art. 1578 in fine). Reduce litigios y señaliza solidez.

## 4. El cobro a la tarjeta del fiador — el punto más frágil

- **Desconocimiento:** art. 26 Ley 25.065 — el titular puede cuestionar la liquidación dentro de **30 días de recibida**. Las redes de tarjetas habilitan contracargos por "cargo no reconocido" en ventanas más largas (~120 días, reglas de red, **SIN VERIFICAR**).
- **El dato duro:** el desconocimiento de cargos es el reclamo #1 ante el BCRA y se resuelve **a favor del tarjetahabiente en 83-86% de los casos** (Informe PUSF BCRA 2025). El comercio gana la disputa solo ~20-30% de las veces.
- **Conclusión:** el cargo a la tarjeta es el *rail* y el disuasivo; la **fianza firmada es la cobertura legal real** para cuando el cargo se revierte. Mitigaciones obligatorias: mandato de débito **expreso y separado** (cláusula destacada), aviso previo al cargo por escrito (72h), descriptor de comercio claro en el resumen, tokenización con 3DS (corre la carga del fraude al emisor), y evidencia forense completa.
- **Costo operativo:** cobro por suscripción tarjeta ~3,9%+IVA (Mobbex) ≈ 4,7% del monto cobrado. **Evaluar DEBIN/CBU o pago en USDC como rail principal del fiador** (<1%): mejora margen y reduce superficie de contracargo.
- Procesadores que soportan cargos a tarjeta guardada sin titular presente (MIT/Card-on-File): Mobbex Suscripciones Manuales y Mercado Pago Pagos Automáticos — ambos documentados, ambos en ARS (definir en contrato la conversión USDC→ARS y quién absorbe el spread).

## 5. Defensa del consumidor (Ley 24.240 y conexas)

- **Aplica** aunque el acreedor originante sea el comercio (venta financiada al consumidor) y se extiende a la plataforma como cesionaria/gestora (art. 40 responsabilidad). El fiador también es usuario.
- **Art. 36 LDC:** consignar bajo pena de nulidad: precio contado, monto financiado, TEA, **CFT**, sistema de amortización, cantidad/monto de pagos. Con tasa 0%: documentar CFT 0% explícitamente.
- **TRAMPA DE "SIN INTERÉS" — Res. 51/2017 Secretaría de Comercio (+ Res. 240-E/2017, Res. 4/2025, 446/2025):** si el costo de financiación está trasladado al precio (cuotas más caras que contado), **está prohibido anunciar "sin interés"**. Regla de negocio obligatoria: **cláusula anti-recargo en el contrato del comercio** — el precio financiado no puede superar el precio de contado exhibido. Sin esa cláusula, el claim central del marketing es ilegal.
- **Contratos de adhesión:** cláusulas abusivas se tienen por no escritas (arts. 37-39); interpretación a favor del adherente. **El arbitraje en consumo es casi inútil en Argentina** — no diseñar la defensa sobre arbitraje.
- **Punitorios:** no hay tope legal civil general para PNFC; rigen arts. 767-771 CCyC (válidos si pactados; el juez los reduce si exceden desproporcionadamente el costo del dinero). Un 5% fijo sobre la cuota vencida es defendible como cláusula penal/comisión de recupero si: (a) recae solo sobre la cuota vencida, no sobre el saldo; (b) tiene **tope acumulado** (~15% del capital — sin tope, repetir 5%/mes roza lo usurario en moneda dura); (c) está documentado claro y con CFT-disclaimer.
- **DNU 70/2023 (arts. 765-766 CCyC):** la obligación pactada en moneda extranjera solo se libera pagando la especie pactada — la cuota en USDC es exigible en USDC. Que USDC sea "moneda" a estos fines es interpretación favorable **sin jurisprudencia todavía — zona gris**.

## 6. Datos personales y la reputación onchain (Ley 25.326)

- La wallet del estudiante vinculada a KYC = **dato personal** (seudoanonimización ≠ anonimización). Publicar escalón y contadores de mora onchain es difusión de datos de solvencia crediticia → régimen del **art. 26** (información crediticia: solo datos patrimoniales de solvencia; archivo máx. 5 años, reducido a 2 tras cancelar).
- **Conflicto directo:** la cadena es inmutable y el titular tiene derecho de supresión/rectificación (art. 4 inc. 5 + art. 26). No hay jurisprudencia argentina sobre blockchain+25.326.
- **Diseño correcto (privacy-by-design):** onchain solo hash/commitment o score agregado — nunca datos de mora crudos ni detalle de compras; la rectificación se implementa como **nuevo estado que invalida al anterior** (revocación visible, no borrado); consentimiento expreso y **por separado** para publicación onchain; registro de la base de datos en AAIP (art. 21); reporte de morosos por canales formales (Central de Deudores si PNFC registrado).
- Transferencia internacional de datos (art. 12): cláusula en T&C si Didit o el vehículo offshore reciben datos.

## 7. Lavado (UIF)

- **El PNFC es sujeto obligado UIF** (art. 20 inc. 6 Ley 25.246, Ley 27.739) — Res. UIF 200/2024: identificación del cliente, EBR, monitoreo, ROS, oficial de cumplimiento. **Didit es herramienta de captura, no compliance** — la obligación es intransferible.
- **PSAV:** si la plataforma custodia o administra cripto de terceros → sujeto UIF (Res. 49/2024) + registro CNV (RG 994/2024 + **RG 1058/2025, plena vigencia 31/12/2025**: categorías, patrimonio neto mínimo **USD 35-150k**, segregación patrimonial, ciberseguridad, compliance officer). Los pagos self-custody del estudiante evitan el encuadre — **mantener no-custodial** salvo decisión explícita.
- Incentivo real: PSAV registrados CNV tienen **exenciones del impuesto al cheque** (Decreto 475/2026 + RG ARCA 5869/2026).

## 8. El pool y el fondeo — qué se puede y qué no

- **Ley 21.526** (intermediación financiera): arts. 1 y 7 — la intermediación habitual entre oferta y demanda de recursos exige autorización BCRA; **art. 19 — prohibida cualquier publicidad o acción para captar recursos del público** por no autorizados (facultades de cese + querella penal). El pool con inversores argentinos del público = prohibido.
- **Precedente fresco (mar-2026): caso Belo/ARGt.** La CNV ordenó cesar una stablecoin que prometía 32% TNA aplicando test tipo Howey: activo + promesa de rendimiento por gestión de terceros = **valor negociable** (art. 2 Ley 26.831) → oferta pública requiere autorización. **El tramo senior con cupón es un valor negociable.**
- **Vías legales del fondeo externo:**
  - (a) **Vehículo offshore** con LPs no residentes o calificados, sin Puntos de Contacto Suficientes en Argentina (RG 1016/2024: oferta extraterritorial sin PCS queda fuera del contralor CNV) — el patrón Credix (originador local → trust → nota USDC → accredited investors).
  - (b) **Oferta privada** RG CNV 1016/2024 + RG 1088/2025: hasta 35 adquirentes por emisión, máx. 15 no calificados, sin medios masivos, con verificación de calidad de calificado.
  - (c) **Fideicomiso financiero** (CCyC 1694-1695 + arts. 70 y 83 Ley 24.441 subsistentes + Normas CNV): el vehículo regulado local; MercadoLibre tituliza Mercado Crédito así (series autorizadas por CNV sobre "créditos de consumo"). Costo: meses + fiduciario + prospecto. RG 1053/2025 acelera ofertas a calificados.
  - (d) **Tesorería / sponsor / pool del comercio** — sin captación, legalmente impecable. Es el MVP.
- **¿Qué puede hacerse con la plata del pool?**
  - **Fondos propios (tesorería):** invertir en protocolos DeFi es legal (ninguna norma lo prohíbe; la RG 1058 excluye protocolos sin proveedor identificable). Barrer el ocioso a Kamino/Jupiter Lend (~4,5-6% APY USDC) es recomendado: rendimiento + liquidez para retiros.
  - **Fondos de inversores:** prometer yield vía gestión en DeFi es exactamente lo que la CNV sancionó en Belo/ARGt → **zona gris fuerte**, solo viable extraterritorial puro con inversores calificados. Si un PSAV custodia, la norma de segregación apunta contra rehypothecation.
  - Conclusión práctica: **el yield del ocioso entra en el MVP (tesorería); como feature para LPs queda en roadmap regulado.**

## 9. Régimen cambiario

- **Ley 19.359 (penal cambiario) vigente.** TO Exterior y Cambios: deudas financieras con el exterior desembolsadas desde 9/2019 deben ingresarse y liquidarse por MLC para acceder luego al MLC a pagar capital/intereses (puntos 2.4/3.5). Una cuota en USDC onchain **nunca transita el MLC**.
- **Para personas humanas** el problema se desactivó en gran parte: post **Com. A 8226/2025** pueden comprar USD sin cupo y tenérselos → el estudiante puede pagar su cuota en USDC con dólares propios adquiridos legalmente.
- Entre residentes: punto 3.6 TO prohíbe pagar por MLC deudas en moneda extranjera entre residentes — si el acreedor final es argentino, USDC entre residentes es zona gris cambiaria (civilmente válido).
- Relevamiento de activos/pasivos externos (Com. A 8304): informativo, no prohibitivo.

## 10. Tributario

- **IVA 21%** sobre la comisión/fee al comercio (prestación de servicios). El tratamiento del **margen financiero/descuento de créditos por no-banco** es zona gris (exención art. 7 inc. h) 16) apunta a entidades 21.526) — estructurar fee de servicio explícito (gravado) separado del precio de cesión, y obtener dictamen.
- **IIBB** provincial sobre fee (y posiblemente margen) — alícuota según jurisdicción de constitución.
- **Impuesto al cheque:** 6‰+6‰ si toca cuentas bancarias argentinas (payout al comercio en ARS, cobro tarjeta vía adquirente local). Exenciones nuevas para PSAV registrados.
- **Impuesto PAIS: murió 22/12/2024.** Sobrevive la **percepción a cuenta (RG ARCA 5617/2024)** para pagos de bienes/servicios al exterior con tarjeta — **si el cargo al fiador lo procesa un adquirente local en ARS no aplica**; merchant-of-record offshore sí la dispararía (mala UX + fricción). Diseñar con procesador local.
- **Retención a beneficiarios del exterior:** si el pool offshore cobra rendimiento con fuente argentina → art. 91/93 LIR: presunción de ganancia 43% (financieras calificadas → ~15% efectivo) u otros casos presunción 100% → ~35% efectivo. Decisión fiscal de estructura: deuda vs equity/cesión.

## 11. Si litigamos: postura ante tribunales

**Los 5 argumentos más fuertes:**
1. No hay préstamo: hay **venta en cuotas del comercio + subrogación legal** (art. 915 b/c CCyC), precedente en producción (GOcuotas).
2. **Fianza válida y limitada** (tope art. 1578), reforzada por actos propios del fiador (KYC + 3DS + primer uso + notificaciones) — convierte el click-wrap débil en prueba acumulada.
3. El cargo a tarjeta respondió a **mandato de débito expreso y previo**, notificado 72h antes; el desconocimiento exige detallar el error (art. 26) y la mora está constatada onchain.
4. **CFT y condiciones informados** con claridad (art. 36 LDC + TO BCRA): desactiva cláusula sorpresiva/abusiva.
5. **Obligación en USDC exigible en USDC** (765-766 CCyC post-DNU 70/2023): no hay pesificación unilateral.

**Los 3 flancos débiles:**
1. **Fianza click-wrap si el fiador niega firmar** — la carga probatoria es nuestra (art. 5 Ley 25.506). Sin trazabilidad forense, se pierde.
2. **Chargeback** — el contracargo devuelve la plata antes de que llegue la discusión civil; las redes fallan por sus reglas (83-86% a favor del tarjetahabiente). Talón de Aquiles operativo.
3. **Datos onchain inmutables** — ante habeas data o reclamo AAIP, la inmutabilidad es agravante, no defensa. Sumarle el riesgo sistémico de recalificación (mutuo encubierto + PNFC sin registro + captación si el pool escaló mal).

## 12. Checklist de blindaje documental (accionable)

- [ ] T&C estudiante: venta en cuotas del comercio + subrogación 915 b/c + CFT explícito (0% o el que sea) + tabla de mora con tope + consentimientos de datos por separado (tratamiento, cesión crediticia art. 26, publicación onchain).
- [ ] Contrato comercio: "descuento de cuentas por cobrar" con condiciones precedentes + **cláusula anti-recargo** (precio financiado = precio contado) + clawback por cohorte fraudulenta + tope por comercio.
- [ ] Fianza: instrumento independiente, monto máximo correlacionado, firma electrónica + evidencia KYC + sello de tiempo + **mandato de débito destacado** + mecanismo de retractación.
- [ ] Notificación previa al cargo de mora: 72h, por email+WhatsApp, siempre.
- [ ] Onboarding fiador: KYC Didit + tokenización con 3DS/ZDA + descriptor claro.
- [ ] Registro AAIP de la base de reputación; evaluar registro PNFC antes del primer peso real; manual LA/FT (Res. 200/2024) antes de operar.
- [ ] Pool: tesorería en MVP; externo solo por oferta privada RG 1016/2024 u offshore sin PCS; **jamás marketing público de rendimiento en Argentina**.
- [ ] Onchain: solo hash/score; datos de mora crudos off-chain; rectificación como nuevo estado.

## 13. Zonas gris declaradas (no prometer de más)

- Umbral PNFC vigente ($10M era 2020), ventanas exactas de chargeback por red, T&C específicos de Mobbex para cobros MIT, suficiencia de Didit frente a Res. UIF 49/200 de 2024, umbrales UVA de inversor calificado, alícuotas IIBB por provincia, costos reales de fideicomiso, USDC como "moneda" arts. 765-766, tratamiento IVA del margen de descuento por no-banco, USDC-deuda de residentes con acreedor offshore.
- **Toda esta zona gris se resuelve con una consulta legal + una consulta cambiaria antes de producción** — presupuestarla en el plan (≈US$15-25k).
