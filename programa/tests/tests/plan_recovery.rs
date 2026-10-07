//! Acceptance + adversarial: crank_mark_late + keeper_register_recovery —
//! day-boundary semantics (grace day 5 vs 6, charge day 14 vs 15), receipt
//! replay rules, first-unpaid ordering, acceleration on second charge,
//! reputation downgrade + late_count plan block, atomic rollback, and the
//! state matrix for repayment/recovery (all allowed outside Normal).

use cuotas::{
    CuotasError, InstallmentMarkedLate, PlanSettled, ProtocolState, RecoveryRegistered,
};
use cuotas_tests::credit::{
    credit_env_guaranteed, crank, fund_keeper, new_student, open, open_as,
    open_pc1000, pay, recover, warp_to, CreditWorld,
};
use cuotas_tests::env::{pk, Env, USDC};
use cuotas_tests::err::{
    expect_cuotas_err, expect_instruction_failure, is_custom_error,
};
use cuotas_tests::{events, ix, pda, spec, spl};
use solana_signer::Signer;

const PC_PRICE: u64 = 1_000 * USDC;
const R1: [u8; 32] = [0x11; 32];
const R2: [u8; 32] = [0x22; 32];
const R3: [u8; 32] = [0x33; 32];
const R4: [u8; 32] = [0x44; 32];
const R5: [u8; 32] = [0x55; 32];

fn set_state(env: &mut Env, st: ProtocolState) {
    let i = ix::admin_set_state(&env.actors.admin.pubkey(), st);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[])
        .expect_ok("set_state");
}

fn keeper_kp(env: &Env) -> solana_keypair::Keypair {
    env.actors.keeper.insecure_clone()
}

/// Setup for recovery tests: guaranteed PC-1000 plan + funded keeper ATA.
fn late_world() -> (Env, CreditWorld) {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    fund_keeper(&mut env, 10_000 * USDC);
    open_pc1000(&mut env, &w);
    (env, w)
}

// ---------------- crank_mark_late ----------------

/// Grace boundary is exact: day 5 still grace (MarkTooEarly at due+299/300/
/// 359 s), day 6 marks (due+360 s). The crank is permissionless — run by the
/// attacker keypair — and fixes penalty = 5% floor, permanently flipping
/// `counts` off.
#[test]
fn crank_boundaries_day5_vs_day6_and_idempotence() {
    let (mut env, w) = late_world();
    let attacker = env.actors.attacker.insecure_clone();
    let plan = env.plan(&w.student).unwrap();
    let due0 = plan.installments[0].due_at;
    let penalty = spec::spec_penalty(plan.installments[0].amount);

    // days 4 and 5 (whole boundary) are inside grace
    for t in [299, 300, 359] {
        warp_to(&mut env, due0 + t);
        let out = crank(&mut env, &attacker, &w.student, 0);
        expect_cuotas_err(&out, CuotasError::MarkTooEarly, "crank inside grace");
    }

    // day 6: the first markable instant — permissionless caller works
    warp_to(&mut env, due0 + 360);
    let out = crank(&mut env, &attacker, &w.student, 0);
    let meta = out.expect_ok("crank day6");
    let ev = events::emitted_one::<InstallmentMarkedLate>(meta);
    assert_eq!(ev.plan, pk(&w.plan_pda));
    assert_eq!(ev.student, pk(&w.student));
    assert_eq!(ev.index, 0);
    assert_eq!(ev.penalty, penalty);

    let plan = env.plan(&w.student).unwrap();
    let inst = &plan.installments[0];
    assert!(inst.marked_late);
    assert_eq!(inst.penalty, penalty);
    assert!(!inst.paid && !inst.charged);
    assert!(!plan.counts, "a marked plan can never count again");

    // explicit idempotence, not silence: second crank fails loudly
    let out = crank(&mut env, &attacker, &w.student, 0);
    expect_cuotas_err(&out, CuotasError::AlreadyMarkedLate, "double mark");
    // an index outside the fixed schedule
    let out = crank(&mut env, &attacker, &w.student, 3);
    expect_cuotas_err(&out, CuotasError::InvalidInstallmentIndex, "index 3");
    // a later installment still inside grace
    let out = crank(&mut env, &attacker, &w.student, 1);
    expect_cuotas_err(&out, CuotasError::MarkTooEarly, "inst1 not late yet");

    // penalty never accrues: marked penalty is fixed at day-6 value forever
    warp_to(&mut env, due0 + 100 * spec::SECONDS_PER_DAY as i64);
    let plan = env.plan(&w.student).unwrap();
    assert_eq!(plan.installments[0].penalty, penalty, "penalty is fixed, not accruing");

    // crank on a resolved installment is its own error
    let student = env.actors.alice.insecure_clone();
    pay(&mut env, &student, 0).expect_ok("pay marked inst0 (amount+penalty)");
    let out = crank(&mut env, &attacker, &w.student, 0);
    expect_cuotas_err(&out, CuotasError::InstallmentAlreadyResolved, "crank paid inst");
}

