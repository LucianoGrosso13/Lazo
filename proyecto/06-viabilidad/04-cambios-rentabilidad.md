# 04 — Qué cambiar para que sea una máquina de hacer plata

**Regla por regla: qué sacar, qué arreglar, qué agregar.** Cada cambio lleva el efecto numérico del modelo (`modelo-financiero.py`) y la razón. Ordenado por impacto.

---

## PARTE 1 — Lo que hay que arreglar (sin esto no cierra)

### 1. La empresa no cobra nada → split del fee + nuevas líneas de revenue

**Hoy:** el 7% del comercio va íntegro a los LPs (`merchant_fee` acreditado a LPs en `open_plan`). La empresa opera gratis.

**Cambio:** de los ~7 puntos que el comercio paga sobre lo financiado:
- **5% → pool** (sigue siendo más barato que GOcuotas/Cuotas MiPyME para el comercio)
- **2% → empresa** como origination fee
- **+ servicing 5%/año sobre saldo vivo** (~0,6% del financiado por plan)
- **+ spread FX 1%** sobre cuotas pagadas en pesos (~60% de ellas, si la empresa opera la rampa)

**Efecto:** la empresa pasa de $0 a **~$7-14 de margen por plan** (A=$500-700). Con carry del junior incluido, cubre el opex lean (~US$15k/mes) desde ~1.100 planes/mes a ticket alto. Es el modelo que Affirm validó (merchant fee + servicing + gain-on-sale + interchange = ~43% del revenue no es interés) y al que Credix pivoteó (capital-light: originar y cobrar servicing, otros ponen el riesgo).

### 2. El pricing actual no paga el senior → interés chico al estudiante

**Hoy:** 0% al estudiante, 7% al comercio → libro con-fiador rinde **+9,3%/año** a mora 30% (A=US$700; menos en tickets chicos porque el costo fijo pesa). El senior al 8% queda expuesto y el junior gana ~11% — poco para absorber primera pérdida.

**Cambio (opción recomendada):** interés al estudiante **6%→3% decreciente por escalón** sobre lo financiado.
- Estudiante paga ~4,2% real sobre el precio (vs ~29% MP): la promesa comercial sigue intacta.
- Libro → **+16%/año**, break-even mora ~53%. Senior cubierto, junior ~+38%.

**Alternativa:** mantener 0% y subir fee comercio a 9-10% (~6,3-7% del precio — GOcuotas ya cobra hasta 9,9% y paga a 22-65 días; nosotros al instante). Resultado similar (+14-17%/año) pero el discurso comercial al comercio se complica. También se puede combinar: i=3% + c=9%.

**Regla de diseño:** el ingreso bruto por plan (i + fee_pool sobre financiado) tiene que ser **≥9-10%** para que el senior al 8% sea seguro a mora 30%.

### 3. La escalera destruye margen en los escalones altos → cobertura con piso

**Hoy:** al subir de escalón baja anticipo (30→0%), baja interés **y** baja la cobertura exigida al fiador (100→70%). Con mora constante 30%: escalón 0 rinde +16%, escalón 3 **pierde −15%/año**. Es decir: premiás a tu mejor cliente regalándole el producto que más te cuesta.

**Cambio:**
- **Cobertura del fiador con piso ~85-90% en todos los escalones** hasta medir mora por escalón. Si el piloto confirma que la mora cae (escalón 3 con d≈15-19% cierra), recién ahí se baja cobertura.
- La recompensa por subir pasa por **menos interés** (6→3%) y más tope — no por menos garantía. El fiador además gana algo concreto: **la fianza máxima baja** con el escalón.
- Regla de gobierno: si la cohorte del escalón ≥2 confirma d≈30%, subir cobertura exigida o interés en esos escalones. Automatizable en `ProtocolConfig`.

### 4. El cobro al fiador por tarjeta es caro y revertible → rail barato + fianza como respaldo

**Hoy:** cargo por suscripción de tarjeta (~3,9%+IVA ≈ 4,7% del monto) + riesgo de contracargo (83-86% de los desconocimientos se resuelven a favor del tarjetahabiente, BCRA PUSF 2025).

**Cambio:**
- Rail principal del fiador: **DEBIN/CBU (débito directo a cuenta) o mandato en USDC** (<1% de costo, sin contracargo de tarjeta). Tarjeta como backup.
- Si queda tarjeta: tokenización con **3DS** al onboarding, mandato de débito expreso, aviso 72h, descriptor claro — y la **fianza firmada** como cobertura legal del cargo revertido.
- KPI del piloto: `r` real = % del saldo impago efectivamente recuperado. El modelo entero depende de que r≥~65%.

### 5. Sin antifraude del comercio → controles antes del primer peso

**Hoy:** el comercio cobra 100% al instante. Una venta fantasma comercio×estudiante extrae el pool. Es el fallo que mató a Goldfinch.

**Cambio:** KYC del comercio + **tope de exposición por comercio** + **holdback** (pagar 90% hoy, 10% cuando se cobra la primera cuota) o fee premium por liquidación instantánea + **clawback** por cohorte fraudulenta + revisión manual de comercios nuevos antes de habilitarles el adelanto.

---

## PARTE 2 — Lo que hay que agregar (los invariantes del pool)

