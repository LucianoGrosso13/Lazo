# cuotas — Anchor program

Interest-free USDC installments ("Cuotas sin tarjeta") on Solana **devnet** for
the Colosseum Crypto World's Fair hackathon. A student pays in fixed
installments backed by a family guarantor; a two-tranche liquidity pool
(junior = first-loss, senior = LP capital) advances the merchant settlement
and absorbs losses junior-first; an on-chain reputation ladder unlocks better
terms.

**Status: core program only.** `open_plan`, installment payments,
default/mora, recovery and keeper cranks are intentionally NOT implemented
yet — they land in a later iteration. Nothing here is deployed: no program,
no devUSDC mint, no transaction was ever signed or sent.

- Program ID (declare_id): `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`
- Toolchain: Anchor CLI `1.2.0`, `anchor-lang/anchor-spl 1.2.0`,
  Solana CLI `3.1.14`, platform-tools `v1.52`
- Token model: `token_interface` (`InterfaceAccount<Mint/TokenAccount>`,
  `Interface<TokenInterface>`) pinned explicitly to the **classic SPL Token**
  program — devUSDC is a classic 6-decimals mint.

## Accounts (PDAs)

| Account | Seeds | Contents |
|---|---|---|
| `ProtocolConfig` | `["config"]` | admin, keeper, `usdc_mint` (immutable), treasury, `fee_bps`, `penalty_bps`, `grace_days`, `guarantor_charge_day`, `seconds_per_day`, `min_financed_to_count`, 4 guaranteed + 2 unguaranteed `TierParams`, `state`, `bump`. All business defaults live here — nothing is hardcoded in handlers. |
| `Pool` | `["pool", usdc_mint]` | junior/senior `shares` + `capital`, `outstanding_credit`, `accrued_fees`, `bump`. |
| vault | `["vault", pool]` | token account, mint = usdc_mint, authority = pool. |
| junior LP mint | `["lp_junior", pool]` | mint authority = pool, 6 decimals. |
| senior LP mint | `["lp_senior", pool]` | mint authority = pool, 6 decimals. |
| `Merchant` | `["merchant", wallet]` | owner, canonical settlement ATA, active, plans_count. |
| `Reputation` | `["reputation", student]` | tier, plans_completed, late_count, active_exposure. |
| `Guarantee` | `["guarantee", student]` | max_purchase, coverage_max, mandate_hash, active, registered_at. |

Invariant: `vault.amount + outstanding_credit == junior_capital + senior_capital + accrued_fees`.

## Instructions

| ix | authority | state gate | notes |
|---|---|---|---|
| `admin_init_config` | **program upgrade authority** (proven via program → ProgramData relation, not "first signer wins") | once (`init`) | validates params, pins usdc_mint (6 dec, classic SPL) |
| `admin_update_config` | admin | any state | full replacement of params; never touches admin/usdc_mint/state |
| `admin_set_state` | admin | any state | Normal / Halted / WithdrawsOnly — needed to un-pause |
| `pool_init` | admin | Normal | creates pool + vault + both LP mints |
| `lp_deposit(tranche, amount)` | depositor | Normal | transfer_checked in, LP shares out at tranche NAV |
| `lp_withdraw(tranche, shares)` | depositor | Normal + WithdrawsOnly | burn shares, USDC out; zero-payout burns allowed |
| `admin_apply_loss(amount)` | admin | any state | cash simulation: vault → treasury ATA; capital −junior-first |
| `merchant_register` | admin | Normal | merchant wallet does NOT sign; settlement = canonical ATA |
| `student_init_reputation` | student | Normal | self-service, tier 0 |
| `keeper_register_guarantee` | keeper | Normal | `init` — cannot be recreated |
| `keeper_update_guarantee` | keeper | Normal + `reputation.active_exposure == 0` | only re-activation path; requires fresh nonzero mandate_hash |
| `keeper_revoke_guarantee` | keeper | **any state** | `active = false`, terms kept for audit |

## Build & test (safe — no deploys)

```sh
# SBF artifact → target/deploy/cuotas.so
# --arch v1 produces SBPFv1 bytecode: accepted by every LiteSVM/agave
# runtime and deployable on devnet. Plain `anchor build` defaults to v3,
# which LiteSVM's v1 program-runtime loader rejects.
cd programa
NO_DNA=1 anchor build --arch v1

# host math unit tests (NAV, waterfall, reconcile, config validation)
cargo test -p cuotas --lib

# independent LiteSVM acceptance suite (owned by the test worker)
cargo test --manifest-path tests/Cargo.toml --no-fail-fast

# same two, via the anchor test script (never starts a validator, never deploys)
# `anchor test` itself is NOT safe here — provider is devnet.
```

