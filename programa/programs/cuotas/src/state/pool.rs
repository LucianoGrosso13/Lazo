use anchor_lang::prelude::*;

use crate::error::CuotasError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Tranche {
    /// First-loss capital held by the team.
    Junior,
    /// Capital provided by senior LPs; junior absorbs losses first.
    Senior,
}

impl Tranche {
    /// Seed used for the LP mint PDA of this tranche: [seed, pool].
    pub fn lp_mint_seed(&self) -> &'static [u8] {
        match self {
            Tranche::Junior => crate::constants::LP_JUNIOR_SEED,
            Tranche::Senior => crate::constants::LP_SENIOR_SEED,
        }
    }
}

/// Two-tranche liquidity pool, PDA ["pool", usdc_mint].
///
/// Recognized accounting invariant (without unsolicited token donations):
///   vault.amount + outstanding_credit == junior_capital + senior_capital
///
/// - `*_capital` is the NAV attributed to each tranche's shares.
/// - `outstanding_credit` is capital advanced to plans that has not been repaid.
/// - `accrued_fees` is cumulative recognized gain already included in LP NAV,
///   not a treasury liability or a liquidity reserve.
/// - Unsolicited token donations remain unallocated surplus, outside LP NAV.
#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub junior_shares: u64,
    pub senior_shares: u64,
    pub junior_capital: u64,
    pub senior_capital: u64,
    pub outstanding_credit: u64,
    pub accrued_fees: u64,
    pub bump: u8,
}

impl Pool {
    pub fn tranche_capital(&self, tranche: Tranche) -> u64 {
        match tranche {
            Tranche::Junior => self.junior_capital,
            Tranche::Senior => self.senior_capital,
        }
    }

    pub fn tranche_shares(&self, tranche: Tranche) -> u64 {
        match tranche {
            Tranche::Junior => self.junior_shares,
            Tranche::Senior => self.senior_shares,
        }
    }

    pub fn total_capital(&self) -> Result<u64> {
        self.junior_capital
            .checked_add(self.senior_capital)
            .ok_or(CuotasError::MathOverflow.into())
    }

    fn set_tranche_shares(&mut self, tranche: Tranche, shares: u64) {
        match tranche {
            Tranche::Junior => self.junior_shares = shares,
            Tranche::Senior => self.senior_shares = shares,
        }
    }

    /// Reconcile recorded tranche shares with the canonical LP mint supply.
    /// LP tokens can only be minted by the pool PDA, but any holder can burn
    /// their own tokens through raw SPL calls outside this program — a supply
    /// lower than recorded means burned claims are forfeited and their NAV
    /// accrues to the remaining supply. A supply ABOVE recorded shares means
    /// the accounting invariant is broken and must never silently pass.
    /// Call before every NAV pricing so denominators can never go stale.
    pub fn reconcile_shares(&mut self, tranche: Tranche, mint_supply: u64) -> Result<()> {
        require!(
            mint_supply <= self.tranche_shares(tranche),
            CuotasError::LpSupplyMismatch
        );
        self.set_tranche_shares(tranche, mint_supply);
        Ok(())
    }

    /// Shares minted for `amount` deposited into a tranche.
    /// Exact whole shares are required. Bootstrap (zero shares AND zero capital)
    /// mints 1:1 against the deposit. Capital without shares is orphaned NAV
    /// that must not be gifted to the next depositor; shares without capital
    /// is a wiped tranche that cannot take deposits at a meaningful price.
    pub fn shares_for_deposit(
        tranche_capital: u64,
        tranche_shares: u64,
        amount: u64,
    ) -> Result<u64> {
        require!(amount > 0, CuotasError::ZeroAmount);
        if tranche_shares == 0 {
            require!(tranche_capital == 0, CuotasError::OrphanedCapital);
            return Ok(amount);
        }
        require!(tranche_capital > 0, CuotasError::TrancheWipedOut);
        let capital = u128::from(tranche_capital);
        let numerator = u128::from(amount)
            .checked_mul(u128::from(tranche_shares))
            .ok_or(CuotasError::MathOverflow)?;
        require!(
            numerator
                .checked_rem(capital)
                .ok_or(CuotasError::MathOverflow)?
                == 0,
            CuotasError::UnrepresentableDeposit
        );
        let shares = numerator
            .checked_div(capital)
            .ok_or(CuotasError::MathOverflow)?;
        let shares = u64::try_from(shares).map_err(|_| CuotasError::MathOverflow)?;
        require!(shares > 0, CuotasError::DepositTooSmall);
        Ok(shares)
    }

