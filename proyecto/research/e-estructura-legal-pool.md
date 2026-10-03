# E — Estructura legal del pool fuera de Argentina y alternativas de fondeo

Sesión del 2026-10-03. Pregunta: cómo estructurar legalmente el pool de capital en USDC que adelanta el dinero al comercio ("web3 afuera", como propuso el equipo en `02-validacion.md`), qué paredes regulatorias argentinas sigue tocando aunque la entidad esté afuera, y qué alternativas de fondeo existen para el MVP y para una etapa regulada. Cada dato lleva fuente y fecha; lo no confirmado está marcado **SIN VERIFICAR**.

## Resumen ejecutivo

- **"Pool afuera" no elimina la regulación local, elimina la mitad del problema:** quien origina/administra crédito a consumidores argentinos sigue siendo "proveedor no financiero de crédito" (registro BCRA), custodiar cripto de clientes sigue exigiendo PSAV en la CNV, y el art. 19 de la Ley 21.526 prohíbe **ofrecer el pool al público argentino** aunque la entidad sea extranjera. Lo que sí resuelve el afuera: el lado del *inversor* — un LP de cualquier otra jurisdicción puede aportar a un vehículo extranjero que fondea receivables argentinas.
- **La arquitectura de referencia ya existe y corrió en Solana: Credix Finance** (2023): fintech local origina los créditos en moneda local → los pignora a un *bankruptcy-remote trust* → el trust emite una nota privada que se liquida en USDC → solo *accredited investors* depositan en el pool (Solana Foundation y Keyrock fueron LPs, ~11% APY). Combinada con el precedente local de GOcuotas (el crédito lo origina el **comercio** por venta en cuotas y se descuenta por **subrogación art. 915 inc. c CCyC**), da la estructura más limpia: **origen comercial + cesión a un vehículo + fondeo externo de inversores calificados**. Estado actual de credix.finance: **SIN VERIFICAR** (un protocolo DeFi homónimo en la cadena Sonic sufrió un exploit de USD 4,5 M y desapareció en ago-2025; no confirmado si es la misma empresa).
- **Existe una vía regulada doméstica para el mismo producto: el fideicomiso financiero** (Ley 24.441 + Normas CNV). MercadoLibre tituliza su cartera Mercado Crédito así — series autorizadas por CNV sobre "créditos de consumo" en pesos con certificados de participación y títulos de deuda — y Cencosud lo mismo con sus cuotas. Para captar solo de **inversores calificados**, la RG 1016/2024 (art. 82 Ley 26.831) habilita oferta privada (reuniones/invitaciones de hasta ~50 inversores). Es la respuesta "seria" al jurado: el instrumento legal para pool de inversores en crédito de consumo **ya existe en Argentina** — cuesta fiduciario, prospecto y tiempo (meses), y hoy opera solo en pesos.
- **Para la hackathon no hace falta ningún inversor externo:** las alternativas legales inmediatas son (a) **tesorería del equipo/sponsor** (no hay intermediación: son fondos propios); (b) **fondeo del propio comercio** — el comercio cobra su venta a 30-60 días en vez de al instante (GOcuotas paga al comercio recién a 22 días hábiles: el "cobro al instante" puede ser una opción con comisión mayor, no la única); (c) **descuento de cuentas por cobrar con capital propio** (modelo GOcuotas, PNFC); (d) **rendimiento del pool ocioso** en Kamino/Jupiter Lend (~4-5% APY sobre USDC) para reducir el costo de capital; (e) **grants** (Solana Foundation fue LP en el pool de Credix — precedente directo de fondeo por sponsor ecosistémico).
- **Recomendación MVP:** declarar en la demo "pool = tesorería del equipo, USDC-devnet" (legalmente impecable: ninguna captación); el crédito se origina como **venta en cuotas del comercio** cedida a la plataforma (subrogación 915.c, modelo GOcuotas, no préstamo al consumidor); y presentar como roadmap dos vías explícitas — offshore tipo Credix para LPs no argentinos, y fideicomiso financiero/oferta privada a inversores calificados para capital local regulado — ambas **sin ofrecer el pool a inversores argentinos no calificados** (art. 19). Decirlo así convierte la mayor objeción del jurado en un punto fuerte.

