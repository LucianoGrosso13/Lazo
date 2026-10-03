//! Acceptance: pool_init, lp_deposit, lp_withdraw.
//! Economics: NAV-based share minting/burning, floors in favor of the pool,
//! tranche independence, liquidity gating and state gating.

use cuotas::{CuotasError, ProtocolState, Tranche};
use cuotas_tests::env::{Env, USDC};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, pda, spec, spl};
use solana_address::Address;
use solana_signer::Signer;

// ---------- helpers ----------

/// Fund `kp`'s canonical USDC ATA and create its canonical ATA for `lp_mint`.
fn lp_ready(env: &mut Env, kp_addr: &Address, usdc: u64, lp_mint: &Address) -> (Address, Address) {
    let usdc_ata = env.make_ata(kp_addr, &{env.usdc_mint}, usdc);
    let lp_ata = env.make_ata(kp_addr, lp_mint, 0);
    (usdc_ata, lp_ata)
}

fn deposit(kp: &solana_keypair::Keypair, env: &mut Env, tranche: Tranche, amount: u64) -> cuotas_tests::err::TxOutcome {
    let i = ix::lp_deposit(&kp.pubkey(), &{env.usdc_mint}, tranche, amount);
    env.send(&[i], kp, &[])
}

fn withdraw(kp: &solana_keypair::Keypair, env: &mut Env, tranche: Tranche, shares: u64) -> cuotas_tests::err::TxOutcome {
    let i = ix::lp_withdraw(&kp.pubkey(), &{env.usdc_mint}, tranche, shares);
    env.send(&[i], kp, &[])
}

// ---------- pool_init ----------

#[test]
fn pool_init_creates_vault_and_lp_mints() {
    let mut env = Env::new();
    env.init_config().expect_ok("config");
    let p = env.protocol();
    env.init_pool().expect_ok("pool_init");

    let pool = env.pool();
    assert_eq!(pool.junior_shares, 0);
    assert_eq!(pool.senior_shares, 0);
    assert_eq!(pool.junior_capital, 0);
    assert_eq!(pool.senior_capital, 0);
    assert_eq!(pool.outstanding_credit, 0);
    assert_eq!(pool.accrued_fees, 0);
    assert_eq!(pool.bump, pda::pool(&{env.usdc_mint}).1);

    // vault: mint = usdc, authority = pool PDA, balance 0
    let vault_data = env.account_data(&p.vault);
    assert_eq!(spl::token_mint(&vault_data), env.usdc_mint);
    assert_eq!(spl::token_owner(&vault_data), p.pool);
    assert_eq!(spl::token_amount(&vault_data), 0);

    // LP mints: decimals 6, mint authority = pool, supply 0
    for lp in [p.lp_junior, p.lp_senior] {
        let m = env.account_data(&lp);
        assert_eq!(spl::mint_decimals(&m), 6);
        assert_eq!(spl::mint_supply(&m), 0);
        assert_eq!(spl::mint_authority(&m), Some(p.pool));
    }
}

#[test]
fn pool_init_rejects_non_admin() {
    let mut env = Env::new();
    env.init_config().expect_ok("config");
    for kp_name in ["attacker", "keeper"] {
        let kp = if kp_name == "attacker" { env.actors.attacker.insecure_clone() } else { env.actors.keeper.insecure_clone() };
        let i = ix::pool_init(&kp.pubkey(), &{env.usdc_mint});
        let out = env.send(&[i], &kp, &[]);
        expect_cuotas_err(&out, CuotasError::NotAdmin, "pool_init impostor");
    }
}

#[test]
fn pool_init_rejects_wrong_mint_and_wrong_token_program() {
    let mut env = Env::new();
    env.init_config().expect_ok("config");
    let admin = env.actors.admin.pubkey();

    // another classic 6-decimals mint that is not the configured one
    let other_mint = Address::new_unique();
    env.svm
        .set_account(
            other_mint,
            solana_account::Account {
                lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
                data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 6, None),
                owner: spl::TOKEN_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();
    let i = ix::pool_init(&admin, &other_mint);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::InvalidUsdcMint, "other mint");

    // token-2022 program id supplied where the classic token program belongs
    let mut i2 = ix::pool_init(&admin, &{env.usdc_mint});
    i2.accounts[7].pubkey = spl::TOKEN_2022_PROGRAM_ID;
    let out = env.send(&[i2], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("token-2022 program"), "token program id");
}

