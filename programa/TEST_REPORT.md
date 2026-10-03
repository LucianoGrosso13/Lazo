# Cuotas — Acceptance Test Report

**Status: INTERIM — acceptance is NOT final.** One regression remains
deliberately RED (R4: `keeper_update_guarantee` reactivates a revoked
guarantee with the same stale `mandate_hash` — no fresh-mandate check
exists yet). Final acceptance is blocked on that fix plus the pending
business decision on loss cash accounting (the program now ships the
"cash simulation" variant: `admin_apply_loss` moves real USDC from the
vault to the treasury ATA; see finding 1).

Program under test: `programs/cuotas` compiled to `target/deploy/cuotas.so`
(post-reviewer ABI, rebuilt 17:39 UTC — includes the `ProgramData`
upgrade-authority check, `reconcile_shares`, orphaned-capital guard,
exposure gate on guarantee updates, and the loss cash sweep) and executed
**in-process inside LiteSVM 0.16** — no mocks, no stubs, no network.

Everything lives in `programa/tests/` (owned by the test worker): a standalone
crate with its own `[workspace]`, so **zero changes to core manifests, source,
or scripts** were required. The suite binds to the real ABI by importing
`cuotas` as a path dependency: instruction discriminators, account layouts and
error codes can never silently drift from the `.so`.

## How to run

```sh
# build the program artifact first (core-owned workspace)
cd programa && NO_DNA=1 anchor build

# run the acceptance suite
cd programa/tests && cargo test
# or from repo root:
cargo test --manifest-path programa/tests/Cargo.toml
```

Environment override: `CUOTAS_SO=/path/to/cuotas.so` changes which artifact is
loaded; default is `../target/deploy/cuotas.so` relative to the crate.

## Results

Latest full run (post-reviewer ABI, `cuotas.so` rebuilt 17:39 UTC):

```
admin_config.rs        12 passed  (init w/ ProgramData check, update, set_state)
pool_lp.rs             28 passed  (pool_init, deposits, withdrawals, NAV,
                                    OrphanedCapital, LpSupplyMismatch,
                                    wiped-tranche retire + recapitalize)
loss.rs                 9 passed  (waterfall, bounds, cash sweep to treasury,
                                    OC preserved, loss bounded by vault cash)
merchant_reputation.rs  7 passed  (merchant register, student reputation)
guarantee.rs           11 passed  (lifecycle, GuaranteeTermsLocked exposure
                                    gate, zero-hash rejection, role separation)
pause_matrix.rs         4 passed  (op x state matrix, WithdrawsOnly exit)
adversarial.rs          4 passed  (authority matrix, external burn forfeit,
                                    conservation + V+OC=J+S+AF)
regressions.rs          4 passed / 1 RED BY DESIGN (R4, see below)
-------------------------
TOTAL                  79 green + 1 tracked regression   (~9 s wall, in-process)
```

ABI deltas absorbed by the harness since the previous run:

- `admin_init_config` now takes `program` + `program_data` accounts and
  requires the signer to be the program's upgrade authority. LiteSVM loads
  the `.so` as upgradeable but writes `upgrade_authority_address = None`;
  the harness patches it to the fixture admin (bytes 12..45 of the
  ProgramData account) so the positive path is real, not mocked.
- `admin_apply_loss` takes `treasury_ata` + `token_program` and performs a
  real `transfer_checked` vault → treasury ("cash simulation" mode).
  `env.bootstrap()` now creates the treasury ATA.
- `keeper_update_guarantee` takes the student's `reputation` account and
  rejects rewrites while `active_exposure > 0` (`GuaranteeTermsLocked`).
- `lp_deposit`/`lp_withdraw` call `pool.reconcile_shares(tranche,
  lp_mint.supply)` before pricing: counters sync DOWN to live supply after
  external burns, and supply > shares fails `LpSupplyMismatch`.
- `keeper_register_guarantee`/`update` now require `mandate_hash != 0`.
- Zero-payout withdrawals are ALLOWED (worthless shares retire for 0 — the
  wiped-tranche clean-slate path). `WithdrawYieldsZero` was removed;
  `OrphanedCapital`, `LpSupplyMismatch`, `GuaranteeTermsLocked`,
  `NotUpgradeAuthority`, `InvalidTokenProgram` were added (error ordinals
  shifted — the harness maps variants, not numbers).

## Known-failing regressions (`tests/regressions.rs`)

Each test asserts the REQUIRED invariant and names the defect it tracks.

| # | test | required behavior | status |
|---|---|---|---|
| R1 | `regression_apply_loss_breaks_vault_invariant` | `vault + outstanding_credit == J + S + accrued_fees` after every op | **GREEN** — cash sweep to treasury ATA landed |
| R2 | `regression_external_burn_creates_phantom_shares` | external burn → shares reconcile to supply, forfeited NAV accrues to remaining holders, full drain | **GREEN** — `reconcile_shares` landed |
| R3 | `regression_init_config_must_verify_upgrade_authority` | `admin_init_config` binds to the program's upgrade authority | **GREEN** — ProgramData check landed |
| R4 | `regression_guarantee_update_requires_fresh_mandate` | revoked guarantee may only reactivate with a NEW `mandate_hash` | **RED** — update still accepts the same revoked hash (tx succeeds; exposure gate landed but hash-freshness did not) |

