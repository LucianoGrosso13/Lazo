# 06: Marketplace de comercios (/comercio) y perfil del comercio

**What to build:** `/comercio` es un marketplace: barra buscadora, chips de categoría, grilla de comercios demo y estado vacío; `/comercio/[direccion]` muestra el perfil del comercio con sus productos comprables (precio partido en cuotas y CTA al checkout). Leé `.scratch/web-completa/spec.md` § "Marketplace y perfil".

**Blocked by:** 01, 02

**Status:** done

**Archivos propios:** `app/src/app/comercio/page.tsx`, `app/src/app/comercio/[direccion]/page.tsx`, nuevo `app/src/components/marketplace/`, nuevo diccionario `app/src/i18n/dictionaries/marketplace.ts`. Solo lectura de `components/cuenta/comercio.tsx` (podés importar `ComercioPublico`/`ComercioView` para direcciones fuera del directorio; no lo edites, es del ticket 07).

Notas:
- Usar las funciones del directorio (`lib/merchants`) y `quote()`/helpers de términos para "desde N cuotas de X" y las opciones aceptadas (3 sin interés / 6 con interés provisional).
- Búsqueda y categoría reflejadas en la URL (`?q=&cat=`), con debounce corto; chips con scroll horizontal contenido en móvil; resultados con `aria-live`.
- Tarjeta de comercio: inicial/monograma con gradiente de su categoría, nombre, categoría, ciudad, etiqueta "demo", cantidad de productos, destacado si corresponde. Foto de producto con fallback (tile de gradiente + inicial) si la imagen no existe — `next/image` no debe mostrar ícono roto.
- Perfil: encabezado, descripción, etiqueta demo, plazo de cobro del comercio si aporta, productos con CTA a `/checkout/<id>`. Dirección válida pero fuera del directorio → vista pública actual. Inválida → estado honesto actual.
- Un aviso discreto: "Comercios de ejemplo para la demo; no son aliados reales".

- [x] Buscar por nombre, producto o categoría, sin importar tildes/mayúsculas; filtrar por categoría; combinar; limpiar filtros
- [x] Estado vacío útil; URL compartible con el filtro
- [x] Perfil con productos y CTA al checkout de ese producto; Voltia muestra sus 3 productos
- [x] Etiqueta "demo" visible en tarjetas y perfil; sin marcas reales
- [x] Sin scroll horizontal a 390 px; tap targets ≥ 40×40
- [x] Capturas 390/1440 (lista, filtro activo, vacío, perfil) en `.scratch/web-completa/evidence/06-*`
- [x] typecheck / lint / test / build en verde
