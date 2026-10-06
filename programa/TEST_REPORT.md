# Cuotas — LiteSVM Acceptance Test Report

**Result: 137/137 in-process LiteSVM tests GREEN + 36/36 host unit tests
GREEN. Zero failures, zero ignored, zero deliberately-red tests.**

**Acceptance is NOT final business sign-off.** The technical suite passes
against the compiled artifact, but devnet deployment + real mint creation
remain **pending explicit user approval**. This report proves what the
compiled artifact does; it does not approve deployment or real funds.

## Program under test

| item | value |
|---|---|
| SBF artifact | `target/deploy/cuotas.so`, 611688 bytes |
| artifact SHA256 | `6cc01ba869ec1d56fe286a75a483eb25d55c506fcf55bc14b9f7befe5adc9400` |
| IDL | `target/idl/cuotas.json`, 85600 bytes |
| IDL SHA256 | `99527745ffa2482178c541ed8b12e2dbcc9625a5e372f7241e2492be8a1aefa5` |
| build | `NO_DNA=1 anchor build --arch v1` (rebuilt immediately before this run) |
| runtime | LiteSVM 0.16 in-process — no mocks, no stubs, no network, no `anchor test`, no deploy |

The path-dependency on `programs/cuotas` keeps discriminators/layouts/error
variants in sync with source, but path-dep alone does NOT prove the `.so`
is fresh — the SHA256 above is the binding evidence that tests ran against
the artifact rebuilt for this report (the `plans_opened`/`generation`
generation discriminator re-tagged the artifact; earlier hash `751cba9d…`
is superseded).

## How to run

```sh
cd programa
NO_DNA=1 anchor build --arch v1                                          # SBF artifact (evidence build, verified)
cargo +stable test --manifest-path tests/Cargo.toml --no-fail-fast       # in-process acceptance suite (all 137 tests)
cargo test -p cuotas --lib                                               # host-only unit tests (36 tests)
```

Toolchain notes: `rust-toolchain.toml` pins Rust 1.89.0 for the workspace host commands (`cargo test -p cuotas --lib`); the SBF artifact is compiled by Solana's bundled platform tools via `anchor build`, independent of that pin. The `tests/` LiteSVM workspace needs a newer host rustc, so it must override the pin with `+stable` (verified on stable 1.99.0) — running it as plain `cargo test` under `programa/` fails to compile `solana-syscalls`.

`CUOTAS_SO=/path/to/cuotas.so` overrides which artifact the suite loads
(default `../target/deploy/cuotas.so`). Never run `anchor test` (it would
deploy); the suite is in-process only.

## Results — suite executed against the verified artifact

```
admin_config.rs        19 passed   bootstrap matrix, param validation, notice-day
pool_lp.rs             33 passed   deposits, withdrawals, NAV, edge states
loss.rs                 9 passed   waterfall, bounds, provisional cash sweep
merchant_reputation.rs  7 passed   merchant + reputation registration
guarantee.rs           13 passed   lifecycle, mandate freshness, exposure
pause_matrix.rs         5 passed   op x state matrix incl. pool_init gate
adversarial.rs          7 passed   I-05 inflation attack, burns, conservation
regressions.rs          5 passed   R1–R5 all GREEN (table below)
plan_open.rs           12 passed   open_plan: terms, tracks, gates, adversarial
plan_pay.rs            13 passed   pay_installment: settle, replay, tiers, rollback
plan_recovery.rs       14 passed   crank_mark_late + keeper_register_recovery
--------------------------------------
TOTAL                 137 passed / 0 failed / 0 ignored   (~21 s in-process)
+ cargo test -p cuotas --lib: 36/36 host unit tests pass (exact-divisibility,
  inflation rejection, gain conservation, orphan/wipe handling, config
  validation incl. notice-day ordering, plan schedule math)
```

All 16 instruction builders in `ix.rs` match `target/idl/cuotas.json`
account-by-account (names, order, writable/signer flags): no ABI drift.

## Credit lifecycle — real instructions, no fixtures