`cargo fmt --check` and `cargo clippy -p cuotas --all-targets` are clean.

## Design decisions where the brief was ambiguous

1. **Bootstrap admin = upgrade authority.** `admin_init_config` requires the
   signer's key to equal `program_data.upgrade_authority_address`, proven via
   `program.programdata_address()`. A random first caller cannot steal the
   singleton admin role.
2. **`admin_apply_loss` = cash simulation.** The admin moves `amount` USDC out
   of the vault into the treasury's canonical ATA and tranche capital is
   reduced junior-first; `outstanding_credit` is untouched and the accounting
   invariant holds at every step. Final "cash vs credit write-off" semantics
   are a pending business decision — the waterfall helper
   (`Pool::apply_loss`) is shared, so switching modes only touches the
   handler's cash movement and a `amount <= outstanding_credit` bound.
3. **LP supply reconciliation before pricing.** `lp_mint.supply` is synced
   into `Pool.*_shares` before every deposit/withdraw: raw SPL burns by
   holders forfeit their NAV claim to remaining holders; `supply > recorded`
   is rejected as corruption (`LpSupplyMismatch`).
4. **Degenerate tranche states.** Bootstrap 1:1 pricing requires BOTH
   `shares == 0` and `capital == 0`. `capital > 0, shares == 0` is orphaned
   NAV — deposits rejected (`OrphanedCapital`) so no one is gifted leftover
   balance. `capital == 0, shares > 0` is a wiped tranche — deposits rejected
   (`TrancheWipedOut`), withdrawals still allowed at zero payout so holders
   retire worthless shares and the tranche can later recapitalize cleanly.
5. **Guarantee lifecycle.** `init` makes the guarantee un-recreatable; update
   rewrites terms and is the only re-activation path, but is Normal-gated,
   requires a fresh nonzero `mandate_hash`, and is rejected while the
   student's `reputation.active_exposure > 0` (the PDA is validated by seeds).
   Revoke works in any state and preserves the terms for auditability.
6. **Junior tranche is permissionless.** Anyone can deposit either tranche;
   in practice the team seeds junior first-loss capital.
7. **All NAV/share math is `u128` + checked ops**; no `saturating_*` in
   accounting paths. LP withdraws are bounded by `vault - accrued_fees`
   (credit already advanced is simply absent from the vault).

## Deployment — PENDING EXPLICIT APPROVAL

Nothing is deployed. The steps below are prepared but **must not be run
without an explicit go-ahead**; every transaction that signs or sends needs
per-action approval. Devnet only — never mainnet.

```sh
# 0) build artifact (see above)
cd programa && NO_DNA=1 anchor build --arch v1

# 1) create devUSDC (6 decimals, authority = deployer) — devnet faucet SOL first
solana config set --url devnet
spl-token create-token --decimals 6            # record <DEVUSDC_MINT>
spl-token create-account <DEVUSDC_MINT>

# 2) deploy program (upgrade authority = deployer wallet — that wallet MUST
#    also be the one to call admin_init_config afterwards)
solana program deploy target/deploy/cuotas.so --program-id <KEYPAIR_JSON>

# 3) run admin_init_config via a small TS/Rust client (IDL: target/idl/cuotas.json)
#    accounts: admin(=upgrade authority), program, program_data, config, usdc_mint
# 4) run pool_init, seed junior capital, register keeper/merchants per runbook
```

## Layout

```
programs/cuotas/src/
  lib.rs            entrypoint + instruction docs
  constants.rs      PDA seeds, USDC_DECIMALS, BPS_DENOMINATOR
  error.rs          CuotasError (6000+)
  events.rs         emitted events
  state/            ProtocolConfig+TierParams, Pool+Tranche, Merchant,
                    Reputation, Guarantee (+ host unit tests)
  instructions/     admin_config, admin_set_state, pool_init, lp_deposit,
                    lp_withdraw, admin_apply_loss, merchant_register,
                    student_init_reputation, keeper_guarantee
tests/              LiteSVM acceptance suite — OWNED BY THE TEST WORKER
target/idl/cuotas.json   generated IDL (from `anchor build`)
target/types/            generated TS types
```
