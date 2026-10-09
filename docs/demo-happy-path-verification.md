# Ticket 03 — verification evidence

Date: 2026-10-09. Branch: `t3-verificar-recorrido`, based on `main` at `5dfb706`. Isolated checkout: `/var/tmp/lazo-ticket03`. This report distinguishes local execution, controlled browser responses and observed devnet state. No real preparation or payment transaction was signed or sent.

## Local checks

| Check | Observed result |
|---|---|
| `npm run typecheck` | Passed, Node 24.13.0 |
| `npm run lint` | Passed, zero errors and warnings |
| `npm test` | 33 files, 380 tests passed |
| `npm run build` | Passed; optimized production build, all 50 pages generated |
| `npm run generate:check` | Generated client matches fresh IDL (`f77d8eaa44e3…`) |
| `NO_DNA=1 anchor build --arch v1 --ignore-keys` | Local rebuild only; no deployment |
| `NO_DNA=1 cargo test -p cuotas --lib` | 36 passed |
| `NO_DNA=1 cargo +stable test --manifest-path tests/Cargo.toml --no-fail-fast` | 142 LiteSVM acceptance tests passed against the freshly built artifact |

Verified artifact: 668,592 bytes, SHA-256 `ae370c733d8caa24630cfbcd291ae115ee9bb982cf31e48f037ebc1efbad9c19`. Its hash differs from the historical October 7 build; the current bytes were tested locally, not deployed.

## Browser verification

The final browser suite uses the isolated production server at `http://127.0.0.1:3015`, launched by `npm start -- --hostname 127.0.0.1 --port 3015`. Run from the isolated `app/` directory:

```sh
PW_BASE_URL=http://127.0.0.1:3015 npm run test:e2e
```

Final full-suite result: **56 passed, 1 intentionally skipped** (57 cases, 6.4 minutes). No failed or interrupted tests in the final run. All browser funds and receipts in this section are simulated. The real-mode entry test is intentionally skipped when testing the mock server.

The English recording rehearsal passed at 1440×1000 and 390×844, with reduced motion and only Tab/Enter. Reviewed screenshots show purchase review/success and installment review/success. It asserts down payment 300, financed 700, exact installments 233.333333 / 233.333333 / 233.333334, one paid and two pending after payment, remaining 466.666667, balance 1466.666667 from the initial mock balance of 2000, and unchanged 30/60/90-day dates. A full reload of the student page keeps the result. The review and success headings receive focus; progress exposes a live status and progress bar. Screenshots live in the ignored `app/test-results/demo-recording-*/` directories.

Before/after evidence:

- The old happy-path assertion expected no payment CTA; ticket 02 now supplies exactly one enabled action on the next unpaid installment.
- Lint originally reported four render-time ref errors and seven unused-variable warnings; the final lint run is clean.
- A reduced-motion landing test failed with `Hydration failed` (server video vs browser image, plus motion-dependent attributes); it passed after initial markup was made consistent using `useSyncExternalStore`.
- A runner regression covers delayed success, error and recheck results from an old identity; they cannot clear a newer run. Existing controlled rejection, double-click, expiry and uncertain-result tests remain green.
- The controlled restored-payment fixture is installed before the new document initializes its mock store and includes `paidAt` timestamps. The mock derives payment state from those timestamps; changing only the status label is inconsistent and its keeper recalculates it as unpaid. That initial fixture failure was not on-chain evidence or a payment bug.

The native computer-use service was unavailable in this session. Screenshots were captured by Playwright and visually inspected; Phantom interaction was not observed.

## Read-only devnet observations

At 21:23 UTC, finalized slot 509,313,188: deployed artifact remains `8d05b07f…2476`, protocol account count 0, devUSDC supply 0, deployer balance 0.22040056 SOL. The first buffer-close proposal was simulated successfully (2370 compute units), using dummy signatures and no private-key access; it was not sent. Current rent/funding quote and full addresses are in `demo-happy-path-readiness.md`.

## Outstanding acceptance criteria

Ticket 03 remains **blocked on the observed real run**, not done. It requires the selected student public address, an available authorized deployer/keeper environment, individually approved setup transactions, an active on-chain guarantee, funded accounts, the current artifact deployed and the protocol initialized with normal days. Then observe separate Phantom approvals for purchase and installment, record both public devnet receipt links and exact balances/dates/plan after reload in `demo-happy-path-runbook.md`.

No simulated signature is presented as a real receipt. Clearing browser storage does not clear real debt. The lateness explanation follows the current policy (student pays late penalties; the guarantor does not cover them). This take does not demonstrate arrears or guarantor recovery and does not claim to fix the known recovery penalty discrepancy.