`plan_open.rs` / `plan_pay.rs` / `plan_recovery.rs` exercise the four new
instructions end-to-end against the compiled program. Worlds are seeded
through REAL instructions only (`credit.rs` harness: config init, LP
deposit, merchant registration, reputation init, guarantee registration,
funded ATAs) — no hand-edited Plan state is ever used for lifecycle tests.

**Canonical PC-1000 quote asserted exactly** (`pc1000_guaranteed_open_exact_terms_and_conservation`):
price 1000 USDC → down payment 300 USDC, financed 700 USDC, merchant fee
49 USDC (7% of financed), merchant receives 951 USDC, installments
`233333333 / 233333333 / 233333334` micro-USDC — independently recomputed by
`spec.rs` floor-division math and matched field-by-field on the decoded
`Plan`, plus `PlanOpened` event payload.

**Conservation + invariant** are asserted at every step: exact token deltas
across student/merchant/keeper/LP/vault/treasury ATAs, and
`vault + outstanding_credit == junior_capital + senior_capital`
(`env.accounting_delta() == 0`) after every op, including the mixed
pay/late-pay/recovery lifecycle (`token_conservation_across_mixed_lifecycle`).

### Coverage highlights

- **open_plan**: guaranteed vs unguaranteed track selection, S0/S1 clamps
  (incl. tier-3 reputation clamped to S1 without a guarantee), guarantor
  `max_purchase`/`coverage_max` binding, revoked/hidden guarantee fallback,
  `InvalidPrice`/`PriceExceedsTierMax`/`PriceExceedsGuarantorMax`/
  `InsufficientGuaranteeCoverage`/`BlockedFromNewPlans`/
  `InvalidReputationTier`/`MerchantInactive`, one-open-plan-per-student
  (PDA `init` occupied → rejected), all 16 account slots corrupted
  (foreign mint, non-canonical ATAs, wrong PDAs, wrong vault, inactive
  merchant), wrong-signer rejection, insufficient-balance and
  insufficient-liquidity full atomic rollback, `ProtocolNotNormal` gating.
- **pay_installment**: happy-path settlement → plan PDA closed + rent
  returned + tier 0→1, day-5 grace boundary (no penalty) vs day-6
  auto-mark (5% penalty, disqualified from tier-up), `expected_index`/
  `expected_opened_at`/`expected_generation` stale guards
  (`StaleInstallmentIndex`, `StalePlan`), duplicate-payment rejection
  (`InstallmentAlreadyResolved`), pay on a closed plan, guarantor-charged
  plan still payable but never counts, under-100-financed plans settle but
  don't count, guaranteed ladder 0→1→2→3 capped, unguaranteed completion
  caps at S1, student-balance rollback, account-integrity matrix,
  cross-student redirection.
- **crank_mark_late**: permissionless caller, day-5 (grace) vs day-6
  boundary via clock warps, `MarkTooEarly`, `AlreadyMarkedLate`
  idempotence, invalid index, works under Halted/WithdrawsOnly.
- **keeper_register_recovery**: first recovery charges exactly the first
  unpaid installment (auto-marks + penalty once), second recovery
  accelerates ALL remaining unresolved principal with NO penalty on
  installments accelerated before their own grace period, receipt-hash
  replay/double-recovery rejected (`ReceiptAlreadyUsed`), zero hash
  rejected (`InvalidReceiptHash`), `RecoveryTooEarly`, `StaleInstallmentIndex`
  on skipped indexes, `PlanNotGuaranteed` on unguaranteed plans, keeper-only
  authority, account-integrity matrix, keeper-insufficient-balance full
  rollback, `late_count > 0` blocks new plans forever (derived gate — no
  Reputation layout change), works under Halted/WithdrawsOnly.

### Resolved finding (was KNOWN-GAP, fixed in this build)

