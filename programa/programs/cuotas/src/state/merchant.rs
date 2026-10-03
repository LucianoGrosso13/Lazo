use anchor_lang::prelude::*;

/// A merchant registered by the admin, PDA ["merchant", merchant_wallet].
#[account]
#[derive(InitSpace)]
pub struct Merchant {
    /// The merchant's wallet. Receives the down payment and the pool advance
    /// through its canonical USDC ATA.
    pub owner: Pubkey,
    /// Canonical ATA (owner = owner, mint = ProtocolConfig.usdc_mint) where
    /// plan disbursements land.
    pub settlement_ata: Pubkey,
    pub active: bool,
    /// Number of plans originated through this merchant.
    pub plans_count: u64,
    pub bump: u8,
}
