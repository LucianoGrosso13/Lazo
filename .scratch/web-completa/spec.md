# Spec: web completa — decisiones comerciales en pantalla, marketplace de comercios, páginas por audiencia y responsive

**Status:** ready-for-agent · Fecha: 2026-10-07 · Rama de integración: `t-web-marketplace-responsive`

Fuentes: pedido de Luciano en la sesión del 2026-10-07 (ver "Decisiones"), `AGENTS.md`, `PRODUCT.md`, `proyecto/06-decisiones-comerciales.md`, `proyecto/07-go-to-market-y-alianzas.md`, `proyecto/08-minorista-y-economia.md`, `proyecto/09-alcance-opcion-h-y-mejoras.md`, `proyecto/05-pitch.md`. Antecedentes de formato: `.scratch/demo-polish/spec.md`.

## Problem Statement

El equipo cerró decisiones comerciales nuevas (3 cuotas sin interés, 6 con interés, el comercio elige cuándo cobrar, fiador al 100% en todos los escalones, reparto D8, venta minorista por link/QR, billeteras como canal, ideas 10 y 11) pero la web todavía cuenta la historia vieja: "tres cuotas sin interés", cobertura del fiador decreciente (100/90/80/70), un solo plazo de cobro y nada sobre economía del pool. Un jurado, un comercio o un inversor que entra no encuentra respuesta a "¿cómo funciona para mí?". La sección de comercios es un buscador por dirección de wallet, no un lugar donde descubrir dónde comprar. Y desde el teléfono —donde el estudiante y el fiador abren el link de WhatsApp— varias pantallas se ven mal.

## Solution

1. **La demo mock refleja las decisiones vigentes.** El checkout ofrece 3 o 6 cuotas; 6 cuotas con un interés total provisional del 3% sobre lo financiado, rotulado "provisional". La cobertura del fiador es 100% en todos los escalones. El comercio elige cuándo cobrar (hoy 7%, 30 días 6,25%, 60 días 5,5%, 90 días 5,25%, provisionales) y la demo simula el cobro diferido con el reloj. Todos esos números viven en la config del protocolo (mock), nunca en la UI.
2. **Marketplace de comercios.** `/comercio` pasa a ser un directorio con buscador y filtro por categorías de comercios demo (ficticios, con etiqueta visible "demo"), cada uno con su perfil y productos comprables en el mock. El home muestra una sección de comercios destacados.
3. **Páginas por audiencia.** Tres páginas que explican todo de punta a punta: estudiantes y familias (incluye al fiador), comercios, inversores. El home las presenta y el header las enlaza.
4. **Responsive.** Todas las pantallas se usan bien a 390 px sin scroll horizontal, con tap targets cómodos y texto legible.

## Decisiones (tomadas por Luciano, 2026-10-07 — no se renegocian sin preguntarle)

1. **Alcance = contenido + demo mock.** No se toca el programa Anchor, no hay deploy, no se firma ni envía nada. Divergencias mock ↔ programa se documentan (como la del margen de crédito).
2. **Solo 3 o 6 cuotas** (se saca 1 cuota). **6 cuotas: interés total provisional del 3%** sobre el capital financiado, elegido por análisis (Luciano: "hacé un análisis, fijate qué conviene y documentalo") → `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`. Siempre con etiqueta "provisional". Vive en la config mock.
5. **Tarifa del comercio por plazo de cobro** (Luciano: "a 30 baja un % del 7, a 60 un poco más, y así"): hoy 7%, 30 días 6,25%, 60 días 5,5%, 90 días 5,25% sobre lo financiado, iguales para 3 y 6 cuotas, todas provisionales y **seleccionables** en la demo. Cálculo (tarifa neutra al ahorro de capital) en `proyecto/10-…`.
3. **Comercios ficticios "demo"** para el marketplace y los destacados: ~10 comercios con nombres realistas inventados (sin marcas reales), cada uno con etiqueta visible "demo" o "ejemplo". Nunca se presentan como aliados reales.
4. **Cambios sueltos previos** (cifras de referencia oct-2026) ya commiteados aparte en la rama de integración.

## Decisiones del coordinador

- El **anticipo** llega al comercio en el momento; lo diferido es solo la parte financiada neta (`A − F`). En el cobro diferido Lazo garantiza pagar en la fecha elegida aunque el comprador se atrase (supuesto de 08).
- El comercio fija su **plazo de cobro predeterminado** en su cuenta; el checkout cotiza con ese plazo. La orden guarda el plazo concreto y no cambia después.
- **No se nombran billeteras candidatas** (Lemon, Ripio, belo) en la web: se habla de "billeteras argentinas" y se aclara que no hay acuerdos firmados. Tampoco competidores (regla vigente).

