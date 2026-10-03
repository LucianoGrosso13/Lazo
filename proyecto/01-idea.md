# 01 - Idea

Sesión del 2026-10-03 (día de la sede, Tucumán). Estado: exploración asistida con investigación web. Falta completar equipo y confirmar elección.

## Equipo y fortalezas

- Estudiante (probablemente solo o equipo por confirmar). Apunta realistamente al 5.º puesto o a uno de los 4 bonus de US$500 del track Superteam Argentina.
- INCOMPLETO: quiénes son, qué sabe hacer cada uno, horas reales disponibles.

## Problemas explorados

1. **Acceso a crédito sin historial** (el que surgió de su idea): en Argentina >40% de la economía es informal; un estudiante o trabajador informal no tiene score crediticio ni activos crypto para colateralizar. Los préstamos tipo Nexo (LTV ~50%, liquidación automática al ~83%, interés 10-18% anual) sirven a quien YA tiene crypto y no quiere venderla — no a quien necesita el crédito.
   - Fuente: <https://support.nexo.com/en-US/article/loan-to-value-ltv-explained>
2. INCOMPLETO: conviene explorar 2 problemas más vividos de cerca antes de decidir (guía sugiere 3).

## Ideas (todas)

Del usuario:
1. Préstamos colateralizados tipo Nexo: depositás un activo, te prestan a interés bajo, pagás y recuperás el colateral.

De la investigación (vueltas de rosca evaluadas):
2. **Self-repaying loan** (el yield del colateral paga la deuda, estilo Alchemix). DESCARTADA: Hobba ya ganó 5.º DeFi en Cypherpunk con "payments platform leveraging self repaying loans" y Jupiter Lend v2 ya tiene "Smart Debt" en Solana. Tomada.
   - <https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/>
   - <https://financefeeds.com/solana-lending-protocols-compared-jupiter-lend-vs-kamino-vs-save/>
3. **Escalera de crédito / credit-builder onchain**: micro-préstamo que arranca 120% colateralizado y el colateral exigido BAJA con cada repago a tiempo (el historial queda onchain en una cuenta del wallet). Nexo presta contra lo que tenés; esto presta contra lo que demostrás. Es el playbook de la tarjeta garantizada de Nubank, pero el "buró de crédito" es la cadena y lo puede leer cualquier protocolo.
   - Existe el concepto en TradFi (Archie, Onbo) y en otros chains (CLenFi, credVerify en GitHub) pero puntuan billeteras que YA tienen historial — nadie ataca el cold-start del invisible crediticio argentino.
   - <https://clenfi.com/> <https://archie.finance/>
4. **Fiador onchain** (variante/complemento de 3): un familiar o amigo deposita un aval chico; si pagás, ambos construyen reputación; si no, el aval cubre. Mapea la cultura real del fiador en Argentina (alquileres, préstamos de barrio).
5. Préstamo contra ingresos futuros de freelancers que cobran en USDC (adjacent a attn.markets, que ganó Undefined 1.º en Cypherpunk tokenizando ingresos futuros — tomado parcialmente).

## Filtro y tabla de puntajes

Contexto duro de mercado:
- Money markets genéricos en Solana: SATURADO. Kamino (~$1-3B TVL), Jupiter Lend (~$1B), Save, marginfi→Project 0, Loopscale, Lulo. Un clon Nexo = alerta roja de clon sin cuña.
- Crédito/underwriting SÍ gana en Colosseum: Yumi Finance (BNPL onchain para unbanked) ganó DeFi 1.º (US$25K) en Cypherpunk; Pencil Finance (student loans RWA) 4.º.
- Track ARG (verificado en el listing): "Ideas can enter. Working products win." Piden producto funcional + video demo + repo + changelog semanal + registro del punto de partida.
  - <https://superteam.fun/earn/listing/colosseum-crypto-worlds-fair-hackathon-superteam-argentina-track/>

| Idea | Dolor | Novedad | Por qué cadena | Factibilidad | Demo 3min | Negocio | Veredicto |
|---|---|---|---|---|---|---|---|
| 1. Clon Nexo | 2 | 1 | 3 | 2 | 3 | 2 | Descartada: compite con Kamino/Jupiter |
| 3. Escalera de crédito | 5 | 4 | 5 | 4 | 5 | 4 | Recomendada |
| 4. Fiador onchain | 4 | 4 | 4 | 4 | 5 | 3 | Fuerte como capa de la 3 |
| 5. Ingresos futuros | 4 | 2 | 4 | 3 | 3 | 4 | Tomada por attn.markets |

## Idea elegida

PENDIENTE de confirmación del equipo. Recomendada: "Escalera de crédito" con capa de fiador opcional.

Frase candidata: "Ayudamos a estudiantes y trabajadores informales de Argentina a construir su primera historia crediticia, con micro-préstamos en USDC cuyo colateral baja a medida que pagan."

## Supuestos peligrosos

1. Que a alguien sin historial le importe construirlo en crypto (¿o se resignó al efectivo?). Test de mesa: nombrar 3 personas reales.
2. Que el patrón de mercado no sea "cementerio": puede haber intentos de credit-builder en Colosseum que no ganaron. VERIFICAR con Copilot (`npx @colosseum-org/copilot-connect`, pendiente de aprobación del usuario).
3. Defaults en los tramos sub-colateralizados: en el demo se resuelve con quema de reputación + aval, pero es el punto que los jurados van a atacar.
