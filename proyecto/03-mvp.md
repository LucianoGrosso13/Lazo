# 03 - MVP: "Cuotas sin tarjeta, con fiador"

Sesión del 2026-10-03. Skill: `/solana-tuc-mvp`. Borrador armado de corrido a pedido del equipo ("hagamos todo ya o por lo menos planeemos"). Cada sección está marcada con lo que falta confirmar.

**Veredicto heredado:** angostar a la cuña + clon consciente. La demo **tiene que mostrar la cuña**: un fiador con tarjeta que solo paga si el estudiante no paga, una escalera que mejora las condiciones y un pool auditable onchain. Si el video muestra solo "comprar en cuotas", se ve igual que Mercado Pago o Yumi y no suma.

**Equipo y horas:** 2 personas. Luciano hace el front y lo off-chain (tienda, checkout, fiador, keeper). El compañero hace el programa Anchor (`proyecto/03-brief-companero.md`). Horas reales hasta el 12/10: **a confirmar**. El plan asume ~9 días de trabajo parcial de los dos.

## Los tres beneficios que la demo tiene que dejar claros (pedido del equipo, 2026-10-03)

Cada pantalla clave muestra uno de estos tres beneficios con números, siempre al lado de la alternativa:

| Para quién | Beneficio | Número a mostrar | Dónde se ve |
|---|---|---|---|
| **Estudiante** | 3 cuotas **sin interés**, sin tarjeta propia y sin usar el límite del familiar. Cada plan pagado baja el anticipo y sube el tope | PC de US$1.000: paga 1.000 en total (300 + 3 × 233,33) contra ~1.290 reales en MP (CFTEA 61-388%). Muestra cuánto baja el anticipo en el escalón siguiente | Checkout y panel del estudiante |
| **Comercio** | Cobra **al instante** y vende a clientes sin tarjeta, sin riesgo de mora (el riesgo es del pool) | Costo: 7% de lo financiado = **4,9% del precio** en el escalón 0, contra 5,41% de Cuota Simple y ~12,49% de MP por 3 cuotas sin interés. GOcuotas paga a 22 días hábiles | Panel del comercio |
| **Pool / inversor** | Rendimiento en USD respaldado por fiadores, con tramos, y **cada préstamo, pago y recupero es verificable onchain** | Rendimiento esperado del tramo senior ~8% (Kamino ~6%, Jupiter ~5%). El junior absorbe la primera pérdida. Mora de equilibrio ~44% en el escalón 0 | Panel del pool |

## Usuario, momento wow y guion de demo

**Usuario:** Luciano, estudiante de la UNT. Quiere una PC de US$1.000 en 3 cuotas, no tiene tarjeta propia, y en Mercado Pago le cobran un CFTEA de 61% a 388%. Su mamá tiene tarjeta de crédito, pero no quiere prestarla para cada compra.

**Momento wow:** **el estudiante no paga una cuota y, sin que nadie haga nada, se le cobra la tarjeta al fiador. El pool registra el recupero onchain con el comprobante, y el comercio ya había cobrado todo el primer día.** Es la cuña en 20 segundos: crédito sin tarjeta propia, respaldado por la familia, auditable.

**Guion (5 pasos, 3 minutos):**
1. **La mamá se suma como fiadora** (30 s): abre el link que le mandó Luciano, hace KYC con Didit, elige un tope de compras de US$1.000, acepta la fianza (el hash queda onchain) y carga la tarjeta (sandbox de Mobbex).
2. **Luciano compra la PC** (45 s): en la tienda demo elige "3 cuotas sin interés, sin tarjeta". Paga el anticipo de US$300 con Phantom. **El comercio recibe US$951 al instante** (1.000 − 7% de los 700 financiados), y se ve en Solana Explorer.
3. **Paga la primera cuota** (20 s): desde su panel paga US$233,33 en USDC y ve el progreso del plan y su escalón.
4. **No paga la segunda** (45 s): en la demo, un "día" dura segundos. Pasa la gracia, el fiador recibe el aviso y llega el día 15: **el keeper le cobra a la tarjeta del fiador**, `registrar_recupero` deja el hash del comprobante onchain y Luciano baja de escalón.
5. **El pool** (30 s): tramos junior y senior, préstamos, pagos y recuperos, todo verificable en la cadena. Se cierra con la escalera: otro estudiante (datos de ejemplo) en el escalón 3 compra sin anticipo.

✔ 1/6. Falta confirmar con el equipo.

## Tipo de producto y flujo central

**Tipo:** pagos y cobros (pago en USDC con registro onchain), con crédito arriba. Wow de la fila: "llega al instante, sin intermediario". El nuestro suma que el riesgo lo respalda el fiador.

**Flujo central (una persona, un recorrido):**
1. Checkout en la tienda → "Pagar en 3 cuotas" → conecta Phantom (devnet).
2. El programa verifica escalón, tope y garantía → **una transacción** en la que el anticipo va al comercio, el pool le adelanta el resto menos la comisión y se crea el `Plan`.
3. El estudiante paga cuotas (`pay_installment`).
4. El keeper marca la mora y, si llega el día 15, cobra al fiador fuera de la cadena → `registrar_recupero` onchain.
5. La reputación (escalón + contadores) se actualiza onchain.