---

## 1. Qué resuelve y qué no resuelve el "pool afuera"

### Paredes que la estructura offshore NO evita (ya documentadas en `research/b`, aquí con foco en el lado del capital)

| Regla | Qué prohíbe/exige | Efecto sobre el pool offshore |
|---|---|---|
| **Ley 21.526 art. 19** | Toda publicidad o acción tendiente a **captar recursos del público** en Argentina por no autorizados; acción penal querellante | El LP pool **no se puede ofrecer a inversores argentinos** ni publicitar en el país — aunque la entidad sea de BVI y el LP pague en USDC desde Belo |
| **Ley 21.526 arts. 1 y 7** | "Intermediación habitual entre oferta y demanda de recursos financieros" exige autorización BCRA | Un vehículo que junta plata de muchos para prestarla a muchos es intermediación *donde opere*; si el originador/gestor está en Argentina, el riesgo legal se concentra en la entidad local |
| **Texto ordenado PNFC (BCRA)** | Registro obligatorio para jurídicas que ofrecen crédito al público habitualmente (umbral ~$10 M de financiaciones, sujeto a verificación del TO vigente); informar deudores a la Central | El **originador/servicer argentino** del crédito al consumidor debe registrarse — el capital puede ser extranjero, la originación no |
| **RG CNV 994/2024 + 1058/2025 (PSAV)** | Inscripción antes de operar para quien custodia/administra activos virtuales de terceros | Si la plataforma custodia el USDC del pool o de las cuotas para usuarios argentinos → registro PSAV; el patrón local es exactamente este (Ripio opera como "OTC Investment Solutions SA, PSAV CNV N° 37, 5/6/2024") |
| **Ley 26.831 art. 2 + RG 1016/2024** | Oferta pública de valores negociables requiere autorización CNV; la RG reglamenta cuándo una oferta es **privada** (puertos seguros: reuniones de hasta 50 inversores, invitaciones a máx. 50 potenciales) | Los "certificados/notas" del pool emitidos a inversores en Argentina son presumiblemente valores negociables → solo por **oferta privada** y preferentemente a calificados |
| **Com. A 6401 (relevamiento de activos/pasivos externos)** | Residentes deben declarar deudas con no residentes; los endeudamientos financieros del exterior desembolsados desde 1/9/2019 deben ingresarse y liquidarse por el MULC para acceder luego a pagar servicios | Si el acreedor final de las cuotas es un vehículo extranjero, técnicamente cada estudiante tendría "endeudamiento con el exterior" — **personas humanas están eximidas de declarar en la A 6401 (Com. A 6594)**; los pagos en USDC no transitan el MULC. Tratamiento integral: **zona gris, SIN VERIFICAR** — consultar cambiario antes de producción |

### Lo que el afuera SÍ resuelve

- El LP que vive fuera de Argentina aporta a un vehículo extranjero: no hay captación local ni intermediación local (la intermediación existe, pero en la jurisdicción del vehículo).
- Separa riesgos: la entidad de origen/servicio argentina queda como proveedor técnico; el fondeo es un contrato entre dos no-residentes (vehículo + LP extranjero).
- Es el patrón estándar de la industria cripto: **fundación/holding offshore para el protocolo + "labs"/operadora local que escribe software y da servicio** — la literatura de práctica lo describe como estructura dominante (Cayman Foundation + BVI company para emisión/governance; la "labs" onshore desarrolla y opera). [blog.daospv.com; legalnodes.com; montague.law — fuentes de práctica, no normativas]

---

## 2. La estructura de referencia: Credix Finance (Solana, 2023) — y cómo se ensambla con GOcuotas

**Credix** operaba pools de private credit en USDC sobre Solana para financiar receivables latinoamericanas. Estructura publicada (pool para agricultores colombianos, jul-2023):

