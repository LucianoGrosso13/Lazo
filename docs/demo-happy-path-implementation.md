# Demo happy path — devnet purchase + first installment

Status tracker for the `integration/demo-happy-path` branch. Local Markdown tickets — no GitHub issue IDs; reference paths below.

## Scope

Canonical spec (approved Q1–Q7 decisions): `.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md`.

Executable tickets, sequential DAG 01 → 02 → 03:

1. `.scratch/demo-happy-path-tickets/issues/01-compra-confirmada-y-calendario.md` — devnet purchase with real guarantee check, approval/processing/confirmed states, full schedule, first-installment highlight, lateness explainer.
2. `.scratch/demo-happy-path-tickets/issues/02-pagar-primera-cuota.md` — early payment of installment 1, updated plan/balance, real receipt, persistence across reload.
3. `.scratch/demo-happy-path-tickets/issues/03-verificar-recorrido-para-grabar.md` — full-journey verification and short EN recording runbook.

Background: `proyecto/12-demo-happy-path.md` (interview + done criteria), `proyecto/handoff-demo-devnet.md` (chain state: devnet still runs the pre-credit artifact; upgrade runbook in `programa/UPGRADE_DEVNET.md`), local tracker `docs/agents/issue-tracker.md`. Devnet environment readiness is tracked separately in `docs/demo-happy-path-readiness.md` (different owner — do not edit here).

## Status

- **Implementation: pending.** Tickets 01–03 are `ready-for-agent`; this branch carries no `app/` changes yet.
- **Real devnet validation: blocked.** It requires prepared accounts/funds and explicit per-transaction approval — signing, sending, funding and deploying are never automatic. Ticket 03 stays open until an observed Phantom run with public devnet receipts exists; automated or controlled-transport evidence does not mark it done.
- Constraints: devnet only, test tokens only; every real transaction needs explicit approval and prior simulation; no secrets in repo or chat; business numbers come only from `ProtocolConfig`/quote/plan — the 1000/300/700 case is an acceptance expectation, not a constant.
