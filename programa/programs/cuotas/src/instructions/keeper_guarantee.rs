use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, GUARANTEE_SEED, REPUTATION_SEED};
use crate::error::CuotasError;
use crate::events::{GuaranteeRegistered, GuaranteeRevoked, GuaranteeUpdated};
use crate::state::{Guarantee, ProtocolConfig, Reputation};

fn validate_guarantee_params(
    max_purchase: u64,
    coverage_max: u64,
    mandate_hash: &[u8; 32],
) -> Result<()> {
    require!(
        max_purchase > 0 && coverage_max > 0 && mandate_hash != &[0u8; 32],
        CuotasError::InvalidGuaranteeParams
    );
    Ok(())
}

/// The keeper registers a guarantee after off-chain KYC + signed surety.
/// Gated to Normal state: a guarantee only exists to back new origination.
/// `init` makes a second registration on the same student impossible.
#[derive(Accounts)]
pub struct KeeperRegisterGuarantee<'info> {
    #[account(mut)]
    pub keeper: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.keeper == keeper.key() @ CuotasError::NotKeeper,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: the backed student's wallet. Seed only; the student does not sign.
    pub student: UncheckedAccount<'info>,
    #[account(
        init,
        payer = keeper,
        space = 8 + Guarantee::INIT_SPACE,
        seeds = [GUARANTEE_SEED, student.key().as_ref()],
        bump
    )]
    pub guarantee: Account<'info, Guarantee>,
    pub system_program: Program<'info, System>,
}

pub fn handle_keeper_register_guarantee(
    ctx: Context<KeeperRegisterGuarantee>,
    max_purchase: u64,
    coverage_max: u64,
    mandate_hash: [u8; 32],
) -> Result<()> {
    validate_guarantee_params(max_purchase, coverage_max, &mandate_hash)?;

    let guarantee = &mut ctx.accounts.guarantee;
    guarantee.max_purchase = max_purchase;
    guarantee.coverage_max = coverage_max;
    guarantee.mandate_hash = mandate_hash;
    guarantee.active = true;
    guarantee.registered_at = Clock::get()?.unix_timestamp;
    guarantee.bump = ctx.bumps.guarantee;

    emit!(GuaranteeRegistered {
        guarantee: guarantee.key(),
        student: ctx.accounts.student.key(),
        max_purchase,
        coverage_max,
        mandate_hash,
    });
    Ok(())
}

/// The keeper rewrites guarantee terms (new surety / new cap). This is also
/// the only way back from a revocation: it re-activates the guarantee with a
/// fresh mandate hash and timestamp. The PDA is never closed or re-created.
/// Gated to Normal like register: rewriting terms (including re-activation)
/// changes backing capacity, so it waits for the protocol to un-pause.
/// Revocation, by contrast, stays available in every state.
#[derive(Accounts)]
pub struct KeeperUpdateGuarantee<'info> {
    pub keeper: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.keeper == keeper.key() @ CuotasError::NotKeeper,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: the backed student's wallet. Seed only.
    pub student: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [GUARANTEE_SEED, student.key().as_ref()],
        bump = guarantee.bump,
    )]
    pub guarantee: Account<'info, Guarantee>,
    /// The student's reputation, bound by seeds to the same student. Rewriting
    /// terms while the student has credit outstanding is rejected: a live
    /// contract cannot be altered underneath an active plan.
    #[account(
        seeds = [REPUTATION_SEED, student.key().as_ref()],
        bump = reputation.bump,
        constraint = reputation.active_exposure == 0 @ CuotasError::GuaranteeTermsLocked,
    )]
    pub reputation: Account<'info, Reputation>,
}

pub fn handle_keeper_update_guarantee(
    ctx: Context<KeeperUpdateGuarantee>,
    max_purchase: u64,
    coverage_max: u64,
    mandate_hash: [u8; 32],
) -> Result<()> {
    validate_guarantee_params(max_purchase, coverage_max, &mandate_hash)?;
    require!(
        mandate_hash != ctx.accounts.guarantee.mandate_hash,
        CuotasError::MandateHashUnchanged
    );

    let guarantee = &mut ctx.accounts.guarantee;
    guarantee.max_purchase = max_purchase;
    guarantee.coverage_max = coverage_max;
    guarantee.mandate_hash = mandate_hash;
    guarantee.active = true;
    guarantee.registered_at = Clock::get()?.unix_timestamp;

    emit!(GuaranteeUpdated {
        guarantee: guarantee.key(),
        student: ctx.accounts.student.key(),
        max_purchase,
        coverage_max,
        mandate_hash,
        active: guarantee.active,
    });
    Ok(())
}

/// The keeper revokes a guarantee (e.g. guarantor pulled out or card failed).
/// Sets active = false; the account stays so history and the mandate hash
/// remain auditable and the guarantee cannot be recreated by anyone.
#[derive(Accounts)]
pub struct KeeperRevokeGuarantee<'info> {
    pub keeper: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.keeper == keeper.key() @ CuotasError::NotKeeper,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: the backed student's wallet. Seed only.
    pub student: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [GUARANTEE_SEED, student.key().as_ref()],
        bump = guarantee.bump,
    )]
    pub guarantee: Account<'info, Guarantee>,
}

pub fn handle_keeper_revoke_guarantee(ctx: Context<KeeperRevokeGuarantee>) -> Result<()> {
    ctx.accounts.guarantee.active = false;

    emit!(GuaranteeRevoked {
        guarantee: ctx.accounts.guarantee.key(),
        student: ctx.accounts.student.key(),
    });
    Ok(())
}
