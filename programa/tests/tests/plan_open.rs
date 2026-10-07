//! Acceptance + adversarial: open_plan — exact PC-1000 terms, track
//! selection, eligibility gates, account/PDA integrity, atomic rollback,
//! state gating. All money assertions use the independent spec math in
//! `spec::spec_quote_*`; nothing is quoted back from program output.

use cuotas::{CuotasError, PlanOpened, ProtocolState};
use cuotas_tests::credit::{
    credit_env, credit_env_guaranteed, new_student, open, open_as,
};
use cuotas_tests::env::{pk, Env, USDC};
use cuotas_tests::err::{
    expect_cuotas_err, expect_instruction_failure, is_custom_error,
};
use cuotas_tests::{events, ix, pda, spec, spl};
use solana_keypair::Keypair;
use solana_signer::Signer;

const PC_PRICE: u64 = 1_000 * USDC;

fn set_state(env: &mut Env, st: ProtocolState) {
    let i = ix::admin_set_state(&env.actors.admin.pubkey(), st);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[])
        .expect_ok("set_state");
}

/// The demo gate (Fase A): PC of 1,000 USDC at guaranteed tier 0 must yield
/// down=300, financed=700, fee=49, merchant+951, installments
/// [233333333, 233333333, 233333334] micro-USDC, dues +30/+60/+90 days.
#[test]
fn pc1000_guaranteed_open_exact_terms_and_conservation() {
    // vault 10_000, student 1_000, guarantee covers the full 700 financed.
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let p = env.protocol();
    let q = spec::spec_quote_guaranteed(PC_PRICE, 0);
    // grain check on the spec math itself: independent of the program
    assert_eq!(q.down, 300 * USDC);
    assert_eq!(q.financed, 700 * USDC);
    assert_eq!(q.fee, 49 * USDC);
    assert_eq!(q.advance, 651 * USDC);
    assert_eq!(q.merchant_total, 951 * USDC);
    assert_eq!(q.installments, [233_333_333, 233_333_333, 233_333_334]);
    assert_eq!(q.installments.iter().sum::<u64>(), q.repayable);
    assert_eq!(q.required_coverage, 700 * USDC);

    let pool0 = env.pool();
    let vault0 = env.token_balance(&p.vault);
    let out = open(&mut env, &w, PC_PRICE);
    let meta = out.expect_ok("open PC1000");

    // --- Plan account, field by field ---
    let plan = env.plan(&w.student).expect("plan exists");
    assert_eq!(plan.student, pk(&w.student));
    assert_eq!(plan.merchant, pk(&w.merchant_wallet));
    assert_eq!(plan.price, PC_PRICE);
    assert_eq!(plan.down_payment, q.down);
    assert_eq!(plan.financed, q.financed);
    assert_eq!(plan.interest, q.interest);
    assert_eq!(plan.merchant_fee, q.fee);
    assert_eq!(plan.opened_at, env.now());
    assert_eq!(plan.tier, 0);
    assert_eq!(plan.generation, 1, "first plan stamps plans_opened 0->1");
    assert!(plan.with_guarantee);
    assert!(plan.counts, "financed 700 >= min 100 counts toward tier-ups");
    assert_eq!(plan.bump, pda::plan(&w.student).1);
    assert_eq!(plan.installment_count, 3);
    for (i, inst) in plan.active_installments().iter().enumerate() {
        assert_eq!(inst.amount, q.installments[i], "installment {i} amount");
        assert_eq!(
            inst.due_at,
            spec::spec_due_at(plan.opened_at, i),
            "installment {i} due = opened_at + {} protocol days",
            (i + 1) * spec::INSTALLMENT_INTERVAL_DAYS as usize
        );
        assert_eq!(inst.penalty, 0);
        assert!(!inst.paid && !inst.charged && !inst.marked_late);
        assert_eq!(inst.receipt_hash, [0; 32]);
    }
    for inst in &plan.installments[3..] {
        assert_eq!(inst.amount, 0);
        assert!(inst.paid);
    }

    // --- exact token movements ---
    assert_eq!(
        env.token_balance(&w.student_ata),
        1_000 * USDC - q.down,
        "student paid exactly the down payment"
    );
    assert_eq!(
        env.token_balance(&w.settlement_ata),
        q.merchant_total,
        "merchant collected down + advance (951)"
    );
    assert_eq!(
        env.token_balance(&p.vault),
        vault0 - q.advance,
        "vault advanced financed minus fee"
    );

    // --- pool accounting: fee + interest booked to LP capital ---
    let pool = env.pool();
    assert_eq!(pool.outstanding_credit, pool0.outstanding_credit + q.repayable);
    assert_eq!(pool.junior_capital, pool0.junior_capital + q.fee + q.interest);
    assert_eq!(pool.senior_capital, pool0.senior_capital);
    assert_eq!(pool.accrued_fees, pool0.accrued_fees + q.fee + q.interest);
    assert_eq!(env.accounting_delta(), 0, "vault + OC == J + S after open");

    // --- reputation + merchant counters ---
    let rep = env.reputation(&w.student);
    assert_eq!(rep.active_exposure, q.repayable);
    assert_eq!(rep.tier, 0, "open does not move the tier");
    assert_eq!(rep.plans_opened, 1, "each open bumps the generation counter");
    assert_eq!(env.merchant(&w.merchant_wallet).plans_count, 1);

    // --- event matches the booked state, not just the request ---
    let ev = events::emitted_one::<PlanOpened>(meta);
    assert_eq!(ev.plan, pk(&w.plan_pda));
    assert_eq!(ev.student, pk(&w.student));
    assert_eq!(ev.merchant, pk(&w.merchant_wallet));
    assert_eq!(ev.price, PC_PRICE);
    assert_eq!(ev.down_payment, q.down);
    assert_eq!(ev.financed, q.financed);
    assert_eq!(ev.merchant_fee, q.fee);
    assert_eq!(ev.installments, q.installments);
    assert_eq!(ev.tier, 0);
    assert!(ev.with_guarantee && ev.counts);
}