#[test]
fn pool_init_twice_fails() {
    let mut env = Env::new();
    env.bootstrap();
    let out = env.init_pool();
    expect_instruction_failure(out.expect_err("second pool_init"), "dup pool");
}

#[test]
fn pool_init_with_swapped_lp_mints_fails() {
    let mut env = Env::new();
    env.init_config().expect_ok("config");
    let admin = env.actors.admin.pubkey();
    let pool = pda::pool(&{env.usdc_mint}).0;
    let mut i = ix::pool_init(&admin, &{env.usdc_mint});
    // lp_junior account replaced by lp_senior's PDA
    i.accounts[5].pubkey = pda::lp_senior(&pool).0;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("lp mint seeds"), "swapped lp mint");
}

// ---------- lp_deposit ----------

#[test]
fn first_junior_deposit_mints_one_to_one() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let (usdc_ata, lp_ata) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);

    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("deposit");

    let pool = env.pool();
    assert_eq!(pool.junior_capital, 1_000 * USDC);
    assert_eq!(pool.junior_shares, 1_000 * USDC);
    assert_eq!(pool.senior_capital, 0);
    assert_eq!(env.token_balance(&p.vault), 1_000 * USDC);
    assert_eq!(env.token_balance(&usdc_ata), 4_000 * USDC);
    assert_eq!(env.token_balance(&lp_ata), 1_000 * USDC);
    assert_eq!(env.mint_supply(&p.lp_junior), 1_000 * USDC);
}

#[test]
fn tranches_are_independent() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_senior);

    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 700 * USDC).expect_ok("j");
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Senior, 400 * USDC).expect_ok("s");

    let pool = env.pool();
    assert_eq!((pool.junior_capital, pool.junior_shares), (700 * USDC, 700 * USDC));
    assert_eq!((pool.senior_capital, pool.senior_shares), (400 * USDC, 400 * USDC));
    assert_eq!(env.mint_supply(&p.lp_junior), 700 * USDC);
    assert_eq!(env.mint_supply(&p.lp_senior), 400 * USDC);
    assert_eq!(env.token_balance(&p.vault), 1_100 * USDC);
}

#[test]
fn second_deposit_uses_tranche_nav() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let (_, lp_a) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    let (_, lp_b) = lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);

    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d1");

    // Depress junior NAV to 0.5 via a realized loss (counters only).
    let admin = env.actors.admin.pubkey();
    let loss = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 500 * USDC);
    env.send(&[loss], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");

    // spec math: capital 500, shares 1000 -> deposit 100 mints 200
    let expect_shares = spec::spec_shares_for_deposit(500 * USDC, 1_000 * USDC, 100 * USDC).unwrap();
    assert_eq!(expect_shares, 200 * USDC);
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("d2");

    let pool = env.pool();
    assert_eq!(pool.junior_capital, 600 * USDC);
    assert_eq!(pool.junior_shares, 1_200 * USDC);
    assert_eq!(env.token_balance(&lp_b), 200 * USDC);
    assert_eq!(env.token_balance(&lp_a), 1_000 * USDC); // dilution hits alice's NAV, not her share count
}

#[test]
fn deposit_rejects_zero_amount() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 0);
    expect_cuotas_err(&out, CuotasError::ZeroAmount, "zero deposit");
}

