# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Estudiante argentino sin tarjeta de crédito propia** (persona de la demo: estudiante de la UNT, Tucumán). Quiere comprar algo de estudio o trabajo (PC de US$1.000, notebook, curso) en cuotas. Hoy le pide la tarjeta a un familiar o paga el CFTEA de Mercado Pago (61% a 388%). Usa el celular, conecta Phantom en devnet.
- **Familiar fiador** (la mamá en la demo): tiene tarjeta de crédito y no quiere prestarla para cada compra. Abre un link que le manda el estudiante, hace KYC, elige un tope y carga la tarjeta. Solo paga si el estudiante no paga. Puede no saber nada de cripto.
- **Comercio**: vende al estudiante y cobra al instante, sin riesgo de mora.
- **Pool / inversor**: pone USDC en tramos junior o senior y ve cada préstamo, pago y recupero onchain.
- **Jurados de la hackathon** (Colosseum Crypto World's Fair, track Superteam Argentina, y premio a mejor diseño): evalúan el producto en un link público y en un video de 3 minutos. Leen en inglés.

## Product Purpose

Cuotas en USDC **sin interés** para estudiantes sin tarjeta, respaldadas por un garante con tarjeta, con una escalera de reputación onchain que baja el anticipo y sube el tope con cada plan pagado. El comercio cobra al instante y paga 7% sobre lo financiado. Éxito en la hackathon: alguien con Phantom en devnet completa la compra en menos de 2 minutos sin ayuda, y el flujo de mora (vence → gracia → cobro al fiador → recupero onchain → baja de escalón) se muestra en menos de 60 segundos.

## Positioning

Formaliza el "prestame la tarjeta" argentino: el familiar pasa a ser fiador y solo paga si el estudiante no paga. Frente a Mercado Pago Cuotas sin Tarjeta (mismo nombre, CFTEA 61-388%): 0% de interés al estudiante, reputación que vive en la wallet y que cualquier comercio puede leer, y un pool donde cada adelanto, pago, recupero y pérdida es verificable onchain.

## Operating Context

- Todo corre en **devnet** con un mint propio devUSDC. Nunca mainnet. Se dice siempre en pantalla y en la entrega.
- Demo guiada de 5 pasos (fiador → compra → primera cuota → mora y recupero → pool), con un reloj de demo que adelanta días.
- La UI está en español rioplatense con un switch a inglés para jurados y video.
- El front habla con la cadena solo a través de una interfaz única con implementación mock (hoy) y real (cuando exista el programa Anchor).

## Capabilities and Constraints

- Escalones con fiador (anticipo / cobertura exigida / tope absoluto): 0 = 30% / 100% / US$1.000; 1 = 20% / 90% / US$1.000; 2 = 10% / 80% / US$1.250; 3 = 0% / 70% / US$1.500. Interés 0% en todos. 3 cuotas.
- Comercio cobra precio − 7% × financiado (PC de 1.000 en escalón 0: recibe 951).
- Mora: días 1-5 gracia (día 3 aviso al fiador), día 6 punitorio 5% sobre la cuota vencida, día 15 cobro al fiador, baja de escalón, `late_count + 1`, bloquea planes nuevos.
- Ningún número de negocio va hardcodeado en la UI: sale de la config del protocolo.
- Simulado y declarado: USDC (devUSDC), paso del tiempo, tienda demo, estudiante en escalón 3 (datos de ejemplo), inversores senior. Didit y Mobbex todavía no conectados: el fiador se simula en esta etapa.
- Frase semilla y claves privadas nunca se piden ni se muestran. Toda transacción muestra destino, monto, token y red antes de firmar.

## Brand Commitments

- Nombre del producto: **Lazo** (elegido el 2026-10-03; marca sin verificar). En español es el lazo familiar; en inglés "bond" también es fianza. Bajada ES: "Cuotas sin interés. Respaldadas por un garante." EN: "Zero-interest installments. Backed by a guarantor."
- Estética pedida por el equipo: temática hackathon/web3, vidrio y gradientes con los colores de Solana, interactiva. Apunta al premio a mejor diseño.
- Voz: español rioplatense claro, sin jerga cripto innecesaria; cada término nuevo (wallet, devnet, firma) se explica en una línea.

## Evidence on Hand

- Cifras propias del modelo: tabla de escalones y comisiones de `proyecto/02-validacion.md`.
- Cifras de terceros, **sin verificar en la fuente oficial**, se citan como "referencia": MP CFTEA 61-388% y ~1.290 reales por una PC de 1.000 en 3 cuotas; comisión Cuota Simple 5,41%; MP ~12,49%; GOcuotas paga a 22 días hábiles; Kamino ~6%, Jupiter ~5%.
- Test de mesa: 3 casos con nombre del entorno del equipo (2 usaron la tarjeta de los padres). No hay testimonios, clientes ni comercios reales: no se inventan.

## Product Principles

1. Cada pantalla clave muestra un beneficio con números, al lado de la alternativa.
2. La cadena se muestra como prueba (links a Explorer, hashes), no como jerga.
3. El fiador tiene que sentir confianza: sabe exactamente cuánto puede llegar a pagar y cuándo.
4. Lo simulado se declara; nada parece real si no lo es.
5. La demo completa entra en 3 minutos.

## Accessibility & Inclusion

Usable en celular (el fiador y el estudiante entran desde un link de WhatsApp). Contraste legible sobre fondos oscuros con vidrio; respetar `prefers-reduced-motion`.
