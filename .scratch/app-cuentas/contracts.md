# Contratos de preparación — borrador, sin aprobación

Fecha: 2026-10-03. Base leída e incorporada: `4234262727a207e0ff87a272e84e44e7f22a80f4`.

Este documento registra hechos del código y propuestas de integración. **No publica tickets, no aprueba pruebas y no habilita implementación.** `approval.md` continúa pendiente; el supervisor registra la respuesta real. Las reglas de negocio provienen de las decisiones más recientes de `proyecto/02-validacion.md`, no de los antecedentes de research.

## Lo disponible en el commit base

| Superficie | Estado observado | Uso previsto por las cuentas |
|---|---|---|
| `getCuotas()` / `CuotasClient` | Singleton; modo mock por defecto, real por variable de entorno | Único acceso de pantallas a datos y acciones |
| Mock | Solo `getConfig()` y `subscribe()` implementados; demás métodos rechazan con `not_implemented` | Esperar commits del owner; no crear un segundo estado financiero |
| Real | Sin operaciones implementadas; falta programa/IDL; reloj y reset rechazan con `demo_only` | Estado explícito de indisponibilidad, sin éxito ficticio |
| Wallet | `WalletButton`, `useWalletAddress`, proveedor Kit + Wallet Standard en devnet | Reutilizar; no duplicar providers ni instalar wallet-adapter |
| Idioma | `LocaleProvider`, `useT`, `defineDict`; ES/EN con persistencia | Diccionario propio por pantalla |
| Datos reactivos | `useCuotasQuery` usa SWR y subscribe | Revalidar cuentas tras acciones del mismo cliente |
| Configuración | Tasas, escalones, gracia, aviso, cobro, número de cuotas, mint y red | Todos los números de negocio se leen de configuración |
| Herramientas | Next 16.3.8, tipos, ESLint, Vitest configurado | Sin tests presentes ni harness de navegador en este commit |
| Navegación base | Header enlaza `/panel`, `/comercio`, `/pool` | Preservar enlaces; resolver compatibilidad al integrar |

La configuración y las constantes actuales contienen identificadores de ejemplo. No son evidencia de un mint, wallets o transacciones desplegados en devnet. No se consultan al RPC como si fueran direcciones reales.

## Contratos ya declarados para consumir

| Recorrido | Lecturas / acciones declaradas | Información todavía faltante |
|---|---|---|
| Entrada / rol | `getConfig`, `getMerchant`, `getReputation`, `initReputation` | `ProtocolConfig.admin`, saldo del estudiante, actor autorizado para acciones |
| Estudiante | `getClock`, `getPlans`, `getReputation`, `getGuarantee`, `getActivity`, `payInstallment` | Destino real de revisión de pago y evidencia distinguible de mock |
| Invitación / fiador | `getGuarantee`, `registerGuarantee`, `revokeGuarantee`, `getPlans`, `getActivity` | Crear/validar invitación; lista de topes; resumen autorizado de exposición/fianza; comprobantes |
| Comercio | `getMerchant`, ventas incluidas en `Merchant`, `getConfig` | Destino ATA para comprobación real y datos de checkout integrable de sesión A |
| Pool | `getPool`, eventos incluidos en `Pool`, `getActivity`, `getConfig` | Rendimientos de referencia identificados, shares/NAV por tramo y lectura global de préstamos/moras |
| Admin | `getConfig`, `getPool`, `getActivity`, `advanceDays`, `resetDemo` | Cambiar estado, registrar comercio, autorización y alcance de bitácora global |

Nombres de métodos nuevos son **propuestas**, no API acordada. El coordinador será el único owner de cualquier extensión aditiva mínima después de coordinarla con la sesión A, en commit separado. Tipos y cambios de contrato tendrán espejo mock/real compatible; los consumidores seguirán importando desde `cuotas.ts`.

## Reglas para la extensión aditiva futura

- Exponer la autoridad admin definida en el brief del programa; la config TS actual la omite. Detectar admin primero, comercio existente después y estudiante al final. Un fallo de RPC o `not_implemented` no significa que alguien sea estudiante nuevo. Distinguir `not_found` del resto de errores.
- La sesión real necesita un firmante autenticado y ligado a la operación. Una dirección pasada como argumento ni un selector visual conceden permisos. La autorización se aplica en el ejecutor de la mutación.
- El fiador no conecta wallet. La invitación mock mapea a un estudiante de ejemplo y se declara como simulación. En real, token HMAC validado en backend antes de lectura privada o modificación; nunca aceptar una dirección arbitraria como credencial. Ni el HMAC ni claves viven en código del cliente.
- Las invitaciones, altas y exposición necesitan la misma persistencia del mock de checkout. Evitar otro store de planes, saldos o reloj. Definir recuperación de storage inválido y datos versionados con el owner del mock.
- Un pago tiene revisión, confirmación y resultado. Cancelar o fallar conserva deuda, saldo y movimientos. No escribir `Paid` anticipadamente. Toda firma/envío real exige aprobación explícita de Luciano; las pruebas automáticas no ejecutan esas acciones.
- Los tipos `Plan`, `Sale`, `PoolEvent` y `TxResult` exigen `signature: string` incluso para el mock. Preparar una distinción aditiva de evidencia o ausencia de firma; no fabricar firmas. La UI jamás crea enlaces Explorer en mock. Solo firmas reales confirmadas generan links con `cluster=devnet`.
- Montos enteros de 6 decimales: conservar precio, anticipo, financiado y suma de cuotas. Para el caso de la PC, 1.000 de precio, 300 de anticipo, 700 financiado, 49 de comisión y 951 al comercio; dividir 700 millones de microunidades entre tres cuotas y asignar el resto a la última. Los 233,33 del guion son presentación redondeada, no una pérdida de principal.
- Tiempo y tasas desde config. Días 1-5 gracia; aviso día 3; día 6 punitorio fijo; día 15 primer cobro al fiador con baja de un escalón/bloqueo; segundo cobro en el mismo plan acelera el saldo. La bitácora y los paneles reflejan el mismo resultado, sin cobros duplicados al recargar/avanzar el reloj.
- La red efectiva debe permanecer devnet también si una variable redefine el RPC. El mode gating debe impedir selector/reloj/reset en real y evitar que ejemplos pasen a ejecución real. El provider compartido pertenece a sesión A; registrar y coordinar cualquier necesidad de modificarlo.

