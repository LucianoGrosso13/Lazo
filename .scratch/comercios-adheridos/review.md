disposition: fix

Read: 9 captures (desktop/mobile × es/en × -full/-dir at 13:23, plus tienda-filter-libreria.png at 13:20), tienda-page.tsx, store.module.css, directory.ts, dictionaries/tienda.ts, PRODUCT.md, surface brief, shot.mjs, craft-floor.md. Reviewed per degraded/finish-reviewer contract, fresh-eyes pass; updated once against the builder's post-feedback state (copy + bands landed 13:22–13:23).

## persistence

Pass.

- PRODUCT.md exists and is current; the extension honors its two hard constraints (devnet declared, simulated declared).
- DESIGN.md absent — preexisting gap, not a blocker for this pass (coordinator instruction).
- Surface brief `.impeccable/surfaces/app-src-app-page-tsx.md` governs; the extension stays inside the committed Prisma world. Code-led extension, no comp round required.
- Captures: all 8 required files exist, fresh (13:23) and valid. Mobile `-dir.png` files show the sticky nav over the lede — element-screenshot scroll artifact (`shot.mjs` scrolls before `dir.screenshot()`); the same content is unobscured in `-full.png`, authoritative for position. Capture overlays (circular "N", translate pill) are browser chrome, not page UI.
- `tienda-filter-libreria.png` (13:20) proves the filter works (LIBRERÍA selected, "1 DE 4", single row) but predates the copy/band fixes — shows the old lede and the removed neon bars. If it ships as evidence, it needs recapture; the 8 required captures are current.

**Preservación de sistema (verified):** the change is a strictly local extension. Git shows modifications confined to the four scope files — `tienda-page.tsx`, `store.module.css`, `dictionaries/tienda.ts` modified, `lib/directory.ts` new/untracked. `globals.css` untouched: no global token, utility or primitive was added or altered. The section reuses incumbent primitives (GlassPanel, Chip, SegmentedControl, ReferenceTag, StateMark) and the module's own local aliases (`--ink-2`, `--violet`, `--ease`), the same convention landing.module.css already uses. No new dependency, no hardcoded financial figures, no purchase affordance added; `handlesDemo` is unique to `voltia` and its display name comes from the live merchant record.

## fidelity

Judged against OWN-WORLD + incumbent system (no approved comp; code-led). Verdict on prior findings:

- resolved — `dir.lede` es+en: now "…perfiles ficticios, sin acuerdos comerciales reales" / "fictional profiles — no real commercial agreements exist". No processing claim, no nonexistence assertion; consistent with the demoTag chip and footer on the same panel. Verified in code and 13:23 captures.
- resolved — `dir.foot` es+en: "Las compras de prueba se procesan con {name} en devnet; los demás perfiles son ilustrativos" — truthful, Voltia-scoped, devnet-declared.
- resolved — `.dirBand` → `.dirTick`: the 4px × 3.1rem vertical neon bar is now a 1.4rem × 4px horizontal tick before each name, mild 9px bloom — the beam-segment mark, not a refused side accent. Verified in fresh captures, desktop and mobile.
- unresolved — `dir.title` EN still reads "Partner directory": keeps the partnership framing the feedback asked to drop, and diverges from ES "Comercios adheridos" (affiliation, not partnership). One-line dictionary fix ("Member stores" / "Affiliated stores" framing).
- match — everything else holds: placement after the grid, GlassPanel slab, `dirBeam` spectrum device, mono microcopy, `[data-demo]` inset wash on Voltia, localized filters/count/aria, `prefers-reduced-motion` covered, responsive stacking clean on 390px.
- no regressions from the fix batch: `.dirMeta` now pads `1.4rem + 0.6rem` to align under the name — verified aligned in captures.

## ceiling

One native device still unused: the `dirBeam` is static and filtering only removes rows — a band re-split/slide on filter change is the world's signature move. Not blocking for an editorial extension. Otherwise reached.

## material_fixes

1. `dir.title` EN — replace "Partner directory" with member/affiliated framing consistent with ES "Comercios adheridos" (residual partnership claim on the section's own label; coordinator feedback: label without partnerships).
2. Recapture `tienda-filter-libreria.png` if it ships as evidence — it predates the copy/band fixes and shows superseded UI.

## keep

Do not dilute: the `dirBeam` spectrum mapping (categories as bands of the split beam), the new tick-as-beam-segment motif, and the disclosure spine — `ReferenceTag` "ejemplos ficticios / fictional examples" in the h2, "Cobra en la demo" on Voltia, and the footer naming Voltia as the only processor on devnet.
