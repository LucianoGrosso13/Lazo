//! Acceptance: keeper_register_guarantee / keeper_update_guarantee /
//! keeper_revoke_guarantee — role separation, params validation, lifecycle.

use cuotas::{CuotasError, Guarantee, ProtocolState};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, pda};
use solana_keypair::Keypair;
use solana_signer::Signer;

fn register(kp: &Keypair, env: &mut Env, student: &solana_address::Address, mp: u64, cm: u64, h: [u8; 32]) -> cuotas_tests::err::TxOutcome {
    let i = ix::keeper_register_guarantee(&kp.pubkey(), student, mp, cm, h);
    env.send(&[i], kp, &[])
}

fn update(kp: &Keypair, env: &mut Env, student: &solana_address::Address, mp: u64, cm: u64, h: [u8; 32]) -> cuotas_tests::err::TxOutcome {
    let i = ix::keeper_update_guarantee(&kp.pubkey(), student, mp, cm, h);
    env.send(&[i], kp, &[])
}

fn revoke(kp: &Keypair, env: &mut Env, student: &solana_address::Address) -> cuotas_tests::err::TxOutcome {
    let i = ix::keeper_revoke_guarantee(&kp.pubkey(), student);
    env.send(&[i], kp, &[])
}

#[test]
fn register_stores_terms_and_hash() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let hash = [0xAA; 32];

    register(&{env.actors.keeper.insecure_clone()}, &mut env, &student, 1_000 * USDC, 500 * USDC, hash)
        .expect_ok("register");

    let g: Guarantee = env.decode(&pda::guarantee(&student).0);
    assert_eq!(g.max_purchase, 1_000 * USDC);
    assert_eq!(g.coverage_max, 500 * USDC);
    assert_eq!(g.mandate_hash, hash);
    assert!(g.active);
    assert_eq!(g.registered_at, env.now());
    assert_eq!(g.bump, pda::guarantee(&student).1);
}

#[test]
fn register_requires_the_configured_keeper() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let hash = [1u8; 32];

    // role separation: even the ADMIN cannot act as keeper
    for kp in [
        env.actors.admin.insecure_clone(),
        env.actors.attacker.insecure_clone(),
        env.actors.alice.insecure_clone(), // the student self-registering
    ] {
        let out = register(&kp, &mut env, &student, 1, 1, hash);
        expect_cuotas_err(&out, CuotasError::NotKeeper, "non-keeper register");
    }
}

#[test]
fn register_rejects_zero_params() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let h = [9u8; 32];

    let out = register(&keeper, &mut env, &student, 0, 1, h);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "max_purchase 0");
    let out = register(&keeper, &mut env, &student, 1, 0, h);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "coverage_max 0");
    let out = register(&keeper, &mut env, &student, 0, 0, h);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "both 0");
}

#[test]
fn register_binds_guarantee_pda_to_student() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let h = [3u8; 32];

    // guarantee PDA derived for bob but student meta says alice
    let mut i = ix::keeper_register_guarantee(&keeper.pubkey(), &student, 1, 1, h);
    i.accounts[3].pubkey = pda::guarantee(&bob).0;
    let out = env.send(&[i], &keeper, &[]);
    expect_instruction_failure(out.expect_err("foreign guarantee pda"), "guarantee pda");

    // duplicate registration fails (init on existing account)
    register(&keeper, &mut env, &student, 1, 1, h).expect_ok("first");
    let out = register(&keeper, &mut env, &student, 2, 2, h);
    expect_instruction_failure(out.expect_err("dup register"), "dup register");
}

#[test]
fn register_gated_by_state() {
    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let mut env = Env::new();
        env.bootstrap();
        let admin = env.actors.admin.pubkey();
        let i = ix::admin_set_state(&admin, st);
        env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("set state");
        let student = env.actors.alice.pubkey();
        let out = register(&{env.actors.keeper.insecure_clone()}, &mut env, &student, 1, 1, [8u8; 32]);
        expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "register gated");
    }
}

