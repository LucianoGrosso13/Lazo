//! Acceptance: admin_init_config / admin_update_config / admin_set_state.

use cuotas::{CuotasError, ProtocolConfig, ProtocolState};
use cuotas_tests::env::{addr, Env};
use cuotas_tests::err::{expect_cuotas_err, expect_instruction_failure};
use cuotas_tests::{ix, pda, spec, spl};
use solana_address::Address;
use solana_signer::Signer;

fn cfg(env: &Env) -> ProtocolConfig {
    env.decode::<ProtocolConfig>(&pda::config().0)
}

#[test]
fn init_stores_spec_config() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");

    let c = cfg(&env);
    assert_eq!(addr(&c.admin), env.actors.admin.pubkey());
    assert_eq!(addr(&c.keeper), env.actors.keeper.pubkey());
    assert_eq!(addr(&c.usdc_mint), env.usdc_mint);
    assert_eq!(c.fee_bps, spec::FEE_BPS);
    assert_eq!(c.penalty_bps, spec::PENALTY_BPS);
    assert_eq!(c.grace_days, spec::GRACE_DAYS);
    assert_eq!(c.guarantor_charge_day, spec::GUARANTOR_CHARGE_DAY);
    assert_eq!(c.seconds_per_day, 60);
    assert_eq!(c.min_financed_to_count, spec::MIN_FINANCED_TO_COUNT);
    assert!(matches!(c.state, ProtocolState::Normal));
    assert_eq!(c.bump, pda::config().1);

    // Tier table equals the spec, field by field.
    for (i, t) in c.guaranteed_tiers.iter().enumerate() {
        let (dp, int, cov, max) = spec::GUARANTEED_TIERS[i];
        assert_eq!(t.down_payment_bps, dp, "tier {i} down_payment_bps");
        assert_eq!(t.interest_bps, int, "tier {i} interest_bps");
        assert_eq!(t.guarantor_coverage_bps, cov, "tier {i} coverage");
        assert_eq!(t.max_purchase, max, "tier {i} max_purchase");
    }
    for (i, t) in c.unguaranteed_tiers.iter().enumerate() {
        let (dp, int, cov, max) = spec::UNGUARANTEED_TIERS[i];
        assert_eq!(t.down_payment_bps, dp, "S{i} down_payment_bps");
        assert_eq!(t.interest_bps, int);
        assert_eq!(t.guarantor_coverage_bps, cov);
        assert_eq!(t.max_purchase, max);
    }
}

#[test]
fn init_twice_fails() {
    let mut env = Env::new();
    env.init_config().expect_ok("first init");
    let out = env.init_config();
    expect_instruction_failure(out.expect_err("second init must fail"), "dup init");
}

#[test]
fn init_with_wrong_config_pda_fails() {
    let mut env = Env::new();
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let mut i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
    // config account replaced by a different (valid-format) PDA
    // (index 3: admin, program, program_data, config, usdc_mint, system)
    i.accounts[3].pubkey = pda::pool(&{env.usdc_mint}).0;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("wrong config pda"), "wrong pda");
}

#[test]
fn init_rejects_program_slot_substitution() {
    // `program` must be the cuotas executable itself — it is the anchor of
    // the upgrade-authority proof, so nothing else may sit in that slot.
    let mut env = Env::new();
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());

    // a non-executable PDA where the program belongs
    let mut i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
    i.accounts[1].pubkey = pda::config().0;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("pda as program"), "non-executable program");

    // a real executable program owned by the WRONG loader (classic bpf,
    // not upgradeable) still fails the Program<Cuotas> check
    let mut i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
    i.accounts[1].pubkey = spl::TOKEN_PROGRAM_ID;
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("token program as cuotas"), "wrong loader");
}

#[test]
fn init_rejects_wrong_program_data() {
    // `program_data` must be THE ProgramData account of this program: the
    // program account itself is owned by the upgradeable loader but holds
    // Program state, not ProgramData -> deserialization fails.
    let mut env = Env::new();
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let mut i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
    i.accounts[2].pubkey = cuotas_tests::env::program_id();
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("program as program_data"), "not ProgramData");
}

