//! REGRESSION suite: these tests encode invariants the program is REQUIRED
//! to satisfy but currently violates. They are intentionally RED — each
//! failure names the defect it tracks. When core lands the fix, they go
//! green without further changes. Do NOT weaken them to pass.
//!
//! Tracked defects (see TEST_REPORT.md):
//!   R1  apply_loss strands vault tokens (V + OC != J + S + AF)
//!   R2  external LP burn creates phantom, unredeemable shares
//!   R3  admin_init_config accepts any signer (upgrade-authority binding
//!       pending core ABI: program/programdata accounts not in the ix)
//!   R4  keeper_update_guarantee reactivates with the same revoked mandate

use cuotas::Tranche;
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::expect_instruction_failure;
use cuotas_tests::{ix, spl};
use solana_signer::Signer;

/// The pool accounting invariant the spec demands:
/// `vault + outstanding_credit == junior_capital + senior_capital + accrued_fees`
fn pool_invariant_delta(env: &Env) -> i128 {
    env.accounting_delta()
}

fn deposit(env: &mut Env, kp: &solana_keypair::Keypair, tranche: Tranche, amount: u64) {
    let lp_mint = match tranche {
        Tranche::Junior => cuotas_tests::pda::lp_junior(&cuotas_tests::pda::pool(&env.usdc_mint).0).0,
        Tranche::Senior => cuotas_tests::pda::lp_senior(&cuotas_tests::pda::pool(&env.usdc_mint).0).0,
    };
    let owner = kp.pubkey();
    env.make_ata(&owner, &env.usdc_mint, amount * 2);
    env.make_ata(&owner, &lp_mint, 0);
    let i = ix::lp_deposit(&owner, &env.usdc_mint, tranche, amount);
    env.send(&[i], kp, &[]).expect_ok("deposit");
}

/// GREEN arm of the invariant: deposits and withdrawals preserve
/// V + OC = J + S + AF. This is the baseline the loss arm violates.
#[test]
fn invariant_holds_across_deposits_and_withdraws() {
    let mut env = Env::new();
    env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    let bob = env.actors.bob.insecure_clone();

    deposit(&mut env, &alice, Tranche::Junior, 700 * USDC);
    assert_eq!(pool_invariant_delta(&env), 0, "invariant broken after deposit");

    deposit(&mut env, &bob, Tranche::Senior, 300 * USDC);
    assert_eq!(pool_invariant_delta(&env), 0, "invariant broken after deposit");

    let i = ix::lp_withdraw(&alice.pubkey(), &env.usdc_mint, Tranche::Junior, 200 * USDC);
    env.send(&[i], &alice, &[]).expect_ok("withdraw");
    assert_eq!(pool_invariant_delta(&env), 0, "invariant broken after withdraw");
}

/// R1 — apply_loss with outstanding_credit == 0 mutates only counters:
/// vault keeps the tokens, J+S shrinks, and the residual is unclaimable.
/// The correct behavior (pending the loss-cash-flow business decision) is
/// to keep V + OC = J + S + AF, e.g. by sweeping the lost amount out of the
/// vault or restricting loss to lent capital.
#[test]
fn regression_apply_loss_breaks_vault_invariant() {
    let mut env = Env::new();
    env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    deposit(&mut env, &alice, Tranche::Junior, 1_000 * USDC);
    assert_eq!(pool_invariant_delta(&env), 0);

    let i = ix::admin_apply_loss(&env.actors.admin.pubkey(), &env.usdc_mint, 300 * USDC);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[]).expect_ok("loss");

    assert_eq!(
        pool_invariant_delta(&env),
        0,
        "R1 REGRESSION: apply_loss(300) left vault tokens beyond accounted \
         capital+fees (delta = {} micro-USDC, unclaimable by any ix)",
        pool_invariant_delta(&env)
    );
}

/// R2 — spl-token lets any holder burn her own LP tokens. The pool's share
/// counter does not observe the burn, so mint_supply < tranche_shares: the
/// phantom shares' NAV is unredeemable forever. Every accounted share must
/// be redeemable — mint supply and counters must stay equal.
#[test]
fn regression_external_burn_creates_phantom_shares() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    let alice_addr = alice.pubkey();
    deposit(&mut env, &alice, Tranche::Junior, 500 * USDC);

    // alice burns 200 of her own LP tokens directly via spl-token (legal).
    let lp_a = spl::ata(&alice_addr, &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    let burn = spl::burn_ix(&lp_a, &p.lp_junior, &alice_addr, 200 * USDC);
    env.send(&[burn], &alice, &[]).expect_ok("external burn");

    assert_eq!(
        env.mint_supply(&p.lp_junior),
        env.pool().junior_shares,
        "R2 REGRESSION: mint supply {} < junior_shares {} — {} phantom shares \
         are unredeemable and strand their NAV in the vault",
        env.mint_supply(&p.lp_junior),
        env.pool().junior_shares,
        env.pool().junior_shares - env.mint_supply(&p.lp_junior)
    );
}

/// R3 — anyone can call admin_init_config first and become the permanent
/// protocol admin (bootstrap front-running). The spec requires binding init
/// to the program's upgrade authority via the ProgramData account; the ix
/// ABI does not yet carry program/programdata accounts (pending core ABI).
/// Assert the exploit fails; today it succeeds.
#[test]
fn regression_init_config_must_verify_upgrade_authority() {
    let mut env = Env::new();
    let attacker = env.actors.attacker.pubkey();
    let params = cuotas_tests::spec::spec_params(
        &env.actors.keeper.pubkey(),
        &env.actors.attacker.pubkey(),
    );
    let i = ix::admin_init_config(&attacker, &env.usdc_mint, &params);
    let out = env.send(&[i], &env.actors.attacker.insecure_clone(), &[]);
    let f = out.expect_err(
        "R3 REGRESSION: non-upgrade-authority signer must not be able to \
         bootstrap the config (attacker becomes permanent admin)",
    );
    expect_instruction_failure(f, "attacker bootstrap");
}

/// R4 — spec guardrail: a revoked guarantee may only be reactivated with a
/// FRESH mandate (new hash). keeper_update_guarantee currently reactivates
/// with the very hash that was revoked.
#[test]
fn regression_guarantee_update_requires_fresh_mandate() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let revoked_hash = [7u8; 32];

    let i = ix::keeper_register_guarantee(
        &keeper.pubkey(),
        &student,
        100 * USDC,
        50 * USDC,
        revoked_hash,
    );
    env.send(&[i], &keeper, &[]).expect_ok("register");
    let i = ix::keeper_revoke_guarantee(&keeper.pubkey(), &student);
    env.send(&[i], &keeper, &[]).expect_ok("revoke");

    // reactivating with the SAME revoked mandate must fail
    let i = ix::keeper_update_guarantee(
        &keeper.pubkey(),
        &student,
        100 * USDC,
        50 * USDC,
        revoked_hash,
    );
    let out = env.send(&[i], &keeper, &[]);
    let f = out.expect_err(
        "R4 REGRESSION: update reactivated a revoked guarantee with the same \
         mandate_hash — a fresh mandate must be required",
    );
    expect_instruction_failure(f, "stale mandate reactivation");
}
