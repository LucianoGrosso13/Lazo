# cuotas — Anchor program

Core of an interest-free installment prototype for Solana **devnet only** (the test network; no real money). The intended product uses a family guarantor, a two-tranche liquidity pool and an on-chain reputation ladder.

**Status: core implementation, not a completed or deployed product.** No program has been deployed and no devUSDC mint exists yet: deployment is prepared and explicitly user-approved, but currently blocked on devnet faucet funding — see `DEPLOYMENT_REPORT.md` for the live status, recorded attempts and resumable commands. Loan origination, installments, defaults, recoveries and keeper cranks are out of scope. Final business acceptance of the loss and gain policies is still pending; passing technical checks does not resolve those decisions.

- Deployment program ID (keypair held outside the repo): `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` (reserved for deploy; not proof of a deployed account).
- Intended devUSDC mint: `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` — **not created**; classic SPL Token, 6 decimals, deployer mint authority, no freeze authority. It is a test token, never real USDC.
- Toolchain: Anchor CLI and `anchor-lang`/`anchor-spl` `1.2.0`, Solana CLI `3.1.14`. `rust-toolchain.toml` pins Rust `1.89.0` for workspace host work (unit tests, fmt/clippy, host-side IDL builds); the SBF artifact is compiled by Solana's bundled platform tools via `anchor build`/`cargo-build-sbf`, not by that pinned host rustc. The LiteSVM harness needs newer host crates (e.g. `solana-syscalls`), so it runs on the installed `stable` toolchain via `cargo +stable` (tested on 1.99.0).
- Token accounts use `token_interface`; every token transfer uses `transfer_checked`. Only the classic SPL Token program is supported, not Token-2022.

## Safe local build and tests

From the repository root:

```sh
cd programa
NO_DNA=1 anchor build --arch v1
cargo test -p cuotas --lib
cargo +stable test --manifest-path tests/Cargo.toml --no-fail-fast
cargo fmt --all -- --check
cargo clippy -p cuotas --all-targets -- -D warnings
```

`rust-toolchain.toml` pins `1.89.0` for host commands under `programa/` (`cargo test -p cuotas --lib`, fmt, clippy); `anchor build` delegates SBF compilation to Solana's bundled platform tools, which the pin does not govern. The independent LiteSVM suite in `tests/` is a separate host-side workspace whose dependencies require a newer rustc, so its command must override the pin with `+stable` (or run where no pin applies).

These commands build and execute local host/LiteSVM tests; they do not deploy, start a network validator or submit network transactions. `--arch v1` selects SBPFv1 bytecode for the local LiteSVM harness; it is unrelated to the transaction message version. Run the SBF build serially: do not race another build using `programa/target`. The independent acceptance harness uses its own `tests/target` and loads `target/deploy/cuotas.so`.

The `test` script in `Anchor.toml` contains the two Cargo test commands. Do **not** use plain `anchor test`: the provider is devnet and the command can attempt deployment. Generated artifacts are `target/deploy/cuotas.so`, `target/idl/cuotas.json` and `target/types/`. Verification must identify the exact source commit and SHA-256 of the artifact tested; prior or interim test results are not final acceptance. Instruction-level evidence is maintained separately in `TEST_REPORT.md`.

## Accounts

| Account | Seeds | Contents |
|---|---|---|
| `ProtocolConfig` | `["config"]` | admin, keeper, immutable usdc_mint, treasury, fee/penalty/timing parameters, minimum financed amount, guaranteed/unguaranteed tier tables, state and canonical bump |
| `Pool` | `["pool", usdc_mint]` | junior/senior shares and capital, outstanding credit, informational accrued fees and bump |
| Vault | `["vault", pool]` | devUSDC token account controlled by the pool |
| Junior LP mint | `["lp_junior", pool]` | pool mint authority, 6 decimals |
| Senior LP mint | `["lp_senior", pool]` | pool mint authority, 6 decimals |
| `Merchant` | `["merchant", wallet]` | owner, canonical settlement ATA, active flag and plan count |
| `Reputation` | `["reputation", student]` | tier, completed plans, late count, active exposure and bump |
| `Guarantee` | `["guarantee", student]` | purchase/coverage caps, mandate hash, active flag, registration time and bump |

LP tokens are receipts for a tranche's capital. An ATA is the canonical token account for an owner and mint. All business parameters come from `ProtocolConfig`, not hardcoded handler defaults.

## Instructions and authorization

| Instruction | Authority | State gate | Behavior |
|---|---|---|---|
| `admin_init_config` | current program upgrade authority | once, using `init` | binds executable program and ProgramData; validates config and classic 6-decimal mint |
| `admin_update_config` | admin | any | replaces parameters, not admin/mint/state |
| `admin_set_state` | admin | any | Normal, Halted or WithdrawsOnly |
| `pool_init` | admin | Normal | initializes pool, vault and both LP mints |
| `lp_deposit(tranche, amount)` | depositor | Normal | reconciles canonical supply, requires exact shares before transfer/mint |
| `lp_withdraw(tranche, shares)` | depositor | Normal or WithdrawsOnly | burns owned shares; pays no more than actual vault liquidity |
| `admin_apply_loss(amount)` | admin | any | **PROVISIONAL** cash-loss simulation to the canonical treasury ATA |
| `merchant_register` | admin | Normal | binds merchant to its canonical devUSDC settlement ATA |
| `student_init_reputation` | student | Normal | creates tier-zero reputation |
| `keeper_register_guarantee` | keeper | Normal | initializes one guarantee per student |
| `keeper_update_guarantee` | keeper | Normal, no active exposure | requires a nonzero mandate hash different from the stored hash |
| `keeper_revoke_guarantee` | keeper | any | clears active only; retains historical terms |