/// The plan slot is seeds-bound to `student`; foreign PDAs fail.
#[test]
fn crank_rejects_wrong_pdas_and_missing_plan() {
    let (mut env, w) = late_world();
    let attacker = env.actors.attacker.insecure_clone();
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 360);

    // plan PDA of another (existing) student
    let other = new_student(&mut env, 0);
    let mut i = ix::crank_mark_late(&attacker.pubkey(), &w.student, 0);
    i.accounts[3].pubkey = pda::plan(&other.pubkey()).0;
    let out = env.send(&[i], &attacker, &[]);
    expect_instruction_failure(out.expect_err("foreign plan"), "plan seeds");

    // student meta swapped after building: plan PDA no longer derives
    let mut i = ix::crank_mark_late(&attacker.pubkey(), &w.student, 0);
    i.accounts[2].pubkey = other.pubkey();
    let out = env.send(&[i], &attacker, &[]);
    expect_instruction_failure(out.expect_err("student/plan mismatch"), "seeds");

    // no plan exists for `other` at all
    let i = ix::crank_mark_late(&attacker.pubkey(), &other.pubkey(), 0);
    let out = env.send(&[i], &attacker, &[]);
    expect_instruction_failure(out.expect_err("no plan"), "missing plan");
}

// ---------------- keeper_register_recovery ----------------

/// Trigger boundary is exact: day 14 (due+839/899 s) is RecoveryTooEarly,
/// day 15 (due+900 s) charges ONLY the trigger installment on a first
/// recovery — penalty auto-applied, receipt recorded, plan stays open.
#[test]
fn recovery_boundary_day15_charges_only_trigger() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let plan = env.plan(&w.student).unwrap();
    let due0 = plan.installments[0].due_at;
    let p0 = spec::spec_penalty(plan.installments[0].amount);
    let a0 = plan.installments[0].amount;

    // day 13 and day 14 (to the last second) are too early
    for t in [839, 899] {
        warp_to(&mut env, due0 + t);
        let out = recover(&mut env, &keeper, &w.student, 0, R1);
        expect_cuotas_err(&out, CuotasError::RecoveryTooEarly, "day<15");
    }

    warp_to(&mut env, due0 + 900); // day 15 exactly
    let v0 = env.token_balance(&env.protocol().vault);
    let k0 = env.token_balance(&keeper_ata);
    let oc0 = env.pool().outstanding_credit;
    let exp0 = env.reputation(&w.student).active_exposure;

    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    let meta = out.expect_ok("recover day15");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert_eq!(ev.charged_indexes, vec![0u8], "first recovery charges trigger only");
    assert_eq!(ev.principal, a0);
    assert_eq!(ev.penalties, p0, "auto-marked penalty applied on charge");
    assert_eq!(ev.receipt_hash, R1);
    assert!(!ev.accelerated);
    assert_eq!(ev.late_count, 1);
    assert_eq!(ev.new_tier, 0, "tier 0 floors at 0");

    let plan = env.plan(&w.student).expect("plan still open");
    let i0 = &plan.installments[0];
    assert!(i0.charged && i0.marked_late && !i0.paid);
    assert_eq!(i0.penalty, p0);
    assert_eq!(i0.receipt_hash, R1, "receipt recorded on the charge");
    assert!(!plan.installments[1].resolved() && !plan.installments[2].resolved());
    assert!(!plan.counts);

    assert_eq!(env.token_balance(&env.protocol().vault), v0 + a0 + p0);
    assert_eq!(env.token_balance(&keeper_ata), k0 - (a0 + p0), "keeper fronts the charge");
    assert_eq!(env.pool().outstanding_credit, oc0 - a0);
    assert_eq!(env.reputation(&w.student).active_exposure, exp0 - a0);
    assert_eq!(env.reputation(&w.student).late_count, 1);
    assert_eq!(env.accounting_delta(), 0);
}

