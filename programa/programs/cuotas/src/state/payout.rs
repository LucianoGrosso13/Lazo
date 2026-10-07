use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace, PartialEq, Eq, Debug)]
pub struct PayoutTranche {
    pub amount: u64,
    pub release_at: i64,
    pub released: bool,
}

#[account]
#[derive(InitSpace)]
pub struct PayoutSchedule {
    pub plan: Pubkey,
    pub merchant: Pubkey,
    pub tranche_count: u8,
    pub tranches: [PayoutTranche; 3],
    pub bump: u8,
}
