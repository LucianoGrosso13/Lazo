//! Instruction builders bound to the real #[derive(Accounts)] layouts.
//! Each returns a well-formed instruction; negative tests corrupt a copy
//! (`.accounts[i].pubkey` or data) instead of using custom builders, so a
//! passing negative is never an artifact of the harness itself.

use anchor_lang::InstructionData;
use cuotas::instruction;
use cuotas::{ConfigParams, ProtocolState, Tranche};
use solana_address::Address;
use solana_instruction::account_meta::AccountMeta;
use solana_instruction::Instruction;
use solana_sdk_ids::system_program;

use crate::env::program_id;
use crate::pda;
use crate::spl::{ata, TOKEN_PROGRAM_ID};

fn ix(accounts: Vec<AccountMeta>, data: Vec<u8>) -> Instruction {
    Instruction { program_id: program_id(), accounts, data }
}

fn ro(pubkey: Address) -> AccountMeta {
    AccountMeta::new_readonly(pubkey, false)
}

fn rw(pubkey: Address) -> AccountMeta {
    AccountMeta::new(pubkey, false)
}

fn signer_ro(pubkey: Address) -> AccountMeta {
    AccountMeta::new_readonly(pubkey, true)
}

fn signer_rw(pubkey: Address) -> AccountMeta {
    AccountMeta::new(pubkey, true)
}

/// Accounts for AdminInitConfig: [admin(mut,sig), program(r), program_data(r),
/// config(w), usdc_mint(r), system_program]. The program/ProgramData pair
/// proves the signer is the program's upgrade authority.
pub fn admin_init_config(admin: &Address, usdc_mint: &Address, params: &ConfigParams) -> Instruction {
    ix(
        vec![
            signer_rw(*admin),
            ro(program_id()),
            ro(pda::program_data().0),
            rw(pda::config().0),
            ro(*usdc_mint),
            ro(system_program::ID),
        ],
        instruction::AdminInitConfig { params: params.clone() }.data(),
    )
}

/// [admin(sig), config(w)]
pub fn admin_update_config(admin: &Address, params: &ConfigParams) -> Instruction {
    ix(
        vec![signer_ro(*admin), rw(pda::config().0)],
        instruction::AdminUpdateConfig { params: params.clone() }.data(),
    )
}

/// [admin(sig), config(w)]
pub fn admin_set_state(admin: &Address, state: ProtocolState) -> Instruction {
    ix(
        vec![signer_ro(*admin), rw(pda::config().0)],
        instruction::AdminSetState { state }.data(),
    )
}

/// [admin(mut,sig), config(r), usdc_mint(r), pool(w), vault(w),
///  lp_junior_mint(w), lp_senior_mint(w), token_program(r), system_program(r)]
pub fn pool_init(admin: &Address, usdc_mint: &Address) -> Instruction {
    let (pool, _) = pda::pool(usdc_mint);
    ix(
        vec![
            signer_rw(*admin),
            ro(pda::config().0),
            ro(*usdc_mint),
            rw(pool),
            rw(pda::vault(&pool).0),
            rw(pda::lp_junior(&pool).0),
            rw(pda::lp_senior(&pool).0),
            ro(TOKEN_PROGRAM_ID),
            ro(system_program::ID),
        ],
        instruction::PoolInit.data(),
    )
}

fn lp_accounts(
    depositor: &Address,
    usdc_mint: &Address,
    tranche: Tranche,
) -> (Address, Address, Address, Address, Address) {
    let pool = pda::pool(usdc_mint).0;
    let lp_mint = match tranche {
        Tranche::Junior => pda::lp_junior(&pool).0,
        Tranche::Senior => pda::lp_senior(&pool).0,
    };
    (
        pool,
        pda::vault(&pool).0,
        lp_mint,
        ata(depositor, usdc_mint, &TOKEN_PROGRAM_ID),
        ata(depositor, &lp_mint, &TOKEN_PROGRAM_ID),
    )
}

/// [depositor(mut,sig), config(r), pool(w), usdc_mint(r), vault(w), lp_mint(w),
///  depositor_usdc_ata(w), depositor_lp_ata(w), token_program(r)]
pub fn lp_deposit(depositor: &Address, usdc_mint: &Address, tranche: Tranche, amount: u64) -> Instruction {
    let (pool, vault, lp_mint, dep_usdc, dep_lp) = lp_accounts(depositor, usdc_mint, tranche);
    ix(
        vec![
            signer_rw(*depositor),
            ro(pda::config().0),
            rw(pool),
            ro(*usdc_mint),
            rw(vault),
            rw(lp_mint),
            rw(dep_usdc),
            rw(dep_lp),
            ro(TOKEN_PROGRAM_ID),
        ],
        instruction::LpDeposit { tranche, amount }.data(),
    )
}