/// Second guarantor charge accelerates ("caducan plazos"): every remaining
/// installment is charged at once — including installment 2 which is NOT due
/// yet and therefore carries no penalty. Plan closes on full resolution.
#[test]
fn second_recovery_accelerates_without_penalty_on_undue() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let plan0 = env.plan(&w.student).unwrap();
    let due0 = plan0.installments[0].due_at;
    let due1 = plan0.installments[1].due_at;
    let p1 = spec::spec_penalty(plan0.installments[1].amount);

    warp_to(&mut env, due0 + 900);
    recover(&mut env, &keeper, &w.student, 0, R1).expect_ok("first recovery");

    // at inst1 day 15, inst2 is still ~15 days from even being DUE
    warp_to(&mut env, due1 + 900);
    let v0 = env.token_balance(&env.protocol().vault);
    let k0 = env.token_balance(&keeper_ata);
    let principal = plan0.installments[1].amount + plan0.installments[2].amount;
    assert_eq!(principal, 466_666_667);

    let out = recover(&mut env, &keeper, &w.student, 1, R2);
    let meta = out.expect_ok("accelerating recovery");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert!(ev.accelerated, "second charge accelerates all terms");
    assert_eq!(ev.charged_indexes, vec![1u8, 2u8]);
    assert_eq!(ev.principal, principal);
    // THE key assertion: only inst1 (past grace) carries its penalty; the
    // not-yet-due inst2 is charged with ZERO punitorio
    assert_eq!(ev.penalties, p1, "no penalty on unduly future installments");
    assert_eq!(ev.receipt_hash, R2);
    assert_eq!(ev.late_count, 2);

    // exact transfer = principal + only the earned penalty
    let total = principal + p1;
    assert_eq!(env.token_balance(&env.protocol().vault), v0 + total);
    assert_eq!(env.token_balance(&keeper_ata), k0 - total);

    // full resolution closes the plan; exposure and credit unwind to zero
    assert!(env.plan(&w.student).is_none(), "plan closed on full charge");
    let rep = env.reputation(&w.student);
    assert_eq!(rep.active_exposure, 0);
    assert_eq!(rep.late_count, 2);
    assert_eq!(env.pool().outstanding_credit, 0);
    assert_eq!(env.accounting_delta(), 0);
}

/// Receipt and ordering guards, in the exact order the handler checks them.
#[test]
fn recovery_receipt_and_index_guards() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 900);

    let out = recover(&mut env, &keeper, &w.student, 0, [0; 32]);
    expect_cuotas_err(&out, CuotasError::InvalidReceiptHash, "zero receipt");
    let out = recover(&mut env, &keeper, &w.student, 3, R3);
    expect_cuotas_err(&out, CuotasError::InvalidInstallmentIndex, "index 3");

    recover(&mut env, &keeper, &w.student, 0, R1).expect_ok("first");

    // replay defenses, both orderings
    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    expect_cuotas_err(&out, CuotasError::ReceiptAlreadyUsed, "same receipt, same index");
    let out = recover(&mut env, &keeper, &w.student, 0, R2);
    expect_cuotas_err(&out, CuotasError::InstallmentAlreadyResolved, "fresh receipt, charged index");
    let out = recover(&mut env, &keeper, &w.student, 1, R1);
    expect_cuotas_err(&out, CuotasError::ReceiptAlreadyUsed, "used receipt on unpaid index");
    let out = recover(&mut env, &keeper, &w.student, 2, R3);
    expect_cuotas_err(&out, CuotasError::StaleInstallmentIndex, "not the first unpaid");
    let out = recover(&mut env, &keeper, &w.student, 1, R4);
    expect_cuotas_err(&out, CuotasError::RecoveryTooEarly, "inst1 not at day 15");

    // nothing but inst0 was ever touched
    let plan = env.plan(&w.student).unwrap();
    assert!(plan.installments[0].charged);
    assert!(!plan.installments[1].resolved() && !plan.installments[2].resolved());
    assert_eq!(env.reputation(&w.student).late_count, 1);
}

