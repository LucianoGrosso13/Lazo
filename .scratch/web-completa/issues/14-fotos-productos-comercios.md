# 14: Fotos reales de los productos de los comercios demo

**What to build:** cada producto nuevo del directorio tiene una foto real, de licencia libre, consistente en estilo con las actuales, en `app/public/products/<id>.webp`.

**Blocked by:** 02

**Status:** done

**Archivos propios:** `app/public/products/*` (solo archivos nuevos; no reemplazar `pc.webp`, `notebook.webp`, `curso.webp`), nuevo `app/public/products/CREDITS.md`.

Notas:
- Fuente: Unsplash o Pexels (licencia que permite uso sin atribución obligatoria); igual registrar autor, URL y licencia de cada foto en `CREDITS.md`.
- Sin marcas visibles ni personas identificables. Fondo oscuro o neutro que conviva con la estética de vidrio oscuro.
- Formato: WebP, 1200×900 (4:3) recortado al centro, ≤ 120 KB cada una. El nombre de archivo es exactamente el id del producto del directorio.
- No editar código: si un id no tiene foto razonable, avisá al coordinador en vez de cambiar el directorio.

- [x] Una foto por cada producto del directorio sin imagen (lista sacada del código del 02)
- [x] WebP 4:3, ≤ 120 KB, sin marcas ni caras
- [x] `CREDITS.md` con autor, URL y licencia por archivo
- [x] Contact sheet en `.scratch/web-completa/evidence/14-contact-sheet.png`
- [x] build en verde
