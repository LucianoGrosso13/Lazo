//! REGRESSION suite: tests that encode invariants the program is REQUIRED
//! to satisfy, each named after the defect it originally tracked (see
//! TEST_REPORT.md). R1–R3 went green when the reviewer-requested fixes
//! landed; R4 remains RED — no fresh-mandate check exists yet.
//!
//!   R1  apply_loss stranded vault tokens        → FIXED (cash sweep)
//!   R2  external LP burn → phantom shares       → FIXED (reconcile_shares)
//!   R3  admin_init_config by any signer         → FIXED (ProgramData check)
//!   R4  keeper_update reactivates stale mandate → OPEN

use cuotas::{CuotasError, Tranche};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, spl};
use solana_signer::Signer;

fn deposit(env: &mut Env, kp: &solana_keypair::Keypair, tranche: Tranche, amount: u64) {
    let lp_mint = match tranche {
        Tranche::Junior => cuotas_tests::pda::lp_junior(&cuotas_tests::pda::pool(&env.usdc_mint).0).0,
        Tranche::Senior => cuotas_tests::pda::lp_senior(&cuotas_tests::pda::pool(&env.usdc_mint).0).0,
    };
    let owner = kp.pubkey();
    env.make_ata(&owner, &{env.usdc_mint}, amount * 2);
    env.make_ata(&owner, &lp_mint, 0);
    let i = ix::lp_deposit(&owner, &env.usdc_mint, tranche, amount);
    env.send(&[i], kp, &[]).expect_ok("deposit");
}

/// GREEN baseline: deposits and withdrawals preserve the invariant
/// V + OC = J + S + AF. Attribute check for the R1 fix.
#[test]
fn invariant_holds_across_deposits_and_withdraws() {
    let mut env = Env::new();
    env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    let bob = env.actors.bob.insecure_clone();

    deposit(&mut env, &alice, Tranche::Junior, 700 * USDC);
    assert_eq!(env.accounting_delta(), 0, "invariant broken after deposit");

    deposit(&mut env, &bob, Tranche::Senior, 300 * USDC);
    assert_eq!(env.accounting_delta(), 0, "invariant broken after deposit");

    let i = ix::lp_withdraw(&alice.pubkey(), &env.usdc_mint, Tranche::Junior, 200 * USDC);
    env.send(&[i], &alice, &[]).expect_ok("withdraw");
    assert_eq!(env.accounting_delta(), 0, "invariant broken after withdraw");
}

/// R1 (FIXED — cash simulation): apply_loss must keep
/// `vault + outstanding_credit == J + S + accrued_fees`, now by sweeping
/// the lost amount out of the vault to the treasury ATA.
#[test]
fn regression_apply_loss_breaks_vault_invariant() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    deposit(&mut env, &alice, Tranche::Junior, 1_000 * USDC);
    assert_eq!(env.accounting_delta(), 0);

    let i = ix::admin_apply_loss(&env.actors.admin.pubkey(), &env.usdc_mint, &{env.actors.payer.pubkey()}, 300 * USDC);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[]).expect_ok("loss");

    assert_eq!(
        env.accounting_delta(),
        0,
        "R1 REGRESSION: apply_loss(300) left vault tokens beyond accounted \
         capital+fees (delta = {} micro-USDC, unclaimable by any ix)",
        env.accounting_delta()
    );
    // the cash really left the vault
    assert_eq!(env.token_balance(&p.vault), 700 * USDC);
    assert_eq!(env.token_balance(&env.treasury_ata()), 300 * USDC);
}

/// R2 (FIXED — reconcile_shares): after an external burn, the next program
/// op must sync the share counter down to the live mint supply, the burned
/// holder's NAV forfeits pro-rata to remaining holders, and the pool drains
/// cleanly to zero — no phantom claims, no stranded capital.
#[test]
fn regression_external_burn_creates_phantom_shares() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.insecure_clone();
    let bob = env.actors.bob.insecure_clone();
    deposit(&mut env, &alice, Tranche::Junior, 500 * USDC);
    deposit(&mut env, &bob, Tranche::Junior, 500 * USDC);

    // alice burns 200 of her own LP tokens directly via spl-token (legal).
    let lp_a = spl::ata(&alice.pubkey(), &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    let usdc_b = spl::ata(&bob.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let burn = spl::burn_ix(&lp_a, &p.lp_junior, &alice.pubkey(), 200 * USDC);
    env.send(&[burn], &alice, &[]).expect_ok("external burn");

    // next op reconciles: bob withdraws 500 → NAV priced on supply=800, so
    // he receives 500 * 1000 / 800 = 625 — alice's forfeited NAV accrues to him
    let i = ix::lp_withdraw(&bob.pubkey(), &env.usdc_mint, Tranche::Junior, 500 * USDC);
    env.send(&[i], &bob, &[]).expect_ok("bob exits");
    assert_eq!(
        env.token_balance(&usdc_b),
        500 * USDC + 625 * USDC,
        "bob inherits the forfeited NAV pro-rata"
    );
    assert_eq!(env.pool().junior_shares, 300 * USDC, "reconciled to live supply");

    // alice exits the rest: 300 * 375 / 300 = 375 — full drain, no stranding
    let i = ix::lp_withdraw(&alice.pubkey(), &env.usdc_mint, Tranche::Junior, 300 * USDC);
    env.send(&[i], &alice, &[]).expect_ok("alice exits");
    assert_eq!(env.pool().junior_capital, 0);
    assert_eq!(env.pool().junior_shares, 0);
    assert_eq!(env.mint_supply(&p.lp_junior), 0);
    assert_eq!(env.accounting_delta(), 0, "no phantom NAV stranded");
}

/// R3 (FIXED — ProgramData check): a signer that is not the program's
/// upgrade authority must NOT be able to bootstrap the config and become
/// the permanent admin.
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
    expect_cuotas_err(&out, CuotasError::NotUpgradeAuthority, "attacker bootstrap");
}

/// R4 (OPEN): a revoked guarantee may only be reactivated with a FRESH
/// mandate (different hash). keeper_update_guarantee still reactivates with
/// the very hash that was revoked — the exposure gate landed, the
/// fresh-mandate check did not.
#[test]
fn regression_guarantee_update_requires_fresh_mandate() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let revoked_hash = [7u8; 32];

    let i = ix::student_init_reputation(&student);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[]).expect_ok("init rep");
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
