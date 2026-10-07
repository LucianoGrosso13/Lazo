# 03 - MVP: "Cuotas sin tarjeta, con fiador"

> **Vigente 2026-10-07:** leer `06-decisiones-comerciales.md`. Se mantienen 3 cuotas como recorrido de referencia para terminar la demo; el producto incorpora 1/3 sin interés y 6 con interés, liquidación elegible por el comercio y fiador 100% en todos los escalones. Esas ampliaciones aún no están implementadas. El guion de abajo es objetivo de construcción, no evidencia de funcionamiento real.

Sesión del 2026-10-03. Skill: `/solana-tuc-mvp`. Borrador armado de corrido a pedido del equipo ("hagamos todo ya o por lo menos planeemos"). Cada sección está marcada con lo que falta confirmar.

**Veredicto heredado:** angostar a la cuña + clon consciente. La demo **tiene que mostrar la cuña**: un fiador con tarjeta que solo paga si el estudiante no paga, una escalera que mejora las condiciones y un pool auditable onchain. Si el video muestra solo "comprar en cuotas", se ve igual que Mercado Pago o Yumi y no suma.

**Equipo y horas:** 2 personas. Luciano hace el front y lo off-chain (tienda, checkout, fiador, keeper). El compañero hace el programa Anchor (`proyecto/03-brief-companero.md`). Horas reales hasta el 12/10: **a confirmar**. El plan asume ~9 días de trabajo parcial de los dos.

## Los tres beneficios que la demo tiene que dejar claros (pedido del equipo, 2026-10-03)

Cada pantalla clave muestra uno de estos tres beneficios con números, siempre al lado de la alternativa:

| Para quién | Beneficio | Número a mostrar | Dónde se ve |
|---|---|---|---|
| **Estudiante** | 1 y 3 cuotas sin interés; 6 con interés moderado, tasa pendiente. Sin tarjeta propia; el respaldo no prepaga la compra y un eventual cargo sí puede consumir límite del fiador. Cada plan pagado baja el anticipo y sube el tope | Caso base ilustrativo de 3 cuotas: PC de 1.000 devUSDC, total 1.000 (anticipo 300 + cuotas sobre 700, ajustando redondeo final). Comparaciones de terceros pendientes de recotizar. Muestra cuánto baja el anticipo en el escalón siguiente | Checkout y panel del estudiante |
| **Comercio** | Elige plazo de cobro y costo, y vende a compradores sin tarjeta. Caso base: adelanto al instante; asignación del riesgo en cobro diferido pendiente | Referencia inmediato/3 cuotas: 7% de lo financiado = 4,9% del precio en escalón 0. Otras tarifas y fechas pendientes; sin afirmar ahorro frente a comparaciones no recotizadas | Panel del comercio |
| **Pool / inversor** | Trazabilidad del capital y pérdidas en tramos; objetivo: cada préstamo, pago y recupero verificable onchain | Tesorería y wallets de prueba; junior absorbe primera pérdida. Rendimiento y mora de equilibrio requieren recalcular costos, split y recupero; no prometer APY | Panel del pool |

## Usuario, momento wow y guion de demo

**Usuario de ejemplo:** Luciano, estudiante de la UNT, quiere una PC de 1.000 en 3 cuotas sin tarjeta propia. Un garante con tarjeta respalda el plan. Validar también compras minoristas recurrentes; el caso de PC no prueba demanda en todos los rubros.

**Momento wow:** **el estudiante no paga una cuota y, sin que nadie haga nada, se le cobra la tarjeta al fiador. El pool registra el recupero onchain con el comprobante, y el comercio ya había cobrado todo el primer día.** Es la cuña en 20 segundos: crédito sin tarjeta propia, respaldado por la familia, auditable.

**Guion (5 pasos, 3 minutos):**
1. **La mamá se suma como fiadora** (30 s): abre el link que le mandó Luciano, hace KYC con Didit, elige un tope de compras de US$1.000, acepta la fianza (el hash queda onchain) y carga la tarjeta (sandbox de Mobbex).
2. **Luciano compra la PC** (45 s): en la tienda demo elige "3 cuotas sin interés, sin tarjeta". Paga el anticipo de US$300 con Phantom. **El comercio recibe US$951 al instante** (1.000 − 7% de los 700 financiados), y se ve en Solana Explorer.
3. **Paga la primera cuota** (20 s): desde su panel paga US$233,33 en USDC y ve el progreso del plan y su escalón.
4. **No paga la segunda** (45 s): en la demo, un "día" dura segundos. Pasa la gracia, el fiador recibe el aviso y llega el día 15: **el keeper le cobra a la tarjeta del fiador**, `registrar_recupero` deja el hash del comprobante onchain y Luciano baja de escalón.
5. **El pool** (30 s): tramos junior y senior, préstamos, pagos y recuperos, todo verificable en la cadena. Se cierra con la escalera: otro estudiante (datos de ejemplo) en el escalón 3 compra sin anticipo.

✔ 1/6. Falta confirmar con el equipo.

## Tipo de producto y flujo central

**Tipo:** medio de pago con financiación y respaldo. Hay intermediarios para tarjeta, identidad y conversión; el registro del plan y los movimientos del pool se proyectan verificables en Solana.

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

**No entra (no se discute de nuevo):** tramo sin fiador en la UI (queda solo en la config); varios planes por estudiante en el programa (el mock sí permite margen compartido, ver nota técnica en 05); avaladores por cohorte; cuotas fijas en pesos; off-ramp a pesos del comercio; app oficial de Tiendanube o plugin de WooCommerce; firma digital certificada; disputas de contracargo; LP tokens componibles o yield en Kamino; mainnet.

✔ 3/6

## Real vs. simulado — estado documentado, sin nueva prueba técnica

La última comprobación técnica está en `handoff-demo-devnet.md` (6/10). Esta actualización sólo verifica documentos; no reejecuta compras ni pruebas del programa.

| Parte | Estado registrado | Qué declarar en el video |
|---|---|---|
| Front por defecto | Mock en navegador | “Browser simulation; no blockchain transaction” |
| Programa: núcleo y ciclo de crédito | Código y tests locales registrados; upgrade/init/fondeo devnet pendientes | No mostrar el ciclo como ejecutado en cadena sin una transacción observada |
| Cliente real y Codama | Código disponible; falta e2e real tras upgrade | “Devnet integration pending end-to-end verification” |
| devUSDC | Mint propio de prueba, sin valor | “Test tokens on Solana devnet” |
| Comercio cobra 951, pago y recupero | Simulados en el recorrido mock actual | Sin hash ni link Explorer inventado |
| Didit, Mobbex y keeper | Código disponible; credenciales y flujo real pendientes | Onboarding/cargo mock, o sandbox sólo cuando se observe realmente |
| Fianza | Máximo contractual aún pendiente | Hash no sustituye consentimiento ni prueba cobro |
| Tiempo, tienda y escalón avanzado | Datos y reloj de demo | Simulación y persona de ejemplo |
| Pool e inversores | Tesorería/wallets de prueba | Sin fondeo ni rendimiento real |
| 1/6 cuotas, plazo de cobro y fiador 100% | Nuevas decisiones documentadas | Roadmap hasta completar C1–C6 |
| Alianzas y minorista | Investigación/plan | Sin acuerdos, ventas ni tracción nueva |

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
