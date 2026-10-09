# Happy-path demo — integration handoff

Date: 2026-10-09. Branch `integration/demo-happy-path` (head `6fd7892`), draft PR [#6](https://github.com/LucianoGrosso13/Lazo/pull/6) → `main`. Spec: `.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md`; tickets 01→02→03 under `.scratch/demo-happy-path-tickets/issues/`.

## What is integrated

- **Ticket 01 — purchase:** cuotas client with observable progress (`preparing → awaiting_approval → sending → confirming → syncing`), `uncertain` errors carrying the original signature, `reconcileOperation`/`waitForOperation` (read-only, never resends), deduplicated calls; checkout review → approval → processing → verified success with full calendar, lateness explainer and first-installment highlight.
- **Ticket 02 — first installment:** own review + separate wallet approval, persisted pending-payment snapshot keyed by wallet+plan, verify-without-resend; review fixes frozen the signed installment in the persisted snapshot, made the verification panel reachable with no pending installment, and pinned the review row to the frozen index.
- **Expiry metadata:** optional `lastValidBlockHeight` flows client → `OpenFlowState` → `pending-op`/`pending-pay` persistence → restore/reconcile snapshots; expiry is only actionable via finalized block height + fresh absence check, never a clock timer.
- **Docs:** `docs/demo-happy-path-implementation.md` (status), `docs/demo-happy-path-runbook.md` (EN recording guide), `docs/demo-happy-path-readiness.md` (read-only env check).

## Verification on this branch

- `npm run typecheck`: clean.
- `eslint` on all touched checkout/cuotas/cuenta/dict files: **0 errors**, 6 pre-existing unused-var warnings.
- `npm run build`: exit 0, all routes compiled.
- `vitest` focused: 17 files / 256 tests (checkout + cuotas) green; checkout-only run 7 files / 34 tests green.
- `playwright` (mock, 2 specs): `checkout-happy-path` (3 cases) + `checkout-first-payment` (1 case) — **4/4 green** after updating a stale ticket-01 assertion (the calendar now hosts the installment-1 pay CTA by design).
- Controlled mock pass on mobile EN (`/home/chato/.agents/work-notes/lazo-demo-happy-path/visual-close.md`): 390×844 viewport, `lazo.locale=en`, `reducedMotion` emulated; full journey purchase → pay installment 1 → receipt; all 4 CTAs reachable by real keyboard (Tab+Enter); horizontal overflow 0px. Amounts shown at full precision where relevant (e.g. US$ 233.333333); two-decimal figures like ≈US$ 466.67 are rounded display, not exact values.

## Open limits

- **Real Phantom/devnet walkthrough: BLOCKED.** Deployed artifact does not match the current program source/client (pre-credit build); zero protocol accounts; devUSDC supply 0; prepared accounts/funds and explicit per-transaction approvals are required before the take (see readiness doc + runbook). Ticket 03 cannot be claimed without observed Phantom receipts.
- The UI worker's broader suite run was interrupted at 52 files (15 pass, 1 fail "admin registrar comercio") — uninvestigated, documented as an open limitation.
- One e2e flake observed: a reused dev server on the suite port died mid-run (`ERR_CONNECTION_REFUSED`); rerun against a live server was green. Not an app regression.

## What remains

- Program upgrade + protocol init on devnet (`programa/UPGRADE_DEVNET.md`), prepared accounts (merchant, pool liquidity, eligible student with real active guarantor, devUSDC ≥ 533.333333, devnet SOL).
- Execute the recorded take per the EN runbook with real Phantom approvals and public devnet receipts (Solana Explorer, `cluster=devnet`).
- Investigate or explicitly waive the interrupted-suite failure before merge.
