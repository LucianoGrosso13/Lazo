//! Classic SPL Token state packing and instruction encoding, written by hand
//! so the suite needs no spl-token crate. Layouts are the on-chain wire format
//! of spl-token (frozen for years), not a mirror of the program under test.

use solana_address::{address, Address};
use solana_instruction::account_meta::AccountMeta;
use solana_instruction::Instruction;

/// Classic SPL Token program.
pub const TOKEN_PROGRAM_ID: Address = address!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
/// Associated Token Account program.
pub const ATA_PROGRAM_ID: Address = address!("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
/// Token-2022 program (used to test that the program rejects or accepts
/// whichever variant its token_interface is bound to).
pub const TOKEN_2022_PROGRAM_ID: Address =
    address!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

pub const MINT_LEN: usize = 82;
pub const TOKEN_ACCOUNT_LEN: usize = 165;

/// spl-token instruction discriminants (single-byte tag + borsh-free layout).
pub mod tag {
    pub const INITIALIZE_MINT2: u8 = 20;
    pub const INITIALIZE_ACCOUNT3: u8 = 18;
    pub const MINT_TO: u8 = 7;
    pub const TRANSFER: u8 = 3;
    pub const TRANSFER_CHECKED: u8 = 12;
    pub const BURN: u8 = 8;
    pub const BURN_CHECKED: u8 = 15;
    pub const CLOSE_ACCOUNT: u8 = 9;
}

/// COption<Pubkey> in the spl-token wire layout is ALWAYS 36 bytes:
/// u32 tag (0=None, 1=Some) followed by 32 bytes (zeroed when None).
fn pack_coption_pubkey(value: Option<&Address>, out: &mut Vec<u8>) {
    match value {
        Some(pk) => {
            out.extend_from_slice(&1u32.to_le_bytes());
            out.extend_from_slice(&pk.to_bytes());
        }
        None => {
            out.extend_from_slice(&0u32.to_le_bytes());
            out.extend_from_slice(&[0u8; 32]);
        }
    }
}

/// Pack an spl-token `Mint` account (82 bytes).
/// COption<Pubkey> mint_authority | u64 supply | u8 decimals | u8 is_initialized
/// | COption<Pubkey> freeze_authority
pub fn pack_mint(
    mint_authority: Option<&Address>,
    supply: u64,
    decimals: u8,
    freeze_authority: Option<&Address>,
) -> Vec<u8> {
    let mut d = Vec::with_capacity(MINT_LEN);
    pack_coption_pubkey(mint_authority, &mut d);
    d.extend_from_slice(&supply.to_le_bytes());
    d.push(decimals);
    d.push(1); // is_initialized
    pack_coption_pubkey(freeze_authority, &mut d);
    debug_assert_eq!(d.len(), MINT_LEN);
    d
}

/// Pack an spl-token `Account` (165 bytes), initialized, no delegate, no
/// close authority, not native.
/// mint(32) | owner(32) | u64 amount | COption<Pubkey> delegate(36) | u8 state
/// | COption<u64> is_native(12) | u64 delegated_amount | COption<Pubkey> close_authority(36)
pub fn pack_token_account(mint: &Address, owner: &Address, amount: u64) -> Vec<u8> {
    let mut d = Vec::with_capacity(TOKEN_ACCOUNT_LEN);
    d.extend_from_slice(&mint.to_bytes());
    d.extend_from_slice(&owner.to_bytes());
    d.extend_from_slice(&amount.to_le_bytes());
    pack_coption_pubkey(None, &mut d); // delegate
    d.push(1); // state: initialized
    d.extend_from_slice(&0u32.to_le_bytes()); // is_native: none tag
    d.extend_from_slice(&0u64.to_le_bytes()); // is_native payload
    d.extend_from_slice(&0u64.to_le_bytes()); // delegated_amount
    pack_coption_pubkey(None, &mut d); // close_authority
    debug_assert_eq!(d.len(), TOKEN_ACCOUNT_LEN);
    d
}

// ---- readers ----------------------------------------------------------------

pub fn token_amount(data: &[u8]) -> u64 {
    u64::from_le_bytes(data[64..72].try_into().unwrap())
}

pub fn token_owner(data: &[u8]) -> Address {
    Address::new_from_array(data[32..64].try_into().unwrap())
}

pub fn token_mint(data: &[u8]) -> Address {
    Address::new_from_array(data[0..32].try_into().unwrap())
}

pub fn mint_supply(data: &[u8]) -> u64 {
    u64::from_le_bytes(data[36..44].try_into().unwrap())
}

pub fn mint_decimals(data: &[u8]) -> u8 {
    data[44]
}

/// Mint authority of a packed mint, if present.
pub fn mint_authority(data: &[u8]) -> Option<Address> {
    if u32::from_le_bytes(data[0..4].try_into().unwrap()) == 1 {
        Some(Address::new_from_array(data[4..36].try_into().unwrap()))
    } else {
        None
    }
}

// ---- addresses --------------------------------------------------------------

/// Associated token account address for (owner, mint, token_program).
/// Derivation is the canonical ATA formula, independent of the program crate.
pub fn ata(owner: &Address, mint: &Address, token_program: &Address) -> Address {
    Address::find_program_address(
        &[owner.as_ref(), token_program.as_ref(), mint.as_ref()],
        &ATA_PROGRAM_ID,
    )
    .0
}

// ---- instruction encoders ----------------------------------------------------

/// spl-token `Burn` (tag 8): burn `amount` of `mint` held in `account`,
/// signed by the token-account `owner`.
pub fn burn_ix(account: &Address, mint: &Address, owner: &Address, amount: u64) -> Instruction {
    let mut data = Vec::with_capacity(9);
    data.push(tag::BURN);
    data.extend_from_slice(&amount.to_le_bytes());
    Instruction {
        program_id: TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*account, false),
            AccountMeta::new(*mint, false),
            AccountMeta::new_readonly(*owner, true),
        ],
        data,
    }
}

/// spl-token `Transfer` (tag 3): raw transfer between two accounts of the
/// same mint. Used by attacker/conservation tests, not by the program.
pub fn transfer_ix(
    source: &Address,
    destination: &Address,
    owner: &Address,
    amount: u64,
) -> Instruction {
    let mut data = Vec::with_capacity(9);
    data.push(tag::TRANSFER);
    data.extend_from_slice(&amount.to_le_bytes());
    Instruction {
        program_id: TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*source, false),
            AccountMeta::new(*destination, false),
            AccountMeta::new_readonly(*owner, true),
        ],
        data,
    }
}

/// spl-token `MintTo` (tag 7): only valid while a test-controlled mint
/// authority exists (e.g. a rogue mint used to probe mint constraints).
pub fn mint_to_ix(mint: &Address, account: &Address, authority: &Address, amount: u64) -> Instruction {
    let mut data = Vec::with_capacity(9);
    data.push(tag::MINT_TO);
    data.extend_from_slice(&amount.to_le_bytes());
    Instruction {
        program_id: TOKEN_PROGRAM_ID,
        accounts: vec![
            AccountMeta::new(*mint, false),
            AccountMeta::new(*account, false),
            AccountMeta::new_readonly(*authority, true),
        ],
        data,
    }
}