/// Recovery must target the FIRST unpaid installment, even after the student
/// paid earlier ones honestly. A first charge never accelerates.
#[test]
fn recovery_requires_first_unpaid_and_never_skips() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let student = env.actors.alice.insecure_clone();

    // student pays inst0 honestly and on time
    pay(&mut env, &student, 0).expect_ok("pay0");
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[1].due_at + 900);

    let out = recover(&mut env, &keeper, &w.student, 0, R3);
    expect_cuotas_err(&out, CuotasError::InstallmentAlreadyResolved, "paid index");
    let out = recover(&mut env, &keeper, &w.student, 2, R3);
    expect_cuotas_err(&out, CuotasError::StaleInstallmentIndex, "skip inst1");

    // first charge on this plan: only inst1, no acceleration
    let out = recover(&mut env, &keeper, &w.student, 1, R3);
    let meta = out.expect_ok("charge inst1");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert_eq!(ev.charged_indexes, vec![1u8]);
    assert!(!ev.accelerated, "no prior charge -> no acceleration");
    let plan = env.plan(&w.student).expect("inst2 still pending");
    assert!(!plan.installments[2].resolved());

    // student can still settle the last installment herself; the plan closes
    // and never counted (a charge on record disqualifies it)
    let out = pay(&mut env, &student, 2);
    let meta = out.expect_ok("pay inst2");
    let settled = events::emitted_one::<PlanSettled>(meta);
    assert!(!settled.counts, "plan with a guarantor charge never counts");
    assert!(env.plan(&w.student).is_none());
}

/// A guarantor charge on record bars new plans FOREVER — even after the
/// plan fully settled and exposure returned to zero. (The derived-gate
/// design: no `blocked` flag on Reputation, `late_count > 0` is the rule.)
#[test]
fn late_count_blocks_new_plans_after_real_recovery() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let plan = env.plan(&w.student).unwrap();
    let due0 = plan.installments[0].due_at;
    let due1 = plan.installments[1].due_at;

    warp_to(&mut env, due0 + 900);
    recover(&mut env, &keeper, &w.student, 0, R1).expect_ok("charge inst0");
    warp_to(&mut env, due1 + 900);
    recover(&mut env, &keeper, &w.student, 1, R2).expect_ok("accelerate, close");

    assert!(env.plan(&w.student).is_none());
    let rep = env.reputation(&w.student);
    assert_eq!(rep.late_count, 2);
    assert_eq!(rep.active_exposure, 0, "exposure fully unwound");

    // PDA is free, student is solvent — and still barred. Forever.
    let out = open(&mut env, &w, 100 * USDC);
    expect_cuotas_err(&out, CuotasError::BlockedFromNewPlans, "late_count>0 blocks reopen");
    assert!(!env.program_account_live(&w.plan_pda));
}

/// A recovery downgrades the tier exactly one step (not to zero): tier 1
/// earned by a completed plan drops back to 0 on the first charge.
#[test]
fn recovery_downgrades_one_tier_step() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 5_000 * USDC, 1_500 * USDC, 800 * USDC);
    let keeper = keeper_kp(&env);
    let student = env.actors.alice.insecure_clone();
    fund_keeper(&mut env, 10_000 * USDC);

    // earn tier 1 for real
    open_pc1000(&mut env, &w);
    for i in 0..3 {
        pay(&mut env, &student, i).expect_ok("settle plan1");
    }
    assert_eq!(env.reputation(&w.student).tier, 1);
    env.warp_secs(1);

    // second plan defaults on inst0
    open(&mut env, &w, PC_PRICE).expect_ok("plan2");
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 900);
    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    let meta = out.expect_ok("charge");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert_eq!(ev.new_tier, 0, "tier 1 -> 0 on first charge");
    assert_eq!(env.reputation(&w.student).tier, 0);
    assert_eq!(env.reputation(&w.student).late_count, 1);
}

/// Recovery can never touch an unguaranteed plan — even when it is
/// legitimately past the charge day.
#[test]
fn recovery_rejects_unguaranteed_plans() {
    let (mut env, w) = late_world();
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 30 * spec::SECONDS_PER_DAY as i64);

    env.edit_plan(&w.student, |p| p.with_guarantee = false);

    let keeper = keeper_kp(&env);
    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    expect_cuotas_err(&out, CuotasError::PlanNotGuaranteed, "no charge without fiador");
    assert!(!env.plan(&w.student).unwrap().installments[0].resolved());
    assert_eq!(env.reputation(&w.student).late_count, 0);
}

