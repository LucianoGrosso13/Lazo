//! PDA derivations taken from the spec (proyecto/03-brief-companero.md), not
//! from the program source. If the implementation diverges from the published
//! seeds, these tests are exactly what should catch it.

use solana_address::Address;

use crate::env::program_id;

pub fn find(seeds: &[&[u8]]) -> (Address, u8) {
    Address::find_program_address(seeds, &program_id())
}

/// `["config"]` — ProtocolConfig.
pub fn config() -> (Address, u8) {
    find(&[b"config"])
}

/// `["pool", usdc_mint]` — Pool.
pub fn pool(usdc_mint: &Address) -> (Address, u8) {
    find(&[b"pool", usdc_mint.as_ref()])
}

/// `["lp_junior", pool]` — junior LP receipt mint.
pub fn lp_junior(pool: &Address) -> (Address, u8) {
    find(&[b"lp_junior", pool.as_ref()])
}

/// `["lp_senior", pool]` — senior LP receipt mint.
pub fn lp_senior(pool: &Address) -> (Address, u8) {
    find(&[b"lp_senior", pool.as_ref()])
}

/// `["vault", pool]` — pool USDC vault, token authority = pool.
pub fn vault(pool: &Address) -> (Address, u8) {
    find(&[b"vault", pool.as_ref()])
}

/// `["merchant", merchant_wallet]` — Merchant.
pub fn merchant(merchant_wallet: &Address) -> (Address, u8) {
    find(&[b"merchant", merchant_wallet.as_ref()])
}

/// `["reputation", student_wallet]` — Reputation.
pub fn reputation(student_wallet: &Address) -> (Address, u8) {
    find(&[b"reputation", student_wallet.as_ref()])
}

/// `["guarantee", student_wallet]` — Guarantee.
pub fn guarantee(student_wallet: &Address) -> (Address, u8) {
    find(&[b"guarantee", student_wallet.as_ref()])
}

/// `["plan", student_wallet]` — Plan, one active plan per student.
pub fn plan(student_wallet: &Address) -> (Address, u8) {
    find(&[b"plan", student_wallet.as_ref()])
}

/// `["payout", plan]` — merchant payout schedule for a plan.
pub fn payout(plan: &Address) -> (Address, u8) { find(&[b"payout", plan.as_ref()]) }

/// `[program_id]` under the upgradeable loader — the ProgramData account
/// that stores the upgrade authority checked by `admin_init_config`.
pub fn program_data() -> (Address, u8) {
    Address::find_program_address(
        &[program_id().as_ref()],
        &solana_sdk_ids::bpf_loader_upgradeable::id(),
    )
}
