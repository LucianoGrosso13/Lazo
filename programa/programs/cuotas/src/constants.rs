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

/// devUSDC is a classic SPL Token mint with 6 decimals (same as real USDC).
#[constant]
pub const USDC_DECIMALS: u8 = 6;

pub const BPS_DENOMINATOR: u128 = 10_000;