/// Acceptance for 6-cuotas recovery:
/// - Installment 0 is cranked at day 6 (due0 + 360 s) with 5% penalty
/// - Installment 0 is recovered by keeper at day 15 (due0 + 900 s)
/// - Installment 1 at day 15 (due1 + 900 s) triggers second recovery: ACCELERATES all remaining installments (1..6)
/// - Only installment 1 gets penalty; undue installments 2..6 have 0 penalty
/// - Plan settles, closes PDA, late_count = 2, accounting invariant holds.
#[test]
fn recovery_6cuotas_first_charge_and_second_accelerates_remaining() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    fund_keeper(&mut env, 10_000 * USDC);
    let keeper = keeper_kp(&env);
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let attacker = env.actors.attacker.insecure_clone();

    cuotas_tests::credit::open_installments(&mut env, &w, PC_PRICE, 6).expect_ok("open 6 cuotas");
    let plan0 = env.plan(&w.student).unwrap();
    assert_eq!(plan0.installment_count, 6);
    let due0 = plan0.installments[0].due_at;
    let due1 = plan0.installments[1].due_at;
    let p0 = spec::spec_penalty(plan0.installments[0].amount);
    let p1 = spec::spec_penalty(plan0.installments[1].amount);

    // Day 6 of installment 0: crank mark late
    warp_to(&mut env, due0 + 360);
    let out = crank(&mut env, &attacker, &w.student, 0);
    let meta = out.expect_ok("crank 6-cuotas inst0");
    let ev = events::emitted_one::<InstallmentMarkedLate>(meta);
    assert_eq!(ev.index, 0);
    assert_eq!(ev.penalty, p0);

    // Day 15 of installment 0: keeper first recovery (charges only inst 0)
    warp_to(&mut env, due0 + 900);
    let v0 = env.token_balance(&env.protocol().vault);
    let k0 = env.token_balance(&keeper_ata);
    let a0 = plan0.installments[0].amount;

    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    let meta = out.expect_ok("first recovery 6 cuotas");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert_eq!(ev.charged_indexes, vec![0u8]);
    assert_eq!(ev.principal, a0);
    assert_eq!(ev.penalties, p0);
    assert!(!ev.accelerated);
    assert_eq!(ev.late_count, 1);

    assert_eq!(env.token_balance(&env.protocol().vault), v0 + a0 + p0);
    assert_eq!(env.token_balance(&keeper_ata), k0 - (a0 + p0));
    assert_eq!(env.accounting_delta(), 0);

    // Day 15 of installment 1: keeper second recovery -> ACCELERATES!
    // Remaining installments are 1, 2, 3, 4, 5.
    warp_to(&mut env, due1 + 900);
    let v1 = env.token_balance(&env.protocol().vault);
    let k1 = env.token_balance(&keeper_ata);
    let remaining_principal: u64 = plan0.installments[1..6].iter().map(|i| i.amount).sum();

    let out = recover(&mut env, &keeper, &w.student, 1, R2);
    let meta = out.expect_ok("second recovery accelerates remaining 5 installments");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert!(ev.accelerated);
    assert_eq!(ev.charged_indexes, vec![1u8, 2u8, 3u8, 4u8, 5u8]);
    assert_eq!(ev.principal, remaining_principal);
    // Only inst1 gets penalty, future 2..6 have NO penalty!
    assert_eq!(ev.penalties, p1);
    assert_eq!(ev.late_count, 2);

    let total2 = remaining_principal + p1;
    assert_eq!(env.token_balance(&env.protocol().vault), v1 + total2);
    assert_eq!(env.token_balance(&keeper_ata), k1 - total2);

    // Plan is completely resolved and closed!
    assert!(env.plan(&w.student).is_none(), "plan closed after accelerated recovery");
    let rep = env.reputation(&w.student);
    assert_eq!(rep.active_exposure, 0);
    assert_eq!(rep.late_count, 2);
    assert_eq!(env.pool().outstanding_credit, 0);
    assert_eq!(env.accounting_delta(), 0);
}