`same_second_reopen_rejects_stale_quote`: settle+close plan A, reopen plan
B without advancing the clock → B inherits A's `opened_at`. The stale-quote
guard used to be `expected_opened_at` alone, which collided on a
same-second reopen. **Fix:** `Reputation` now carries a monotonic
`plans_opened: u64` counter; `open_plan` increments it and stamps the
value on `Plan.generation`; `pay_installment` takes a third arg
`expected_generation` and rejects mismatches with `StalePlan`. The test
pins the new behavior: the stale A-quote `(index 0, opened_at_A, gen_A)`
fails `StalePlan` while the honest B-quote `(0, opened_at_A, gen_B)` pays.

Account growth: `Reputation` 26→34 bytes, `Plan` 309→317 bytes (8-byte
discriminator included). Safe on devnet because no Reputation/Plan
accounts exist there — the deployed artifact predates the credit
lifecycle and no protocol state was ever initialized.

## Regressions — all resolved on this source

| # | defect originally found | fix verified by |
|---|---|---|
| R1 | `apply_loss` stranded vault tokens → invariant broken | cash sweep `vault→treasury` keeps `V+OC=J+S`; `regression_apply_loss_breaks_vault_invariant` GREEN |
| R2 | external LP burn → phantom shares / stranded NAV | `reconcile_shares` syncs counters to live supply, forfeits burned NAV pro-rata; `regression_external_burn_creates_phantom_shares` GREEN |
| R3 | `admin_init_config` callable by any signer | `program.programdata_address` + `upgrade_authority == admin` checked on-chain; `regression_init_config_must_verify_upgrade_authority` GREEN |
| R4 | revoked guarantee reactivated with the same `mandate_hash` | `MandateHashUnchanged` (6025) rejects stale hash; terms/`active`/`registered_at` verified untouched; `regression_guarantee_update_requires_fresh_mandate` GREEN |
| R5 | external burn → 1 unit of supply inflates NAV/share for the incumbent | exact-deposit guard `UnrepresentableDeposit` (6024) before any token CPI; `external_burn_inflation_attack_rejected` GREEN |

## Accounting model asserted by the suite

**Invariant: `vault.amount + outstanding_credit == junior_capital +
senior_capital`** (`env.accounting_delta() == 0`) in every consistent
fixture and after every executed op: deposits, withdrawals, losses,
plan origination, repayments, guarantor recoveries.

- `accrued_fees` is a **cumulative informational counter** for recognized
  gains already folded into LP capital — NOT a treasury liability and NOT
  a liquidity reserve. `informational_fees_never_gate_liquidity` proves a
  large `F` never reduces what an LP can withdraw and no instruction
  touches it.
- Direct unsolicited token transfers into the vault are **unallocated
  surplus**: `unsolicited_donations_stay_outside_lp_nav` proves they do
  not dilute or enrich LPs (delta `+donation`, full exit leaves the surplus
  in the vault).
- `Pool::gain_allocation` / `book_gain` are **host-only helpers** — no
  instruction exposes them; the suite attributes no SBF behavior to them.
- Loss is **PROVISIONAL CASH SIMULATION** (see limitations).

## Exact-deposit guard (I-05 fix)

`shares_for_deposit` requires `amount * reconciled_supply` to divide
`capital` exactly (`UnrepresentableDeposit`, checked BEFORE any token CPI,
supply reconciled to the live mint first). Verified:

- **Attack executed for real** (`external_burn_inflation_attack_rejected`):
  attacker deposits 1e9, raw-burns 999999999 LP keeping 1 unit; victim's
  1.5e9 deposit is rejected atomically — pool bytes, victim balances and
  mint supply byte-identical before/after — and the attacker exits with
  exactly what he put in. Profit = 0.
- Benign case (`deposit_requires_exact_share_pricing`): at NAV 0.75 a
  non-exact amount fails with full rollback, the exact amount succeeds.
- `OrphanedCapital` (capital>0, supply=0) and `TrancheWipedOut`
  (capital=0, supply>0) reject deposits on both tranches; zero-NAV shares
  may be retired for 0 payout and the tranche recapitalized once empty.
- `LpSupplyMismatch` (supply > recorded shares, only possible via tamper)
  rejects on both tranches.