#[test]
fn open_without_guarantee_fails_with_guarantor_required() {
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);
    let out = open(&mut env, &w, 150 * USDC);
    expect_cuotas_err(&out, CuotasError::GuarantorRequired, "no guarantee -> GuarantorRequired");
    assert!(!env.program_account_live(&w.plan_pda));
}

#[test]
fn revoked_or_hidden_guarantee_fails_with_guarantor_required() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);
    let keeper = env.actors.keeper.insecure_clone();
    let alice = env.actors.alice.insecure_clone();

    // (a) guarantee registered but REVOKED -> Some(inactive) -> GuarantorRequired
    let i = ix::keeper_revoke_guarantee(&keeper.pubkey(), &w.student);
    env.send(&[i], &keeper, &[]).expect_ok("revoke");
    let out = open_as(&mut env, &alice, &w, 150 * USDC, Some(pda::guarantee(&w.student).0));
    expect_cuotas_err(&out, CuotasError::GuarantorRequired, "revoked guarantee -> GuarantorRequired");

    // (b) a NEW student with an active guarantee who passes None (program ID)
    let stu = new_student(&mut env, 1_000 * USDC);
    let i = ix::keeper_register_guarantee(&keeper.pubkey(), &stu.pubkey(), 1_000 * USDC, 800 * USDC, [0xC1; 32]);
    env.send(&[i], &keeper, &[]).expect_ok("register g2");
    let out = open_as(&mut env, &stu, &w, 150 * USDC, None);
    expect_cuotas_err(&out, CuotasError::GuarantorRequired, "hidden guarantee -> GuarantorRequired");
}

#[test]
fn open_rejects_below_option_min_and_unavailable_option() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);

    // 6 cuotas option requires min_price 350 USDC
    let out = cuotas_tests::credit::open_installments(&mut env, &w, 300 * USDC, 6);
    expect_cuotas_err(&out, CuotasError::BelowOptionMin, "6 cuotas price 300 < min 350");

    // Invalid installment counts (e.g. 4 or 12)
    let out = cuotas_tests::credit::open_installments(&mut env, &w, 500 * USDC, 4);
    expect_cuotas_err(&out, CuotasError::OptionUnavailable, "4 cuotas not configured");

    let out = cuotas_tests::credit::open_installments(&mut env, &w, 500 * USDC, 12);
    expect_cuotas_err(&out, CuotasError::OptionUnavailable, "12 cuotas not configured");
}

