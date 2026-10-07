use anchor_lang::prelude::*;

#[error_code]
pub enum CuotasError {
    #[msg("Signer is not the protocol admin stored in ProtocolConfig")]
    NotAdmin,
    #[msg("Signer is not the keeper stored in ProtocolConfig")]
    NotKeeper,
    #[msg("Protocol state is not Normal: origination and deposits are paused")]
    ProtocolNotNormal,
    #[msg("Protocol is halted: withdrawals are disabled")]
    ProtocolHalted,
    #[msg("USDC mint must have exactly 6 decimals")]
    InvalidMintDecimals,
    #[msg("Mint does not match the usdc_mint stored in ProtocolConfig")]
    InvalidUsdcMint,
    #[msg("Token account is not the canonical associated token account")]
    NotCanonicalAta,
    #[msg("Token account mint or owner does not match the expected values")]
    TokenAccountMismatch,
    #[msg("Account or program is not bound to the classic SPL Token program")]
    InvalidTokenProgram,
    #[msg("LP mint does not match the requested tranche")]
    WrongLpMint,
    #[msg("Invalid protocol config parameter")]
    InvalidConfig,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Shares must be greater than zero")]
    ZeroShares,
    #[msg("Deposit is too small: it would mint zero shares")]
    DepositTooSmall,
    #[msg("Tranche does not have that many shares outstanding")]
    InsufficientShares,
    #[msg("Withdrawal exceeds the vault liquidity available to LPs")]
    InsufficientLiquidity,
    #[msg("Loss exceeds the total junior + senior capital in the pool")]
    LossExceedsCapital,
    #[msg("Tranche capital was wiped out by losses and cannot take new deposits")]
    TrancheWipedOut,
    #[msg("Tranche has capital but no LP shares; deposits rejected to protect orphaned NAV")]
    OrphanedCapital,
    #[msg("LP mint supply exceeds recorded shares; pool accounting is inconsistent")]
    LpSupplyMismatch,
    #[msg("max_purchase and coverage_max must be greater than zero and mandate_hash nonzero")]
    InvalidGuaranteeParams,
    #[msg("Guarantee terms cannot be rewritten while the student has active exposure")]
    GuaranteeTermsLocked,
    #[msg("Signer is not the program's current upgrade authority")]
    NotUpgradeAuthority,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Deposit amount cannot be represented exactly by whole LP shares")]
    UnrepresentableDeposit,
    #[msg("Guarantee update requires a mandate hash different from the stored hash")]
    MandateHashUnchanged,
    #[msg("A gain cannot be allocated without positive tranche capital")]
    NoCapitalForGain,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Price exceeds the tier max_purchase")]
    PriceExceedsTierMax,
    #[msg("Price exceeds the guarantor's chosen max_purchase")]
    PriceExceedsGuarantorMax,
    #[msg("Required guarantor coverage exceeds the guarantee coverage_max")]
    InsufficientGuaranteeCoverage,
    #[msg("Student has a guarantor charge on record and cannot open new plans")]
    BlockedFromNewPlans,
    #[msg("Reputation tier is outside the guaranteed track (0-3)")]
    InvalidReputationTier,
    #[msg("Merchant is not active")]
    MerchantInactive,
    #[msg("Installment index is outside the fixed 3-installment schedule")]
    InvalidInstallmentIndex,
    #[msg("Installment is already paid or charged to the guarantor")]
    InstallmentAlreadyResolved,
    #[msg("Installment is not past the grace window yet")]
    MarkTooEarly,
    #[msg("Installment was already marked late")]
    AlreadyMarkedLate,
    #[msg("Installment is not past the guarantor charge day yet")]
    RecoveryTooEarly,
    #[msg("Plan has no unpaid installments")]
    NothingDue,
    #[msg("Expected installment index does not match the plan's first unpaid installment")]
    StaleInstallmentIndex,
    #[msg("Plan opened_at does not match the expected value; stale transaction")]
    StalePlan,
    #[msg("Receipt hash must be nonzero")]
    InvalidReceiptHash,
    #[msg("Receipt hash was already recorded on this plan")]
    ReceiptAlreadyUsed,
    #[msg("Recovery requires a plan backed by an active guarantee")]
    PlanNotGuaranteed,
    #[msg("An active guarantee is required to open a plan")]
    GuarantorRequired,
    #[msg("Purchase price is below the minimum for the selected plan option")]
    BelowOptionMin,
    #[msg("The requested installment option is not available or enabled")]
    OptionUnavailable,
}
