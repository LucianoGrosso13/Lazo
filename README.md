# Lazo

**Zero-interest installments, backed by family.**

Lazo lets a student without a credit card buy in **3 interest-free USDC
installments**. A family member acts as guarantor with a capped backup card
(Didit KYC + Mobbex sandbox) and only pays if the student doesn't. An onchain
liquidity pool pays the merchant instantly, and an onchain reputation ladder
rewards paying on time: each completed plan lowers the down payment and raises
the spending cap.

Built at the Colosseum Crypto World's Fair — Superteam Argentina track.

> ## ⚠️ Devnet & sandbox only — no real money anywhere
>
> - **Solana devnet only** (the test network). Never mainnet. The frontend
>   refuses non-devnet RPC endpoints at runtime via a devnet genesis-hash
>   check (`app/src/lib/cuotas/real.ts`).
> - **devUSDC is a private test mint** — 6-decimal SPL token with **zero real
>   value**. It is not USDC.
> - **Didit (KYC) and Mobbex (cards) run in sandbox/test mode only.**
>   `MOBBEX_TEST_MODE` must be exactly `true`; anything else refuses to run.
> - The default frontend mode is a **browser mock**: it simulates the entire
>   product with no chain and no cards.
> - Seed phrases and private keys are never requested, shown, or stored in
>   this repo. Every transaction that signs or sends requires an explicit
>   operator approval.

## How it works

1. **Guarantor onboarding (no wallet needed).** The student sends a WhatsApp
   invite link. The family member opens it, completes Didit-hosted KYC,
   registers a test card on a Mobbex-hosted page, and accepts a surety cap —
   the maximum they could ever be charged. Card data never touches our
   server.
2. **Purchase.** The student picks a product in the demo store and pays the
   down payment in devUSDC. The pool finances the rest; the merchant is paid
   instantly (price − 7% of the financed amount) and carries no default risk.
3. **Repayment.** 3 installments, 0% interest. Grace days, a late penalty,
   and the guarantor charge day all come from the onchain `ProtocolConfig` —
   nothing business-related is hardcoded in the UI.
4. **Default & recovery.** A permissionless crank marks a plan late; the
   keeper proposes charging the guarantor's card and registers the recovery
   onchain. A registered default drops the student's reputation tier
   (`late_count`) and blocks new plans.
5. **Reputation ladder.** Each fully-paid plan climbs a tier: lower down
   payment, higher cap (30% down / US$1,000 cap at tier 0 → 0% down /
   US$1,500 at tier 3). The reputation lives in the wallet — any merchant can
   read it.

```text
Student (Phantom, devnet)                                    Guarantor (no wallet)
   │ down payment + 3 cuotas                                  │ invite link (HMAC, 72h)
   ▼                                                          ▼
open_plan ──────────────▶  cuotas program (devnet)  ◀── keeper_register_guarantee
   │                          ▲      │                          ▲
   │ pool finances            │      └─ pays merchant instantly  │ mandate hash
   ▼                          │                                 │
Liquidity pool (junior/senior LP shares, auditable onchain)     │
   │                                                          │
   └── Keeper CLI (dry-run by default): mark late → propose ───┘
        card charge (Mobbex sandbox) → register recovery onchain
        — every effect needs --execute --approved-by <name> --yes
```

## Architecture

| Path | What lives there |
|---|---|
| `programa/` | Anchor 1.2 program `cuotas` — plan origination, installments, late crank, guarantor recovery, junior/senior LP pool, reputation, guarantee registry. Plus an independent LiteSVM acceptance suite in `programa/tests/`. |
| `app/` | Next.js App Router + TypeScript + Tailwind. `@solana/kit` + `@solana/kit-plugin-wallet` + `@solana/react`. All chain access goes through the single interface `app/src/lib/cuotas.ts` (mock or real implementation). |
| `app/src/generated/` | TypeScript client generated with Codama from the program IDL (`npm run generate`). |
| `app/src/app/api/fiador/` | Route handlers for the guarantor flow: HMAC invites, Didit sessions + signed webhook, Mobbex card sessions + re-queried webhook, server-side quote, verify-only registration. |
| `keeper/` | Node CLI loop: polls plans, writes **dry-run proposals only**; effects (mark-late crank, card charge, recovery registration, loss note) run solely via explicit `--execute` approval. Codama chain adapter + Mobbex gateway + idempotent journal. |
| `docs/` | Integration contracts (`docs/fiador-sandbox.md`). |
| `proyecto/` | Team process docs in Spanish — idea, validation, MVP, plan, pitch. |

## Quick start — mock mode (recommended for judges)

Requires Node.js 24.13+. No wallet, no chain, no credentials:

