# Reglas para los workers (leer antes de cada ticket)

1. Leé `AGENTS.md` (raíz), `app/AGENTS.md` (Next.js 16: leé `app/node_modules/next/dist/docs/` antes de usar APIs de Next), `PRODUCT.md`, `.scratch/lazo-front/spec.md` y tu ticket.
2. Si tu ticket toca UI: leé el contrato de dirección en `.impeccable/surfaces/app-src-app-page-tsx.md` y usá la skill `impeccable` (`.agents/skills/impeccable/SKILL.md`, en especial `reference/craft-floor.md`). Si existe `src/components/ui/`, usá esos componentes y tokens; no inventes otros colores ni otras fuentes.
3. **Solo devnet.** Nunca mainnet, nunca claves privadas ni frases semilla en el código ni en archivos. Nada de firmas reales en modo mock.
4. Las pantallas hablan con la cadena **solo** a través de `@/lib/cuotas` (`getCuotas()`) y `useCuotasQuery`. Si cambiás la interfaz `CuotasClient`, explicalo en el mensaje del commit.
5. Ningún número de negocio hardcodeado en la UI: sale de `getConfig()`/`quote()`. Las cifras de terceros salen de `REFERENCE_FIGURES` y se etiquetan "referencia".
6. Textos: un diccionario por pantalla en `app/src/i18n/dictionaries/<pantalla>.ts` con `defineDict({ es, en })`. Español rioplatense claro; inglés correcto. Nunca texto suelto en el JSX.
7. Tocá **solo** los archivos que tu ticket dice que te pertenecen. Si necesitás cambiar algo fuera, preguntá con `ask` al coordinador.
8. Antes de terminar, desde `app/`: `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` tienen que pasar. Si tu ticket es de UI, levantá `npm run dev` y revisá la pantalla.
9. Commits chicos en tu rama, en español, terminando con la línea `Co-Authored-By: Devin SWE-2 <noreply@cognition.ai>`. No hagas push a `main` ni merge a `front-esqueleto`: eso lo hace el coordinador.
10. Tildá los criterios de tu ticket en el archivo del ticket y cambiá `Status` a `done`.