1. Una fintech local (Clave/Liquitech) **origina los préstamos en moneda local** (pesos colombianos).
2. Las receivables se **pignoran a un bankruptcy-remote master trust**, que emite una *private note* (típicamente registrada en clearing tipo DTC).
3. La nota se adquiere y **liquida a través de la plataforma Credix en USDC**.
4. **Solo "accredited investors"** depositan USDC en el pool; rendimiento ~11% anual; ventanas de liquidez de 45 días; la cartera asegurada por CESCE (agencia de crédito a la exportación española).
5. **LPs inaugurales: Solana Foundation y Keyrock** — precedente de "sponsor ecosistémico fondea el pool".

[CoinDesk 26/7/2023; post oficial Medium Credix 26/7/2023]

**La pieza argentina que falta ya la probó GOcuotas:** en sus T&C el crédito **lo origina el comercio** (venta en cuotas = financiación del comercio al consumidor, no préstamo), y la plataforma adquiere ese crédito por **subrogación legal de pleno derecho (art. 915 inc. c CCyC)** mediante "Descuento de Cuentas por Cobrar". Es decir: ni siquiera hace falta un prestamista local — hace falta un **comprador de receivables** (que igual es "financiación habitual" → PNFC).

**Arquitectura compuesta para nuestro producto (roadmap, no MVP):**

```
Comercio AR ── vende en cuotas al estudiante (crédito comercial del comercio)
      │ cesión/subrogación 915.c (Descuento de Cuentas por Cobrar)
      ▼
Entidad originadora/servicer (AR, PNFC + PSAV si custodia) ── administra cobros, escalones, KYC
      │ vende/pignora paquetes de receivables
      ▼
Vehículo offshore (trust/SPV tipo Credix, o HoldCo BVI/Panamá/Cayman)
      │ emite nota privada liquidada en USDC
      ▼
LPs: SOLO no argentinos (o inversores calificados por oferta privada en AR)
```

Tres consecuencias de diseño:

- **El estudiante no pide un préstamo al pool:** compra a crédito al comercio. La cadena de "intermediación financiera" queda entre el vehículo y sus LPs, no entre el consumidor y nadie.
- **Los LPs nunca son "el público argentino":** la nota se ofrece offshore a acreditados/extranjeros; en Argentina solo podría moverse por oferta privada RG 1016 (50 inversores por ronda, calificados). Esto responde directamente la objeción del art. 19.
- **Cada pieza tiene un precedente con nombre:** Credix (Solana, receivables→USDC→acreditados), GOcuotas (comercio origina + descuento + subrogación), MercadoLibre (FF sobre créditos de consumo), Ripio (PSAV local como fachada de compliance).

**Advertencia para el pitch:** un protocolo DeFi llamado "CrediX" (en la cadena Sonic) sufrió un exploit de ~USD 4,5 M por wallet admin comprometida en ago-2025 y el equipo desapareció — sospecha de exit scam (CoinDesk/TheBlock, 8/8/2025). **SIN VERIFICAR** si está relacionado con credix.finance de Solana; en todo caso es el ejemplo perfecto de por qué el pool debe tener fondos segregados, multisig y sin bridge permissions.

---

## 3. Vehículos para el pool: comparación