    /// USDC owed for `shares` burned from a tranche. Floored in favor of the
    /// pool. A zero result is allowed: worthless or dust shares can always be
    /// retired so holders can fully exit and the tranche can recapitalize
    /// once supply reaches zero.
    pub fn amount_for_withdraw(
        tranche_capital: u64,
        tranche_shares: u64,
        shares: u64,
    ) -> Result<u64> {
        require!(shares > 0, CuotasError::ZeroShares);
        require!(shares <= tranche_shares, CuotasError::InsufficientShares);
        let amount = (shares as u128)
            .checked_mul(tranche_capital as u128)
            .ok_or(CuotasError::MathOverflow)?
            .checked_div(tranche_shares as u128)
            .ok_or(CuotasError::MathOverflow)?;
        u64::try_from(amount).map_err(|_| CuotasError::MathOverflow.into())
    }

    /// Book a deposit: capital += amount, shares += shares_minted.
    pub fn book_deposit(&mut self, tranche: Tranche, amount: u64, shares: u64) -> Result<()> {
        let capital = self
            .tranche_capital(tranche)
            .checked_add(amount)
            .ok_or(CuotasError::MathOverflow)?;
        let shares = self
            .tranche_shares(tranche)
            .checked_add(shares)
            .ok_or(CuotasError::MathOverflow)?;
        match tranche {
            Tranche::Junior => {
                self.junior_capital = capital;
                self.junior_shares = shares;
            }
            Tranche::Senior => {
                self.senior_capital = capital;
                self.senior_shares = shares;
            }
        }
        Ok(())
    }

    /// Book a withdrawal: capital -= amount, shares -= shares_burned.
    pub fn book_withdraw(&mut self, tranche: Tranche, amount: u64, shares: u64) -> Result<()> {
        let capital = self
            .tranche_capital(tranche)
            .checked_sub(amount)
            .ok_or(CuotasError::MathOverflow)?;
        let shares = self
            .tranche_shares(tranche)
            .checked_sub(shares)
            .ok_or(CuotasError::MathOverflow)?;
        match tranche {
            Tranche::Junior => {
                self.junior_capital = capital;
                self.junior_shares = shares;
            }
            Tranche::Senior => {
                self.senior_capital = capital;
                self.senior_shares = shares;
            }
        }
        Ok(())
    }

    pub fn gain_allocation(
        junior_capital: u64,
        senior_capital: u64,
        gain: u64,
    ) -> Result<GainBreakdown> {
        require!(gain > 0, CuotasError::ZeroAmount);
        let total = u128::from(junior_capital)
            .checked_add(u128::from(senior_capital))
            .ok_or(CuotasError::MathOverflow)?;
        require!(total > 0, CuotasError::NoCapitalForGain);
        let gain = u128::from(gain);
        let junior_gain = gain
            .checked_mul(u128::from(junior_capital))
            .ok_or(CuotasError::MathOverflow)?
            .checked_div(total)
            .ok_or(CuotasError::MathOverflow)?;
        let senior_floor = gain
            .checked_mul(u128::from(senior_capital))
            .ok_or(CuotasError::MathOverflow)?
            .checked_div(total)
            .ok_or(CuotasError::MathOverflow)?;
        let remainder = gain
            .checked_sub(junior_gain)
            .and_then(|remaining| remaining.checked_sub(senior_floor))
            .ok_or(CuotasError::MathOverflow)?;
        let senior_gain = senior_floor
            .checked_add(remainder)
            .ok_or(CuotasError::MathOverflow)?;
        require!(
            junior_gain.checked_add(senior_gain) == Some(gain),
            CuotasError::MathOverflow
        );
        Ok(GainBreakdown {
            junior_gain: u64::try_from(junior_gain).map_err(|_| CuotasError::MathOverflow)?,
            senior_gain: u64::try_from(senior_gain).map_err(|_| CuotasError::MathOverflow)?,
        })
    }

