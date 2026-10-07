pub mod constants;
pub mod error;
pub mod events;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;

declare_id!("E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ");

#[program]
pub mod cuotas {
    use super::*;

    /// One-time protocol bootstrap. The signer must be the program's upgrade
    /// authority (proven via the program -> ProgramData relationship) and
    /// becomes the admin; the devUSDC mint is pinned here forever.
    pub fn admin_init_config(ctx: Context<AdminInitConfig>, params: ConfigParams) -> Result<()> {
        instructions::admin_config::handle_admin_init_config(ctx, params)
    }

    /// Full-replacement config update (tier table, fees, keeper, treasury).
    /// Does not touch admin, usdc_mint, state or bump.
    pub fn admin_update_config(
        ctx: Context<AdminUpdateConfig>,
        params: ConfigParams,
    ) -> Result<()> {
        instructions::admin_config::handle_admin_update_config(ctx, params)
    }

    /// Move the protocol between Normal / Halted / WithdrawsOnly.
    pub fn admin_set_state(ctx: Context<AdminSetState>, state: ProtocolState) -> Result<()> {
        instructions::admin_set_state::handle_admin_set_state(ctx, state)
    }

    /// One-time pool bootstrap: Pool PDA + USDC vault + junior/senior LP mints.
    pub fn pool_init(ctx: Context<PoolInit>) -> Result<()> {
        instructions::pool_init::handle_pool_init(ctx)
    }

    /// Deposit USDC into a tranche; mints LP shares at the tranche NAV.
    /// Only in Normal state.
    pub fn lp_deposit(ctx: Context<LpDeposit>, tranche: Tranche, amount: u64) -> Result<()> {
        instructions::lp_deposit::handle_lp_deposit(ctx, tranche, amount)
    }

    /// Burn LP shares and withdraw USDC from the vault at the tranche NAV,
    /// reconciled with live mint supply before pricing. Limited to vault
    /// liquidity; accrued_fees is informational. Zero-payout burns are allowed so
    /// worthless shares can be retired. Allowed in Normal and WithdrawsOnly.
    pub fn lp_withdraw(ctx: Context<LpWithdraw>, tranche: Tranche, shares: u64) -> Result<()> {
        instructions::lp_withdraw::handle_lp_withdraw(ctx, tranche, shares)
    }

    /// PROVISIONAL cash-loss simulation: moves `amount` USDC from the vault
    /// to the treasury ATA and reduces tranche capital junior-first.
    /// Final cash-loss versus existing-credit write-off policy is pending.
    pub fn admin_apply_loss(ctx: Context<AdminApplyLoss>, amount: u64) -> Result<()> {
        instructions::admin_apply_loss::handle_admin_apply_loss(ctx, amount)
    }

    /// Admin registers a merchant; settlement must be the canonical USDC ATA.
    pub fn merchant_register(ctx: Context<MerchantRegister>) -> Result<()> {
        instructions::merchant_register::handle_merchant_register(ctx)
    }

    /// The student creates their own reputation account at tier 0.
    pub fn student_init_reputation(ctx: Context<StudentInitReputation>) -> Result<()> {
        instructions::student_init_reputation::handle_student_init_reputation(ctx)
    }

    /// Keeper registers a student's guarantee (post off-chain KYC + surety).
    /// `init` guarantees a single PDA per student — no unauthorized recreation.
    pub fn keeper_register_guarantee(
        ctx: Context<KeeperRegisterGuarantee>,
        max_purchase: u64,
        coverage_max: u64,
        mandate_hash: [u8; 32],
    ) -> Result<()> {
        instructions::keeper_guarantee::handle_keeper_register_guarantee(
            ctx,
            max_purchase,
            coverage_max,
            mandate_hash,
        )
    }

    /// Keeper rewrites guarantee terms; also the only way to re-activate a
    /// revoked guarantee (new mandate required).
    pub fn keeper_update_guarantee(
        ctx: Context<KeeperUpdateGuarantee>,
        max_purchase: u64,
        coverage_max: u64,
        mandate_hash: [u8; 32],
    ) -> Result<()> {
        instructions::keeper_guarantee::handle_keeper_update_guarantee(
            ctx,
            max_purchase,
            coverage_max,
            mandate_hash,
        )
    }

    /// Keeper revokes a guarantee (active = false). The account is kept for
    /// auditability and cannot be recreated.
    pub fn keeper_revoke_guarantee(ctx: Context<KeeperRevokeGuarantee>) -> Result<()> {
        instructions::keeper_guarantee::handle_keeper_revoke_guarantee(ctx)
    }

    /// Student opens a plan (3 or 6 installments): down payment to the merchant,
    /// pool advance minus the merchant fee, Plan PDA created. Normal state only.
    pub fn open_plan(ctx: Context<OpenPlan>, price: u64, installments: u8) -> Result<()> {
        instructions::open_plan::handle_open_plan(ctx, price, installments)
    }

    /// Student pays the first unresolved installment (principal + penalty).
    /// The quoted index, plan age and plan generation must match, or the
    /// payment is rejected. Closes the Plan on full settlement, tiering up
    /// counting plans.
    pub fn pay_installment(
        ctx: Context<PayInstallment>,
        expected_installment_index: u8,
        expected_opened_at: i64,
        expected_generation: u64,
    ) -> Result<()> {
        instructions::pay_installment::handle_pay_installment(
            ctx,
            expected_installment_index,
            expected_opened_at,
            expected_generation,
        )
    }

    /// Permissionless crank: fix the penalty on an installment past grace and
    /// disqualify the plan from tier-ups.
    pub fn crank_mark_late(ctx: Context<CrankMarkLate>, installment_index: u8) -> Result<()> {
        instructions::crank_mark_late::handle_crank_mark_late(ctx, installment_index)
    }

    /// Keeper deposits an off-chain guarantor charge into the vault and books
    /// it. First recovery charges one installment; a second one accelerates
    /// and charges everything left. Downgrades reputation; a charge on record
    /// bars new plans.
    pub fn keeper_register_recovery(
        ctx: Context<KeeperRegisterRecovery>,
        installment_index: u8,
        receipt_hash: [u8; 32],
    ) -> Result<()> {
        instructions::keeper_register_recovery::handle_keeper_register_recovery(
            ctx,
            installment_index,
            receipt_hash,
        )
    }
}