Plus the green baseline `invariant_holds_across_deposits_and_withdraws`
proving `V + OC = J + S + AF` holds for all ops that do not involve losses.

## Dependency versions (test crate only)

| crate | version | why |
|---|---|---|
| `cuotas` | path `../programs/cuotas` | real ABI: ix data, state, errors |
| `litesvm` | `0.16.0` | in-process SVM, Agave 4.2 lineage |
| `anchor-lang` | `1.2.0` | matches the program's anchor version |
| `solana-*` (address/instruction/message/transaction/keypair/signer/account/clock/rent/sdk-ids/instruction-error/transaction-error) | `~2.6`–`~4.x` | pinned to the same versions litesvm uses internally so types unify |
| `solana-pubkey` | `~3.0.0` | anchor-side `Pubkey` (solana-address 1.x lineage), converted via `[u8;32]` shims |

Type lineages: `solana_address::Address` (litesvm, 2.x) and
`solana_pubkey::Pubkey` (anchor 1.2, 1.x lineage) are distinct types wrapping
`[u8;32]`; `env::addr()`/`env::pk()` convert byte-exactly.

## Acceptance matrix

Positive coverage (state + token-balance assertions):

| instruction | positives | key negatives covered |
|---|---|---|
| `admin_init_config` | spec config persisted incl. both tier tables, bump; upgrade-authority bootstrap verified via program+ProgramData | non-authority signer → `NotUpgradeAuthority` (R3), dup init, wrong config PDA, 8-decimal mint, token-account-as-mint, token-2022 mint, 11 config-param mutants → `InvalidConfig` |
| `admin_update_config` | params replaced, keeper rotation honored immediately | attacker/keeper/student → `NotAdmin`, invalid params → `InvalidConfig` |
| `admin_set_state` | Normal→Halted→WithdrawsOnly→Normal round trip | attacker, keeper → `NotAdmin` |
| `pool_init` | vault (authority=pool), both LP mints (6 dec, authority=pool, supply 0), zeroed counters | non-admin → `NotAdmin`, foreign mint → `InvalidUsdcMint`, token-2022 program id, swapped LP mints, duplicate |
| `lp_deposit` | first-deposit 1:1, tranche independence, NAV deposit after loss (500 capital / 1000 shares → 100→200 shares), post-burn reconcile | zero → `ZeroAmount`, dust under `capital>>shares` → `DepositTooSmall`, insolvent tranche → `TrancheWipedOut`, capital>0+shares=0 → `OrphanedCapital`, supply>shares → `LpSupplyMismatch`, foreign mint → `InvalidUsdcMint`, wrong pool/config/vault/LP-mint/USDC-ATA/LP-ATA (8 substitutions), insufficient balance, missing LP ATA, forged signer (2 arms), bad tranche discriminant, gated in Halted + WithdrawsOnly → `ProtocolNotNormal` |
| `lp_withdraw` | partial pro-rata payout, NAV after loss (0.6/share), WithdrawsOnly exit, second-LP pro-rata, worthless shares retire for 0 + recapitalize | zero → `ZeroShares`, over supply → `InsufficientShares`, over own balance → burn failure, illiquid vault → `InsufficientLiquidity`, supply>shares → `LpSupplyMismatch`, account substitution ×3, Halted → `ProtocolHalted` |
| `admin_apply_loss` | waterfall junior-first, spill to senior, wipe-to-zero, cash sweep vault→treasury, OC preserved, halted bookkeeping OK | non-admin incl. keeper → `NotAdmin`, zero → `ZeroAmount`, loss>total → `LossExceedsCapital`, loss>vault-cash → spl failure, empty pool |
| `merchant_register` | owner/settlement/active/plans_count/bump persisted; merchant wallet needn't sign | keeper/attacker/student → `NotAdmin`, foreign/other-mint/non-ATA settlement → `NotCanonicalAta`, foreign mint → `InvalidUsdcMint`, wrong merchant PDA, duplicate |
| `student_init_reputation` | tier 0, counters 0, bump | foreign reputation PDA, duplicate, gated Halted + WithdrawsOnly → `ProtocolNotNormal` |
| `keeper_register_guarantee` | terms/hash/active/registered_at/bump | admin/attacker/student → `NotKeeper`, mp=0 or cm=0 or hash=0 → `InvalidGuaranteeParams`, foreign guarantee PDA, duplicate, gated → `ProtocolNotNormal` |
| `keeper_update_guarantee` | terms updated, reactivates revoked, timestamp refreshed | non-keeper → `NotKeeper`, zero params/hash → `InvalidGuaranteeParams`, unregistered student, `active_exposure>0` → `GuaranteeTermsLocked`, gated in Halted → `ProtocolNotNormal`; **R4 RED**: same-hash reactivation still accepted |
| `keeper_revoke_guarantee` | active=false, terms retained, idempotent, allowed while Halted | admin/attacker → `NotKeeper`, re-register after revoke fails (update-only reactivation) |

