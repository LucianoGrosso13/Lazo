use anchor_lang::prelude::*;

use crate::constants::{BPS_DENOMINATOR, INSTALLMENT_COUNT};
use crate::error::CuotasError;

/// One fixed installment of a [`Plan`]. The status is derived, never stored:
/// - paid (`paid`) or charged to the guarantor (`charged`) are terminal;
/// - otherwise compare the clock against `due_at` with the config's grace and
///   guarantor-charge windows (Upcoming / Due / Grace / Late).
///
/// `penalty` is 0 until the installment is marked late (day `grace_days + 1`),
/// then fixed at `penalty_bps` over `amount`. It never accrues further.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct Installment {
    /// Principal + interest slice due, in USDC base units. Fixed at open.
    pub amount: u64,
    /// Unix timestamp when this installment is due. Fixed at open.
    pub due_at: i64,
    /// Fixed penalty once marked late, 0 before. Never accrues.
    pub penalty: u64,
    /// Paid by the student via `pay_installment`.
    pub paid: bool,
    /// Charged to the guarantor via `keeper_register_recovery`.
    pub charged: bool,
    /// Penalty applied (by crank or auto-applied by pay/recovery).
    pub marked_late: bool,
    /// Off-chain guarantor-charge receipt recorded by `keeper_register_recovery`
    /// on every installment it resolves. Zeros until charged; a second recovery
    /// must use a fresh receipt (reuse within a plan is rejected).
    pub receipt_hash: [u8; 32],
}

impl Installment {
    pub fn resolved(&self) -> bool {
        self.paid || self.charged
    }

    /// Whole protocol days past due, floored. Zero or negative while due in
    /// the future or on the due day itself (mirrors the mock's
    /// `floor((now - due_at) / seconds_per_day)` for non-negative diffs).
    pub fn days_late(now: i64, due_at: i64, seconds_per_day: u32) -> i64 {
        let diff = now.saturating_sub(due_at);
        if diff <= 0 {
            return diff;
        }
        diff / seconds_per_day as i64
    }
}

/// A 3-installment credit plan, PDA ["plan", student]. One active plan per
/// student (Q5): `open_plan` uses `init`, so a second plan fails while one
/// exists; the settling pay/recovery closes the account and frees the PDA.
///
/// Privacy decision (02-validacion.md): purchase detail lives here and dies
/// with the close; only tier + counters persist on [`Reputation`](crate::state::Reputation).
#[account]
#[derive(InitSpace)]
pub struct Plan {
    /// The student wallet (PDA seed + rent refund destination on close).
    pub student: Pubkey,
    /// The merchant wallet that received down payment + pool advance.
    pub merchant: Pubkey,
    /// Purchase price, USDC base units.
    pub price: u64,
    /// Paid by the student directly to the merchant at open.
    pub down_payment: u64,
    /// Principal advanced by the pool: `price - down_payment`.
    pub financed: u64,
    /// Interest over financed (`interest_bps`, 0 in every current tier).
    pub interest: u64,
    /// Merchant fee over financed (`fee_bps`), credited to LPs at open.
    pub merchant_fee: u64,
    /// Unix timestamp of origination. Due[i] comes from the config schedule:
    /// `due_at(opened_at, i, installment_interval_days, seconds_per_day)`.
    pub opened_at: i64,
    /// Reputation tier snapshot at open (selects the tier table row).
    pub tier: u8,
    /// Whether an active guarantee backed this plan (selects the track).
    pub with_guarantee: bool,
    /// Still counts toward tier-ups: financed >= min AND never past grace.
    /// Set false permanently the first time an installment goes past grace.
    pub counts: bool,
    /// Fixed 3-installment schedule (last absorbs rounding).
    pub installments: [Installment; INSTALLMENT_COUNT],
    /// Canonical bump of this PDA.
    pub bump: u8,
}

impl Plan {
    /// Total the student must repay: financed + interest.
    pub fn repayable(&self) -> Result<u64> {
        self.financed
            .checked_add(self.interest)
            .ok_or(CuotasError::MathOverflow.into())
    }

    /// Index of the first unresolved installment, if any.
    pub fn first_unpaid(&self) -> Option<usize> {
        self.installments.iter().position(|i| !i.resolved())
    }

    pub fn fully_resolved(&self) -> bool {
        self.installments.iter().all(|i| i.resolved())
    }

    pub fn charged_count(&self) -> usize {
        self.installments.iter().filter(|i| i.charged).count()
    }

    /// Whether `receipt` is already recorded on a charged installment.
    pub fn has_receipt(&self, receipt: &[u8; 32]) -> bool {
        self.installments
            .iter()
            .any(|i| i.charged && i.receipt_hash == *receipt)
    }
}