| Vehículo | Moneda | Captación posible | Regulación | Costo/plazo | Estado para el proyecto |
|---|---|---|---|---|---|
| **Fondos propios / sponsor** (tesorería) | Cualquiera (USDC) | No hay terceros → **no hay captación** | Ninguna específica del pool; originador sigue PNFC | Inmediato | **MVP** |
| **Pool del comercio** (el comercio fondea su propio descuento) | USDC/ARS | No hay inversores externos | Ninguna; el comercio solo cobra más tarde | Inmediato | **MVP** — opción "cobrás en 30 días, 0% comisión" |
| **Descuento de cuentas por cobrar con capital propio** (modelo GOcuotas) | Cualquiera | No hay captación | PNFC para el comprador habitual de receivables | Registro BCRA, semanas | Piloto regulado |
| **PSCPP** (Com. A 7406) | **Solo pesos** | Sí, marketplace regulado | Registro BCRA; plataforma no puede asumir riesgo ni garantizar repago | Meses | No sirve (USDC fuera) |
| **Fideicomiso financiero — oferta pública** (Ley 24.441 + Normas CNV; RG 992/2024) | Pesos (precedentes en $; USDC sin precedente) | Sí, al público con prospecto | Autorización CNV, fiduciario financiero/registrado, trustee, auditor | Caro, meses-años | Roadmap serio; es lo que hace MercadoLibre con Mercado Crédito (programas autorizados por CNV, activos "créditos de consumo") |
| **Fideicomiso financiero / nota privada — oferta privada a inversores calificados** (RG 1016/2024, art. 82 LMC; inversor calificado persona: inversiones ≥ UVA 350.000) | Pesos (USDC **SIN VERIFICAR**) | Hasta ~50 inversores por ronda, sin publicidad | Régimen de oferta privada CNV; sin prospecto de oferta pública | Mediano | Primera captación real viable en AR |
| **Vehículo offshore** (BVI/Cayman/Panamá company o foundation; patrón "catamarán" de la industria: foundation + operating co) | USDC | Solo fuera de AR / a calificados vía oferta privada | Ley local del vehículo + en AR solo toca vía servicer | USD 1.500-10.000/año, 1-4 semanas (**SIN VERIFICAR** costos vigentes) | Roadmap |
| **PSAD El Salvador (CNAD)** | USDC/cripto con licencia regional | Servicios de activos digitales regulados | Registro CNAD; tasa inicial USD 5.475; requisitos art. 20 LEAD + AML | Semanas-meses | Opción de licencia cripto formal en LatAm |

---

## 4. Domicilio: dónde "poner" el afuera (benchmarks de la industria)

- **Estándar cripto:** *foundation* en Cayman para el protocolo/governance/tokens + company en BVI como emisora/operadora + "labs" onshore donde trabaja el equipo. Para un proyecto **sin token** (nuestro caso) alcanza una sola entidad: una company (BVI/Panamá/Costa Rica LLC) que sea titular del protocolo y contraparte de los LPs y del servicer argentino. [daospv.com; neolegal.ae; legalnodes.com — fuentes de práctica]
- **El Salvador (CNAD):** registro PSAD con tasa inicial **USD 5.475**; aplica a domiciliados y a quienes "promueven o comercializan activamente" servicios en El Salvador; otorga licencia cripto regional reconocida (varios exchanges latinoamericanos tienen PSAD/CNAD — **SIN VERIFICAR** nómina actual en el registro público cnad.gob.sv). Útil si se quiere una jurisdicción regulada en vez de un paraíso.
- **Argentina:** la presencia local mínima sería una SAS de servicios (originación, KYC, cobranza, soporte a comercios) registrada **PNFC** y, si custodia cripto de clientes, **PSAV**. Ripio muestra el patrón: la app opera bajo "OTC Investment Solutions SA", PSAV CNV N° 37.
- Lo que **no** resuelve ningún domicilio: cobrar a consumidores argentinos en mora requiere acción local — sea cual sea el acreedor final, conviene que el crédito "viva" cerca del deudor (la receivable argentina, administrada por la entidad argentina). Es lo que hace Credix: el originador/servicer es local; solo el fondeo es offshore.

---

## 5. Alternativas de fondeo (sin captar del público)

