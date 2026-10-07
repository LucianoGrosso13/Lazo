# 13: Paneles de estudiante, fiador y cuenta — términos del plan y responsive

**What to build:** el panel del estudiante muestra, por plan, cantidad de cuotas, interés total (si tiene), si es provisional y el comercio; los paneles del fiador y las pantallas de cuenta se usan bien a 390 px; el fiador ve que su cobertura es 100% del capital pendiente.

**Blocked by:** 01

**Status:** ready-for-agent

**Archivos propios:** `app/src/components/cuenta/estudiante.tsx`, `cuenta/fiador/*`, `cuenta/account-shell.tsx`, `cuenta/account-context.tsx` (solo si hace falta), `cuenta/mock-account.tsx`, `cuenta/invitar-fiador.tsx`, `cuenta/consulta.tsx`, `cuenta/evidencia.tsx`, `app/src/app/(cuenta)/app/page.tsx`, `app/src/app/(cuenta)/app/estudiante/page.tsx`, `app/src/app/account/*`, `app/src/app/fiador/*`, diccionarios `account.ts`, `cuentas.ts`, `fiador-cuenta.ts`, `invitacion-cuenta.ts`. **No tocar** `cuenta/comercio.tsx`, `pool.tsx`, `admin.tsx`.

Notas:
- Términos desde `plan.terms` (ticket 01); planes viejos sin `terms` se muestran como 3 cuotas sin interés.
- Lista de cuotas de 6 filas legible en móvil.
- Audit 390 px: `/account` no tiene padding lateral (el contenedor `max-w-3xl space-y-6` toca los bordes); tabs de rol en `/app` de 24 px de alto → ≥ 40.
- No tocar la lógica de fianza server-side (`lib/server/*`, `FIADOR_COVERAGE_POLICY`): solo presentación.

- [ ] Panel del estudiante con cuotas/interés/provisional/comercio por plan
- [ ] Fiador: texto de cobertura 100% del capital pendiente, sin prometer cobertura de interés/recargos
- [ ] `/account`, `/app`, `/app/estudiante`, `/fiador/<token>` sin scroll horizontal y con padding correcto a 390 px; tap targets ≥ 40×40
- [ ] Capturas 390/1440 en `.scratch/web-completa/evidence/13-*`
- [ ] typecheck / lint / test / build en verde