/// Floored basis-points of `amount`: `amount * bps / 10_000` in u128 with
/// checked math. Floors in favor of the payer (student/merchant); differs from
/// the front mock's round-half-up by at most 1 base unit.
pub fn bps_of(amount: u64, bps: u16) -> Result<u64> {
    let out = u128::from(amount)
        .checked_mul(u128::from(bps))
        .ok_or(CuotasError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(CuotasError::MathOverflow)?;
    u64::try_from(out).map_err(|_| CuotasError::MathOverflow.into())
}

/// Split `repayable` into 3 installments: the first two are `floor(/3)`, the
/// last absorbs the rounding remainder so the sum is exact.
pub fn split_installments(repayable: u64) -> [u64; INSTALLMENT_COUNT] {
    let base = repayable / INSTALLMENT_COUNT as u64;
    let last = repayable - base * (INSTALLMENT_COUNT as u64 - 1);
    [base, base, last]
}

/// Due timestamp of installment `index` from the config schedule:
/// opened_at + (index+1) * installment_interval_days * seconds_per_day.
pub fn due_at(
    opened_at: i64,
    index: usize,
    installment_interval_days: u16,
    seconds_per_day: u32,
) -> Result<i64> {
    let days = (index as i64 + 1)
        .checked_mul(installment_interval_days as i64)
        .ok_or(CuotasError::MathOverflow)?;
    let offset = days
        .checked_mul(seconds_per_day as i64)
        .ok_or(CuotasError::MathOverflow)?;
    opened_at
        .checked_add(offset)
        .ok_or(CuotasError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bps_floors_in_favor_of_payer() {
        assert_eq!(bps_of(1_000_000_000, 3_000).unwrap(), 300_000_000);
        assert_eq!(bps_of(700_000_000, 700).unwrap(), 49_000_000);
        // 233_333_333 * 5% = 11_666_666.65 -> floor 11_666_666.
        assert_eq!(bps_of(233_333_333, 500).unwrap(), 11_666_666);
        assert_eq!(bps_of(0, 10_000).unwrap(), 0);
    }

    #[test]
    fn installments_sum_exactly_with_last_absorbing_rounding() {
        // PC case: 700 USDC financed at 0% -> 233.333333/233.333333/233.333334.
        let parts = split_installments(700_000_000);
        assert_eq!(parts, [233_333_333, 233_333_333, 233_333_334]);
        assert_eq!(parts.iter().sum::<u64>(), 700_000_000);
        let parts = split_installments(10);
        assert_eq!(parts, [3, 3, 4]);
        let parts = split_installments(2);
        assert_eq!(parts, [0, 0, 2]);
        let parts = split_installments(0);
        assert_eq!(parts, [0, 0, 0]);
    }

    #[test]
    fn due_dates_follow_config_interval() {
        let opened_at = 1_700_000_000i64;
        let spd = 86_400u32;
        // Canonical seed interval: +30/+60/+90 days.
        assert_eq!(
            due_at(opened_at, 0, 30, spd).unwrap(),
            opened_at + 30 * 86_400
        );
        assert_eq!(
            due_at(opened_at, 1, 30, spd).unwrap(),
            opened_at + 60 * 86_400
        );
        assert_eq!(
            due_at(opened_at, 2, 30, spd).unwrap(),
            opened_at + 90 * 86_400
        );
        // Demo clock: short days keep the same spacing in protocol time.
        assert_eq!(due_at(opened_at, 0, 30, 60).unwrap(), opened_at + 30 * 60);
        // The interval is configurable, not fixed: weekly schedule.
        assert_eq!(
            due_at(opened_at, 0, 7, spd).unwrap(),
            opened_at + 7 * 86_400
        );
        assert_eq!(
            due_at(opened_at, 2, 7, spd).unwrap(),
            opened_at + 21 * 86_400
        );
    }

    #[test]
    fn days_late_floors_and_handles_future_dues() {
        let spd = 86_400u32;
        let due = 1_700_000_000i64;
        assert!(Installment::days_late(due - 1, due, spd) < 0);
        assert_eq!(Installment::days_late(due, due, spd), 0);
        assert_eq!(Installment::days_late(due + 5 * 86_400, due, spd), 5);
        // Grace is days 1-5; day 6 (due + 6d) is the first late day.
        assert_eq!(Installment::days_late(due + 6 * 86_400 - 1, due, spd), 5);
        assert_eq!(Installment::days_late(due + 6 * 86_400, due, spd), 6);
        assert_eq!(Installment::days_late(due + 15 * 86_400, due, spd), 15);
    }

    #[test]
    fn plan_resolution_helpers() {
        let inst = |paid: bool, charged: bool| Installment {
            amount: 1,
            due_at: 0,
            penalty: 0,
            paid,
            charged,
            marked_late: false,
            receipt_hash: [0; 32],
        };
        let mut plan = Plan {
            student: Pubkey::new_unique(),
            merchant: Pubkey::new_unique(),
            price: 3,
            down_payment: 0,
            financed: 3,
            interest: 0,
            merchant_fee: 0,
            opened_at: 0,
            tier: 0,
            with_guarantee: true,
            counts: true,
            installments: [inst(true, false), inst(false, false), inst(false, true)],
            bump: 255,
        };
        assert_eq!(plan.first_unpaid(), Some(1));
        assert!(!plan.fully_resolved());
        assert_eq!(plan.charged_count(), 1);
        assert_eq!(plan.repayable().unwrap(), 3);
        // Receipt tracking: only recorded on charged installments.
        assert!(!plan.has_receipt(&[7; 32]));
        plan.installments[2].receipt_hash = [7; 32];
        assert!(plan.has_receipt(&[7; 32]));
        assert!(!plan.has_receipt(&[8; 32]));
        plan.installments[1].paid = true;
        assert!(plan.fully_resolved());
        assert_eq!(plan.first_unpaid(), None);
    }

    #[test]
    fn init_space_matches_borsh_layout() {
        use anchor_lang::AnchorSerialize;
        let plan = Plan {
            student: Pubkey::new_unique(),
            merchant: Pubkey::new_unique(),
            price: 1,
            down_payment: 1,
            financed: 1,
            interest: 1,
            merchant_fee: 1,
            opened_at: 1,
            tier: 3,
            with_guarantee: true,
            counts: true,
            installments: [Installment {
                amount: 1,
                due_at: 1,
                penalty: 1,
                paid: true,
                charged: true,
                marked_late: true,
                receipt_hash: [9; 32],
            }; INSTALLMENT_COUNT],
            bump: 255,
        };
        let mut serialized = Vec::new();
        plan.serialize(&mut serialized).unwrap();
        assert_eq!(serialized.len(), Plan::INIT_SPACE);
    }
}