    pub fn book_gain(&mut self, gain: u64) -> Result<GainBreakdown> {
        let allocation = Self::gain_allocation(self.junior_capital, self.senior_capital, gain)?;
        require!(
            (self.junior_capital == 0 || self.junior_shares > 0)
                && (self.senior_capital == 0 || self.senior_shares > 0),
            CuotasError::OrphanedCapital
        );
        let junior_capital = self
            .junior_capital
            .checked_add(allocation.junior_gain)
            .ok_or(CuotasError::MathOverflow)?;
        let senior_capital = self
            .senior_capital
            .checked_add(allocation.senior_gain)
            .ok_or(CuotasError::MathOverflow)?;
        let accrued_fees = self
            .accrued_fees
            .checked_add(gain)
            .ok_or(CuotasError::MathOverflow)?;
        self.junior_capital = junior_capital;
        self.senior_capital = senior_capital;
        self.accrued_fees = accrued_fees;
        Ok(allocation)
    }

    /// Apply a realized loss of `amount`, cascading junior-first and senior
    /// second. Errors if the loss exceeds total capital — the pool cannot
    /// book a loss larger than its own NAV. `outstanding_credit` is left
    /// untouched: the instruction that books the loss decides how the cash
    /// side moves (cash simulation vs credit write-off, pending decision).
    pub fn apply_loss(&mut self, amount: u64) -> Result<LossBreakdown> {
        require!(amount > 0, CuotasError::ZeroAmount);
        require!(
            amount <= self.total_capital()?,
            CuotasError::LossExceedsCapital
        );

        let junior_hit = amount.min(self.junior_capital);
        self.junior_capital = self
            .junior_capital
            .checked_sub(junior_hit)
            .ok_or(CuotasError::MathOverflow)?;
        let senior_hit = amount
            .checked_sub(junior_hit)
            .ok_or(CuotasError::MathOverflow)?;
        self.senior_capital = self
            .senior_capital
            .checked_sub(senior_hit)
            .ok_or(CuotasError::MathOverflow)?;

        Ok(LossBreakdown {
            junior_hit,
            senior_hit,
        })
    }
}

pub struct GainBreakdown {
    pub junior_gain: u64,
    pub senior_gain: u64,
}

pub struct LossBreakdown {
    pub junior_hit: u64,
    pub senior_hit: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::error::Error;

    trait TryToVec {
        fn try_to_vec(&self) -> std::io::Result<Vec<u8>>;
    }

    impl<T: anchor_lang::AnchorSerialize> TryToVec for T {
        fn try_to_vec(&self) -> std::io::Result<Vec<u8>> {
            anchor_lang::prelude::borsh::to_vec(self)
        }
    }

    fn assert_err<T>(res: Result<T>, expected: CuotasError) {
        match res {
            Err(Error::AnchorError(e)) => {
                assert_eq!(e.error_code_number, 6000 + expected as u32);
            }
            _ => panic!("expected AnchorError"),
        }
    }

    fn empty_pool() -> Pool {
        Pool {
            junior_shares: 0,
            senior_shares: 0,
            junior_capital: 0,
            senior_capital: 0,
            outstanding_credit: 0,
            accrued_fees: 0,
            bump: 255,
        }
    }

    #[test]
    fn deposit_bootstrap_mints_one_to_one() {
        let shares = Pool::shares_for_deposit(0, 0, 500_000).unwrap();
        assert_eq!(shares, 500_000);
    }

    #[test]
    fn deposit_uses_tranche_nav() {
        // capital 1_000_000 with 500_000 shares -> deposit 100 -> 50 shares
        let shares = Pool::shares_for_deposit(1_000_000, 500_000, 100_000).unwrap();
        assert_eq!(shares, 50_000);
    }

    #[test]
    fn deposit_rejects_orphaned_capital() {
        // Capital with zero shares must not be gifted to the next depositor.
        assert_err(
            Pool::shares_for_deposit(500, 0, 1_000),
            CuotasError::OrphanedCapital,
        );
        assert_err(Pool::shares_for_deposit(0, 0, 0), CuotasError::ZeroAmount);
    }

