use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, REPUTATION_SEED};
use crate::error::CuotasError;
use crate::events::ReputationInitialized;
use crate::state::{ProtocolConfig, Reputation};

/// The student initializes their own reputation account (tier 0).
/// Gated to Normal state: no new user lifecycle while the protocol is paused.
#[derive(Accounts)]
pub struct StudentInitReputation<'info> {
    #[account(mut)]
    pub student: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(
        init,
        payer = student,
        space = 8 + Reputation::INIT_SPACE,
        seeds = [REPUTATION_SEED, student.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, Reputation>,
    pub system_program: Program<'info, System>,
}

pub fn handle_student_init_reputation(ctx: Context<StudentInitReputation>) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;
    reputation.tier = 0;
    reputation.plans_completed = 0;
    reputation.late_count = 0;
    reputation.active_exposure = 0;
    reputation.plans_opened = 0;
    reputation.bump = ctx.bumps.reputation;

    emit!(ReputationInitialized {
        reputation: reputation.key(),
        student: ctx.accounts.student.key(),
    });
    Ok(())
}
