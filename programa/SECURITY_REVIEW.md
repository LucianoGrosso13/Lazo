# Cuotas program — security review (T3.5)

**Scope:** `programs/cuotas/src/**` (Anchor 1.2.0, Solana CLI 3.1.14), plus brief
skim notes for `app/src/lib/cuotas/real.ts` and `keeper/src/` (journal/policy).
Read but not re-audited: `TEST_REPORT.md` (137/137 LiteSVM + 36/36 host tests
green), `UPGRADE_DEVNET.md`, `DEPLOYMENT_REPORT.md`, `README.md`.

**Method:** line-by-line read of every instruction and state file, cross-checked
against the Anchor 1.2.0 codegen vendored in `~/.cargo/registry` (init lamport
handling, `Option<Account>` sentinel, `mint::freeze_authority` default) and the
skill's security checklist (`/.agents/skills/solana-dev/references/security.md`).
No code was modified; no builds run for this review. Findings reference
`src/` paths relative to `programs/cuotas/`.

## ⚠️ DEVNET MVP — NOT MAINNET-GRADE

This program is a **hackathon MVP running on Solana devnet with a self-issued
test mint (devUSDC)**. It must never hold real funds. The design deliberately
concentrates trust in two single-signature roles (admin, keeper), keeps the
program upgradeable under the same key that is the admin, and ships a
provisional loss instruction. Treat every "High" below as *production
severity under a trusted-party assumption*, not as a bug you can exploit
against the devnet demo for profit — there is nothing real to steal.

## Findings

