use anchor_lang::prelude::*;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
#[constant]
pub const POOL_SEED: &[u8] = b"pool";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const LP_JUNIOR_SEED: &[u8] = b"lp_junior";
#[constant]
pub const LP_SENIOR_SEED: &[u8] = b"lp_senior";
#[constant]
pub const MERCHANT_SEED: &[u8] = b"merchant";
#[constant]
pub const REPUTATION_SEED: &[u8] = b"reputation";
#[constant]
pub const GUARANTEE_SEED: &[u8] = b"guarantee";
#[constant]
pub const PLAN_SEED: &[u8] = b"plan";

/// Maximum installment slots allocated per plan (supports 3 or 6 installments).
pub const MAX_INSTALLMENTS: usize = 6;

/// Configurable total interest is capped at 10% to prevent accidental
/// misconfiguration while leaving room above the current 3% option.
pub const MAX_PLAN_INTEREST_BPS: u16 = 1_000;

/// devUSDC is a classic SPL Token mint with 6 decimals (same as real USDC).
#[constant]
pub const USDC_DECIMALS: u8 = 6;

pub const BPS_DENOMINATOR: u128 = 10_000;
