use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{
    CONFIG_SEED, LP_JUNIOR_SEED, LP_SENIOR_SEED, PLAN_SEED, POOL_SEED, REPUTATION_SEED,
    USDC_DECIMALS, VAULT_SEED,
};
use crate::error::CuotasError;
use crate::events::RecoveryRegistered;
use crate::state::{bps_of, Installment, Plan, Pool, ProtocolConfig, Reputation};

/// Keeper-only recovery (any state): after the keeper charges the guarantor's
/// card off-chain (Mobbex sandbox), it deposits the recovered USDC from its
/// own ATA into the vault and records the processor receipt hash in the event.
///
/// Trigger: installment `installment_index` must be the plan's first unpaid
/// installment and past the guarantor charge day
/// (`days_late >= guarantor_charge_day`, day 15). Only plans backed by an
/// active guarantee (`with_guarantee`) can be charged — never unguaranteed
/// ones.
/// - First recovery on a plan charges only the trigger installment.
/// - If the plan already has a charged installment, terms accelerate
///   ("caducan los plazos"): every remaining unresolved installment is charged
///   at once, whatever its due date.
///
/// Unmarked installments past grace get their penalty applied here first, so a
/// missed crank never undercharges the guarantor; accelerated installments not
/// yet past grace are charged without penalty.
///
/// Receipts: `receipt_hash` must be nonzero and fresh for the plan — reuse of
/// a receipt already recorded on any installment is rejected before anything
/// is charged. Every installment resolved here records the receipt.
///
/// Reputation per recovery: `late_count += 1`, tier -1 (floored at 0),
/// `active_exposure` -= principal (`late_count > 0` bars new plans).
/// Pool: `outstanding_credit` -= principal, vault += principal + penalties,
/// LP capital += penalties via `Pool::book_gain`. When nothing remains
/// unresolved the Plan PDA is closed (rent back to the student).
#[derive(Accounts)]
#[instruction(installment_index: u8, receipt_hash: [u8; 32])]
pub struct KeeperRegisterRecovery<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.keeper == keeper.key() @ CuotasError::NotKeeper,
    )]
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
    /// Keeper USDC source: canonical ATA (keeper, usdc_mint). The keeper funds
    /// this from treasury after the off-chain card charge succeeds.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = keeper,
        token::token_program = token_program,
        constraint = keeper_usdc_ata.key()
            == get_associated_token_address_with_program_id(
                &keeper.key(),
                &usdc_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub keeper_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: the borrowing student, PDA seed and rent refund destination.
    #[account(mut)]
    pub student: UncheckedAccount<'info>,
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

pub fn handle_keeper_register_recovery(
    ctx: Context<KeeperRegisterRecovery>,
    installment_index: u8,
    receipt_hash: [u8; 32],
) -> Result<()> {
    let index = installment_index as usize;
    require!(
        index < ctx.accounts.plan.installment_count as usize,
        CuotasError::InvalidInstallmentIndex
    );
    require!(receipt_hash != [0; 32], CuotasError::InvalidReceiptHash);
    require!(
        ctx.accounts.plan.with_guarantee,
        CuotasError::PlanNotGuaranteed
    );
    require!(
        !ctx.accounts.plan.has_receipt(&receipt_hash),
        CuotasError::ReceiptAlreadyUsed
    );
    require!(
        !ctx.accounts.plan.installments[index].resolved(),
        CuotasError::InstallmentAlreadyResolved
    );
    let first_unpaid = ctx
        .accounts
        .plan
        .first_unpaid()
        .ok_or(CuotasError::NothingDue)?;
    require!(index == first_unpaid, CuotasError::StaleInstallmentIndex);

    let now = Clock::get()?.unix_timestamp;
    let trigger_due = ctx.accounts.plan.installments[index].due_at;
    let trigger_late =
        Installment::days_late(now, trigger_due, ctx.accounts.config.seconds_per_day);
    require!(
        trigger_late >= ctx.accounts.config.guarantor_charge_day as i64,
        CuotasError::RecoveryTooEarly
    );

    // Second recovery on the same plan accelerates: charge everything left.
    let accelerated = ctx.accounts.plan.charged_count() > 0;
    let count = ctx.accounts.plan.installment_count as usize;
    let mut charged: Vec<u8> = Vec::with_capacity(count);
    let mut principal: u64 = 0;
    let mut penalties: u64 = 0;

    for (i, inst) in ctx.accounts.plan.installments[..count]
        .iter_mut()
        .enumerate()
    {
        if inst.resolved() {
            continue;
        }
        if !accelerated && i != index {
            continue;
        }
        if !inst.marked_late
            && Installment::days_late(now, inst.due_at, ctx.accounts.config.seconds_per_day)
                > ctx.accounts.config.grace_days as i64
        {
            inst.penalty = bps_of(inst.amount, ctx.accounts.config.penalty_bps)?;
            inst.marked_late = true;
        }
        principal = principal
            .checked_add(inst.amount)
            .ok_or(CuotasError::MathOverflow)?;
        penalties = penalties
            .checked_add(inst.penalty)
            .ok_or(CuotasError::MathOverflow)?;
        inst.charged = true;
        inst.receipt_hash = receipt_hash;
        charged.push(i as u8);
    }
    debug_assert!(!charged.is_empty());
    ctx.accounts.plan.counts = false;

    let total = principal
        .checked_add(penalties)
        .ok_or(CuotasError::MathOverflow)?;

    let pool = &mut ctx.accounts.pool;
    if penalties > 0 {
        pool.reconcile_shares(
            crate::state::Tranche::Junior,
            ctx.accounts.lp_junior_mint.supply,
        )?;
        pool.reconcile_shares(
            crate::state::Tranche::Senior,
            ctx.accounts.lp_senior_mint.supply,
        )?;
        pool.book_gain(penalties)?;
    }
    pool.outstanding_credit = pool
        .outstanding_credit
        .checked_sub(principal)
        .ok_or(CuotasError::MathOverflow)?;

    let reputation = &mut ctx.accounts.reputation;
    reputation.active_exposure = reputation
        .active_exposure
        .checked_sub(principal)
        .ok_or(CuotasError::MathOverflow)?;
    reputation.late_count = reputation
        .late_count
        .checked_add(1)
        .ok_or(CuotasError::MathOverflow)?;
    reputation.tier = reputation.tier.saturating_sub(1);

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.keeper_usdc_ata.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.keeper.to_account_info(),
            },
        ),
        total,
        ctx.accounts.usdc_mint.decimals,
    )?;

    let plan_key = ctx.accounts.plan.key();
    let student_key = ctx.accounts.student.key();
    emit!(RecoveryRegistered {
        plan: plan_key,
        student: student_key,
        charged_indexes: charged,
        principal,
        penalties,
        receipt_hash,
        accelerated,
        new_tier: ctx.accounts.reputation.tier,
        late_count: ctx.accounts.reputation.late_count,
    });

    if ctx.accounts.plan.fully_resolved() {
        ctx.accounts
            .plan
            .close(ctx.accounts.student.to_account_info())?;
    }
    Ok(())
}
