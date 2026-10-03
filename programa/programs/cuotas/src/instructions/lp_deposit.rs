use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address_with_program_id;
use anchor_spl::token_interface::{
    mint_to, transfer_checked, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

use crate::constants::{CONFIG_SEED, POOL_SEED, USDC_DECIMALS, VAULT_SEED};
use crate::error::CuotasError;
use crate::events::Deposited;
use crate::state::{Pool, ProtocolConfig, Tranche};

#[derive(Accounts)]
#[instruction(tranche: Tranche)]
pub struct LpDeposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
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
        constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// Pool vault (PDA ["vault", pool]), destination of the deposit.
    #[account(
        mut,
        seeds = [VAULT_SEED, pool.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = pool,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    /// LP mint of the chosen tranche (PDA [tranche seed, pool]). Its live
    /// supply is reconciled with the pool's recorded shares before pricing,
    /// so external burns can never leave a stale NAV denominator.
    #[account(
        mut,
        seeds = [tranche.lp_mint_seed(), pool.key().as_ref()],
        bump,
        mint::authority = pool,
        mint::decimals = USDC_DECIMALS,
        mint::token_program = token_program,
    )]
    pub lp_mint: InterfaceAccount<'info, Mint>,
    /// Depositor USDC source: canonical ATA (depositor, usdc_mint).
    #[account(
        mut,
        token::mint = usdc_mint,
        token::authority = depositor,
        token::token_program = token_program,
        constraint = depositor_usdc_ata.key()
            == get_associated_token_address_with_program_id(
                &depositor.key(),
                &usdc_mint.key(),
                &token_program.key(),
            )
            @ CuotasError::NotCanonicalAta,
    )]
    pub depositor_usdc_ata: InterfaceAccount<'info, TokenAccount>,
    /// Depositor LP destination: canonical ATA (depositor, lp_mint).
    /// Must already exist — clients prepend a createAssociatedTokenAccount
    /// (idempotent) instruction to the same transaction.
    #[account(
        mut,
        token::mint = lp_mint,
        token::authority = depositor,
        token::token_program = token_program,
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

pub fn handle_lp_deposit(ctx: Context<LpDeposit>, tranche: Tranche, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    // Sync recorded shares with live mint supply before pricing: a holder who
    // burned LP tokens outside the program forfeits their NAV claim.
    pool.reconcile_shares(tranche, ctx.accounts.lp_mint.supply)?;
    let shares = Pool::shares_for_deposit(
        pool.tranche_capital(tranche),
        pool.tranche_shares(tranche),
        amount,
    )?;

    transfer_checked(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            TransferChecked {
                from: ctx.accounts.depositor_usdc_ata.to_account_info(),
                mint: ctx.accounts.usdc_mint.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
        ctx.accounts.usdc_mint.decimals,
    )?;

    let pool_signer_seeds: &[&[&[u8]]] = &[&[
        POOL_SEED,
        ctx.accounts.config.usdc_mint.as_ref(),
        &[pool.bump],
    ]];
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.depositor_lp_ata.to_account_info(),
                authority: pool.to_account_info(),
            },
            pool_signer_seeds,
        ),
        shares,
    )?;

    pool.book_deposit(tranche, amount, shares)?;

    emit!(Deposited {
        pool: pool.key(),
        tranche,
        depositor: ctx.accounts.depositor.key(),
        amount,
        shares_minted: shares,
    });
    Ok(())
}