#[test]
fn update_changes_terms_and_reactivates() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    // update requires the student's reputation account (exposure gate)
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");

    register(&keeper, &mut env, &student, 100 * USDC, 50 * USDC, [1u8; 32]).expect_ok("register");
    revoke(&keeper, &mut env, &student).expect_ok("revoke");
    assert!(!env.decode::<Guarantee>(&pda::guarantee(&student).0).active);

    env.warp_secs(600);
    update(&keeper, &mut env, &student, 2_000 * USDC, 900 * USDC, [2u8; 32]).expect_ok("update");

    let g: Guarantee = env.decode(&pda::guarantee(&student).0);
    assert_eq!(g.max_purchase, 2_000 * USDC);
    assert_eq!(g.coverage_max, 900 * USDC);
    assert_eq!(g.mandate_hash, [2u8; 32]);
    assert!(g.active, "update reactivates a revoked guarantee");
    assert_eq!(g.registered_at, env.now(), "registration timestamp refreshed");
}

#[test]
fn update_rejects_non_keeper_zero_params_and_missing_account() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");
    register(&keeper, &mut env, &student, 1, 1, [1u8; 32]).expect_ok("register");

    // non-keeper (incl. admin)
    for kp in [env.actors.admin.insecure_clone(), env.actors.attacker.insecure_clone()] {
        let out = update(&kp, &mut env, &student, 1, 1, [0u8; 32]);
        expect_cuotas_err(&out, CuotasError::NotKeeper, "non-keeper update");
    }
    // zero params
    let out = update(&keeper, &mut env, &student, 0, 1, [0u8; 32]);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "update mp 0");
    // never-registered student: account missing -> must fail
    let out = update(&keeper, &mut env, &bob, 1, 1, [0u8; 32]);
    expect_instruction_failure(out.expect_err("update unregistered"), "missing guarantee");
}

#[test]
fn revoke_marks_inactive_keeps_audit_fields() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let h = [7u8; 32];

    register(&keeper, &mut env, &student, 500 * USDC, 250 * USDC, h).expect_ok("register");
    revoke(&keeper, &mut env, &student).expect_ok("revoke");

    let g: Guarantee = env.decode(&pda::guarantee(&student).0);
    assert!(!g.active);
    assert_eq!(g.max_purchase, 500 * USDC, "terms retained for auditability");
    assert_eq!(g.mandate_hash, h);

    // idempotent second revoke (documented behavior: no active-check gate)
    revoke(&keeper, &mut env, &student).expect_ok("second revoke is a no-op");

    // non-keeper cannot revoke
    for kp in [env.actors.admin.insecure_clone(), env.actors.attacker.insecure_clone()] {
        let out = revoke(&kp, &mut env, &student);
        expect_cuotas_err(&out, CuotasError::NotKeeper, "non-keeper revoke");
    }

    // re-registering after revoke must FAIL (account exists); only update
    // reactivates — this is the intended lifecycle.
    let out = register(&keeper, &mut env, &student, 1, 1, h);
    expect_instruction_failure(out.expect_err("re-register after revoke"), "register after revoke");
}

#[test]
fn keeper_lifecycle_state_gates() {
    // keeper_update IS gated by is_normal (like register); keeper_revoke is
    // NOT — revocation must stay possible during a halt. Pinned from source.
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");
    register(&keeper, &mut env, &student, 1, 1, [2u8; 32]).expect_ok("register");

    let admin = env.actors.admin.pubkey();
    let i = ix::admin_set_state(&admin, ProtocolState::Halted);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("halt");

    let out = update(&keeper, &mut env, &student, 2, 2, [4u8; 32]);
    expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "update gated in Halted");
    revoke(&keeper, &mut env, &student).expect_ok("revoke allowed in Halted");
}