## User Stories

### Estudiante (comprador)

1. Como estudiante, quiero elegir entre 3 o 6 cuotas en el checkout, para adaptar la compra a mi bolsillo.
2. Como estudiante, quiero ver que 3 cuotas son sin interés y que 6 cuotas tienen un interés total, para decidir sabiendo cuánto pago de más.
3. Como estudiante, quiero ver para cada opción el anticipo, el monto de cada cuota, el interés, el total y las fechas, para no tener sorpresas.
4. Como estudiante, quiero que las opciones provisionales digan "provisional", para saber que esos términos pueden cambiar.
5. Como estudiante, quiero que una opción no disponible aparezca bloqueada con el motivo, para entender por qué no la puedo elegir.
6. Como estudiante, quiero que el total siempre cierre exacto (anticipo + cuotas = total), para confiar en los números.
7. Como estudiante, quiero ver en mi panel cuántas cuotas tiene cada plan y si tiene interés, para seguir mis pagos.
8. Como estudiante, quiero descubrir comercios que aceptan Lazo buscando por nombre o por categoría, para saber dónde comprar.
9. Como estudiante, quiero entrar al perfil de un comercio y ver sus productos con el precio partido en cuotas, para elegir qué comprar.
10. Como estudiante, quiero comprar un producto de cualquier comercio del marketplace con el mismo checkout, para no aprender un flujo nuevo por comercio.
11. Como estudiante, quiero una página que me explique cómo funciona Lazo para mí (escalera, cuotas, qué pasa si me atraso), para decidir si me sirve.
12. Como estudiante, quiero entender la escalera: cada plan pagado baja el anticipo y sube el tope, para tener un incentivo claro.
13. Como estudiante, quiero entender qué pasa si me atraso (gracia, aviso, recargo, cobro al fiador, baja de escalón), para evitarlo.
14. Como estudiante, quiero usar todo desde el celular sin hacer zoom ni scroll horizontal, porque entro desde un link de WhatsApp.

### Familiar fiador

15. Como fiador, quiero entender que respaldo el 100% del capital pendiente en todos los escalones, para saber exactamente mi exposición.
16. Como fiador, quiero saber que solo pago si el estudiante no paga y cuándo me avisan, para estar tranquilo.
17. Como fiador, quiero saber que subir de escalón no me libera ni baja mi cobertura, para no malinterpretar la escalera.
18. Como fiador, quiero saber que se evalúan descuentos en comercios para fiadores cuyo estudiante paga al día (roadmap), para ver un beneficio futuro.
19. Como fiador, quiero que la explicación no use jerga cripto, porque puedo no saber nada de cripto.
20. Como fiador, quiero completar el alta desde el celular sin que se rompa el diseño.

### Comercio

21. Como comercio, quiero una página que explique cómo vendo con Lazo, cuánto cobro y cuándo, para decidir si me sumo.
22. Como comercio, quiero ver un ejemplo con números (precio 1.000, anticipo 300, financiado 700, comisión 49, recibo 951), para entender la comisión sobre lo financiado.
23. Como comercio, quiero elegir cuándo cobrar (hoy, 30, 60 o 90 días) y ver cuánto baja la comisión al esperar, para decidir entre liquidez y costo.
24. Como comercio, quiero entender cómo vendo en mostrador u online con un link o QR de Lazo, para imaginar la operación diaria.
25. Como comercio, quiero ver una comparación con otras formas de vender en cuotas, rotulada "referencia" y sin marcas, para evaluar el costo.
26. Como comercio, quiero ver en mi cuenta mis opciones de cobro con neto, comisión y fecha, para elegir con información.
27. Como comercio, quiero aparecer en el marketplace con mi categoría, descripción y productos, para que los estudiantes me encuentren.
28. Como comercio, quiero que quede claro qué es demo y qué es real, para no confundir a mis clientes.
29. Como comercio, quiero saber qué pasa con devoluciones y mora en términos generales (y qué está pendiente de definir), para conocer mis riesgos.

### Inversor / pool

