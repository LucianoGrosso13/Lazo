# Demo happy path — devnet purchase + first installment

Status tracker for the `integration/demo-happy-path` branch. Local Markdown tickets — no GitHub issue IDs; reference paths below.

## Scope

Canonical spec (approved Q1–Q7 decisions): `.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md`.

Executable tickets, sequential DAG 01 → 02 → 03:

1. `.scratch/demo-happy-path-tickets/issues/01-compra-confirmada-y-calendario.md` — devnet purchase with real guarantee check, approval/processing/confirmed states, full schedule, first-installment highlight, lateness explainer.
2. `.scratch/demo-happy-path-tickets/issues/02-pagar-primera-cuota.md` — early payment of installment 1, updated plan/balance, real receipt, persistence across reload.
3. `.scratch/demo-happy-path-tickets/issues/03-verificar-recorrido-para-grabar.md` — full-journey verification and short EN recording runbook.

Background: `proyecto/12-demo-happy-path.md` (interview + done criteria), `proyecto/handoff-demo-devnet.md` (chain state: devnet still runs the pre-credit artifact; upgrade runbook in `programa/UPGRADE_DEVNET.md`), local tracker `docs/agents/issue-tracker.md`. Devnet environment readiness is tracked separately in `docs/demo-happy-path-readiness.md` (different owner — do not edit here). Client/UI contract: `~/.agents/work-notes/lazo-demo-happy-path/client-contract.md`.

## Status

- **Ticket 01 — purchase: client + UI integrated.** Observable progress (`preparing → awaiting_approval → sending → confirming → syncing`), `uncertain` errors carrying the original signature, `reconcileOperation`/`waitForOperation`, `insufficient_funds` pre-checks, deduplicated calls; checkout shows review → approval → processing → verified success, full calendar, lateness explainer, first-installment highlight. Merged head: `10fb29b`.
- **Ticket 02 — first-installment payment: integrated** (`a9c4252`). Own review + Phantom approval, frozen expected snapshot persisted per wallet+plan, verify-without-resend flow. Review fixes applied on integration: persisted snapshot keeps the signed installment (was overwritten with the live next unpaid), verification panel renders even when no installment is pending, and the review row shows the frozen index.
- **Ticket 03 — verification: partially covered.** EN recording runbook added (`docs/demo-happy-path-runbook.md`); the observed real run remains blocked as below.
- **Expiry metadata bridge: pending.** Client adds optional `lastValidBlockHeight` to `TxProgress`/`CuotasError`/`OperationSnapshot`; pending-op/pending-pay persistence and restore snapshot must propagate it (integration owns the minimal UI bridge if the payment commit lacks it).
- **Real Phantom/devnet validation: BLOCKED.** Readiness check (`docs/demo-happy-path-readiness.md`) shows the deployed program still runs the pre-credit artifact with zero protocol accounts and devUSDC supply 0; it also requires prepared accounts/funds and explicit per-transaction approval — signing, sending, funding and deploying are never automatic. Ticket 03 cannot be done without observed Phantom receipts.
- **Known limit:** the UI worker's broader suite run was interrupted at 52 files (15 pass, 1 fail: "admin registrar comercio") — uninvestigated; tracked as an open limitation, not assumed preexisting.
- Verification on this branch so far: `npm run typecheck` clean, `npx vitest run` 30 files / 362 tests green.
- Constraints: devnet only, test tokens only; every real transaction needs explicit approval and prior simulation; no secrets in repo or chat; business numbers come only from `ProtocolConfig`/quote/plan — the 1000/300/700 case is an acceptance expectation, not a constant.
