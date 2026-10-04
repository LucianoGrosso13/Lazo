//! Shared harness for the cuotas LiteSVM acceptance suite.
//!
//! Everything here executes the real compiled program (`target/deploy/cuotas.so`)
//! inside an in-process SVM. No mocks of the program under test.

pub mod env;
pub mod err;
pub mod ix;
pub mod pda;
pub mod spec;
pub mod spl;
