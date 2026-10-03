//! Adversarial acceptance: role confusion, arbitrary LP-token mint/burn
//! consequences, and token conservation across a full op sequence.

use cuotas::{CuotasError, Tranche};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, spl};
use solana_address::Address;
use solana_signer::Signer;

fn deposit(kp: &solana_keypair::Keypair, env: &mut Env, tranche: Tranche, amount: u64) {
    let i = ix::lp_deposit(&kp.pubkey(), &{env.usdc_mint}, tranche, amount);
    env.send(&[i], kp, &[]).expect_ok("deposit");
}

fn lp_ready(env: &mut Env, who: &Address, usdc: u64, lp_mint: &Address) {
    env.make_ata(who, &{env.usdc_mint}, usdc);
    env.make_ata(who, lp_mint, 0);
}

// ---------- role confusion ----------

#[test]
fn privileged_ops_reject_every_wrong_role() {
    let mut env = Env::new();
    env.bootstrap();
    let admin = env.actors.admin.pubkey();
    let keeper = env.actors.keeper.pubkey();
    let alice = env.actors.alice.pubkey();
    let attacker = env.actors.attacker.pubkey();
    env.make_ata(&alice, &{env.usdc_mint}, 1_000 * USDC);
    env.make_ata(&alice, &env.protocol().lp_junior, 0);
    let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 100 * USDC);
    env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("seed");

    // admin ops signed by keeper / attacker / student
    for kp in [env.actors.keeper.insecure_clone(), env.actors.attacker.insecure_clone(), env.actors.alice.insecure_clone()] {
        for (name, build) in [
            ("apply_loss", ix::admin_apply_loss(&kp.pubkey(), &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 1)),
            ("set_state", ix::admin_set_state(&kp.pubkey(), cuotas::ProtocolState::Halted)),
            ("update", ix::admin_update_config(
                &kp.pubkey(),
                &cuotas_tests::spec::spec_params(&keeper, &admin),
            )),
        ] {
            let out = env.send(&[build], &kp, &[]);
            expect_cuotas_err(&out, CuotasError::NotAdmin, name);
        }
    }

    // keeper ops signed by admin / attacker / depositor
    for kp in [env.actors.admin.insecure_clone(), env.actors.attacker.insecure_clone(), env.actors.alice.insecure_clone()] {
        let i = ix::keeper_register_guarantee(&kp.pubkey(), &attacker, 1, 1, [9u8; 32]);
        let out = env.send(&[i], &kp, &[]);
        expect_cuotas_err(&out, CuotasError::NotKeeper, "impostor keeper");
    }

    // sanity: the REAL roles still pass after all those rejections
    let i = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 1);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("admin still works");
    let i = ix::keeper_register_guarantee(&keeper, &attacker, 1, 1, [9u8; 32]);
    env.send(&[i], &{env.actors.keeper.insecure_clone()}, &[]).expect_ok("keeper still works");
}

// ---------- LP token mint/burn from outside the program ----------

#[test]
fn attacker_cannot_mint_lp_tokens() {
    // LP mint authority is the pool PDA — nobody but the program can mint.
    let mut env = Env::new();
    let p = env.bootstrap();
    let attacker = env.actors.attacker.pubkey();
    env.make_ata(&attacker, &{env.usdc_mint}, 0);
    let atk_lp = env.make_ata(&attacker, &p.lp_junior, 0);

    let mint = spl::mint_to_ix(&p.lp_junior, &atk_lp, &attacker, 1_000 * USDC);
    let out = env.send(&[mint], &{env.actors.attacker.insecure_clone()}, &[]);
    let f = out.expect_err("attacker LP mint");
    expect_instruction_failure(f, "mint authority is pool PDA");
    assert_eq!(env.token_balance(&atk_lp), 0);
    assert_eq!(env.mint_supply(&p.lp_junior), 0);
}

#[test]
fn external_lp_burn_cannot_steal_from_other_lps() {
    // A token owner can always burn her own LP tokens via spl-token — the
    // program cannot prevent it. Post-fix semantics (reconcile_shares):
    //   1. the next op syncs shares down to live supply — no phantom NAV
    //   2. the burned holder's NAV forfeits pro-rata to REMAINING holders
    //   3. the burner can only ever withdraw what she actually holds
    // R2 in tests/regressions.rs tracks the same fix end-to-end.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    let usdc_b = env.make_ata(&bob, &{env.usdc_mint}, 5_000 * USDC);
    let lp_b = env.make_ata(&bob, &p.lp_junior, 0);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 500 * USDC);
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 500 * USDC);

    // alice burns 200 of her own LP tokens outside the program
    let lp_a = spl::ata(&alice, &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    let burn = spl::burn_ix(&lp_a, &p.lp_junior, &alice, 200 * USDC);
    env.send(&[burn], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("external burn");
    assert_eq!(env.token_balance(&lp_a), 300 * USDC);

    // bob exits 500 shares: reconcile prices NAV on live supply=800, so he
    // receives 500*1000/800 = 625 — alice's burned NAV forfeits to him
    let i = ix::lp_withdraw(&bob, &{env.usdc_mint}, Tranche::Junior, 500 * USDC);
    env.send(&[i], &env.actors.bob.insecure_clone(), &[]).expect_ok("bob exits");
    assert_eq!(env.token_balance(&usdc_b), 5_125 * USDC, "4500 + 625 payout");
    assert_eq!(env.pool().junior_capital, 375 * USDC);
    assert_eq!(env.pool().junior_shares, 300 * USDC, "reconciled to live supply");
    assert_eq!(env.token_balance(&lp_b), 0);

    // alice still cannot claim more than the tokens she holds: withdrawing
    // beyond her 300-token balance fails (InsufficientShares vs counter)
    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 400 * USDC);
    let out = env.send(&[i], &env.actors.alice.insecure_clone(), &[]);
    expect_cuotas_err(&out, CuotasError::InsufficientShares, "burned shares unclaimable");

    // she exits her real 300 for 300*375/300 = 375 — full drain
    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 300 * USDC);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[]).expect_ok("alice exits");
    assert_eq!(env.token_balance(&lp_a), 0);
    assert_eq!(env.pool().junior_capital, 0);
    assert_eq!(env.accounting_delta(), 0, "no stranded NAV");
}

// ---------- conservation ----------

#[test]
fn token_conservation_across_full_sequence() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    env.make_ata(&bob, &{env.usdc_mint}, 3_000 * USDC);
    env.make_ata(&bob, &p.lp_senior, 0);

    let usdc_a = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let usdc_b = spl::ata(&bob, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let total_usdc = env.token_balance(&usdc_a) + env.token_balance(&usdc_b);

    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S+AF after deposit");
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Senior, 800 * USDC);
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S+AF after deposit");
    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 300 * USDC);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[]).expect_ok("partial withdraw");
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S+AF after withdraw");

    // USDC is never minted/burned by the program — deposits and payouts are
    // the only token movements, so the sum over vault + user ATAs is constant.
    let held = env.token_balance(&p.vault) + env.token_balance(&usdc_a) + env.token_balance(&usdc_b);
    assert_eq!(held, total_usdc, "USDC conservation violated");

    // LP supply always equals the on-chain share counters, and accounted
    // claims equal assets: vault + outstanding = J + S + accrued_fees
    let pool = env.pool();
    assert_eq!(env.mint_supply(&p.lp_junior), pool.junior_shares);
    assert_eq!(env.mint_supply(&p.lp_senior), pool.senior_shares);
    assert_eq!(env.accounting_delta(), 0);
}