#[test]
fn deposit_rejects_fractional_share_mint() {
    // Post-I-05 policy: non-bootstrap deposits must mint WHOLE shares —
    // amount*supply exactly divisible by capital — so rounding can never
    // move value to incumbents. DepositTooSmall is unreachable under this
    // rule (exactness implies shares>0 whenever amount>0).
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("seed");

    // Model a tranche whose capital grew far beyond its share count
    // (only reachable today via synthetic state: set capital >> shares).
    env.edit_pool(|pool| pool.junior_capital = 1_000_000 * USDC);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10);
    // 10 * 1_000_000_000 % 1_000_000_000_000 != 0 -> UnrepresentableDeposit
    expect_cuotas_err(&out, CuotasError::UnrepresentableDeposit, "fractional shares");
}

#[test]
fn deposit_requires_exact_share_pricing() {
    // Benign case: at an elevated NAV, only amounts that divide evenly are
    // accepted — everything else fails BEFORE any token CPI, leaving the
    // depositor's balance and pool state untouched.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let (usdc_b, _) = lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("seed");
    let admin = env.actors.admin.pubkey();
    let loss = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 250 * USDC);
    env.send(&[loss], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");
    // NAV = 0.75: capital 750 USDC, shares 1e9. Exact deposit requires
    // amount * 1e9 divisible by 750e6, i.e. amount ≡ 0 (mod 3) base units.

    // non-exact: 1_000_001 base units, 1_000_001 % 3 = 2 -> rejected
    let before_pool = env.account_data(&p.pool);
    let before_usdc = env.token_balance(&usdc_b);
    let out = deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, USDC + 1);
    expect_cuotas_err(&out, CuotasError::UnrepresentableDeposit, "non-exact deposit");
    assert_eq!(env.account_data(&p.pool), before_pool, "pool state rolled back");
    assert_eq!(env.token_balance(&usdc_b), before_usdc, "no CPI happened");
    assert_eq!(env.mint_supply(&p.lp_junior), 1_000 * USDC, "no shares minted");

    // exact: 333 USDC * 1e9 / 750e6 = 444e6 shares, accepted at NAV 0.75
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 333 * USDC).expect_ok("exact deposit");
    assert_eq!(env.pool().junior_capital, 1_083 * USDC);
    assert_eq!(env.pool().junior_shares, 1_444 * USDC);
}

#[test]
fn deposit_into_insolvent_tranche_rejected() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 1_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("seed");

    // wipe junior capital entirely; shares remain outstanding
    let admin = env.actors.admin.pubkey();
    let loss = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 1_000 * USDC);
    env.send(&[loss], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");

    // shares>0 while capital==0: TrancheWipedOut must refuse new deposits
    // (the "insolvent tranche" guardrail — deposits cannot mint free shares)
    let out = deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_cuotas_err(&out, CuotasError::TrancheWipedOut, "insolvent tranche");
}

#[test]
fn deposit_rejects_wrong_accounts() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_senior);
    let alice_kp = env.actors.alice.insecure_clone();

    // 1) lp_mint of the other tranche -> seeds violation
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[5].pubkey = p.lp_senior;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("senior lp mint on junior tranche"), "wrong lp mint");

    // 2) vault replaced by depositor's own ATA -> seeds/token authority violation
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[4].pubkey = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("depositor ATA as vault"), "wrong vault");

    // 3) usdc_mint replaced by another mint -> InvalidUsdcMint
    let other_mint = Address::new_unique();
    env.svm
        .set_account(
            other_mint,
            solana_account::Account {
                lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
                data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 6, None),
                owner: spl::TOKEN_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[3].pubkey = other_mint;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_cuotas_err(&out, CuotasError::InvalidUsdcMint, "foreign mint");

    // 4) pool replaced by the config PDA -> deserialize wrong type fails
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[2].pubkey = p.config;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("config as pool"), "wrong pool");

    // 5) depositor_usdc_ata not the canonical ATA -> NotCanonicalAta
    let non_canonical = env.make_token_account(&alice, &{env.usdc_mint}, 1_000);
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[6].pubkey = non_canonical;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical usdc ata");

    // 6) depositor's USDC ATA supplied where the LP ATA belongs
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[7].pubkey = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("usdc ata as lp ata"), "wrong lp ata");

    // 7) someone else's USDC ATA while depositor signs -> authority mismatch
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[6].pubkey = spl::ata(&bob, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID);
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("foreign usdc ata"), "authority mismatch");

    // 8) valid token account at the token-2022-ATA *address* — deserializes
    // fine but is not the canonical (classic) ATA -> NotCanonicalAta
    let ata_2022 = spl::ata(&alice, &{env.usdc_mint}, &spl::TOKEN_2022_PROGRAM_ID);
    env.svm
        .set_account(
            ata_2022,
            solana_account::Account {
                lamports: env.svm.minimum_balance_for_rent_exemption(spl::TOKEN_ACCOUNT_LEN),
                data: spl::pack_token_account(&{env.usdc_mint}, &alice, 1_000 * USDC),
                owner: spl::TOKEN_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[6].pubkey = ata_2022;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "token-2022 ata address");

    // 9) nothing at all at the token-2022 ATA address -> AccountNotInitialized
    //    (the account constraint order: deserialize before key comparison)
    let uninit_ata = spl::ata(&bob, &{env.usdc_mint}, &spl::TOKEN_2022_PROGRAM_ID);
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[6].pubkey = uninit_ata;
    let out = env.send(&[i], &alice_kp, &[]);
    let f = out.expect_err("empty 2022-ata address");
    expect_instruction_failure(f, "uninitialized ata address");
}

