//! Acceptance: admin_apply_loss — first-loss waterfall (junior then senior),
//! outstanding-credit write-off, authority gating and bounds.

use cuotas::{CuotasError, Tranche};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::expect_cuotas_err;
use cuotas_tests::{ix, pda};
use solana_signer::Signer;

fn apply_loss(signer: &solana_keypair::Keypair, env: &mut Env, amount: u64) -> cuotas_tests::err::TxOutcome {
    let i = ix::admin_apply_loss(&signer.pubkey(), &{env.usdc_mint}, amount);
    env.send(&[i], signer, &[])
}

fn fund_tranche(tranche: Tranche, kp: &solana_keypair::Keypair, usdc: u64, env: &mut Env) {
    let owner = kp.pubkey();
    let lp_mint = match tranche {
        Tranche::Junior => pda::lp_junior(&pda::pool(&{env.usdc_mint}).0).0,
        Tranche::Senior => pda::lp_senior(&pda::pool(&{env.usdc_mint}).0).0,
    };
    env.make_ata(&owner, &{env.usdc_mint}, usdc * 5);
    env.make_ata(&owner, &lp_mint, 0);
    let i = ix::lp_deposit(&owner, &{env.usdc_mint}, tranche, usdc);
    env.send(&[i], kp, &[]).expect_ok("fund tranche");
}

#[test]
fn waterfall_junior_absorbs_first() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 300 * USDC, &mut env);
    fund_tranche(Tranche::Senior, &{env.actors.bob.insecure_clone()}, 700 * USDC, &mut env);

    apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 200 * USDC).expect_ok("loss");

    let pool = env.pool();
    assert_eq!(pool.junior_capital, 100 * USDC, "junior takes the first hit");
    assert_eq!(pool.senior_capital, 700 * USDC, "senior untouched");
    // share counts never change on a loss — only NAV per share
    assert_eq!(pool.junior_shares, 300 * USDC);
    assert_eq!(pool.senior_shares, 700 * USDC);
}

#[test]
fn waterfall_spills_to_senior_after_junior_exhausted() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 200 * USDC, &mut env);
    fund_tranche(Tranche::Senior, &{env.actors.bob.insecure_clone()}, 800 * USDC, &mut env);

    apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 500 * USDC).expect_ok("loss");

    let pool = env.pool();
    assert_eq!(pool.junior_capital, 0, "junior wiped first");
    assert_eq!(pool.senior_capital, 500 * USDC, "senior takes the rest");
}

#[test]
fn loss_equal_to_total_wipes_pool_but_not_more() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 100 * USDC, &mut env);
    fund_tranche(Tranche::Senior, &{env.actors.bob.insecure_clone()}, 50 * USDC, &mut env);

    apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 150 * USDC).expect_ok("exact total");

    let pool = env.pool();
    assert_eq!(pool.junior_capital + pool.senior_capital, 0);

    // one micro-USDC more than the total must fail
    let out = apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 1);
    expect_cuotas_err(&out, CuotasError::LossExceedsCapital, "loss > total");
}

#[test]
fn loss_over_total_rejected() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 1_000 * USDC, &mut env);
    let out = apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 1_000 * USDC + 1);
    expect_cuotas_err(&out, CuotasError::LossExceedsCapital, "over total");
}

#[test]
fn loss_zero_and_empty_pool_rejected() {
    let mut env = Env::new();
    env.bootstrap();
    let out = apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 0);
    expect_cuotas_err(&out, CuotasError::ZeroAmount, "zero loss");

    let out = apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 1);
    expect_cuotas_err(&out, CuotasError::LossExceedsCapital, "empty pool");
}

#[test]
fn loss_rejects_non_admin_including_keeper() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 100 * USDC, &mut env);

    for kp in [
        env.actors.attacker.insecure_clone(),
        env.actors.keeper.insecure_clone(),
        env.actors.bob.insecure_clone(),
    ] {
        let out = apply_loss(&kp, &mut env, 1);
        expect_cuotas_err(&out, CuotasError::NotAdmin, "impostor loss");
    }
}

#[test]
fn loss_writes_off_outstanding_credit_first() {
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 200 * USDC, &mut env);
    fund_tranche(Tranche::Senior, &{env.actors.bob.insecure_clone()}, 800 * USDC, &mut env);

    // Model 500 of outstanding credit (loans out to plans) — unreachable via
    // instructions today, set directly to exercise the write-off path.
    env.edit_pool(|p| p.outstanding_credit = 500 * USDC);

    apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 300 * USDC).expect_ok("loss");

    let pool = env.pool();
    assert_eq!(pool.outstanding_credit, 200 * USDC, "300 written off the 500 lent");
    assert_eq!(pool.junior_capital, 0, "junior fully absorbed NAV loss");
    assert_eq!(pool.senior_capital, 700 * USDC, "100 spilled to senior");
}

#[test]
fn loss_allowed_when_halted_documented() {
    // admin_apply_loss has NO state gate: bookkeeping must stay possible
    // during a halt. This pins the actual behavior (flagged for review as a
    // spec-deviation candidate: "con state != Normal no se origina nada"
    // arguably covers losses as admin ops — documented, not judged).
    let mut env = Env::new();
    env.bootstrap();
    fund_tranche(Tranche::Junior, &{env.actors.alice.insecure_clone()}, 100 * USDC, &mut env);

    let admin = env.actors.admin.pubkey();
    let i = ix::admin_set_state(&admin, cuotas::ProtocolState::Halted);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("halt");

    apply_loss(&{env.actors.admin.insecure_clone()}, &mut env, 10 * USDC).expect_ok("loss while halted");
    assert_eq!(env.pool().junior_capital, 90 * USDC);
}

// The vault-invariant consequence of apply_loss (counter-only, OC==0) is
// encoded as a failing regression in `tests/regressions.rs` — R1 — per
// reviewer request. Do not re-add a "documented" passing variant here.