30. Como inversor, quiero una página que explique de dónde sale el rendimiento del pool, para entender el modelo.
31. Como inversor, quiero ver el ejemplo contable D8 (comisión 49, originación 28, salida del pool 679, diferencia bruta 21, administración ilustrativa, resto) calculado con la config, para ver cómo se reparte cada compra.
32. Como inversor, quiero entender los tramos junior y senior y quién absorbe pérdidas primero, para elegir mi riesgo.
33. Como inversor, quiero ver los riesgos explícitos (mora, rechazo de tarjeta, contracargo, liquidez en 6 cuotas), para no confundir cobertura con recupero garantizado.
34. Como inversor, quiero saber que todo movimiento del pool es verificable en la cadena (devnet en la demo), para auditarlo.
35. Como inversor, quiero que el rendimiento se muestre como "ilustrativo, no validado" junto a referencias DeFi rotuladas, para no leer una promesa.
36. Como inversor, quiero saber que la idea de tesorería propia en DeFi usa solo fondos propios y es simulada (roadmap), para saber que mi capital no se usa ahí.

### Jurado / visitante

37. Como jurado, quiero que el home cuente las decisiones vigentes (3/6 cuotas, cobertura 100%, el comercio elige cuándo cobrar), para evaluar el producto actual y no uno viejo.
38. Como jurado, quiero ver en el home accesos claros a "Estudiantes y familias", "Comercios" e "Inversores", para recorrer la propuesta según cada actor.
39. Como jurado, quiero ver comercios destacados en el home, para percibir el lado comercial del producto.
40. Como jurado, quiero ver una hoja de ruta honesta (minorista por QR, billeteras como canal, beneficios al fiador, tesorería propia simulada), para distinguir lo hecho de lo planeado.
41. Como jurado, quiero leer todo en inglés con el switch de idioma, porque evalúo en inglés.
42. Como jurado, quiero que todo diga que corre en devnet y es simulado, para no confundir la demo con operación real.
43. Como visitante en el celular, quiero un menú que me lleve a todas las secciones, para navegar sin pelear con el header.
44. Como visitante, quiero un footer con links a las páginas principales, para no tener que volver arriba.
45. Como usuario con `prefers-reduced-motion`, quiero que las animaciones nuevas tengan versión quieta.

## Implementation Decisions

### Términos del plan (mock) — la costura principal

- `ProtocolConfig` (espejo) suma campos **opcionales**, presentes en el mock y ausentes en el cliente real, igual que `installmentIntervalDays`:

```ts
export type InstallmentsOption = 1 | 3 | 6;
export interface PlanOption {
  installments: InstallmentsOption;
  /** Interés TOTAL del plan sobre el capital financiado (no anual). */
  interestTotalBps: Bps;
  enabled: boolean;
  /** Términos provisionales: la UI los rotula. */
  provisional: boolean;
}
export type SettlementId = "immediate" | "deferred_30" | "deferred_60" | "deferred_90";
export interface SettlementOption {
  id: SettlementId;
  /** Días desde la compra hasta que el comercio cobra. */
  days: number;
  /** Comisión sobre lo financiado; null = tarifa a confirmar. */
  feeBps: Bps | null;
  enabled: boolean;
  provisional: boolean;
}
// ProtocolConfig += planOptions?, settlementOptions?, originationBps? (D8 4%), adminFeeAnnualBps? (D8 2%)
```

- Valores mock: 3 cuotas (0, habilitada, no provisional), 6 cuotas (300 bps total, habilitada, provisional); cobro inmediato (0 días, 700 bps, habilitado, no provisional), a 30 días (625 bps), a 60 días (550 bps), a 90 días (525 bps), los tres habilitados y provisionales; originación 400 bps; administración 200 bps anual; **cobertura del fiador 10000 bps en los cuatro escalones con fiador**.
- `quote(price, student, options?)` con `options = { installments?, settlement? }`; por defecto 3 cuotas + inmediato, y el resultado por defecto queda **idéntico** al actual (1.000 en escalón 0 → comercio 951; cuotas 233,333333/233,333333/233,333334).
- Fórmulas (06): `I = A × i(n)`; cuotas `(A+I)/n` con la última absorbiendo el redondeo; comisión `F = A × f(liquidación)`; comercio recibe `P − F` en total: el anticipo `D` al abrir y `A − F` en la fecha de cobro (inmediato = todo al abrir, igual que hoy); cobertura requerida = 100% del capital financiado (interés y punitorios quedan fuera, pendiente contractual).
- `Quote` suma: cantidad de cuotas, interés total en bps, liquidación elegida y sus días, y bandera `provisional`. Opción inexistente, deshabilitada o con tarifa null → `eligible: false` con motivo nuevo `option_unavailable`.
- `openPlan` acepta las mismas opciones y guarda en el `Plan` una **copia inmutable de términos** (cantidad de cuotas, interés, liquidación, días, provisional, versión de términos). Cambiar la config no altera planes abiertos. Vencimientos cada 30 días.
- **Cobro diferido simulado en el mock:** `Sale` suma plazo, fecha de cobro y si ya se cobró; `Merchant` suma saldo pendiente de cobro y plazo predeterminado. El adelanto del pool al comercio ocurre en la fecha de cobro. `advanceDays` liquida exactamente una vez las ventas vencidas (idempotente). Nuevo método `setMerchantSettlement(owner, settlement)` en `CuotasClient` para fijar el predeterminado (el real lo rechaza con `option_unavailable`). Si `openPlan` no recibe plazo, usa el predeterminado del comercio.
- El cliente real no implementa opciones: con opciones por defecto se comporta igual que hoy; con otras, la cotización sale no elegible (`option_unavailable`) y `openPlan` falla con ese código.
- Un módulo de términos dentro de `lib/cuotas` expone helpers puros: opciones de plan y de cobro con fallback cuando la config no las trae (solo 3 cuotas + inmediato con `feeBps`), y el desglose D8 de una cotización (comisión, originación, adelanto al comercio, salida del pool, principal, diferencia bruta, administración ilustrativa de meses completos sobre saldo, resto). Debe reproducir la tabla de 09 con precisión de 6 decimales.
- Cambios a `CuotasClient` o tipos exportados se explican en el mensaje del commit.

