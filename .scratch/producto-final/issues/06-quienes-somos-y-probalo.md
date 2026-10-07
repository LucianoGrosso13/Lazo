# 06: Home — secciones nuevas "Quiénes somos" y "Probalo en 2 minutos"

**What to build:** dos componentes autocontenidos que el home monta: el equipo detrás de Lazo y una guía corta para que el jurado recorra la demo.

**Blocked by:** —

**Status:** done

**Archivos propios (todos nuevos):** `app/src/components/landing/quienes-somos.tsx`, `app/src/components/landing/probalo.tsx`, `app/src/components/landing/team.module.css`, `app/src/i18n/dictionaries/landing-equipo.ts`. No toques `page.tsx` ni `sections.tsx` (los integra 05 o el coordinador): exportá `QuienesSomos` y `Probalo`.

Notas:
- **Quiénes somos** (es + en, tono pulido y serio):
  - Encabezado sobre el problema: millones de jóvenes sin tarjeta ni historial no acceden a cuotas, y la alternativa sin tarjeta cuesta mucho más.
  - **Luciano Grosso**, 22 · Product Owner.
  - **Ignacio Albarracín**, 22 · Full Stack Developer.
  - Los dos: estudiantes de Ingeniería en Informática en la Universidad del Norte Santo Tomás de Aquino (UNSTA), se reciben en diciembre de 2026, amigos desde hace años.
  - Una línea de interés por persona (por ejemplo, "apasionado por la blockchain y los productos financieros").
  - **No** inventes logros, empresas ni métricas. **No** cuentes la anécdota de la PC. Sin fotos (monogramas con el estilo de `marketplace/monogram.tsx`).
- **Probalo en 2 minutos:** 5 pasos numerados con link:
  1. `/tienda` → elegí un producto;
  2. checkout con 6 cuotas;
  3. reloj de demo: adelantá 30 días y pagá o dejá vencer;
  4. `/app/comercio`: los tramos del comercio se liberan;
  5. `/app/comercio/mostrador`: generá un QR y abrilo en el celular.

  Una línea final: "Corre en Solana devnet: la plata es de prueba".
- Tokens y componentes de `components/ui/`; versión quieta con `prefers-reduced-motion`.

- [x] `QuienesSomos` y `Probalo` exportados, bilingües
- [x] Sin datos inventados más allá de lo que dice este ticket
- [x] Capturas 390/1440 en `evidence/06-*` (montalos en una página de prueba local que **no** se commitea)
- [x] typecheck / lint / test / build en verde