## Bootstrap / upgrade-authority matrix (`admin_init_config`)

Constraint: `program.programdata_address() == Some(program_data.key())`
and `program_data.upgrade_authority_address == Some(admin)`.

| case | result |
|---|---|
| real program + its ProgramData + upgrade authority signs | OK — that authority becomes `config.admin` |
| attacker signer (authority = admin) | `NotUpgradeAuthority` |
| foreign authority patched in, admin signs | `NotUpgradeAuthority` |
| `program_data` = unrelated well-formed ProgramData (correct loader-owned layout, authority = admin, WRONG address) | `NotUpgradeAuthority` — binds address, not just type |
| `upgrade_authority_address = None` (immutable program) | `NotUpgradeAuthority` — nobody can bootstrap |
| `program` = non-executable data account / foreign-loader program | rejected |
| `program_data` = token/garbage account | rejected (deserialize fails) |
| 8-decimal mint, token-account-as-mint, Token-2022 mint | rejected |

Harness note: LiteSVM writes the loaded ProgramData with
`upgrade_authority_address = None`; `env` patches bytes 12..45 so the real
constraint is exercised both ways — nothing is mocked.

## Config surface (`guarantor_notice_day` added)

`ConfigParams`/`ProtocolConfig` carry `guarantor_notice_day: u8` (seeded 3,
immediately after `guarantor_charge_day`). Validation is exactly
`0 < notice_day < guarantor_charge_day` — no grace bound, so previously
valid zero-grace configs stay valid (`notice_day_unbounded_by_grace`,
`init_validates_params` mutants, `notice_day_is_configurable_not_hardcoded`
proving a non-default value round-trips through init and update). Client
and keeper must read the notice day from config — never hardcode 3.

## Guarantee mandate freshness (`keeper_update_guarantee`)

Requires: configured keeper + Normal state + same-student reputation PDA
with `active_exposure == 0` + nonzero `mandate_hash != stored`.

- same hash on a revoked guarantee → `MandateHashUnchanged`, and
  `terms`/`active=false`/`registered_at` verified byte-identical after;
- same hash on an ACTIVE guarantee → also `MandateHashUnchanged`;
- different nonzero hash → reactivates cleanly (active=true, new ts);
- another student's canonical reputation PDA → seeds mismatch;
- `active_exposure > 0` → `GuaranteeTermsLocked`; Halted →
  `ProtocolNotNormal`. `keeper_revoke_guarantee` intentionally has no
  state gate.

## LP mint / token-account integrity

`lp_mint_state_tampering_rejected` mutates the canonical mint in place
(seeds prevent substitution): mint authority ≠ pool → rejected; decimals ≠
6 → rejected; account owner = Token-2022 → rejected; on deposit AND
withdraw paths. LP-ATA slot variants verified: non-canonical token account
→ `NotCanonicalAta`, cross-tranche ATA, foreign-owner ATA, missing ATA,
Token-2022-derived address. USDC-ATA / vault / pool / config substitutions
and forged signers covered in `pool_lp.rs`/`adversarial.rs` and in the new
per-slot matrices of `plan_open.rs`/`plan_pay.rs`/`plan_recovery.rs`.

## Pause matrix (op × protocol state)

| op | Normal | Halted | WithdrawsOnly |
|---|---|---|---|
| `lp_deposit` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `lp_withdraw` | ok | `ProtocolHalted` | ok (full exit verified) |
| `admin_apply_loss` | ok | ok | ok (no gate — pinned from source) |
| `merchant_register` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `student_init_reputation` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_register_guarantee` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_update_guarantee` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_revoke_guarantee` | ok | ok | ok (no gate — pinned) |
| `pool_init` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` (new gate) |
| `open_plan` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `pay_installment` | ok | ok | ok (repayment reduces risk — pinned) |
| `crank_mark_late` | ok | ok | ok (risk marking ungated — pinned) |
| `keeper_register_recovery` | ok | ok | ok (recovery reduces risk — pinned) |

