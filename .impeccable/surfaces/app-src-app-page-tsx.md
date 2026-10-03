---
version: 1
slug: "app-src-app-page-tsx"
primary_target: "app/src/app/page.tsx"
related_targets: ["app/src/app"]
---

# Surface brief: Lazo (landing + app)

**Scope and mode:** `/` landing is **Persuade** (jurados y estudiantes deciden probar). `/tienda`, `/checkout/[producto]`, `/panel`, `/comercio`, `/pool`, `/fiador/[invitacion]` and the guided demo are **Operate** inside the same world: scanability first, the world lives in material, numbers and state marks. Fiador screens are the calmest register of the world (trust over spectacle).

**Audience and action:** estudiante sin tarjeta → "Comprar en 3 cuotas sin interés"; jurado → "Ver la demo guiada (3 min)"; fiadora → entender cuánto puede llegar a pagar y aceptar. Proof: real numbers from the protocol config, Explorer links, devnet badge always visible.

**Constraints:** devnet only, declared on screen. Third-party figures labeled "referencia". ES default with EN toggle. `prefers-reduced-motion` gets a still, fully legible state. WebGL has a static fallback.

## Direction contract

THESIS: A purchase is a beam of white light; Lazo's glass splits it into anticipo + 3 cuotas, and the fiador is the backlight that refills any band that goes dark. Refuses the category default: a dark DeFi dashboard of identical glass metric cards with a gradient sticker.

OWN-WORLD: Near-black violet ground (#07060B family). One thick refractive glass slab is the hero object; light disperses across the Solana spectrum (violet #9945FF → cyan #00C2FF → green #19FB9B). White light = price/neutral; spectrum = money in motion; grey band = the alternative (MP). Glass panels are thick with visible edges, inner highlight and refraction, never flat frosted cards. State is a mark on the glass: paid = etched, due = lit, late = cracked, recovered = refilled by backlight. Numbers in a tabular face at headline scale; size is billing (0%, lo que cobra el comercio).

STORY: In one viewport the visitor sees US$1.000 enter the glass and leave as 300 + 3 × 233,33 with 0% interest, next to MP's longer grey beam (~1.290, referencia). They understand the fiador only pays if the student doesn't, and press the CTA or start the guided demo.

FIRST VIEWPORT: Slab centered-left at ~60% width; the beam enters from the left edge labelled with the price; four spectral bands exit right, each labelled with its amount; a price slider (120–1.500) and product chips re-split the beam live; tier chips (escalón 0–3) shorten the anticipo band. Wordmark "Lazo" + devnet badge + ES/EN + Conectar wallet top. Headline and primary CTA "Comprar en 3 cuotas sin interés" sit in the right third; secondary "Ver demo guiada".

FORM: Prisma, candidate 5 of 7 on the ordered list; seed key 0eda7312. Raises: state as marks (from cutting bench); light reacts to pointer/scroll velocity with real WebGL (from plankton); demo clock as a beam travelling a day ruler with tabular stamps 1/3/6/15 (from daylight section); headline-scale key numbers (from painted poster).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

**Signature interaction:** dragging price/tier re-refracts the beam live; during mora the late band cracks, then the backlight (fiador) floods it and an Explorer receipt chip appears.
**Motion grammar:** light moves, glass doesn't. Transitions are refraction shifts (bands slide/re-split, ~400–700ms, ease-out), no bouncy cards, no scattered hover effects.
**Build path:** code-led (no image generation available).
