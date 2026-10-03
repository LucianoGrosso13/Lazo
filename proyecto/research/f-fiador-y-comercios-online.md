# F — Fiador con tarjeta y distribución con comercios online

Sesión del 2026-10-03. Preguntas: (1) qué procesadores argentinos permiten guardar la tarjeta del fiador y cobrarle después sin su presencia (MIT), con qué costos y riesgos; (2) encuadre legal de la fianza en un contrato de consumo; (3) cómo integrar un medio de pago nuevo en Tiendanube/WooCommerce/Shopify; (4) qué compra un estudiante de Tucumán y a qué precios para calibrar topes; (5) qué mostrar real y qué simulado en la demo. Cada dato lleva fuente con fecha; lo no confirmado está marcado **SIN VERIFICAR**.

## Resumen ejecutivo

- **Cobrar a la tarjeta del fiador es técnicamente estándar hoy:** Mercado Pago (Pagos Automáticos: Card-on-File + transacciones iniciadas por el comercio —MIT—, validación Zero Dollar Auth, crédito y débito), Mobbex (suscripciones "manuales" con ejecución bajo demanda por API, la forma exacta de nuestro caso), Payway (débito automático + tokenización), dLocal (MIT nativo completo) y Rebill. **Stripe no está disponible para comercios constituidos en Argentina.** Para el MVP alcanzan MP o Mobbex, ambos self-serve y con modo de prueba.
- **Pero la tarjeta guardada NO es una garantía irrevocable:** el titular puede desconocer el consumo hasta 30 días después de recibido el resumen (art. 26, Ley 25.065) y dar de baja unilateralmente cualquier débito automático, con derecho a reversión dentro de los 30 días (normas BCRA). La tarjeta es el *rail de cobro y el disuasivo*; lo que da cobertura legal es el **mandato/fianza firmado**, que además habilita el reclamo civil si el cargo es revertido.
- **La figura legal correcta es la fianza solidaria con renuncia a la excusión** (arts. 1590 + 1584.d CCyC), o el "codeudor liso, llano y principal pagador" (art. 1591 lo equipara a deudor solidario — es la fórmula que ya usan los emisores de tarjetas argentinos). La fianza debe ser escrita (art. 1579), no más onerosa que la obligación del estudiante (art. 1575), y la jurisprudencia trata al fiador de un contrato de consumo como protegido por la Ley 24.240: información clara, **tope de responsabilidad explícito** y revocación en 10 días si se celebra a distancia (art. 34 LDC).
- **Hay precedentes locales casi idénticos:** GOcuotas cobra cuotas contra la tarjeta de débito del comprador mediante órdenes de pago + subrogación legal (art. 915 inc. c CCyC), opera como PNFC registrado y reporta morosos al BCRA; los emisores de tarjetas (DATA, Cencosud) ya exigen "codeudor liso y llano" en contratos de consumo; Hoggax/Finaer/Monclair prueban el onboarding 100% digital del fiador con firma digital; Alternativa Rent acepta una tarjeta activa como respaldo. Nuestro diseño ("el garante deja su tarjeta, se le cobra solo si el estudiante no paga") no es exótico: es la combinación de piezas que ya existen.
- **Canal de distribución:** Tiendanube concentra el e-commerce PyME argentino (180.000+ tiendas) y ya tiene un rail cripto oficial recomendado (Talo Pay: USDC/USDT/DAI) más el precedente de GOcuotas como app de cuotas. Ser *Payment Provider* oficial exige app auditada por Nuvemshop + convenio de revenue share (proceso de semanas/meses, sin plazo publicado); **para el MVP**: tienda propia en Tiendanube con "medio de pago personalizado" (sin aprobación, desde plan Esencial) que deriva al checkout onchain, o plugin propio de WooCommerce (sin aprobación tampoco). Calibración de topes con precios al 3/10/2026 (MEP ≈ $1.550): ticket promedio e-commerce USD 69; celular básico USD 100-190, gama media USD 300-615; bici USD 320-640; curso USD 290-610; notebook USD 195-775+ → escalón 0 ≈ **USD 150**, con fiador **USD 300-500**, avanzado **USD 700-1.000**.

---

## 1. Procesadores que guardan la tarjeta del fiador y cobran después (MIT / card-on-file)

### 1.1 Comparativa

