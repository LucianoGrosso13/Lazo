use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{
    CONFIG_SEED, INSTALLMENT_COUNT, LP_JUNIOR_SEED, LP_SENIOR_SEED, PLAN_SEED, POOL_SEED,
    REPUTATION_SEED, USDC_DECIMALS, VAULT_SEED,
};
use crate::error::CuotasError;
use crate::events::{InstallmentPaid, PlanSettled};
use crate::state::{bps_of, Installment, Plan, Pool, ProtocolConfig, Reputation};

/// The student pays the first unresolved installment (principal + penalty, if
/// the installment is past grace). Pays in order: a later installment cannot
/// be paid while an earlier one is unresolved.
///
/// Replay protection: the caller passes the `expected_installment_index` and
/// `expected_opened_at` it quoted, and the handler rejects anything else. A
/// duplicate approval for an already-paid installment fails instead of
/// auto-advancing into the next one, and a stale quote for a previous plan
/// (same PDA, new `opened_at`) fails instead of paying the new plan.
///
/// Self-sufficient: if the installment is past grace and was never marked,
/// the penalty is applied here (same math as `crank_mark_late`) so the crank
/// is an optimization, not a prerequisite. Allowed in every protocol state:
/// repayments only reduce risk.
///
/// Accounting: vault += amount + penalty, `outstanding_credit` -= amount,
/// LP capital += penalty via `Pool::book_gain`, `active_exposure` -= amount.
///
/// Full settlement closes the Plan PDA (rent back to the student) and, when
/// the plan counts (financed >= min AND never past grace), bumps
/// `plans_completed` and the tier: guaranteed plans tier up to 3,
/// unguaranteed ones cap at S1. A plan with a guarantor-charged installment
/// never counts (it was past grace before the charge).
#[derive(Accounts)]
pub struct PayInstallment<'info> {
    #[account(mut)]
    pub student: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [POOL_SEED, config.usdc_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
        mut,
        seeds = [VAULT_SEED, pool.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = pool,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// Live junior LP supply, reconciled before booking a penalty gain.
    #[account(
        seeds = [LP_JUNIOR_SEED, pool.key().as_ref()],
        bump,
        mint::authority = pool,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub lp_junior_mint: InterfaceAccount<'info, Mint>,
    /// Live senior LP supply, reconciled before booking a penalty gain.
    #[account(
        seeds = [LP_SENIOR_SEED, pool.key().as_ref()],
        bump,
        mint::authority = pool,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub lp_senior_mint: InterfaceAccount<'info, Mint>,
    /// Student USDC source: canonical ATA (student, usdc_mint).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = student,
        token::token_program = token_program,
        constraint = student_usdc_ata.key()
            == get_associated_token_address_with_program_id(
                &student.key(),
                &usdc_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub student_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [REPUTATION_SEED, student.key().as_ref()],
        bump = reputation.bump,
    )]
    pub reputation: Account<'info, Reputation>,
    #[account(
        mut,
        seeds = [PLAN_SEED, student.key().as_ref()],
        bump = plan.bump,
    )]
    pub plan: Account<'info, Plan>,
    /// `Interface` accepts Token or Token-2022; pinned to classic SPL Token.
    #[account(
        constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_pay_installment(
    ctx: Context<PayInstallment>,
    expected_installment_index: u8,
    expected_opened_at: i64,
) -> Result<()> {
    let expected = expected_installment_index as usize;
    require!(
        expected < INSTALLMENT_COUNT,
        CuotasError::InvalidInstallmentIndex
    );
    require!(
        ctx.accounts.plan.opened_at == expected_opened_at,
        CuotasError::StalePlan
    );
    let index = ctx
        .accounts
        .plan
        .first_unpaid()
        .ok_or(CuotasError::NothingDue)?;
    require!(
        !ctx.accounts.plan.installments[expected].resolved(),
        CuotasError::InstallmentAlreadyResolved
    );
    require!(expected == index, CuotasError::StaleInstallmentIndex);

    let now = Clock::get()?.unix_timestamp;

    // Auto-mark past grace so the penalty is collected even if the crank never
    // ran. Same rule as crank_mark_late: days_late > grace_days.
    let due_at = ctx.accounts.plan.installments[index].due_at;
    let days_late = Installment::days_late(now, due_at, ctx.accounts.config.seconds_per_day);
    if days_late > ctx.accounts.config.grace_days as i64
        && !ctx.accounts.plan.installments[index].marked_late
    {
        let penalty = bps_of(
            ctx.accounts.plan.installments[index].amount,
            ctx.accounts.config.penalty_bps,
        )?;
        ctx.accounts.plan.installments[index].penalty = penalty;
        ctx.accounts.plan.installments[index].marked_late = true;
        ctx.accounts.plan.counts = false;
    }

    let amount = ctx.accounts.plan.installments[index].amount;
    let penalty = ctx.accounts.plan.installments[index].penalty;
    let total = amount
        .checked_add(penalty)
        .ok_or(CuotasError::MathOverflow)?;

    let pool = &mut ctx.accounts.pool;
    if penalty > 0 {
        pool.reconcile_shares(
            crate::state::Tranche::Junior,
            ctx.accounts.lp_junior_mint.supply,
        )?;
        pool.reconcile_shares(
            crate::state::Tranche::Senior,
            ctx.accounts.lp_senior_mint.supply,
        )?;
        pool.book_gain(penalty)?;
    }
    pool.outstanding_credit = pool
        .outstanding_credit
        .checked_sub(amount)
        .ok_or(CuotasError::MathOverflow)?;

    let reputation = &mut ctx.accounts.reputation;
    reputation.active_exposure = reputation
        .active_exposure
        .checked_sub(amount)
        .ok_or(CuotasError::MathOverflow)?;

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.student_usdc_ata.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.student.to_account_info(),
            },
        ),
        total,
        ctx.accounts.usdc_mint.decimals,
    )?;

    ctx.accounts.plan.installments[index].paid = true;
    let plan_key = ctx.accounts.plan.key();
    let student_key = ctx.accounts.student.key();

    emit!(InstallmentPaid {
        plan: plan_key,
        student: student_key,
        index: index as u8,
        amount,
        penalty,
    });

    if ctx.accounts.plan.fully_resolved() {
        let counts = ctx.accounts.plan.counts;
        let with_guarantee = ctx.accounts.plan.with_guarantee;
        let reputation = &mut ctx.accounts.reputation;
        if counts {
            reputation.plans_completed = reputation
                .plans_completed
                .checked_add(1)
                .ok_or(CuotasError::MathOverflow)?;
            let cap = if with_guarantee { 3 } else { 1 };
            if reputation.tier < cap {
                reputation.tier = reputation.tier.saturating_add(1).min(cap);
            }
        }
        emit!(PlanSettled {
            plan: plan_key,
            student: student_key,
            counts,
            new_tier: ctx.accounts.reputation.tier,
            plans_completed: ctx.accounts.reputation.plans_completed,
        });
        ctx.accounts
            .plan
            .close(ctx.accounts.student.to_account_info())?;
    }
    Ok(())
}