#[test]
fn init_rejects_signer_that_is_not_upgrade_authority() {
    // With the ProgramData authority pointing at someone else, the fixture
    // admin is just another key and bootstrap must refuse it.
    let mut env = Env::new();
    let attacker = env.actors.attacker.pubkey();
    env.set_upgrade_authority(&attacker);
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::NotUpgradeAuthority, "admin != upgrade authority");
}

#[test]
fn init_binds_admin_to_whoever_holds_upgrade_authority() {
    // The positive flip side: bootstrap is captured by the key in
    // ProgramData, not by any fixture constant — whoever holds the real
    // upgrade authority becomes config.admin.
    let mut env = Env::new();
    let attacker = env.actors.attacker.pubkey();
    env.set_upgrade_authority(&attacker);
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let i = ix::admin_init_config(&attacker, &{env.usdc_mint}, &params);
    env.send(&[i], &{env.actors.attacker.insecure_clone()}, &[])
        .expect_ok("upgrade authority bootstraps");
    assert_eq!(addr(&cfg(&env).admin), attacker);
}

#[test]
fn init_rejects_mint_without_six_decimals() {
    let mut env = Env::new();
    let bad_mint = Address::new_unique();
    let acc = solana_account::Account {
        lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
        data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 8, None),
        owner: spl::TOKEN_PROGRAM_ID,
        executable: false,
        rent_epoch: 0,
    };
    env.svm.set_account(bad_mint, acc).unwrap();

    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let i = ix::admin_init_config(&admin, &bad_mint, &params);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::InvalidMintDecimals, "8-decimals mint");
}

#[test]
fn init_rejects_non_mint_account_as_usdc() {
    let mut env = Env::new();
    // a token account is not a Mint
    let not_mint = env.make_token_account(&env.actors.payer.pubkey(), &{env.usdc_mint}, 0);
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let i = ix::admin_init_config(&admin, &not_mint, &params);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_instruction_failure(out.expect_err("token account as mint"), "non-mint usdc");
}