#[test]
fn pc1000_6cuotas_exact_terms_and_conservation() {
    // vault 10_000, student 1_000, guarantee covers the full 721 repayable (700 financed + 21 interest)
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 721 * USDC);
    let p = env.protocol();
    let q = spec::spec_quote_guaranteed_options(PC_PRICE, 0, 6);

    assert_eq!(q.down, 300 * USDC);
    assert_eq!(q.financed, 700 * USDC);
    assert_eq!(q.interest, 21 * USDC);
    assert_eq!(q.repayable, 721 * USDC);
    assert_eq!(q.fee, 49 * USDC);
    assert_eq!(q.advance, 651 * USDC);
    assert_eq!(q.merchant_total, 951 * USDC);
    assert_eq!(q.installments, vec![120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_666, 120_166_670]);
    assert_eq!(q.installments.iter().sum::<u64>(), q.repayable);
    assert_eq!(q.required_coverage, 721 * USDC);

    let pool0 = env.pool();
    let vault0 = env.token_balance(&p.vault);
    let out = cuotas_tests::credit::open_installments(&mut env, &w, PC_PRICE, 6);
    let meta = out.expect_ok("open PC1000 6 cuotas");

    let plan = env.plan(&w.student).expect("plan exists");
    assert_eq!(plan.installment_count, 6);
    assert_eq!(plan.price, PC_PRICE);
    assert_eq!(plan.down_payment, q.down);
    assert_eq!(plan.financed, q.financed);
    assert_eq!(plan.interest, q.interest);
    assert_eq!(plan.merchant_fee, q.fee);
    assert_eq!(plan.opened_at, env.now());
    assert_eq!(plan.tier, 0);
    assert!(plan.with_guarantee && plan.counts);

    for (i, inst) in plan.active_installments().iter().enumerate() {
        assert_eq!(inst.amount, q.installments[i], "inst {i} amount");
        assert_eq!(
            inst.due_at,
            spec::spec_due_at(plan.opened_at, i),
            "inst {i} due date"
        );
        assert_eq!(inst.penalty, 0);
        assert!(!inst.paid && !inst.charged && !inst.marked_late);
    }

    // Token movements
    assert_eq!(env.token_balance(&w.student_ata), 1_000 * USDC - q.down);
    assert_eq!(env.token_balance(&w.settlement_ata), q.merchant_total);
    assert_eq!(env.token_balance(&p.vault), vault0 - q.advance);

    // Pool accounting: fee + interest booked
    let pool = env.pool();
    assert_eq!(pool.outstanding_credit, pool0.outstanding_credit + q.repayable);
    assert_eq!(pool.junior_capital, pool0.junior_capital + q.fee + q.interest);
    assert_eq!(pool.senior_capital, pool0.senior_capital);
    assert_eq!(pool.accrued_fees, pool0.accrued_fees + q.fee + q.interest);
    assert_eq!(env.accounting_delta(), 0, "vault + OC == J + S after 6-cuotas open");

    let rep = env.reputation(&w.student);
    assert_eq!(rep.active_exposure, q.repayable);

    let ev = events::emitted_one::<PlanOpened>(meta);
    assert_eq!(ev.installments, q.installments);
}

#[test]
fn open_rejects_price_and_cap_violations() {
    // guaranteed world: tier0 max 1_000, guarantor caps 900 / coverage 700.
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 900 * USDC, 700 * USDC);

    let out = open(&mut env, &w, 0);
    expect_cuotas_err(&out, CuotasError::InvalidPrice, "price zero");

    let out = open(&mut env, &w, 1_001 * USDC);
    expect_cuotas_err(&out, CuotasError::PriceExceedsTierMax, "over tier0 max");

    // under tier max but over the guarantor's chosen purchase cap
    let out = open(&mut env, &w, 901 * USDC);
    expect_cuotas_err(&out, CuotasError::PriceExceedsGuarantorMax, "over guarantor max");

    // coverage: financed + interest must be <= coverage_max
    let (mut env2, w2) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 100 * USDC);
    let out = open(&mut env2, &w2, 200 * USDC);
    expect_cuotas_err(&out, CuotasError::InsufficientGuaranteeCoverage, "repayable 140 > coverage 100");

    // 6 cuotas where interest pushes repayable above coverage_max:
    // price 500: down 150, financed 350. Interest 3% = 10.50 USDC -> repayable 360.50 USDC.
    // coverage_max 355 is enough for financed (350) but NOT repayable (360.50).
    let (mut env3, w3) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 355 * USDC);
    let out = cuotas_tests::credit::open_installments(&mut env3, &w3, 500 * USDC, 6);
    expect_cuotas_err(&out, CuotasError::InsufficientGuaranteeCoverage, "repayable 360.50 > coverage 355");
}