    #[test]
    fn deposit_rejects_fractional_share_mints() {
        // capital >> shares: a fractional-share deposit is rejected
        assert_err(
            Pool::shares_for_deposit(1_000_000_000, 10, 100),
            CuotasError::UnrepresentableDeposit,
        );
    }

    #[test]
    fn deposit_rejects_external_burn_inflation() {
        let mut pool = empty_pool();
        pool.book_deposit(Tranche::Junior, 1_000_000_000, 1_000_000_000)
            .unwrap();
        pool.reconcile_shares(Tranche::Junior, 1).unwrap();
        let before = pool.try_to_vec().unwrap();
        assert_err(
            Pool::shares_for_deposit(pool.junior_capital, pool.junior_shares, 1_500_000_000),
            CuotasError::UnrepresentableDeposit,
        );
        assert_eq!(pool.try_to_vec().unwrap(), before);
        assert_eq!(
            Pool::amount_for_withdraw(pool.junior_capital, pool.junior_shares, 1).unwrap(),
            1_000_000_000
        );
    }

    #[test]
    fn withdraw_pays_by_nav_and_floors_for_pool() {
        // 3 shares of 10 over capital 100 -> 30
        let amount = Pool::amount_for_withdraw(100, 10, 3).unwrap();
        assert_eq!(amount, 30);
        // 1 share of 3 over capital 10 -> floor(3.33) = 3
        let amount = Pool::amount_for_withdraw(10, 3, 1).unwrap();
        assert_eq!(amount, 3);
    }

    #[test]
    fn withdraw_rejects_overdraw_and_zero() {
        assert_err(
            Pool::amount_for_withdraw(100, 10, 11),
            CuotasError::InsufficientShares,
        );
        assert_err(
            Pool::amount_for_withdraw(100, 10, 0),
            CuotasError::ZeroShares,
        );
    }

    #[test]
    fn wiped_tranche_withdraws_zero_to_retire_shares() {
        // capital == 0 with shares outstanding: holders retire shares for 0,
        // burning supply until the tranche can recapitalize.
        assert_eq!(Pool::amount_for_withdraw(0, 10, 4).unwrap(), 0);
        // dust shares also retire for free while capital exists
        assert_eq!(Pool::amount_for_withdraw(1, 1_000, 1).unwrap(), 0);
    }

    #[test]
    fn loss_cascades_junior_first_then_senior() {
        let mut pool = empty_pool();
        pool.junior_capital = 200;
        pool.senior_capital = 800;
        pool.outstanding_credit = 500;

        // Loss of 150: fully absorbed by junior; outstanding credit untouched.
        let b = pool.apply_loss(150).unwrap();
        assert_eq!((b.junior_hit, b.senior_hit), (150, 0));
        assert_eq!((pool.junior_capital, pool.senior_capital), (50, 800));
        assert_eq!(pool.outstanding_credit, 500);

        // Loss of 300: junior takes remaining 50, senior takes 250.
        let b = pool.apply_loss(300).unwrap();
        assert_eq!((b.junior_hit, b.senior_hit), (50, 250));
        assert_eq!((pool.junior_capital, pool.senior_capital), (0, 550));
        assert_eq!(pool.outstanding_credit, 500);
    }

    #[test]
    fn loss_beyond_total_capital_errors() {
        let mut pool = empty_pool();
        pool.junior_capital = 100;
        pool.senior_capital = 50;
        assert_err(pool.apply_loss(151), CuotasError::LossExceedsCapital);
        assert_err(pool.apply_loss(0), CuotasError::ZeroAmount);
        // Exact total is allowed and wipes the pool.
        assert!(pool.apply_loss(150).is_ok());
        assert_eq!(pool.total_capital().unwrap(), 0);
    }

    #[test]
    fn wiped_tranche_rejects_deposits() {
        // Shares outstanding but capital == 0: NAV is zero, deposits rejected.
        assert_err(
            Pool::shares_for_deposit(0, 10, 1_000),
            CuotasError::TrancheWipedOut,
        );
    }

