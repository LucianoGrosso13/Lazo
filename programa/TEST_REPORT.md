# Cuotas — LiteSVM Acceptance Test Report

**Result: 97/97 in-process LiteSVM tests GREEN + 29/29 host unit tests
GREEN. Zero failures, zero ignored, zero deliberately-red tests.**

**Acceptance is NOT final business sign-off.** The technical suite passes
against the final source, but two items remain explicitly pending the user:
(1) the business choice between provisional *cash-simulation* loss
accounting and a strict credit write-off, and (2) devnet deployment + real
mint creation. This report proves what the compiled artifact does; it does
not approve deployment or real funds.

## Program under test

| item | value |
|---|---|
| source commit | `b7833ac653d5de3872d5c58982915d9aabf61f72` (clean tree) |
| SBF artifact | `target/deploy/cuotas.so`, 469824 bytes |
| artifact SHA256 | `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476` |
| IDL | `target/idl/cuotas.json`, 52823 bytes |
| IDL SHA256 | `f0231f0a67332d698cc14d0b17b8bd9e80202e218cdd3066eee90a78b2284774` |
| build | `NO_DNA=1 anchor build --arch v1` (reproduces the same hash) |
| runtime | LiteSVM 0.16 in-process — no mocks, no stubs, no network, no `anchor test`, no deploy |

The path-dependency on `programs/cuotas` keeps discriminators/layouts/error
variants in sync with source, but path-dep alone does NOT prove the `.so`
is fresh — the SHA256 above is the binding evidence that tests ran against
compiled `b7833ac`, not a stale artifact.

## How to run

```sh
# SBF artifact (evidence build, already verified):
cd programa && NO_DNA=1 anchor build --arch v1

# in-process acceptance suite (all 97 tests); the tests workspace needs
# stable, not the 1.89.0 host/SBF pin in ../rust-toolchain.toml:
cd programa/tests && cargo +stable test --no-fail-fast

# host-only unit tests of the program crate (serial, 29 tests, pinned 1.89.0):
cd programa && cargo test -p cuotas --lib
```

Equivalently, from `programa/`: `cargo +stable test --manifest-path tests/Cargo.toml --no-fail-fast`.

`CUOTAS_SO=/path/to/cuotas.so` overrides which artifact the suite loads
(default `../target/deploy/cuotas.so`). Never run `anchor test` (it would
deploy); the suite is in-process only.

## Results — suite executed against the verified artifact

```
admin_config.rs        18 passed   bootstrap + ProgramData matrix below
pool_lp.rs             33 passed   deposits, withdrawals, NAV, edge states
loss.rs                 9 passed   waterfall, bounds, provisional cash sweep
merchant_reputation.rs  7 passed   merchant + reputation registration
guarantee.rs           13 passed   lifecycle, mandate freshness, exposure
pause_matrix.rs         5 passed   op x state matrix incl. pool_init gate
adversarial.rs          7 passed   I-05 inflation attack, burns, conservation
regressions.rs          5 passed   R1–R5 all GREEN (table below)
--------------------------------------
TOTAL                  97 passed / 0 failed / 0 ignored   (~19 s in-process)
+ cargo test -p cuotas --lib: 29/29 host unit tests pass (exact-divisibility,
  inflation rejection, gain conservation, orphan/wipe handling)
```

All 12 instruction builders in `ix.rs` match `target/idl/cuotas.json`
account-by-account (names, order, writable/signer flags): no ABI drift.

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
fixture and after every executed op: deposits, withdrawals, losses.

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
and forged signers covered in `pool_lp.rs`/`adversarial.rs`.

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

- Business acceptance: cash-sim vs strict credit write-off for losses —
  **pending user decision**; this suite does not bless either.
- Devnet deployment and real `devUSDC` mint creation — **not done here**.
  Mint runbook when approved: classic SPL Token (not Token-2022), 6
  decimals, freeze authority `None`.
- `gain_allocation`/`book_gain` are exercised only by host unit tests
  (29/29); no on-chain instruction calls them, so they are out of SBF
  scope by construction.
- `originate_plan`/`pay_installment`/`default_plan` do not exist yet —
  credit lifecycle is modeled via `edit_pool`/`edit_reputation` fixtures
  (states unreachable by current instructions), clearly marked where used.

## Harness notes

- SPL state (mints/token accounts) hand-packed to exact classic wire
  layout (`spl.rs`): `COption<Pubkey>` = 36 B, `COption<u64>` = 12 B,
  token account = 165 B, mint = 82 B.
- `env.edit_pool`/`edit_reputation`/`set_token_amount`/`set_mint_supply`/
  `rewrite_mint`/`set_account_owner` model states no instruction produces
  (outstanding credit, capital≫shares, tampered mints); the program's own
  checks run for real against them.
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
programa/tests/src/spec.rs     spec parameters + independent exact-share math
programa/tests/src/spl.rs      SPL wire layouts, ATA derivation, raw token ixs
programa/tests/tests/*.rs      8 acceptance suites (97 tests)
programa/TEST_REPORT.md        this file
```