#[test]
fn deposit_rejects_wrong_lp_ata_variants() {
    // depositor_lp_ata must be the canonical ATA of (depositor, lp_mint) —
    // enforced in three layers, each exercised independently.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    let alice_kp = env.actors.alice.insecure_clone();

    // 1) a real token account (alice-owned, junior mint) at a NON-ATA
    //    address -> passes token:: checks, fails the address constraint
    let non_canonical_lp = env.make_token_account(&alice, &p.lp_junior, 0);
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[7].pubkey = non_canonical_lp;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical lp account");

    // 2) alice's canonical ATA of the OTHER tranche's mint -> token::mint
    env.make_ata(&alice, &p.lp_senior, 0);
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[7].pubkey = spl::ata(&alice, &p.lp_senior, &spl::TOKEN_PROGRAM_ID);
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("cross-tranche lp ata"), "wrong lp mint ata");

    // 3) bob's canonical junior ATA while alice signs -> token::authority
    let bob_lp = env.make_ata(&bob, &p.lp_junior, 0);
    let mut i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    i.accounts[7].pubkey = bob_lp;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("foreign-owner lp ata"), "wrong ata owner");
}

#[test]
fn deposit_with_insufficient_balance_fails() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 50 * USDC, &p.lp_junior);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC);
    let f = out.expect_err("insufficient depositor balance");
    expect_instruction_failure(f, "insufficient balance");
}

#[test]
fn deposit_missing_lp_ata_fails() {
    let mut env = Env::new();
    env.bootstrap();
    let alice = env.actors.alice.pubkey();
    env.make_ata(&alice, &{env.usdc_mint}, 1_000 * USDC);
    // deliberately NO junior LP ata for alice
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_instruction_failure(out.expect_err("missing lp ata"), "missing lp ata");
}

#[test]
fn deposit_blocked_when_not_normal() {
    for state in [ProtocolState::Halted, ProtocolState::WithdrawsOnly] {
        let mut env = Env::new();
        let p = env.bootstrap();
        let alice = env.actors.alice.pubkey();
        lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);
        let admin = env.actors.admin.pubkey();
        let i = ix::admin_set_state(&admin, state);
        env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("set_state");
        let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
        expect_cuotas_err(&out, CuotasError::ProtocolNotNormal, "deposit gated");
    }
}

#[test]
fn deposit_invalid_tranche_discriminant_fails() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);
    // take the real discriminator then append a bogus enum discriminant
    let good = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 1);
    let mut data = good.data[..8].to_vec();
    data.extend_from_slice(&[7u8]); // tranche discriminant out of range
    data.extend_from_slice(&1u64.to_le_bytes());
    let i = ix::lp_deposit_raw(&alice, &{env.usdc_mint}, Tranche::Junior, data);
    let out = env.send(&[i], &{env.actors.alice.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("bad tranche discriminant"), "bad enum");
}

