use anchor_lang::prelude::*;

use crate::constants::{BPS_DENOMINATOR, MAX_PLAN_INTEREST_BPS};
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
    /// Required guarantor coverage, fixed at 10,000 bps (the full balance).
    pub guarantor_coverage_bps: u16,
}

/// An installment option offered by the protocol (e.g. 3 installments 0 bps, 6 installments 300 bps).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct PlanOption {
    /// Number of installments (e.g. 3 or 6).
    pub installments: u8,
    /// Total interest charged over the financed amount, in bps.
    pub interest_total_bps: u16,
    /// Minimum purchase price required for this option, in USDC base units (0 = no minimum).
    pub min_price: u64,
    /// Whether this option is enabled.
    pub enabled: bool,
}

/// Merchant settlement terms. `days` selects the delayed settlement window;
/// the tranche count and fee are fixed by protocol config.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct SettlementOption {
    pub days: u16,
    pub tranches: u8,
    pub fee_bps: u16,
    pub enabled: bool,
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
    /// Treasury destination for the provisional cash-loss simulation.
    pub treasury: Pubkey,
    /// Merchant fee in bps charged over the financed amount.
    pub fee_bps: u16,
    /// Fixed penalty in bps over an overdue installment.
    pub penalty_bps: u16,
    /// Days of grace after a due date before penalties apply.
    pub grace_days: u8,
    /// Day on which the guarantor is charged for an overdue installment.
    pub guarantor_charge_day: u8,
    /// Day on which the guarantor is notified about an overdue installment
    /// (ahead of the charge day).
    pub guarantor_notice_day: u8,
    /// Seconds that make one protocol "day". Short in demos, 86400 in production.
    pub seconds_per_day: u32,
    /// Days between installments: due[i] = opened_at + (i+1) * this * spd.
    /// Client-seeded at init; tunable via config update. Must be positive.
    pub installment_interval_days: u16,
    /// Minimum financed amount (USDC base units) for a plan to count toward tier-ups.
    pub min_financed_to_count: u64,
    /// Ladder for students with a guarantor (tiers 0-3).
    pub guaranteed_tiers: [TierParams; 4],
    /// Plan options offered (3 or 6 installments).
    pub plan_options: [PlanOption; 2],
    pub settlement_options: [SettlementOption; 4],
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
    pub guarantor_notice_day: u8,
    pub seconds_per_day: u32,
    pub installment_interval_days: u16,
    pub min_financed_to_count: u64,
    pub guaranteed_tiers: [TierParams; 4],
    pub plan_options: [PlanOption; 2],
    pub settlement_options: [SettlementOption; 4],
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
        // The guarantor notice must be a real day strictly before the charge.
        require!(
            self.guarantor_notice_day > 0 && self.guarantor_notice_day < self.guarantor_charge_day,
            CuotasError::InvalidConfig
        );
        require!(self.seconds_per_day > 0, CuotasError::InvalidConfig);
        require!(
            self.installment_interval_days > 0,
            CuotasError::InvalidConfig
        );

        for tier in self.guaranteed_tiers.iter() {
            require!(
                tier.down_payment_bps as u64 <= bps_max
                    && tier.interest_bps as u64 <= bps_max
                    && tier.guarantor_coverage_bps as u64 == bps_max,
                CuotasError::InvalidConfig
            );
            require!(tier.max_purchase > 0, CuotasError::InvalidConfig);
        }

        for (i, opt) in self.plan_options.iter().enumerate() {
            require!(
                opt.interest_total_bps as u64 <= u64::from(MAX_PLAN_INTEREST_BPS),
                CuotasError::InvalidConfig
            );
            require!(
                opt.installments == 3 || opt.installments == 6,
                CuotasError::InvalidConfig
            );
            require!(
                !self.plan_options[..i]
                    .iter()
                    .any(|prior| prior.installments == opt.installments),
                CuotasError::InvalidConfig
            );
        }
        for (i, opt) in self.settlement_options.iter().enumerate() {
            require!(
                opt.tranches <= 3 && opt.fee_bps as u64 <= bps_max,
                CuotasError::InvalidConfig
            );
            require!(
                if opt.days == 0 {
                    opt.tranches == 0
                } else {
                    opt.tranches > 0
                        && u32::from(opt.days)
                            == u32::from(opt.tranches) * u32::from(self.installment_interval_days)
                },
                CuotasError::InvalidConfig
            );
            require!(
                !self.settlement_options[..i]
                    .iter()
                    .any(|prior| prior.days == opt.days),
                CuotasError::InvalidConfig
            );
        }
        require!(
            self.settlement_options
                .iter()
                .any(|o| o.days == 0 && o.enabled),
            CuotasError::InvalidConfig
        );
        // Three installments remain the baseline option and cannot be disabled.
        require!(
            self.plan_options
                .iter()
                .any(|opt| opt.installments == 3 && opt.enabled),
            CuotasError::InvalidConfig
        );

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
        let options = [
            PlanOption {
                installments: 3,
                interest_total_bps: 0,
                min_price: 0,
                enabled: true,
            },
            PlanOption {
                installments: 6,
                interest_total_bps: 300,
                min_price: 350_000_000,
                enabled: true,
            },
        ];
        let settlement_options = [
            SettlementOption {
                days: 0,
                tranches: 0,
                fee_bps: 700,
                enabled: true,
            },
            SettlementOption {
                days: 30,
                tranches: 1,
                fee_bps: 625,
                enabled: true,
            },
            SettlementOption {
                days: 60,
                tranches: 2,
                fee_bps: 575,
                enabled: true,
            },
            SettlementOption {
                days: 90,
                tranches: 3,
                fee_bps: 525,
                enabled: true,
            },
        ];
        ConfigParams {
            keeper: Pubkey::new_unique(),
            treasury: Pubkey::new_unique(),
            fee_bps: 700,
            penalty_bps: 500,
            grace_days: 5,
            guarantor_charge_day: 15,
            guarantor_notice_day: 3,
            seconds_per_day: 86_400,
            installment_interval_days: 30,
            min_financed_to_count: 100_000_000,
            guaranteed_tiers: [tier; 4],
            plan_options: options,
            settlement_options,
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
        p.installment_interval_days = 0;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guarantor_notice_day = 0;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guarantor_notice_day = p.guarantor_charge_day;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guarantor_notice_day = p.guarantor_charge_day + 1;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.keeper = Pubkey::default();
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guaranteed_tiers[0].down_payment_bps = 10_001;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guaranteed_tiers[1].max_purchase = 0;
        assert!(p.validate().is_err());

        // plan_options validations
        let mut p = valid_params();
        p.plan_options[0].interest_total_bps = 10_001;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[1].interest_total_bps = MAX_PLAN_INTEREST_BPS + 1;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[0].installments = 0;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[0].installments = 7;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[1].installments = 4;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[1].installments = 3;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.plan_options[0].enabled = false;
        assert!(p.validate().is_err());

        let mut p = valid_params();
        p.guaranteed_tiers[2].guarantor_coverage_bps = 9_999;
        assert!(p.validate().is_err());

        // missing 3-installment option
        let mut p = valid_params();
        p.plan_options[0].installments = 6;
        assert!(p.validate().is_err());
    }

    #[test]
    fn notice_day_unbounded_by_grace() {
        // grace=0 is a previously-valid config and must stay valid: the
        // notice window only orders against the charge day.
        let mut p = valid_params();
        p.grace_days = 0;
        p.guarantor_charge_day = 2;
        p.guarantor_notice_day = 1;
        assert!(p.validate().is_ok());

        let mut p = valid_params();
        p.guarantor_notice_day = 7; // > grace_days is allowed
        assert!(p.validate().is_ok());
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
            guarantor_notice_day: 3,
            seconds_per_day: 60,
            installment_interval_days: 30,
            min_financed_to_count: 1,
            guaranteed_tiers: [TierParams {
                down_payment_bps: 3_000,
                max_purchase: 1,
                interest_bps: 0,
                guarantor_coverage_bps: 10_000,
            }; 4],
            plan_options: [
                PlanOption {
                    installments: 3,
                    interest_total_bps: 0,
                    min_price: 0,
                    enabled: true,
                },
                PlanOption {
                    installments: 6,
                    interest_total_bps: 300,
                    min_price: 350_000_000,
                    enabled: true,
                },
            ],
            settlement_options: [
                SettlementOption {
                    days: 0,
                    tranches: 0,
                    fee_bps: 700,
                    enabled: true,
                },
                SettlementOption {
                    days: 30,
                    tranches: 1,
                    fee_bps: 625,
                    enabled: true,
                },
                SettlementOption {
                    days: 60,
                    tranches: 2,
                    fee_bps: 575,
                    enabled: true,
                },
                SettlementOption {
                    days: 90,
                    tranches: 3,
                    fee_bps: 525,
                    enabled: true,
                },
            ],
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
