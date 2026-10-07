# Lazo: distribución fintech y decisión sobre una billetera propia

**Fecha de investigación: 2026-10-07.** Fuentes primarias consultadas ese día. Informe interno para revisar el pitch; no es un anuncio de acuerdos ni de funcionalidades implementadas. Leídos `07-go-to-market-y-alianzas.md` y `08-minorista-y-economia.md`. La ampliación a trabajadores y estudiantes sin acceso a crédito responde al pedido actual del equipo; no acredita demanda medida en esos segmentos.

## Recomendación

Presentar Lazo como un método de pago en cuotas que puede integrarse a billeteras existentes. Mantener el checkout propio para demostrarlo y aprender; buscar acuerdos de infraestructura y de distribución por separado. No construir ahora una nueva billetera con exchange, tarjeta y productos DeFi: agrega otro negocio y no demuestra que la financiación original funcione.

La intuición de buscar distribución tiene sentido. La afirmación «solo será rentable con masividad» necesita un matiz: más volumen ayuda a repartir costos fijos; si cada compra pierde plata antes de esos costos, el volumen agranda la pérdida. El modelo interno de `08` contiene ejemplos deficitarios bajo supuestos expresamente hipotéticos; sus tarifas históricas no deben copiarse al pitch. Primero validar contribución por compra, disponibilidad de capital y riesgo; después cuánto cuesta captar usuarios y comercios y cuánto mejora eso un partner.

**Inferencia estratégica, no hecho demostrado:** una alianza puede reducir adquisición y pasos de pago, pero entrega parte del margen y crea dependencia del canal. Construir una billetera propia tampoco garantiza audiencia. La ventaja defendible de Lazo tendría que estar en la originación de cuotas, experiencia de comercio/fiador, datos propios obtenidos con consentimiento y recuperación; no alcanza con ofrecer otra interfaz de saldo.

En esta etapa, «no bancarizados» debe explicarse con cuidado: alguien puede tener cuenta de pago o bancaria y seguir sin tarjeta de crédito ni límite suficiente. Para partners, la descripción más precisa es **trabajadores y estudiantes sin acceso a crédito formal suficiente**. La billetera puede ser el canal donde ya cobran y pagan, aunque no tengan tarjeta bancaria. No afirmar que todos los usuarios de una app pertenecen al segmento objetivo.

## Qué ofrecen realmente los candidatos

Una **API** permite que dos sistemas se comuniquen; un **SDK** reúne herramientas para integrar. Una **rampa** convierte dinero local y cripto. **USDC** es un activo digital diseñado para seguir el valor del dólar; recibirlo por Solana no significa poder ejecutar el programa de cuotas.