/// Keeper-only authority and account integrity for the recovery path.
#[test]
fn recovery_rejects_wrong_role_and_corrupted_accounts() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 900);

    // role separation: admin, attacker and the student herself cannot post
    // a guarantor charge
    for kp in [
        env.actors.admin.insecure_clone(),
        env.actors.attacker.insecure_clone(),
        env.actors.alice.insecure_clone(),
    ] {
        let i = ix::keeper_register_recovery(
            &kp.pubkey(), &env.usdc_mint, &w.student, 0, R1,
        );
        // their "keeper ATA" doesn't exist — but the keeper check must fire
        // first (config.keeper == keeper.key() constraint)
        env.make_ata(&kp.pubkey(), &{ env.usdc_mint }, 10_000 * USDC);
        let out = env.send(&[i], &kp, &[]);
        expect_cuotas_err(&out, CuotasError::NotKeeper, "impostor keeper");
    }

    let mint = env.usdc_mint;
    let build = |receipt: [u8; 32]| {
        ix::keeper_register_recovery(&keeper.pubkey(), &mint, &w.student, 0, receipt)
    };

    // keeper_usdc_ata: non-canonical token account owned by keeper
    let fake = env.make_token_account(&keeper.pubkey(), &{ env.usdc_mint }, 10_000 * USDC);
    let mut i = build(R5);
    i.accounts[7].pubkey = fake;
    let out = env.send(&[i], &keeper, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical keeper ata");

    // someone else's canonical ATA in the keeper slot
    let mut i = build(R5);
    i.accounts[7].pubkey = w.student_ata;
    let out = env.send(&[i], &keeper, &[]);
    expect_instruction_failure(out.expect_err("foreign ata"), "ata authority");

    // foreign mint
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
    let mut i = build(R5);
    i.accounts[4].pubkey = foreign_mint;
    let out = env.send(&[i], &keeper, &[]);
    // vault's token::mint constraint fires before the config-mint check
    expect_instruction_failure(out.expect_err("foreign mint"), "foreign mint");

    // wrong PDAs in seeds-bound slots
    let other = new_student(&mut env, 0);
    for (slot, foreign, name) in [
        (9usize, pda::reputation(&other.pubkey()).0, "foreign reputation"),
        (10, pda::plan(&other.pubkey()).0, "foreign plan"),
        (3, w.student_ata, "vault slot"),
    ] {
        let mut i = build(R5);
        i.accounts[slot].pubkey = foreign;
        let out = env.send(&[i], &keeper, &[]);
        expect_instruction_failure(out.expect_err(name), name);
    }

    // student slot swapped: plan/reputation PDAs stop deriving
    let mut i = build(R5);
    i.accounts[8].pubkey = other.pubkey();
    let out = env.send(&[i], &keeper, &[]);
    expect_instruction_failure(out.expect_err("student mismatch"), "student seeds");

    // absolutely nothing was booked by any of the above
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.active_installments().iter().any(|i| i.resolved()));
    assert_eq!(env.reputation(&w.student).late_count, 0);
    assert_eq!(env.accounting_delta(), 0);
}

/// Keeper ATA short of principal+penalty: the SPL transfer fails and the
/// whole recovery (marks, charge flags, reputation, pool) rolls back.
#[test]
fn recovery_rolls_back_when_keeper_underfunded() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 800 * USDC);
    let keeper = keeper_kp(&env);
    open_pc1000(&mut env, &w);
    let plan = env.plan(&w.student).unwrap();
    warp_to(&mut env, plan.installments[0].due_at + 900);

    let needed = plan.installments[0].amount + spec::spec_penalty(plan.installments[0].amount);
    fund_keeper(&mut env, needed - 1); // one micro short
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);

    let p = env.protocol();
    let pool0 = env.account_data(&p.pool);
    let rep0 = env.account_data(&pda::reputation(&w.student).0);
    let plan0 = env.account_data(&w.plan_pda);
    let v0 = env.token_balance(&p.vault);

    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    let f = out.expect_err("underfunded keeper");
    assert!(is_custom_error(f), "SPL transfer must fail");

    assert_eq!(env.account_data(&p.pool), pool0, "pool write reverted");
    assert_eq!(env.account_data(&pda::reputation(&w.student).0), rep0, "reputation reverted");
    assert_eq!(env.account_data(&w.plan_pda), plan0, "plan marks/charge reverted");
    assert_eq!(env.token_balance(&p.vault), v0);
    assert_eq!(env.token_balance(&keeper_ata), needed - 1, "keeper kept funds");
    assert_eq!(env.accounting_delta(), 0);
}

