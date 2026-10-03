//! Pause matrix: every instruction crossed with Normal / Halted /
//! WithdrawsOnly. Expected behavior comes from the spec:
//!   - origination + deposits + merchant/guarantee registration only in Normal
//!   - withdrawals allowed in Normal and WithdrawsOnly, blocked in Halted
//!   - admin_apply_loss, pool_init and keeper_revoke carry no state gate
//!     (pinned from source, see TEST_REPORT)

use cuotas::{CuotasError, ProtocolState, Tranche};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::TxOutcome;
use cuotas_tests::ix;
use solana_keypair::Keypair;
use solana_signer::Signer;

/// Bootstrapped env with funded LPs and one registered guarantee.
fn setup() -> Env {
    let mut env = Env::new();
    let p = env.bootstrap();
    for (kp, lp) in [
        (env.actors.alice.pubkey(), p.lp_junior),
        (env.actors.bob.pubkey(), p.lp_senior),
    ] {
        env.make_ata(&kp, &{env.usdc_mint}, 10_000 * USDC);
        env.make_ata(&kp, &lp, 0);
    }
    let alice = env.actors.alice.insecure_clone();
    let bob = env.actors.bob.insecure_clone();
    for (kp, t) in [(alice, Tranche::Junior), (bob, Tranche::Senior)] {
        let i = ix::lp_deposit(&kp.pubkey(), &{env.usdc_mint}, t, 1_000 * USDC);
        env.send(&[i], &kp, &[]).expect_ok("seed deposit");
    }
    // guarantee + reputation for alice so update/revoke have a target
    let i = ix::student_init_reputation(&env.actors.alice.pubkey());
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("seed reputation");
    let i = ix::keeper_register_guarantee(
        &env.actors.keeper.pubkey(),
        &env.actors.alice.pubkey(),
        100 * USDC,
        50 * USDC,
        [1u8; 32],
    );
    env.send(&[i], &{env.actors.keeper.insecure_clone()}, &[]).expect_ok("seed guarantee");
    env
}

fn set(env: &mut Env, st: ProtocolState) {
    let i = ix::admin_set_state(&env.actors.admin.pubkey(), st);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("set_state");
}

/// Run op, return its outcome. Each arm builds a fresh ix so account writes
/// from earlier arms never leak into later ones.
fn run(env: &mut Env, op: &str) -> TxOutcome {
    let admin = env.actors.admin.pubkey();
    let alice = env.actors.alice.pubkey();
    match op {
        "lp_deposit" => {
            let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
            env.send(&[i], &{env.actors.alice.insecure_clone()}, &[])
        }
        "lp_withdraw" => {
            let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
            env.send(&[i], &{env.actors.alice.insecure_clone()}, &[])
        }
        "admin_apply_loss" => {
            let i = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 1);
            env.send(&[i], &{env.actors.admin.insecure_clone()}, &[])
        }
        "merchant_register" => {
            let merchant = Keypair::new();
            let m = merchant.pubkey();
            env.make_ata(&m, &{env.usdc_mint}, 0);
            let i = ix::merchant_register(&admin, &m, &{env.usdc_mint});
            env.send(&[i], &{env.actors.admin.insecure_clone()}, &[])
        }
        "student_init_reputation" => {
            let student = Keypair::new();
            env.svm.airdrop(&student.pubkey(), 100_000_000).unwrap();
            let i = ix::student_init_reputation(&student.pubkey());
            env.send(&[i], &student, &[])
        }
        "keeper_register_guarantee" => {
            let student = Keypair::new().pubkey();
            let i = ix::keeper_register_guarantee(
                &env.actors.keeper.pubkey(),
                &student,
                1,
                1,
                [2u8; 32],
            );
            env.send(&[i], &{env.actors.keeper.insecure_clone()}, &[])
        }
        "keeper_update_guarantee" => {
            let i = ix::keeper_update_guarantee(
                &env.actors.keeper.pubkey(),
                &alice,
                5,
                5,
                [3u8; 32],
            );
            env.send(&[i], &{env.actors.keeper.insecure_clone()}, &[])
        }
        "keeper_revoke_guarantee" => {
            let i = ix::keeper_revoke_guarantee(&env.actors.keeper.pubkey(), &alice);
            env.send(&[i], &{env.actors.keeper.insecure_clone()}, &[])
        }
        _ => unreachable!(),
    }
}