## Loss waterfall — PROVISIONAL cash simulation

`admin_apply_loss(amount)` reduces tranche capital junior-first then
senior AND performs a real `transfer_checked` of `amount` from the vault
to the canonical treasury ATA. `outstanding_credit` is untouched.
Verified: junior-first cascade, senior spillover, exact total loss,
zero loss, `loss > total capital` → `LossExceedsCapital`, `loss > vault
cash` → rejected at the SPL transfer with full rollback, OC preserved,
`V+OC=J+S` after loss, treasury balance included in token conservation,
no state gate.

**Trusted-admin limitation (must be read before any real-funds use):**
the admin both chooses `treasury_ata` and triggers the sweep, so a
compromised or malicious admin could move pool cash to an arbitrary
canonical treasury account. Cash mode also cannot write off *non-liquid*
outstanding credit — it can only sweep cash that is physically in the
vault. This is a **devnet test simulation** of loss, not a safe design
for real funds; the cash-vs-strict-credit-writeoff business decision is
still pending the user.

## What remains unverified / pending

- **Devnet deployment and real `devUSDC` mint creation — pending explicit
  approval.** Mint runbook when approved: classic SPL Token (not
  Token-2022), 6 decimals, freeze authority `None`.
- Business acceptance: cash-sim vs strict credit write-off for losses —
  **pending user decision**; this suite does not bless either.
- `gain_allocation`/`book_gain` are exercised only by host unit tests
  (36/36); no on-chain instruction calls them, so they are out of SBF
  scope by construction.
- `guarantor_notice_day` is stored config only — no instruction consumes
  it yet (keeper/backend read it off-chain).

## Harness notes

- SPL state (mints/token accounts) hand-packed to exact classic wire
  layout (`spl.rs`): `COption<Pubkey>` = 36 B, `COption<u64>` = 12 B,
  token account = 165 B, mint = 82 B.
- `env.edit_pool`/`edit_reputation`/`set_token_amount`/`set_mint_supply`/
  `rewrite_mint`/`set_account_owner` model states no instruction produces
  (outstanding credit, capital≫shares, tampered mints, seeded late_count);
  credit-lifecycle suites use real instructions only.
- `events.rs` decodes `Program data:` log payloads so assertions cover
  emitted event fields, not just account state.
- Each `send` expires the blockhash afterwards so byte-identical retries
  get fresh signatures (duplicate-init tests).
- Rebuild-before-test is recommended: the artifact hash above, not the
  path dependency, is the freshness proof.

## Owned files (test worker only)

```
programa/tests/Cargo.toml      standalone crate, path-dep on programs/cuotas
programa/tests/src/lib.rs      harness docs
programa/tests/src/env.rs      LiteSVM boot, actors, fixtures, ProgramData patching
programa/tests/src/err.rs      TxOutcome, custom-error extraction, CuotasError→code
programa/tests/src/ix.rs       instruction builders bound to #[derive(Accounts)]
programa/tests/src/pda.rs      PDA derivations
programa/tests/src/spec.rs     spec parameters + independent exact-share/plan math
programa/tests/src/spl.rs      SPL wire layouts, ATA derivation, raw token ixs
programa/tests/src/credit.rs   real-instruction credit-lifecycle fixture + helpers
programa/tests/src/events.rs   emitted-event decoding from tx logs
programa/tests/tests/*.rs      11 acceptance suites (137 tests)
programa/TEST_REPORT.md        this file
```

Coordinator-authorized narrow program edits in this report's build:
`programs/cuotas/src/state/reputation.rs` (`plans_opened` counter),
`programs/cuotas/src/state/plan.rs` (`generation` field + host fixture
literals), `programs/cuotas/src/instructions/student_init_reputation.rs`
(init the counter), `programs/cuotas/src/instructions/open_plan.rs` (bump +
stamp), `programs/cuotas/src/instructions/pay_installment.rs` +
`programs/cuotas/src/lib.rs` (`expected_generation` arg + `StalePlan`
check). No math or business rule changed.
