# 11: Dashboard del admin

**What to build:** arriba del panel de admin, una franja de dashboard: **4 KPIs grandes** con BigNumber (planes activos, volumen financiado, % en mora, liquidez del pool), un **gráfico de planes por estado** (al día / gracia / mora / cobrado al garante; barras CSS/SVG, sin librería nueva) y una lista **"Requiere atención"** (planes en mora o con revisión pendiente, con enlace o acción si ya existe). Todo derivado del snapshot que el panel ya carga; ninguna métrica inventada. Las secciones actuales quedan abajo.

**Blocked by:** 01, 03

**Status:** ready-for-agent · **Asignado:** Claude (Sonnet)

**Archivos propios:** `components/cuenta/admin.tsx` (o archivos nuevos en `components/cuenta/admin/`), `i18n/dictionaries/admin-cuenta.ts`.

- [ ] 4 KPIs, el gráfico por estado y "Requiere atención" con datos del snapshot
- [ ] Después de adelantar el reloj hasta la mora, los KPIs y el gráfico cambian (e2e)
- [ ] `admin.spec.ts` en verde; capturas 390/1440 en `evidence/11-*`