| Procesador | Mecanismo aplicable | Crédito / Débito | Costo publicado | Alta y requisitos | Fuente (consulta 3/10/2026 salvo indicación) |
|---|---|---|---|---|---|
| **Mercado Pago — "Pagos Automáticos"** | Card-on-File: CIT y **MIT** (cobros únicos o recurrentes sin CVV). Validación con **Zero Dollar Auth** (cargo de $0) o con primer pago real; ZDA deja asentada la intención de cobros futuros | Crédito y débito (docs) | Sin tarifa específica publicada para el producto; rigen las tarifas estándar de cobro online de la cuenta (**SIN VERIFICAR** si MIT tiene precio distinto; las suscripciones históricamente cobran las mismas tasas del checkout: 6,29% instantáneo → 1,49% a 35 días + IVA, fuente secundaria postclic.com) | Cuenta de vendedor + integración por **Checkout API o Checkout Bricks** (la preaprobación **solo** está disponible vía checkout personalizado). Docs públicos, self-serve | developers.mercadopago.com.ar — Pagos Automáticos (recurring-charges, overview, introduction) |
| **Mercado Pago — Suscripciones sin código** | Plan de suscripción con link compartible; el suscriptor paga el primer cargo y queda adherido (crédito/débito/dinero en cuenta/Rapipago/PagoFácil); reintentos automáticos | Crédito y débito | Ídem anterior | Sin desarrollo: se crea el plan en el panel y se comparte el link | developers.mercadopago.com.ar — Planes de suscripción / Suscripciones overview |
| **Mobbex — Suscripciones** | Tres modalidades: **tarjetas tokenizadas por suscriptor** (customerReference, varias tarjetas), **suscripciones manuales** (cada cobro lo dispara el comercio vía API, monto y fecha libres = MIT real), y **DEBIN recurrente** contra CBU/CVU con autorización del titular. Extras: validación de DNI contra titular, reintentos, plugins WooCommerce/Tiendanube | Crédito, débito y prepagas de todas las marcas + DEBIN | Plan Essential publicado: **1,9% + IVA débito; 3,9% + IVA suscripciones** por transacción aprobada | Alta online en minutos; panel + API; es la opción más "a medida" del caso (el cobro al fiador es justamente un cobro manual condicional) | mobbex.com/planes, mobbex.com/suscripciones, mobbex.dev/suscripcionesrecurrencia |
| **Payway (ex Decidir/Prisma)** | **Débito automático**: el comercio presenta lotes de débitos por archivo TXT por marca de tarjeta (ventana semanal, procesamiento al día hábil siguiente, reintentos ante rechazo). **Tokenización** obligatoria (norma Visa desde 2023): token propio o vía Token Requestor; API/SDK con "pago tokenizado" | Marcas principales; cobertura de débito **SIN VERIFICAR** por marca | Token USD 0,03 c/u (promo USD 0,01 sep-2023); **+0,066% por cupón no tokenizado**; penalización hasta +0,05% por transacción sin tokenizar (e-commerce). Arancel del servicio no publicado | Alta comercial (Mi Payway, CUIT), flujo batch — más lento y más "empresa" que API | ayuda.payway.com.ar (débito automático; mandatorio tokenización), developers.payway.com.ar |
| **dLocal** | MIT nativo: `stored_credential_type` = `CARD_ON_FILE`, `SUBSCRIPTION`, `UNSCHEDULED_CARD_ON_FILE`, `INSTALLMENTS`, `NO_SHOW`, `DELAYED_CHARGES`, `REAUTHORIZATION`; `stored_credential_usage` FIRST→USED; **network tokens** automáticos; `network_payment_reference` enlaza los MIT al CIT inicial | Todas las tarjetas argentinas (Visa/MC/Amex/Naranja/Cabal/Cencosud/Argencard; crédito y débito: recurring = Yes en su tabla AR) | A convenir (no publica) | Contrato + KYB; pensado para cross-border y empresas; **overkill para el MVP pero es el "modo correcto" de hacer MIT** | docs.dlocal.com — Merchant Initiated Transactions, Network tokens, Argentina |
| **Rebill** | Suscripciones multi-método con tokenización instantánea del medio de pago; estados de suscripción + Smart Retries (dicen recuperar 60-71% de pagos rechazados) | Crédito, débito, prepagas, transferencia QR, billeteras | Página AR: **4,00%** tarjetas crédito/débito/prepagas (acreditación 24 h hábiles; prepagas 8 días), 1,60% transferencia QR; +IVA/retenciones | Self-serve LatAm; checkout y links sin desarrollo | rebill.com/precios/argentina, rebill.com/cobrar-suscripciones-y-pagos-recurrentes |
| **Stripe** | Tiene todo (PaymentMethod, off_session, mandates) **pero no da cuentas a comercios constituidos en Argentina** — no figura en la lista de países disponibles; para usarla hay que incorporar en el exterior (LLC) con cuenta bancaria extranjera | — | 2,9% + USD 0,30 (US) | Existe una entidad local (Stripe Payments Argentina S.A., constituida 2020, Boletín Oficial) pero no ofrece adquirencia a merchants locales | stripe.com/es/global; Boletín Oficial constitución SA 3/3/2020; guía secundaria cristiantait.com (2026) |

Otros no relevados en profundidad: PayU (redujo presencia en AR), Ualá Bis, Nave — **SIN VERIFICAR** si ofrecen CoF/MIT a PyMEs.

### 1.2 El riesgo real: contracargo y revocación

Lo que el titular siempre puede hacer, aun firmado el mandato:

