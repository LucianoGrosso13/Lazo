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
/// Accounting invariant:
///   vault.amount + outstanding_credit == junior_capital + senior_capital + accrued_fees
///
/// - `*_capital` is the NAV attributed to each tranche's shares.
/// - `outstanding_credit` is capital advanced to plans that has not been repaid.
/// - `accrued_fees` is owed to the treasury and is NOT part of LP NAV.
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
    /// Floored in favor of the pool. Bootstrap (zero shares AND zero capital)
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
        let shares = (amount as u128)
            .checked_mul(tranche_shares as u128)
            .ok_or(CuotasError::MathOverflow)?
            .checked_div(tranche_capital as u128)
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
        match tranche {
            Tranche::Junior => {
                self.junior_capital = self
                    .junior_capital
                    .checked_add(amount)
                    .ok_or(CuotasError::MathOverflow)?;
                self.junior_shares = self
                    .junior_shares
                    .checked_add(shares)
                    .ok_or(CuotasError::MathOverflow)?;
            }
            Tranche::Senior => {
                self.senior_capital = self
                    .senior_capital
                    .checked_add(amount)
                    .ok_or(CuotasError::MathOverflow)?;
                self.senior_shares = self
                    .senior_shares
                    .checked_add(shares)
                    .ok_or(CuotasError::MathOverflow)?;
            }
        }
        Ok(())
    }

    /// Book a withdrawal: capital -= amount, shares -= shares_burned.
    pub fn book_withdraw(&mut self, tranche: Tranche, amount: u64, shares: u64) -> Result<()> {
        match tranche {
            Tranche::Junior => {
                self.junior_capital = self
                    .junior_capital
                    .checked_sub(amount)
                    .ok_or(CuotasError::MathOverflow)?;
                self.junior_shares = self
                    .junior_shares
                    .checked_sub(shares)
                    .ok_or(CuotasError::MathOverflow)?;
            }
            Tranche::Senior => {
                self.senior_capital = self
                    .senior_capital
                    .checked_sub(amount)
                    .ok_or(CuotasError::MathOverflow)?;
                self.senior_shares = self
                    .senior_shares
                    .checked_sub(shares)
                    .ok_or(CuotasError::MathOverflow)?;
            }
        }
        Ok(())
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

pub struct LossBreakdown {
    pub junior_hit: u64,
    pub senior_hit: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::error::Error;

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
    fn deposit_floors_and_rejects_zero_share_mints() {
        // capital >> shares: small deposit yields 0 shares -> rejected
        assert_err(
            Pool::shares_for_deposit(1_000_000_000, 10, 100),
            CuotasError::DepositTooSmall,
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
}