### Directorio de comercios demo

- Módulo nuevo de directorio (datos estáticos tipados + funciones puras): categorías, comercios, productos, búsqueda y destacados.
- **Categorías** (de 08; sin comida ni gastos diarios): Electrónica y computación, Periféricos y accesorios, Librería y estudio, Herramientas y equipamiento, Cursos y formación, Servicio técnico. Ids estables en inglés o slug, etiquetas `{es, en}`.
- **Comercios:** ~10, incluido **Voltia** (Electrónica, dueño de los tres productos actuales `pc`, `notebook`, `curso` para no romper el guion de la demo). Cada uno: dirección base58 plausible y determinística sin texto legible, nombre inventado realista (sin marcas reales), categoría, ciudad (mayoría Tucumán: San Miguel de Tucumán, Yerba Buena; alguno "online"), descripción `{es, en}`, `featured`, `demo: true`, 2–3 productos.
- **Productos:** id único (slug), comercio dueño, nombre y descripción `{es, en}`, precio dentro de los topes vigentes (bandas de 08: 20–1.500 equivalentes), imagen en `/products/<id>.webp`. El catálogo existente pasa a tener campo de comercio; `getProduct` resuelve cualquier producto; la tienda sigue mostrando los de Voltia.
- Búsqueda: texto sin distinguir mayúsculas ni tildes sobre nombre, descripción, categoría y nombres de productos; filtro por categoría combinable; orden estable (destacados primero, luego alfabético).
- El mock siembra todos los comercios del directorio en su estado (bump de la clave de storage a v3) para que `getMerchant` y la atribución de ventas funcionen con cualquiera.
- Si falta la foto de un producto, la UI muestra un fallback (tile con gradiente de la categoría + inicial), nunca una imagen rota.

### Marketplace y perfil

- `/comercio`: buscador + chips de categoría (scroll horizontal en móvil) + grilla de tarjetas de comercio + estado vacío con "limpiar filtros". Estado de búsqueda reflejado en la URL (`?q=&cat=`) para compartir.
- `/comercio/[direccion]`: perfil del comercio del directorio (encabezado, categoría, ciudad, etiqueta demo, opciones aceptadas desde la config, productos con precio partido en cuotas y CTA al checkout). Si la dirección es válida pero no está en el directorio, mantiene la vista pública actual de comercio (datos en cadena/mock). Dirección inválida: estado honesto actual.
- La cuenta del comercio (`/app/comercio`) sigue siendo un panel privado distinto del marketplace.

### Páginas por audiencia

- Rutas: `/para-estudiantes` (estudiantes y familias, incluye fiador), `/para-comercios`, `/para-inversores`. Un set de primitivas compartidas (encabezado de página, sección, lista de pasos, FAQ accesible, callout de "provisional / demo / devnet", tarjeta de número con etiqueta) que cada página compone.
- Contenido según 06/07/08/09/05, con números de la config o de los helpers de términos, cifras de terceros desde las referencias existentes con etiqueta "referencia", sin nombrar competidores ni billeteras candidatas.
- Cada página termina con CTAs a la parte de la demo que le corresponde (tienda, cuenta comercio, pool).

### Home

