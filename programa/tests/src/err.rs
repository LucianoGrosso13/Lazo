//! Transaction outcome handling and error extraction for negative tests.

use litesvm::types::{FailedTransactionMetadata, TransactionMetadata};
use solana_instruction::Instruction;
use solana_instruction_error::InstructionError;
use solana_transaction_error::TransactionError;

/// Uniform wrapper over litesvm's send/simulate results.
#[derive(Debug)]
pub enum TxOutcome {
    Ok(TransactionMetadata),
    Err(FailedTransactionMetadata),
}

impl From<Result<TransactionMetadata, FailedTransactionMetadata>> for TxOutcome {
    fn from(r: Result<TransactionMetadata, FailedTransactionMetadata>) -> Self {
        match r {
            Ok(m) => TxOutcome::Ok(m),
            Err(e) => TxOutcome::Err(e),
        }
    }
}

impl TxOutcome {
    pub fn is_ok(&self) -> bool {
        matches!(self, TxOutcome::Ok(_))
    }

    /// Assert the transaction succeeded; on failure dump the program logs so
    /// the test output shows *why*.
    pub fn expect_ok(&self, ctx: &str) -> &TransactionMetadata {
        match self {
            TxOutcome::Ok(m) => m,
            TxOutcome::Err(e) => panic!(
                "{ctx}: expected success, got {:?}\nlogs:\n{}",
                e.err,
                e.meta.logs.join("\n")
            ),
        }
    }

    /// Assert the transaction failed; returns the failure for further
    /// error-code assertions.
    pub fn expect_err(&self, ctx: &str) -> &FailedTransactionMetadata {
        match self {
            TxOutcome::Err(e) => e,
            TxOutcome::Ok(m) => panic!(
                "{ctx}: expected failure but transaction succeeded\nlogs:\n{}",
                m.logs.join("\n")
            ),
        }
    }
}

/// Extract the `InstructionError::Custom(code)` produced by the cuotas program
/// (index 0 = first ix; pass the index of the program ix in the transaction).
/// Anchor framework errors land in the 2xxx range, user `#[error_code]`
/// variants at 6000+, raw `ProgramError`/`InstructionError` otherwise.
pub fn custom_code(f: &FailedTransactionMetadata, ix_index: usize) -> Option<u32> {
    match &f.err {
        TransactionError::InstructionError(idx, InstructionError::Custom(code)) => {
            if *idx as usize == ix_index {
                Some(*code)
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Assert failure carrying a specific custom error code from instruction
/// `ix_index` (usually 0 when the transaction has a single ix).
pub fn expect_custom(f: &FailedTransactionMetadata, code: u32, ctx: &str) {
    match custom_code(f, 0) {
        Some(c) if c == code => {}
        other => panic!(
            "{ctx}: expected custom error {code}, got {:?}\nlogs:\n{}",
            other,
            f.meta.logs.join("\n")
        ),
    }
}

/// True if the failure is any InstructionError::Custom — i.e. the program
/// rejected on purpose rather than a runtime/accounting fault.
pub fn is_custom_error(f: &FailedTransactionMetadata) -> bool {
    matches!(
        f.err,
        TransactionError::InstructionError(_, InstructionError::Custom(_))
    )
}

/// Assert failure of *any* kind tied to instruction `ix_index` in `ixs`
/// (constraint violation, missing signer, custom error, etc.). Prefer this
/// over `expect_err` when the exact code is implementation-defined — the point
/// is that the tx must not succeed.
pub fn expect_instruction_failure(f: &FailedTransactionMetadata, ctx: &str) {
    match &f.err {
        TransactionError::InstructionError(_, _) => {}
        other => panic!(
            "{ctx}: expected instruction failure, got {:?}\nlogs:\n{}",
            other,
            f.meta.logs.join("\n")
        ),
    }
}

/// Helper to find the index of our program's instruction inside a tx built
/// with `env.send` — the program ix is always the last one we append in
/// helpers, so suites pass 0/1 explicitly when they craft multi-ix txs.
pub fn find_program_ix(ixs: &[Instruction], program: &solana_address::Address) -> usize {
    ixs.iter()
        .position(|i| &i.program_id == program)
        .expect("program instruction not in tx")
}

/// `expect_custom` variant for multi-instruction transactions.
pub fn expect_custom_at(f: &FailedTransactionMetadata, ix_index: usize, code: u32, ctx: &str) {
    match custom_code(f, ix_index) {
        Some(c) if c == code => {}
        other => panic!(
            "{ctx}: expected custom error {code} at ix {ix_index}, got {:?}\nlogs:\n{}",
            other,
            f.meta.logs.join("\n")
        ),
    }
}

/// Custom error code for a CuotasError variant (anchor #[error_code] maps
/// variants to ERROR_CODE_OFFSET + ordinal = 6000 + i).
pub fn cuotas_code(e: cuotas::CuotasError) -> u32 {
    6000 + e as u32
}

/// Assert the transaction failed with a specific CuotasError at ix 0.
pub fn expect_cuotas_err<'a>(
    outcome: &'a TxOutcome,
    e: cuotas::CuotasError,
    ctx: &str,
) -> &'a FailedTransactionMetadata {
    let f = outcome.expect_err(ctx);
    expect_custom(f, cuotas_code(e), ctx);
    f
}
