//! Shared fixture for the credit lifecycle suites (open_plan /
//! pay_installment / crank_mark_late / keeper_register_recovery). Builds a
//! fully seeded world through REAL instructions — config, pool, LP deposit,
//! merchant registration, reputation, guarantee, funded ATAs — so every test
//! starts from state the program itself produced, not a fixture hand-edit.

use solana_address::Address;
use solana_keypair::Keypair;
use solana_signer::Signer;

use crate::env::{Env, USDC};
use crate::err::TxOutcome;
use crate::{ix, pda, spec};

/// Handles for a seeded credit world. `student` is always `actors.alice`,
/// `merchant_wallet` is `actors.bob`, the keeper/admin are the configured
/// fixture actors.
pub struct CreditWorld {
    pub merchant_wallet: Address,
    pub settlement_ata: Address,
    pub student: Address,
    pub student_ata: Address,
    pub plan_pda: Address,
    /// Whether the keeper registered an active guarantee for the student.
    pub guaranteed: bool,
}

/// Bootstrap a credit world: config + pool, a junior LP deposit of
/// `vault_usdc` (vault liquidity for advances), merchant registered to bob,
/// alice's reputation initialized and her USDC ATA funded with
/// `student_usdc`.
pub fn credit_env(vault_usdc: u64, student_usdc: u64) -> (Env, CreditWorld) {
    let mut env = Env::new();
    let p = env.bootstrap();

    // vault liquidity via a real LP deposit (junior tranche, attacker kp is
    // just a funded wallet here — the LP role is unprivileged).
    let lp = env.actors.attacker.pubkey();
    env.make_ata(&lp, &{ env.usdc_mint }, vault_usdc);
    env.make_ata(&lp, &p.lp_junior, 0);
    let i = ix::lp_deposit(&lp, &env.usdc_mint, cuotas::Tranche::Junior, vault_usdc);
    env.send(&[i], &env.actors.attacker.insecure_clone(), &[])
        .expect_ok("seed junior deposit");

    // merchant: bob's wallet, admin registers (settlement ATA must pre-exist).
    let merchant_wallet = env.actors.bob.pubkey();
    let settlement_ata = env.make_ata(&merchant_wallet, &{ env.usdc_mint }, 0);
    let i = ix::merchant_register(&env.actors.admin.pubkey(), &merchant_wallet, &env.usdc_mint);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[])
        .expect_ok("merchant_register");

    // student: alice, reputation at tier 0, funded USDC ATA.
    let student = env.actors.alice.pubkey();
    let i = ix::student_init_reputation(&student);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[])
        .expect_ok("student_init_reputation");
    let student_ata = env.make_ata(&student, &{ env.usdc_mint }, student_usdc);

    let world = CreditWorld {
        merchant_wallet,
        settlement_ata,
        student,
        student_ata,
        plan_pda: pda::plan(&student).0,
        guaranteed: false,
    };
    (env, world)
}

/// `credit_env` + a keeper-registered guarantee for the student.
/// `max_purchase`/`coverage_max` are the guarantor's chosen caps.
pub fn credit_env_guaranteed(
    vault_usdc: u64,
    student_usdc: u64,
    max_purchase: u64,
    coverage_max: u64,
) -> (Env, CreditWorld) {
    let (mut env, mut world) = credit_env(vault_usdc, student_usdc);
    let i = ix::keeper_register_guarantee(
        &env.actors.keeper.pubkey(),
        &world.student,
        max_purchase,
        coverage_max,
        [0xC0; 32],
    );
    env.send(&[i], &env.actors.keeper.insecure_clone(), &[])
        .expect_ok("keeper_register_guarantee");
    world.guaranteed = true;
    (env, world)
}

/// Send `open_plan(price)` for the world student, selecting the guarantee
/// account when `world.guaranteed` (program ID slot otherwise).
pub fn open(env: &mut Env, w: &CreditWorld, price: u64) -> TxOutcome {
    let g = w.guaranteed.then(|| pda::guarantee(&w.student).0);
    let i = ix::open_plan(&w.student, &env.usdc_mint, &w.merchant_wallet, price, g);
    env.send(&[i], &env.actors.alice.insecure_clone(), &[])
}

