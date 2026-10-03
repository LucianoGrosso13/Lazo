use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::constants::{
    CONFIG_SEED, LP_JUNIOR_SEED, LP_SENIOR_SEED, POOL_SEED, USDC_DECIMALS, VAULT_SEED,
};
use crate::error::CuotasError;
use crate::events::PoolInitialized;
use crate::state::{Pool, ProtocolConfig};

/// One-time pool bootstrap (admin, Normal state only). Creates the Pool PDA,
/// its USDC vault and the two LP mints (junior and senior), all as PDAs with
/// the Pool as token authority.
#[derive(Accounts)]
pub struct PoolInit<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CuotasError::NotAdmin,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// devUSDC is bound to the classic SPL Token program at config init; the
    /// token_program constraint below keeps every account on the same program.
    #[account(constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED, usdc_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    /// Pool USDC vault, PDA ["vault", pool], authority = pool.
    #[account(
        init,
        payer = admin,
        token::mint = usdc_mint,
        token::authority = pool,
        seeds = [VAULT_SEED, pool.key().as_ref()],
        bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    /// Junior LP mint, PDA ["lp_junior", pool], mint authority = pool.
    #[account(
        init,
        payer = admin,
        mint::decimals = USDC_DECIMALS,
        mint::authority = pool,
        seeds = [LP_JUNIOR_SEED, pool.key().as_ref()],
        bump
    )]
    pub lp_junior_mint: InterfaceAccount<'info, Mint>,
    /// Senior LP mint, PDA ["lp_senior", pool], mint authority = pool.
    #[account(
        init,
        payer = admin,
        mint::decimals = USDC_DECIMALS,
        mint::authority = pool,
        seeds = [LP_SENIOR_SEED, pool.key().as_ref()],
        bump
    )]
    pub lp_senior_mint: InterfaceAccount<'info, Mint>,
    /// `Interface` accepts Token or Token-2022; pinned to classic SPL Token.
    #[account(
        constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle_pool_init(ctx: Context<PoolInit>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.junior_shares = 0;
    pool.senior_shares = 0;
    pool.junior_capital = 0;
    pool.senior_capital = 0;
    pool.outstanding_credit = 0;
    pool.accrued_fees = 0;
    pool.bump = ctx.bumps.pool;

    emit!(PoolInitialized {
        pool: pool.key(),
        vault: ctx.accounts.vault.key(),
        lp_junior_mint: ctx.accounts.lp_junior_mint.key(),
        lp_senior_mint: ctx.accounts.lp_senior_mint.key(),
    });
    Ok(())
}
