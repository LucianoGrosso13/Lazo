use anchor_lang::prelude::*;

use crate::constants::BPS_DENOMINATOR;
use crate::error::CuotasError;

/// Terms that apply to one reputation tier. All values live on-chain in
/// ProtocolConfig; nothing business-related is hardcoded in handlers.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct TierParams {
    /// Down payment the student pays directly to the merchant, in bps of price.
    pub down_payment_bps: u16,
    /// Absolute maximum purchase price allowed at this tier, in USDC base units.
    pub max_purchase: u64,
    /// Interest charged on the financed amount, in bps. Currently 0 everywhere.
    pub interest_bps: u16,
    /// Fraction of the financed amount the guarantor must cover, in bps.
    pub guarantor_coverage_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum ProtocolState {
    /// Everything allowed.
    Normal,
    /// Full stop: no origination, no deposits, no withdrawals.
    Halted,
    /// Only LP withdrawals are allowed.
    WithdrawsOnly,
}

impl ProtocolState {
    pub fn is_normal(&self) -> bool {
        matches!(self, ProtocolState::Normal)
    }

    pub fn allows_withdrawals(&self) -> bool {
        !matches!(self, ProtocolState::Halted)
    }
}

/// Global protocol parameters. Single instance, PDA ["config"].
/// Every business default lives here and is loaded by admin instructions.
#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    /// Admin authority: config updates, state changes, merchant registry, loss admin.
    pub admin: Pubkey,
    /// Backend authority: registers/updates/revokes guarantees and (later) recoveries.
    pub keeper: Pubkey,
    /// The devUSDC mint the whole protocol denominates in. Immutable after init.
    pub usdc_mint: Pubkey,
    /// Destination of accrued merchant fees (set in a later instruction set).
    pub treasury: Pubkey,
    /// Merchant fee in bps charged over the financed amount.
    pub fee_bps: u16,
    /// Fixed penalty in bps over an overdue installment.
    pub penalty_bps: u16,
    /// Days of grace after a due date before penalties apply.
    pub grace_days: u8,
    /// Day on which the guarantor is charged for an overdue installment.
    pub guarantor_charge_day: u8,
    /// Seconds that make one protocol "day". Short in demos, 86400 in production.
    pub seconds_per_day: u32,
    /// Minimum financed amount (USDC base units) for a plan to count toward tier-ups.
    pub min_financed_to_count: u64,
    /// Ladder for students with a guarantor (tiers 0-3).
    pub guaranteed_tiers: [TierParams; 4],
    /// Ladder for students without a guarantor (S0-S1).
    pub unguaranteed_tiers: [TierParams; 2],
    /// Lifecycle gate.
    pub state: ProtocolState,
    /// Canonical bump of this PDA.
    pub bump: u8,
}

impl ProtocolConfig {
    pub fn require_admin(&self, signer: &Pubkey) -> Result<()> {
        require_keys_eq!(self.admin, *signer, CuotasError::NotAdmin);
        Ok(())
    }

    pub fn require_keeper(&self, signer: &Pubkey) -> Result<()> {
        require_keys_eq!(self.keeper, *signer, CuotasError::NotKeeper);
        Ok(())
    }

    pub fn require_normal(&self) -> Result<()> {
        require!(self.state.is_normal(), CuotasError::ProtocolNotNormal);
        Ok(())
    }

    pub fn require_withdrawals_enabled(&self) -> Result<()> {
        require!(self.state.allows_withdrawals(), CuotasError::ProtocolHalted);
        Ok(())
    }
}

/// Parameters accepted by `admin_init_config` and `admin_update_config`.
/// `admin` is always the signer; `usdc_mint` is set at init and immutable.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ConfigParams {
    pub keeper: Pubkey,
    pub treasury: Pubkey,
    pub fee_bps: u16,
    pub penalty_bps: u16,
    pub grace_days: u8,
    pub guarantor_charge_day: u8,
    pub seconds_per_day: u32,
    pub min_financed_to_count: u64,
    pub guaranteed_tiers: [TierParams; 4],
    pub unguaranteed_tiers: [TierParams; 2],
}