| Candidato | Canal público para terceros | USDC/Solana y límite técnico | Crédito/alternativas ya publicados | Lectura para Lazo |
|---|---|---|---|---|
| **Lemon** | Programa de Mini-Apps con postulación y SDK; es el canal de distribución más explícito de esta comparación. [Build](https://lemon.me/build) | El tipo `ChainId` del SDK consultado enumera redes EVM; no incluye Solana. No hay una vía directa documentada para Anchor. [Types](https://lemoncash.mintlify.app/types/types) | Lemon Credit Card usa BTC como respaldo y permite hasta 12 cuotas en Argentina; interés depende del comercio. [Producto](https://lemon.me/lemon_card), [Cuotas](https://help.lemon.me/es/articles/13343450-puedo-pagar-en-cuotas) | Potencial canal y posible competencia. Evaluar complemento para compradores sin BTC disponible; no vender que Lemon carece de cuotas. La aceptación y el acceso Solana siguen pendientes. |
| **Ripio** | Crypto as a Service, integración directa o widget y sandbox publicados. [Introducción B2B](https://docs.ripio.com/crypto-as-a-service/overview/introduction) | Wallet incluye USDC en Solana en la tabla actualizada el 06/07/2026. Habilitación de ese recorrido en el contrato/API B2B debe confirmarse. [Redes](https://help-ar.ripio.com/space/HC/1524301898/Qu%2Bred%2Butilizar%2Bpara%2Brealizar%2Benv%2Bos%2By%2Brecepciones%2Bde%2Bcriptomonedas%2Bdentro%2Bde%2Bla%2BWallet) | Publica acceso desde su app a préstamos DeFi con cripto en garantía; aclara que facilita tecnología y no otorga el préstamo. [Préstamos](https://launchpad.ripio.com/notas-de-la-app/prestamos-defi) | Primera evaluación de rampas por documentación y sandbox. Eso no incluye distribución en Wallet ni fondeo del crédito de Lazo. |
| **belo** | APIs anunciadas para cuentas, cobros locales, conversión, pagos y conciliación; formulario empresarial. [APIs](https://www.belo.app/apis) | Ayuda al usuario lista USDC por Solana y excluye versiones sintéticas; confirmar endpoints, permisos y activos habilitados en B2B. [Redes](https://help.belo.app/es/articles/5964418-cuales-son-las-redes-soportadas-por-belo) | La prepaga Mastercard argentina publicada no permite cuotificar consumos. Hay términos de otros productos Visa; no extender esa conclusión a toda la oferta de belo. [Mastercard](https://help.belo.app/es/articles/8834047-terminos-y-condiciones-particulares-tarjeta-prepaga-mastercard), [Visa](https://help.belo.app/es/articles/13753299-terminos-y-condiciones-tarjeta-belo) | Candidato para cobro/conversión y una posible oferta complementaria. Su API no garantiza presencia promocionada en la app. |
| **Bridge** | Infraestructura API de billeteras custodiales, cuentas y transferencias; documentación y sandbox públicos. [Wallets](https://apidocs.bridge.xyz/platform/wallets/overview) | Tabla de wallets incluye USDC/Solana; flujo de producción sujeto a aprobación de Bridge. El sandbox crea direcciones ficticias, no una wallet devnet capaz de firmar Anchor. [Wallets](https://apidocs.bridge.xyz/platform/wallets/overview), [Sandbox](https://apidocs.bridge.xyz/platform/wallets/sandbox) | Es un proveedor de infraestructura; esa documentación no acredita cuotas al consumidor equivalentes a Lazo. | Comparación técnica útil si hace falta custodia integrada. No se verificó una rampa ARS local equivalente a Ripio/belo; no presentarlo como reemplazo confirmado para Argentina. |
| **Manteca** | Infraestructura B2B para cripto y pagos QR, con widget y sandbox anunciados. [Oferta](https://manteca.dev/) | La tabla pública consultada de depósitos/retiros lista USDC en otras redes; no encontramos Solana allí. No deducirla de la frase comercial «all major blockchains». [Docs cripto](https://docs.manteca.dev//cripto) | Infraestructura y trading, no evidencia de cuotas iguales a Lazo. | Comparador de rampas/QR argentinos, condicionado a confirmación Solana. No agregar puentes entre redes a la demo para acomodar un partner. |

**Sin acuerdos actuales:** estos sitios prueban oferta publicada, no alta aprobada, acceso de Lazo a credenciales, voluntad de asumir riesgo ni usuarios adquiridos. Las cifras publicitadas de audiencia no permiten estimar conversión, usuarios argentinos elegibles o comercios accesibles; no se usan como proyección de Lazo.

## Tres precedentes verificables

1. **Ripio + Bankingly:** Ripio anunció el 09/02/2026 una alianza para que bancos, cooperativas, microfinancieras y fintechs ofrezcan servicios cripto desde sus canales digitales. Es un precedente de distribución mediante infraestructura integrada, no prueba de un acuerdo de crédito ni de disponibilidad para Lazo. [Anuncio oficial](https://action.ripio.com/es/blog/ripio-y-bankingly-se-al%C3%ADan-para-llevar-cripto-a-la-banca-digital-de-latinoam%C3%A9rica).
2. **Lemon Mini-Apps:** el programa demuestra que una billetera abre un espacio explícito a productos de terceros. Su catálogo también anuncia Lendoor, créditos de hasta 1.000 USDC, marcado **Soon** al consultar. No describirlo como servicio lanzado ni asumir que admite este modelo de fiador. [Catálogo](https://lemon.me/en/miniapps).
3. **belo + Clover/Fiserv:** términos oficiales de una promoción de julio de 2026 describen pagos QR cripto desde belo en terminales Clover argentinas. La promoción terminó el 26/07/2026; demuestra un recorrido anunciado en esa fecha, no condiciones comerciales vigentes ni acceso de Lazo a la integración. [Términos de la promoción](https://help.belo.app/es/articles/15820676-terminos-y-condiciones-particulares-promocion-reintegro-pagando-con-qr-belo-en-terminales-clover).

Estos antecedentes respaldan la plausibilidad de integrar un servicio financiero a canales existentes. No prueban que una fintech acepte distribuir Lazo, ni cuánto cobrará.

## La propuesta comercial que conviene validar

**Producto a integrar:** planes de cuotas para un comprador sin tarjeta propia suficiente, con un fiador externo que respalda el 100% conforme a las decisiones actuales. La cobertura contractual no equivale a recupero garantizado. La app asociada podría ofrecer acceso al checkout y conversión/cobros; quién presta, fondea, custodia y recupera debe quedar definido aparte.

**Hipótesis de valor para la billetera:** más pagos de compras reales y conversiones; una función adicional para un segmento que no consigue cuotas con el producto existente. Medir ingreso incremental y retención; no prometérselos como resultado probado.

**Hipótesis de valor para el comercio:** financiación con liquidación temprana de la venta y un costo total comprensible. La frase «menos comisión que la competencia» necesita cotizaciones equivalentes en moneda, plazo, cantidad de cuotas, impuestos y anticipo. Ni la red barata ni una tabla de aranceles aislada resuelven esa comparación.

Separar cuatro conversaciones:

| Acuerdo | Qué cotizar/definir | Qué no queda incluido por defecto |
|---|---|---|
| Infraestructura | Conversión ARS↔USDC, diferencia de compra/venta, retiro por red, mínimo por operación, mensualidad, alta, KYC, datos, conciliación y soporte | Usuarios de la app, crédito, capital o garantía de recupero |
| Distribución | Ubicación en la app, usuario elegible, enlace/SDK permitido, atribución, campañas, datos accesibles y exclusividad | Exposición garantizada o aceptación automática de cualquier usuario |
| Fondeo/riesgo | Quién adelanta el capital; costo y disponibilidad; reservas, mora, fraude, liquidación y límites | Que el partner financie por haber integrado una API |
| Procesamiento del fiador | Consentimiento, tokenización, habilitación del caso de uso, cargos rechazados, contracargos, devoluciones, tiempos y costo efectivo | Cobrar sin autorización o recuperar siempre el 100% |

También acordar quién responde al comprador, fiador y comercio ante disputas, cancelaciones, conversión fallida o pago desconocido; qué identidad puede reutilizarse con permiso; quién conserva evidencia y cómo se corta el acuerdo sin dejar cuotas huérfanas. Esto es una lista de decisiones para negociación y revisión especializada, no una conclusión jurídica sobre el modelo.

### Cómo discutir el reparto sin inventar un porcentaje

Solicitar primero una cotización de servicio; después comparar una tarifa por operación con remuneración de distribución por compra atribuida o ingreso cobrado. Un reparto 50/50 u otro número propuesto sin costos no explica viabilidad.

Usar la cuenta consolidada por compra:

`comisión comercial + interés efectivamente cobrado − fondeo − pérdida esperada − rampas/cobros − identidad/operación/soporte − impuestos − costo del partner`.

El capital que devuelve el comprador no es ingreso a repartir. Si se divide una comisión entre empresa, pool y partner, registrarla una sola vez. Conservar el reparto vigente empresa/pool y la configuración del protocolo; una negociación futura requiere comprobar que cada parte cubre sus costos y riesgo. No usar más volumen para ocultar un déficit por operación.

Si se acuerda participación, definir la base exacta: ingreso bruto o neto, cobrado o devengado, costos que se restan, devoluciones, contracargos, atribución y duración. El precio debe permitir mantener una oferta aceptable para el comercio y rendimiento del capital **sujeto a pérdidas**, sin prometer rendimiento garantizado.

## Secuencia y criterio de elección

1. Mostrar checkout propio y explicar el segmento ampliado con trabajadores y estudiantes; preguntar por una compra concreta que hoy no pueden financiar. Reclutar usuarios es trabajo pendiente, no evidencia producida por esta investigación.
2. Evaluar **Ripio y belo para infraestructura**. Confirmar ARS↔USDC/Solana, prueba sin dinero real, responsabilidades y cotización. Priorizar al que habilite el recorrido completo con menor costo efectivo y fricción demostrada, no a una marca por su popularidad.
3. Evaluar **Lemon para distribución**, presentando explícitamente la diferencia con crédito respaldado en BTC y preguntando por firma Solana, devnet y política de productos crediticios. La brecha SDK publicada impide prometer hoy una Mini-App integrada.
4. Usar Bridge/Manteca como comparadores de infraestructura; no ampliar a una billetera propia hasta que exista una razón demostrada que los partners no resuelvan.
5. Negociar un piloto acotado, sin exclusividad inicial ni garantía de volumen inventada. Medir pasos, conversión a primera compra, repetición, costo por comprador activo, contribución y atención requerida. Las pruebas devnet miden experiencia/técnica; no demuestran capacidad ni voluntad de repago real.

Para pasar una conversación técnica a piloto, pedir confirmación escrita de: compatibilidad del activo y red, sandbox, qué puede firmar el usuario, conciliación y devoluciones, uso de datos, costos, flujo admitido y responsables. La hackathon continúa **solo en devnet**, red de prueba con dinero sin valor; **devUSDC** es un token propio de prueba, no USDC emitido por Circle. Ninguna consulta comercial autoriza mainnet o fondos reales.

## Formulación sugerida para el cierre del pitch

**Inglés, propuesta para discutir:** “Our path to scale is to bring Lazo to the wallets people already use, through fintech partnerships. We provide the installment experience; partners can help with payment access and distribution. Our next step is to validate an integration and its economics with a focused pilot.”

Es una estrategia futura. No nombrar fintechs como partners confirmados, no prometer que todas las operaciones serán rentables y no presentar la búsqueda de una alianza como tracción ya conseguida. La demo actual corre en devnet.

## Qué cambió frente a los antecedentes

- Se incorpora la tarjeta de crédito Lemon respaldada en BTC y sus cuotas: corrige el supuesto de que una billetera cripto no compite ya en crédito.
- Se amplía el segmento del pitch a personas sin acceso suficiente a crédito; estudiantes quedan como parte de él.
- Se separa necesidad de distribución de rentabilidad por compra y de fondeo. La escala es una condición posible del negocio; una nueva billetera no es una solución demostrada.
- Se conserva la limitación Solana del SDK Lemon y se aclara que un sandbox API puede simular movimientos sin conectarse a devnet.

No se contactó a empresas, no se completaron postulaciones ni se enviaron transacciones. No se obtuvieron cotizaciones comerciales ni resultados de pilotos.
