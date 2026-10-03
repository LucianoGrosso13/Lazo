# Costos de Mercado Pago y competencia — research para el pitch BNPL

Investigación del 03/10/2026. Cada dato lleva su URL y la fecha de la fuente o de la consulta. Lo que no se pudo confirmar contra una fuente primaria está marcado **SIN VERIFICAR**.

## Resumen ejecutivo (5 bullets)

- **"El usuario paga muchos intereses en Mercado Pago" es cierto y verificable:** la propia página de Mercado Libre publica para su Línea de Crédito / Cuotas sin Tarjeta CFTEA de **61% a 388%** (TNA 40%–140%, TEA 48%–276%), y un caso real de Cyber Monday 2025 mostró **CFTEA 367,45%** (TNA 136%). Una compra de $100.000 en 12 cuotas termina ~$260.000.
- **Pero "el comercio cobra al instante" NO es diferencial:** con QR de Mercado Pago, una venta con Cuotas sin Tarjeta (Mercado Crédito) le cuesta al comercio ~**1,35% + IVA** y se acredita en el momento, con el riesgo crediticio a cargo de MP. Nuestro "cobrás al toque" iguala al incumbente, no lo supera.
- **La cuña real está en el precio para el consumidor y en el público no aprobado:** una cuota en USDC al 0% cuesta ~0% en términos reales para alguien que cobra en pesos (el MEP subió solo +3,4% en 12 meses vs IPC +33,5%), mientras que 3 cuotas en MP salen ~**+29% real** al ejemplo publicado. Contra cuotas "sin interés" subsidiadas por el comercio o promos de MP (el usuario paga 0%), no somos mejores.
- **El mito "los estudiantes no acceden a MP" es débil:** MP no exige recibo de sueldo — evalúa con scoring de IA sobre el uso de la app y afirma que personas sin historial acceden a crédito. Lo que sí falta verificar es el límite inicial (**SIN VERIFICAR**: no hay cifra oficial).
- **Competencia directa con nombre propio:** Naranja X ya vende "Cuotas sin tarjeta" por QR (hasta 6 cuotas, CFTEA 70,32%–403,48%, tope $300.000), Ualá "cuotifica" consumos (usuarios seleccionados), MODO deriva el crédito a los bancos (no sirve al no bancarizado) y existen BNPL-con-débito cordobesas (GoCuotas, Wibond). El nicho "estudiante con cuota en stablecoin y reputación portable" sigue vacío, pero el diferencial hay que defenderlo en precio y público, no en mecánica.

## 1. Mercado Pago: "Cuotas sin Tarjeta" / Línea de Crédito

### Qué es y cómo funciona

