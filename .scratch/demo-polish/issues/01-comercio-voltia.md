# 01 — El comercio demo tiene nombre real: "Voltia"

**Status:** done · **Depende de:** — · **Tamaño:** S

## Objetivo

El comercio de la tienda demo hoy se llama "Tienda Demo" y su address dice `LazoTiendaDemo11111…` a la vista. Pasa a llamarse **Voltia** (nombre inventado pero realista, tipo retailer de electrónica) y la address pasa a un base58 plausible sin texto legible.

## Archivos propios

- `app/src/lib/cuotas/format.ts` — `DEMO_MERCHANT` → nuevo string base58 de 43-44 chars (sin `0`, `O`, `I`, `l`; que parezca una pubkey real, ej. `7KV…`). Comentario que diga que es una address fake de demo.
- `app/src/lib/cuotas/mock/state.ts` — `name: "Voltia"` en el seed; `STORAGE_KEY` → `lazo.mock.v2` (así el nombre viejo no queda persistido en localStorage de quienes ya entraron).
- `app/src/lib/cuotas/accounts.ts` — fallback `"Tienda Demo"` → `"Voltia"` (~línea 495).
- `app/src/i18n/dictionaries/checkout.ts` — `merchantFallback` es/en → "Voltia".
- `app/src/lib/cuotas/mock.test.ts` — el test que afirma `"Tienda Demo"` (~línea 36) → `"Voltia"`.
- Buscá y actualizá cualquier otra referencia: `rg -n "Tienda Demo|LazoTiendaDemo"` en `app/`, `docs/`, `proyecto/`, `README.md`. En docs de entrega (README inglés) el nombre puede quedar como "Voltia (demo store)".

## Criterios

- [x] `rg "Tienda Demo|LazoTiendaDemo"` no devuelve nada fuera de esta spec/históricos.
- [x] La tienda muestra "Cobra **Voltia**" y el comprobante/confirmación dicen Voltia.
- [x] Estado viejo en localStorage no resucita el nombre viejo (bump de `STORAGE_KEY`).
- [x] `npm run typecheck && npm run lint && npm test && npm run build` en verde.

## Notas

- `DEMO_MERCHANT` también aparece en `app/src/lib/cuotas/format.ts` con `DEMO_STUDENT_TIER3`: solo cambiar el merchant, no el estudiante.
- El seed on-chain (`app/scripts/seed.ts`) no guarda nombre (el programa no lo persiste): no tocar.
