//! Business parameters straight from the spec (proyecto/03-brief-companero.md
//! tier table + 02-validacion.md pricing decisions). Tests assert THESE
//! values — if the implementation diverges, the suite fails, which is the point.

use cuotas::{ConfigParams, TierParams};

use crate::env::{pk, USDC};
use solana_address::Address;

/// spec fee: 7% over the financed amount.
pub const FEE_BPS: u16 = 700;
/// spec penalty: 5% fixed over the overdue installment.
pub const PENALTY_BPS: u16 = 500;
/// spec grace window in days.
pub const GRACE_DAYS: u8 = 5;
/// spec day on which the guarantor is charged.
pub const GUARANTOR_CHARGE_DAY: u8 = 15;
/// spec: a plan counts only if it finances >= 100 USDC.
pub const MIN_FINANCED_TO_COUNT: u64 = 100 * USDC;

/// Tier table, guaranteed track (tiers 0-3), from the brief:
/// (down_payment_bps, interest_bps, guarantor_coverage_bps, max_purchase).
pub const GUARANTEED_TIERS: [(u16, u16, u16, u64); 4] = [
    (3_000, 0, 10_000, 1_000 * USDC),
    (2_000, 0, 9_000, 1_000 * USDC),
    (1_000, 0, 8_000, 1_250 * USDC),
    (0, 0, 7_000, 1_500 * USDC),
];

/// Tier table, unguaranteed track (S0-S1).
pub const UNGUARANTEED_TIERS: [(u16, u16, u16, u64); 2] = [
    (5_000, 0, 0, 150 * USDC),
    (3_000, 0, 0, 300 * USDC),
];

fn tier(t: (u16, u16, u16, u64)) -> TierParams {
    TierParams {
        down_payment_bps: t.0,
        max_purchase: t.3,
        interest_bps: t.1,
        guarantor_coverage_bps: t.2,
    }
}

/// ConfigParams as the spec requires them loaded; `seconds_per_day` is the
/// demo value (60s "days" keep clock-warp tests honest).
pub fn spec_params(keeper: &Address, treasury: &Address) -> ConfigParams {
    ConfigParams {
        keeper: pk(keeper),
        treasury: pk(treasury),
        fee_bps: FEE_BPS,
        penalty_bps: PENALTY_BPS,
        grace_days: GRACE_DAYS,
        guarantor_charge_day: GUARANTOR_CHARGE_DAY,
        seconds_per_day: 60,
        min_financed_to_count: MIN_FINANCED_TO_COUNT,
        guaranteed_tiers: GUARANTEED_TIERS.map(tier),
        unguaranteed_tiers: UNGUARANTEED_TIERS.map(tier),
    }
}

/// Independent (spec-side) share math for a deposit, matching the approved
/// exact-deposit policy: non-bootstrap deposits must mint WHOLE shares —
/// `amount * shares` exactly divisible by `capital` — so no value can be
/// transferred to existing holders through rounding. 1:1 on an empty
/// tranche (shares AND capital zero). Returns None for every rejection the
/// spec demands (zero amount, orphan capital, wiped tranche, non-exact).
pub fn spec_shares_for_deposit(capital: u64, shares: u64, amount: u64) -> Option<u64> {
    if amount == 0 {
        return None;
    }
    if shares == 0 {
        return if capital == 0 { Some(amount) } else { None }; // OrphanedCapital
    }
    if capital == 0 {
        return None; // TrancheWipedOut
    }
    let n = (amount as u128).checked_mul(shares as u128)?;
    if n % (capital as u128) != 0 {
        return None; // UnrepresentableDeposit
    }
    let s = u64::try_from(n / capital as u128).ok()?;
    if s == 0 {
        return None; // DepositTooSmall (unreachable under exactness)
    }
    Some(s)
}

/// Independent (spec-side) payout math for a withdraw: amount = floor(
/// shares * tranche_capital / total_shares ). Zero payout is allowed so
/// worthless/dust shares can be retired; None only when the spec's error
/// cases trigger (zero shares / more than outstanding).
pub fn spec_amount_for_withdraw(capital: u64, total_shares: u64, shares: u64) -> Option<u64> {
    if shares == 0 || shares > total_shares {
        return None;
    }
    let a = (shares as u128) * (capital as u128) / (total_shares as u128);
    let a = u64::try_from(a).ok()?;
    Some(a)
}