Línea de crédito administrada por Mercado Pago: el comprador paga en hasta 12 cuotas fijas mensuales sin tarjeta; **el vendedor recibe el importe íntegro de la compra por adelantado**. Requiere cuenta de Mercado Pago, confirmar celular y validar identidad. [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/integration-configuration/installments-without-card), [iProfesional 23/11/2025](https://www.iprofesional.com/finanzas/442026-linea-credito-mercado-pago-como-activar-cuotas-sin-tarjeta).

### Tasas para el consumidor

- **Oficiales publicadas** (pie de la landing de Mercado Libre, consultado 03/10/2026): **CFTEA 61% (mín) – 388% (máx); TNA 40% (mín) – 140% (máx); TEA 48% (mín) – 276% (máx)**. [mercadolibre.com.ar/mercado-credito](https://www.mercadolibre.com.ar/mercado-credito).
- **Ejemplo real publicado** (Cyber Monday nov-2025, captura de la propia pantalla de Mercado Libre): **TNA 136%, TEA 262,66%, CFTEA 367,45% (IVA incluido)**. Simulación del medio sobre $100.000: 3 cuotas ≈ $134.000 total; 6 cuotas ≈ $175.000; 12 cuotas ≈ $260.000. [Informate Salta, nov-2025](https://informatesalta.com.ar/sociedad/ojo-al-cyber-monday--financiar-tus-compras-en-mercado-libre-puede-costarte-hasta-367--anual_a695d56ca583e69812800be5a).
- Relevamiento de terceros (mar-2026): "desde 70% TNA", variable según usuario y plazo. [sincomisiones.com.ar](https://sincomisiones.com.ar/cuentas/rankings/tarjetas-debito-cuotas).
- **Mora:** interés punitorio de hasta **2× la TNA pactada**, informe negativo al BCRA; dos cuotas impagas consecutivas = "supuesto de incumplimiento" y MP puede exigir el pago total. [iProfesional](https://www.iprofesional.com/finanzas/439901-como-se-amortiza-un-credito-de-mercado-pago-el-paso-a-paso-para-entender-tus-cuotas), [El Diario Nuevo Día](https://www.eldiarionuevodia.com.ar/nacionales/creditos-de-mercado-pago-como-funcionan-las-cuotas-y-que-pasa-si-no-pagas-a-tiempo/).

### ¿Quién es aprobado? ¿Estudiantes sin ingresos formales?

- No hay requisito formal de recibo de sueldo publicado. MP usa **scoring propio con IA** sobre el comportamiento dentro del ecosistema: ~250 variables de navegación, ~900 transaccionales (24% de peso), préstamos anteriores (34%), cobranzas (18%), ventas (6%), buró de crédito (~280 variables). [iProfesional](https://www.iprofesional.com/tecnologia/361695-mercadopago-como-hago-para-pedir-un-prestamo-personal).
- MP afirmó a TN (28/12/2025): el scoring "permite que **personas sin historial crediticio** puedan acceder a herramientas de financiamiento y que las líneas ofrecidas sean acordes a sus capacidades de pago". [TN](https://tn.com.ar/economia/2025/12/28/mas-alla-del-recibo-de-sueldo-los-metodos-para-calificar-para-un-prestamo-se-redisenan-con-tecnologia/).
- **Conclusión honesta:** un estudiante sin ingresos formales **sí puede ser aprobado** si usa la app (pagos, recargas, QR); lo probable es que reciba límites bajos. "No tengo tarjeta" ≠ "MP no me presta".
- **Límite inicial: SIN VERIFICAR.** MP no publica montos iniciales; solo dice que el límite se conoce al activar y "podría ir aumentando" pagando a tiempo. [mercadopago.com.ar/creditos/comprar-cuotas-sin-tarjeta](https://www.mercadopago.com.ar/creditos/comprar-cuotas-sin-tarjeta). Fuentes secundarias de baja confianza hablan de cupos iniciales bajos (decenas de miles de pesos) que crecen con el uso; no las citamos como dato.

### Qué paga el comercio y cuándo cobra

- **QR con Mercado Crédito (Cuotas sin Tarjeta): 1,35% + IVA, acreditación al instante** (tabla de costos QR de MP, consultado 03/10/2026). [mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr](https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr). Una nota de Ámbito consignó 1,24% + IVA al instante — posible variación por fecha/configuración. [Ámbito](https://www.ambito.com/informacion-general/una-una-todas-las-comisiones-que-se-lleva-mercado-pago-cada-venta-n5766651).
- El **interés del financiamiento lo paga el comprador**, no el comercio; MP asume el riesgo crediticio y el fraude. (La landing equivalente de México lo explicita; la mecánica AR es la misma según la documentación para desarrolladores.) [MP México](https://www.mercadopago.com.mx/blog/que-es-meses-sin-tarjeta-mercado-pago), [developers AR](https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/integration-configuration/installments-without-card).
- Cobros con tarjeta de crédito (Link de pago / Checkout): **6,29% al instante, 4,39% a 10 días, 3,39% a 18 días, 1,49% a 35 días (+IVA)**. [link de pago](https://www.mercadopago.com.ar/herramientas-para-vender/link-de-pago), [checkout](https://www.mercadopago.com.ar/herramientas-para-vender/check-out).
- Si el comercio quiere ofrecer cuotas **sin interés al consumidor** (con tarjeta), absorbe el financiamiento: 3 cuotas 10,49%, 6 cuotas 18,69%, 12 cuotas 32,29%, 18 cuotas 41,59% (se suma al costo de cobro). [link de pago](https://www.mercadopago.com.ar/herramientas-para-vender/link-de-pago).
- Ojo: MP también empuja sustitutos al 0% para el usuario — la tarjeta de crédito MP da 3 cuotas sin interés en ML y en QR > $30.000. [Sir Chandler, sep-2025](https://www.sirchandler.com.ar/2025/09/se-me-habilito-la-tarjeta-de-credito-de-mercado-pago/), [iProfesional](https://www.iprofesional.com/finanzas/439365-nueva-tarjeta-de-credito-de-mercado-pago-como-pedirla-y-conocer-su-limite).

## 2. Competencia, corto

### Naranja X — "Cuotas sin tarjeta" (préstamo por QR)

El producto más parecido al nuestro: escaneás cualquier QR y pagás con un préstamo de $10.000 a $300.000 en 1, 3 o hasta 6 cuotas fijas; el comercio cobra en el acto; la cuota se debita el 10 de cada mes. **Tasas oficiales (vigencia 01–31/10/2026): TNA 45%–143%, TEA 55,55%–286,13%, CFTEA 70,32%–403,48%.** Ejemplo publicado: $10.000 en 6 meses → total $15.606,95 (TNA repr. 141%). Requisitos: +18, DNI, selfie; sujeto a evaluación crediticia. [naranjax.com/prestamos/cuotas-sin-tarjeta](https://www.naranjax.com/prestamos/cuotas-sin-tarjeta), [naranjax.com/prestamos](https://www.naranjax.com/prestamos).

### Ualá — Cuotificar consumos / préstamos

No es cuota en el punto de venta: "cuotificás" consumos ya hechos con débito/app y te reintegran la plata. Disponible **solo para usuarios seleccionados**; TNA/TEA/CFT varían por perfil y se informan antes de aceptar (fuente oficial no publica rangos). Requisitos oficiales: +18, residente, **sin mora registrada en los últimos 24 meses**. [uala.com.ar/prestamos](https://www.uala.com.ar/prestamos), [info al usuario financiero](https://www.uala.com.ar/informacion-al-usuario-financiero-alau). Rangos de terceros (**SIN VERIFICAR contra fuente primaria**): 113%–162% TNA según [sincomisiones, mar-2026](https://sincomisiones.com.ar/cuentas/rankings/tarjetas-debito-cuotas); préstamos TNA ~82%–149% y CFT de cuotificación 404%–697% según [dincred](https://dincred.com/ar/prestamo-desde-la-app-uala/).

### MODO — Cuotas

MODO **no presta**: "MODO Cuotas" son créditos otorgados por las **entidades financieras asociadas** (el banco del usuario), solo para usuarios preseleccionados por su banco y con evaluación crediticia. Para un estudiante sin cuenta bancaria con crédito preaprobado, no existe oferta. [T&C MODO Cuotas](https://www.modo.com.ar/ayuda/preguntas-frecuentes/T%C3%A9rminos-y-condiciones-de-las-cuotas-con-bancos). También permite pagar en cuotas con tarjeta en QR/tiendas online. Además hay BNPL-con-débito locales (GoCuotas, Wibond, cordobesas) que ensayan cuotas fijas incluso en dólares. [iProUP](https://www.iproup.com/finanzas/52751-tarjeta-y-qr-en-dolares-cambios-en-modo-y-mercado-pago).

### Venta con tarjeta de crédito en cuotas: qué paga el comercio y cuándo cobra

- **Tope legal de arancel:** 3% sobre liquidaciones de crédito, 1,5% débito (Ley 25.065 art. 15, modif. por Ley 26.010). Tope de tasa de intercambio BCRA: **1,30% crédito / 0,60% débito**. [Infoleg](https://servicios.infoleg.gob.ar/infolegInternet/anexos/100000-104999/102825/norma.htm), [BCRA](https://www.bcra.gob.ar/tarjeta-de-debito/).
- **Plazos de acreditación de ventas en un pago (Com. A 7305, vigente desde 1/7/2021):** 8 días hábiles MiPyME/personas humanas; 10 días hábiles medianas y alojamiento/turismo/gastronomía/salud; **18 días hábiles el resto**. [BCRA A7305](https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7305.pdf), [BCRA](https://www.bcra.gob.ar/noticias/sobre-la-reduccion-de-plazos-para-la-liquidacion-de-ventas-con-tarjeta-de-credito/), [FECRA](https://fecra.com.ar/plazo-acreditacion-tarjetas-de-credito/). Prepaga: 2 días hábiles desde 2025 (Com. A 8162). [Boletín Oficial](https://www.boletinoficial.gov.ar/detalleAviso/primera/319016/20241230), [Marval](https://www.marval.com/publicacion/tarjetas-prepagas-nuevos-plazos-de-acreditacion-17058).
- **Ahora 12 / Cuota Simple: el programa ya no existe.** Cuota Simple terminó en jun-2025 y no se renovó; el Gobierno derogó formalmente Ahora 12, Cuota Simple y Precios Cuidados (Res. 12/2026, Disp. 534/2026, 09/06/2026). Mientras rigió: descuento directo máximo al comercio de **5,41% (3 cuotas) y 10,31% (6 cuotas)**, cobro a 10 días hábiles; CFT para el consumidor 7,65% y 15,61% en PyMEs vs hasta **235% CFT / 175% TEA en grandes cadenas y marketplaces** fuera del programa. [Infobae 09/06/2026](https://www.infobae.com/economia/2026/06/09/el-gobierno-derogo-en-forma-definitva-la-normativa-de-los-programas-ahora-12-cuota-simple-y-precios-cuidados/), [argentina.gob.ar/cuota-simple](https://www.argentina.gob.ar/economia/comercio/cuota-simple/comerciantes), [negociosdeargentina](https://negociosdeargentina.com.ar/informe-sobre-financiamiento-cuota-simple-vs-cuota-mercado/).

## 3. ¿La cuota en USDC al 0% es realmente más barata? (la cuenta)

### Datos verificados

- **Inflación:** IPC agosto-2026 = **1,7% mensual** (núcleo 1,8%), **33,5% interanual**, acumulado ene–ago 21,3%. Publicado por INDEC el 10/09/2026. [INDEC PDF](https://www.indec.gob.ar/uploads/informesdeprensa/ipc_09_26A1BE2DC4CD.pdf), [La Nación 10/09/2026](https://www.lanacion.com.ar/economia/la-inflacion-fue-de-17-en-agosto-la-mas-baja-en-mas-de-un-ano-nid10092026/). (Septiembre aún no publicado al 03/10.)
- **Dólar oficial (BNA venta):** 03/10/2025 $1.450 → 03/10/2026 $1.540 → **+6,2% en 12 meses**. [dolarhistorico oct-2025](https://dolarhistorico.com/dolar-banco-nacion/mes/octubre-2025), [TN 03/10/2026](https://tn.com.ar/economia/2026/10/03/dolar-oficial-hoy-y-dolar-blue-a-cuanto-cotizan-este-sabado-3-de-octubre/).
- **Dólar MEP:** 03/10/2025 cierre $1.498,81 → 02/10/2026 $1.549,26 → **+3,4% en 12 meses** (oct-2025 movió entre $1.409,92 y $1.592,99, muy volátil). [Rava oct-2025](https://www.rava.com/cotizaciones/historico/dolar-mep/2025/10/), [Rava oct-2026](https://www.rava.com/cotizaciones/historico/dolar-mep/2026/10/), [indicadores.ar](https://indicadores.ar/cotizacion-dolar/2026-10-03).
- Lectura clave: **el peso se apreció en términos reales** — MEP +3,4% vs IPC +33,5% ⇒ el dólar quedó ~22,6% más "barato" contra la canasta (1,034/1,335 ≈ 0,774).

### La cuenta (compra de USDC 100 ≈ $154.900 al MEP del 02/10/2026)

Deflactor mensual usado: 1,8% (núcleo INDEC). MEP proyectado +0,28%/mes (promedio de los últimos 12 meses).

**Opción A — Mercado Pago Cuotas sin Tarjeta, 3 cuotas** (ejemplo real publicado: $100k → ~$134k, +34% en 3 meses):

- Nominal: 3 cuotas de ~$69.000; total ~$207.000.
- En pesos de hoy: 69.000×(1/1,018 + 1/1,018² + 1/1,018³) = 69.000×2,895 ≈ **$199.800 → costo real ≈ +29% sobre el contado.**

**Opción B — Nuestro plan (escalón 0): anticipo 50% + 3 cuotas, 0% interés, en USDC:**

- Anticipo hoy: 50 USDC = $77.450.
- Cuotas 3 × 16,67 USDC, comprando USDC cada mes al MEP: ~$25.850/mes en pesos.
- En pesos de hoy: 77.450 + 25.850×2,895 ≈ $152.300 → **costo real ≈ −1,6% (levemente más barato que el contado**, porque las cuotas en USD se licúan frente a sueldos que ajustan por IPC ~1,8%/mes mientras el MEP está casi plano).
- Costo extra real: spread ARS→USDC de la app que use (~1%, no verificado) ⇒ real ≈ 0%–1%.

**Piso del incumbente:** con el mejor CFTEA publicado de MP (61%, TNA 40%), 3 cuotas ≈ +2,8% real — sigue por encima de nuestro 0%, pero el margen se achica mucho. Contra tasas medias/máximas (TNA ~136%, CFTEA ~367%), el gap es de ~30 puntos reales en solo 3 meses.

**Riesgo declarado:** si hubiera un salto devaluatorio en los 3 meses del plan, la cuota en USDC encarece en pesos. En el último año el riesgo corrió a favor del deudor (MEP +3,4% < IPC +33,5%), pero no es estructural.

## 4. Conclusión: ¿es un diferencial fuerte?

**Sí, donde pega:**

- **Precio para el consumidor.** El producto análogo de MP (Cuotas sin Tarjeta) le cobra al comprador CFTEA de 61%–388%; el ejemplo más visible publicado llega a 367%. Nuestro 0% en USDC le gana incluso al *mínimo* de MP en términos reales. "El usuario paga muchos intereses en MP" es cierto y citable.
- **Público.** El diferencial es más fuerte con quien tiene peor scoring (tasa de MP sube con el riesgo) o línea insuficiente/nula. MODO no sirve al no bancarizado (el crédito lo da el banco); Naranja X y Ualá cobran caro igual o más que MP.
- **Comercio que quiere USD.** MP le acredita pesos; cobrar en USDC o con reputación de clientes portable entre comercios es algo que MP no ofrece.

**No, donde no pega:**

- **"El comercio cobra al instante" ya lo resuelve MP** (~1,35% + IVA, riesgo incluido). Es paridad, no ventaja. Cuota Simple tampoco es argumento: murió en jun-2025.
- **Cuotas "sin interés" para el usuario existen** (comercio absorbe 10,5%–32%; promos MP de 3 cuotas sin interés con su tarjeta en compras >$30.000; 18 cuotas promocionales). Ahí el usuario paga 0% y nosotros somos iguales o peores porque pedimos anticipo.
- **El anticipo es un costo de UX.** MP financia el 100% sin anticipo; nuestro escalón 0 exige 50%. El escalón a 0% de anticipo es la promesa, no el punto de entrada.
- **Punitorios no nos distinguen:** MP ya cobra hasta 2× la TNA en mora y reporta al BCRA.
- **Acceso:** MP aprueba sin recibo de sueldo (scoring de uso). El relato "los estudiantes no pueden usar MP" es falso; el relato correcto es "los estudiantes pagan el CFT más caro o reciben límites bajos" — y eso hay que verificarlo con casos reales (**SIN VERIFICAR**: cuánto límite inicial recibe un usuario joven sin historial).

**Versión honesta para el pitch:** "No competimos con el cobro instantáneo ni con las cuotas sin interés subsidiadas. Competimos contra el CFT de 60%–390% que le cobran MP/Naranja/Ualá al que financia sin tarjeta: nosotros cobramos 0% en stablecoin, el comercio cobra todo hoy en la moneda que elija, y cada plan pagado construye reputación portable que ninguna billetera le da."

## Fuentes

1. Mercado Libre — Línea de Crédito / Cuotas sin Tarjeta, tasas oficiales (CFTEA 61%–388%, TNA 40%–140%, TEA 48%–276%): https://www.mercadolibre.com.ar/mercado-credito — consultado 03/10/2026
2. Mercado Pago Developers — Financiación sin tarjeta (vendedor cobra íntegro, hasta 12 cuotas): https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/integration-configuration/installments-without-card — consultado 03/10/2026
3. Mercado Pago — Landing Cuotas sin Tarjeta (activación, límite, pagos): https://www.mercadopago.com.ar/creditos/comprar-cuotas-sin-tarjeta — consultado 03/10/2026
4. Mercado Pago — Cobrar con QR, costos (Mercado Crédito al instante 1,35%+IVA; crédito 5,99% instante / 4,19% 10 días; dinero en cuenta 0,8%+IVA): https://www.mercadopago.com.ar/herramientas-para-vender/cobrar-con-qr — consultado 03/10/2026
5. Mercado Pago — Link de pago, costos (6,29%/4,39%/3,39%/1,49% según plazo; cuotas sin interés 2x 7,79% → 18x 41,59%): https://www.mercadopago.com.ar/herramientas-para-vender/link-de-pago — consultado 03/10/2026
6. Mercado Pago — Checkout: https://www.mercadopago.com.ar/herramientas-para-vender/check-out — consultado 03/10/2026
7. Informate Salta — caso real CFTEA 367,45% (TNA 136%, TEA 262,66%) y simulación $100.000, nov-2025: https://informatesalta.com.ar/sociedad/ojo-al-cyber-monday--financiar-tus-compras-en-mercado-libre-puede-costarte-hasta-367--anual_a695d56ca583e69812800be5a
8. iProfesional — activación de la línea y pagos, 23/11/2025: https://www.iprofesional.com/finanzas/442026-linea-credito-mercado-pago-como-activar-cuotas-sin-tarjeta
9. iProfesional — mora y punitorios (hasta 2× TNA, informe BCRA): https://www.iprofesional.com/finanzas/439901-como-se-amortiza-un-credito-de-mercado-pago-el-paso-a-paso-para-entender-tus-cuotas
10. iProfesional — variables del scoring de Mercado Crédito: https://www.iprofesional.com/tecnologia/361695-mercadopago-como-hago-para-pedir-un-prestamo-personal
11. TN — scoring sin recibo de sueldo, MP/Ualá con IA, 28/12/2025: https://tn.com.ar/economia/2025/12/28/mas-alla-del-recibo-de-sueldo-los-metodos-para-calificar-para-un-prestamo-se-redisenan-con-tecnologia/
12. Ámbito — comisiones MP por venta (Mercado Crédito 1,24%+IVA instante, variante): https://www.ambito.com/informacion-general/una-una-todas-las-comisiones-que-se-lleva-mercado-pago-cada-venta-n5766651
13. Sir Chandler — tarjeta de crédito MP, 3 cuotas sin interés QR >$30.000, sep-2025: https://www.sirchandler.com.ar/2025/09/se-me-habilito-la-tarjeta-de-credito-de-mercado-pago/
14. iProfesional — tarjeta de crédito MP, límites por evaluación interna: https://www.iprofesional.com/finanzas/439365-nueva-tarjeta-de-credito-de-mercado-pago-como-pedirla-y-conocer-su-limite
15. Naranja X — Cuotas sin tarjeta (oficial: $10k–$300k, 1/3/6 cuotas, TNA 45%–143%, CFTEA 70,32%–403,48%, vigencia oct-2026): https://www.naranjax.com/prestamos/cuotas-sin-tarjeta — consultado 03/10/2026
16. Naranja X — Préstamos (requisitos, tasas y ejemplo $10.000/12 meses → $21.685,88): https://www.naranjax.com/prestamos — consultado 03/10/2026
17. Ualá — Préstamos (requisitos oficiales) e Info al usuario financiero (cuotificar solo usuarios seleccionados): https://www.uala.com.ar/prestamos y https://www.uala.com.ar/informacion-al-usuario-financiero-alau — consultado 03/10/2026
18. Sin Comisiones — comparativa cuotas sin tarjeta de débito (MP "desde 70% TNA"; Ualá 113%–162% TNA), mar-2026: https://sincomisiones.com.ar/cuentas/rankings/tarjetas-debito-cuotas
19. Dincred — rangos Ualá (TNA ~82%–149%, CFT cuotificación 404%–697%) — **fuente secundaria, SIN VERIFICAR**: https://dincred.com/ar/prestamo-desde-la-app-uala/
20. MODO — T&C MODO Cuotas (crédito de las entidades asociadas, usuarios seleccionados): https://www.modo.com.ar/ayuda/preguntas-frecuentes/T%C3%A9rminos-y-condiciones-de-las-cuotas-con-bancos — consultado 03/10/2026
21. iProUP — MODO/MP, cuotas en dólares, mención GoCuotas y Wibond: https://www.iproup.com/finanzas/52751-tarjeta-y-qr-en-dolares-cambios-en-modo-y-mercado-pago
22. Ley 25.065 art. 15 (tope arancel crédito 3% / débito 1,5%), Infoleg: https://servicios.infoleg.gob.ar/infolegInternet/anexos/100000-104999/102825/norma.htm
23. BCRA — topes de tasa de intercambio (1,30% crédito / 0,60% débito): https://www.bcra.gob.ar/tarjeta-de-debito/ — consultado 03/10/2026
24. BCRA — Com. A 7305 (acreditación ventas tarjeta: 8/10/18 días hábiles): https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7305.pdf y nota https://www.bcra.gob.ar/noticias/sobre-la-reduccion-de-plazos-para-la-liquidacion-de-ventas-con-tarjeta-de-credito/
25. Boletín Oficial — Com. A 8162/2024 (prepaga 2 días hábiles, vigencia 2025): https://www.boletinoficial.gov.ar/detalleAviso/primera/319016/20241230 ; análisis Marval: https://www.marval.com/publicacion/tarjetas-prepagas-nuevos-plazos-de-acreditacion-17058
26. Gobierno — Cuota Simple comerciantes (descuento máx. 5,41%/10,31%, cobro 10 días hábiles): https://www.argentina.gob.ar/economia/comercio/cuota-simple/comerciantes — consultado 03/10/2026
27. Infobae — derogación de Ahora 12/Cuota Simple/Precios Cuidados (Res. 12/2026, Disp. 534/2026), 09/06/2026: https://www.infobae.com/economia/2026/06/09/el-gobierno-derogo-en-forma-definitva-la-normativa-de-los-programas-ahora-12-cuota-simple-y-precios-cuidados/
28. Negocios de Argentina — Cuota Simple vs "cuota Mercado" (PyMEs CFT 7,65%/15,61%; grandes cadenas hasta 235% CFT, TEA 175%): https://negociosdeargentina.com.ar/informe-sobre-financiamiento-cuota-simple-vs-cuota-mercado/
29. INDEC — IPC agosto-2026 (1,7% mensual, 33,5% interanual, 21,3% acumulado), publicado 10/09/2026: https://www.indec.gob.ar/uploads/informesdeprensa/ipc_09_26A1BE2DC4CD.pdf ; https://www.indec.gob.ar/Nivel3/Tema/3/5
30. La Nación — cobertura IPC agosto-2026 (1,7%, más bajo desde jun-2025; julio 2,1%), 10/09/2026: https://www.lanacion.com.ar/economia/la-inflacion-fue-de-17-en-agosto-la-mas-baja-en-mas-de-un-ano-nid10092026/
31. Rava Bursátil — histórico MEP oct-2025 (03/10 cierre $1.498,81; rango $1.409,92–$1.592,99) y oct-2026 (02/10 $1.549,26): https://www.rava.com/cotizaciones/historico/dolar-mep/2025/10/ y https://www.rava.com/cotizaciones/historico/dolar-mep/2026/10/
32. Dólar Histórico — BNA oct-2025 (03/10 venta $1.450; cierre mes $1.475): https://dolarhistorico.com/dolar-banco-nacion/mes/octubre-2025
33. TN — cotizaciones 03/10/2026 (oficial $1.540, blue $1.560, MEP $1.546,59, tarjeta $2.002): https://tn.com.ar/economia/2026/10/03/dolar-oficial-hoy-y-dolar-blue-a-cuanto-cotizan-este-sabado-3-de-octubre/
34. indicadores.ar — resumen oct-2025 (oficial prom. $1.463,57; MEP prom. $1.498,21) y 03/10/2026: https://indicadores.ar/cotizacion-dolar/2025-10 y https://indicadores.ar/cotizacion-dolar/2026-10-03