### Pause matrix (op × state) — `pause_matrix.rs`

| op | Normal | Halted | WithdrawsOnly |
|---|---|---|---|
| `lp_deposit` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `lp_withdraw` | ok | `ProtocolHalted` | ok (full exit verified) |
| `admin_apply_loss` | ok | ok | ok |
| `merchant_register` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `student_init_reputation` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_register_guarantee` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_update_guarantee` | ok | `ProtocolNotNormal` | `ProtocolNotNormal` |
| `keeper_revoke_guarantee` | ok | ok | ok |
| `pool_init` | ok | ok | ok (no gate — bootstrap op) |

## Economic / adversarial findings

1. **`admin_apply_loss` is now "cash simulation" mode — RESOLVED (R1
   green).** The instruction performs a real `transfer_checked` of `amount`
   from the vault to the canonical treasury ATA, so
   `vault + outstanding_credit == J + S + accrued_fees` holds.
   `outstanding_credit` is deliberately untouched (a "credit write-off"
   mode would only change this handler, per the source comment). Two
   boundary tests pin the semantics: `loss_moves_cash_to_treasury_and_
   preserves_credit` (OC=500 modeled + consistent vault) and
   `loss_is_bounded_by_vault_cash_not_just_capital` (a loss that fits in
   capital but exceeds remaining vault cash fails at the SPL transfer —
   the cash-mode boundary when capital is lent out).

2. **External LP burn forfeits NAV pro-rata — RESOLVED (R2 green).**
   `reconcile_shares` syncs the recorded counter down to live mint supply
   before every NAV pricing, so burned claims are forfeited (not stranded):
   in the tested sequence the burner loses 200 shares worth of NAV, the
   survivor exits with 625 (500 + forfeited 125), and the pool drains to
   exact zero. Supply ABOVE recorded shares fails `LpSupplyMismatch`
   (exercised via direct mint-supply edit).

3. **Attacker cannot mint LP tokens** (`attacker_cannot_mint_lp_tokens`):
   mint authority is the pool PDA; a raw spl `MintTo` signed by an attacker
   fails inside the token program.

4. **USDC conservation verified** (`token_conservation_across_full_sequence`):
   across deposit×2 + withdraw + loss, `vault + user ATAs == initial USDC` —
   the program never mints or burns USDC; LP mint supplies always equal the
   on-chain share counters.

5. **Insolvent-tranche guardrail confirmed**: when losses wipe a tranche
   (`capital==0, shares>0`), further deposits fail with `TrancheWipedOut`
   (6000+17) — no free-share minting.

6. **Signer forgery is dead on arrival** (`deposit_forged_signer_fails`): a
   transaction naming victim as `depositor` cannot be built without the
   victim's key (`NotEnoughSigners` at construction), and a transaction with
   the attacker's signature injected into the victim's slot dies in the
   runtime's signature verification (`SignatureFailure`) before the program
   runs.

7. **Error variants observed-but-unreachable**: `WrongLpMint`,
   `TokenAccountMismatch` are shadowed by seeds/token constraints that fail
   earlier; documented, not a defect.

## Harness notes

- SPL state (mints, token accounts, ATAs) is packed by hand into the SVM
  account store (`spl.rs`, classic spl-token wire layout) — deterministic
  fixtures without setup transactions.
- `env.edit_pool`/`set_token_amount` write protocol/token-account state
  directly to model conditions the current instruction set cannot produce
  (outstanding credit, capital≫shares, vault liquidity < claims), so the
  *program's* liquidity/waterfall checks are exercised for real.
- Every `send` expires the blockhash afterwards so byte-identical retries
  (duplicate-init tests) get fresh signatures instead of a false
  `AlreadyProcessed`.
- The harness patches the ProgramData account LiteSVM creates for the
  loaded program (`upgrade_authority_address = None` → fixture admin) so
  the new `admin_init_config` upgrade-authority check exercises the real
  constraint, both ways.
- `env.edit_reputation`/`set_mint_supply` extend the direct-state modeling
  to `active_exposure` and mint-supply anomalies no instruction can produce.
- One flake observed: the shared `target/deploy/cuotas.so` was rebuilt by the
  core worker mid-run; rerun was green. Rebuild-before-test is recommended.

## Owned files

```
programa/tests/Cargo.toml      standalone crate, path-dep on programs/cuotas
programa/tests/src/lib.rs      harness docs
programa/tests/src/env.rs      LiteSVM boot, actors, ATA/mint fixtures, send/simulate
programa/tests/src/err.rs      TxOutcome, custom-error extraction, CuotasError→code
programa/tests/src/ix.rs       instruction builders bound to #[derive(Accounts)]
programa/tests/src/pda.rs      PDA derivations from the spec
programa/tests/src/spec.rs     spec parameters + independent NAV math
programa/tests/src/spl.rs      SPL layouts, ATA derivation, raw token ixs
programa/tests/tests/*.rs      6 acceptance suites + this report
programa/TEST_REPORT.md        this file
```