| Alternativa | Cómo funciona | Legalidad | Para cuándo |
|---|---|---|---|
| **Tesorería del equipo** | El pool lo fondean los fundadores | Cero captación; es capital propio — la forma más limpia | **MVP** |
| **Sponsor (Solana/ecosistema)** | Un sponsor deposita USDC como grant o LP único | Un solo aportante institucional, sin oferta pública; Solana Foundation fue LP de Credix | MVP/piloto — encaja con grants y con el accelerator de Colosseum |
| **Pool del comercio** | El comercio prefiere cobrar al instante → descuento %; o cobra en 30-60 días y la plataforma solo procesa (GOcuotas paga a 22 días hábiles) | No hay intermediación: el comercio financia su propia venta; la app cobra fee de procesamiento | MVP — permite "arrancar con pool chico o sin pool" |
| **Descuento de receivables propio** | La entidad (PNFC) compra con fondos propios las cuentas por cobrar del comercio | Modelo GOcuotas: subrogación 915.c, no préstamo | Piloto con 1-2 comercios |
| **Yield del pool ocioso** | USDC parqueado en Kamino Lend (~4-5% APY, TVL ~2,4 B) o Jupiter Lend (~4,9% APY) mientras no hay préstamos vivos | Depósito propio en protocolo DeFi; no requiere registro para tesorería propia (**SIN VERIFICAR** tratamiento PNFC sobre tesorería) | Siempre — baja el costo de capital y es un punto de pitch onchain |
| **Deuda del vehículo offshore** | Un inversor institucional presta a la HoldCo (nota privada) | Contrato bilateral, no captación del público | Crecimiento |
| **Inversores calificados por oferta privada** | ≤50 inversores calificados por ronda bajo RG 1016 | Legal en AR sin prospecto de oferta pública | Primera captación local |
| **FF titulizando la cartera** | Las receivables se ceden a un fideicomiso financiero autorizado | El vehículo regulado local por excelencia | Escala en pesos; en USDC sería novedoso |

---

## 6. Recomendación concreta para el MVP

**Lo que la demo declara (todo verdad, todo legal):**

1. "El pool es **tesorería del equipo**, fondeado en USDC-devnet. No hay captación: nadie pone plata excepto nosotros."
2. "El crédito **lo origina el comercio** como venta en cuotas; la plataforma lo adquiere por subrogación (art. 915 inc. c CCyC), el mismo mecanismo que GOcuotas usa en producción en Argentina."
3. "En producción, el originador/servicer sería una entidad argentina registrada **PNFC** (y **PSAV** si custodiamos cripto de clientes), igual que hacen Wibond y GOcuotas."
4. "El fondeo externo tiene **dos rutas que ya existen**: (a) vehículo offshore tipo Credix — originador local + trust + nota en USDC — solo para inversores no argentinos o acreditados; (b) fideicomiso financiero/oferta privada a **inversores calificados** en Argentina, el mismo instrumento con el que MercadoLibre tituliza Mercado Crédito."
5. "Lo que **nunca** hacemos: ofrecer el pool al público argentino — el art. 19 de la Ley 21.526 lo prohíbe expresamente."

**Frase para el jurado:**

> "No inventamos la estructura: GOcuotas ya compra cuentas por cobrar de consumo en Argentina, Credix ya fondeó receivables latinoamericanas en USDC sobre Solana con la Solana Foundation de LP, y MercadoLibre ya tituliza créditos de consumo con fideicomisos autorizados por la CNV. Nuestro MVP corre con tesorería propia en devnet; la versión regulada ensambla esas tres piezas probadas."

**Deuda técnica legal declarada (para no prometer de más):**
- Tratamiento cambiario y tributario de cuotas en USDC pagaderas a acreedor offshore: **SIN VERIFICAR** (relevamiento A 6401 exime a personas humanas; los pagos no transitan MULC — zona gris, consulta cambiaria antes de producción).
- Nómina de empresas argentinas registradas en CNAD El Salvador: **SIN VERIFICAR** en registro público.
- Costos vigentes de constitución offshore y tiempos del trámite PSAV/PNFC: **SIN VERIFICAR**.

---

## Fuentes

**Estructuras y precedentes on-chain:**
1. CoinDesk — Credix abre pool de private credit en Solana (Clave/Liquitech + bankruptcy-remote trust + nota en USDC + accredited investors; LPs: Solana Foundation, Keyrock; ~11% APY), 26/7/2023: https://www.coindesk.com/markets/2023/07/26/crypto-lender-credix-brings-opens-private-credit-pool-on-solana-with-11-yield
2. Medium/Credix — launch del pool de receivables aseguradas, 26/7/2023: https://medium.com/credix/credix-launches-the-first-of-its-kind-fully-insured-usdc-receivables-pool-with-clave-solana-29b50768225a
3. CoinDesk 8/8/2025 y The Block — exploit USD 4,5M y desaparición de "CrediX" (Sonic): https://www.coindesk.com/business/2025/08/08/credix-team-vanishes-after-usd4-5m-exploit-in-suspected-defi-exit-scam, https://www.theblock.co/post/366159/credix-team-vanishes-after-4-5-million-exploit-deletes-socials-and-takes-website-offline
4. GOcuotas — T&C (origen del crédito en el comercio + subrogación art. 915 inc. c CCyC + órdenes de pago a débito): https://www.gocuotas.com/terms, https://www.gocuotas.com/terms_comercio, https://spf.gocuotas.com/comercios — consultado 03/10/2026
5. Estructuras offshore estándar (fuentes de práctica): https://blog.daospv.com/crypto-catamaran-why-when-and-how-to-use-the-bvi-cayman-structure-for-token-issuance/, https://www.legalnodes.com/article/cayman-foundation-bvi-company-token-launches, https://montague.law/blog/foundation-dao-wrapper-high-growth-crypto-company-jurisdiction/, https://neolegal.ae/insights/offshore-token-issuance-bvi-cayman-marshall-panama

