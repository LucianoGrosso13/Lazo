---
format: 1920x1080
duration: 114s
message: "Lazo lets people with income but no credit card pay in installments, backed by a trusted guarantor and a shared credit pool on Solana."
arc: Pain → Context → Who/what → How (buyer) → How (merchant) → Why Solana → Ask → Plate
audience: Colosseum / Superteam Argentina judges
mode: autonomous
---

# Lazo — video pitch 2:00 · v1

## Decisions

- **Message:** having an income should be enough to get access to credit; Lazo is the credit layer that makes it happen.
- **Audience and arc:** hackathon judges. Pain → context → who and what → how it works for the buyer → for the merchant → why Solana → ask → closing plate.
- **Format:** 1920×1080, 30 fps, ~1:54 (hard cap 2:00). Founders' voice from the footage (no TTS), soft music bed with ducking, no subtitles.
- **Spine:** the fixed shot of Luciano and Ignacio passing the mic. Every visual support **enters over the shot and leaves**, Monid-style, and only three times does it take the full screen (INDEC, pool, plate). The **Lazo prism** (logo) is the recurring prop: it appears on the name, returns at the center of the pool diagram, and closes the plate.
- **Brand (from `app/src/app/globals.css` and the live home):** background abyss `#07060b` / `#0d0a17`, ink `#f4f1ff`, ink-2 `#b9b3d6`, ghost `#6a6488`, accents violet `#9945ff`, cyan `#00c2ff`, green `#19fb9b` (one per beat, never all three together except in the prism gradient). Display: Bricolage Grotesque 700–800. Mono: Martian Mono (figures, chips, labels).
- **Chips** ("Simulator", "Prototype", "Planned integration", "Running on Solana devnet"): small Martian Mono pill, 22 px, ghost border, green dot.
- **Bans:** no partner logos; no Explorer; no fake screenshots of the app (the cards are faithful HTML recreations, labeled "Simulator"); no subtitles; no white panels (Monid's structure, not its palette); no neon glow on text.
- **Motion failures to avoid:** slideshow (a card on every sentence) and screensaver (motion that says nothing). The overlays enter on the word that names them.
- **Held frame:** the closing line "earning a living should be enough to get access to credit" plays on camera with nothing on screen.

## Build (8/10)

- Master edit: `assets/footage/edit.mp4` (107.67 s), generated with ffmpeg from `Ultima.MP4` + `Intento 3` (offset 0.136 s), 12 ms audio fades at each splice.
- `index.html` = take + camera re-framings; one sub-composition per block in `compositions/` (the pool panel `s06b-pool` sits on its own track, over the 06→07 seam).
- Pending: music (HeyGen catalog; requires the heygen CLI).

## Cut list (source = `Intento 3 completo.m4a`; video = audio + 0.136 s)

| Clip | Source (s) | Timeline (s) | Speaker | Content |
|---|---|---|---|---|
| C1 | 23.15–31.30 | 0.00–8.15 | left | B1 "Imagine… banking system." |
| C2a | 31.30–40.68 | 8.15–17.53 | right | B2 "In Argentina… credit history," |
| C2b | 58.15–67.79 | 17.53–27.17 | right | B2 "millions of workers… pay over time." (splice covered by INDEC panel) |
| C3 | 90.75–100.85 | 27.17–37.27 | left | B3 "We are Luciano and Ignacio… every single day." |
| C4 | 110.95–132.95 | 37.27–59.27 | right → left | B4 + B5 continuous (mic handoff at ~51.7) |
| C5 | 141.95–155.30 | 59.27–72.62 | right | B6 merchants + pool |
| C6 | 213.50–231.90 | 72.63–91.03 | left | B7 "That pool lives on Solana… next purchase." (clean take) |
| C7 | 337.80–354.45 | 91.03–107.67 | right | B8 ask + close |
| Plate | — | 107.38–114.00 (crossfade) | — | music up |

Uncovered seams (C2→C3, C4→C5, C6→C7) change scale (wide ↔ 1.08 punch) so the jump reads as a camera change.

## Locked (plan v1, approved by Luciano 8/10)

- Plan approved. Sketches first; after that, build the whole video without stopping at checkpoints.
- Left (Nike t-shirt) = **Luciano Grosso · Product Owner**. Right = **Ignacio Albarracín · Full Stack Developer**.
- Music: HeyGen catalog (option b). Requires the heygen CLI (Luciano installs it).

## Frame 1 — Hook

- scene: Fixed wide shot. Toward the end, "Income ≠ access to credit" types in at the top left.
- duration: 8.15s
- transition_in: cut
- voiceover: "Imagine working hard every single day, earning a steady income and remaining completely invisible to the banking system."
- src: compositions/s01-hook.html
- status: animated
- motion: typewriter (registry) on the overlay; slow push 1.00 → 1.03 on the shot
- why: states the pain in the viewer's language before naming anything.

## Frame 2 — Argentina

- scene: On "over 40%", a large "45%" count-up at the top left with chip "INDEC · informal employment · 31 urban areas · Q2 2026 · provisional". From 15.6 to 20.6 s, full screen: "45%" stays and a three-step chain draws "No paystub → No credit history → No credit card". Back to the shot: chip "No way to pay over time".
- duration: 19.02s
- transition_in: cut
- voiceover: "In Argentina, over 40% of the workforce operates in the informal economy. Without a formal paystub or traditional credit history, millions of workers and students are locked out of basic financial tools like credit cards. They simply have no way to pay over time."
- src: compositions/s02-argentina.html
- status: animated
- motion: count-up (registry); chain with scaleX on the arrows; panel in/out with clip-path wipe left
- why: concrete scale of the problem with its source; the panel covers the C2a→C2b splice.

## Frame 3 — Who we are and Lazo

- scene: Lower-thirds with name and role on each person (Luciano Grosso · Product Owner / Ignacio Albarracín · Full Stack Developer). On "Lazo", the prism logo + "Lazo" typed in large at the center (Monid's "Monid✱" moment). Then a small diagram at the right: "People" → [Lazo] → "Fintech wallets", chip "Planned integration".
- duration: 10.1s
- transition_in: cut (punch 1.08)
- voiceover: "We are Luciano and Ignacio, and we are building Lazo, a credit layer that plugs directly into the fintech wallets people already use every single day."
- src: compositions/s03-lazo.html
- status: animated
- motion: lt-kicker-name (registry); typewriter on "Lazo"; nodes enter with stagger
- why: who is speaking and what they are building, in one sentence.

## Frame 4 — Plans and guarantor

- scene: Card at the left (faithful to the checkout): "Choose your installments" — row "3 · interest-free · 3 × US$ 233.33" and row "6 · 3% total"; the 3 is highlighted on "three", the 6 on "six". Chip "Simulator". On "A trusted person backs your plan", second card: "Guarantor · Active ✓ · Covers your plan".
- duration: 14.45s
- transition_in: cut
- voiceover: "We enable a buy now, pay later model where users can split purchases into three interest-free monthly payments, or six with a small interest charge. A trusted person backs your plan."
- src: compositions/s04-planes.html
- status: animated
- motion: card slide-in from left; highlight moves between rows on the word; guarantor card stacks on top
- why: the offer: 3 interest-free or 6 with interest, and the guarantor that makes it possible.

## Frame 5 — Buyer: 3 steps

- scene: Three cards at the bottom right, one per word: "1 · Pick your product" → "2 · Choose installments" → "3 · Confirm ✓". Chip "Simulator".
- duration: 7.55s
- transition_in: none (continuous take)
- voiceover: "For buyers, there are three simple steps. Pick your product, choose the installments and confirm your purchase."
- src: compositions/s05-comprador.html
- status: animated
- motion: cards switching in place (Monid 29–37 s), check stroke drawn at the end
- why: shows that buying is simple.

## Frame 6 — Merchant and pool

- scene: Settlement card at the right: "US$ 1,000 price · 300 down payment · 700 financed · −49 fee (7%) · **951 today**", with 951 counting up. On "shared credit pool" (≈66 s), full screen: diagram Pool → Merchant (green arrow "paid upfront") and Buyer → Pool (cyan arrow "installments"), a loop that closes on "fills it back up".
- duration: 13.35s
- transition_in: cut (wide)
- voiceover: "For merchants, it's easy. They get paid upfront for a small fee, while the customer pays over time. The money comes from a shared credit pool, and every repayment fills it back up."
- src: compositions/s06-comercio.html
- status: animated
- motion: count-up on 951; arrows drawn with stroke-dashoffset; the pool fills (level rises)
- why: the merchant gets paid today; the pool explains where the money comes from.

## Frame 7 — Why Solana

- scene: The pool diagram holds until "lives on Solana": the pool gets the "Solana program" label and then the panel leaves. Over the shot, terminal block at the bottom left with the program's real instructions: `open_plan` · `release_payout` · `pay_installment` · `crank_mark_late`, chip "Prototype". On "recorded on chain", small ledger card with rows "loan · repayment · repayment" that land one by one and return to the pool. Chip "Running on Solana devnet".
- duration: 18.4s
- transition_in: cut (covered by the full-screen panel)
- voiceover: "That pool lives on Solana. It runs as a program that pays merchants and collects installments automatically, by rules anyone can check. Every loan and repayment is recorded on chain, and each payment flows back into the pool in seconds, ready to fund the next purchase."
- src: compositions/s07-solana.html
- status: animated
- motion: code-terminal-run (registry) for the instructions; ledger rows with stagger
- why: Solana's role is concrete: an auditable program, not decoration.

## Frame 8 — Ask

- scene: Chip "First pilot · Argentina" on the first line. Card at the right (Monid's investor list): "Looking for" → "Fintech partners", "Investors", items that appear on the word. On "because earning a living…", everything leaves: held frame.
- duration: 16.9s
- transition_in: cut (punch 1.08)
- voiceover: "We're launching our first pilot in Argentina, and we're looking for fintech partners and investors to join us in scaling credit access across the country, because earning a living should be enough to get access to credit."
- src: compositions/s08-pedido.html
- status: animated
- motion: list items with stagger; everything exits 0.4 s before the closing line
- why: clear ask; the closing line lands on its own.

## Frame 9 — Plate

- scene: Full screen abyss. Logo loop (`logo-prisma-loop.webm`) at the center, "Lazo" below it, the line "Earning a living should be enough to get access to credit." in ink-2, URL `lazo-cuotas.vercel.app` and chip "Running on Solana devnet". Music rises and closes.
- duration: 6.1s
- transition_in: crossfade 0.6s
- voiceover: (music only)
- src: compositions/s09-placa.html
- status: animated
- motion: logo and type staggered; fade to black over the last 0.8 s
- why: designed close with name, promise and where to try it.