## Decisiones ausentes que no se completan por suposición

| Tema | Fuente / problema | Conducta mientras falta |
|---|---|---|
| Lista de topes del fiador | Q14 exige lista, pero no enumera sus valores; no está en config | No hardcodear un selector inventado; requerir valores del owner o decisión de Luciano |
| Monto máximo de fianza | Q14 anterior menciona peor escalón + interés + punitorio; Q15 elimina interés; falta fórmula final con redondeo y límite | Mostrar el máximo solo si proviene de un contrato autorizado; no llamar fianza a una cifra estimada sin aclaración |
| Exposición por escalón | Existen `guarantorCoverageBps`, `coverageMax` y `activeExposure`, pero no se define su relación con el cargo íntegro de Q2 | Diferenciar saldo del plan, cobertura exigida y máximo contractual; registrar la ambigüedad, no prometer que son iguales |
| Segundo cargo / saldo acelerado | Q2 indica caducidad de plazos; falta detalle de punitorio sobre cuotas futuras y techo acumulado | No inventar penalidades o multiplicarlas; el owner debe conservar la regla explícita y dejar límite declarado |
| Pesos | No hay cotización/oráculo ni conversión autorizada | Indicar monto en pesos indisponible; no copiar un dólar histórico de research |
| Rendimientos y comparaciones | Referencias de terceros sin nueva verificación; config actual no las incluye | No afirmar tasas vigentes ni retorno garantizado; separar y rotular referencias cuando la fuente de configuración las aporte |
| Saldo devUSDC y fondeo | Sin método de saldo ni mint real publicado en esta base | Explicar indisponibilidad; no ofrecer faucet genérico que entrega otro mint como si fondeara devUSDC propio |

Estas ausencias no cambian el gate ni requieren duplicar la pregunta pendiente. Se trasladan al supervisor como contratos/bloqueos para decidir antes del slice dependiente.

## Ownership propuesto luego del gate

| Owner | Alcance exclusivo | Límite |
|---|---|---|
| Sesión A | Landing, tokens, tienda, checkout, providers/diseño y operaciones del mock compartido | No copiar sus cambios sin commitear; tomar commits por rebase/merge seguro |
| Coordinador / ticket 01 | Entrada `/app`, layout de cuentas, `roles.ts`, contrato común y operaciones git/config/dependencias | No competir por index; extensiones de cuotas en commit aparte |
| Worker estudiante / ticket 02 | Pantalla estudiante, componentes estudiante, diccionario estudiante | Consume control de invitación del owner fiador, sin editarlo |
| Worker fiador / ticket 03 | `/fiador/[token]`, componentes fiador/invitación y diccionario fiador; handlers propios si necesarios y asignados | No editar página estudiante ni store financiero compartido |
| Worker comercio-pool / ticket 04 | Cuenta comercio, comercio público por dirección, pool público, componentes y diccionarios propios | Pool sigue siendo consulta pública de prueba; no captar depósitos |
| Owner admin / ticket 05 | Cuenta admin, controles y diccionario admin | Arranca tras cuentas y contrato de mora compartida disponibles |
| Coordinador / ticket 06 | Integración, evidencia visual, memoria, commits y push normal autorizado | Revisión Standards y Spec con workers distintos, read-only y base fija |

No hay rutas de cuentas/comercio/pool ni archivos `roles.ts` en `4234262`. Aun así, inventariar otra vez antes de cada ola por trabajo concurrente. `(cuenta)` no agrega segmento a la URL; elegir una única estructura que produzca `/app/...` y no crear rutas duplicadas entre route groups.

## Disponibilidad y siguiente ola

El commit base desbloquea explorar contratos y entorno. **No entrega aún el mock funcional ni el diseño final.** Tickets 01/04 no están realmente listos para aceptación vertical solo por existir `app/`. Esperar commits funcionales del owner o acordar extensiones mínimas, sin crear otra app.

Después del gate, publicar los seis tickets locales aprobados, registrar dependencias externas y crear Tasks del mismo Run. Hasta tres workers simultáneos solo con contratos comunes disponibles y scopes disjuntos. Mantener las dependencias propuestas 02/03 después de 01, 04 independiente de 01-03 si sus lecturas están disponibles, 05 después de 01-04, 06 después de 01-05.

## Verificación propuesta (todavía pendiente)

La frontera propuesta sigue siendo rutas públicas en navegador con modo demo. Preparar recorrido reproducible de invitación → alta → compra del checkout de A → cancelación/pago/fallo → venta → mora/recupero → pool, más recarga, enlace inválido y autorización. Esperar aprobación antes de escribir pruebas o instalar un harness. Vitest configurado no prueba la existencia de cobertura.

Al implementar: leer docs locales de Next correspondientes a esta versión antes de escribir código, tipos y test puntual por slice, suite completa al integrar, lint/build y pantallas móviles/escritorio. Registrar Phantom como comprobado solo si hubo conexión observada; programa/IDL y sandbox reales siguen pendientes de evidencia.
