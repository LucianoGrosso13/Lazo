//! Acceptance + adversarial: pay_installment — exact amounts, grace vs late,
//! stale-quote replay guards, settle->close->reopen, tier ladder caps,
//! under-minimum plans, atomic rollback, state gating.

use cuotas::{CuotasError, InstallmentPaid, PlanSettled, ProtocolState};
use cuotas_tests::credit::{
    credit_env_guaranteed, open, open_installments, open_pc1000, pay, pay_with,
    warp_to,
};
use cuotas_tests::env::{pk, Env, USDC};
use cuotas_tests::err::{
    expect_cuotas_err, expect_instruction_failure, is_custom_error,
};
use cuotas_tests::{events, ix, pda, spec, spl};
use solana_signer::Signer;

const PC_PRICE: u64 = 1_000 * USDC;

fn set_state(env: &mut Env, st: ProtocolState) {
    let i = ix::admin_set_state(&env.actors.admin.pubkey(), st);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[])
        .expect_ok("set_state");
}

/// Pay the current first-unpaid installment, asserting the exact debit.
fn pay_and_assert(env: &mut Env, w: &cuotas_tests::credit::CreditWorld, idx: u8, expected_penalty: u64) {
    let student = env.actors.alice.insecure_clone();
    let plan = env.plan(&w.student).unwrap();
    let amount = plan.installments[idx as usize].amount;
    let s0 = env.token_balance(&w.student_ata);
    let v0 = env.token_balance(&env.protocol().vault);
    let oc0 = env.pool().outstanding_credit;
    let exp0 = env.reputation(&w.student).active_exposure;

    let out = pay(env, &student, idx);
    let meta = out.expect_ok("pay");
    let ev = events::emitted_one::<InstallmentPaid>(meta);
    assert_eq!(ev.plan, pk(&w.plan_pda));
    assert_eq!(ev.index, idx);
    assert_eq!(ev.amount, amount);
    assert_eq!(ev.penalty, expected_penalty);

    let total = amount + expected_penalty;
    assert_eq!(env.token_balance(&w.student_ata), s0 - total, "student debited amount+penalty");
    assert_eq!(env.token_balance(&env.protocol().vault), v0 + total, "vault credited exactly");
    assert_eq!(env.pool().outstanding_credit, oc0 - amount, "OC -= principal only");
    assert_eq!(env.reputation(&w.student).active_exposure, exp0 - amount);
    assert_eq!(env.accounting_delta(), 0);
}

/// Full happy path: three on-time payments settle the plan, close the PDA
/// (rent back), bump tier 0->1, and preserve the accounting invariant.
#[test]
fn pay_all_on_time_settles_closes_and_tiers_up() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (q, _plan) = open_pc1000(&mut env, &w);
    let vault_after_open = env.token_balance(&env.protocol().vault);

    pay_and_assert(&mut env, &w, 0, 0);
    pay_and_assert(&mut env, &w, 1, 0);

    let out = pay(&mut env, &student, 2);
    let meta = out.expect_ok("final pay");
    let settled = events::emitted_one::<PlanSettled>(meta);
    assert!(settled.counts);
    assert_eq!(settled.new_tier, 1);
    assert_eq!(settled.plans_completed, 1);

    // plan PDA closed: no live account, rent refunded (husk has 0 lamports)
    assert!(env.plan(&w.student).is_none());
    assert!(!env.program_account_live(&w.plan_pda), "plan account closed");

    let rep = env.reputation(&w.student);
    assert_eq!(rep.tier, 1, "tier up on counting settlement");
    assert_eq!(rep.plans_completed, 1);
    assert_eq!(rep.active_exposure, 0);

    // end-to-end conservation: student spent price, merchant got 951,
    // vault netted the fee over the cycle; every token accounted for.
    assert_eq!(env.token_balance(&w.student_ata), 2_000 * USDC - PC_PRICE);
    assert_eq!(env.token_balance(&w.settlement_ata), 951 * USDC);
    assert_eq!(env.token_balance(&env.protocol().vault), vault_after_open + q.repayable);
    let pool = env.pool();
    assert_eq!(pool.outstanding_credit, 0);
    assert_eq!(pool.junior_capital, 10_000 * USDC + q.fee);
    assert_eq!(env.accounting_delta(), 0);
}

