# 08: Componente <Prism> (WebGL con fallback)

**What to build:** el objeto firma de Lazo: un bloque de vidrio donde entra un haz blanco (el precio) y sale partido en bandas espectrales (anticipo + 3 cuotas), con una banda gris de comparación (MP). Reacciona a la velocidad del puntero y del scroll; las bandas se re-refractan con animación cuando cambian los montos.

**Blocked by:** 07

**Status:** done

**Archivos tuyos:** `app/src/components/prism/**`, una sección nueva en `app/src/app/design/` para mostrarlo, `package.json` si agregás una dependencia (justificala en el commit; preferí WebGL propio u `ogl` antes que three.js).

- [x] API: `<Prism input={{ label, amount }} bands={[{ id, label, amount, kind: "down" | "installment" | "merchant" }]} comparison={{ label, amount }} state?={{ bandId: "cracked" | "refilled" | "etched" }} size="hero" | "compact" />`. El ancho de cada banda es proporcional al monto
- [x] WebGL: refracción del vidrio, dispersión espectral, brillo que responde a la velocidad del puntero/scroll; 60 fps en una laptop común; se pausa fuera de pantalla
- [x] Cambios de montos animados como desplazamiento de luz (400-700 ms, ease-out), sin rebotes
- [x] Estados de banda: `cracked` (rajadura visible), `refilled` (la luz de atrás, el fiador, llena la banda), `etched` (pagada)
- [x] Fallback SVG/CSS con el mismo layout si no hay WebGL o con `prefers-reduced-motion` (quieto y legible)
- [x] Las etiquetas y montos son HTML real superpuesto (accesibles, traducibles), no texto dibujado en el canvas
- [x] Demo en `/design` con un slider de precio y botones para los estados
- [x] typecheck, lint, test y build pasan
