use anchor_lang::prelude::*;

/// On-chain student reputation, PDA ["reputation", student_wallet].
/// Stores only the tier and counters — never purchase details (privacy decision).
#[account]
#[derive(InitSpace)]
pub struct Reputation {
    /// Ladder position on the guaranteed track (0-3).
    pub tier: u8,
    /// Plans that count toward tier-ups (>= min_financed_to_count, paid within grace).
    pub plans_completed: u32,
    /// Overdue installments that were charged to the guarantor.
    pub late_count: u32,
    /// USDC base units currently outstanding for this student.
    pub active_exposure: u64,
    pub bump: u8,
}