#[test]
fn deposit_forged_signer_fails() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let attacker = env.actors.attacker.pubkey();
    lp_ready(&mut env, &alice, 1_000 * USDC, &p.lp_junior);

    // Arm 1: a tx naming alice as depositor cannot even be constructed
    // without her key — the impersonation dies at signing time.
    let i = ix::lp_deposit(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
    let msg = solana_message::Message::new_with_blockhash(
        std::slice::from_ref(&i),
        Some(&attacker),
        &env.svm.latest_blockhash(),
    );
    let res = solana_transaction::versioned::VersionedTransaction::try_new(
        solana_message::VersionedMessage::Legacy(msg.clone()),
        &[&env.actors.attacker],
    );
    assert!(res.is_err(), "tx must not be signable without alice's key");

    // Arm 2: attacker places his own signature in alice's required slot —
    // the runtime's sigverify rejects it before the program runs.
    let sig = env
        .actors
        .attacker
        .sign_message(msg.serialize().as_slice());
    let forged_tx = solana_transaction::versioned::VersionedTransaction {
        signatures: vec![sig, sig],
        message: solana_message::VersionedMessage::Legacy(msg),
    };
    let out: cuotas_tests::err::TxOutcome = env.svm.send_transaction(forged_tx).into();
    let f = out.expect_err("forged signature");
    assert!(
        matches!(
            f.err,
            solana_transaction_error::TransactionError::SignatureFailure
        ),
        "expected SignatureFailure, got {:?}",
        f.err
    );
}

// ---------- lp_withdraw ----------

#[test]
fn withdraw_pays_nav_and_burns() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let (usdc_ata, lp_ata) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");

    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 400 * USDC).expect_ok("w");

    let pool = env.pool();
    assert_eq!(pool.junior_shares, 600 * USDC);
    assert_eq!(pool.junior_capital, 600 * USDC);
    assert_eq!(env.token_balance(&lp_ata), 600 * USDC);
    assert_eq!(env.token_balance(&usdc_ata), 4_400 * USDC);
    assert_eq!(env.token_balance(&p.vault), 600 * USDC);
    assert_eq!(env.mint_supply(&p.lp_junior), 600 * USDC);
}

#[test]
fn withdraw_is_pro_rata_between_lps() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let (_, lp_a) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_senior);
    let (_, lp_b) = lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_senior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Senior, 600 * USDC).expect_ok("a");
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Senior, 400 * USDC).expect_ok("b");

    // bob withdraws half his shares -> half the tranche NAV per share
    withdraw(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Senior, 200 * USDC).expect_ok("bw");
    let pool = env.pool();
    assert_eq!(pool.senior_capital, 800 * USDC);
    assert_eq!(pool.senior_shares, 800 * USDC);
    assert_eq!(env.token_balance(&lp_b), 200 * USDC);
    assert_eq!(env.token_balance(&lp_a), 600 * USDC);
}

#[test]
fn withdraw_after_loss_pays_reduced_nav() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let (usdc_ata, _) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");

    let admin = env.actors.admin.pubkey();
    let loss = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 400 * USDC);
    env.send(&[loss], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");

    // NAV/share = 600/1000 -> withdrawing 500 shares yields 300
    let expect = spec::spec_amount_for_withdraw(600 * USDC, 1_000 * USDC, 500 * USDC).unwrap();
    assert_eq!(expect, 300 * USDC);
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 500 * USDC).expect_ok("w");
    assert_eq!(env.token_balance(&usdc_ata), 4_300 * USDC);
}

#[test]
fn withdraw_allowed_in_withdraws_only_blocked_in_halted() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");
    let admin = env.actors.admin.pubkey();

    let i = ix::admin_set_state(&admin, ProtocolState::WithdrawsOnly);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("wo");
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("w in WO");

    let i = ix::admin_set_state(&admin, ProtocolState::Halted);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("halted");
    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC);
    expect_cuotas_err(&out, CuotasError::ProtocolHalted, "w in Halted");
}