- **Desconocimiento del consumo:** art. 26 Ley 25.065 — hasta **30 días** desde la recepción del resumen, por nota simple al emisor; mientras la operación esté impugnada el banco no puede exigirla. Si el fiador desconoce el cargo, el contracargo cae sobre el comercio (nosotros) y hay que disputarlo con evidencia. [Infoleg Ley 25.065; Defensoría Santa Fe; El Cronista]
- **Baja y reversión de débitos automáticos:** el usuario puede dar de baja la adhesión **unilateralmente** en su banco, pedir "stop debit" hasta el día hábil anterior al vencimiento y pedir **reversión del débito dentro de los 30 días corridos** (devolución en 72 h hábiles). [bcra.gob.ar/debito-directo; Com. A 6909; noticias BCRA]
- Conclusión honesta: **la tarjeta del fiador no es colateral**; es comodidad de cobro + compromiso explícito + presión social. El instrumento que hace exigible la obligación es la **fianza/mandato firmado** (§2), que habilita reclamo judicial/reporte a centrales aunque el cargo se revierta.

### 1.3 Cómo mitigarlo (lo que recomienda la práctica de las redes)

1. **Mandato escrito y firmado** (fianza + autorización expresa de cargos MIT, con monto tope, motivo y duración) — base legal para disputar el contracargo y para el reclamo civil.
2. **Primer contacto con el titular presente (CIT):** validación con **3-D Secure** (corre el liability del chargeback "no reconocido" al emisor) o **Zero Dollar Auth** de MP; guardar el `network_tx_reference`/`transaction_link_id` del CIT inicial y mandarlo en cada MIT (Visa y Mastercard lo exigen/recomiendan — dLocal ya lo implementa; Mastercard obliga el TLID desde 23/10/2026 según docs de dLocal).
3. **Aviso previo a cada cargo** (p. ej. 48-72 h antes por mail/WhatsApp) + recibo posterior con nombre del estudiante — baja muchísimo el "no lo reconozco".
4. **Descriptor de resumen claro** (`NOMBREAPP*CUOTA-L.GROSSO`): los desconocimientos accidentales son la mayor fuente de chargebacks en suscripciones.
5. **Validar titularidad:** solo tarjetas a nombre del fiador (DNI del titular = DNI del fiador; Mobbex lo ofrece como opción de suscripciones).
6. **Tope y caducidad del mandato:** cargo máximo por evento y total = saldo del plan + punitorios; vencimiento al terminar el plan.
7. **Reintentos y plan B:** si el MIT falla, avisar al fiador antes de reintentar (reglas de las redes limitan reintentos MIT); fallback = link de pago (CIT) al fiador.
8. Revisar T&C del procesador para **cargos a un tercero** (el titular de la tarjeta no es el comprador): técnicamente es un cargo por "servicio de garantía" contratado por el fiador — documentarlo así en el mandato. **SIN VERIFICAR** restricción específica por procesador.

---

## 2. Encuadre legal del fiador en un contrato de consumo

### 2.1 La fianza en el CCyC (Ley 26.994)

| Art. | Regla | Efecto para el producto |
|---|---|---|
| 1574 | Concepto: el fiador se obliga accesoriamente *para el caso de incumplimiento* del deudor | Es exactamente nuestra mecánica: el fiador paga **solo si** el estudiante no paga |
| 1575 | La prestación del fiador no puede ser más onerosa que la del deudor | **Topear la fianza**: saldo del plan + punitorios pactados, nada más |
| 1579 | **La fianza debe convenirse por escrito** | Firma digital (art. 288 CCyC) es válida — es lo que usan Hoggax/Finaer |
| 1583-1584 | Beneficio de excusión: el acreedor primero debe ejecutar los bienes del deudor; **renunciable** por el fiador (inc. d) | Sin renuncia, habría que litigar primero contra el estudiante → **exigir renuncia expresa a la excusión** |
| 1587 | El fiador puede oponer defensas propias **y las del deudor**, aunque este las haya renunciado | Si el plan del estudiante es inválido/usurario, el fiador puede invocarlo |
| 1589 | Beneficio de división entre varios fiadores (renunciable) | Con un solo fiador no aplica |
| **1590** | **Fianza solidaria**: solidaria si se conviene expresamente o si renuncia a la excusión | Es la figura recomendada: responde como el deudor, sin excusión previa |
| **1591** | **Principal pagador**: quien se obliga como tal es **deudor solidario**, no fiador | La fórmula "codeudor liso, llano y principal pagador" (que usan los emisores de tarjetas) es aún más fuerte pero más exigente de informar |

Recomendación contractual: **fianza solidaria con renuncia expresa a excusión y división** (arts. 1590 + 1584.d), con monto tope en USD del plan, firmada digitalmente. Evitar fianzas abiertas ("todas las obligaciones futuras"): la fianza se interpreta restrictivamente y en consumo es todavía más frágil.

### 2.2 El fiador también es "consumidor": límites de la Ley 24.240

