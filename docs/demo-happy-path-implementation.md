# Demo happy path — devnet purchase + first installment

Status tracker: tickets 01/02 merged into `main` through PR #6; ticket 03 fixes and evidence live on `t3-verificar-recorrido`. Local Markdown tickets — no GitHub issue IDs; reference paths below.

## Scope

Canonical spec (approved Q1–Q7 decisions): `.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md`.

Executable tickets, sequential DAG 01 → 02 → 03:

1. `.scratch/demo-happy-path-tickets/issues/01-compra-confirmada-y-calendario.md` — devnet purchase with real guarantee check, approval/processing/confirmed states, full schedule, first-installment highlight, lateness explainer.
2. `.scratch/demo-happy-path-tickets/issues/02-pagar-primera-cuota.md` — early payment of installment 1, updated plan/balance, real receipt, persistence across reload.
3. `.scratch/demo-happy-path-tickets/issues/03-verificar-recorrido-para-grabar.md` — full-journey verification and short EN recording runbook.

Background: `proyecto/12-demo-happy-path.md` (interview + done criteria), `proyecto/handoff-demo-devnet.md` (chain state: devnet still runs the pre-credit artifact; upgrade runbook in `programa/UPGRADE_DEVNET.md`), local tracker `docs/agents/issue-tracker.md`. Devnet environment readiness and the unsigned first preparation proposal are tracked in `docs/demo-happy-path-readiness.md`. Client/UI contract: `~/.agents/work-notes/lazo-demo-happy-path/client-contract.md`.

## Status

- **Ticket 01 — purchase: client + UI integrated.** Observable progress (`preparing → awaiting_approval → sending → confirming → syncing`), `uncertain` errors carrying the original signature, `reconcileOperation`/`waitForOperation`, `insufficient_funds` pre-checks, deduplicated calls; checkout shows review → approval → processing → verified success, full calendar, lateness explainer, first-installment highlight. Merged head: `10fb29b`.
- **Ticket 02 — first-installment payment: integrated** (`a9c4252`). Own review + Phantom approval, frozen expected snapshot persisted per wallet+plan, verify-without-resend flow. Review fixes applied on integration: persisted snapshot keeps the signed installment (was overwritten with the live next unpaid), verification panel renders even when no installment is pending, and the review row shows the frozen index.
- **Ticket 03 — verification: partially covered.** EN recording runbook added (`docs/demo-happy-path-runbook.md`); the observed real run remains blocked as below.
- **Expiry metadata: integrated end to end** (`0187d22` client + `0e8a4ab` UI bridge). Optional `lastValidBlockHeight` flows from `TxProgress`/`CuotasError`/`OperationSnapshot` through `OpenFlowState` (running/uncertain), `pending-op`/`pending-pay` save+load, and the restore/reconcile snapshots for purchase and payment — expiry is only actionable via finalized height + absence on reverify, never a clock timer.
- **Real Phantom/devnet validation: BLOCKED.** Readiness check (`docs/demo-happy-path-readiness.md`) shows the deployed program still runs the pre-credit artifact with zero protocol accounts and devUSDC supply 0; it also requires prepared accounts/funds and explicit per-transaction approval — signing, sending, funding and deploying are never automatic. Ticket 03 cannot be done without observed Phantom receipts.
- **Admin registration check:** the previously reported failure did not reproduce; all five admin e2e cases passed in the ticket 03 verification run. No admin mutation behavior was changed.
- Ticket 03 verification: typecheck, lint (zero warnings), production build and 33 Vitest files / 380 tests passed. The rebuilt local program passed 36 host tests and 142 LiteSVM acceptance tests, and `generate:check` confirmed Codama matches the fresh IDL. Full browser results are recorded in `docs/demo-happy-path-verification.md`.
- Constraints: devnet only, test tokens only; every real transaction needs explicit approval and prior simulation; no secrets in repo or chat; business numbers come only from `ProtocolConfig`/quote/plan — the 1000/300/700 case is an acceptance expectation, not a constant.

## Ticket 03 corrections

- Removed render-time ref reads/writes, keeping the restored installment index in React state via the runner subscription. The subscription is installed before restoration, so an uncertain payment opens its verification panel after reload. Its review retains the original installment amount even if a later plan read advances the next unpaid installment.
- Prevented late results from a reset runner generation from clearing a newer run; covered success, error and reconciliation results with regression tests.
- Focus moves to review/success headings for keyboard navigation. Added EN desktop/mobile Tab/Enter rehearsals, precise amount/date/persistence checks, and a controlled uncertain-payment restore that cannot resend.
- Fixed reduced-motion landing hydration: initial server/browser markup agrees, starting with a static brand before enhancing when motion is permitted. An e2e test failed on the original hydration error and passed after the fix.
- Updated the stale calendar assertion to expect the ticket 02 payment CTA, removed unused variables, and made the Vitest config explicitly ESM (`.mts`). Tests require Node 24.13+ as documented in the README.
- The upgrade runbook now uses normal 30/60/90-day dates for this take and records the newly rebuilt artifact rather than treating the historical hash as current.

**Not done:** observed Phantom/devnet purchase and installment receipts. No actual preparation or payment transaction was signed or sent; the first buffer-close proposal was only simulated.
