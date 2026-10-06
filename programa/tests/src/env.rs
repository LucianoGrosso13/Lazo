//! Test environment: LiteSVM with the compiled cuotas.so loaded, funded
//! actors and the devUSDC mint written directly as SPL state.

use std::path::PathBuf;

use anchor_lang::AccountDeserialize;
use litesvm::LiteSVM;
use solana_account::Account;
use solana_address::Address;
use solana_instruction::Instruction;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

use crate::err::TxOutcome;
use crate::{ix, pda, spec, spl};

/// lamports airdropped to every actor (1 SOL).
pub const ACTOR_SOL: u64 = 1_000_000_000;
/// devUSDC decimals (spec: 6, like USDC).
pub const USDC_DECIMALS: u8 = 6;
/// One "USDC" in base units.
pub const USDC: u64 = 1_000_000;

/// Pubkey type used inside the program crate / deserialized account state
/// (anchor-lang 1.2 lineage), distinct from litesvm's `Address`.
pub fn pk(addr: &Address) -> solana_pubkey::Pubkey {
    solana_pubkey::Pubkey::new_from_array(addr.to_bytes())
}

/// Convert any [u8;32]-backed public key (anchor's Pubkey, program-state keys)
/// into the `Address` type litesvm speaks.
pub fn addr<P: AsRef<[u8]>>(key: &P) -> Address {
    let bytes: &[u8] = key.as_ref();
    Address::new_from_array(bytes.try_into().expect("pubkey is 32 bytes"))
}

/// Program ID under test, taken from the program crate's `declare_id!`.
pub fn program_id() -> Address {
    addr(&cuotas::ID)
}