#[test]
fn init_rejects_mint_from_token_2022_program() {
    let mut env = Env::new();
    let mint_2022 = Address::new_unique();
    env.svm
        .set_account(
            mint_2022,
            solana_account::Account {
                lamports: env.svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
                data: spl::pack_mint(Some(&env.actors.payer.pubkey()), 0, 6, None),
                owner: spl::TOKEN_2022_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .unwrap();
    let admin = env.actors.admin.pubkey();
    let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    let i = ix::admin_init_config(&admin, &mint_2022, &params);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    // classic-token Account<Mint> cannot deserialize a token-2022 account
    expect_instruction_failure(out.expect_err("token-2022 mint"), "token2022 mint");
}

#[test]
fn init_validates_params() {
    // each mutation must independently fail with InvalidConfig
    let mutants: Vec<Box<dyn Fn(&mut cuotas::ConfigParams)>> = vec![
        Box::new(|p| p.fee_bps = 10_001),
        Box::new(|p| p.penalty_bps = 10_001),
        Box::new(|p| p.guarantor_charge_day = p.grace_days),
        Box::new(|p| p.seconds_per_day = 0),
        Box::new(|p| p.keeper = solana_pubkey::Pubkey::default()),
        Box::new(|p| p.treasury = solana_pubkey::Pubkey::default()),
        Box::new(|p| p.guaranteed_tiers[0].down_payment_bps = 10_001),
        Box::new(|p| p.guaranteed_tiers[1].guarantor_coverage_bps = 10_001),
        Box::new(|p| p.unguaranteed_tiers[0].interest_bps = 10_001),
        Box::new(|p| p.guaranteed_tiers[3].max_purchase = 0),
        Box::new(|p| p.unguaranteed_tiers[1].max_purchase = 0),
    ];
    for (n, mutate) in mutants.into_iter().enumerate() {
        let mut env = Env::new();
        let admin = env.actors.admin.pubkey();
        let keeper = env.actors.keeper.pubkey();
        let treasury = env.actors.payer.pubkey();
        let mut params = spec::spec_params(&keeper, &treasury);
        mutate(&mut params);
        let i = ix::admin_init_config(&admin, &{env.usdc_mint}, &params);
        let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
        expect_cuotas_err(&out, CuotasError::InvalidConfig, "mutant init");
        eprintln!("mutant {n} rejected with InvalidConfig as required");
    }
}

#[test]
fn update_replaces_params_and_rotates_keeper() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");

    let admin = env.actors.admin.pubkey();
    let new_keeper = env.actors.attacker.pubkey(); // rotated keeper
    let treasury = env.actors.payer.pubkey();
    let mut params = spec::spec_params(&new_keeper, &treasury);
    params.fee_bps = 900;
    params.seconds_per_day = 30;

    let i = ix::admin_update_config(&admin, &params);
    env.send(&[i], &{env.actors.admin.insecure_clone()}, &[])
        .expect_ok("update");

    let c = cfg(&env);
    assert_eq!(c.fee_bps, 900);
    assert_eq!(c.seconds_per_day, 30);
    assert_eq!(addr(&c.keeper), new_keeper);
    // untouched fields
    assert_eq!(addr(&c.admin), admin);
    assert_eq!(addr(&c.usdc_mint), env.usdc_mint);
    assert!(matches!(c.state, ProtocolState::Normal));

    // old keeper no longer accepted by keeper-gated instructions
    let hash = [7u8; 32];
    let old_keeper_ix = ix::keeper_register_guarantee(
        &env.actors.keeper.pubkey(),
        &env.actors.alice.pubkey(),
        1,
        1,
        hash,
    );
    let out = env.send(&[old_keeper_ix], &{env.actors.keeper.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::NotKeeper, "rotated-out keeper");
    // new keeper works
    let new_keeper_ix = ix::keeper_register_guarantee(
        &new_keeper,
        &env.actors.alice.pubkey(),
        1,
        1,
        hash,
    );
    env.send(&[new_keeper_ix], &{env.actors.attacker.insecure_clone()}, &[])
        .expect_ok("new keeper registers");
}

#[test]
fn update_by_non_admin_rejected() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");

    for (name, who) in [
        ("attacker", env.actors.attacker.pubkey()),
        ("keeper", env.actors.keeper.pubkey()),
        ("student", env.actors.alice.pubkey()),
    ] {
        let params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
        let i = ix::admin_update_config(&who, &params);
        let signer = match name {
            "attacker" => env.actors.attacker.insecure_clone(),
            "keeper" => env.actors.keeper.insecure_clone(),
            _ => env.actors.alice.insecure_clone(),
        };
        let out = env.send(&[i], &signer, &[]);
        expect_cuotas_err(&out, CuotasError::NotAdmin, "non-admin update");
    }
}

#[test]
fn update_validates_params() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");
    let admin = env.actors.admin.pubkey();
    let mut params = spec::spec_params(&env.actors.keeper.pubkey(), &env.actors.payer.pubkey());
    params.seconds_per_day = 0;
    let i = ix::admin_update_config(&admin, &params);
    let out = env.send(&[i], &{env.actors.admin.insecure_clone()}, &[]);
    expect_cuotas_err(&out, CuotasError::InvalidConfig, "bad update params");
}

#[test]
fn set_state_round_trip() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");
    let admin = env.actors.admin.pubkey();
    let admin_kp = env.actors.admin.insecure_clone();

    for st in [ProtocolState::Halted, ProtocolState::WithdrawsOnly, ProtocolState::Normal] {
        let i = ix::admin_set_state(&admin, st);
        env.send(&[i], &admin_kp, &[]).expect_ok("set_state");
        let c = cfg(&env);
        assert!(
            std::mem::discriminant(&c.state) == std::mem::discriminant(&st),
            "state persisted"
        );
    }
}

#[test]
fn set_state_by_non_admin_rejected() {
    let mut env = Env::new();
    env.init_config().expect_ok("init");
    for kp_name in ["attacker", "keeper"] {
        let who = if kp_name == "attacker" {
            env.actors.attacker.pubkey()
        } else {
            env.actors.keeper.pubkey()
        };
        let signer = if kp_name == "attacker" {
            env.actors.attacker.insecure_clone()
        } else {
            env.actors.keeper.insecure_clone()
        };
        let i = ix::admin_set_state(&who, ProtocolState::Halted);
        let out = env.send(&[i], &signer, &[]);
        expect_cuotas_err(&out, CuotasError::NotAdmin, "set_state impostor");
    }
}
