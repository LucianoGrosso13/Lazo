# Handoff — rediseño UI (2026-10-09)

**Estado:** cerrado. Spec `.scratch/rediseno-ui/spec.md`, tickets `.scratch/rediseno-ui/issues/01-12`, evidencia `.scratch/rediseno-ui/evidence/`. Rama de integración `t4-rediseno-ui`, mergeada en `main` y desplegada en https://lazo-cuotas.vercel.app.

## Qué cambió

| Área | Cambio |
|---|---|
| Textos | "estudiante" → "comprador", "fiador" → "garante", "fianza" → "garantía" (EN: student → buyer). Rutas (`/app/estudiante`, `/fiador/[token]`, `/para-estudiantes`), claves, ids y tipos sin cambios. |
| Roles | Checkout, confirmación y éxito sin montos ni plazos del comercio. Panel del garante sin eventos `Advance`. Tienda pública sin chip de plazo de cobro. |
| Simulación | Sin "Datos simulados" ni "Mock" en cuentas; `ModeBadge` solo aparece en modo real. |
| Base visual | Tokens `--accent*` por `data-role` (buyer/merchant/pool/investor) y primitivas en `components/ui/visual-primitives.tsx` + `count-up-number.tsx` (contratos en `components/ui/README.md`). |
| Pool | Orbe WebGL (`components/pool-orb/`) que refleja disponible vs prestado; respaldo CSS y versión estática con reduced-motion; rendimiento con count-up, medidor, historial plegable y barras de referencia. |
| Landing | Pasos del garante animados, línea de mora automática (loop, pausa, reduced-motion), costos con % grandes y barras en US$ (`cfteaTotalCost` en `split.ts`), "Los números de Lazo" en barras. |
| Comercio | Cobrado + Garantizado por cobrar (tramos con fecha), mostrador debajo, ventas plegables. |
| Comprador | Credencial de Tier, progreso al próximo Tier (`comprador/tier-progress.ts`), planes con anillo, accesos como tarjetas. |
| Admin | Franja con 4 KPIs, planes por estado y "requiere atención". |
| Cómo funciona | `/para-estudiantes`, `/para-comercios`, `/para-inversores` con el set común y acento por rol. |

## Verificación

typecheck y lint (0 errores), 398 tests Vitest, `next build`, Playwright **87 pasaron / 1 omitido (modo real)** contra `next start`. Recorrido extra: 14 rutas × 4 personas a 390 px sin "fiador", "fianza", "Datos simulados" ni "Mock" visibles y sin scroll horizontal.

## Para retomar

- Playwright usa el puerto fijo 3012: con varios worktrees en paralelo, correr con `PW_BASE_URL` y un puerto propio.
- El node por defecto del shell es 20: anteponer `~/.nvm/versions/node/v24.13.0/bin` al PATH (vitest falla con 20).
- Pendiente fuera de esta tanda: reflejar "garante" en `proyecto/05-pitch.md`, `05-entrega-en.md` y `CLAUDE.md`. Divergencia mock ↔ programa sin cambios (ver `05-pitch.md` § Nota técnica).
