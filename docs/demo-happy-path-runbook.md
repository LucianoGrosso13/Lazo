# Demo happy path — recording runbook (devnet)

Short guide to run and repeat the agreed take: connect Phantom, buy the demo PC with a real down payment in devUSDC, show the confirmed purchase and schedule, then pay the first installment early and end with two pending. Devnet only — test tokens with no value. **Nothing in this guide signs, sends, funds or deploys by itself: every real transaction requires explicit approval from the user, one by one, after simulation.**

## Current status

- App flow (purchase + first-installment payment): merged into `main` through PR #6; verification fixes are on `t3-verificar-recorrido`. Automated tests use controlled transports and simulated funds.
- Real devnet run: **not yet observed** — see "Blocking prerequisites". Until a real run is recorded, this guide is a rehearsal checklist, not evidence.

## Blocking prerequisites (verify before recording)

Tracked in `docs/demo-happy-path-readiness.md` (read-only check):

- The deployed program still runs the pre-credit artifact — `open_plan`/`pay_installment` are NOT on devnet yet. Upgrade + protocol init per `programa/UPGRADE_DEVNET.md` is required first.
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

Select **EN** before recording. The purchase CTA reads “Pay down payment & open plan”; its review ends with “Sign & open plan”. The installment has a separate “Approve & pay” action. Show the token, destination and network in each review. SOL is only fee/account funding; it is not the token used for the down payment or installment.

The protocol must use `seconds_per_day=86400` and a 30-day installment interval for this take. Do not run an arrears keeper or advance the demo clock. The schedule should remain 30/60/90 normal days from the recorded opening time; paying early must not move the remaining dates.

## Controlled rehearsal and accessibility

Use Node.js 24.13+ as required by the README, then install the app dependencies. From `app/`:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

`e2e/demo-recording.spec.ts` rehearses the English journey at 1440×1000 and 390×844, using only Tab/Enter and reduced motion. It checks the exact stored installment amounts, remaining debt, wallet balance, unchanged due dates, persistence after reload, and restoration of an uncertain payment without resending. Screenshots are saved to the ignored `app/test-results/` directory. These screenshots and assertions are **mock evidence**, not Phantom approvals or on-chain receipts.

Review and success headings receive focus on transitions. Processing exposes a progress bar and live status text. Reduced motion uses a static prism and keeps the same processing information. A successful mock run does not prove that a real wallet approved or paid anything.

Rejecting a wallet approval is covered by controlled client/runner tests: it must not show success. After an uncertain send, use “Verify on chain” to query the **original signature**; do not approve a fresh payment while its result is unknown. Reloading restores the pending operation for the same wallet/plan. These checks must not create extra devnet transactions.

## Expected amounts (acceptance case)

Down payment 300; financed 700; installments 233.333333 / 233.333333 / 233.333334 (the last absorbs rounding); after the first payment, remaining 466.666667. UI may abbreviate as ≈233.33 / ≈466.67 (rounded display — full precision stays accessible). All numbers come from `ProtocolConfig`/quote/plan, never hardcoded.

## Repeating the take

A real on-chain plan cannot be deleted by clearing browser storage. To retake: use another prepared eligible wallet, or settle/close the previous plan through authorized operations. Never present browser cleanup as debt removal.

## Evidence to collect

- Public devnet signatures (Solana Explorer, `cluster=devnet`) for purchase and installment payment, with date and resulting plan state.
- Wallet devUSDC balance before/after; SOL identified separately as fee funding.
- No seed phrases, private keys or credentials in any recording or doc.

## Real-run evidence (pending)

| Field | Observed value |
|---|---|
| Network and observation date | Pending real Phantom run; devnet only |
| Student public address | Pending operator selection |
| Purchase receipt | Pending — no real purchase signed or sent |
| Installment receipt | Pending — no real installment signed or sent |
| Opening time and the three due dates | Pending chain reads |
| devUSDC balance before purchase / after purchase / after installment | Pending chain reads |
| Plan after reload | Pending chain read: installment 1 Paid, two pending, exactly 466.666667 remaining |

Complete this table with public devnet Explorer links and real decoded state only after the authorized take. Until then, ticket 03 remains blocked on the real run.
