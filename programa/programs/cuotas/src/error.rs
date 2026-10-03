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
}