#[test]
fn open_rejects_late_record_and_invalid_tier() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);

    // a guarantor charge on record bars new plans forever (late_count is
    // derived, not a flag: seeded here, produced for real in plan_recovery)
    env.edit_reputation(&w.student, |r| r.late_count = 1);
    let out = open(&mut env, &w, 100 * USDC);
    expect_cuotas_err(&out, CuotasError::BlockedFromNewPlans, "late_count>0 blocked");
    env.edit_reputation(&w.student, |r| r.late_count = 0);

    // reputation tier above the guaranteed table cannot index into it
    env.edit_reputation(&w.student, |r| r.tier = 4);
    let out = open(&mut env, &w, 100 * USDC);
    expect_cuotas_err(&out, CuotasError::InvalidReputationTier, "tier 4");
}

#[test]
fn open_rejects_inactive_merchant_and_second_plan() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);

    // no deactivate instruction exists — write the unreachable state so the
    // MerchantInactive gate runs for real
    env.edit_merchant(&w.merchant_wallet, |m| m.active = false);
    let out = open(&mut env, &w, 100 * USDC);
    expect_cuotas_err(&out, CuotasError::MerchantInactive, "inactive merchant");
    env.edit_merchant(&w.merchant_wallet, |m| m.active = true);

    open(&mut env, &w, 100 * USDC).expect_ok("first plan");
    // Q5: one active plan per student — init on the existing PDA must fail
    let out = open(&mut env, &w, 50 * USDC);
    expect_instruction_failure(out.expect_err("second plan"), "plan PDA already init");
    // and the first plan is untouched
    assert_eq!(env.plan(&w.student).unwrap().price, 100 * USDC);
}

#[test]
fn open_rejects_when_vault_lacks_advance_and_rolls_back() {
    // vault holds 500 < advance 651: InsufficientLiquidity, and NOTHING moves.
    let (mut env, w) = credit_env_guaranteed(500 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let p = env.protocol();
    let pool0 = env.account_data(&p.pool);
    let rep0 = env.account_data(&pda::reputation(&w.student).0);
    let merch0 = env.account_data(&pda::merchant(&w.merchant_wallet).0);

    let out = open(&mut env, &w, PC_PRICE);
    expect_cuotas_err(&out, CuotasError::InsufficientLiquidity, "vault short");

    assert_eq!(env.account_data(&p.pool), pool0, "pool untouched");
    assert_eq!(env.account_data(&pda::reputation(&w.student).0), rep0, "reputation untouched");
    assert_eq!(env.account_data(&pda::merchant(&w.merchant_wallet).0), merch0);
    assert_eq!(env.token_balance(&p.vault), 500 * USDC);
    assert_eq!(env.token_balance(&w.student_ata), 1_000 * USDC, "down never left");
    assert_eq!(env.token_balance(&w.settlement_ata), 0);
    assert!(!env.program_account_live(&w.plan_pda), "plan PDA rolled back");
}

#[test]
fn open_rolls_back_fully_when_student_cannot_pay() {
    // student holds 1 micro short of the 300 down: the SPL transfer fails
    // AFTER pool/reputation writes — the whole tx must revert atomically.
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 300 * USDC - 1, 1_000 * USDC, 700 * USDC);
    let p = env.protocol();
    let pool0 = env.account_data(&p.pool);
    let rep0 = env.account_data(&pda::reputation(&w.student).0);

    let out = open(&mut env, &w, PC_PRICE);
    let f = out.expect_err("insufficient student balance");
    assert!(is_custom_error(f), "SPL transfer failure, not a silent skip");

    assert_eq!(env.account_data(&p.pool), pool0, "pool write reverted");
    assert_eq!(env.account_data(&pda::reputation(&w.student).0), rep0, "exposure reverted");
    assert_eq!(env.token_balance(&p.vault), 10_000 * USDC, "no advance left the vault");
    assert_eq!(env.token_balance(&w.settlement_ata), 0);
    assert_eq!(env.token_balance(&w.student_ata), 300 * USDC - 1);
    assert!(!env.program_account_live(&w.plan_pda), "plan init reverted");
}

