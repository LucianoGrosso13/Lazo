use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

use crate::constants::{CONFIG_SEED, USDC_DECIMALS};
use crate::error::CuotasError;
use crate::events::{ConfigInitialized, ConfigUpdated};
use crate::state::{ConfigParams, ProtocolConfig, ProtocolState};

/// One-time bootstrap. The config is a singleton PDA, so the first signer to
/// run it would otherwise capture the admin role: we require the signer to be
/// the program's upgrade authority, proven through the program -> ProgramData
/// relationship. To change the bootstrap admin later, change the upgrade
/// authority of the deployed program before running init.
#[derive(Accounts)]
pub struct AdminInitConfig<'info> {
    /// The signer's key is stored as `config.admin`. Must be the program's
    /// upgrade authority and pays rent for the config PDA.
    #[account(mut)]
    pub admin: Signer<'info>,
    /// The cuotas program account itself (executable, owned by the
    /// upgradeable loader). Its `programdata_address` must resolve to the
    /// `program_data` account passed alongside.
    pub program: Program<'info, crate::program::Cuotas>,
    /// ProgramData whose `upgrade_authority_address` must be the signer.
    #[account(
        constraint = program.programdata_address()? == Some(program_data.key())
            @ CuotasError::NotUpgradeAuthority,
        constraint = program_data.upgrade_authority_address == Some(admin.key())
            @ CuotasError::NotUpgradeAuthority,
    )]
    pub program_data: Account<'info, ProgramData>,
    #[account(
        init,
        payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// The devUSDC mint (classic SPL Token, 6 decimals). Stored and immutable.
    /// `InterfaceAccount` deserializes mints owned by either token program;
    /// the explicit owner check pins it to classic SPL Token.
    #[account(
        constraint = usdc_mint.decimals == USDC_DECIMALS @ CuotasError::InvalidMintDecimals,
        constraint = usdc_mint.to_account_info().owner == &anchor_spl::token::ID
            @ CuotasError::InvalidTokenProgram,
    )]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

pub fn handle_admin_init_config(ctx: Context<AdminInitConfig>, params: ConfigParams) -> Result<()> {
    params.validate()?;

    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.keeper = params.keeper;
    config.usdc_mint = ctx.accounts.usdc_mint.key();
    config.treasury = params.treasury;
    config.fee_bps = params.fee_bps;
    config.penalty_bps = params.penalty_bps;
    config.grace_days = params.grace_days;
    config.guarantor_charge_day = params.guarantor_charge_day;
    config.guarantor_notice_day = params.guarantor_notice_day;
    config.seconds_per_day = params.seconds_per_day;
    config.installment_interval_days = params.installment_interval_days;
    config.min_financed_to_count = params.min_financed_to_count;
    config.guaranteed_tiers = params.guaranteed_tiers;
    config.unguaranteed_tiers = params.unguaranteed_tiers;
    config.state = ProtocolState::Normal;
    config.bump = ctx.bumps.config;

    emit!(ConfigInitialized {
        admin: config.admin,
        keeper: config.keeper,
        usdc_mint: config.usdc_mint,
        treasury: config.treasury,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct AdminUpdateConfig<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CuotasError::NotAdmin,
    )]
    pub config: Account<'info, ProtocolConfig>,
}

pub fn handle_admin_update_config(
    ctx: Context<AdminUpdateConfig>,
    params: ConfigParams,
) -> Result<()> {
    params.validate()?;

    let config = &mut ctx.accounts.config;
    config.keeper = params.keeper;
    config.treasury = params.treasury;
    config.fee_bps = params.fee_bps;
    config.penalty_bps = params.penalty_bps;
    config.grace_days = params.grace_days;
    config.guarantor_charge_day = params.guarantor_charge_day;
    config.guarantor_notice_day = params.guarantor_notice_day;
    config.seconds_per_day = params.seconds_per_day;
    config.installment_interval_days = params.installment_interval_days;
    config.min_financed_to_count = params.min_financed_to_count;
    config.guaranteed_tiers = params.guaranteed_tiers;
    config.unguaranteed_tiers = params.unguaranteed_tiers;
    // admin, usdc_mint, state and bump are immutable here by design.

    emit!(ConfigUpdated {
        admin: config.admin,
        keeper: config.keeper,
        treasury: config.treasury,
    });
    Ok(())
}
