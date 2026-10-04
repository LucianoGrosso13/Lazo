use anchor_lang::prelude::*;

use crate::constants::CONFIG_SEED;
use crate::error::CuotasError;
use crate::events::StateChanged;
use crate::state::{ProtocolConfig, ProtocolState};

#[derive(Accounts)]
pub struct AdminSetState<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CuotasError::NotAdmin,
    )]
    pub config: Account<'info, ProtocolConfig>,
}

pub fn handle_admin_set_state(ctx: Context<AdminSetState>, state: ProtocolState) -> Result<()> {
    ctx.accounts.config.state = state;
    emit!(StateChanged {
        admin: ctx.accounts.admin.key(),
        state,
    });
    Ok(())
}
