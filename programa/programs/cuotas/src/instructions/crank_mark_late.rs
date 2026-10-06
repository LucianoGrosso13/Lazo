use anchor_lang::prelude::*;

use crate::constants::{CONFIG_SEED, PLAN_SEED};
use crate::error::CuotasError;
use crate::events::InstallmentMarkedLate;
use crate::state::{bps_of, Installment, Plan, ProtocolConfig};

/// Permissionless delinquency crank (any state): once installment `index` is
/// past the grace window (`days_late > grace_days`, i.e. day 6 with the
/// approved 5-day grace), fix its penalty at `penalty_bps` over the amount
/// and permanently disqualify the plan from tier-ups (`counts = false`).
/// The penalty never accrues further ("deja de contar").
///
/// Idempotency is explicit, not silent: already-marked, already-resolved, or
/// not-yet-overdue installments fail so keeper loops can distinguish "done"
/// from "not yet". `pay_installment` and `keeper_register_recovery`
/// auto-apply the same rule, so a missed crank never loses the penalty.
#[derive(Accounts)]
#[instruction(installment_index: u8)]
pub struct CrankMarkLate<'info> {
    /// Anyone can crank; pays only the transaction fee.
    pub crank: Signer<'info>,
    #[account(seeds = [CONFIG_SEED], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: the borrowing student, PDA seed only.
    pub student: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [PLAN_SEED, student.key().as_ref()],
        bump = plan.bump,
    )]
    pub plan: Account<'info, Plan>,
}

pub fn handle_crank_mark_late(ctx: Context<CrankMarkLate>, installment_index: u8) -> Result<()> {
    let index = installment_index as usize;
    require!(
        index < crate::constants::INSTALLMENT_COUNT,
        CuotasError::InvalidInstallmentIndex
    );
    require!(
        !ctx.accounts.plan.installments[index].resolved(),
        CuotasError::InstallmentAlreadyResolved
    );
    require!(
        !ctx.accounts.plan.installments[index].marked_late,
        CuotasError::AlreadyMarkedLate
    );

    let now = Clock::get()?.unix_timestamp;
    let due_at = ctx.accounts.plan.installments[index].due_at;
    let days_late = Installment::days_late(now, due_at, ctx.accounts.config.seconds_per_day);
    require!(
        days_late > ctx.accounts.config.grace_days as i64,
        CuotasError::MarkTooEarly
    );

    let penalty = bps_of(
        ctx.accounts.plan.installments[index].amount,
        ctx.accounts.config.penalty_bps,
    )?;
    ctx.accounts.plan.installments[index].penalty = penalty;
    ctx.accounts.plan.installments[index].marked_late = true;
    ctx.accounts.plan.counts = false;

    emit!(InstallmentMarkedLate {
        plan: ctx.accounts.plan.key(),
        student: ctx.accounts.student.key(),
        index: installment_index,
        penalty,
    });
    Ok(())
}