#[test]
fn update_rejects_unchanged_mandate_hash() {
    // Post-R4 fix: reactivating a revoked guarantee (or rewriting terms)
    // with the SAME mandate_hash must fail — a revoked mandate is dead.
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");
    let revoked = [7u8; 32];
    register(&keeper, &mut env, &student, 100 * USDC, 50 * USDC, revoked).expect_ok("register");
    let registered_at = env.decode::<Guarantee>(&pda::guarantee(&student).0).registered_at;
    revoke(&keeper, &mut env, &student).expect_ok("revoke");

    env.warp_secs(120);
    // same hash on the revoked guarantee -> MandateHashUnchanged, and the
    // account must be untouched: terms, active=false, original timestamp
    let out = update(&keeper, &mut env, &student, 200 * USDC, 80 * USDC, revoked);
    expect_cuotas_err(&out, CuotasError::MandateHashUnchanged, "stale mandate");
    let g: Guarantee = env.decode(&pda::guarantee(&student).0);
    assert_eq!(g.mandate_hash, revoked);
    assert!(!g.active, "must stay revoked");
    assert_eq!(g.max_purchase, 100 * USDC);
    assert_eq!(g.coverage_max, 50 * USDC);
    assert_eq!(g.registered_at, registered_at, "timestamp untouched");

    // also rejected on an ACTIVE guarantee (no-op updates are forbidden)
    let fresh = [8u8; 32];
    update(&keeper, &mut env, &student, 200 * USDC, 80 * USDC, fresh).expect_ok("fresh reactivation");
    let out = update(&keeper, &mut env, &student, 999 * USDC, 999 * USDC, fresh);
    expect_cuotas_err(&out, CuotasError::MandateHashUnchanged, "same hash on active");
}

#[test]
fn update_rejects_reputation_of_another_student() {
    // The exposure gate must read THE SAME student's reputation: swapping
    // in a different student's reputation PDA fails the seed binding even
    // when that other account exists and shows no exposure.
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    for kp in [env.actors.alice.insecure_clone(), env.actors.bob.insecure_clone()] {
        let i = ix::student_init_reputation(&kp.pubkey());
        env.send(&[i], &kp, &[]).expect_ok("init rep");
    }
    register(&keeper, &mut env, &student, 1, 1, [1u8; 32]).expect_ok("register");

    // bob's canonical reputation where alice's belongs -> seeds mismatch
    let mut i = ix::keeper_update_guarantee(&keeper.pubkey(), &student, 1, 1, [2u8; 32]);
    i.accounts[4].pubkey = pda::reputation(&bob).0;
    let out = env.send(&[i], &keeper, &[]);
    expect_instruction_failure(out.expect_err("foreign reputation pda"), "reputation seeds");

    // alice's guarantee is untouched
    let g: Guarantee = env.decode(&pda::guarantee(&student).0);
    assert_eq!(g.mandate_hash, [1u8; 32]);
}

#[test]
fn update_blocked_while_student_has_exposure() {
    // Rewriting terms under an active plan is forbidden: GuaranteeTermsLocked
    // while reputation.active_exposure > 0. No instruction produces exposure
    // yet, so it is set directly on the reputation account.
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");
    register(&keeper, &mut env, &student, 100 * USDC, 50 * USDC, [5u8; 32]).expect_ok("register");

    env.edit_reputation(&student, |r| r.active_exposure = 10 * USDC);
    let out = update(&keeper, &mut env, &student, 200 * USDC, 80 * USDC, [6u8; 32]);
    expect_cuotas_err(&out, CuotasError::GuaranteeTermsLocked, "exposure locks terms");

    // exposure cleared → the same update goes through
    env.edit_reputation(&student, |r| r.active_exposure = 0);
    update(&keeper, &mut env, &student, 200 * USDC, 80 * USDC, [6u8; 32]).expect_ok("unlocked");
}

#[test]
fn register_and_update_reject_zero_mandate_hash() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let keeper = env.actors.keeper.insecure_clone();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");

    let out = register(&keeper, &mut env, &student, 1, 1, [0u8; 32]);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "register zero hash");

    register(&keeper, &mut env, &student, 1, 1, [1u8; 32]).expect_ok("register");
    let out = update(&keeper, &mut env, &student, 1, 1, [0u8; 32]);
    expect_cuotas_err(&out, CuotasError::InvalidGuaranteeParams, "update zero hash");
}