```sh
cd app
npm install
cp .env.example .env.local   # NEXT_PUBLIC_CUOTAS_MODE=mock is the default
npm run dev                  # http://localhost:3000
```

Demo routes: `/tienda` (demo store) → `/checkout/[producto]` → student
account `/app/estudiante`, merchant panel `/comercio`, pool `/pool`,
guarantor invite `/fiador/<token>` (`/account` is an earlier mock-only
account dashboard).

## Quick start — real mode (devnet)

> **Honest status:** the real client is implemented and guarded, but the
> onchain protocol is not initialized yet — devnet runs the pre-lifecycle
> binary and the upgrade is pending. Reads and purchases fail closed (they
> error, never fake success). See [Known limitations](#known-limitations).

1. `cd app && npm install && cp .env.example .env.local`
2. Set `NEXT_PUBLIC_CUOTAS_MODE=real` and keep the devnet values from
   `.env.example` (program ID + devUSDC mint are already correct).
3. Set `NEXT_PUBLIC_CUOTAS_MERCHANT` to the demo-store merchant wallet — once
   `merchant_register` has run onchain. Without it the real purchase path
   fails closed instead of using the simulated mock address.
4. Connect a wallet (e.g. Phantom) set to **devnet**.
5. Protocol bring-up (operator-only, needs the deployer keypair + explicit
   per-transaction approval): runbook in
   [`programa/UPGRADE_DEVNET.md`](programa/UPGRADE_DEVNET.md), then seed via
   `cd app && npm run seed` (dry-run by default; `--send` asks for a global
   SEND and a YES per proposal, printing each exact transaction first).

Regenerate the Codama client after an `anchor build` of the program:
`cd app && npm run generate` (`npm run generate:check` verifies the committed
client matches the IDL — for CI).

## Environment variables

`app/.env.example` — copy to `app/.env.local` (never committed):

| Variable | Default in example | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CUOTAS_MODE` | `mock` | Client mode: `mock` (local demo) or `real` (devnet). Any non-`real` value uses the mock. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | `https://api.devnet.solana.com` | Solana RPC. **Devnet endpoints only** — any other cluster is rejected at runtime. |
| `NEXT_PUBLIC_CUOTAS_PROGRAM_ID` | `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` | Deployed `cuotas` program on devnet (see `programa/DEPLOYMENT_REPORT.md`). |
| `NEXT_PUBLIC_CUOTAS_USDC_MINT` | `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` | Private devUSDC mint on devnet (6 decimals, test token, no value). |
| `NEXT_PUBLIC_CUOTAS_MERCHANT` | _(commented out)_ | Demo-store merchant wallet on devnet. Without it, the real purchase path fails closed. |
| `CUOTAS_KEYS_DIR` | _(commented out)_ | Node scripts only (`scripts/seed.ts`): directory **outside the repo** (permissions 0700) holding test keypairs. Never a path inside the repo, never committed. |

The guarantor-sandbox and keeper variables (`FIADOR_*`, `DIDIT_*`, `MOBBEX_*`,
`KEEPER_*`) are documented, with their trust model, in
[`docs/fiador-sandbox.md`](docs/fiador-sandbox.md) — they also live in
`app/.env.local` and are never committed. No private key goes in any env file.

## What's real vs mock vs sandbox

| Component | Status |
|---|---|
| `cuotas` program | **Real** — deployed and byte-verified on devnet (but running the pre-credit-lifecycle binary; upgrade pending — see below). |
| devUSDC mint | **Real** — exists on devnet (supply 0, nothing ever minted), worthless test token. |
| Frontend chain client | **Real** — `app/src/lib/cuotas/real.ts`: devnet genesis-hash guard, simulate-before-sign, fails closed on any inconsistency. |
| Codama client | **Real** — generated from the new program IDL into `app/src/generated/`. |
| Keeper | **Real code, dry-run by default** — the loop only proposes; `--execute --approved-by --yes` per effect. Codama adapter guards devnet by genesis hash. |
| Didit KYC / Mobbex cards | **Sandbox code complete, never run live** — integration + webhooks implemented and tested; live checks are pending sandbox credentials (fail closed: `didit_not_configured`, `mobbex_live_refused`). |
| Frontend `mock` mode | **Mock** — default. Simulates the whole product (plans, late flow, reputation, pool, demo clock) in the browser. Clearly labelled; mock evidence never links to Solana Explorer. |
| Demo store, demo clock, reference prices | **Simulated** — declared in-product. |

## Tests

```sh
# Frontend — Vitest unit/integration (178 tests) + Playwright e2e
cd app
npm test                 # vitest run (src/**/*.test.ts*)
npx playwright install chromium   # once, for the e2e suite
npm run test:e2e         # playwright (mock mode; PW_CUOTAS_MODE=real for devnet)
npm run typecheck && npm run lint

# Keeper — node:test unit suite (46 tests) + scripted-RPC e2e (9 tests)
cd keeper
npm test
npm run test:e2e         # real codecs against a scripted RPC transport
npm run typecheck

# Program — host unit tests (36) + LiteSVM acceptance suite (137)
cd programa
NO_DNA=1 anchor build --arch v1
cargo test -p cuotas --lib
cargo +stable test --manifest-path tests/Cargo.toml --no-fail-fast
cargo fmt --all -- --check && cargo clippy -p cuotas --all-targets -- -D warnings
```

**Never run `anchor test`** — the Anchor provider points at devnet and it
could attempt a deployment. The `[scripts] test` entry in
`programa/Anchor.toml` runs the two safe Cargo suites above: in-process only,
no validator, no deploy, no network.

## On-chain addresses (devnet)

| Item | Address |
|---|---|
| `cuotas` program (upgradeable) | [`E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`](https://explorer.solana.com/address/E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ?cluster=devnet) |
| devUSDC mint (6 decimals, supply 0) | [`8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y`](https://explorer.solana.com/address/8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y?cluster=devnet) |

Deployment verification (byte-for-byte bytecode hash, transaction signatures,
funding log): [`programa/DEPLOYMENT_REPORT.md`](programa/DEPLOYMENT_REPORT.md).

## Known limitations

Full detail in [`programa/TEST_REPORT.md`](programa/TEST_REPORT.md) and
[`proyecto/handoff-demo-devnet.md`](proyecto/handoff-demo-devnet.md):

- **Devnet runs the old program binary** (no credit lifecycle). The reviewed
  artifact with `open_plan` / `pay_installment` / `crank_mark_late` /
  `keeper_register_recovery` is green locally (137 LiteSVM + 36 host tests)
  but the upgrade is a pending, approval-gated step
  ([`programa/UPGRADE_DEVNET.md`](programa/UPGRADE_DEVNET.md)).
- **Protocol state was never initialized** (`admin_init_config` / `pool_init`
  never ran; devUSDC supply is 0; no merchant registered). Until then the
  real client fails closed — errors, never fabricated data.
- **Didit/Mobbex live sandbox runs are pending credentials** — code and
  tests are done; no provider keys exist in this workspace, and the flows
  refuse cleanly without them.
- **Confirmed program gap:** a plan reopened within the same second can
  accept a stale quote (`opened_at` is the only generation guard). Low
  severity — pinned by a KNOWN-GAP test; fix is a generation discriminator.
- `admin_apply_loss` is a **provisional cash-loss simulation** under a
  trusted admin — not a real-credit write-off, and not a design for real
  funds. The business decision (cash vs credit write-off) is still open.
- Guarantor coverage policy (`FIADOR_COVERAGE_POLICY` A vs B) is a pending
  product decision — unset means `coverage_policy_pending`, fail closed.
- The student-side invite button still mints local mock links; server-side
  invite wiring is documented in `docs/fiador-sandbox.md`.
- Senior-tranche deposits and the devnet demo clock are outside the approved
  demo scope.

## Documentation

- [`programa/README.md`](programa/README.md) — program accounts, instructions, share pricing, accounting invariants, deployment status.
- [`programa/TEST_REPORT.md`](programa/TEST_REPORT.md) — 137+36 test evidence, adversarial coverage, confirmed gaps.
- [`programa/DEPLOYMENT_REPORT.md`](programa/DEPLOYMENT_REPORT.md) — devnet deployment record and verification.
- [`programa/UPGRADE_DEVNET.md`](programa/UPGRADE_DEVNET.md) — runbook for the pending upgrade + protocol init (Fase A3).
- [`docs/fiador-sandbox.md`](docs/fiador-sandbox.md) — guarantor flow contract: endpoints, env vars, trust model, keeper protocol.
- [`app/README.md`](app/README.md) · [`app/ACCOUNT_DEMO.md`](app/ACCOUNT_DEMO.md) — frontend notes.
- [`proyecto/`](proyecto/) — team process docs (Spanish): [`01-idea.md`](proyecto/01-idea.md), [`02-validacion.md`](proyecto/02-validacion.md), [`03-mvp.md`](proyecto/03-mvp.md), [`04-plan.md`](proyecto/04-plan.md), [`05-pitch.md`](proyecto/05-pitch.md), [`handoff-demo-devnet.md`](proyecto/handoff-demo-devnet.md) (authoritative current status).
- [`PRODUCT.md`](PRODUCT.md) — product definition, users, brand.

---

Hackathon prototype. Devnet test tokens only — no real funds, no real cards,
no production use.