#[test]
fn open_rejects_corrupted_accounts_and_wrong_signer() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let alice = env.actors.alice.insecure_clone();
    let g = Some(pda::guarantee(&w.student).0);
    let mint = env.usdc_mint;
    let build = || ix::open_plan(&w.student, &mint, &w.merchant_wallet, 100 * USDC, 3, g);

    // settlement_ata: a token account owned by the merchant wallet but NOT
    // the registered canonical ATA -> TokenAccountMismatch (not a seed fail)
    let fake_settlement = env.make_token_account(&w.merchant_wallet, &{ env.usdc_mint }, 0);
    let mut i = build();
    i.accounts[9].pubkey = fake_settlement;
    let out = env.send(&[i], &alice, &[]);
    expect_cuotas_err(&out, CuotasError::TokenAccountMismatch, "non-canonical settlement");

    // student_usdc_ata: valid mint+owner but not the canonical ATA
    let fake_student_ta = env.make_token_account(&w.student, &{ env.usdc_mint }, 1_000 * USDC);
    let mut i = build();
    i.accounts[10].pubkey = fake_student_ta;
    let out = env.send(&[i], &alice, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical student ata");

    // usdc_mint: a well-formed foreign 6-decimal mint
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
    let out = env.send(&[i], &alice, &[]);
    // vault's token::mint constraint fires first — either way it is rejected
    expect_instruction_failure(out.expect_err("foreign mint"), "foreign mint");

    // reputation/plan/guarantee slots bound by seeds: another student's PDAs
    let other = new_student(&mut env, 0);
    for (slot, foreign, name) in [
        (7usize, pda::merchant(&other.pubkey()).0, "foreign merchant pda"),
        (11, pda::reputation(&other.pubkey()).0, "foreign reputation pda"),
        (12, pda::guarantee(&other.pubkey()).0, "foreign guarantee pda"),
        (13, pda::plan(&other.pubkey()).0, "foreign plan pda"),
    ] {
        let mut i = build();
        i.accounts[slot].pubkey = foreign;
        let out = env.send(&[i], &alice, &[]);
        expect_instruction_failure(out.expect_err(name), name);
    }

    // vault slot: any account that is not ["vault", pool] fails the seeds
    let mut i = build();
    i.accounts[3].pubkey = w.student_ata;
    let out = env.send(&[i], &alice, &[]);
    expect_instruction_failure(out.expect_err("wrong vault"), "vault seeds");

    // the STUDENT signature is required: an ix naming alice as student
    // cannot even be signed without her key
    let i = build();
    let attacker = env.actors.attacker.insecure_clone();
    let msg = solana_message::Message::new_with_blockhash(
        &[i.clone()],
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
    // and if the attacker names THEMSELVES as student, their reputation/
    // plan PDAs don't exist — the program cannot bootstrap a plan for them
    let i = ix::open_plan(&attacker.pubkey(), &mint, &w.merchant_wallet, 100 * USDC, 3, None);
    let out = env.send(&[i], &attacker, &[]);
    expect_instruction_failure(out.expect_err("attacker-student mismatch"), "pda seeds");
    assert!(!env.program_account_live(&w.plan_pda));

    // a student with no reputation account cannot open at all
    let ghost = Keypair::new();
    env.svm.airdrop(&ghost.pubkey(), 1_000_000_000).unwrap();
    env.make_ata(&ghost.pubkey(), &{ env.usdc_mint }, 1_000 * USDC);
    let i = ix::open_plan(&ghost.pubkey(), &{ env.usdc_mint }, &w.merchant_wallet, 100 * USDC, 3, None);
    let out = env.send(&[i], &ghost, &[]);
    expect_instruction_failure(out.expect_err("no reputation"), "missing reputation");
}

#[test]
fn open_plan_is_gated_to_normal_state() {
    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);
        set_state(&mut env, st);
        let out = open(&mut env, &w, 100 * USDC);
        expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "open gated");
        assert!(!env.program_account_live(&w.plan_pda));
    }
}

#[test]
fn open_plan_charges_no_fee_when_config_says_zero() {
    // Nothing business-related is hardcoded: with fee_bps updated to 0 the
    // merchant receives down + financed in full and no gain is booked.
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);
    let mut params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    params.fee_bps = 0;
    let i = ix::admin_update_config(&env.actors.admin.pubkey(), &params);
    env.send(&[i], &env.actors.admin.insecure_clone(), &[]).expect_ok("zero fee");

    open(&mut env, &w, 150 * USDC).expect_ok("open");
    let plan = env.plan(&w.student).unwrap();
    assert_eq!(plan.merchant_fee, 0);
    assert_eq!(env.token_balance(&w.settlement_ata), 150 * USDC);
    let pool = env.pool();
    assert_eq!(pool.accrued_fees, 0, "no fee booked");
    assert_eq!(env.accounting_delta(), 0);
}