- **Jurisprudencia:** la Cámara Nacional de Apelaciones en lo Comercial (Sala C) juzgó a fiadores que respondían por pagos en contrato de garantía **bajo la Ley de Defensa del Consumidor** ("Garantizar S.G.R. c/ Szymanski"). Regla práctica: tratar al fiador como consumidor protegido, no como garante profesional.
- **Art. 37 LDC (cláusulas abusivas):** son no convenidas las cláusulas que restrinjan derechos del consumidor o amplíen los del proveedor; interpretación a favor del más débil. ⇒ Mandato corto, en lenguaje claro, con el tope en cifras ("responde hasta USDC X + punitorios Y"), sin prórrogas automáticas de la fianza a planes futuros (cada plan = fianza nueva o reconfirmación expresa).
- **Art. 34 LDC (revocación):** las aceptaciones de ofertas celebradas *fuera del establecimiento* (online) son revocables **dentro de los 10 días hábiles** sin responsabilidad. ⇒ Si el fiador firma online, contemplar el período de revocación (el plan no debería desembolsarse antes de que venza, o asumir ese hueco).
- **Deber de información (art. 4 LDC):** información clara y gratuita sobre condiciones — pantalla propia para el fiador, no un checkbox dentro del flujo del estudiante.

### 2.3 Precedentes argentinos de "garante" y de "cobro a tarjeta"

| Precedente | Qué hace | Lección |
|---|---|---|
| **GOcuotas** (Córdoba, BNPL con débito) | En sus T&C: el cliente queda obligado "mediante **órdenes de pago contra su tarjeta de débito**"; la primera cuota se cobra en la compra; el crédito se origina en el comercio y GOcuotas lo adquiere por **subrogación legal** (art. 915 inc. c CCyC); mora = multa fija por mes (no intereses); a los 31 días informa al BCRA; el comercio cobra a 22 días hábiles y el riesgo es de GOcuotas | Es el precedente directo de "cobros posteriores a una tarjeta guardada" en consumo argentino — pero contra el **deudor**, no contra un tercero |
| **Emisores de tarjetas** (Tarjeta DATA, Cencosud, Prestamas) | Sus contratos publicados exigen que el eventual garante firme como **"codeudor liso, llano y principal pagador"** de todas las obligaciones del titular | La figura "fiador principal pagador" ya circula en contratos de consumo masivos; también el Cencosud prevé exigir "garantía personal de un tercero" si hay mora |
| **Garantías de alquiler digitales** (Hoggax, Finaer, Monclair) | Fianza *empresarial* 100% online: la empresa se constituye fiador (subsidiario) del inquilino, firma digital (Hoggax cita art. 288 CCyC), análisis de ingresos, co-solicitantes si no alcanza; Monclair cobra ~7,6% del contrato | Prueba que el **onboarding digital del fiador con firma electrónica es aceptado y litigable** en Argentina |
| **Alternativa Rent** (alquiler amoblado CABA) | Acepta "tarjeta de crédito internacional activa **como respaldo**" para inquilinos que cobran en el exterior | Único caso encontrado en AR donde **la tarjeta misma es la garantía** — el modelo más cercano al nuestro |
| **Cajas previsionales** (ej. Caja Psicólogos PBA) | Exigen codeudor + "Declaración jurada de adhesión al pago (débito automático o **débito por VISA crédito**)" | Precedente de mandato de cobro a tarjeta de terceros en crédito institucional |
| Ley de Alquileres CABA (vía garantia.com.ar, **SIN VERIFICAR** la norma exacta — Ley 5851) | El locador no puede pedir garantía >5× el alquiler mensual (10× si es garantía personal) | Patrón regulatorio: topar la garantía es la práctica esperable en consumo |

**Conclusión legal:** el diseño es viable y tiene precedentes. Lo que hay que hacer bien: fianza solidaria *escrita* con **tope**, renuncia a excusión, firma digital, información al fiador como consumidor, y asumir que el cargo a tarjeta puede ser desconocido/revertido — la acción contra el fiador queda en pie igual.

---

## 3. Comercios online: cómo entra un medio de pago nuevo

### 3.1 Tiendanube (el canal natural: 180.000+ tiendas en LatAm)

**Camino oficial — Payment Provider App:**

1. Cuenta en el Partner Portal → crear app categoría **Payments** → **pedir a partners@tiendanube.com que habilite las Payments APIs** para la app (requisito explícito de la doc).
2. Implementar: flujo OAuth de instalación, REST API (recursos Payment Provider + Transaction), webhooks, y un archivo JS propio servido en CDN con los handlers del checkout (`checkout_js_url`).
3. Dos tipos de integración por opción de pago: **redirect** (el comprador va a nuestro checkout) o **transparent** (sin salir del checkout de la tienda); tipos soportados incluyen `credit_card`, `debit_card`, `wallet`, `other`, `wire_transfer`.
4. **Auditoría de Nuvemshop** (implementación, escalabilidad, estabilidad, calidad) → liberación. Para la categoría payments además exigen: acuerdo de colaboración, **revenue share**, soporte comercial en idioma local y nivel mínimo de reviews. **Plazo no publicado — SIN VERIFICAR; asumir semanas, no días.**

