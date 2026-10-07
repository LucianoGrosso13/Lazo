use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{MERCHANT_SEED, PAYOUT_SEED, POOL_SEED, USDC_DECIMALS, VAULT_SEED};
use crate::error::CuotasError;
use crate::events::PayoutReleased;
use crate::state::{Merchant, PayoutSchedule, Pool, ProtocolConfig};

#[derive(Accounts)]
#[instruction(index: u8)]
pub struct ReleasePayout<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut, seeds = [POOL_SEED, config.usdc_mint.as_ref()], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut, seeds = [VAULT_SEED, pool.key().as_ref()], bump, token::mint = usdc_mint, token::authority = pool, token::token_program = token_program)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint, mint::decimals = USDC_DECIMALS, mint::token_program = token_program)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: bound to the schedule merchant and its registered ATA.
    pub merchant_wallet: UncheckedAccount<'info>,
    #[account(seeds = [MERCHANT_SEED, merchant_wallet.key().as_ref()], bump = merchant.bump, constraint = merchant.active @ CuotasError::MerchantInactive)]
    pub merchant: Account<'info, Merchant>,
    #[account(mut, seeds = [PAYOUT_SEED, schedule.plan.as_ref()], bump = schedule.bump, constraint = schedule.merchant == merchant_wallet.key() @ CuotasError::TokenAccountMismatch)]
    pub schedule: Account<'info, PayoutSchedule>,
    #[account(mut, token::mint = usdc_mint, token::authority = merchant_wallet, token::token_program = token_program, constraint = merchant_ata.key() == merchant.settlement_ata @ CuotasError::TokenAccountMismatch)]
    pub merchant_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram)]
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_release_payout(ctx: Context<ReleasePayout>, index: u8) -> Result<()> {
    let tranche = ctx
        .accounts
        .schedule
        .tranches
        .get(index as usize)
        .ok_or(CuotasError::InvalidPayoutIndex)?;
    require!(
        index < ctx.accounts.schedule.tranche_count,
        CuotasError::InvalidPayoutIndex
    );
    require!(!tranche.released, CuotasError::PayoutAlreadyReleased);
    require!(
        Clock::get()?.unix_timestamp >= tranche.release_at,
        CuotasError::PayoutTooEarly
    );
    let amount = tranche.amount;
    let bump = ctx.accounts.pool.bump;
    let mint = ctx.accounts.config.usdc_mint;
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.vault.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.merchant_ata.to_account_info(),
                authority: ctx.accounts.pool.to_account_info(),
            },
            &[&[POOL_SEED, mint.as_ref(), &[bump]]],
        ),
        amount,
        ctx.accounts.usdc_mint.decimals,
    )?;
    ctx.accounts.schedule.tranches[index as usize].released = true;
    ctx.accounts.pool.committed_payouts = ctx
        .accounts
        .pool
        .committed_payouts
        .checked_sub(amount)
        .ok_or(CuotasError::MathOverflow)?;
    emit!(PayoutReleased {
        schedule: ctx.accounts.schedule.key(),
        plan: ctx.accounts.schedule.plan,
        merchant: ctx.accounts.schedule.merchant,
        index,
        amount
    });
    if ctx.accounts.schedule.tranches[..ctx.accounts.schedule.tranche_count as usize]
        .iter()
        .all(|tranche| tranche.released)
    {
        ctx.accounts
            .schedule
            .close(ctx.accounts.caller.to_account_info())?;
    }
    Ok(())
}
