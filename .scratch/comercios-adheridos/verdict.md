# Verdict pass — comercios adheridos

Scored only the two open items from `review.md`; no new hunt. Evidence: dictionary (`tienda.ts`), fresh captures at the same 8 paths (13:24–13:25), `report.md`, commit `360d286`.

## verdict

- **resolved** — `dir.title` EN: dictionary now reads `title: "Affiliated stores"` (dictionaries/tienda.ts:101); rendered in the 13:25 `tienda-desktop-en-dir.png` / `-full.png`. Affiliation framing is consistent with ES "Comercios adheridos"; no partnership language remains on the section label.
- **resolved** — filter-capture freshness: `tienda-filter-libreria.png` remains the 13:20 pre-fix capture and was not re-shot; per the coordinator directive it is excluded from final evidence rather than shipped stale. Filter function stands on the builder's Playwright-verified report (LIBRERÍA→"1 de 4", CURSOS ONLINE→Aula Abierta, TODOS→all four) plus the already-reviewed `SegmentedControl` + `useState` filter path. Scored resolved-by-exclusion, not a defect.
- **preserved** — prior round findings stay resolved: lede/footer es+en ("perfiles ficticios, sin acuerdos reales" / test purchases through Voltia on devnet) and `.dirBand`→`.dirTick` horizontal beam-mark, all confirmed in the 13:24–13:25 captures.
- **regressions**: none. This batch changed one dictionary string and recaptured; commit `360d286` touches only the four scope files plus `.scratch` evidence.

## remaining

clear

## documentation preservation (verified against incumbent system)

1. Commit `360d286` confines source changes to the four scope files (`directory.ts` new; `tienda-page.tsx`, `store.module.css`, `tienda.ts` modified); `globals.css` untouched — no global token, utility, or primitive added or altered.
2. The section reuses incumbent primitives (GlassPanel, Chip, SegmentedControl, ReferenceTag, StateMark) and the module's own local aliases (`--ink-*`, `--violet`, `--ease`), matching the landing.module.css convention.
3. No DESIGN.md written — correct for this ordinary extension (preexisting absence, not a blocker); PRODUCT.md and the surface brief unchanged and still accurate.
4. No new dependency (builder reverted the npm-install lockfile diff); no hardcoded financial figures; `handlesDemo` unique to `voltia` with the row name driven by the live merchant record.
5. Builder's detector run over the four touched files returned `[]` (`.scratch/comercios-adheridos/detector.json`).

disposition: ship — earned on the scored fixes of this section, not a whole-surface verdict.