/// Same account layout as lp_deposit.
pub fn lp_withdraw(depositor: &Address, usdc_mint: &Address, tranche: Tranche, shares: u64) -> Instruction {
    let (pool, vault, lp_mint, dep_usdc, dep_lp) = lp_accounts(depositor, usdc_mint, tranche);
    ix(
        vec![
            signer_rw(*depositor),
            ro(pda::config().0),
            rw(pool),
            ro(*usdc_mint),
            rw(vault),
            rw(lp_mint),
            rw(dep_usdc),
            rw(dep_lp),
            ro(TOKEN_PROGRAM_ID),
        ],
        instruction::LpWithdraw { tranche, shares }.data(),
    )
}

/// [admin(sig), config(r), pool(w), usdc_mint(r), vault(w),
///  treasury_ata(w), token_program(r)] — the loss is real cash moved from
/// the vault to the treasury ATA ("cash simulation" accounting).
pub fn admin_apply_loss(admin: &Address, usdc_mint: &Address, treasury: &Address, amount: u64) -> Instruction {
    let pool = pda::pool(usdc_mint).0;
    ix(
        vec![
            signer_ro(*admin),
            ro(pda::config().0),
            rw(pool),
            ro(*usdc_mint),
            rw(pda::vault(&pool).0),
            rw(ata(treasury, usdc_mint, &TOKEN_PROGRAM_ID)),
            ro(TOKEN_PROGRAM_ID),
        ],
        instruction::AdminApplyLoss { amount }.data(),
    )
}

/// [admin(mut,sig), config(r), merchant_wallet(r), usdc_mint(r),
///  settlement_ata(r), merchant(w), system_program(r)]
pub fn merchant_register(admin: &Address, merchant_wallet: &Address, usdc_mint: &Address) -> Instruction {
    ix(
        vec![
            signer_rw(*admin),
            ro(pda::config().0),
            ro(*merchant_wallet),
            ro(*usdc_mint),
            ro(ata(merchant_wallet, usdc_mint, &TOKEN_PROGRAM_ID)),
            rw(pda::merchant(merchant_wallet).0),
            ro(system_program::ID),
        ],
        instruction::MerchantRegister.data(),
    )
}

/// [student(mut,sig), config(r), reputation(w), system_program(r)]
pub fn student_init_reputation(student: &Address) -> Instruction {
    ix(
        vec![
            signer_rw(*student),
            ro(pda::config().0),
            rw(pda::reputation(student).0),
            ro(system_program::ID),
        ],
        instruction::StudentInitReputation.data(),
    )
}

/// [keeper(mut,sig), config(r), student(r), guarantee(w), system_program(r)]
pub fn keeper_register_guarantee(
    keeper: &Address,
    student: &Address,
    max_purchase: u64,
    coverage_max: u64,
    mandate_hash: [u8; 32],
) -> Instruction {
    ix(
        vec![
            signer_rw(*keeper),
            ro(pda::config().0),
            ro(*student),
            rw(pda::guarantee(student).0),
            ro(system_program::ID),
        ],
        instruction::KeeperRegisterGuarantee { max_purchase, coverage_max, mandate_hash }.data(),
    )
}

/// [keeper(sig), config(r), student(r), guarantee(w), reputation(r)]
/// The reputation account gates term rewrites on `active_exposure == 0`.
pub fn keeper_update_guarantee(
    keeper: &Address,
    student: &Address,
    max_purchase: u64,
    coverage_max: u64,
    mandate_hash: [u8; 32],
) -> Instruction {
    ix(
        vec![
            signer_ro(*keeper),
            ro(pda::config().0),
            ro(*student),
            rw(pda::guarantee(student).0),
            ro(pda::reputation(student).0),
        ],
        instruction::KeeperUpdateGuarantee { max_purchase, coverage_max, mandate_hash }.data(),
    )
}

/// [keeper(sig), config(r), student(r), guarantee(w)]
pub fn keeper_revoke_guarantee(keeper: &Address, student: &Address) -> Instruction {
    ix(
        vec![
            signer_ro(*keeper),
            ro(pda::config().0),
            ro(*student),
            rw(pda::guarantee(student).0),
        ],
        instruction::KeeperRevokeGuarantee.data(),
    )
}

/// Build an instruction with attacker-chosen data on the lp_deposit entrypoint
/// (used to probe enum-discriminant / arg validation).
pub fn lp_deposit_raw(depositor: &Address, usdc_mint: &Address, tranche: Tranche, data: Vec<u8>) -> Instruction {
    let (pool, vault, lp_mint, dep_usdc, dep_lp) = lp_accounts(depositor, usdc_mint, tranche);
    ix(
        vec![
            signer_rw(*depositor),
            ro(pda::config().0),
            rw(pool),
            ro(*usdc_mint),
            rw(vault),
            rw(lp_mint),
            rw(dep_usdc),
            rw(dep_lp),
            ro(TOKEN_PROGRAM_ID),
        ],
        data,
    )
}
