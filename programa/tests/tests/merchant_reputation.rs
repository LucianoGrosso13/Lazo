//! Acceptance: merchant_register and student_init_reputation.

use cuotas::{CuotasError, Merchant, ProtocolState, Reputation};
use cuotas_tests::env::{addr, Env};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, pda, spl};
use solana_signer::Signer;

// ---------- merchant_register ----------

#[test]
fn merchant_register_happy_path() {
    let mut env = Env::new();
    env.bootstrap();
    let admin = env.actors.admin.pubkey();
    let merchant = env.actors.bob.pubkey();
    let settlement = env.make_ata(&merchant, &{env.usdc_mint}, 0);

    let i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    // merchant_wallet is a plain account meta: it does NOT have to sign.
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("register");

    let m: Merchant = env.decode(&pda::merchant(&merchant).0);
    assert_eq!(addr(&m.owner), merchant);
    assert_eq!(addr(&m.settlement_ata), settlement);
    assert!(m.active);
    assert_eq!(m.plans_count, 0);
    assert_eq!(m.bump, pda::merchant(&merchant).1);
}

#[test]
fn merchant_register_rejects_non_admin() {
    let mut env = Env::new();
    env.bootstrap();
    for kp in [env.actors.keeper.insecure_clone(), env.actors.attacker.insecure_clone(), env.actors.alice.insecure_clone()] {
        let who = kp.pubkey();
        let merchant = env.actors.bob.pubkey();
        env.make_ata(&merchant, &{env.usdc_mint}, 0);
        let i = ix::merchant_register(&who, &merchant, &{env.usdc_mint});
        let out = env.send(&[i], &kp, &[]);
        expect_cuotas_err(&out, CuotasError::NotAdmin, "non-admin register");
    }
}

#[test]
fn merchant_register_rejects_bad_settlement_and_mint() {
    let mut env = Env::new();
    env.bootstrap();
    let admin = env.actors.admin.pubkey();
    let merchant = env.actors.bob.pubkey();
    let alice = env.actors.alice.pubkey();
    env.make_ata(&merchant, &{env.usdc_mint}, 0);

    // settlement ATA belonging to a different wallet
    env.make_ata(&alice, &{env.usdc_mint}, 0);
    let mut i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    i.accounts[4].pubkey = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "foreign settlement ata");

    // settlement ATA for a different (valid) mint
    let other_mint = solana_address::Address::new_unique();
    env.svm
        .set_account(
            other_mint,
            solana_account::Account {
                lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
                data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 6, None),
                owner: spl::TOKEN_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();
    let foreign_ata = env.make_ata(&merchant, &other_mint, 0);
    let mut i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    i.accounts[4].pubkey = foreign_ata;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "foreign-mint settlement ata");

    // non-ATA token account in the settlement slot
    let loose = env.make_token_account(&merchant, &{env.usdc_mint}, 0);
    let mut i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    i.accounts[4].pubkey = loose;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-ata settlement");

    // wrong usdc_mint account
    let mut i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    i.accounts[3].pubkey = other_mint;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::InvalidUsdcMint, "foreign usdc mint");
}

#[test]
fn merchant_register_rejects_wrong_pda_and_duplicate() {
    let mut env = Env::new();
    env.bootstrap();
    let admin = env.actors.admin.pubkey();
    let merchant = env.actors.bob.pubkey();
    env.make_ata(&merchant, &{env.usdc_mint}, 0);

    // merchant account swapped for a different PDA -> seeds violation
    let mut i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    i.accounts[5].pubkey = pda::merchant(&env.actors.alice.pubkey()).0;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("wrong merchant pda"), "merchant pda");

    // honest registration, then duplicate must fail
    let i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("register");
    let i = ix::merchant_register(&admin, &merchant, &{env.usdc_mint});
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("dup merchant"), "dup register");
}

// ---------- student_init_reputation ----------

#[test]
fn student_init_reputation_happy_path() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("init rep");

    let r: Reputation = env.decode(&pda::reputation(&student).0);
    assert_eq!(r.tier, 0);
    assert_eq!(r.plans_completed, 0);
    assert_eq!(r.late_count, 0);
    assert_eq!(r.active_exposure, 0);
    assert_eq!(r.bump, pda::reputation(&student).1);
}

#[test]
fn student_init_reputation_binds_pda_to_signer() {
    let mut env = Env::new();
    env.bootstrap();
    let student = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();

    // alice signs but reputation PDA points at bob's seeds
    let mut i = ix::student_init_reputation(&student);
    i.accounts[2].pubkey = pda::reputation(&bob).0;
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("foreign reputation pda"), "rep pda");

    // duplicate init must fail
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("first");
    let i = ix::student_init_reputation(&student);
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("dup reputation"), "dup rep");
}

#[test]
fn student_init_reputation_gated_by_state() {
    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let mut env = Env::new();
        env.bootstrap();
        let admin = env.actors.admin.pubkey();
        let i = ix::admin_set_state(&admin, st);
        env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("set state");

        let student = env.actors.alice.pubkey();
        let i = ix::student_init_reputation(&student);
        let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
        expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "rep gated");
    }
}