/// Day 5 of 5 grace days is still on time: no penalty, plan still counts.
#[test]
fn pay_on_last_grace_day_has_no_penalty_and_still_counts() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan) = open_pc1000(&mut env, &w);
    let due0 = plan.installments[0].due_at;

    // exactly day 5 late = the last day of grace (spd=60: due+300)
    warp_to(&mut env, due0 + 5 * spec::SECONDS_PER_DAY as i64);
    pay_and_assert(&mut env, &w, 0, 0);
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.installments[0].marked_late, "no mark inside grace");
    assert!(plan.counts, "grace payment never disqualifies");

    // settle the rest on time -> still counts, tier up
    pay(&mut env, &student, 1).expect_ok("pay1");
    let out = pay(&mut env, &student, 2);
    let meta = out.expect_ok("pay2");
    let settled = events::emitted_one::<PlanSettled>(meta);
    assert!(settled.counts);
    assert_eq!(settled.new_tier, 1);
}

/// First day AFTER grace (day 6) auto-marks: fixed 5% penalty charged with
/// the payment, plan disqualified from tier-ups but still settles.
#[test]
fn pay_past_grace_auto_marks_penalty_and_disqualifies() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan) = open_pc1000(&mut env, &w);
    let due0 = plan.installments[0].due_at;
    let penalty = spec::spec_penalty(plan.installments[0].amount);
    assert_eq!(penalty, 11_666_666, "5% floor of 233333333");

    warp_to(&mut env, due0 + 6 * spec::SECONDS_PER_DAY as i64);
    pay_and_assert(&mut env, &w, 0, penalty);
    let plan = env.plan(&w.student).unwrap();
    assert!(plan.installments[0].marked_late, "auto-marked without any crank");
    assert_eq!(plan.installments[0].penalty, penalty);
    assert!(!plan.counts, "past-grace payment disqualifies tier-up");

    // settle the rest on time: closes, but no tier bump / no completion
    pay(&mut env, &student, 1).expect_ok("pay1");
    let out = pay(&mut env, &student, 2);
    let meta = out.expect_ok("pay2");
    let settled = events::emitted_one::<PlanSettled>(meta);
    assert!(!settled.counts);
    assert_eq!(settled.new_tier, 0, "no tier up on a late plan");
    assert_eq!(settled.plans_completed, 0);
    assert!(env.plan(&w.student).is_none());
    assert_eq!(env.accounting_delta(), 0);
}

/// Replay protection: quoted (index, opened_at, generation) must match plan
/// state — duplicates do NOT auto-advance into the next installment.
#[test]
fn pay_rejects_stale_duplicate_and_bad_index() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan) = open_pc1000(&mut env, &w);
    let opened = plan.opened_at;
    let gen = plan.generation;

    // out of schedule
    let out = pay_with(&mut env, &student, 3, opened, gen);
    expect_cuotas_err(&out, CuotasError::InvalidInstallmentIndex, "index 3");
    // later installment while an earlier one is unresolved
    let out = pay_with(&mut env, &student, 1, opened, gen);
    expect_cuotas_err(&out, CuotasError::StaleInstallmentIndex, "skip ahead");
    // quote from a different plan snapshot
    let out = pay_with(&mut env, &student, 0, opened + 1, gen);
    expect_cuotas_err(&out, CuotasError::StalePlan, "wrong opened_at");
    // same plan tuple but a generation that isn't this plan's
    let out = pay_with(&mut env, &student, 0, opened, gen + 1);
    expect_cuotas_err(&out, CuotasError::StalePlan, "wrong generation");
    // nothing moved
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.active_installments().iter().any(|i| i.resolved()));

    // happy path, then replay: the same approval must NOT pay the next one
    pay(&mut env, &student, 0).expect_ok("pay0");
    let s0 = env.token_balance(&w.student_ata);
    let out = pay_with(&mut env, &student, 0, opened, gen);
    expect_cuotas_err(&out, CuotasError::InstallmentAlreadyResolved, "duplicate approval");
    assert_eq!(env.token_balance(&w.student_ata), s0, "duplicate never double-charges");

    // settle the rest; once closed, the account is gone entirely
    pay(&mut env, &student, 1).expect_ok("pay1");
    pay(&mut env, &student, 2).expect_ok("pay2 settles");
    let out = pay_with(&mut env, &student, 0, opened, gen);
    expect_instruction_failure(out.expect_err("pay on closed plan"), "plan account closed");
}