| # | Pieza | Qué hace | Estándar |
|---|---|---|---|
| 6 | **Coverage ratio ≥20%** onchain | el senior no crece si el junior cae debajo del 20% del pool | Centrifuge/New Silver (junior 15-20% issuer-funded), Credix 80/20 |
| 7 | **Reserva de pérdidas** (~10% del fee bruto) | absorbe pérdidas antes que el junior; acumula ~0,5% de A por ciclo → cubre un ciclo de expected loss en ~6 ciclos | Goldfinch reserve (10% del interés) |
| 8 | **Libro sin-fiador = unitranche junior** | el senior nunca financia planes sin fiador; el tramo sin fiador es CAC acotado (tope US$75-150) | Goldfinch unitranche pools (GIP-29) |
| 9 | **Early-amortization trigger** | si 30+DPD de la cohorte > umbral → se congela originación con plata senior; cobros van primero al senior | Estándar ABS (Affirm usa exactamente esto) |
| 10 | **Idle sweep** | 10-15% del pool en Kamino/Jupiter Lend USDC (~4,5-6%): rinde ~+0,6%/año y da liquidez de retiro | Vaults curados Kamino; Centrifuge liquidity reserve |
| 11 | **Punitorio con tope** (~15% del capital acumulado) | evita el look usurario de 5%/mes indefinido y agrega ingreso real en curas | arts. 767-771 CCyC (reducción judicial si desproporcionado) |
| 12 | **Fee de originación del equipo como tramo más junior** | la empresa cobra su fee después del senior y del junior — señal de alineación | Goldfinch (origination fee = tramo más junior) |

---

## PARTE 3 — Lo que hay que sacar o repensar

| # | Regla actual | Veredicto |
|---|---|---|
| 13 | **"Sin interés" como claim central** | Sacar o blindar: la Res. 51/2017 lo prohíbe si el comercio recarga el precio. Cambio: marketing "~4% de costo real, 7× más barato que MP" — honesto y sigue siendo fuerte. Si se insiste en 0%, el contrato del comercio debe prohibir recargo (cláusula anti-recargo). |
| 14 | **Fiador nunca se libera, cobertura baja con el escalón** | Repensar: la liberación del fiador era el premio emocional de la escalera, pero económicamente la garantía es lo que cierra el libro. Mantener fiador permanente con **fianza máxima decreciente** por escalón como el premio visible. |
| 15 | **Escalera sin-fiador S0→S1** | Mantener solo si convierte a fiador. Si el piloto muestra <30-40% de conversión, **sacarla**: pierde ~48%/año y atrae exactamente el riesgo que el modelo no quiere. Es un experimento de CAC con tope, no un producto. |
| 16 | **Un plan por estudiante** | Mantener (control de exposición). En el roadmap: varios planes con margen total por escalón (la divergencia mock↔programa ya está documentada). |
| 17 | **Débito automático SPL delegate** | Sacar del core: solo cobra si hay saldo (comodidad, no garantía) y el usuario custodial (Lemon/Belo) no lo soporta. Prioridad al rail del fiador. |
| 18 | **Comercio cobra en pesos con spread** | Sacar del MVP: suma rampa, regulación (PSAV) y trabajo operativo. El comercio cobra USDC y hace su propio off-ramp (Ripio API existe). Revisitar cuando haya volumen que lo justifique. |

---

## PARTE 4 — Uso de la plata del pool: qué es legal y qué no

| Uso del capital | Legalidad | Recomendación |
|---|---|---|
| Tesorería propia en DeFi (Kamino/Jupiter Lend) | **Legal** — ninguna norma lo prohíbe | Sí, siempre: ~4,5-6% sobre el ocioso + liquidez de retiro |
| Fondos de LPs en DeFi para yield | **Zona gris fuerte** — promesa de yield por gestión de terceros = valor negociable (Belo/ARGt, mar-2026); PSAV custodio bloquearía rehypothecation | No en el MVP. Solo extraterritorial con calificados, y con counsel |
| Pool prestando a otros protocolos (wholesale) | Misma intermediación que el retail | No — es cambiar el riesgo, no reducirlo |
| Reserva en T-bills tokenizados (JTRSY ~4%) | Legal para tesorería | Buena opción de reserva estable cuando el pool escale |
| LP tokens del pool usados como colateral | Componible = feature DeFi; en Argentina amplifica el riesgo de "valor negociable" | Roadmap, nunca con marketing público local |

---

## PARTE 5 — La máquina, armada

```
Originación (empresa) → cobra 2% origination + servicing + spread FX
        │
        ▼
Pool (vehículo) → junior 20-25% propio → senior 75-80% @ 8%
        │           reserva 10% del fee → invariantes onchain
        ▼
Libro: 100% planes CON fiador (senior) + CAC acotado sin fiador (junior)
        │
        ▼
Escalera: el buen pagador sube → menos interés, más tope, fianza más baja
        │
        ▼
Reputación portable → moat de datos: el historial de pago que Argentina no tiene
```

**Flywheel:** más planes pagados → mejor data de mora por cohorte → pricing más fino → comercios más baratos → más estudiantes → más fiadores. El activo que se acumula no es el spread de cada plan: es **el loan tape on-chain** (la métrica que todo facility de private credit exige) y la reputación portable que ningún competidor puede copiar sin reconstruir la red.

## Los 3 números que hay que medir antes de escalar

1. **`d` real por cohorte y por escalón** (30+DPD, roll rate, FPD) — si d≤30% el modelo aguanta; si la mora cae por escalón, la escalera es oro.
2. **`r` real del fiador** (cargos exitosos, desconocimientos, revertidos) — si r<60% el rail DEBIN y la fianza pasan de mitigación a salvación.
3. **CAC real** — si es >US$20 por plan, el break-even se va a ~3.700 planes/mes y el canal comercio-trae-cliente pasa a ser obligatorio (los comercios adquieren al usuario gratis para nosotros — igual que Affirm).