| # | Severity (prod) | Area | Finding | Status |
|---|---|---|---|---|
| K1 | Low | Plan generation / staleness | Same-second reopen accepts a stale quote: `opened_at` is the only generation discriminator on the Plan PDA `["plan", student]`; settle + reopen within one second gives plan B the same `opened_at` as plan A, so a stale `(index, opened_at)` pair replays onto B. Self-harm only (student-signed; the payment lands in the pool vault and credits the student's own new plan), but it also makes the keeper journal's `{planId}:{openedAt}:{idx}` keys collide across generations. | **KNOWN — fix in flight** (generation discriminator, parallel task); pinned by test `same_second_reopen_rejects_stale_quote` |
| F1 | High | Admin trust | Single-EOA admin with unbounded power: `admin_update_config` rewrites `fee_bps`/`penalty_bps` (each bounded only by ≤ 10_000), `keeper`, `treasury`, tier tables, `seconds_per_day`, `grace_days`, `guarantor_charge_day`; `admin_set_state` pauses at will; `admin_apply_loss` sweeps vault cash to `config.treasury`'s canonical ATA — which the admin controls. Timing parameters apply **retroactively** to open plans: `due_at` is fixed at open, but `Installment::days_late` divides by the *current* `seconds_per_day`, so a config change can make an existing plan instantly late or unmarkable, and a `penalty_bps` hike changes what a late payer owes after the fact. | By design (devnet). Needs multisig + timelock + caps before real funds |
| F2 | High | Keeper trust | Single-EOA keeper is the credit-approval and recovery-attestation authority: `keeper_register_guarantee` accepts arbitrary `max_purchase`/`coverage_max`/`mandate_hash` for any student pubkey (unlocking the guaranteed track, up to 0% down at tier 3); `keeper_register_recovery` marks installments charged against a self-reported `receipt_hash` — the program cannot verify the off-chain card charge happened. A malicious keeper can also self-fund a recovery (deposit `principal + penalties` itself) to permanently damage a student's reputation (`late_count > 0` blocks new plans forever, `tier −1`). | By design (devnet). Needs dual-control / attestation scheme for prod |
| F3 | Medium | Admin ops | **No admin rotation.** `admin_update_config` explicitly cannot change `admin` or `usdc_mint`; no `admin_transfer` instruction exists. A lost or compromised admin key is permanent — and since the admin key is also the upgrade authority (bootstrap requirement), key compromise simultaneously loses config control *and* code control. | Open (limitation) |
| F4 | Medium | `admin_apply_loss` | Provisional cash-loss simulation only: moves `amount` vault→treasury ATA and cuts capital junior-first, but **cannot write off outstanding credit** — a defaulted loan's `outstanding_credit` stays on the books forever and sweeps double-count cash losses against it. Destination is `config.treasury` ATA, admin-chosen. Ungated in every protocol state (pinned by tests). | Provisional by design; business decision pending |
| F5 | Medium | Plan lifecycle | **Abandoned unguaranteed plans are unresolvable zombies.** `keeper_register_recovery` requires `plan.with_guarantee` (`PlanNotGuaranteed`), `pay_installment` requires the student's signature, and nothing else resolves or closes a plan. A student who abandons an unguaranteed plan leaves the PDA open forever: `open_plan` `init` blocks all future plans for that wallet, `reputation.active_exposure` stays > 0 (which also locks `keeper_update_guarantee` via `GuaranteeTermsLocked`), rent stays locked, and `outstanding_credit` permanently overstates recoverable value — socializing the loss to the last LP to withdraw, with no instruction able to reconcile it (see F4). | Open (design gap) |
| F6 | Low | LP deposit griefing | External LP burns can freeze deposits: after a depositor burns supply down to `k` units, `shares_for_deposit`'s exactness check (`UnrepresentableDeposit`) only admits amounts that are multiples of `capital / gcd(capital, k)` — potentially capital-sized. The attacker holds 100% of the tranche NAV, so it costs them their locked deposit but no loss; the tranche only recovers when supply reaches 0 (uncooperative holders can block that cleanup). Documented in `README.md` "Share pricing and external burns". | Open (documented) |
| F7 | Medium | Pool griefing / liveness | **Orphaned capital bricks every gain-booking path.** A depositor who deposits into an empty tranche and then burns *all* of their LP supply via a raw SPL burn (outside the program — LP tokens sit in the holder's own ATA) leaves `capital > 0, shares == 0`. The next `reconcile_shares` records `0`, after which `Pool::book_gain` reverts with `OrphanedCapital` (`pool.rs:230`) — meaning `open_plan` with `fee_bps > 0` or `interest_bps > 0`, penalty-bearing `pay_installment`, and penalty-bearing `keeper_register_recovery` all revert protocol-wide, and `lp_deposit` into the orphaned tranche is rejected forever. The orphan can only be cleared by `admin_apply_loss` spending it down, which requires vault cash ≥ the orphan **and** hits junior before senior — clearing a *senior* orphan requires sweeping all junior capital first; an orphan larger than vault cash (possible when `outstanding_credit > 0`) is unrecoverable. On devnet the deposit costs free devUSDC — a 1-unit deposit + burn suffices. Related edge: total capital `0` (full `admin_apply_loss`) makes `book_gain` revert `NoCapitalForGain`, so penalty-bearing payments stall there too. | Open — root cause is "no orphan-recovery path" (acknowledged in README) + burn self-grief |
| F8 | Low | Business logic | Self-dealing purchases are not prevented: `merchant_register` takes any `merchant_wallet` (unchecked, seed only) and nothing in `open_plan` stops `merchant_wallet == student`. If the admin registers a student-controlled merchant, down payment and pool advance both land in the student's own ATA — a cash loan at `fee_bps` cost secured only by reputation. Also: `merchant.active` is one-way; **no merchant deactivation instruction exists**. | Open (admin must vet merchants; add deactivation for prod) |
| F9 | Low | TOCTOU / staleness | Quote pinning is partial. `pay_installment` pins `expected_installment_index` + `expected_opened_at` but not an expected amount — a `penalty_bps` config change between simulation and landing changes what the student pays. `open_plan` pins only `price`; derived terms (`down_payment`, `merchant_fee`, tier row) resolve from live config at execution time. `lp_deposit`/`lp_withdraw` have no `min_shares`/`min_amount` bound. Under the trusted-admin model this is UX drift; under a malicious admin it is quote bait-and-switch. | Open |
| F10 | Info | `Option<Account>` guarantee | The student chooses the track: passing the program ID for `guarantee` → `None` → unguaranteed tiers, even when an active guarantee exists. An inactive guarantee passed as `Some` behaves identically. Strictly self-harm (unguaranteed terms are never better), but it means "guaranteed" is caller-selected, not enforced — relevant if the business ever makes guarantee use mandatory. | By design (devnet); noted |
| F11 | Info | Receipt uniqueness | `receipt_hash` freshness is scoped to the *open* plan (`Plan::has_receipt`): a closed plan's receipts die with the account, so the same receipt is "fresh" on the next plan generation. Combined with K1, a same-second reopen inherits even the generation timestamp. Keeper-trusted anyway; just means on-chain receipt audit is per-generation only. | Open (limitation) |
| F12 | Info | Clock reliance | All timing derives from `Clock::get()?.unix_timestamp` (validator median; drifts by seconds and is not strictly monotone). With the demo `seconds_per_day = 1`, a few seconds of drift shift several protocol "days" — late marks and the `guarantor_charge_day` gate can fire early/late relative to wall-clock intent. Harmless in production terms (`86400` spd vs multi-day grace), noisy in demo terms. | Open (documented) |
| F13 | Info | Events / indexing | Every instruction emits exactly one `emit!` event — coverage is complete (config init/update/state, pool init, deposit/withdraw/loss, merchant, reputation, guarantee register/update/revoke, plan open/pay/settle/mark-late/recovery). Caveats: log-based events are the weakest evidence channel (fine for devnet indexers; production should prefer `emit_cpi!`); `ConfigUpdated`/`ConfigInitialized` echo only a few fields, so indexers must re-read the account. | Open |
| F14 | Info | Guarantee ops | `keeper_update_guarantee` requires the student's `Reputation` account to exist (for `active_exposure == 0`), while `keeper_register_guarantee` doesn't — you can register a guarantee for a student who never joined, but can't update it until they init reputation and drain exposure. Fail-closed asymmetry, not a vulnerability. | Open (noted) |
| F15 | Info | Donations / NAV | `lp_withdraw`'s liquidity check uses raw `vault.amount`, which includes unsolicited donations and unlent fee cash. Donations therefore subsidize withdrawal liquidity when credit is outstanding (absorbed by exiting LPs, though never credited to anyone's NAV). Conversely, withdrawals are *not* capped by vault-minus-OC explicitly — `InsufficientLiquidity` only fires when the computed NAV payout exceeds the raw balance. Consistent with the documented accounting model (`vault + OC = J + S`, donations = unallocated surplus), but worth stating precisely. | Open (documented) |
| F16 | Info | Origination accounting | `interest` is booked into LP capital at origination via `book_gain` (`gain = merchant_fee + interest`) — i.e., uncollected interest is recognized up front. If a plan defaults, that pre-booked gain is only reconciled through a real recovery deposit or `admin_apply_loss`. Currently inert (`interest_bps = 0` in every seeded tier), but config validation allows `interest_bps > 0`, so the day interest is enabled this becomes real accounting risk. | Open (latent) |

## Per-area verification detail

### Signer & owner constraints (per instruction)

| Instruction | Authority check | Notes |
|---|---|---|
| `admin_init_config` | `admin` is Signer; `program.programdata_address() == Some(program_data.key())` and `program_data.upgrade_authority_address == Some(admin.key())` | Bootstrap bound to the real upgrade authority through the program → ProgramData relationship (`admin_config.rs:25-31`). Config PDA `init`s once — cannot be re-ran |
| `admin_update_config`, `admin_set_state`, `admin_apply_loss` | `config.admin == admin.key()` (`NotAdmin`) + `admin` is Signer | `apply_loss` additionally takes pool/vault/mint/treasury by seeds or canonical ATA |
| `pool_init`, `merchant_register` | admin, + `state.is_normal()` | Merchant wallet is `UncheckedAccount` used only as PDA seed (CHECK comment, `merchant_register.rs:25`) |
| `student_init_reputation`, `open_plan`, `pay_installment` | `student` is Signer; all derived PDAs bind `student.key()` | Repayment is student-only by construction (see F5) |
| `lp_deposit`, `lp_withdraw` | `depositor` is Signer + `token::authority = depositor` on both ATAs | Permissionless by design |
| `keeper_register_guarantee` / `keeper_update_guarantee` / `keeper_revoke_guarantee` / `keeper_register_recovery` | `keeper` is Signer + `config.keeper == keeper.key()` (`NotKeeper`) | `student` is seed-only `UncheckedAccount` (CHECK comments present); in `keeper_register_recovery` it is `mut` to receive the closed-plan rent — seed binding makes it unspoofable |
| `crank_mark_late` | `crank` is any Signer (permissionless crank — intended) | `student` seed-only; only marks what is already past grace |

Every typed `Account<'info, T>` gets owner=program + discriminator validation from
Anchor automatically; the only `UncheckedAccount`s are pure seed carriers and
each carries a `/// CHECK:` comment. No `remaining_accounts` anywhere — nothing
bypasses `#[derive(Accounts)]` validation.

### PDA seeds & bumps

| PDA | Seeds | Bump handling |
|---|---|---|
| `ProtocolConfig` | `["config"]` | canonical, stored (`config.bump`), reused as `bump = config.bump` |
| `Pool` | `["pool", config.usdc_mint]` | canonical, stored; used for all pool-signed CPIs |
| Vault | `["vault", pool]` | recomputed (token account can't store a bump; canonical by `find_program_address`) |
| LP mints | `["lp_junior"|"lp_senior", pool]` | recomputed, same reason |
| `Merchant` | `["merchant", merchant_wallet]` | canonical, stored |
| `Reputation` | `["reputation", student]` | canonical, stored |
| `Guarantee` | `["guarantee", student]` | canonical, stored; account never closed |
| `Plan` | `["plan", student]` | canonical, stored; closed on settlement (see K1) |

Seeds are domain-separated and user-scoped; no shared-authority PDA spans users.
The `Option<Account<Guarantee>>` in `open_plan` uses the standard Anchor
sentinel (program ID ⇒ `None`, constraints skipped); when `Some`, seeds
`["guarantee", student]` bind it to the signing student.

### Unchecked accounts (CHECK comments)

`merchant_wallet` (merchant_register, open_plan), `student` (all four
keeper_* instructions, crank_mark_late) — all are PDA seeds or lamport
destinations only, each annotated with a `/// CHECK:` comment. No unchecked
account is deserialized into logic.

### Checked math

All arithmetic is `checked_*` or `u128`-widened (`bps_of`, `shares_for_deposit`,
`amount_for_withdraw`, `book_*`, `gain_allocation`, `apply_loss`, `due_at`,
repayable/financed/advance computations, counters). Narrowing uses
`u64::try_from` with `MathOverflow`. The only `as` casts are `u8→usize`,
`u8/u16/u32→i64` widenings, and `usize→u8` for indexes already bounded `< 3` by
an earlier `require!` — all safe. `bps_of` floors toward the payer; withdrawals
floor toward the pool; `split_installments` gives the last installment the
remainder so sums are exact.

### init / close / reinit

`init` everywhere, `init_if_needed` nowhere. Anchor 1.2's generated init funds
the rent deficit on already-lamported accounts then `allocate`+`assign` — so
pre-funding a PDA is a donation, not a DoS (verified in `anchor-syn-1.2.0`
`generate_create_account_or_fund_allocate_assign`). Only `Plan` closes (`close =
student` on settlement in `pay_installment` / `keeper_register_recovery`), which
is the intended generation cycle — Anchor's `close` drains lamports, zeroes the
discriminator and reassigns to the system program, so a *later* `open_plan`
re-`init`s cleanly (see K1 for the generation-collision caveat).
`Guarantee`/`Merchant`/`Reputation`/`ProtocolConfig`/`Pool` are permanent — no
close path exists, which is deliberate for audit and prevents recreation abuse,
but permanently locks rent and prevents any GDPR-style cleanup.

### CPI signer seeds & program pinning

Pool-signed CPIs (`transfer_checked` from vault, `mint_to` LP) use
`new_with_signer` with `["pool", config.usdc_mint, pool.bump]` — the stored
canonical bump. Anchor 1.2 `CpiContext::new` takes a program **id**, and every
token CPI goes to `token_program` constrained `== anchor_spl::token::ID`
(classic SPL) in every token-touching instruction — including
`admin_init_config` (explicit `usdc_mint.owner == spl_token::ID`),
`merchant_register` (classic `get_associated_token_address` derivation makes a
Token-2022 ATA unreachable), `pool_init`, both LP ops, `open_plan`,
`pay_installment`, `keeper_register_recovery`. `mint::token_program` /
`token::token_program` constraints keep mint/token accounts on the same program.
Token-2022 is rejected by construction, not just discouraged. `transfer` (the
unchecked variant) never appears — only `transfer_checked`. LP mints are
initialized with `mint::authority = pool` and **no freeze authority** (Anchor
1.2 defaults `mint::freeze_authority` to `None` — verified in anchor-syn), so no
latent freeze capability exists.

### Guarantee handling (`Option<Account>`)

Covered under F10: `Some` ⇒ seeds+deserialization enforced, `active` selects the
track; `None` (program ID) ⇒ unguaranteed tiers clamped to `min(tier, 1)`. The
guarantee account is *not* re-validated at recovery time — `keeper_register_recovery`
trusts the `plan.with_guarantee` snapshot, which is correct (the fianza was
signed at open; post-open revocation must not void it) but worth stating.

### Staleness guards

`pay_installment`: `expected_installment_index` must equal `first_unpaid` and be
unresolved; `expected_opened_at` must equal `plan.opened_at` (K1 is the residual
gap). `keeper_register_recovery`: trigger index must be the first unpaid, past
`guarantor_charge_day`; `receipt_hash` nonzero and unused *on this plan* (F11).
`keeper_update_guarantee`: `mandate_hash` must differ from stored
(`MandateHashUnchanged`, R4 regression). `crank_mark_late`: idempotent via
explicit errors (`AlreadyMarkedLate`, `MarkTooEarly`, `InstallmentAlreadyResolved`).
TOCTOU gaps beyond that are F9.

### Admin trust surface

`admin_init_config` (bootstrap = upgrade authority), `admin_update_config`
(full replacement — all params must be re-supplied each time, a stale/forgetful
update silently resets omitted fields), `admin_set_state` (any↔any, ungated),
`admin_apply_loss` (F4), `merchant_register` (F8). There is no rate limit,
timelock, hardcoded cap, or second signer anywhere on the admin path (F1/F3).

### Keeper trust

`keeper_register_guarantee` / `keeper_update_guarantee` / `keeper_revoke_guarantee`
(arbitrary terms; update locked while `active_exposure > 0` — good) and
`keeper_register_recovery` (F2: self-reported receipts, self-fundable,
all-or-nothing `total` deposit — a partially-collected card charge can't be
partially booked; the keeper either fronts the shortfall or the plan stalls).
`keeper_revoke_guarantee` intentionally ungated; revocation does not void
in-flight plans (snapshot semantics — correct).

### Clock reliance

`opened_at`, `registered_at`, every `due_at`, and every `days_late` gate derive
from `unix_timestamp` (F12). `days_late` uses `seconds_per_day` *at evaluation
time* — the retroactive-config aspect is part of F1. `due_at` itself is frozen
at open (good: `installment_interval_days` changes don't move existing due dates).

### Rent-exemption / DoS

All program accounts are `init`ed at exact `InitSpace` with rent-exempt
lamports paid by the initiating signer (admin for config/pool/merchant, keeper
for guarantee, student for reputation/plan). No account can be created *for* a
victim by a stranger (all PDAs are bound to a signer or an admin/keeper action),
and pre-funded-PDA griefing is neutralized by Anchor's deficit top-up. Residual
DoS surfaces: F5 (zombie plan — also a rent lock), F6 (deposit grid after
burns), F7 (orphaned capital), and the fact that permanent accounts never release rent
(cheap on devnet, real cost on mainnet). Crate-level `overflow-checks = true`
in `release` adds a second net under the checked math.

### Event completeness

One `emit!` per instruction; fields cover the decision-relevant data
(see `events.rs`). Gaps are editorial, not security-critical: `ConfigUpdated`
omits the new params (indexer must re-read the account), `PlanSettled` omits the
final installment index (already emitted by `InstallmentPaid`), and none of the
events carry a config version or slot — log-based `emit!` vs `emit_cpi!` is the
deeper production question (F13).

## Skim notes (not a full audit)

### `app/src/lib/cuotas/real.ts` — tx safety

- **Devnet is enforced twice**: `loadRealEnv` rejects RPC URLs matching
  `/mainnet/i`, and `assertDevnet` checks the RPC's **genesis hash**
  (`EtWTRABZa…`) per URL — a custom endpoint pointing at devnet passes, a
  mislabeled mainnet endpoint fails closed. Good.
- **Simulate-before-sign is structural**: `proposeTransaction` builds the exact
  v0 message, replaces *every* instruction signer with a zero-signature dummy,
  and simulates with `sigVerify: false` — simulation can never request a real
  signature. Failure throws `simulation_failed` before the wallet sees anything.
- **Review → send is pinned**: `proposeAndSend` gates on an explicit `Reviewer`
  (`window.confirm` in browser; throws without one in Node), then
  `sendReviewedProposal` re-verifies each instruction's fingerprint, the fee
  payer identity, and reuses the *simulated* blockhash — "lo revisado es lo
  enviado". Residual TOCTOU is state drift between sim and land (F9), not
  payload tampering.
- `readProgramAccount` validates owner + discriminator + exact size before
  decoding — strong untrusted-data hygiene.
- Read paths treat a closed plan (System owner) as absent — correct.
- Note: `payInstallment` passes `expectedInstallmentIndex: firstUnpaid` and
  `expectedOpenedAt: plan.openedAt` from the freshly-read plan — correctly
  pinning the generation (modulo K1). `openPlan` sends `guarantee = programId`
  when no guarantee exists — matching the sentinel convention.
- Caveat: the default reviewer is `window.confirm` — a UI-level approve-all
  button with a text summary, not a parsed simulation diff. For the demo fine;
  production should render decoded instruction effects.

### `keeper/` journal idempotency

- Append-only JSONL journal (`journal.ts`), every record `fsync`ed; a torn line
  on startup throws `corrupt_journal` and fails closed rather than re-executing
  unknown effects. Terminal records make keys idempotent across restarts.
- Keys are generation-aware (`{kind}:{planId}:{openedAt}:{idx}`) — this is
  where the known K1 gap leaks into off-chain state: a same-second reopened plan
  produces colliding keys and the keeper will skip the new plan's actions
  (fails closed = undercharges, doesn't double-charge). The in-flight program
  fix should propagate a generation field into these keys.
- The loop never signs: it only writes `PROPOSED` records; effects require
  `--execute --proposal <id> --approved-by --yes`. Recovery requires a verified
  `CHARGE_OK` receipt from the journal and refuses to fabricate one; a
  `ReceiptAlreadyUsed` response syncs as registered instead of retrying —
  correct crash-recovery behavior.
- Card charges use a deterministic `chargeReference(plan, openedAt, idx,
  attempt)` so gateway retries dedupe server-side; cumulative charges per
  generation are capped at `coverageMax` before calling the gateway.
- Known asymmetry, consistent with the program: a partial off-chain charge
  proposes a `LOSS_PROPOSED` follow-up rather than partially registering —
  matches the on-chain all-or-nothing deposit.

## What production would need

Before this code could custody real USDC, at minimum:

1. **Admin/keeper decentralization.** Squads-style multisig for both roles, a
   timelock on `admin_update_config`, hardcoded caps the admin cannot exceed
   (e.g. `fee_bps`, `penalty_bps` ceilings), and an `admin_transfer` /
   `keeper` rotation path. The program is upgradeable and the upgrade
   authority *is* the admin at bootstrap — for mainnet the upgrade authority
   must be a multisig or burned after a verified, audited build.
2. **Plan generations.** Close the K1 gap (a nonce/generation in the Plan or
   a separate registry PDA), and propagate it into keeper journal keys and
   client stale-guards.
3. **A real default/write-off path.** An unguaranteed abandoned plan must be
   closable (crank after expiry, admin write-off of `outstanding_credit`
   without a cash sweep — the F4 decision), and LP NAV must not keep phantom
   credit alive. Decide cash-vs-credit-write-off semantics before real money.
4. **Merchant lifecycle.** `merchant_set_active(false)` at minimum; ideally
   self-purchase detection heuristics or a merchant allowlist policy enforced
   operationally (F8).
5. **Quote pinning.** `expected_*` terms arguments on `open_plan` (down
   payment, fee, tier row) and `min_out` bounds on LP ops, so a config change
   between simulation and landing reverts instead of repricing the user (F9).
6. **Keeper accountability.** Global receipt registry (or per-student
   append-only record that survives plan close), dual-control for recoveries
   above a threshold, and an explicit acknowledgment that the
   card-charge→deposit link is unverifiable on-chain — attestation flows
   belong in the backend with audit trails.
7. **LP deposit ergonomics without reintroducing I-05.** The exact-share rule
   is correct but creates the F5 freeze; production should either allow
   floor-priced deposits with a dust-limit, or sweep residual NAV to the
   remaining holders explicitly.
8. **Clock robustness + account lifecycle.** Keep `seconds_per_day = 86400`
   only; consider a `Reputation`/`Merchant` close-or-migrate path (lost-key
   students currently lose reputation forever, and `late_count > 0` is a
   permanent blacklist with no rehabilitation path — confirm that is the
   intended product rule).
9. **Events for indexers.** `emit_cpi!` (or a noop-program pattern) and fuller
   event payloads for `ConfigUpdated`; indexers shouldn't have to re-fetch
   state to explain a config change.
10. **External verification.** Fuzz the NAV math and lifecycle state machine
    (Trident), run a fresh-eyes audit before any mainnet deploy, verify the
    real USDC mint's freeze authority policy at `admin_init_config` (the
    program pins only `decimals == 6` and classic-owner today — a
    freeze-authority-bearing mint could freeze the vault), and publish a
    reproducible build.

## Files reviewed

```
programs/cuotas/src/lib.rs                          instruction routing, docs
programs/cuotas/src/constants.rs                    seeds, INSTALLMENT_COUNT, decimals
programs/cuotas/src/error.rs                        error surface
programs/cuotas/src/events.rs                       event payloads
programs/cuotas/src/state/config.rs                 ProtocolConfig, ConfigParams::validate
programs/cuotas/src/state/pool.rs                   NAV math, reconcile, gain/loss
programs/cuotas/src/state/plan.rs                   Plan/Installment, bps_of, split, due_at
programs/cuotas/src/state/{guarantee,merchant,reputation}.rs
programs/cuotas/src/instructions/admin_config.rs    bootstrap + update
programs/cuotas/src/instructions/admin_set_state.rs
programs/cuotas/src/instructions/admin_apply_loss.rs
programs/cuotas/src/instructions/pool_init.rs
programs/cuotas/src/instructions/{lp_deposit,lp_withdraw}.rs
programs/cuotas/src/instructions/merchant_register.rs
programs/cuotas/src/instructions/student_init_reputation.rs
programs/cuotas/src/instructions/keeper_guarantee.rs
programs/cuotas/src/instructions/open_plan.rs
programs/cuotas/src/instructions/pay_installment.rs
programs/cuotas/src/instructions/crank_mark_late.rs
programs/cuotas/src/instructions/keeper_register_recovery.rs
skim: app/src/lib/cuotas/real.ts, keeper/src/{run,journal}.ts
refs: programa/{README,TEST_REPORT,DEPLOYMENT_REPORT,UPGRADE_DEVNET}.md,
      proyecto/03-brief-companero.md, Anchor 1.2.0 vendored codegen
```