Deposit and withdrawal validate canonical LP seeds, pool mint authority, decimals and classic token-program ownership explicitly. User token accounts must have the expected mint, owner and canonical ATA address.

## Share pricing and external burns

Let `C` be the selected tranche's tracked capital, `S` its canonical LP mint supply and `A` a deposit, all in base units. Before pricing a deposit or withdrawal, reconcile recorded shares to live supply. A supply above the recorded count fails with `LpSupplyMismatch`. Partial external burns forfeit the burned claims to remaining holders; unsolicited token donations never enter tracked capital automatically.

- Bootstrap mints 1:1 **only when C = S = 0**.
- `C > 0, S = 0` fails with `OrphanedCapital`; new depositors cannot capture abandoned capital. No administrative orphan-recovery instruction is added.
- `C = 0, S > 0` rejects deposits with `TrancheWipedOut`. Holders may withdraw their own valid shares for zero payout; recapitalization is possible only after all worthless claims are retired. Lost or uncooperative holders can prevent that cleanup.
- For `C > 0, S > 0`, compute checked `u128` numerator `A * S`. Reject a nonzero remainder modulo `C` with `UnrepresentableDeposit`, **before transferring tokens or minting shares**. Then divide exactly, check `u64` narrowing and require positive shares. Capital/share booking is checked as well.

The exact deposit amount increment is **`C / gcd(C, S)` token base units**. This is intentionally restrictive: the increment may become large after losses or external burns, and no rounding tolerance, fee or hidden donation is accepted. The ABI remains `lp_deposit(tranche, amount)`.

For example, after a sole depositor deposits 1,000,000,000 base units and burns all but one LP unit, a 1,500,000,000-unit victim deposit is rejected. Floor rounding would mint one LP unit and transfer 250,000,000 units of value to the incumbent; exact representability prevents that transfer. Withdrawals still round down, and withdrawing the entire live supply returns the entire tracked tranche capital subject to liquidity.

## Gains and accounting

The brief calls for gains proportional to tranche capital. `Pool::gain_allocation(J, S, gain)` is a pure Rust helper, not an instruction: it floors each capital-proportional allocation, then assigns the entire integer remainder to senior. Thus `deltaJ + deltaS == gain`; the remainder is at most one base unit. A zero-capital tranche receives no gain. Positive gain with zero total capital fails with `NoCapitalForGain`; zero gain fails with `ZeroAmount`.

`Pool::book_gain` computes both resulting capitals and the fee counter with checked arithmetic before changing any field. It rejects positive capital without recorded shares (`OrphanedCapital`) and fails without partial host mutation on overflow. Shares and outstanding credit are unchanged. A future caller must reconcile both canonical LP supplies and validate the backing asset increase in the same atomic instruction before booking recognized income; this core has no gain-recognition instruction or loan flow.

`accrued_fees` is a **cumulative informational counter of recognized gains already allocated to LP capital**, not an extra treasury payable or reserve. It starts at zero and no currently exposed instruction increases it. Losses and withdrawals do not reset or subtract this historical counter.

Without unsolicited donations, recognized accounting is:

`vault.amount + outstanding_credit = junior_capital + senior_capital`

Donations remain unallocated surplus, so actual assets may exceed tracked capital; there is no automatic surplus allocation. Withdrawals are bounded by `vault.amount`, not `vault.amount - accrued_fees`, and outstanding credit is not subtracted again because lent tokens are already absent from the vault. Gains must not be counted twice as both LP capital and a treasury liability.

## PROVISIONAL loss policy and pending decisions

The current `admin_apply_loss` draft actually transfers vault tokens to the canonical treasury devUSDC ATA and reduces capital junior-first, leaving outstanding credit unchanged. It is a **cash-loss simulation**, not an existing-credit write-off, and remains subject to the user's explicit business decision. Its asset and capital changes match; insufficient vault funds roll the transaction back.

An existing-credit write-off would instead require sufficient outstanding credit, reduce that credit and capital, and leave vault tokens unchanged. It is not implemented. Proportional gains follow the brief, but final business acceptance is also pending. Neither local tests nor this README claim the complete brief is accepted.

Junior deposits remain permissionless in this core; team-only junior funding is an operational demo convention, not an enforced allowlist. No real investors or mainnet operation are supported.

## Deployment status

**Not deployed; devUSDC not created — funding blocked.** The deployment is prepared and explicitly user-approved: program ID `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`, mint `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y`, reviewed artifact `cuotas.so` SHA-256 `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476` (469,824 bytes). All four bounded faucet requests were rate-limited and the deployer balance remains 0, so no network transaction has been submitted. `DEPLOYMENT_REPORT.md` records every attempt, the exact approved commands (key paths are placeholders; keys live outside the repo) and the post-deployment verification plan. No protocol initialization (`admin_init_config`/`pool_init`), mint-to, or any other write is authorized or planned by this task. The safe verification flow above still performs no network actions.
