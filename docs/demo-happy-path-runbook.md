# Demo happy path — recording runbook (devnet)

Short guide to run and repeat the agreed take: connect Phantom, buy the demo PC with a real down payment in devUSDC, show the confirmed purchase and schedule, then pay the first installment early and end with two pending. Devnet only — test tokens with no value. **Nothing in this guide signs, sends, funds or deploys by itself: every real transaction requires explicit approval from the user, one by one, after simulation.**

## Current status

- App flow (purchase + first-installment payment): implemented on `integration/demo-happy-path` and covered by automated tests with controlled transports.
- Real devnet run: **not yet observed** — see "Blocking prerequisites". Until a real run is recorded, this guide is a rehearsal checklist, not evidence.

## Blocking prerequisites (verify before recording)

Tracked in `docs/demo-happy-path-readiness.md` (read-only check):

- The deployed devnet artifact does not match the current program source/client (pre-credit build). Upgrade + protocol init per `programa/UPGRADE_DEVNET.md` is required first.
- Zero protocol accounts today; devUSDC mint exists with supply 0.
- Needed before the take: protocol initialized, merchant registered, pool liquidity for the case, an eligible student wallet with a **real active guarantee** (the mock's preloaded guarantor does not count), devUSDC ≥ down payment + first installment (exactly 533.333333: 300 + 233.333333), and devnet SOL for fees/accounts.
- Every funding/init/upgrade transaction is proposed, simulated, and approved explicitly — never automatic.

## The take (reference case)

1. Connect Phantom on devnet; show devnet badge and devUSDC balance.
2. Open checkout for the PC — reference case: price 1000 devUSDC, down payment 300, financed 700 in 3 interest-free installments. Review amount, token, destination and network.
3. Approve the down payment in Phantom (first explicit approval). Watch "confirming" state until the transaction confirms on chain.
4. Success screen: down payment paid (300), remaining balance (700), the three installments with real dates (≈30/60/90 days), first installment highlighted, lateness explainer, real devnet receipt link.
5. Pay the first installment early: its own review and a separate Phantom approval. Expected result: "Installment 1 paid" · "2 installments left to pay", remaining balance exactly 466.666667, wallet balance updated, own receipt.
6. Reload the page — plan, paid installment and balances persist (read from chain).

## Expected amounts (acceptance case)

Down payment 300; financed 700; installments 233.333333 / 233.333333 / 233.333334 (the last absorbs rounding); after the first payment, remaining 466.666667. UI may abbreviate as ≈233.33 / ≈466.67 (rounded display — full precision stays accessible). All numbers come from `ProtocolConfig`/quote/plan, never hardcoded.

## Repeating the take

A real on-chain plan cannot be deleted by clearing browser storage. To retake: use another prepared eligible wallet, or settle/close the previous plan through authorized operations. Never present browser cleanup as debt removal.

## Evidence to collect

- Public devnet signatures (Solana Explorer, `cluster=devnet`) for purchase and installment payment, with date and resulting plan state.
- Wallet devUSDC balance before/after; SOL identified separately as fee funding.
- No seed phrases, private keys or credentials in any recording or doc.