/// Same-second reopen replay (regression for the confirmed stale-quote
/// finding, now FIXED): settle and close plan A, reopen plan B WITHOUT
/// advancing the LiteSVM clock — B gets the identical `opened_at`. A's stale
/// quote (index 0, opened_at_A, generation_A) is rejected with `StalePlan`:
/// `generation` — the `Reputation::plans_opened` counter stamped on the Plan
/// — distinguishes PDA generations where `opened_at` collides.
#[test]
fn same_second_reopen_rejects_stale_quote() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 5_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan_a) = open_pc1000(&mut env, &w);
    let opened_a = plan_a.opened_at;
    let gen_a = plan_a.generation;

    for i in 0..3 {
        pay(&mut env, &student, i).expect_ok("settle A");
    }
    assert!(env.plan(&w.student).is_none(), "A closed, PDA free");

    // reopen at the SAME timestamp: opened_at alone cannot distinguish B
    open(&mut env, &w, PC_PRICE).expect_ok("reopen B same second");
    let plan_b = env.plan(&w.student).unwrap();
    assert_eq!(plan_b.opened_at, opened_a, "same-second reopen shares opened_at");
    assert_eq!(plan_b.generation, gen_a + 1, "open_plan bumps plans_opened");

    // The stale A-quote replays index 0 at the same opened_at — the only
    // differing field is the generation, so it must fail and touch nothing.
    let out = pay_with(&mut env, &student, 0, opened_a, gen_a);
    expect_cuotas_err(&out, CuotasError::StalePlan, "stale generation on reopened PDA");
    assert!(
        !env.plan(&w.student).unwrap().active_installments().iter().any(|i| i.resolved()),
        "stale replay moved nothing"
    );

    // The honest quote for B — same index, same opened_at, B's generation —
    // is the fresh signature and pays installment 0 as usual.
    pay_with(&mut env, &student, 0, opened_a, plan_b.generation)
        .expect_ok("fresh quote pays B");
    assert!(env.plan(&w.student).unwrap().installments[0].paid);
}

/// Student ATA short by the payment -> SPL failure, and every prior state
/// write in the transaction rolls back atomically.
#[test]
fn pay_rolls_back_when_student_balance_insufficient() {
    // student funded with exactly the down payment: open succeeds, ATA is 0.
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 300 * USDC, 1_000 * USDC, 700 * USDC);
    let student = env.actors.alice.insecure_clone();
    open_pc1000(&mut env, &w);
    assert_eq!(env.token_balance(&w.student_ata), 0);

    let p = env.protocol();
    let pool0 = env.account_data(&p.pool);
    let rep0 = env.account_data(&pda::reputation(&w.student).0);
    let vault0 = env.token_balance(&p.vault);

    let out = pay(&mut env, &student, 0);
    let f = out.expect_err("insufficient balance pay");
    assert!(is_custom_error(f), "SPL transfer must fail, not skip");

    assert_eq!(env.account_data(&p.pool), pool0, "pool write reverted");
    assert_eq!(env.account_data(&pda::reputation(&w.student).0), rep0, "exposure write reverted");
    assert_eq!(env.token_balance(&p.vault), vault0, "vault untouched");
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.installments[0].resolved(), "installment still open");
    assert!(!plan.installments[0].marked_late);
}

/// Repayments are allowed in every protocol state — they only reduce risk.
/// (open_plan's Normal-only gate lives in plan_open.rs.)
#[test]
fn pay_allowed_in_halted_and_withdraws_only() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    open_pc1000(&mut env, &w);
    let student = env.actors.alice.insecure_clone();

    set_state(&mut env, ProtocolState::Halted);
    pay(&mut env, &student, 0).expect_ok("pay in Halted");

    set_state(&mut env, ProtocolState::WithdrawsOnly);
    pay(&mut env, &student, 1).expect_ok("pay in WithdrawsOnly");

    set_state(&mut env, ProtocolState::Normal);
    pay(&mut env, &student, 2).expect_ok("settle back in Normal");
    assert_eq!(env.reputation(&w.student).tier, 1);
    assert_eq!(env.accounting_delta(), 0);
}

/// Settling frees the PDA: the student can open a new plan, and a quote
/// captured for the OLD plan cannot pay the new one (StalePlan).
#[test]
fn settle_frees_pda_reopen_works_and_stale_quotes_die() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 5_000 * USDC, 1_500 * USDC, 1_100 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan1) = open_pc1000(&mut env, &w);
    let opened1 = plan1.opened_at;
    let gen1 = plan1.generation;
    for i in 0..3 {
        pay(&mut env, &student, i).expect_ok("settle plan1");
    }
    assert!(env.plan(&w.student).is_none());

    env.warp_secs(1); // distinct opened_at so the stale-quote guard is real
    open(&mut env, &w, PC_PRICE).expect_ok("reopen on freed PDA");
    let plan2 = env.plan(&w.student).unwrap();
    assert_ne!(plan2.opened_at, opened1, "fresh plan, fresh schedule");
    assert_eq!(plan2.generation, gen1 + 1, "generation bumps on every open");
    assert_eq!(plan2.tier, 1, "second plan at the earned tier");

    // a tx signed for the old plan's quote cannot touch the new plan
    let out = pay_with(&mut env, &student, 0, opened1, gen1);
    expect_cuotas_err(&out, CuotasError::StalePlan, "stale quote on reopened PDA");
    pay(&mut env, &student, 0).expect_ok("honest quote pays");
    assert!(env.plan(&w.student).unwrap().installments[0].paid);
}