[tiendanube.github.io/api-documentation — payment-provider, payment-option; dev.nuvemshop.com.br/es/docs/homologation/publication; tiendanube.com/socios/tecnologicos]

**Camino corto — Medio de pago personalizado (viable hoy):** desde el plan Esencial, el comercio activa "Personalizado" (opciones renombrables: Transferencia/Efectivo/"A convenir"), pone nombre propio ("Cuotas en USDC — SinTarjeta") e instrucciones que derivan a nuestro checkout/QR. **Sin aprobación, sin app, sin fee de terceros**; la confirmación de la orden es manual. Ideal para pilotear con comercios reales. [ayuda.tiendanube.com — medio de pago personalizado]

**Cripto en Tiendanube hoy:** la propia ayuda oficial recomienda **Talo Pay** para cripto: cobra en **USDC, USDT, DAI** (+ transferencias con CVU único por orden y Pix), comisión ~0,8-1% según su blog, liquidación instantánea. **GOcuotas ya es una app de la tienda de apps de Tiendanube** (cuotas con débito con verificación SMS) → demuestra que un medio de pago nuevo con scoring propio puede entrar como app. [ayuda.tiendanube.com — criptomonedas/pix; docs.talo.com.ar/ecommerce/tiendanube; ayuda.tiendanube.com — GOcuotas]

Ojo: el plugin oficial de Mercado Pago para Tiendanube **no tiene ambiente de pruebas** — las validaciones se hacen en producción con pagos reales (docs MP).

### 3.2 WooCommerce

Plugin propio con la clase `WC_Payment_Gateway` (estándar WordPress), **sin proceso de aprobación** porque la tienda es self-hosted. Precedentes directos: **GOcuotas tiene plugin WooCommerce** (también para Tiendanube, Magento, VTEX, Shopify, PrestaShop) y Mobbex publica plugin de suscripciones para WooCommerce. Es el camino de menor fricción técnica para un medio de pago nuevo, aunque la base instalada en PyME argentina es menor que la de Tiendanube. [ayuda.gocuotas.com — integraciones web; mobbex.com]

### 3.3 Shopify en Argentina

- **Shopify Payments no opera en Argentina** → toda tienda AR usa proveedores externos, y Shopify cobra fee extra sobre ventas por procesador externo (~2% Basic / 1% Shopify / 0,5% Advanced-Plus, fuente secundaria Talo).
- Para aparecer como método de pago en el checkout hay que ser **payments partner aprobado** (más restrictivo que TN). Curiosidad: **"Solana Pay" figura en la lista pública de proveedores de shopify.com/ar**, igual que OpenNode — dato útil para el pitch.
- Talo también tiene integración Shopify (extensión de checkout): transferencias, crypto, Pix.
- Veredicto: canal posterior al MVP, no inicial.

[shopify.com/ar/aceptar-pagos-en-linea; talo.com.ar/blogs/integrar-talo-shopify]

### 3.4 Recomendación de canal

**MVP:** tienda propia del equipo en Tiendanube (plan Esencial, ~2 semanas de trial/plan bajo) con medio de pago personalizado "Cuotas USDC" → instrucciones al checkout dApp. Alternativa igual de válida: WooCommerce propio con plugin simple.
**Piloto real:** medio personalizado + convenio manual con 1-2 comercios amigos (ellos instalan nada; confirman órdenes por WhatsApp).
**Roadmap creíble para el pitch:** app de Payment Provider (GoCuotas/Talo ya lo hicieron → el camino existe), o liquidación al comercio vía Talo (USDC→ARS).

---

## 4. Qué compra un estudiante y a qué precio (calibración de topes)

Tipo de cambio usado: MEP $1.549,26 al 02/10/2026 (ver research/a).

