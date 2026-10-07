# 03: Header, menú móvil, footer global, base responsive y esqueleto de páginas por audiencia

**What to build:** navegación nueva que lleva a todo (Tienda · Comercios · Cómo funciona ▾ · Cuenta · Pool + menú secundario), menú móvil cómodo, un footer global, base responsive compartida y las tres rutas por audiencia con un set de primitivas de página listas para que los tickets 09–11 escriban el contenido. Leé `.scratch/web-completa/spec.md` § "Navegación y layout", "Páginas por audiencia" y "Responsive".

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/app-header.tsx`, `app/src/app/layout.tsx`, `app/src/app/globals.css`, `app/src/i18n/dictionaries/common.ts`, la sección `chrome` de `app/src/i18n/dictionaries/design.ts`, nuevo `app/src/components/site-footer.tsx`, nuevo `app/src/components/audience/` (primitivas + tres archivos de contenido placeholder `para-estudiantes.tsx`, `para-comercios.tsx`, `para-inversores.tsx`), nuevas rutas `app/src/app/para-estudiantes/page.tsx`, `para-comercios/page.tsx`, `para-inversores/page.tsx` (con `metadata`), nuevo diccionario `app/src/i18n/dictionaries/audience-common.ts`.

Notas:
- "Cómo funciona ▾": Estudiantes y familias (`/para-estudiantes`), Comercios (`/para-comercios`), Inversores (`/para-inversores`). "Comercios" en la barra principal = marketplace `/comercio`. El link actual `/#how` puede quedar en el menú secundario.
- Menú móvil agrupado (Demo / Cómo funciona / Más), con el switch de idioma y el botón de wallet. Botón de menú ≥ 40×40.
- Primitivas: encabezado de página (eyebrow, título, bajada, CTAs), sección con título, lista de pasos numerados, FAQ accesible (`<details>` o botón con `aria-expanded`), callout con variantes `provisional` / `demo` / `devnet`, tarjeta de número con etiqueta y nota. Responsive por construcción. Los tickets 09–11 solo componen y escriben textos.
- Placeholders: cada página muestra el encabezado con título correcto y un aviso "contenido en preparación"; los tickets 09–11 reemplazan el archivo de contenido entero.
- Footer: links a home, tienda, comercios, las tres páginas, pool, cuenta; leyenda "Demo simulada · Solana devnet".
- Base responsive en `globals.css`: padding lateral consistente, `overflow-wrap` en direcciones largas, utilidades que sirvan a todos; nada de `overflow-x: hidden` global.

- [ ] Nav de escritorio con dropdown accesible (teclado, Escape, click afuera) y estado activo
- [ ] Menú móvil con todos los destinos agrupados; botón ≥ 40×40; se cierra al navegar
- [ ] Footer global visible en todas las rutas, apilado en móvil
- [ ] Tres rutas nuevas con metadata, usando las primitivas; primitivas documentadas con un comentario de uso breve
- [ ] A 390 px: header sin solapamientos en `/`, `/tienda`, `/app/estudiante`, `/para-comercios` (el reloj de demo lo arregla el 04; coordiná solo si tu header le cambia la altura)
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/03-*`
- [ ] typecheck / lint / test / build en verde
