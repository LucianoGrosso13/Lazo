use anchor_lang::prelude::*;

use crate::state::{ProtocolState, Tranche};

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub keeper: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct ConfigUpdated {
    pub admin: Pubkey,
    pub keeper: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct StateChanged {
    pub admin: Pubkey,
    pub state: ProtocolState,
}

#[event]
pub struct PoolInitialized {
    pub pool: Pubkey,
    pub vault: Pubkey,
    pub lp_junior_mint: Pubkey,
    pub lp_senior_mint: Pubkey,
}

#[event]
pub struct Deposited {
    pub pool: Pubkey,
    pub tranche: Tranche,
    pub depositor: Pubkey,
    pub amount: u64,
    pub shares_minted: u64,
}

#[event]
pub struct Withdrawn {
    pub pool: Pubkey,
    pub tranche: Tranche,
    pub depositor: Pubkey,
    pub shares_burned: u64,
    pub amount: u64,
}

#[event]
pub struct LossApplied {
    pub pool: Pubkey,
    pub amount: u64,
    pub junior_hit: u64,
    pub senior_hit: u64,
}

#[event]
pub struct MerchantRegistered {
    pub merchant: Pubkey,
    pub owner: Pubkey,
    pub settlement_ata: Pubkey,
}

#[event]
pub struct ReputationInitialized {
    pub reputation: Pubkey,
    pub student: Pubkey,
}

#[event]
pub struct GuaranteeRegistered {
    pub guarantee: Pubkey,
    pub student: Pubkey,
    pub max_purchase: u64,
    pub coverage_max: u64,
    pub mandate_hash: [u8; 32],
}

#[event]
pub struct GuaranteeUpdated {
    pub guarantee: Pubkey,
    pub student: Pubkey,
    pub max_purchase: u64,
    pub coverage_max: u64,
    pub mandate_hash: [u8; 32],
    pub active: bool,
}

#[event]
pub struct GuaranteeRevoked {
    pub guarantee: Pubkey,
    pub student: Pubkey,
}
