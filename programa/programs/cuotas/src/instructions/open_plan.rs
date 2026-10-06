use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{
    CONFIG_SEED, GUARANTEE_SEED, LP_JUNIOR_SEED, LP_SENIOR_SEED, MERCHANT_SEED, PLAN_SEED,
    POOL_SEED, REPUTATION_SEED, USDC_DECIMALS, VAULT_SEED,
};
use crate::error::CuotasError;
use crate::events::PlanOpened;
use crate::state::{
    bps_of, due_at, split_installments, Guarantee, Installment, Merchant, Plan, Pool,
    ProtocolConfig, Reputation, TierParams,
};

/// Originate a 3-installment plan (Normal state only). One atomic transaction:
/// the student pays the down payment to the merchant, the pool advances the
/// financed amount minus the merchant fee, and the Plan PDA is created.
///
/// Track selection mirrors the mock: an active `Guarantee` (passed as `Some`)
/// selects the guaranteed tiers at `reputation.tier`; no (or inactive)
/// guarantee selects the unguaranteed tiers at `min(tier, 1)`. Without the
/// `allow-missing-optionals` feature, clients pass the program ID as the
/// `guarantee` account when the student has no guarantee.
///
/// Accounting (all business numbers from `ProtocolConfig`):
/// - `down = price * down_bps`, `financed = price - down`,
///   `interest = financed * interest_bps` (0 in every current tier),
///   `repayable = financed + interest` split into 3 (last absorbs rounding);
/// - `fee = financed * fee_bps`, `advance = financed - fee`;
/// - vault -= advance, `outstanding_credit` += repayable,
///   LP capital += fee + interest via `Pool::book_gain` (interest recognized
///   at origination; a no-op at 0%, keeps `vault + outstanding == capital`
///   exact in every tier configuration);
/// - `reputation.active_exposure` += repayable, `merchant.plans_count` += 1.
///
/// Eligibility: price > 0, price <= tier and guarantor caps, required coverage
/// (`financed * coverage_bps`) <= `coverage_max`, no guarantor charge on record
/// (`reputation.late_count == 0`), no active plan (`init` fails if the PDA
/// exists), merchant active, and the vault must hold the advance.
#[derive(Accounts)]
#[instruction(price: u64)]
pub struct OpenPlan<'info> {
    #[account(mut)]
    pub student: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
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
    /// Live junior LP supply, reconciled before booking the fee gain.
    #[account(
        seeds = [LP_JUNIOR_SEED, pool.key().as_ref()],
        bump,
        mint::authority = pool,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub lp_junior_mint: InterfaceAccount<'info, Mint>,
    /// Live senior LP supply, reconciled before booking the fee gain.
    #[account(
        seeds = [LP_SENIOR_SEED, pool.key().as_ref()],
        bump,
        mint::authority = pool,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub lp_senior_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [MERCHANT_SEED, merchant_wallet.key().as_ref()],
        bump = merchant.bump,
        constraint = merchant.active @ CuotasError::MerchantInactive,
    )]
    pub merchant: Account<'info, Merchant>,
    /// CHECK: merchant wallet, PDA seed and settlement authority.
    pub merchant_wallet: UncheckedAccount<'info>,
    /// Merchant settlement account: must be the canonical ATA recorded at
    /// registration. Receives down payment + pool advance.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = merchant_wallet,
        token::token_program = token_program,
        constraint = settlement_ata.key() == merchant.settlement_ata
            @ CuotasError::TokenAccountMismatch,
    )]
    pub settlement_ata: InterfaceAccount<'info, TokenAccount>,
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
    /// The student's guarantee, if the keeper registered one. Pass the
    /// program ID when the student has no guarantee (no `init` here: only the
    /// keeper creates guarantees, and only in Normal state).
    #[account(
        seeds = [GUARANTEE_SEED, student.key().as_ref()],
        bump = guarantee.bump,
    )]
    pub guarantee: Option<Account<'info, Guarantee>>,
    #[account(
        init,
        payer = student,
        space = 8 + Plan::INIT_SPACE,
        seeds = [PLAN_SEED, student.key().as_ref()],
        bump
    )]
    pub plan: Account<'info, Plan>,
    /// `Interface` accepts Token or Token-2022; pinned to classic SPL Token.
    #[account(
        constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_open_plan(ctx: Context<OpenPlan>, price: u64) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(price > 0, CuotasError::InvalidPrice);
    require!(
        ctx.accounts.reputation.late_count == 0,
        CuotasError::BlockedFromNewPlans
    );
    require!(
        ctx.accounts.reputation.tier <= 3,
        CuotasError::InvalidReputationTier
    );

    let with_guarantee = ctx.accounts.guarantee.as_ref().is_some_and(|g| g.active);
    let tier: TierParams = if with_guarantee {
        config.guaranteed_tiers[ctx.accounts.reputation.tier as usize]
    } else {
        let idx = ctx.accounts.reputation.tier.min(1) as usize;
        config.unguaranteed_tiers[idx]
    };
    require!(price <= tier.max_purchase, CuotasError::PriceExceedsTierMax);

    let down_payment = bps_of(price, tier.down_payment_bps)?;
    let financed = price
        .checked_sub(down_payment)
        .ok_or(CuotasError::MathOverflow)?;
    require!(financed > 0, CuotasError::InvalidPrice);
    let interest = bps_of(financed, tier.interest_bps)?;
    let repayable = financed
        .checked_add(interest)
        .ok_or(CuotasError::MathOverflow)?;
    let merchant_fee = bps_of(financed, config.fee_bps)?;
    let advance = financed
        .checked_sub(merchant_fee)
        .ok_or(CuotasError::MathOverflow)?;

    if with_guarantee {
        let guarantee = ctx.accounts.guarantee.as_ref().unwrap();
        require!(
            price <= guarantee.max_purchase,
            CuotasError::PriceExceedsGuarantorMax
        );
        let required_coverage = bps_of(financed, tier.guarantor_coverage_bps)?;
        require!(
            required_coverage <= guarantee.coverage_max,
            CuotasError::InsufficientGuaranteeCoverage
        );
    }

    require!(
        advance <= ctx.accounts.vault.amount,
        CuotasError::InsufficientLiquidity
    );

    let opened_at = Clock::get()?.unix_timestamp;
    let amounts = split_installments(repayable);
    let mut installments = [Installment {
        amount: 0,
        due_at: 0,
        penalty: 0,
        paid: false,
        charged: false,
        marked_late: false,
        receipt_hash: [0; 32],
    }; 3];
    for (i, slot) in installments.iter_mut().enumerate() {
        slot.amount = amounts[i];
        slot.due_at = due_at(
            opened_at,
            i,
            config.installment_interval_days,
            config.seconds_per_day,
        )?;
    }

    // Effects before interactions: book pool + reputation state first so a
    // failed transfer rolls everything back together.
    let pool = &mut ctx.accounts.pool;
    let gain = merchant_fee
        .checked_add(interest)
        .ok_or(CuotasError::MathOverflow)?;
    if gain > 0 {
        pool.reconcile_shares(
            crate::state::Tranche::Junior,
            ctx.accounts.lp_junior_mint.supply,
        )?;
        pool.reconcile_shares(
            crate::state::Tranche::Senior,
            ctx.accounts.lp_senior_mint.supply,
        )?;
        pool.book_gain(gain)?;
    }
    pool.outstanding_credit = pool
        .outstanding_credit
        .checked_add(repayable)
        .ok_or(CuotasError::MathOverflow)?;

    let reputation = &mut ctx.accounts.reputation;
    reputation.active_exposure = reputation
        .active_exposure
        .checked_add(repayable)
        .ok_or(CuotasError::MathOverflow)?;
    // Generation discriminator: bumped BEFORE the plan is stamped so two
    // plans that reuse this PDA never share a generation — not even when
    // their `opened_at` lands on the same unix second.
    reputation.plans_opened = reputation
        .plans_opened
        .checked_add(1)
        .ok_or(CuotasError::MathOverflow)?;

    let merchant = &mut ctx.accounts.merchant;
    merchant.plans_count = merchant
        .plans_count
        .checked_add(1)
        .ok_or(CuotasError::MathOverflow)?;

    if down_payment > 0 {
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.student_usdc_ata.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.settlement_ata.to_account_info(),
                    authority: ctx.accounts.student.to_account_info(),
                },
            ),
            down_payment,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }
    if advance > 0 {
        let pool_signer_seeds: &[&[&[u8]]] = &[&[
            POOL_SEED,
            ctx.accounts.config.usdc_mint.as_ref(),
            &[pool.bump],
        ]];
        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                TransferChecked {
                    from: ctx.accounts.vault.to_account_info(),
                    mint: ctx.accounts.usdc_mint.to_account_info(),
                    to: ctx.accounts.settlement_ata.to_account_info(),
                    authority: pool.to_account_info(),
                },
                pool_signer_seeds,
            ),
            advance,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    let counts = financed >= config.min_financed_to_count;
    let plan = &mut ctx.accounts.plan;
    plan.student = ctx.accounts.student.key();
    plan.merchant = ctx.accounts.merchant_wallet.key();
    plan.price = price;
    plan.down_payment = down_payment;
    plan.financed = financed;
    plan.interest = interest;
    plan.merchant_fee = merchant_fee;
    plan.opened_at = opened_at;
    plan.tier = ctx.accounts.reputation.tier;
    plan.with_guarantee = with_guarantee;
    plan.counts = counts;
    plan.installments = installments;
    plan.generation = ctx.accounts.reputation.plans_opened;
    plan.bump = ctx.bumps.plan;

    emit!(PlanOpened {
        plan: plan.key(),
        student: plan.student,
        merchant: plan.merchant,
        price,
        down_payment,
        financed,
        interest,
        merchant_fee,
        installments: amounts,
        tier: plan.tier,
        with_guarantee,
        counts,
    });
    Ok(())
}