#[test]
fn withdraw_rejects_zero_and_overdrawn_shares() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("d");

    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 0);
    expect_cuotas_err(&out, CuotasError::ZeroShares, "zero shares");

    // shares beyond the whole tranche supply
    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 101 * USDC);
    expect_cuotas_err(&out, CuotasError::InsufficientShares, "beyond supply");
}

#[test]
fn withdraw_more_than_own_balance_but_within_supply_fails() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("a");
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 900 * USDC).expect_ok("b");

    // alice burns more than she owns (150 > 100) though tranche supply is 1000
    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 150 * USDC);
    let f = out.expect_err("over own balance");
    expect_instruction_failure(f, "burn exceeds balance");
}

#[test]
fn wiped_tranche_shares_retire_for_zero_then_recapitalize() {
    // Post-fix semantics: a wiped tranche's shares are retired for 0 USDC
    // instead of failing — that is how the tranche reaches a clean slate
    // and can bootstrap again at 1:1.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let (usdc_a, lp_a) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("d");

    let admin = env.actors.admin.pubkey();
    let loss = ix::admin_apply_loss(&admin, &{env.usdc_mint}, &{env.actors.payer.pubkey()}, 100 * USDC);
    env.send(&[loss], &{env.actors.admin.insecure_clone()}, &[]).expect_ok("loss");
    assert_eq!(env.pool().junior_capital, 0);

    // retiring worthless shares pays 0 but succeeds and burns them
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 50 * USDC).expect_ok("retire");
    assert_eq!(env.token_balance(&usdc_a), 4_900 * USDC, "0 payout");
    assert_eq!(env.token_balance(&lp_a), 50 * USDC, "half retired");
    assert_eq!(env.pool().junior_shares, 50 * USDC);

    // retire the rest → clean slate → deposits bootstrap at 1:1 again
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 50 * USDC).expect_ok("retire all");
    assert_eq!(env.pool().junior_shares, 0);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 42 * USDC).expect_ok("redeposit");
    assert_eq!(env.pool().junior_shares, 42 * USDC, "fresh 1:1 mint");
    assert_eq!(env.pool().junior_capital, 42 * USDC);
}

#[test]
fn deposit_into_orphaned_capital_rejected() {
    // capital > 0 with shares == 0 is only reachable via state surgery or a
    // full external burn (see adversarial.rs) — never through the program's
    // own ops. Model it directly: the deposit must NOT mint 1:1 free shares
    // against orphaned NAV, on either tranche.
    for tranche in [Tranche::Junior, Tranche::Senior] {
        let mut env = Env::new();
        let p = env.bootstrap();
        let alice = env.actors.alice.pubkey();
        let lp_mint = match tranche {
            Tranche::Junior => p.lp_junior,
            Tranche::Senior => p.lp_senior,
        };
        lp_ready(&mut env, &alice, 5_000 * USDC, &lp_mint);
        env.edit_pool(|pool| match tranche {
            Tranche::Junior => pool.junior_capital = 500 * USDC,
            Tranche::Senior => pool.senior_capital = 500 * USDC,
        }); // shares stay 0

        let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, tranche, 100 * USDC);
        expect_cuotas_err(&out, CuotasError::OrphanedCapital, "orphaned NAV");
    }
}

#[test]
fn lp_supply_above_recorded_shares_rejected() {
    // Mint supply above the share counter means accounting corruption —
    // unreachable normally (pool PDA is the only mint authority), produced
    // here by writing the mint's supply field directly, on either tranche.
    for tranche in [Tranche::Junior, Tranche::Senior] {
        let mut env = Env::new();
        let p = env.bootstrap();
        let alice = env.actors.alice.pubkey();
        let lp_mint = match tranche {
            Tranche::Junior => p.lp_junior,
            Tranche::Senior => p.lp_senior,
        };
        lp_ready(&mut env, &alice, 5_000 * USDC, &lp_mint);
        deposit(&{env.actors.alice.insecure_clone()}, &mut env, tranche, 100 * USDC).expect_ok("d");

        env.set_mint_supply(&lp_mint, 101 * USDC);
        let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, tranche, 10 * USDC);
        expect_cuotas_err(&out, CuotasError::LpSupplyMismatch, "supply > shares on withdraw");

        env.set_mint_supply(&lp_mint, 100 * USDC); // restore sanity
        let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, tranche, 10 * USDC);
        out.expect_ok("consistent again");
    }
}