**Vehículos regulados argentinos:**
6. CNV — Fideicomisos financieros autorizados (Mercado Crédito XXIII/XLIII, activos "créditos de consumo", fiduciante MercadoLibre S.R.L.): https://www.cnv.gov.ar/SitioWeb/FideicomisosFinancieros/Fideicomiso?fideicomiso=88060 — consultado 03/10/2026
7. RG CNV 992/2024 — régimen de fideicomisos financieros (financiamiento PyMEs; oferta a inversores calificados exceptuada): https://www.consejosalta.org.ar/wp-content/uploads/Resolucion-General-992-CNV.pdf
8. RG CNV 1016/2024 — oferta privada de valores negociables (art. 82 Ley 26.831; puertos seguros; modif.: reuniones/invitaciones máx. 50 inversores): https://www.boletinoficial.gob.ar/detalleAviso/primera/283772/20230331?anexos=1, https://www.argentina.gob.ar/normativa/nacional/norma-419216/texto, análisis: https://www.estudio-ofarrell.com/resolucion-general-cnv-955-2023-oferta-privada-de-valores-negociables/
9. Definición de Inversor Calificado (incluye inversiones ≥ UVA 350.000): https://www.cnv.gov.ar/descargas/marcoregulatorio/blob/774621dc-3e80-46de-b6da-9b55c77a6940
10. Ley 27.440 art. 13 — plataformas de factoraje/descuento de Facturas de Crédito MiPyME no son "Mercados" si los compradores son bancos o PNFC; definición legal de PNFC: https://www.argentina.gob.ar/normativa/nacional/ley-27440-310084/texto
11. Ripio — PSAV CNV N° 37 (5/6/2024) como patrón de entidad local: https://ripio.es/ (pie legal) — consultado 03/10/2026

**Cambiario / deuda externa:**
12. BCRA — TO Exterior y Cambios (endeudamientos financieros con el exterior: ingreso y liquidación por MULC para acceder a pagar servicios, punto 2.4/3.5): https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8481.pdf
13. BCRA — Com. A 6401 relevamiento de activos y pasivos externos (ex A 3602; personas humanas eximidas por Com. A 6594): https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Faq.6401.pdf, https://www.bcra.gob.ar/archivos/Pdfs/SistemasFinancierosYdePagos/Presentacion_WEB_junio.pdf

**Domicilio / licencias:**
14. CNAD El Salvador — registro PSAD (alcance, requisitos, tasa inicial USD 5.475): https://cnad.gob.sv/es/como-registrarse/psad/, registro público: https://cnad.gob.sv/es/registro-publico/proveedores-de-servicio-de-activos-digitales/ — consultado 03/10/2026

**Yield del pool ocioso:**
15. Comparativa lending Solana abr-2026 (Jupiter Lend 4,9% / Kamino 5,2% / marginfi 4,1% APY USDC; TVL Kamino ~2,4 B, Jupiter ~1,8 B): https://lagazettecrypto.fr/jupiter-lend-kamino-marginfi-comparatif-lending-solana-2026/; AprScope sep-2026: https://aprscope.com/yields/pool/jupiter-lend-solana-usdc-earn/, https://aprscope.com/yields/pool/kamino-lend-solana-usdc/
