use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token_interface::{Mint, TokenAccount};

use crate::constants::{CONFIG_SEED, MERCHANT_SEED};
use crate::error::CuotasError;
use crate::events::MerchantRegistered;
use crate::state::{Merchant, ProtocolConfig};

/// Admin-signed merchant onboarding (Normal state only). The merchant wallet
/// does not sign; the settlement ATA is validated as the canonical classic-
/// SPL ATA (merchant_wallet, usdc_mint) — a Token-2022 ATA derives to a
/// different address and is rejected by the canonical check.
#[derive(Accounts)]
pub struct MerchantRegister<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.admin == admin.key() @ CuotasError::NotAdmin,
        constraint = config.state.is_normal() @ CuotasError::ProtocolNotNormal,
    )]
    pub config: Account<'info, ProtocolConfig>,
    /// CHECK: the merchant's wallet. Used only as a PDA seed and stored on-chain.
    pub merchant_wallet: UncheckedAccount<'info>,
    #[account(constraint = usdc_mint.key() == config.usdc_mint @ CuotasError::InvalidUsdcMint)]
    pub usdc_mint: InterfaceAccount<'info, Mint>,
    /// Settlement ATA: canonical ATA (merchant_wallet, usdc_mint).
    #[account(
        token::mint = usdc_mint,
        token::authority = merchant_wallet,
        constraint = settlement_ata.key()
            == get_associated_token_address(&merchant_wallet.key(), &usdc_mint.key())
            @ CuotasError::NotCanonicalAta,
    )]
    pub settlement_ata: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = admin,
        space = 8 + Merchant::INIT_SPACE,
        seeds = [MERCHANT_SEED, merchant_wallet.key().as_ref()],
        bump
    )]
    pub merchant: Account<'info, Merchant>,
    pub system_program: Program<'info, System>,
}

pub fn handle_merchant_register(ctx: Context<MerchantRegister>) -> Result<()> {
    let merchant = &mut ctx.accounts.merchant;
    merchant.owner = ctx.accounts.merchant_wallet.key();
    merchant.settlement_ata = ctx.accounts.settlement_ata.key();
    merchant.active = true;
    merchant.plans_count = 0;
    merchant.bump = ctx.bumps.merchant;

    emit!(MerchantRegistered {
        merchant: merchant.key(),
        owner: merchant.owner,
        settlement_ata: merchant.settlement_ata,
    });
    Ok(())
}
