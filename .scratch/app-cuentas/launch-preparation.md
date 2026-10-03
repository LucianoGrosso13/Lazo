# Preparación de lanzamiento Orca — no ejecutar antes del gate

## Identidad y modelo

- CLI elegido: `/Users/lucianogrosso/.local/bin/orca` (`orca`); variables ORCA_CLI_COMMAND/ORCA_DEV_REPO_ROOT no definidas en los comandos del turno.
- Run: `run_fa4df6a795be`; coordinador propio: `term_6a23fe28-b133-4cd7-98c5-6b00490d5046`.
- `devin` resuelve a `/Users/lucianogrosso/.local/bin/devin`; `devin models list` enumera `swe-2-max`.
- `devin --help` confirma `--model`, `--permission-mode dangerous`, `--respect-workspace-trust false`.
- No worker lanzado. La disponibilidad del modelo no demuestra un modelo efectivo de worker.

## Camino documentado de custom argv

`worker-start --help` y `agent-context` no enumeran un id Devin admitido ni un override de modelo para Devin. **No adivinar `--agent devin` ni sustituirlo por otro agente.** El camino de terminal real y adopción está documentado en low-level-topology:

1. Revalidar approval.md y disponibilidad del slice/contratos; inventariar Runs, Tasks, workers con paginación y terminales relevantes. Volver a listar si cambió el runtime/handle.
2. Crear la Task aprobada, con target, resultado, restricciones, edits permitidos y aceptación observable. No crear Tasks equivalentes a intentos existentes.
3. Crear una terminal real en el worktree exacto asignado con el comando `/Users/lucianogrosso/.local/bin/devin --model swe-2-max --permission-mode dangerous --respect-workspace-trust false`. No pasar prompt ni trabajo antes de readiness.
4. Esperar `terminal wait --for tui-idle --timeout-ms 60000`; leer `satisfied`, no asumir readiness. Usar las condiciones/recovery de la guía si falla.
5. Adoptar con `worker-start --task <id> --terminal <handle-real> --worktree <selector-exacto> --run run_fa4df6a795be --from term_6a23fe28-b133-4cd7-98c5-6b00490d5046`. No usar `dispatch --inject` como ownership supervisado.
6. Verificar receipt, Dispatch, ownership y `worker-show`/transcript/argv efectivo. Si Orca no puede adoptar la identidad Devin, preservar el recurso y reportar el bloqueo; no iniciar otro intento por silencio ni declarar supervisión falsa.

La terminal propia del coordinador es protegida. No cerrar ninguna terminal preexistente ni usar kills amplios. Máximo tres workers útiles simultáneos; scopes no solapados o worktrees aislados si hay conflictos de checkout/index. Git, dependencias y configuración compartida quedan con el coordinador.

## Aceptación y cleanup

- Procesar `worker_done` solo del Dispatch esperado y comprobar resultado/evidencia.
- Antes del ACK elegir owner siguiente: follow-up inmediato al mismo agente, retención solicitada por usuario o release inmediato.
- Release con `worker-release` después de settlement aceptado; revisar receipt y aplicar recovery documentado si queda incierto. No reemplazar por `terminal close`.
- Reviews Standards/Spec: Tasks independientes read-only, ambos Devin SWE-2 Max verificado, comparando una base fija. El coordinador integra/arregla dentro de su scope autorizado.
- Al cerrar la ola, listar reclaimable del Run y verificar cero o registrar cada bloqueo de cleanup.

## Estado actual

Gate pendiente; cero Tasks/Dispatches/workers. Inventario global: 13 Runs previos sin este repo, nextCursor null; 77 workers sin este repo, hasMore false. Inventario del Run propio tras creación: Tasks vacías, workers vacíos y reclaimable vacío.