/// financed < min_financed_to_count (100 USDC): settles and closes normally
/// but never counts toward plans_completed or the tier.
#[test]
fn under_minimum_plan_settles_but_never_tiers_up() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 500 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    // Price 100 at tier 0 guaranteed: down 30, financed 70 < min 100
    open(&mut env, &w, 100 * USDC).expect_ok("open guaranteed 100");
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.counts, "financed 70 < 100 minimum");

    for i in 0..3 {
        let out = pay(&mut env, &student, i);
        let meta = out.expect_ok("pay");
        if i == 2 {
            let settled = events::emitted_one::<PlanSettled>(meta);
            assert!(!settled.counts);
            assert_eq!(settled.new_tier, 0);
            assert_eq!(settled.plans_completed, 0);
        }
    }
    let rep = env.reputation(&w.student);
    assert_eq!(rep.tier, 0);
    assert_eq!(rep.plans_completed, 0);
    assert_eq!(rep.active_exposure, 0);
}

/// The guaranteed ladder climbs 0->1->2->3 across real settlements and stops
/// at 3: a fourth completed plan increments plans_completed but not the tier.
#[test]
fn guaranteed_ladder_tiers_up_and_caps_at_3() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 5_000 * USDC, 1_500 * USDC, 1_100 * USDC);
    let student = env.actors.alice.insecure_clone();

    for round in 0..4u8 {
        open(&mut env, &w, PC_PRICE).expect_ok("open plan");
        for i in 0..3 {
            pay(&mut env, &student, i).expect_ok("pay");
        }
        let rep = env.reputation(&w.student);
        let expected_tier = (round + 1).min(3);
        assert_eq!(rep.tier, expected_tier, "tier after plan {}", round + 1);
        assert_eq!(rep.plans_completed, (round + 1) as u32);
        assert_eq!(rep.active_exposure, 0);
        assert_eq!(env.accounting_delta(), 0);
        env.warp_secs(1);
    }
    assert_eq!(env.reputation(&w.student).tier, 3, "cap holds at tier 3");
}

/// Full happy path for 6 cuotas: 6 on-time payments settle the plan, close the
/// PDA, bump tier 0->1, and preserve exact token conservation.
#[test]
fn pay_all_6cuotas_on_time_settles_closes_and_tiers_up() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let q = spec::spec_quote_guaranteed_options(PC_PRICE, 0, 6);
    let vault_before_open = env.token_balance(&env.protocol().vault);

    open_installments(&mut env, &w, PC_PRICE, 6).expect_ok("open 6 cuotas");
    let plan = env.plan(&w.student).expect("plan exists");
    assert_eq!(plan.installment_count, 6);

    for i in 0..5u8 {
        pay_and_assert(&mut env, &w, i, 0);
    }

    let out = pay(&mut env, &student, 5);
    let meta = out.expect_ok("final pay installment 5");
    let settled = events::emitted_one::<PlanSettled>(meta);
    assert!(settled.counts);
    assert_eq!(settled.new_tier, 1);
    assert_eq!(settled.plans_completed, 1);

    // Plan PDA closed
    assert!(env.plan(&w.student).is_none());
    assert!(!env.program_account_live(&w.plan_pda), "plan account closed");

    let rep = env.reputation(&w.student);
    assert_eq!(rep.tier, 1, "tier up on counting 6-cuotas settlement");
    assert_eq!(rep.plans_completed, 1);
    assert_eq!(rep.active_exposure, 0);

    // End-to-end token conservation:
    // Student paid down (300) + 6 installments (721) = 1_021 USDC.
    assert_eq!(env.token_balance(&w.student_ata), 2_000 * USDC - (PC_PRICE + q.interest));
    // Merchant got down (300) + advance (651) = 951 USDC.
    assert_eq!(env.token_balance(&w.settlement_ata), q.merchant_total);
    // Vault netted fee (49) + interest (21) = 70 USDC over the whole cycle.
    assert_eq!(env.token_balance(&env.protocol().vault), vault_before_open + q.fee + q.interest);

    let pool = env.pool();
    assert_eq!(pool.outstanding_credit, 0);
    assert_eq!(pool.junior_capital, 10_000 * USDC + q.fee + q.interest);
    assert_eq!(env.accounting_delta(), 0);
}