/// Resolve the path of the compiled program artifact.
pub fn program_so_path() -> PathBuf {
    if let Ok(p) = std::env::var("CUOTAS_SO") {
        return PathBuf::from(p);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../target/deploy/cuotas.so")
}

/// Standard actors for every suite.
pub struct Actors {
    /// pays rent/fees; also used as the mint authority of devUSDC.
    pub payer: Keypair,
    pub admin: Keypair,
    pub keeper: Keypair,
    /// primary liquidity provider / student depending on suite.
    pub alice: Keypair,
    /// second LP / merchant depending on suite.
    pub bob: Keypair,
    /// signer that must never succeed in privileged calls.
    pub attacker: Keypair,
}

pub struct Env {
    pub svm: LiteSVM,
    pub actors: Actors,
    /// devUSDC mint address (owned by the classic SPL token program).
    pub usdc_mint: Address,
}

impl Env {
    /// Boot LiteSVM (default programs incl. SPL token already loaded),
    /// deploy the compiled .so, fund actors and create the devUSDC mint.
    pub fn new() -> Self {
        let so_path = program_so_path();
        assert!(
            so_path.exists(),
            "compiled program not found at {} — run `NO_DNA=1 anchor build` in programa/ first",
            so_path.display()
        );

        let mut svm = LiteSVM::new();
        svm.add_program_from_file(program_id(), &so_path)
            .expect("failed to load cuotas.so into LiteSVM");

        let actors = Actors {
            payer: Keypair::new(),
            admin: Keypair::new(),
            keeper: Keypair::new(),
            alice: Keypair::new(),
            bob: Keypair::new(),
            attacker: Keypair::new(),
        };
        for kp in [
            &actors.payer,
            &actors.admin,
            &actors.keeper,
            &actors.alice,
            &actors.bob,
            &actors.attacker,
        ] {
            svm.airdrop(&kp.pubkey(), ACTOR_SOL).unwrap();
        }

        // devUSDC: mint authority = payer so tests can fund any wallet.
        let usdc_mint = Address::new_unique();
        svm.set_account(
            usdc_mint,
            Account {
                lamports: svm.minimum_balance_for_rent_exemption(spl::MINT_LEN),
                data: spl::pack_mint(Some(&actors.payer.pubkey()), 0, USDC_DECIMALS, None),
                owner: spl::TOKEN_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        )
        .expect("failed to write devUSDC mint");

        // LiteSVM loads the program as upgradeable but writes ProgramData
        // with upgrade_authority_address = None. admin_init_config binds
        // the bootstrap signer to the upgrade authority, so patch it to the
        // fixture admin.
        let admin_pk = actors.admin.pubkey();
        let mut env = Self { svm, actors, usdc_mint };
        env.set_upgrade_authority(&admin_pk);
        env
    }

    /// Overwrite the ProgramData `upgrade_authority_address` field. LiteSVM
    /// leaves it `None`; `admin_init_config` requires it to equal the signer.
    /// ProgramData layout: tag u32 | slot u64 | Option<Pubkey> tag u8 |
    /// pubkey 32B.
    pub fn set_upgrade_authority(&mut self, who: &Address) {
        let pd = pda::program_data().0;
        let mut pd_acct = self.svm.get_account(&pd).expect("programdata account");
        pd_acct.data[12] = 1;
        pd_acct.data[13..45].copy_from_slice(who.as_ref());
        self.svm.set_account(pd, pd_acct).unwrap();
    }

    /// Make the loaded program immutable: ProgramData authority = None.
    /// Bootstrap must reject every signer — there is no upgrade authority
    /// to bind to.
    pub fn clear_upgrade_authority(&mut self) {
        let pd = pda::program_data().0;
        let mut pd_acct = self.svm.get_account(&pd).expect("programdata account");
        pd_acct.data[12] = 0;
        pd_acct.data[13..45].fill(0);
        self.svm.set_account(pd, pd_acct).unwrap();
    }

    /// Write a WELL-FORMED ProgramData account (correct variant layout,
    /// owned by the upgradeable loader, authority = `who`) at an address
    /// unrelated to this program. admin_init_config must reject it: the
    /// program's `programdata_address()` resolves to the real ProgramData
    /// PDA, not an arbitrary lookalike. Returns the written address.
    pub fn write_unrelated_program_data(&mut self, who: &Address) -> Address {
        let real_pd = pda::program_data().0;
        let real = self.svm.get_account(&real_pd).expect("programdata account");
        let foreign = Address::new_unique();
        self.svm
            .set_account(
                foreign,
                Account {
                    lamports: real.lamports,
                    data: {
                        let mut d = real.data.clone();
                        d[12] = 1;
                        d[13..45].copy_from_slice(who.as_ref());
                        d
                    },
                    owner: solana_sdk_ids::bpf_loader_upgradeable::id(),
                    executable: false,
                    rent_epoch: real.rent_epoch,
                },
            )
            .expect("failed to write foreign ProgramData");
        foreign
    }

    /// Build, sign and execute a transaction with the given instructions.
    /// `payer` pays fees; `signers` must include every required signer
    /// (payer is prepended automatically if missing).
    pub fn send(
        &mut self,
        ixs: &[Instruction],
        payer: &Keypair,
        signers: &[&Keypair],
    ) -> TxOutcome {
        let mut all: Vec<&Keypair> = vec![payer];
        for s in signers {
            if s.pubkey() != payer.pubkey() {
                all.push(s);
            }
        }
        let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &self.svm.latest_blockhash());
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &all)
            .expect("failed to sign test transaction");
        let out = self.svm.send_transaction(tx).into();
        // fresh blockhash so a byte-identical retry (duplicate-init tests)
        // gets a new signature instead of a false AlreadyProcessed
        self.svm.expire_blockhash();
        out
    }

    /// Simulate without committing state.
    pub fn simulate(
        &mut self,
        ixs: &[Instruction],
        payer: &Keypair,
        signers: &[&Keypair],
    ) -> TxOutcome {
        let mut all: Vec<&Keypair> = vec![payer];
        for s in signers {
            if s.pubkey() != payer.pubkey() {
                all.push(s);
            }
        }
        let msg = Message::new_with_blockhash(ixs, Some(&payer.pubkey()), &self.svm.latest_blockhash());
        let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &all)
            .expect("failed to sign test transaction");
        self.svm.simulate_transaction(tx).map(|s| s.meta).into()
    }

    /// Raw account data for `addr` (panics if missing).
    pub fn account_data(&self, addr: &Address) -> Vec<u8> {
        self.svm
            .get_account(addr)
            .unwrap_or_else(|| panic!("account {addr} does not exist"))
            .data
    }

    /// Write a classic SPL token account holding `mint` tokens for `owner`.
    /// Returns the account address (a fresh address, not necessarily the ATA).
    pub fn make_token_account(&mut self, owner: &Address, mint: &Address, amount: u64) -> Address {
        let ta = Address::new_unique();
        self.svm
            .set_account(
                ta,
                Account {
                    lamports: self
                        .svm
                        .minimum_balance_for_rent_exemption(spl::TOKEN_ACCOUNT_LEN),
                    data: spl::pack_token_account(mint, owner, amount),
                    owner: spl::TOKEN_PROGRAM_ID,
                    executable: false,
                    rent_epoch: 0,
                },
            )
            .expect("failed to write token account");
        ta
    }

    /// Write the associated token account for `owner`+`mint` with `amount`.
    /// The derived ATA address is what on-chain constraints expect.
    pub fn make_ata(&mut self, owner: &Address, mint: &Address, amount: u64) -> Address {
        let ata = spl::ata(owner, mint, &spl::TOKEN_PROGRAM_ID);
        self.svm
            .set_account(
                ata,
                Account {
                    lamports: self
                        .svm
                        .minimum_balance_for_rent_exemption(spl::TOKEN_ACCOUNT_LEN),
                    data: spl::pack_token_account(mint, owner, amount),
                    owner: spl::TOKEN_PROGRAM_ID,
                    executable: false,
                    rent_epoch: 0,
                },
            )
            .expect("failed to write ATA");
        ata
    }

    /// Overwrite the amount field of a packed SPL token account in place.
    /// Used to model states the instruction set cannot yet produce (e.g. a
    /// vault drained below LP claims) so liquidity checks are exercised for
    /// real instead of asserted vacuously.
    pub fn set_token_amount(&mut self, ta: &Address, amount: u64) {
        let mut data = self.account_data(ta);
        data[64..72].copy_from_slice(&amount.to_le_bytes());
        let mut acc = self.svm.get_account(ta).unwrap();
        acc.data = data;
        self.svm.set_account(*ta, acc).unwrap();
    }

    /// u64 balance of a token account.
    pub fn token_balance(&self, ta: &Address) -> u64 {
        spl::token_amount(&self.account_data(ta))
    }

    /// Supply of a mint account.
    pub fn mint_supply(&self, mint: &Address) -> u64 {
        spl::mint_supply(&self.account_data(mint))
    }

    /// Deserialize an anchor account (`#[account]` type from the program crate)
    /// skipping the 8-byte discriminator.
    pub fn decode<T: anchor_lang::AccountDeserialize>(&self, addr: &Address) -> T {
        let data = self.account_data(addr);
        T::try_deserialize(&mut &data[..]).expect("anchor account failed to deserialize")
    }

    /// Advance the Clock sysvar by `secs` seconds (program time, used by
    /// seconds_per_day-scaled business rules).
    pub fn warp_secs(&mut self, secs: i64) {
        let mut clock: solana_clock::Clock = self.svm.get_sysvar();
        clock.unix_timestamp += secs;
        self.svm.set_sysvar(&clock);
    }

    /// Current unix_timestamp of the in-SVM clock.
    pub fn now(&self) -> i64 {
        let clock: solana_clock::Clock = self.svm.get_sysvar();
        clock.unix_timestamp
    }

    /// admin_init_config with the spec table, signed by the real admin.
    /// Keeper and treasury use the fixture keypairs/ATA.
    pub fn init_config(&mut self) -> TxOutcome {
        let admin = self.actors.admin.pubkey();
        let keeper = self.actors.keeper.pubkey();
        let treasury = self.actors.payer.pubkey(); // treasury destination for fees
        let params = spec::spec_params(&keeper, &treasury);
        let ix = ix::admin_init_config(&admin, &self.usdc_mint, &params);
        self.send(&[ix], &self.actors.admin.insecure_clone(), &[])
    }

    /// pool_init (admin) after init_config.
    pub fn init_pool(&mut self) -> TxOutcome {
        let admin = self.actors.admin.pubkey();
        let ix = ix::pool_init(&admin, &self.usdc_mint);
        self.send(&[ix], &self.actors.admin.insecure_clone(), &[])
    }

    /// Full bootstrap: config + pool + treasury ATA (needed by apply_loss).
    /// Returns the derived addresses.
    pub fn bootstrap(&mut self) -> Protocol {
        self.init_config().expect_ok("bootstrap: admin_init_config");
        self.init_pool().expect_ok("bootstrap: pool_init");
        let treasury = addr(&self.config().treasury);
        self.make_ata(&treasury, &{ self.usdc_mint }, 0);
        self.protocol()
    }

    /// Canonical USDC ATA of `config.treasury` — the loss-cash destination.
    pub fn treasury_ata(&self) -> Address {
        spl::ata(
            &addr(&self.config().treasury),
            &{ self.usdc_mint },
            &spl::TOKEN_PROGRAM_ID,
        )
    }

    /// Derive all protocol addresses for the current usdc_mint.
    pub fn protocol(&self) -> Protocol {
        let pool = pda::pool(&self.usdc_mint).0;
        Protocol {
            config: pda::config().0,
            pool,
            vault: pda::vault(&pool).0,
            lp_junior: pda::lp_junior(&pool).0,
            lp_senior: pda::lp_senior(&pool).0,
        }
    }

    /// Read the on-chain Pool account.
    pub fn pool(&self) -> cuotas::Pool {
        self.decode::<cuotas::Pool>(&pda::pool(&self.usdc_mint).0)
    }

    /// Read the on-chain Reputation account for a student.
    pub fn reputation(&self, student: &Address) -> cuotas::Reputation {
        self.decode::<cuotas::Reputation>(&pda::reputation(student).0)
    }

    /// Read the student's Plan PDA. `None` when the account is absent or was
    /// closed by the settling pay/recovery (`AccountClose` zeroes the data
    /// and hands the lamports to the student, leaving a system-owned husk).
    pub fn plan(&self, student: &Address) -> Option<cuotas::Plan> {
        let addr = pda::plan(student).0;
        let acc = self.svm.get_account(&addr)?;
        if acc.data.len() < 8 || acc.owner != program_id() {
            return None;
        }
        Some(cuotas::Plan::try_deserialize(&mut &acc.data[..]).expect("plan deserialize"))
    }

    /// Read the Merchant PDA for a merchant wallet.
    pub fn merchant(&self, merchant_wallet: &Address) -> cuotas::Merchant {
        self.decode::<cuotas::Merchant>(&pda::merchant(merchant_wallet).0)
    }

    /// Read the Guarantee PDA for a student, if the keeper ever registered one.
    pub fn guarantee(&self, student: &Address) -> Option<cuotas::Guarantee> {
        let addr = pda::guarantee(student).0;
        let acc = self.svm.get_account(&addr)?;
        if acc.data.len() < 8 || acc.owner != program_id() {
            return None;
        }
        Some(cuotas::Guarantee::try_deserialize(&mut &acc.data[..]).expect("guarantee deserialize"))
    }

    /// True while `addr` holds a live program account (exists, owned by the
    /// cuotas program, non-empty data). False for missing accounts and for
    /// Anchor-closed husks (system-owned, zero lamports/data).
    pub fn program_account_live(&self, addr: &Address) -> bool {
        match self.svm.get_account(addr) {
            Some(a) => a.owner == program_id() && a.data.len() >= 8 && a.lamports > 0,
            None => false,
        }
    }

    /// Read the on-chain ProtocolConfig account.
    pub fn config(&self) -> cuotas::ProtocolConfig {
        self.decode::<cuotas::ProtocolConfig>(&pda::config().0)
    }

    /// Unallocated surplus: deviation from the recognized accounting
    /// invariant `vault + outstanding_credit == junior_capital + senior_capital`.
    /// 0 when assets exactly match recognized claims; positive when tokens
    /// sit in the vault with no claim attributed (e.g. unsolicited donations).
    /// `accrued_fees` is deliberately absent — it is an informational
    /// counter of gains already included in LP capital, not a liability.
    pub fn accounting_delta(&self) -> i128 {
        let p = self.protocol();
        let pool = self.pool();
        (self.token_balance(&p.vault) as i128 + pool.outstanding_credit as i128)
            - (pool.junior_capital + pool.senior_capital) as i128
    }

    /// Overwrite Pool state fields directly in the SVM. Models states the
    /// current instruction set cannot yet produce (outstanding_credit > 0,
    /// accrued fees, asymmetric share/capital ratios) so liquidity and
    /// waterfall rules are exercised for real rather than vacuously.
    pub fn edit_pool(&mut self, f: impl FnOnce(&mut cuotas::Pool)) {
        let addr = pda::pool(&self.usdc_mint).0;
        let mut pool = self.decode::<cuotas::Pool>(&addr);
        f(&mut pool);
        let mut data = Vec::new();
        anchor_lang::AccountSerialize::try_serialize(&pool, &mut data).unwrap();
        let mut acc = self.svm.get_account(&addr).unwrap();
        acc.data = data;
        self.svm.set_account(addr, acc).unwrap();
    }

    /// Overwrite Reputation state directly (e.g. active_exposure, which no
    /// instruction can yet produce) so gate checks run for real.
    pub fn edit_reputation(&mut self, student: &Address, f: impl FnOnce(&mut cuotas::Reputation)) {
        let addr = pda::reputation(student).0;
        let mut rep = self.decode::<cuotas::Reputation>(&addr);
        f(&mut rep);
        let mut data = Vec::new();
        anchor_lang::AccountSerialize::try_serialize(&rep, &mut data).unwrap();
        let mut acc = self.svm.get_account(&addr).unwrap();
        acc.data = data;
        self.svm.set_account(addr, acc).unwrap();
    }

    /// Overwrite Merchant state directly. `active = false` is unreachable via
    /// instructions (no deactivate exists); writing it exercises the
    /// `MerchantInactive` gate on open_plan for real.
    pub fn edit_merchant(&mut self, merchant_wallet: &Address, f: impl FnOnce(&mut cuotas::Merchant)) {
        let addr = pda::merchant(merchant_wallet).0;
        let mut m = self.decode::<cuotas::Merchant>(&addr);
        f(&mut m);
        let mut data = Vec::new();
        anchor_lang::AccountSerialize::try_serialize(&m, &mut data).unwrap();
        let mut acc = self.svm.get_account(&addr).unwrap();
        acc.data = data;
        self.svm.set_account(addr, acc).unwrap();
    }

    /// Write the supply field of an SPL mint account directly. Only way to
    /// make supply exceed the pool's share counters (mint authority is the
    /// pool PDA) and exercise the LpSupplyMismatch guard.
    pub fn set_mint_supply(&mut self, mint: &Address, supply: u64) {
        let mut acc = self.svm.get_account(mint).unwrap();
        acc.data[36..44].copy_from_slice(&supply.to_le_bytes());
        self.svm.set_account(*mint, acc).unwrap();
    }

    /// Repack an existing mint's data preserving its supply. Exercises the
    /// explicit `mint::authority`/`mint::decimals`/`mint::token_program`
    /// constraints on the canonical LP mints (seeds pin the address, so only
    /// state mutation reaches those checks).
    pub fn rewrite_mint(&mut self, mint: &Address, authority: Option<&Address>, decimals: u8) {
        let supply = self.mint_supply(mint);
        let mut acc = self.svm.get_account(mint).unwrap();
        acc.data = spl::pack_mint(authority, supply, decimals, None);
        self.svm.set_account(*mint, acc).unwrap();
    }

    /// Change an account's owner field in place (e.g. point the canonical
    /// LP-mint account at Token-2022) without touching its data.
    pub fn set_account_owner(&mut self, at: &Address, owner: Address) {
        let mut acc = self.svm.get_account(at).unwrap();
        acc.owner = owner;
        self.svm.set_account(*at, acc).unwrap();
    }
}

/// Derived protocol addresses after bootstrap.
#[derive(Clone, Copy)]
pub struct Protocol {
    pub config: Address,
    pub pool: Address,
    pub vault: Address,
    pub lp_junior: Address,
    pub lp_senior: Address,
}