    #[test]
    fn reconcile_rejects_supply_above_recorded() {
        let mut pool = empty_pool();
        pool.junior_shares = 100;
        assert_err(
            pool.reconcile_shares(Tranche::Junior, 101),
            CuotasError::LpSupplyMismatch,
        );
    }

    #[test]
    fn reconcile_syncs_down_to_external_burns() {
        let mut pool = empty_pool();
        pool.junior_shares = 100;
        pool.junior_capital = 200;
        // External SPL burn of 30: recorded shares sync to real supply so the
        // forfeited NAV accrues to remaining holders (denominator shrinks).
        pool.reconcile_shares(Tranche::Junior, 70).unwrap();
        assert_eq!(pool.junior_shares, 70);
        // NAV now pays ~2.857 per share instead of 2.
        assert_eq!(Pool::amount_for_withdraw(200, 70, 70).unwrap(), 200);
    }

    #[test]
    fn book_deposit_and_withdraw_are_inverse() {
        let mut pool = empty_pool();
        pool.book_deposit(Tranche::Senior, 1_000, 1_000).unwrap();
        assert_eq!((pool.senior_capital, pool.senior_shares), (1_000, 1_000));
        pool.book_withdraw(Tranche::Senior, 400, 400).unwrap();
        assert_eq!((pool.senior_capital, pool.senior_shares), (600, 600));
    }

    #[test]
    fn tranche_selection() {
        let mut pool = empty_pool();
        pool.junior_capital = 11;
        pool.junior_shares = 22;
        assert_eq!(pool.tranche_capital(Tranche::Junior), 11);
        assert_eq!(pool.tranche_shares(Tranche::Junior), 22);
        assert_eq!(pool.tranche_capital(Tranche::Senior), 0);
    }

    #[test]
    fn deposit_accepts_only_exact_amount_increments() {
        for amount in 1..=12 {
            if amount % 3 == 0 {
                assert_eq!(
                    Pool::shares_for_deposit(6, 4, amount).unwrap(),
                    amount / 3 * 2
                );
            } else {
                assert_err(
                    Pool::shares_for_deposit(6, 4, amount),
                    CuotasError::UnrepresentableDeposit,
                );
            }
        }
    }

    #[test]
    fn deposit_checks_wide_products_and_narrowing() {
        assert_eq!(
            Pool::shares_for_deposit(u64::MAX, u64::MAX, u64::MAX).unwrap(),
            u64::MAX
        );
        assert_err(
            Pool::shares_for_deposit(1, u64::MAX, u64::MAX),
            CuotasError::MathOverflow,
        );
    }

    #[test]
    fn booking_failures_leave_host_state_unchanged() {
        for tranche in [Tranche::Junior, Tranche::Senior] {
            let mut pool = empty_pool();
            pool.book_deposit(tranche, 1, u64::MAX).unwrap();
            let before = pool.try_to_vec().unwrap();
            assert_err(pool.book_deposit(tranche, 1, 1), CuotasError::MathOverflow);
            assert_eq!(pool.try_to_vec().unwrap(), before);
            let mut pool = empty_pool();
            pool.book_deposit(tranche, u64::MAX, 1).unwrap();
            let before = pool.try_to_vec().unwrap();
            assert_err(pool.book_deposit(tranche, 1, 1), CuotasError::MathOverflow);
            assert_eq!(pool.try_to_vec().unwrap(), before);
            assert_err(pool.book_withdraw(tranche, 1, 2), CuotasError::MathOverflow);
            assert_eq!(pool.try_to_vec().unwrap(), before);
        }
    }

    #[test]
    fn gains_are_proportional_with_senior_receiving_integer_remainder() {
        for (junior, senior, gain, expected) in [
            (200, 800, 100, (20, 80)),
            (1, 2, 2, (0, 2)),
            (2, 1, 2, (1, 1)),
            (0, 7, 9, (0, 9)),
            (7, 0, 9, (9, 0)),
            (
                u64::MAX,
                u64::MAX,
                u64::MAX,
                (u64::MAX / 2, u64::MAX / 2 + 1),
            ),
        ] {
            let split = Pool::gain_allocation(junior, senior, gain).unwrap();
            assert_eq!((split.junior_gain, split.senior_gain), expected);
            assert_eq!(
                u128::from(split.junior_gain) + u128::from(split.senior_gain),
                u128::from(gain)
            );
        }
    }

