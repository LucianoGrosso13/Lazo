//! Decode `emit!` events out of transaction logs. Anchor serializes each
//! event as `sha256("event:<Name>")[..8] ++ borsh(fields)` and emits it via
//! `sol_log_data`, which lands in `meta.logs` as `Program data: <base64>`.
//! Events are part of the program's observable contract — the suites assert
//! amounts/flags independently of account state.

use anchor_lang::{AnchorDeserialize, Discriminator};
use base64::Engine;
use litesvm::types::TransactionMetadata;

/// Every event of type `T` emitted by the transaction, in emission order.
/// Non-matching `Program data:` lines (other events, CPI noise) are skipped.
pub fn emitted<T: AnchorDeserialize + Discriminator>(meta: &TransactionMetadata) -> Vec<T> {
    meta.logs
        .iter()
        .filter_map(|l| l.strip_prefix("Program data: "))
        .filter_map(|b64| base64::engine::general_purpose::STANDARD.decode(b64.trim()).ok())
        .filter(|raw| raw.starts_with(T::DISCRIMINATOR))
        .filter_map(|raw| T::try_from_slice(&raw[8..]).ok())
        .collect()
}

/// Exactly one event of type `T` — the common case for a single-op tx.
pub fn emitted_one<T: AnchorDeserialize + Discriminator>(meta: &TransactionMetadata) -> T {
    let mut all = emitted::<T>(meta);
    assert_eq!(all.len(), 1, "expected exactly one event in logs");
    all.pop().unwrap()
}
