use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    burn, transfer_checked, Burn, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{CONFIG_SEED, POOL_SEED, VAULT_SEED};
use crate::error::CuotasError;
use crate::events::Withdrawn;
use crate::state::{Pool, ProtocolConfig, Tranche};

#[derive(Accounts)]
#[instruction(tranche: Tranche)]
pub struct LpWithdraw<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.state.allows_withdrawals() @ CuotasError::ProtocolHalted,
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
    /// Pool vault (PDA ["vault", pool]), source of the withdrawal.
    #[account(
        mut,
        seeds = [VAULT_SEED, pool.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = pool,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    /// LP mint of the chosen tranche (PDA [tranche seed, pool]). Its live
    /// supply is reconciled with the pool's recorded shares before pricing.
    #[account(
        mut,
        seeds = [tranche.lp_mint_seed(), pool.key().as_ref()],
        bump,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    /// Depositor USDC destination: canonical ATA (depositor, usdc_mint).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = depositor,
        constraint = depositor_usdc_ata.key()
            == get_associated_token_address_with_program_id(
                &depositor.key(),
                &usdc_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub depositor_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    /// Depositor LP source: canonical ATA (depositor, lp_mint).
    #[account(
        mut,
        token::mint = lp_mint,
        token::authority = depositor,
        constraint = depositor_lp_ata.key()
            == get_associated_token_address_with_program_id(
                &depositor.key(),
                &lp_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub depositor_lp_ata: InterfaceAccount<'info, TokenAccount>,
    /// `Interface` accepts Token or Token-2022; pinned to classic SPL Token.
    #[account(
        constraint = token_program.key() == anchor_spl::token::ID @ CuotasError::InvalidTokenProgram
    )]
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn handle_lp_withdraw(ctx: Context<LpWithdraw>, tranche: Tranche, shares: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    // Sync recorded shares with live mint supply before pricing.
    pool.reconcile_shares(tranche, ctx.accounts.lp_mint.supply)?;
    let amount = Pool::amount_for_withdraw(
        pool.tranche_capital(tranche),
        pool.tranche_shares(tranche),
        shares,
    )?;

    // LPs can only withdraw vault liquidity that is not owed to the treasury.
    // Zero-amount withdrawals are allowed so holders can retire worthless or
    // dust shares — that is how a wiped tranche gets back to a clean slate.
    let available = ctx
        .accounts
        .vault
        .amount
        .checked_sub(pool.accrued_fees)
        .ok_or(CuotasError::MathOverflow)?;
    require!(amount <= available, CuotasError::InsufficientLiquidity);

    burn(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.depositor_lp_ata.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        shares,
    )?;

    if amount > 0 {
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
                    to: ctx.accounts.depositor_usdc_ata.to_account_info(),
                    authority: pool.to_account_info(),
                },
                pool_signer_seeds,
            ),
            amount,
            ctx.accounts.usdc_mint.decimals,
        )?;
    }

    pool.book_withdraw(tranche, amount, shares)?;

    emit!(Withdrawn {
        pool: pool.key(),
        tranche,
        depositor: ctx.accounts.depositor.key(),
        shares_burned: shares,
        amount,
    });
    Ok(())
}
