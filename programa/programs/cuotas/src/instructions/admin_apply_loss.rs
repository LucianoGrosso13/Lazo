use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{CONFIG_SEED, POOL_SEED, VAULT_SEED};
use crate::error::CuotasError;
use crate::events::LossApplied;
use crate::state::{Pool, ProtocolConfig};

/// Admin-only loss administration — the "cash simulation" accounting mode:
/// `amount` USDC is actually moved out of the vault to the treasury ATA and
/// tranche capital is reduced junior-first. `outstanding_credit` is left
/// untouched, so the invariant
/// `vault + outstanding_credit == junior + senior + accrued_fees` holds.
/// If the business decides on a "credit write-off" mode instead (amount must
/// be <= outstanding_credit and the vault stays put), only this handler
/// changes — the waterfall in `Pool::apply_loss` stays the same.
#[derive(Accounts)]
pub struct AdminApplyLoss<'info> {
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CuotasError::NotAdmin,
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        mut,
        seeds = [POOL_SEED, config.usdc_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// Pool vault (PDA ["vault", pool]), source of the loss cash.
    #[account(
        mut,
        seeds = [VAULT_SEED, pool.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = pool,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    /// Treasury USDC ATA (canonical ATA of `config.treasury`), destination of
    /// the loss cash. Must already exist — the admin creates it once.
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = config.treasury,
        constraint = treasury_ata.key()
            == get_associated_token_address_with_program_id(
                &config.treasury,
                &usdc_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub treasury_ata: InterfaceAccount<'info, TokenAccount>,
    /// `Interface` accepts Token or Token-2022; pinned to classic SPL Token.
    #[account(
        constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_admin_apply_loss(ctx: Context<AdminApplyLoss>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let breakdown = pool.apply_loss(amount)?;

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
                to: ctx.accounts.treasury_ata.to_account_info(),
                authority: pool.to_account_info(),
            },
            pool_signer_seeds,
        ),
        amount,
        ctx.accounts.usdc_mint.decimals,
    )?;

    emit!(LossApplied {
        pool: pool.key(),
        amount,
        junior_hit: breakdown.junior_hit,
        senior_hit: breakdown.senior_hit,
    });
    Ok(())
}