/// Every account slot in pay_installment is bound: wrong mint/ATA/PDAs fail,
/// and a tx that names alice as student but isn't signed by her never runs.
#[test]
fn pay_rejects_corrupted_accounts_and_wrong_signer() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let student = env.actors.alice.insecure_clone();
    let (_q, plan) = open_pc1000(&mut env, &w);
    let opened = plan.opened_at;
    let gen = plan.generation;
    let mint = env.usdc_mint;
    let build = || ix::pay_installment(&w.student, &mint, 0, opened, gen);

    // foreign 6-decimal mint
    let foreign_mint = solana_address::Address::new_unique();
    env.svm.set_account(
        foreign_mint,
        solana_account::Account {
            lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
            data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 6, None),
            owner: spl::TOKEN_PROGRAM_ID,
            executable: false,
            rent_epoch: 0,
        },
    ).unwrap();
    let mut i = build();
    i.accounts[4].pubkey = foreign_mint;
    let out = env.send(&[i], &student, &[]);
    // vault's token::mint constraint fires before the config-mint check
    expect_instruction_failure(out.expect_err("foreign mint"), "foreign mint");

    // student ATA: valid mint+owner but not canonical
    let fake_ta = env.make_token_account(&w.student, &{ env.usdc_mint }, 1_000 * USDC);
    let mut i = build();
    i.accounts[7].pubkey = fake_ta;
    let out = env.send(&[i], &student, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical ata");

    // wrong PDAs in seeds-bound slots (bob has rep+plan of his own later)
    let other = cuotas_tests::credit::new_student(&mut env, 0);
    for (slot, foreign, name) in [
        (8usize, pda::reputation(&other.pubkey()).0, "foreign reputation"),
        (9, pda::plan(&other.pubkey()).0, "foreign plan"),
        (3, w.student_ata, "vault slot"),
    ] {
        let mut i = build();
        i.accounts[slot].pubkey = foreign;
        let out = env.send(&[i], &student, &[]);
        expect_instruction_failure(out.expect_err(name), name);
    }

    // payer substitutes the signer: an ix naming alice as student cannot
    // even be built without her signature
    let i = build();
    let attacker = env.actors.attacker.insecure_clone();
    let msg = solana_message::Message::new_with_blockhash(
        &[i],
        Some(&attacker.pubkey()),
        &env.svm.latest_blockhash(),
    );
    assert!(
        solana_transaction::versioned::VersionedTransaction::try_new(
            solana_message::VersionedMessage::Legacy(msg),
            &[&attacker],
        )
        .is_err(),
        "unsigned student account must make the tx unbuildable"
    );

    // a different real signer pays THEIR plan PDA: bob's plan doesn't exist
    let i = ix::pay_installment(&other.pubkey(), &{ env.usdc_mint }, 0, 0, 0);
    let out = env.send(&[i], &other, &[]);
    expect_instruction_failure(out.expect_err("no plan"), "no plan for signer");

    // nothing moved
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.active_installments().iter().any(|i| i.resolved()));
    assert_eq!(env.accounting_delta(), 0);
}

/// A student can never pay someone else's installment: crafting the ix with
/// alice's plan PDA but bob's reputation fails the plan->student binding,
/// and signing as bob cannot touch alice's accounts at all.
#[test]
fn pay_cannot_be_redirected_across_students() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let (_q, plan) = open_pc1000(&mut env, &w);
    let opened = plan.opened_at;
    let bob = cuotas_tests::credit::new_student(&mut env, 1_000 * USDC);

    // bob signs, but the plan slot points at ALICE's PDA: seeds
    // [plan, student] bind the plan to the signer — mismatch fails.
    let mut i = ix::pay_installment(&bob.pubkey(), &{ env.usdc_mint }, 0, opened, 0);
    i.accounts[9].pubkey = w.plan_pda;
    let out = env.send(&[i], &bob, &[]);
    expect_instruction_failure(out.expect_err("cross-student plan"), "plan bound to student");

    // alice's ATA swapped in for bob's ATA: authority check fails
    let mut i = ix::pay_installment(&bob.pubkey(), &{ env.usdc_mint }, 0, 0, 0);
    i.accounts[7].pubkey = w.student_ata;
    let out = env.send(&[i], &bob, &[]);
    expect_instruction_failure(out.expect_err("foreign ata"), "ata authority");

    assert_eq!(env.accounting_delta(), 0);
    assert!(!env.plan(&w.student).unwrap().installments[0].resolved());
}
