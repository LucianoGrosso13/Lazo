# 13: Plan de negocio y decisiones — 6 cuotas al 3% y cobro en tramos, documentado y modelado

**What to build:** los documentos del equipo dejan de decir "provisional" y cuentan la política decidida con su análisis:
- **Doc 10:** comparación 2,5% vs 3% y comisiones neutras con tramos.
- **Addendum en 06:** decisiones del 2026-10-07.
- **Plan de negocio v3:** sobre la política vigente (7% base; 6,25 / 5,75 / 5,25% con tramos; 6 cuotas al 3% desde US$ 350; fiador obligatorio con cobertura de capital + interés; sin descuento al fiador).
- **Modelo y gráficos** regenerados.

**Blocked by:** —

**Status:** done

**Archivos propios:** `proyecto/10-tasa-6-cuotas-y-cobro-diferido.md`, `proyecto/research/modelo-tarifas-6-cuotas-y-diferido.py`, `proyecto/06-decisiones-comerciales.md` (addendum al final), `proyecto/09-alcance-opcion-h-y-mejoras.md` (marcar el descuento al fiador como descartado y el mostrador como MVP), `proyecto/07-plan-de-negocio/**`, `CLAUDE.md` (solo § "Qué es").

Notas:
- **Doc 10:** estado "Decidido 2026-10-07". Tabla de 2,5% vs 3%:

  | Interés | Margen | US$ 1.000, cliente que repite | Escenario malo | Un cliente nuevo da ganancia desde |
  |---|---:|---:|---:|---:|
  | 2,5% | 1,50% | +13,59 | −57,47 | US$ 267 |
  | 3% | 1,84% | +17,04 | −54,28 | US$ 217 |

  Mínimo de US$ 350 como colchón sobre los 217. Sección nueva "Cobro en tramos": la fórmula de exposición con tramos (lo que el pool desembolsó menos lo que cobró al estudiante, mes a mes), neutras 6,10 / 5,65 / 5,23, propuesta 6,25 / 5,75 / 5,25, por qué con tramos alineados Lazo casi no adelanta capital, y el modelo "compromiso en la cadena + chequeo de liquidez" (por qué **no** una bóveda bloqueada desde el día 1: el capital saldría igual y no habría ahorro que justifique la rebaja).
- **Script:** sumá la función de tramos y que imprima las dos tablas. Debe seguir reproduciendo los números de 08 (asserts).
- **`07-plan-de-negocio/`:** `modelo-v2.py` → `modelo-v3.py` con la política vigente (no borres v2: es antecedente). Regenerá los gráficos que cambian, reescribí `plan-de-negocio.md` y `pitch-negocio.md` sobre v3 y dejá una nota arriba de qué cambió respecto de v2. Si una cifra de v2 no se puede rehacer con v3, decilo en vez de copiarla.
- Supuestos rotulados como hipótesis, nunca como métricas de Lazo.
- **`CLAUDE.md` § "Qué es":** reflejar lo decidido (sin "provisionales"; 60 días al 5,75%; tramos; fiador obligatorio; 6 cuotas en el programa).

- [x] Doc 10 decidido, con las dos tablas y la sección de tramos
- [x] Script con tramos, reproducible (`python3 -I …`)
- [x] Addendum en 06; 09 marcado
- [x] `modelo-v3.py` + gráficos + plan y pitch de negocio reescritos
- [x] `CLAUDE.md` § "Qué es" al día