/// Send `open_plan(price)` for an arbitrary student keypair (fresh wallets
/// need their own reputation + ATA set up by the caller).
pub fn open_as(
    env: &mut Env,
    student: &Keypair,
    w: &CreditWorld,
    price: u64,
    guarantee: Option<Address>,
) -> TxOutcome {
    let i = ix::open_plan(
        &student.pubkey(),
        &env.usdc_mint,
        &w.merchant_wallet,
        price,
        guarantee,
    );
    env.send(&[i], student, &[])
}

/// Send `pay_installment` quoting the on-chain plan's `opened_at` — the
/// honest-client path.
pub fn pay(env: &mut Env, student: &Keypair, expected_index: u8) -> TxOutcome {
    let opened_at = env
        .plan(&student.pubkey())
        .expect("no open plan")
        .opened_at;
    let i = ix::pay_installment(&student.pubkey(), &env.usdc_mint, expected_index, opened_at);
    env.send(&[i], student, &[])
}

/// Same but with caller-chosen args (stale-quote / duplicate probes).
pub fn pay_with(env: &mut Env, student: &Keypair, expected_index: u8, opened_at: i64) -> TxOutcome {
    let i = ix::pay_installment(&student.pubkey(), &env.usdc_mint, expected_index, opened_at);
    env.send(&[i], student, &[])
}

/// Permissionless crank: `crank` can be any funded keypair.
pub fn crank(env: &mut Env, cranker: &Keypair, student: &Address, index: u8) -> TxOutcome {
    let i = ix::crank_mark_late(&cranker.pubkey(), student, index);
    env.send(&[i], cranker, &[])
}

/// Keeper recovery; the keeper's canonical ATA must hold the transfer amount.
pub fn recover(
    env: &mut Env,
    keeper: &Keypair,
    student: &Address,
    index: u8,
    receipt: [u8; 32],
) -> TxOutcome {
    let i = ix::keeper_register_recovery(&keeper.pubkey(), &env.usdc_mint, student, index, receipt);
    env.send(&[i], keeper, &[])
}

/// Fund the configured keeper's canonical USDC ATA.
pub fn fund_keeper(env: &mut Env, amount: u64) -> Address {
    env.make_ata(&env.actors.keeper.pubkey(), &{ env.usdc_mint }, amount)
}

/// Warp the clock so `abs_now` becomes the current time, then return it.
/// Assertions compute `abs_now` off the plan's on-chain `due_at`, so tests
/// pin the spec schedule, not whatever LiteSVM boots with.
pub fn warp_to(env: &mut Env, abs_now: i64) {
    let delta = abs_now - env.now();
    assert!(delta >= 0, "warp_to cannot move the clock backwards");
    env.warp_secs(delta);
}

/// Open the canonical PC-1000 guaranteed plan (tier 0) and return the spec
/// quote + the created plan. Used as the common setup for late-flow tests.
pub fn open_pc1000(env: &mut Env, w: &CreditWorld) -> (spec::SpecQuote, cuotas::Plan) {
    let q = spec::spec_quote_guaranteed(1_000 * USDC, 0);
    open(env, w, 1_000 * USDC).expect_ok("open PC1000");
    let plan = env.plan(&w.student).expect("plan must exist");
    (q, plan)
}

/// Register a brand-new funded student: airdrop, reputation init, USDC ATA
/// with `usdc`. Its plan/reputation/guarantee PDAs derive from the keypair.
pub fn new_student(env: &mut Env, usdc: u64) -> Keypair {
    let kp = Keypair::new();
    env.svm.airdrop(&kp.pubkey(), 1_000_000_000).unwrap();
    let i = ix::student_init_reputation(&kp.pubkey());
    env.send(&[i], &kp, &[]).expect_ok("new student rep");
    env.make_ata(&kp.pubkey(), &{ env.usdc_mint }, usdc);
    kp
}
