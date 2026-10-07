# 02: Directorio de comercios demo (datos, búsqueda, catálogo y siembra del mock)

**What to build:** un directorio tipado de ~10 comercios ficticios con categorías y productos, funciones puras de búsqueda/filtro/destacados, el catálogo extendido a todos los productos (cada uno con su comercio) y el mock sembrado con todos los comercios para que se pueda comprar en cualquiera. Leé `.scratch/web-completa/spec.md` § "Directorio de comercios demo" y `proyecto/08-minorista-y-economia.md` § "Categorías y tickets".

**Blocked by:** None (can start immediately)

**Status:** done

**Archivos propios:** nuevo `app/src/lib/merchants/` (datos + funciones + tests), `app/src/lib/catalog.ts`, `app/src/lib/cuotas/mock/state.ts`, `app/src/lib/cuotas/mock.persistence.test.ts`, `app/src/lib/cuotas/format.ts` (solo si agregás constantes de direcciones). Ediciones mínimas de tipos en consumidores de `CATALOG`/`Product` solo si hacen falta para compilar (listarlas en el `worker_done`).

Notas:
- Categorías (ids estables, etiquetas `{es, en}`): Electrónica y computación, Periféricos y accesorios, Librería y estudio, Herramientas y equipamiento, Cursos y formación, Servicio técnico.
- Voltia (`DEMO_MERCHANT`, Electrónica) conserva los productos `pc`, `notebook`, `curso` con los mismos precios: el guion de la demo y `/checkout/pc` no cambian. La tienda seguirá filtrando por Voltia.
- Nombres inventados realistas, sin marcas reales ni parecidos a marcas. Direcciones base58 válidas (32 bytes) determinísticas sin palabras legibles. Ciudades: mayoría San Miguel de Tucumán / Yerba Buena, alguno "Online". 3–4 `featured`.
- Productos: 2–3 por comercio, precios entre ~20 y 1.500 USDC (nunca por encima del tope máximo de la config), imagen `/products/<id>.webp` (las fotos las trae el ticket 14; no hace falta que existan todavía).
- Búsqueda: sin distinguir mayúsculas ni tildes; sobre nombre, descripción, categoría (ambos idiomas) y nombres de productos; filtro por categoría combinable; orden: destacados primero, después alfabético.
- `state.ts`: sembrar todos los comercios (nombre, activo, saldo 0, sin ventas salvo lo que ya sembraba Voltia) y subir `STORAGE_KEY` a `lazo.mock.v3`.

- [x] ~10 comercios en 6 categorías, todos con `demo: true`, direcciones únicas y válidas
- [x] ids de producto únicos; todos los precios ≤ tope máximo de la config; Voltia conserva `pc`/`notebook`/`curso`
- [x] Tests: búsqueda con y sin tildes/mayúsculas, por producto, por categoría, combinada, sin resultados, destacados, orden estable
- [x] `getProduct` resuelve cualquier producto y expone su comercio; `getMerchant` del mock funciona para todos los comercios
- [x] Storage v3 con test de persistencia actualizado
- [x] typecheck / lint / test / build en verde
