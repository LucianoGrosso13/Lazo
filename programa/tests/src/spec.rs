//! Business parameters straight from the spec (proyecto/03-brief-companero.md
//! tier table + 02-validacion.md pricing decisions). Tests assert THESE
//! values — if the implementation diverges, the suite fails, which is the point.

use cuotas::{ConfigParams, PlanOption, TierParams};

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
/// spec day on which the guarantor is notified ahead of the charge.
pub const GUARANTOR_NOTICE_DAY: u8 = 3;
/// spec: a plan counts only if it finances >= 100 USDC.
pub const MIN_FINANCED_TO_COUNT: u64 = 100 * USDC;

/// Tier table, guaranteed track (tiers 0-3), from the brief:
/// (down_payment_bps, interest_bps, guarantor_coverage_bps, max_purchase).
pub const GUARANTEED_TIERS: [(u16, u16, u16, u64); 4] = [
    (3_000, 0, 10_000, 1_000 * USDC),
    (2_000, 0, 10_000, 1_000 * USDC),
    (1_000, 0, 10_000, 1_250 * USDC),
    (0, 0, 10_000, 1_500 * USDC),
];

pub const PLAN_OPTIONS: [PlanOption; 2] = [
    PlanOption {
        installments: 3,
        interest_total_bps: 0,
        min_price: 0,
        enabled: true,
    },
    PlanOption {
        installments: 6,
        interest_total_bps: 300,
        min_price: 350 * USDC,
        enabled: true,
    },
];

/// Days between installments, seeded by the client at init (30 monthly).
pub const INSTALLMENT_INTERVAL_DAYS: u16 = 30;
/// Demo clock: one protocol "day" is 60 real seconds.
pub const SECONDS_PER_DAY: u32 = 60;

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
        guarantor_notice_day: GUARANTOR_NOTICE_DAY,
        seconds_per_day: SECONDS_PER_DAY,
        installment_interval_days: INSTALLMENT_INTERVAL_DAYS,
        min_financed_to_count: MIN_FINANCED_TO_COUNT,
        guaranteed_tiers: GUARANTEED_TIERS.map(tier),
        plan_options: PLAN_OPTIONS,
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

// ---- credit-plan math (ronda-4 schedule, floor semantics) --------------------
// Independently recomputed from the spec tables; never delegated to the
// program crate. All money moves in base units; every division floors.

fn bps_floor(amount: u64, bps: u16) -> u64 {
    u64::try_from((amount as u128) * (bps as u128) / 10_000u128).unwrap()
}

/// Everything `open_plan(price)` must produce under a given tier row and the
/// spec fee. Field names mirror `Plan`/`Pool` deltas one-to-one.
pub struct SpecQuote {
    pub down: u64,
    pub financed: u64,
    pub interest: u64,
    pub repayable: u64,
    pub fee: u64,
    /// what the merchant settles for minus the down payment.
    pub advance: u64,
    /// total the merchant collects on-chain: down + advance.
    pub merchant_total: u64,
    /// [floor(r/n)...] — last absorbs rounding.
    pub installments: Vec<u64>,
    /// Full outstanding balance (principal + interest) the surety must cover.
    pub required_coverage: u64,
}

/// Quote for the GUARANTEED track at `tier` (0-3), defaulting to 3 installments.
pub fn spec_quote_guaranteed(price: u64, tier: usize) -> SpecQuote {
    spec_quote_guaranteed_options(price, tier, 3)
}

/// Quote for the GUARANTEED track at `tier` (0-3) for a specific installment option.
pub fn spec_quote_guaranteed_options(price: u64, tier: usize, installments: u8) -> SpecQuote {
    let t = GUARANTEED_TIERS[tier];
    let opt = PLAN_OPTIONS
        .iter()
        .find(|o| o.installments == installments)
        .expect("valid plan option");
    let down = bps_floor(price, t.0);
    let financed = price - down;
    let interest = bps_floor(financed, opt.interest_total_bps);
    let repayable = financed + interest;
    let fee = bps_floor(financed, FEE_BPS);
    let n = installments as u64;
    let base = repayable / n;
    let mut insts = vec![base; installments as usize];
    if let Some(last) = insts.last_mut() {
        *last = repayable - base * (n - 1);
    }
    SpecQuote {
        down,
        financed,
        interest,
        repayable,
        fee,
        advance: financed - fee,
        merchant_total: down + (financed - fee),
        installments: insts,
        required_coverage: repayable,
    }
}

/// Fixed late penalty over an installment amount (5% floor, never accrues).
pub fn spec_penalty(amount: u64) -> u64 {
    bps_floor(amount, PENALTY_BPS)
}

/// Spec due date: opened_at + (index+1) * interval_days * seconds_per_day.
pub fn spec_due_at(opened_at: i64, index: usize) -> i64 {
    opened_at + (index as i64 + 1) * INSTALLMENT_INTERVAL_DAYS as i64 * SECONDS_PER_DAY as i64
}

/// Spec days_late: floor((now - due) / spd), negative while still upcoming.
pub fn spec_days_late(now: i64, due: i64) -> i64 {
    let diff = now - due;
    if diff <= 0 {
        diff
    } else {
        diff / SECONDS_PER_DAY as i64
    }
}