#[derive(Debug)]
enum Expected {
    Ok,
    Err(CuotasError),
}

#[test]
fn pause_matrix() {
    use Expected::*;
    // (op, Normal, Halted, WithdrawsOnly)
    let rows: &[(&str, Expected, Expected, Expected)] = &[
        ("lp_deposit", Ok, Err(CuotasError::ProtocolNotNormal), Err(CuotasError::ProtocolNotNormal)),
        ("lp_withdraw", Ok, Err(CuotasError::ProtocolHalted), Ok),
        ("admin_apply_loss", Ok, Ok, Ok),           // no state gate — pinned
        ("merchant_register", Ok, Err(CuotasError::ProtocolNotNormal), Err(CuotasError::ProtocolNotNormal)),
        ("student_init_reputation", Ok, Err(CuotasError::ProtocolNotNormal), Err(CuotasError::ProtocolNotNormal)),
        ("keeper_register_guarantee", Ok, Err(CuotasError::ProtocolNotNormal), Err(CuotasError::ProtocolNotNormal)),
        ("keeper_update_guarantee", Ok, Err(CuotasError::ProtocolNotNormal), Err(CuotasError::ProtocolNotNormal)),
        ("keeper_revoke_guarantee", Ok, Ok, Ok),    // no state gate — pinned
    ];

    for (op, e_normal, e_halted, e_wo) in rows {
        for (st, expected) in [
            (ProtocolState::Normal, e_normal),
            (ProtocolState::Halted, e_halted),
            (ProtocolState::WithdrawsOnly, e_wo),
        ] {
            let mut env = setup();
            if !matches!(st, ProtocolState::Normal) {
                set(&mut env, st);
            }
            let out = run(&mut env, op);
            match expected {
                Ok => {
                    out.expect_ok(&format!("{op} in {st:?}"));
                }
                Err(e) => {
                    let f = out.expect_err(&format!("{op} in {st:?}"));
                    let code = cuotas_tests::err::custom_code(f, 0);
                    assert_eq!(
                        code,
                        Some(cuotas_tests::err::cuotas_code(*e)),
                        "{op} in {st:?}: expected {e:?} (code {:?}), got {code:?}\nlogs:\n{}",
                        cuotas_tests::err::cuotas_code(*e),
                        f.meta.logs.join("\n")
                    );
                }
            }
        }
    }
}

#[test]
fn withdraws_only_still_blocks_deposits_and_allows_full_exit() {
    let mut env = setup();
    set(&mut env, ProtocolState::WithdrawsOnly);
    let alice = env.actors.alice.pubkey();
    let p = env.protocol();

    let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    cuotas_tests::err::expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "deposit in WO");

    // full exit under WithdrawsOnly drains the junior tranche
    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 1_000 * USDC);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("full exit");
    assert_eq!(env.pool().junior_shares, 0);
    assert_eq!(env.token_balance(&p.vault), 1_000 * USDC);
}

#[test]
fn halted_blocks_everything_user_facing() {
    let mut env = setup();
    set(&mut env, ProtocolState::Halted);
    let alice = env.actors.alice.pubkey();

    let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    out.expect_err("deposit in Halted");

    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    out.expect_err("withdraw in Halted");
}

#[test]
fn recovery_from_halt_restores_normal_flow() {
    let mut env = setup();
    set(&mut env, ProtocolState::Halted);
    set(&mut env, ProtocolState::Normal);
    let alice = env.actors.alice.pubkey();

    let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 5 * USDC);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("deposit after recovery");
}