- Hero y metadata: "3 cuotas sin interés · 6 con interés bajo" en vez de "sin interés" a secas.
- Nuevas secciones: "Para quién es" (tres tarjetas a las páginas por audiencia), "Elegí en cuántas cuotas" (3/6 desde la config), "Comercios adheridos · demo" (destacados del directorio, link al marketplace), "Qué viene" (minorista por link/QR, billeteras como canal, descuentos al fiador al día, tesorería propia simulada). Se actualizan beneficios y "Estado de la demo".

### Navegación y layout

- Header: Tienda · Comercios (marketplace) · Cómo funciona ▾ (Estudiantes y familias, Comercios, Inversores) · Cuenta · Pool, más el menú secundario existente. Hoja móvil con todos los destinos agrupados.
- Footer global con links a las páginas principales y la leyenda de devnet/demo.

### Responsive

- Objetivo: a 390×844 ninguna ruta tiene scroll horizontal (`scrollWidth ≤ clientWidth`), tap targets interactivos ≥ 40×40 px, texto de cuerpo ≥ 14 px (etiquetas mono ≥ 12 px). Se arregla la causa (grids, anchos fijos, tablas, `min-width`), no se tapa con `overflow-x: hidden` global.
- Tablas anchas → tarjetas apiladas o scroll horizontal contenido en su propio contenedor con indicación visual.
- Verificación visual a 390 y 1440 px en cada ticket de UI.

## Testing Decisions

- Un buen test prueba comportamiento externo por la interfaz pública (`CuotasClient`, helpers de términos, funciones del directorio), no detalles internos.
- **Costura 1 — `CuotasClient` mock** (vitest, prior art: `mock.test.ts`, `mock.open-plan.test.ts`, `mock.pay.test.ts`): caso por defecto idéntico (951, redondeos); 1 cuota rechazada (`option_unavailable`); 6 cuotas con 3% (1.000/escalón 0 → interés 21, total 1.021, seis cuotas que suman 721 exacto); opción deshabilitada o con tarifa null → `option_unavailable`; cobro a 30 días: el comercio recibe 300 al abrir y 656,25 al adelantar 30 días, una sola vez aunque se adelante de nuevo; el predeterminado del comercio se usa cuando `openPlan` no recibe plazo; cobertura 100% en todos los escalones; copia de términos en el plan inmune a cambios de config; pago de las 6 cuotas lleva a `Settled`.
- **Helpers de términos** (vitest): fallback sin opciones en la config; desglose D8 reproduce la tabla de 09 (49 / 28 / 651 / 679 / 700 / 21 / 2,333333 / 18,666667).
- **Directorio** (vitest): búsqueda sin tildes ni mayúsculas, filtro por categoría, combinación, sin resultados, destacados, direcciones únicas y válidas base58, ids de producto únicos, cada producto dentro del tope máximo vigente.
- **Cliente real** (prior art `real.test.ts`): opciones no por defecto → no elegible / error `option_unavailable`; por defecto sin cambios.
- **e2e Playwright** (prior art `app/e2e/*.spec.ts`), en el ticket de cierre: sin scroll horizontal a 390 px en todas las rutas públicas; marketplace (buscar, filtrar, abrir perfil, ir al checkout); checkout con 6 cuotas mostrando interés y etiqueta provisional; specs existentes actualizados a los copys nuevos.
- En cada ticket: `npm run typecheck && npm run lint && npm test && npm run build` en verde desde `app/`.

## Out of Scope

- Programa Anchor, cliente Codama generado, keeper, deploy a devnet, firmas o envíos de transacciones.
- Tasas definitivas (las de la demo son provisionales: 6 cuotas, cobro diferido, base del 7%), política de devoluciones, techo de fianza con interés/punitorios: se muestran como pendientes.
- Alta real de comercios, formularios que envíen datos, contacto con terceros, integración con billeteras o rampas.
- Implementar las ideas 10 y 11 (solo se explican como roadmap).
- Planes paralelos en el programa (sigue la divergencia documentada).
- Cambiar el diseño de marca (colores, fuentes, prisma): se usan los tokens y componentes existentes.

## Further Notes

- Divergencias nuevas a documentar al cierre en `proyecto/05-pitch.md` § Nota técnica y en `proyecto/04-plan.md` § Estado: 1/6 cuotas, cobertura 100% y opciones de cobro existen solo en el mock; el programa sigue con 3 cuotas, cobertura 100/90/80/70 y cobro inmediato.
- Registrar en `proyecto/06-decisiones-comerciales.md` (addendum) las decisiones del 2026-10-07: solo 3/6 cuotas, 3% total en 6 y escalera de cobro 7/6,25/5,5/5,25, provisionales, con link a `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`.
- La entrega para jurados (README) va en inglés; el README describe las páginas nuevas en el cierre.
