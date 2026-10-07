# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estudiante argentino sin tarjeta de crédito propia** (persona de la demo: estudiante de la UNT, Tucumán). Quiere comprar algo de estudio o trabajo (PC de US$1.000, notebook, curso) en cuotas. En los casos del entorno registrados, recurrió a tarjeta familiar; costos de otras ofertas requieren cotización actual. Usa el celular, conecta Phantom en devnet.
- **Familiar fiador** (la mamá en la demo): tiene tarjeta de crédito y no quiere prestarla para cada compra. Abre un link que le manda el estudiante, hace KYC, elige un tope y carga la tarjeta. Solo paga si el estudiante no paga. Puede no saber nada de cripto.
- **Comercio**: vende al estudiante y elige cuándo cobrar: hoy 7%, 30 días 6,25%, 60 días 5,75% o 90 días 5,25% sobre lo financiado. Los plazos diferidos se pagan en tramos mensuales iguales; Lazo garantiza cada tramo en su fecha. En el marketplace aparecen comercios de ejemplo.
- **Pool / inversor**: pone USDC en tramos junior o senior y ve cada préstamo, pago y recupero onchain.
- **Jurados de la hackathon** (Colosseum Crypto World's Fair, track Superteam Argentina, y premio a mejor diseño): evalúan el producto en un link público y en un video de 3 minutos. Leen en inglés.

## Product Purpose

Cuotas en devUSDC para estudiantes sin tarjeta: **3 sin interés o 6 con 3% total sobre lo financiado** (desde US$350). Todo plan requiere un fiador activo con tarjeta; cubre el capital y el interés que falten, sin punitorios. El comercio elige cuándo cobrar y paga una comisión sobre lo financiado: 7% hoy, 6,25% a 30 días, 5,75% a 60 días o 5,25% a 90 días. Los plazos diferidos se liberan en tramos mensuales iguales y Lazo garantiza cada fecha. Ver `proyecto/06-decisiones-comerciales.md` y `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`. La web pública funciona en el simulador; el upgrade del programa nuevo en devnet está pendiente de aprobación y el binario desplegado hoy es el anterior. Éxito en la hackathon: alguien completa la compra simulada en menos de 2 minutos sin ayuda, y el flujo de mora (vence → gracia → cobro al fiador → recupero → baja de Tier) se muestra en menos de 60 segundos.

## Positioning

Formaliza el "prestame la tarjeta" argentino: el familiar pasa a ser fiador y solo paga si el estudiante no paga. Ofrece 3 cuotas sin interés y 6 con 3% de interés total, reputación que vive en la wallet y que cualquier comercio puede leer, y un pool donde cada adelanto, pago, recupero y pérdida es verificable onchain cuando opera el programa actualizado.

## Operating Context

- La prueba de cadena se limita a **devnet**, la red de prueba de Solana; devUSDC no tiene valor. Nunca mainnet. La web pública corre en el simulador y la entrega lo declara.
- Demo guiada de 5 pasos (fiador → compra → primera cuota → mora y recupero → pool), con un reloj de demo que adelanta días.
- La UI está en español rioplatense con un switch a inglés para jurados y video.
- Páginas por audiencia: `/para-estudiantes`, `/para-comercios`, `/para-inversores`; marketplace en `/comercio` con buscador, categorías y destacados en el home.
- El front habla con la cadena solo a través de una interfaz única con implementación mock (hoy) y real (cuando exista el programa Anchor).

## Capabilities and Constraints

- Decisión vigente: el fiador cubre el 100% del capital y del interés pendientes en todos los Tiers; los punitorios quedan fuera. Anticipo/topes: 30%/1.000 → 20%/1.000 → 10%/1.250 → 0%/1.500 devUSDC. La web simulada y el nuevo programa usan estas reglas; el binario desplegado en devnet todavía es la versión anterior. El máximo contractual de la fianza sigue pendiente: no inventarlo.
- Flujo inmediato: comercio cobra precio − 7% × financiado (PC de 1.000 en Tier 1: recibe 951; a 90 días, 963,25 en tres tramos). Todas las opciones se cotizan por config con `quote()`; costos y devengo del reparto D8 (4% originación + 2% anual administración) pendientes. H y mejoras 1/2/10/11 detalladas en `proyecto/09-alcance-opcion-h-y-mejoras.md`.
- Mora: días 1-5 gracia (día 3 aviso al fiador), día 6 punitorio 5% sobre la cuota vencida, día 15 cobro al fiador, baja de escalón, `late_count + 1`, bloquea planes nuevos.
- Ningún número de negocio va hardcodeado en la UI: sale de la config del protocolo.
- Simulado y declarado: USDC (devUSDC), paso del tiempo, tienda demo, estudiante en escalón 3 (datos de ejemplo), inversores senior. Didit y Mobbex todavía no conectados: el fiador se simula en esta etapa.
- Frase semilla y claves privadas nunca se piden ni se muestran. Toda transacción muestra destino, monto, token y red antes de firmar.

## Brand Commitments

- Nombre del producto: **Lazo** (elegido el 2026-10-03; marca sin verificar). En español es el lazo familiar; en inglés "bond" también es fianza. Bajada ES: "Cuotas con respaldo y costos claros." EN: "Installments with clear costs and a guarantor." El claim sin interés sólo se usa para 3 cuotas.
- Estética pedida por el equipo: temática hackathon/web3, vidrio y gradientes con los colores de Solana, interactiva. Apunta al premio a mejor diseño.
- Voz: español rioplatense claro, sin jerga cripto innecesaria; cada término nuevo (wallet, devnet, firma) se explica en una línea.

## Evidence on Hand

- Cifras propias del modelo: tabla de escalones y comisiones de `proyecto/02-validacion.md`.
- Cifras de terceros, **sin verificar en la fuente oficial**, se citan como "referencia": MP CFTEA 76-1.376% (ago-2026) y ~1.290 reales por una PC de 1.000 en 3 cuotas; comisión Cuotas MiPyME ~6,9% (10 días hábiles, solo pymes certificadas — sucesora del extinto Cuota Simple); MP ~12,49%; GOcuotas paga desde 22 días hábiles; Kamino ~4,5%, Jupiter ~5% (oct-2026). Son antecedentes sin revalidar en esta sesión; el directorio `proyecto/06-viabilidad/` citado anteriormente no está presente en este checkout. No usarlos como prueba de ahorro o rentabilidad.
- GTM y minorista: `proyecto/07-go-to-market-y-alianzas.md` y `proyecto/08-minorista-y-economia.md`; fuentes oficiales e hipótesis distinguidas. Lemon/Ripio/belo son candidatos, no socios.
- Test de mesa: 3 casos con nombre del entorno del equipo (2 usaron la tarjeta de los padres). No hay testimonios, clientes ni comercios reales: no se inventan.

## Product Principles

1. Cada pantalla clave muestra un beneficio con números, al lado de la alternativa.
2. La cadena se muestra como prueba (links a Explorer, hashes), no como jerga.
3. El fiador tiene que sentir confianza: sabe exactamente cuánto puede llegar a pagar y cuándo.
4. Lo simulado se declara; nada parece real si no lo es.
5. La demo completa entra en 3 minutos.

## Accessibility & Inclusion

Usable en celular (el fiador y el estudiante entran desde un link de WhatsApp): todas las rutas se verifican sin scroll horizontal a 390 px con un e2e. Contraste legible sobre fondos oscuros con vidrio; respetar `prefers-reduced-motion`.
