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

#[test]
fn deposit_after_external_burn_prices_on_reconciled_supply() {
    // The burn forfeiture must extend to NEW depositors: pricing runs on
    // reconciled supply, so a post-burn depositor buys shares at the
    // elevated NAV — never diluted by phantom supply.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);

    // alice burns half of her tokens externally: capital 1000, live supply 500
    let lp_a = spl::ata(&alice, &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    let burn = spl::burn_ix(&lp_a, &p.lp_junior, &alice, 500 * USDC);
    env.send(&[burn], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("burn");

    // bob deposits 1000 against recorded shares=500 (post-reconcile):
    // shares = 1000*500/1000 = 500 — he pays the elevated 2.0 NAV, alice's
    // forfeited claim is NOT re-minted to him for free
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);
    let lp_b = spl::ata(&bob, &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    assert_eq!(env.token_balance(&lp_b), 500 * USDC, "priced on reconciled supply");
    assert_eq!(env.pool().junior_shares, 1_000 * USDC, "recorded == live supply");
    assert_eq!(env.mint_supply(&p.lp_junior), 1_000 * USDC);
    assert_eq!(env.pool().junior_capital, 2_000 * USDC);

    // NAV is now 2.0/share: bob exits his 500 shares for 1000 USDC back,
    // alice exits her remaining 500 for the forfeited-claim-boosted 1000
    for kp in [env.actors.bob.insecure_clone(), env.actors.alice.insecure_clone()] {
        let i = ix::lp_withdraw(&kp.pubkey(), &{env.usdc_mint}, Tranche::Junior, 500 * USDC);
        env.send(&[i], &kp, &[]).expect_ok("exit at NAV 2.0");
    }
    assert_eq!(env.pool().junior_capital, 0, "full drain, no stranded NAV");
    assert_eq!(env.accounting_delta(), 0);
}

#[test]
fn external_burn_inflation_attack_rejected() {
    // THE I-05 attack, executed for real: the attacker mints a huge position,
    // burns all but ONE base unit of LP supply, and waits for a victim to
    // deposit at the inflated NAV so floor-rounding hands the incumbent a
    // profit. The exact-deposit guard must reject the victim's deposit
    // atomically — before any token CPI — and the attacker must leave with
    // exactly what he put in.
    let mut env = Env::new();
    let p = env.bootstrap();
    let attacker = env.actors.attacker.pubkey();
    let bob = env.actors.bob.pubkey();
    let (usdc_atk, lp_atk) = lp_ready_full(&mut env, &attacker, 3_000_000_000, &p.lp_junior);
    let (usdc_b, lp_b) = lp_ready_full(&mut env, &bob, 3_000_000_000, &p.lp_junior);

    deposit(&{env.actors.attacker.insecure_clone()}, &mut env, Tranche::Junior, 1_000_000_000);
    assert_eq!(env.token_balance(&lp_atk), 1_000_000_000);

    // attacker burns 999,999,999 of his own LP tokens via raw SPL — keeps 1
    let burn = spl::burn_ix(&lp_atk, &p.lp_junior, &attacker, 999_999_999);
    env.send(&[burn], &{env.actors.attacker.insecure_clone()}, &[]).expect_ok("inflation burn");
    assert_eq!(env.mint_supply(&p.lp_junior), 1, "supply collapsed to 1");
    assert_eq!(env.pool().junior_shares, 1_000_000_000, "counter still stale pre-op");

    // victim deposits 1.5e9: reconcile drops recorded shares to 1, then
    // N = 1.5e9 * 1, N % 1e9 != 0 -> UnrepresentableDeposit, full rollback
    let before_pool = env.account_data(&p.pool);
    let before_bob_usdc = env.token_balance(&usdc_b);
    let i = ix::lp_deposit(&bob, &{env.usdc_mint}, Tranche::Junior, 1_500_000_000);
    let out = env.send(&[i], &{env.actors.bob.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::UnrepresentableDeposit, "inflation deposit");

    // nothing moved: pool counters (incl. the reconciled write inside the
    // failed tx), vault, victim balances, mint supply — all unchanged
    assert_eq!(env.account_data(&p.pool), before_pool, "pool untouched");
    assert_eq!(env.token_balance(&usdc_b), before_bob_usdc, "victim never paid");
    assert_eq!(env.token_balance(&lp_b), 0);
    assert_eq!(env.mint_supply(&p.lp_junior), 1);

    // the attacker's sole remaining share redeems exactly his capital —
    // the burn inflated NAV but there is no victim to extract it from
    let i = ix::lp_withdraw(&attacker, &{env.usdc_mint}, Tranche::Junior, 1);
    env.send(&[i], &{env.actors.attacker.insecure_clone()}, &[]).expect_ok("attacker exits");
    assert_eq!(
        env.token_balance(&usdc_atk),
        3_000_000_000,
        "attacker profits exactly zero"
    );
    assert_eq!(env.accounting_delta(), 0);
}

/// `lp_ready` variant funding arbitrary base-unit amounts (not just *USDC).
fn lp_ready_full(env: &mut Env, who: &Address, usdc: u64, lp_mint: &Address) -> (Address, Address) {
    (env.make_ata(who, &{env.usdc_mint}, usdc), env.make_ata(who, lp_mint, 0))
}

#[test]
fn external_full_burn_creates_orphaned_capital() {
    // A 100% external burn is the ONLY instruction-level path to
    // capital>0 with supply==0: the pool cannot claw back alice's capital
    // contribution, but her claim is gone. The next deposit must trip
    // OrphanedCapital instead of minting free 1:1 shares.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);

    let lp_a = spl::ata(&alice, &p.lp_junior, &spl::TOKEN_PROGRAM_ID);
    let burn = spl::burn_ix(&lp_a, &p.lp_junior, &alice, 1_000 * USDC);
    env.send(&[burn], &{env.actors.alice.insecure_clone()}, &[]).expect_ok("total burn");
    assert_eq!(env.mint_supply(&p.lp_junior), 0);
    assert_eq!(env.pool().junior_capital, 1_000 * USDC, "orphaned NAV");

    // reconcile_shares drops recorded shares to 0, then the orphaned-
    // capital guard stops the deposit cold — bob keeps his USDC
    let i = ix::lp_deposit(&bob, &{env.usdc_mint}, Tranche::Junior, 100 * USDC);
    let out = env.send(&[i], &{env.actors.bob.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::OrphanedCapital, "orphaned via total burn");
    assert_eq!(env.mint_supply(&p.lp_junior), 0);
}

// ---------- conservation ----------

#[test]
fn token_conservation_across_full_sequence() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let treasury_ata = env.treasury_ata();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    env.make_ata(&bob, &{env.usdc_mint}, 3_000 * USDC);
    env.make_ata(&bob, &p.lp_senior, 0);

    let usdc_a = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let usdc_b = spl::ata(&bob, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let total_usdc = env.token_balance(&usdc_a) + env.token_balance(&usdc_b);

    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S after deposit");
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Senior, 800 * USDC);
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S after deposit");
    let i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 300 * USDC);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[]).expect_ok("partial withdraw");
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S after withdraw");

    // cash-sim loss: 400 USDC physically moves vault -> treasury and
    // capital falls junior-first; physical conservation must include the
    // treasury ATA.
    let i = ix::admin_apply_loss(&env.actors.admin.pubkey(), &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 400 * USDC);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");
    assert_eq!(env.accounting_delta(), 0, "V+OC=J+S after loss");
    assert_eq!(env.token_balance(&treasury_ata), 400 * USDC);

    // USDC is never minted/burned by the program — deposits, payouts and
    // the loss sweep are the only token movements, so the sum over vault +
    // treasury + user ATAs is constant.
    let held = env.token_balance(&p.vault)
        + env.token_balance(&treasury_ata)
        + env.token_balance(&usdc_a)
        + env.token_balance(&usdc_b);
    assert_eq!(held, total_usdc, "USDC conservation violated");

    // LP supply always equals the on-chain share counters, and accounted
    // claims equal assets: vault + outstanding = J + S (F is informational)
    let pool = env.pool();
    assert_eq!(env.mint_supply(&p.lp_junior), pool.junior_shares);
    assert_eq!(env.mint_supply(&p.lp_senior), pool.senior_shares);
    assert_eq!(env.accounting_delta(), 0);
}
