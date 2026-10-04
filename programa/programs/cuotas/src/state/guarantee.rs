use anchor_lang::prelude::*;

/// Guarantor backing for one student, PDA ["guarantee", student_wallet].
/// The guarantor has no wallet: only the protocol `keeper` creates and
/// mutates this account, after off-chain KYC + a signed surety (fianza).
/// The account is never closed, so it can never be re-created by anyone.
#[account]
#[derive(InitSpace)]
pub struct Guarantee {
    /// Maximum purchase price the guarantor chose to back, USDC base units.
    pub max_purchase: u64,
    /// Maximum surety amount (art. 1578 CCyC), computed off-chain, USDC base units.
    pub coverage_max: u64,
    /// SHA-256 of the signed surety PDF.
    pub mandate_hash: [u8; 32],
    /// Whether this guarantee currently backs new purchases.
    pub active: bool,
    /// Unix timestamp of registration / last update.
    pub registered_at: i64,
    pub bump: u8,
}
