use cuotas::{CuotasError, PayoutSchedule};
use cuotas_tests::credit::credit_env_guaranteed;
use cuotas_tests::env::USDC;
use cuotas_tests::err::expect_cuotas_err;
use cuotas_tests::{ix, pda};
use solana_signer::Signer;

fn open_delayed(days: u8, tranches: u8, amounts: &[u64]) {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let ix_open = ix::open_plan_settlement(
        &w.student,
        &env.usdc_mint,
        &w.merchant_wallet,
        1_000 * USDC,
        3,
        days / 30,
        Some(pda::guarantee(&w.student).0),
    );
    env.send(&[ix_open], &env.actors.alice.insecure_clone(), &[])
        .expect_ok("open delayed");
    let schedule: PayoutSchedule = env.decode(&pda::payout(&w.plan_pda).0);
    assert_eq!(env.token_balance(&w.settlement_ata), 300 * USDC);
    assert_eq!(schedule.tranche_count, tranches);
    assert_eq!(
        schedule.tranches[..tranches as usize]
            .iter()
            .map(|t| t.amount)
            .collect::<Vec<_>>(),
        amounts
    );
    assert_eq!(env.pool().committed_payouts, amounts.iter().sum::<u64>());
    assert_eq!(env.accounting_delta(), 0);
    let plan = env.plan(&w.student).unwrap();
    for (i, tranche) in schedule.tranches[..tranches as usize].iter().enumerate() {
        assert_eq!(
            tranche.release_at,
            plan.opened_at + (i as i64 + 1) * 30 * 60
        );
    }
}

#[test]
fn payout_schedule_amounts_and_dates_for_30_60_90_days() {
    open_delayed(30, 1, &[656_250_000]); // 700 - 6.25%
    open_delayed(60, 2, &[329_875_000, 329_875_000]);
    open_delayed(90, 3, &[221_083_333, 221_083_333, 221_083_334]);
}

#[test]
fn payout_release_is_permissionless_once_at_date_even_if_student_does_not_pay() {
    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let open = ix::open_plan_settlement(
        &w.student,
        &env.usdc_mint,
        &w.merchant_wallet,
        1_000 * USDC,
        3,
        3,
        Some(pda::guarantee(&w.student).0),
    );
    env.send(&[open], &env.actors.alice.insecure_clone(), &[])
        .expect_ok("open 90 day");
    let before = env.token_balance(&w.settlement_ata);
    let too_early = ix::release_payout(
        &env.actors.attacker.pubkey(),
        &env.usdc_mint,
        &w.merchant_wallet,
        &w.plan_pda,
        0,
    );
    expect_cuotas_err(
        &env.send(&[too_early], &env.actors.attacker.insecure_clone(), &[]),
        CuotasError::PayoutTooEarly,
        "payout before release date",
    );
    env.warp_secs(36 * 60);
    let mark_late = ix::crank_mark_late(&env.actors.attacker.pubkey(), &w.student, 0);
    env.send(&[mark_late], &env.actors.attacker.insecure_clone(), &[])
        .expect_ok("student installment marked late");
    assert!(env.plan(&w.student).unwrap().installments[0].marked_late);
    let release = ix::release_payout(
        &env.actors.attacker.pubkey(),
        &env.usdc_mint,
        &w.merchant_wallet,
        &w.plan_pda,
        0,
    );
    env.send(&[release], &env.actors.attacker.insecure_clone(), &[])
        .expect_ok("permissionless release");
    assert_eq!(env.token_balance(&w.settlement_ata) - before, 221_083_333);
    assert_eq!(env.pool().committed_payouts, 442_166_667);
    let again = ix::release_payout(
        &env.actors.attacker.pubkey(),
        &env.usdc_mint,
        &w.merchant_wallet,
        &w.plan_pda,
        0,
    );
    expect_cuotas_err(
        &env.send(&[again], &env.actors.attacker.insecure_clone(), &[]),
        CuotasError::PayoutAlreadyReleased,
        "duplicate payout",
    );
}

#[test]
fn pool_liquidity_reserves_new_payouts_and_blocks_lp_withdrawal() {
    let (mut low_env, low_world) =
        credit_env_guaranteed(650 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let low_open = ix::open_plan_settlement(
        &low_world.student,
        &low_env.usdc_mint,
        &low_world.merchant_wallet,
        1_000 * USDC,
        3,
        0,
        Some(pda::guarantee(&low_world.student).0),
    );
    expect_cuotas_err(
        &low_env.send(&[low_open], &low_env.actors.alice.insecure_clone(), &[]),
        CuotasError::PoolLiquidity,
        "origination liquidity",
    );

    let (mut env, w) = credit_env_guaranteed(10_000 * USDC, 1_000 * USDC, 1_000 * USDC, 700 * USDC);
    let delayed = ix::open_plan_settlement(
        &w.student,
        &env.usdc_mint,
        &w.merchant_wallet,
        1_000 * USDC,
        3,
        3,
        Some(pda::guarantee(&w.student).0),
    );
    env.send(&[delayed], &env.actors.alice.insecure_clone(), &[])
        .expect_ok("open delayed payout");
    let withdraw = ix::lp_withdraw(
        &env.actors.attacker.pubkey(),
        &env.usdc_mint,
        cuotas::Tranche::Junior,
        9_700 * USDC,
    );
    expect_cuotas_err(
        &env.send(&[withdraw], &env.actors.attacker.insecure_clone(), &[]),
        CuotasError::InsufficientLiquidity,
        "withdraw cannot consume payout reserve",
    );
}
