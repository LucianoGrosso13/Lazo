# 11: Páginas para estudiantes/familias e inversores — tiers, fiador obligatorio y copy profesional

**What to build:**
- `/para-estudiantes`: 3 o 6 cuotas (6 desde US$ 350, 3% total), tiers con nombre y reglas, "sin fiador no hay plan", el fiador cubre capital + interés (no el punitorio), línea de mora con leyenda. Se saca el descuento al fiador y el camino sin fiador.
- `/para-inversores`: rendimiento objetivo del tramo senior, supuestos del modelo rotulados como tales, cómo los tramos del comercio quedan comprometidos y por qué el pool no abre planes sin liquidez, D8 con la config. Fuera "ilustrativo" y "provisional".

**Blocked by:** 01

**Status:** ready

**Archivos propios:** `app/src/components/audience/{para-estudiantes.tsx,para-inversores.tsx,primitives.tsx}`, `app/src/i18n/dictionaries/{para-estudiantes.ts,para-inversores.ts,audience-common.ts}`, `app/src/app/para-estudiantes/page.tsx`, `app/src/app/para-inversores/page.tsx` (metadata).

Notas:
- La metadata de `/para-estudiantes` hoy dice "6 con interés provisional… escalera…": reescribir.
- `primitives.tsx` tiene un callout "provisional": convertirlo en "Supuestos" o sacarlo (lo usa también 10: no rompas su API; si la cambiás, mantené la variante vieja hasta que el coordinador integre).
- Reglas de tiers y leyenda de mora con el mismo texto que 05 (copiá la estructura del spec, valores desde la config).

- [ ] Estudiantes: 3/6 con mínimo, tiers + reglas, fiador obligatorio y cobertura con interés
- [ ] Inversores: objetivo, supuestos, tramos comprometidos y liquidez
- [ ] Sin descuento al fiador ni camino sin fiador; cero "provisional", "ilustrativo" o "escalón"
- [ ] 390/1440; capturas `evidence/11-*`
- [ ] typecheck / lint / test / build en verde
