# Cuotas — Acceptance Test Report

**Status: INTERIM — acceptance is NOT final.** The suite includes a
deliberately-red `regressions.rs` that encodes invariants the program is
required to satisfy (per reviewer request) but currently violates; see
"Known-failing regressions". Final acceptance is blocked on (a) the pending
business decision on loss cash accounting and (b) the new core ABI landing
(upgrade-authority `ProgramData` check, fresh-mandate guarantee rule,
exposure gating) plus a `cuotas.so` rebuild + rerun.

Program under test: `programs/cuotas` compiled to `target/deploy/cuotas.so`
(md5 `074302a322d86a71fb36524a51ce6592` for the last green run; a newer ABI
with `program`/`program_data` accounts on `admin_init_config` was mid-edit
at report time) and executed **in-process inside LiteSVM 0.16** — no mocks,
no stubs, no network.

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

Last full green run (against md5 `074302a3…`, the pre-reviewer ABI):

```
admin_config.rs        12 passed  (init/update/set_state, params validation)
pool_lp.rs             26 passed  (pool_init, deposits, withdrawals, NAV)
loss.rs                 8 passed  (waterfall, bounds, OC write-off)
merchant_reputation.rs  7 passed  (merchant register, student reputation)
guarantee.rs            9 passed  (keeper lifecycle, role separation, gates)
pause_matrix.rs         4 passed  (op x state matrix, WithdrawsOnly exit)
adversarial.rs          4 passed  (authority matrix, external LP burn, conservation+V+OC=J+S+AF)
regressions.rs          1 green / 4 RED BY DESIGN (see below)
-------------------------
TOTAL                  71 green + 4 tracked regressions   (~9 s wall, in-process)
```

Current state: the core worker is landing reviewer-requested ABI changes
(`admin_init_config` now takes `program` + `program_data` accounts for the
upgrade-authority check; `LossBreakdown.credit_written_off` pending). The
crate does not compile mid-edit, so a fresh full run is pending the settled
ABI — the `ix.rs` builders will then gain the new accounts and the red
regressions should flip green one by one.

## Known-failing regressions (`tests/regressions.rs`)

Each test asserts the REQUIRED invariant and names the defect it tracks.
They fail today; when core lands the fix they go green unchanged.

| # | test | required behavior | observed today |
|---|---|---|---|
| R1 | `regression_apply_loss_breaks_vault_invariant` | `vault + outstanding_credit == J + S + accrued_fees` after every op | `apply_loss` shrinks only counters → residual vault tokens unclaimable (delta = loss) |
| R2 | `regression_external_burn_creates_phantom_shares` | `lp_mint_supply == tranche_shares` (every share redeemable) | external spl burn → supply < shares, phantom NAV stranded |
| R3 | `regression_init_config_must_verify_upgrade_authority` | `admin_init_config` binds to the program's upgrade authority via ProgramData | any signer can bootstrap and become permanent admin (front-running window) |
| R4 | `regression_guarantee_update_requires_fresh_mandate` | revoked guarantee may only reactivate with a NEW `mandate_hash` | `keeper_update_guarantee` reactivates with the same revoked hash |

Plus the green baseline `invariant_holds_across_deposits_and_withdraws`
proving `V + OC = J + S + AF` holds for all ops that do not involve losses,
so the R1 failure is cleanly attributable to `admin_apply_loss`.

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
| `admin_init_config` | spec config persisted incl. both tier tables, bump | dup init, wrong config PDA, 8-decimal mint, token-account-as-mint, token-2022 mint, 11 config-param mutants → `InvalidConfig` |
| `admin_update_config` | params replaced, keeper rotation honored immediately | attacker/keeper/student → `NotAdmin`, invalid params → `InvalidConfig` |
| `admin_set_state` | Normal→Halted→WithdrawsOnly→Normal round trip | attacker, keeper → `NotAdmin` |
| `pool_init` | vault (authority=pool), both LP mints (6 dec, authority=pool, supply 0), zeroed counters | non-admin → `NotAdmin`, foreign mint → `InvalidUsdcMint`, token-2022 program id, swapped LP mints, duplicate |
| `lp_deposit` | first-deposit 1:1, tranche independence, NAV deposit after loss (500 capital / 1000 shares → 100→200 shares), | zero → `ZeroAmount`, dust under `capital>>shares` → `DepositTooSmall`, insolvent tranche → `TrancheWipedOut`, foreign mint → `InvalidUsdcMint`, wrong pool/config/vault/LP-mint/USDC-ATA/LP-ATA (8 substitutions), insufficient balance, missing LP ATA, forged signer (2 arms), bad tranche discriminant, gated in Halted + WithdrawsOnly → `ProtocolNotNormal` |
| `lp_withdraw` | partial pro-rata payout, NAV after loss (0.6/share), WithdrawsOnly exit, second-LP pro-rata | zero → `ZeroShares`, over supply → `InsufficientShares`, over own balance → burn failure, wiped tranche → `WithdrawYieldsZero`, illiquid vault → `InsufficientLiquidity`, account substitution ×3, Halted → `ProtocolHalted` |
| `admin_apply_loss` | waterfall junior-first, spill to senior, wipe-to-zero, OC write-off first, halted bookkeeping OK | non-admin incl. keeper → `NotAdmin`, zero → `ZeroAmount`, loss>total → `LossExceedsCapital`, empty pool |
| `merchant_register` | owner/settlement/active/plans_count/bump persisted; merchant wallet needn't sign | keeper/attacker/student → `NotAdmin`, foreign/other-mint/non-ATA settlement → `NotCanonicalAta`, foreign mint → `InvalidUsdcMint`, wrong merchant PDA, duplicate |
| `student_init_reputation` | tier 0, counters 0, bump | foreign reputation PDA, duplicate, gated Halted + WithdrawsOnly → `ProtocolNotNormal` |
| `keeper_register_guarantee` | terms/hash/active/registered_at/bump | admin/attacker/student → `NotKeeper`, mp=0 or cm=0 → `InvalidGuaranteeParams`, foreign guarantee PDA, duplicate, gated → `ProtocolNotNormal` |
| `keeper_update_guarantee` | terms updated, reactivates revoked, timestamp refreshed | non-keeper → `NotKeeper`, zero params → `InvalidGuaranteeParams`, unregistered student, gated in Halted → `ProtocolNotNormal` |
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

1. **`admin_apply_loss` leaves un-accounted vault tokens when
   `outstanding_credit == 0`** — now encoded as failing regression **R1**.
   The instruction only mutates counters: a 300-USDC loss with OC=0 reduces
   junior capital by 300 while the vault still holds every deposited token,
   so `vault + outstanding_credit != junior + senior + accrued_fees` by
   exactly the loss amount. The residual is unclaimable by any instruction.
   Resolution is a **pending business decision** (sweep the lost amount out
   of the vault vs. restrict loss to lent capital) — the regression asserts
   the invariant `V + OC = J + S + AF` and will go green once the chosen
   behavior lands.

2. **External LP burn desyncs `junior_shares` vs mint supply** — now encoded
   as failing regression **R2**. A holder can always burn her own LP tokens
   via spl-token; the program can't prevent it and the share counter keeps
   them on the books. Consequence: the burned shares' NAV becomes stranded
   vault capital (no theft — pure donation/lock; verified by
   `external_lp_burn_cannot_steal_from_other_lps`, which asserts other LPs
   still exit at honest NAV). The redeemability invariant
   `supply == shares` is asserted as the regression.

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
