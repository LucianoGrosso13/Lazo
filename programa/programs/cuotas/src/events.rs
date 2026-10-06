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

#[event]
pub struct PlanOpened {
    pub plan: Pubkey,
    pub student: Pubkey,
    pub merchant: Pubkey,
    pub price: u64,
    pub down_payment: u64,
    pub financed: u64,
    pub interest: u64,
    pub merchant_fee: u64,
    pub installments: [u64; 3],
    pub tier: u8,
    pub with_guarantee: bool,
    pub counts: bool,
}

#[event]
pub struct InstallmentPaid {
    pub plan: Pubkey,
    pub student: Pubkey,
    pub index: u8,
    pub amount: u64,
    pub penalty: u64,
}

#[event]
pub struct PlanSettled {
    pub plan: Pubkey,
    pub student: Pubkey,
    pub counts: bool,
    pub new_tier: u8,
    pub plans_completed: u32,
}

#[event]
pub struct InstallmentMarkedLate {
    pub plan: Pubkey,
    pub student: Pubkey,
    pub index: u8,
    pub penalty: u64,
}

#[event]
pub struct RecoveryRegistered {
    pub plan: Pubkey,
    pub student: Pubkey,
    pub charged_indexes: Vec<u8>,
    pub principal: u64,
    pub penalties: u64,
    pub receipt_hash: [u8; 32],
    pub accelerated: bool,
    pub new_tier: u8,
    pub late_count: u32,
}
