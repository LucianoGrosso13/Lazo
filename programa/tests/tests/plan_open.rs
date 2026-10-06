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
    assert!(plan.with_guarantee);
    assert!(plan.counts, "financed 700 >= min 100 counts toward tier-ups");
    assert_eq!(plan.bump, pda::plan(&w.student).1);
    for (i, inst) in plan.installments.iter().enumerate() {
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
fn unguaranteed_open_uses_s0_terms_and_cannot_count() {
    // No guarantee registered: the guarantee slot carries the program ID.
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);
    let q = spec::spec_quote_unguaranteed(150 * USDC, 0);
    assert_eq!(q.down, 75 * USDC);
    assert_eq!(q.financed, 75 * USDC);

    open(&mut env, &w, 150 * USDC).expect_ok("open S0");
    let plan = env.plan(&w.student).unwrap();
    assert_eq!(plan.down_payment, q.down);
    assert_eq!(plan.financed, q.financed);
    assert_eq!(plan.installments.map(|i| i.amount), q.installments);
    assert!(!plan.with_guarantee, "no active guarantee -> unguaranteed track");
    assert!(!plan.counts, "financed 75 < min 100 can never count at S0");
    assert_eq!(env.merchant(&w.merchant_wallet).plans_count, 1);
    assert_eq!(env.accounting_delta(), 0);
}

#[test]
fn revoked_or_hidden_guarantee_falls_back_to_unguaranteed() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 800 * USDC);
    let keeper = env.actors.keeper.insecure_clone();
    let alice = env.actors.alice.insecure_clone();

    // (a) guarantee registered but REVOKED -> Some(inactive) -> unguaranteed
    let i = ix::keeper_revoke_guarantee(&keeper.pubkey(), &w.student);
    env.send(&[i], &keeper, &[]).expect_ok("revoke");
    let out = open_as(&mut env, &alice, &w, 150 * USDC, Some(pda::guarantee(&w.student).0));
    out.expect_ok("open with inactive guarantee");
    let plan = env.plan(&w.student).unwrap();
    assert!(!plan.with_guarantee, "inactive guarantee cannot select guaranteed track");
    assert_eq!(plan.down_payment, 75 * USDC, "S0 down 50%");

    // (b) a NEW student with an active guarantee who passes the program ID
    //    instead silently gets unguaranteed terms (self-degradation only).
    let stu = new_student(&mut env, 1_000 * USDC);
    let i = ix::keeper_register_guarantee(&keeper.pubkey(), &stu.pubkey(), 1_000 * USDC, 800 * USDC, [0xC1; 32]);
    env.send(&[i], &keeper, &[]).expect_ok("register g2");
    let out = open_as(&mut env, &stu, &w, 150 * USDC, None);
    out.expect_ok("open hiding guarantee");
    let plan = env.plan(&stu.pubkey()).unwrap();
    assert!(!plan.with_guarantee);
    assert_eq!(plan.down_payment, 75 * USDC, "hidden guarantee -> S0 terms, never better");
}

#[test]
fn unguaranteed_track_clamps_tier_above_s1() {
    // A student at reputation tier 3 with NO guarantee buys on S1 terms:
    // the ladder clamps min(tier,1) — a high tier never unlocks more than
    // the unguaranteed table allows. (tier 3 seeded via edit: reaching it
    // takes three full plans and is covered in plan_pay.rs.)
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);
    env.edit_reputation(&w.student, |r| r.tier = 3);

    // price beyond the S1 cap must still fail even at reputation tier 3
    let out = open(&mut env, &w, 301 * USDC);
    expect_cuotas_err(&out, CuotasError::PriceExceedsTierMax, "S1 cap binds at tier 3");

    let q = spec::spec_quote_unguaranteed(300 * USDC, 3);
    assert_eq!(q.down, 90 * USDC, "S1 down 30% regardless of tier 3");
    open(&mut env, &w, 300 * USDC).expect_ok("open at clamped S1");
    let plan = env.plan(&w.student).unwrap();
    assert_eq!(plan.tier, 3, "plan snapshots the reputation tier");
    assert_eq!(plan.down_payment, q.down);
    assert_eq!(plan.financed, q.financed);

    // while the plan is live a second open_plan cannot reuse the PDA:
    // `init` fails on the occupied account — one open plan per student.
    let out = open(&mut env, &w, 100 * USDC);
    expect_instruction_failure(out.expect_err("second open while active"), "plan init");
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

    // coverage: financed of a 950 plan = 665 > coverage_max 700? -> pass at
    // 900-cap boundary; use a coverage_max that binds instead.
    let (mut env2, w2) = credit_env_guaranteed(10_000 * USDC, 2_000 * USDC, 1_000 * USDC, 100 * USDC);
    let out = open(&mut env2, &w2, 200 * USDC);
    expect_cuotas_err(&out, CuotasError::InsufficientGuaranteeCoverage, "financed 140 > coverage 100");

    // unguaranteed cap is the S0 row, not the guarantee's max_purchase
    let (mut env3, w3) = credit_env(10_000 * USDC, 1_000 * USDC);
    let out = open(&mut env3, &w3, 151 * USDC);
    expect_cuotas_err(&out, CuotasError::PriceExceedsTierMax, "S0 cap 150");
}

#[test]
fn open_rejects_late_record_and_invalid_tier() {
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);

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
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);

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
    let build = || ix::open_plan(&w.student, &mint, &w.merchant_wallet, 100 * USDC, g);

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
    let i = ix::open_plan(&attacker.pubkey(), &mint, &w.merchant_wallet, 100 * USDC, None);
    let out = env.send(&[i], &attacker, &[]);
    expect_instruction_failure(out.expect_err("attacker-student mismatch"), "pda seeds");
    assert!(!env.program_account_live(&w.plan_pda));

    // a student with no reputation account cannot open at all
    let ghost = Keypair::new();
    env.svm.airdrop(&ghost.pubkey(), 1_000_000_000).unwrap();
    env.make_ata(&ghost.pubkey(), &{ env.usdc_mint }, 1_000 * USDC);
    let i = ix::open_plan(&ghost.pubkey(), &{ env.usdc_mint }, &w.merchant_wallet, 100 * USDC, None);
    let out = env.send(&[i], &ghost, &[]);
    expect_instruction_failure(out.expect_err("no reputation"), "missing reputation");
}

#[test]
fn open_plan_is_gated_to_normal_state() {
    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);
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
    let (mut env, w) = credit_env(10_000 * USDC, 1_000 * USDC);
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