**¿Por qué cadena?** (prueba de la planilla) La planilla no alcanza en dos lugares. Primero, el pool: el comercio cobra de un vault que no controla el equipo, y cada adelanto, pago, recupero y pérdida es público y verificable (lo que MP no puede ofrecer). Segundo, la reputación del estudiante vive en su wallet y cualquier comercio la lee.

✔ 2/6

## Entra / Después / No entra

**Entra (3):**

| # | Función | Esfuerzo | Quién |
|---|---|---|---|
| 1 | **Programa:** pool con tramos, `open_plan`, `pay_installment`, mora (`crank_mark_late`, `crank_charge_guarantor`), `registrar_recupero`, reputación y garantía | L | Compañero |
| 2 | **Front de los tres beneficios:** tienda demo + checkout, panel del estudiante, panel del comercio y panel del pool (solo lectura), con un reloj de demo para adelantar el tiempo (Next.js, Phantom devnet) | L | Luciano |
| 3 | **Fiador real en sandbox:** link de invitación → Didit → fianza (PDF + hash) → tarjeta en Mobbex → keeper que cobra y registra el recupero | M | Luciano |

**Después (si sobra tiempo, en este orden):**
1. Depósito senior desde la UI del pool (el panel de solo lectura ya entra).
2. Débito automático con delegate SPL (`crank_collect`).
3. "Pagar la cuota en pesos" simulado (pantalla de CVU).
4. Login con Google (Phantom embedded) en vez de la extensión.
5. Cameo de Tiendanube con medio de pago personalizado.
6. KYC del estudiante con Didit.

**No entra (no se discute de nuevo):** tramo sin fiador en la UI (queda solo en la config); varios planes por estudiante; avaladores por cohorte; cuotas fijas en pesos; off-ramp a pesos del comercio; app oficial de Tiendanube o plugin de WooCommerce; firma digital certificada; disputas de contracargo; LP tokens componibles o yield en Kamino; mainnet.

✔ 3/6

## Real vs. simulado

| Parte | Estado | Cómo se declara |
|---|---|---|
| Programa, pool, plan, cuotas, reputación | **Real** (devnet) | "Corre en devnet" |
| USDC | **Simulado**: mint propio devUSDC | "USDC de prueba en devnet" |
| Pago del anticipo y de las cuotas con Phantom | **Real** (devnet) | — |
| El comercio cobra al instante | **Real** (ATA del comercio, se ve en Explorer) | — |
| KYC del fiador con Didit | **Real** (free tier) | — |
| Fianza | **Real como click-wrap** + PDF + hash onchain. **Simulada** la firma digital certificada | "Firma digital certificada: roadmap" |
| Tarjeta del fiador y cobro | **Real contra el sandbox de Mobbex** (tarjeta de prueba) | "Sandbox: en producción es el mismo rail que usa GOcuotas" |
| Keeper (vencimientos y cobro al fiador) | **Real**, script del equipo | "Punto de confianza off-chain, auditado con el hash del comprobante" |
| Paso del tiempo | **Simulado**: `seconds_per_day` configurable | "En la demo, un día dura segundos" |
| Tienda | **Simulada**: tienda demo propia | "Botón de checkout integrable, roadmap Tiendanube/WooCommerce" |
| Estudiante en escalón 3 | **Datos de ejemplo** | — |
| Inversores senior | **Simulados**: wallets de prueba | "Nunca se ofrece al público argentino" |

✔ 4/6

## Riesgo técnico a probar primero

1. **Mobbex sandbox (30 min, el primer día):** ¿se puede abrir una cuenta de prueba sin CUIT? ¿Se puede tokenizar una tarjeta de prueba con suscripción manual y cobrarle por API, con monto libre y sin que el titular esté presente? Si no sale, el **plan B** es MP Pagos Automáticos en sandbox, y el **plan C** un cobro simulado con pantalla de procesador, declarado como tal.
2. **Didit (20 min):** sesión de verificación hosted + webhook/consulta del resultado desde Next.js.
3. **Programa (compañero, día 1):** que `open_plan` haga en una transacción el anticipo al comercio + el adelanto del pool con un PDA firmante. Si se complica, se parte en dos instrucciones.

✔ 5/6

## Definición de listo

- [ ] Hay un link público (Vercel) donde alguien con Phantom en devnet completa la compra en menos de 2 minutos, sin ayuda.
- [ ] La compra genera una transacción real en devnet, y el comercio cobra en ese momento (verificable en Explorer).
- [ ] El flujo de mora completo (vence → gracia → cobro al fiador en sandbox → `registrar_recupero` → baja de escalón) se puede mostrar en menos de 60 segundos.
- [ ] El fiador hace KYC real con Didit y la tarjeta queda tokenizada en el sandbox de Mobbex.
- [ ] El programa está desplegado en devnet, con tests que pasan y el program ID en el README.
- [ ] README en inglés, con lo real y lo simulado declarado.
- [ ] Todo en devnet. Nada en mainnet.

✔ 6/6