| Producto | Precio ARS (fecha de la fuente) | ≈ USD |
|---|---|---|
| Celular básico (Moto G06 64 GB, precio s/imp. nac. motorola.com.ar) | $157.023 (s/imp.) → ~$190.000 c/IVA | **~120** |
| Celular gama media (Moto G56 $459.999; Moto G77 $649.999; Galaxy A56 $657.489) | $460.000–657.000 (ago-sep 2026) | **300–425** |
| Celular gama media-alta (Galaxy A37 $949.999; Edge 70 Fusion $849.999; A26 $799.999) | $800.000–950.000 (22/9/2026) | **515–615** |
| Bicicleta MTB R29 (Venzo Loki $491.952–627.137; Skyline $711.620; Raptor $987.700) | $492.000–988.000 (tiendabike/martinbike/fusionbikes, 3/10) | **320–640** |
| Curso/carrera online (Coderhouse React $453.453; Full Stack $943.693, precio final c/35% OFF) | $453.000–944.000 (3/10) | **290–610** |
| Bootcamp intensivo (rango mercado: Henry/Coderhouse/Acámica) | $1,5M–5M (abr-2026, fuente secundaria) | **970–3.230** |
| Notebook entrada (Exo/Enova/Gfast 14-15") | $299.999–379.999 (Frávega, 3/10) | **195–245** |
| Notebook media (Lenovo Ideapad 1/Slim3, HP Ryzen 3, ASUS Vivobook Go) | $570.000–1.200.000 (Frávega/Musimundo, 3/10) | **370–775** |
| Notebook alta/gamer (Acer Nitro, Lenovo LOQ, ASUS TUF) | $1,65M–2,5M+ (Frávega/Musimundo, 3/10) | **1.065–1.615** |
| **Ticket promedio e-commerce Argentina (CACE, H1-2026)** | **$107.597** | **~69** |

**Contexto de consumo (CACE Mid-Term 2026, Kantar para CACE, ago-2026):** e-commerce H1-2026 $19,5 billones (+28% i.a.), 181,5 M órdenes; **3 de cada 4 operaciones se pagan en cuotas** (1 cuota 27%, 3 cuotas 23%, 6 cuotas 26%, 7-12 cuotas 19%); tarjeta de crédito cayó de 56%→46% de los pagos; 6 de cada 10 empresas ofrecen cuotas (76% hasta 6 pagos). Rubros top por facturación: alimentos, línea blanca, herramientas, accesorios vehículos. **No hay desglose público por edad para bienes durables — SIN VERIFICAR**; lo específico de jóvenes (Kantar/Worldpanel) mide consumo masivo de hogares <35 años, no aplicable directo.

**Calibración propuesta:**

- **Escalón 0 (USD 100-150):** curso, celular básico, insumos → ticket cercano al promedio nacional, mora tolerable en pesos.
- **Escalón con fiador (USD 300-500):** celular gama media, bici, curso → justifica pedir garantía, el monto alcanza para lo que el equipo describió ("la tarjeta de los padres").
- **Escalón avanzado (USD 700-1.000+):** notebook media — el ítem que más "vende" el producto pero el de mayor exposición; coherente con escalón alto + historial.

---

## 5. Recomendación concreta para el MVP

### Qué mostrar REAL en la demo

1. **Tienda Tiendanube real del equipo** (o WooCommerce propio) con un producto real (p. ej. "Curso de robótica USD 120") y medio de pago personalizado "Cuotas USDC — SinTarjeta" → la instrucción lleva al checkout dApp.
2. **Compra end-to-end onchain:** orden real en TN → anticipo 50% pagado con Phantom en devnet (USDC-devnet) → el comercio ve el pago al instante (mostrar balance ATA del comercio) → plan registrado onchain (escalón, cuotas, delegate).
3. **Fiador real en el onboarding:** pantalla propia donde el "familiar" firma digitalmente el mandato/fianza solidaria (PDF generado con tope en USD) y registra su tarjeta **en modo test real** contra un procesador:
   - Opción A (más simple): **Mobbex suscripción manual** en cuenta de pruebas — la tarjeta queda tokenizada y cada cargo es on-demand (exactamente nuestro modelo).
   - Opción B: **MP Pagos Automáticos** con ZDA/primer pago CIT en sandbox.
   - Mostrar en la app: "Fiador vinculado • Visa •••• 4242 • tope USDC 130 • mandato firmado ✔".
4. **Default del estudiante simulado** (saltar la cuota o forzar `default` en el programa) → el backend dispara el **cargo MIT real en modo test** al fiador → mostrar el recibo/webhook del procesador + la baja de escalón onchain.

### Qué queda SIMULADO (y cómo declararlo)

- El **cobro productivo** al fiador (con tarjeta real y plata de verdad): requiere comercio con CUIT en el procesador y tarjeta real; en demo se corre en sandbox. Declarar: *"el rail de cobro al fiador es estándar (Mobbex/MP/Payway) — GOcuotas ya cobra cuotas así en producción; nosotros cobramos al garante, no al deudor"*.
- La **liquidación al comercio en USDC→ARS** (roadmap: Talo/Ripio off-ramp; en demo el comercio recibe USDC-devnet).
- KYC Didit del fiador (puede mostrarse real si ya está integrado para el estudiante; costo $0 dentro del free tier).

### Frase para el jurado

> "El fiador no es un feature nuevo inventado por nosotros: los alquileres ya usan fiadores digitales (Hoggax, Finaer), las tarjetas ya exigen codeudores (Tarjeta DATA), y cobrar a una tarjeta guardada es lo que GOcuotas hace hoy en producción en Argentina. Nosotros combinamos las tres piezas y las anclamos a reputación onchain que el estudiante se lleva consigo."

---

## Fuentes

**Procesadores / tarjeta guardada:**
1. Mercado Pago Developers — Pagos Automáticos (CIT/MIT, Card-on-File, ZDA): https://www.mercadopago.com.ar/developers/es/docs/automatic-payments/recurring-charges — consultado 03/10/2026
2. Mercado Pago Developers — Overview Pagos Automáticos (crédito y débito; preaprobación solo vía Checkout API/Bricks): https://www.mercadopago.com.ar/developers/es/docs/automatic-payments/overview — consultado 03/10/2026
3. Mercado Pago Developers — Suscripciones y Planes de suscripción (link sin código, reintentos): https://www.mercadopago.com.ar/developers/es/docs/subscriptions/overview y /subscription-plans/overview — consultado 03/10/2026
4. Mobbex — Planes (1,9%+IVA débito; 3,9%+IVA suscripciones): https://www.mobbex.com/planes/ — consultado 03/10/2026
5. Mobbex — Suscripciones (tarjetas tokenizadas, suscripciones manuales bajo demanda, DEBIN CBU/CVU, validación DNI): https://www.mobbex.com/suscripciones/ — consultado 03/10/2026
6. Payway — Débito automático (lotes TXT semanales, token USD 0,03, +0,066% no tokenizado): https://ayuda.payway.com.ar/cobros/medios-de-pago/debito-automatico — consultado 03/10/2026
7. Payway — Mandatorio tokenización Visa (+0,05% por no tokenizar): https://ayuda.payway.com.ar/novedades/mandatorio-tokeniza-tus-transacciones — consultado 03/10/2026
8. dLocal — Merchant Initiated Transactions (stored_credential_type, network_tx_reference, Mastercard TLID 23/10/2026): https://docs.dlocal.com/docs/merchant-initiated-transactions — consultado 03/10/2026
9. dLocal — Argentina (recurring=Yes en todas las tarjetas) y Network tokens: https://docs.dlocal.com/docs/argentina, https://docs.dlocal.com/docs/card-network-tokens — consultado 03/10/2026
10. Rebill — Precios Argentina (4% tarjetas, 1,6% QR) y suscripciones (tokenización, Smart Retries): https://www.rebill.com/precios/argentina, https://www.rebill.com/cobrar-suscripciones-y-pagos-recurrentes — consultado 03/10/2026
11. Stripe — Países disponibles (Argentina no figura): https://www.stripe.com/es/global — consultado 03/10/2026; constitución Stripe Payments Argentina S.A. (Boletín Oficial, escritura 3/3/2020): https://www.boletinoficial.gob.ar/pdf/linkQR/VVBkSXRhQ0hJQWgreFpJZ1U0d1UwZz09; guía secundaria: https://cristiantait.com/blog/vender-online-argentina-mercadopago-stripe-afip (2026)

**Contracargos / débitos automáticos:**
12. Ley 25.065 art. 26 (impugnación 30 días): https://servicios.infoleg.gob.ar/infolegInternet/anexos/55000-59999/55556/norma.htm; https://www.defensoriasantafe.gob.ar/articulos/como-desconocer-una-compra-con-tarjeta-de-credito; https://www.cronista.com/finanzas-mercados/como-desconocer-una-compra-con-tarjeta-de-credito-y-en-que-casos-te-devuelven-la-plata/
13. BCRA — Débito directo (baja unilateral, stop debit, reversión 30 días/72 h): https://www.bcra.gob.ar/debito-directo/; https://www.bcra.gob.ar/noticias/opciones-para-dar-de-baja-o-gestionar-los-debitos-automaticos-en-cuentas-bancarias/; Com. A 6909: https://www.bcra.gob.ar/archivos/pdfs/comytexord/A6909.pdf

**Fianza / consumo:**
14. CCyC arts. 1574, 1575, 1579, 1583, 1584, 1587-1591 (fianza): https://leyes-ar.com/codigo_civil_y_comercial/1574.htm y ss.; texto ordenado Infoleg: https://servicios.infoleg.gob.ar/infolegInternet/anexos/105000-109999/109481/texactley340_libroII_S3_tituloX.htm
15. Jurisprudencia: art. 1591 "principal pagador = deudor solidario" (Unicred c/ Sansuste, CNCom): https://www.infojudicial.com.ar/areas/jurisprudencia/jurisprudencia-2020/principal-pagador-art-1591-del-ccycn/135256/; fiadores bajo LDC (Garantizar SGR c/ Szymanski, Sala C CNCom): https://abogados.com.ar/index.php/consideran-que-la-situacion-de-los-fiadores-que-deben-responder-por-la-falta-de-pago-de-los-documentos-objeto-del-contrato-de-garantia-reciproca-debe-ser-juzgada-bajo-la-ley-de-defensa-del-consumidor/24485
16. Ley 24.240 arts. 37 (cláusulas abusivas) y 34 (revocación): https://servicios.infoleg.gob.ar/infolegInternet/anexos/0-4999/638/norma.htm
17. Contratos con garante publicados: Tarjeta DATA (garante "codeudor liso, llano y principal pagador"): https://www.tarjetadata.com.ar/wp-content/uploads/2026/08/Contrato-DATA-VISA-15.04.2026-incluyendo-click-to-pay-002.pdf; Tarjeta Cencosud (emisor puede exigir garantía personal de un tercero): https://comunicaciones.tarjetacencosud.com.ar/2024/Contratos/tarjetacencosud/contrato.pdf

**Precedentes de producto:**
18. GOcuotas — T&C usuarios (órdenes de pago contra tarjeta de débito, subrogación art. 915.c, multa fija): https://www.gocuotas.com/terms; comercio cobra a 22 días hábiles: https://spf.gocuotas.com/comercios; reporte BCRA a 31 días (secundaria): https://findoctor.com.ar/gocuotas/ — consultado 03/10/2026
19. Wibond — PSP BCRA 33.551 y PNFC 55386: https://www.wibond.co/ — consultado 03/10/2026
20. Hoggax (fianza digital, firma digital art. 288): https://hoggax.com/blog/preguntas_frecuentes/; Finaer (fiador subsidiario, co-solicitantes): https://www.finaersa.com.ar/terminos; Monclair (7,6% del contrato): https://www.monclair.com.ar/garantia-de-alquiler — consultado 03/10/2026
21. Alternativa Rent (tarjeta de crédito activa como respaldo): https://www.alternativarent.com/alquiler-sin-garantia-buenos-aires — consultado 03/10/2026
22. Caja Psicólogos PBA (codeudor + débito por VISA crédito): https://www.cajapsipba.org.ar/prestamo-con-codeudor-j.asp — consultado 03/10/2026
23. Reglas de garantías en alquiler CABA (secundaria): https://garantia.com.ar/propietaria/ — consultado 03/10/2026 — norma exacta **SIN VERIFICAR**

**E-commerce / distribución:**
24. Nuvemshop/Tiendanube API — Payment Provider (flujo, auditoría, JS checkout): https://tiendanube.github.io/api-documentation/guides/payment-provider; Payment Option (redirect/transparent, tipos): https://tiendanube.github.io/api-documentation/resources/payment-option — consultado 03/10/2026
25. Guía de publicación de apps: https://dev.nuvemshop.com.br/es/docs/homologation/publication; programa de partners (revenue share en payments, soporte): https://www.tiendanube.com/socios/tecnologicos — consultado 03/10/2026
26. Tiendanube — Medio de pago personalizado (desde plan Esencial): https://ayuda.tiendanube.com/122925-medio-de-pago-personalizado/como-configurar-un-medio-de-pago-personalizado — consultado 03/10/2026
27. Tiendanube — Cripto vía Talo Pay (USDC/USDT/DAI): https://ayuda.tiendanube.com/es_AR/medios-de-pago/como-recibir-pagos-con-criptomonedas-o-pix-en-tiendanube; https://docs.talo.com.ar/ecommerce/tiendanube/integration_official — consultado 03/10/2026
28. GOcuotas en Tiendanube (app de cuotas con débito): https://ayuda.tiendanube.com/es_AR/pagos/como-configurar-el-medio-de-pago-gocuotas; plugins multiplataforma: https://ayuda.gocuotas.com/es/articles/10087251-integraciones-web — consultado 03/10/2026
29. Shopify AR (Payments no disponible; fee extra 0,5-2% — secundaria Talo; lista de proveedores incluye Solana Pay y OpenNode): https://www.shopify.com/ar/aceptar-pagos-en-linea; https://talo.com.ar/blogs/integrar-talo-shopify — consultado 03/10/2026
30. Mercado Pago plugin Tiendanube sin entorno de pruebas: https://www.mercadopago.com.ar/developers/es/docs/tiendanube/payment-configuration/checkout-api — consultado 03/10/2026

**Productos y precios:**
31. CACE — Estudio Mid-Term 2026 (facturación $19,5 B; ticket $107.597; cuotas: 27/23/26/19/6%; TC 46%): https://cace.org.ar/pages/estadisticas, https://cace.org.ar/blogs/news/el-comercio-electronico-registro-un-incremento-del-28-en-su-facturacion-durante-el-primer-semestre-del-ano (20/8/2026); TN 23/8/2026: https://tn.com.ar/economia/2026/08/23/las-cuotas-ganan-terreno-en-el-comercio-electronico-y-cada-vez-mas-empresas-ofrecen-financiacion-los-productos-mas-buscados/
32. Notebooks Frávega (3/10/2026): https://www.fravega.com/l/informatica/notebooks/; Musimundo: https://www.musimundo.com/informatica/notebook/c/98
33. Celulares: blogdecelulares.com.ar relevamiento 22/9/2026: https://www.blogdecelulares.com.ar/general-celulares/samsung-o-motorola-cual-conviene-comprar-en-argentina-en-2026.html; mejorescompras.com.ar 3/8/2026; motorola.com.ar (Moto G06 $157.023 s/imp.): https://www.motorola.com.ar/moto-g06-64gb-nfc/p
34. Bicicletas: https://www.tiendabike.com.ar/ (Venzo Skyline $711.620, Loki $627.137, Raptor $987.700); https://www.martinbike.com.ar/ (Loki $491.952); https://fusionbikes.com.ar/ — consultado 03/10/2026
35. Cursos: https://www.coderhouse.com/ar/carreras (Full Stack $943.693; React $453.453, consultado 03/10/2026); rango bootcamps (secundaria, abr-2026): https://cuantomecuesta.com/ar/curso-bootcamp/