    #[test]
    fn gains_conserve_value_across_small_integer_inputs() {
        for junior in 0..=8 {
            for senior in 0..=8 {
                if junior + senior == 0 {
                    continue;
                }
                for gain in 1..=16 {
                    let split = Pool::gain_allocation(junior, senior, gain).unwrap();
                    assert_eq!(split.junior_gain + split.senior_gain, gain);
                    assert_eq!(split.junior_gain, gain * junior / (junior + senior));
                    let senior_floor = gain * senior / (junior + senior);
                    assert!(
                        split.senior_gain == senior_floor || split.senior_gain == senior_floor + 1
                    );
                }
            }
        }
    }

    #[test]
    fn gains_reject_empty_capital_and_zero_amount() {
        assert_err(
            Pool::gain_allocation(0, 0, 1),
            CuotasError::NoCapitalForGain,
        );
        assert_err(Pool::gain_allocation(1, 1, 0), CuotasError::ZeroAmount);
        let mut pool = empty_pool();
        let before = pool.try_to_vec().unwrap();
        assert_err(pool.book_gain(1), CuotasError::NoCapitalForGain);
        assert_eq!(pool.try_to_vec().unwrap(), before);
    }

    #[test]
    fn gain_booking_counts_income_once_and_preserves_shares_and_credit() {
        let mut pool = empty_pool();
        pool.book_deposit(Tranche::Junior, 200, 100).unwrap();
        pool.book_deposit(Tranche::Senior, 800, 400).unwrap();
        pool.outstanding_credit = 500;
        let gain = pool.book_gain(100).unwrap();
        assert_eq!((gain.junior_gain, gain.senior_gain), (20, 80));
        assert_eq!((pool.junior_capital, pool.senior_capital), (220, 880));
        assert_eq!((pool.junior_shares, pool.senior_shares), (100, 400));
        assert_eq!(pool.outstanding_credit, 500);
        assert_eq!(pool.accrued_fees, 100);
        let modeled_vault_after_income = 600_u64;
        assert_eq!(
            modeled_vault_after_income + pool.outstanding_credit,
            pool.total_capital().unwrap()
        );
        pool.apply_loss(100).unwrap();
        assert_eq!(pool.accrued_fees, 100);
    }

    #[test]
    fn gain_booking_rejects_orphan_capital_without_host_mutation() {
        for tranche in [Tranche::Junior, Tranche::Senior] {
            let mut pool = empty_pool();
            pool.book_deposit(tranche, 100, 100).unwrap();
            pool.reconcile_shares(tranche, 0).unwrap();
            let before = pool.try_to_vec().unwrap();
            assert_err(pool.book_gain(10), CuotasError::OrphanedCapital);
            assert_eq!(pool.try_to_vec().unwrap(), before);
        }
    }

    #[test]
    fn gain_does_not_revive_zero_nav_shares() {
        let mut pool = empty_pool();
        pool.junior_shares = 10;
        pool.book_deposit(Tranche::Senior, 100, 100).unwrap();
        pool.book_gain(10).unwrap();
        assert_eq!((pool.junior_capital, pool.junior_shares), (0, 10));
        assert_eq!((pool.senior_capital, pool.senior_shares), (110, 100));
    }

    #[test]
    fn gain_overflow_never_partially_mutates_host_state() {
        for (junior, senior, fees) in [(u64::MAX, 0, 0), (1, u64::MAX, 0), (2, 3, u64::MAX)] {
            let mut pool = empty_pool();
            pool.junior_capital = junior;
            pool.senior_capital = senior;
            pool.junior_shares = u64::from(junior > 0);
            pool.senior_shares = u64::from(senior > 0);
            pool.accrued_fees = fees;
            let before = pool.try_to_vec().unwrap();
            assert_err(pool.book_gain(5), CuotasError::MathOverflow);
            assert_eq!(pool.try_to_vec().unwrap(), before);
        }
    }
}