#[test]
fn withdraw_blocked_by_illiquidity() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");

    // Consistent credit model: 600 lent out to plans -> vault holds 400,
    // outstanding_credit 600, capital still 1000. V + O == J + S holds.
    env.edit_pool(|pool| pool.outstanding_credit = 600 * USDC);
    env.set_token_amount(&p.vault, 400 * USDC);
    assert_eq!(env.accounting_delta(), 0, "modeled credit is consistent");

    // claim of 1000 exceeds the liquid 400 -> rejected
    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC);
    expect_cuotas_err(&out, CuotasError::InsufficientLiquidity, "illiquidity");

    // a claim within vault liquidity succeeds — outstanding credit is NOT
    // subtracted from availability a second time (it is already absent cash)
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 400 * USDC).expect_ok("partial w");
}

#[test]
fn informational_fees_never_gate_liquidity() {
    // accrued_fees is cumulative information about recognized gains, not a
    // treasury liability or liquidity reserve: it must not reduce what an
    // LP can withdraw, and no instruction touches it.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");

    // Model recognized gains already folded into capital (host-only
    // book_gain has no on-chain instruction): +200 junior capital from
    // income, tracked by the informational counter, cash already in vault.
    env.set_token_amount(&p.vault, 1_200 * USDC);
    env.edit_pool(|pool| {
        pool.junior_capital = 1_200 * USDC;
        pool.accrued_fees = 200 * USDC;
    });
    assert_eq!(env.accounting_delta(), 0);

    // Full NAV exit pays 1200 even with a large accrued_fees counter —
    // the fee figure is informational and never reserved against LPs.
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC)
        .expect_ok("full NAV exit despite accrued_fees");
    assert_eq!(env.pool().junior_capital, 0);
    assert_eq!(env.pool().accrued_fees, 200 * USDC, "counter is informational, ops don't touch it");
    assert_eq!(env.accounting_delta(), 0);
}