impl ConfigParams {
    pub fn validate(&self) -> Result<()> {
        let bps_max = BPS_DENOMINATOR as u64;

        require_keys_neq!(self.keeper, Pubkey::default(), CuotasError::InvalidConfig);
        require_keys_neq!(self.treasury, Pubkey::default(), CuotasError::InvalidConfig);
        require!(self.fee_bps as u64 <= bps_max, CuotasError::InvalidConfig);
        require!(
            self.penalty_bps as u64 <= bps_max,
            CuotasError::InvalidConfig
        );
        // The guarantor must be charged strictly after the grace window ends.
        require!(
            self.guarantor_charge_day > self.grace_days,
            CuotasError::InvalidConfig
        );
        require!(self.seconds_per_day > 0, CuotasError::InvalidConfig);

        for tier in self
            .guaranteed_tiers
            .iter()
            .chain(self.unguaranteed_tiers.iter())
        {
            require!(
                tier.down_payment_bps as u64 <= bps_max
                    && tier.interest_bps as u64 <= bps_max
                    && tier.guarantor_coverage_bps as u64 <= bps_max,
                CuotasError::InvalidConfig
            );
            require!(tier.max_purchase > 0, CuotasError::InvalidConfig);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::AnchorSerialize;

    fn valid_params() -> ConfigParams {
        let tier = TierParams {
            down_payment_bps: 3_000,
            max_purchase: 1_000_000_000,
            interest_bps: 0,
            guarantor_coverage_bps: 10_000,
        };
        ConfigParams {
            keeper: Pubkey::new_unique(),
            treasury: Pubkey::new_unique(),
            fee_bps: 700,
            penalty_bps: 500,
            grace_days: 5,
            guarantor_charge_day: 15,
            seconds_per_day: 86_400,
            min_financed_to_count: 100_000_000,
            guaranteed_tiers: [tier; 4],
            unguaranteed_tiers: [tier; 2],
        }
    }

    #[test]
    fn valid_params_pass() {
        assert!(valid_params().validate().is_ok());
    }

    #[test]
    fn rejects_bad_params() {
        let mut p = valid_params();
        p.fee_bps = 10_001;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guarantor_charge_day = p.grace_days;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.seconds_per_day = 0;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.keeper = Pubkey::default();
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guaranteed_tiers[0].down_payment_bps = 10_001;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.unguaranteed_tiers[1].max_purchase = 0;
        assert!(p.validate().is_err());
    }

    #[test]
    fn init_space_matches_borsh_layout() {
        let config = ProtocolConfig {
            admin: Pubkey::new_unique(),
            keeper: Pubkey::new_unique(),
            usdc_mint: Pubkey::new_unique(),
            treasury: Pubkey::new_unique(),
            fee_bps: 700,
            penalty_bps: 500,
            grace_days: 5,
            guarantor_charge_day: 15,
            seconds_per_day: 60,
            min_financed_to_count: 1,
            guaranteed_tiers: [TierParams {
                down_payment_bps: 3_000,
                max_purchase: 1,
                interest_bps: 0,
                guarantor_coverage_bps: 10_000,
            }; 4],
            unguaranteed_tiers: [TierParams {
                down_payment_bps: 5_000,
                max_purchase: 1,
                interest_bps: 0,
                guarantor_coverage_bps: 0,
            }; 2],
            state: ProtocolState::Normal,
            bump: 255,
        };
        let mut serialized = Vec::new();
        config.serialize(&mut serialized).unwrap();
        assert_eq!(serialized.len(), ProtocolConfig::INIT_SPACE);
    }

    #[test]
    fn state_gates() {
        assert!(ProtocolState::Normal.is_normal());
        assert!(!ProtocolState::Halted.is_normal());
        assert!(!ProtocolState::WithdrawsOnly.is_normal());
        assert!(ProtocolState::Normal.allows_withdrawals());
        assert!(ProtocolState::WithdrawsOnly.allows_withdrawals());
        assert!(!ProtocolState::Halted.allows_withdrawals());
    }
}