/// Repayment-side ops keep working under Halted/WithdrawsOnly — only
/// origination is paused. Pinned per documented semantics: pay, crank and
/// keeper recovery must remain executable to reduce risk in a halt.
#[test]
fn repayment_crank_and_recovery_run_in_every_state() {
    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let (mut env, w) = late_world();
        let keeper = keeper_kp(&env);
        let student = env.actors.alice.insecure_clone();
        // a second student with reputation — registered BEFORE the halt
        // (student_init_reputation itself is Normal-gated)
        let other = new_student(&mut env, 1_000 * USDC);
        let plan = env.plan(&w.student).unwrap();
        warp_to(&mut env, plan.installments[0].due_at + 900); // day 15

        set_state(&mut env, st);
        // origination is blocked even though everything else works
        let out = open_as(&mut env, &other, &w, 100 * USDC, None);
        expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "open gated");

        let anyone = env.actors.attacker.insecure_clone();
        crank(&mut env, &anyone, &w.student, 0)
            .expect_ok("crank runs in any state");
        recover(&mut env, &keeper, &w.student, 0, R1).expect_ok("recovery in any state");
        pay(&mut env, &student, 1).expect_ok("repayment in any state");
        assert_eq!(env.accounting_delta(), 0);
    }
}

/// A crank's mark and a recovery's auto-mark must agree: a marked
/// installment is charged exactly principal + the fixed penalty — never
/// penalized twice when the recovery lands later.
#[test]
fn marked_penalty_is_charged_once_not_doubled() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let attacker = env.actors.attacker.insecure_clone();
    let plan = env.plan(&w.student).unwrap();
    let due0 = plan.installments[0].due_at;
    let p0 = spec::spec_penalty(plan.installments[0].amount);
    let a0 = plan.installments[0].amount;

    // crank marks at day 6; keeper charges at day 15
    warp_to(&mut env, due0 + 360);
    crank(&mut env, &attacker, &w.student, 0).expect_ok("mark");
    warp_to(&mut env, due0 + 900);
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let k0 = env.token_balance(&keeper_ata);
    let out = recover(&mut env, &keeper, &w.student, 0, R1);
    let meta = out.expect_ok("charge");
    let ev = events::emitted_one::<RecoveryRegistered>(meta);
    assert_eq!(ev.penalties, p0, "penalty applied once");
    assert_eq!(ev.principal, a0);
    assert_eq!(env.token_balance(&keeper_ata), k0 - (a0 + p0), "no double penalty");
}

/// Whole-lifecycle conservation: deposits, one open, mixed resolution paths
/// (on-time pay, late pay with penalty, guarantor charge) — the total USDC
/// across every account equals what was minted, and V+OC=J+S at each step.
#[test]
fn token_conservation_across_mixed_lifecycle() {
    let (mut env, w) = late_world();
    let keeper = keeper_kp(&env);
    let student = env.actors.alice.insecure_clone();
    let attacker = env.actors.attacker.insecure_clone();
    let keeper_ata = spl::ata(&keeper.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);
    let treasury_ata = env.treasury_ata();
    let lp_usdc_ata = spl::ata(&attacker.pubkey(), &env.usdc_mint, &spl::TOKEN_PROGRAM_ID);

    let snapshot = |env: &Env| -> u64 {
        env.token_balance(&env.protocol().vault)
            + env.token_balance(&w.student_ata)
            + env.token_balance(&w.settlement_ata)
            + env.token_balance(&keeper_ata)
            + env.token_balance(&lp_usdc_ata)
            + env.token_balance(&treasury_ata)
    };
    // every USDC the program ever moves was minted into these accounts up
    // front — the program never mints, so this total must be invariant
    let minted = snapshot(&env);
    assert_eq!(env.accounting_delta(), 0);

    let plan = env.plan(&w.student).unwrap();
    pay(&mut env, &student, 0).expect_ok("pay0 on time");
    assert_eq!(snapshot(&env), minted, "conservation after pay0");

    warp_to(&mut env, plan.installments[1].due_at + 360); // inst1 day 6
    crank(&mut env, &attacker, &w.student, 1).expect_ok("mark inst1");
    pay(&mut env, &student, 1).expect_ok("pay1 late +penalty");
    assert_eq!(snapshot(&env), minted, "conservation after late pay");
    assert_eq!(env.accounting_delta(), 0);

    warp_to(&mut env, plan.installments[2].due_at + 900); // inst2 day 15
    recover(&mut env, &keeper, &w.student, 2, R1).expect_ok("charge inst2");
    assert_eq!(snapshot(&env), minted, "conservation after recovery");
    assert!(env.plan(&w.student).is_none(), "all resolved -> closed");
    assert_eq!(env.accounting_delta(), 0);
    assert_eq!(env.reputation(&w.student).late_count, 1);
}