#[test]
fn unsolicited_donations_stay_outside_lp_nav() {
    // Tokens sent straight into the vault (outside any instruction) are
    // unallocated surplus: they do not dilute, boost or get claimed by LPs.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let (usdc_a, lp_a) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    let (_, lp_b) = lp_ready(&mut env, &bob, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");

    // bob donates 500 straight into the vault via raw SPL transfer —
    // no program instruction, vault.amount rises, pool counters unchanged.
    let donate = spl::transfer_ix(
        &spl::ata(&bob, &{env.usdc_mint}, &spl::TOKEN_PROGRAM_ID),
        &p.vault,
        &bob,
        500 * USDC,
    );
    env.send(&[donate], &{env.actors.bob.insecure_clone()}, &[]).expect_ok("donation");
    assert_eq!(env.token_balance(&p.vault), 1_500 * USDC);
    assert_eq!(env.accounting_delta(), (500 * USDC).into(), "donation is unallocated surplus");

    // bob's later deposit is still priced on tracked capital, not the
    // inflated vault balance: 1000 * 1000/1000 = 1000 shares exactly.
    deposit(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("deposit");
    assert_eq!(env.token_balance(&lp_b), 1_000 * USDC, "NAV ignores donations");

    // alice exits for her full tracked NAV — the donation is never
    // distributed to LPs through NAV pricing.
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("alice exits");
    assert_eq!(env.token_balance(&usdc_a), 5_000 * USDC, "alice gets exactly her capital back");
    assert_eq!(env.token_balance(&lp_a), 0);
    // bob exits his 1000; the donated 500 stays in the vault unclaimed
    withdraw(&{env.actors.bob.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("bob exits");
    assert_eq!(env.token_balance(&p.vault), 500 * USDC, "surplus survives full exit");
    assert_eq!(env.accounting_delta(), (500 * USDC).into());
}

#[test]
fn lp_mint_state_tampering_rejected() {
    // The LP mint slots are seed-pinned, so substitution is impossible —
    // but the explicit mint::authority / mint::decimals / token-program
    // constraints must still fire if the canonical mint's state is wrong.
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let attacker = env.actors.attacker.pubkey();
    lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 100 * USDC).expect_ok("seed");

    // 1) mint authority moved off the pool PDA
    env.rewrite_mint(&p.lp_junior, Some(&attacker), 6);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_instruction_failure(out.expect_err("foreign mint authority"), "mint authority");

    // 2) wrong decimals
    env.rewrite_mint(&p.lp_junior, Some(&p.pool), 8);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_instruction_failure(out.expect_err("8-decimal lp mint"), "mint decimals");

    // 3) mint account owned by Token-2022 instead of classic SPL
    env.rewrite_mint(&p.lp_junior, Some(&p.pool), 6);
    env.set_account_owner(&p.lp_junior, spl::TOKEN_2022_PROGRAM_ID);
    let out = deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_instruction_failure(out.expect_err("token-2022 lp mint"), "mint owner");

    // restore sanity: same mutations on the withdraw path
    env.rewrite_mint(&p.lp_junior, Some(&p.pool), 6);
    env.set_account_owner(&p.lp_junior, spl::TOKEN_PROGRAM_ID);
    withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 50 * USDC)
        .expect_ok("withdraw works on restored mint");

    env.rewrite_mint(&p.lp_junior, Some(&attacker), 6);
    let out = withdraw(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 10 * USDC);
    expect_instruction_failure(out.expect_err("withdraw w/ tampered mint"), "mint authority on withdraw");
}

#[test]
fn withdraw_rejects_account_substitution() {
    let mut env = Env::new();
    let p = env.bootstrap();
    let alice = env.actors.alice.pubkey();
    let bob = env.actors.bob.pubkey();
    let (usdc_a, lp_a) = lp_ready(&mut env, &alice, 5_000 * USDC, &p.lp_junior);
    lp_ready(&mut env, &bob, 1_000 * USDC, &p.lp_junior);
    deposit(&{env.actors.alice.insecure_clone()}, &mut env, Tranche::Junior, 1_000 * USDC).expect_ok("d");
    let alice_kp = env.actors.alice.insecure_clone();

    // LP mint of the wrong tranche
    let mut i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
    i.accounts[5].pubkey = p.lp_senior;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_instruction_failure(out.expect_err("wrong tranche mint"), "senior lp mint");

    // destination usdc ATA is not canonical
    let non_canonical = env.make_token_account(&alice, &{env.usdc_mint}, 0);
    let mut i = ix::lp_withdraw(&alice, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
    i.accounts[6].pubkey = non_canonical;
    let out = env.send(&[i], &alice_kp, &[]);
    expect_cuotas_err(&out, CuotasError::NotCanonicalAta, "non-canonical dest");

    // victim's LP ATA with attacker as depositor -> authority mismatch
    let attacker = env.actors.attacker.pubkey();
    env.make_ata(&attacker, &{env.usdc_mint}, 0);
    env.make_ata(&attacker, &p.lp_junior, 0);
    let mut i = ix::lp_withdraw(&attacker, &{env.usdc_mint}, Tranche::Junior, 10 * USDC);
    i.accounts[7].pubkey = lp_a; // alice's LP tokens, attacker signs
    let out = env.send(&[i], &{env.actors.attacker.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("victim lp ata"), "foreign lp ata");

    // sanity: the honest withdraw path still works afterwards
    assert_eq!(env.token_balance(&lp_a), 1_000 * USDC);
    assert_eq!(env.token_balance(&usdc_a), 4_000 * USDC);
}
