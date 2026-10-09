# Demo happy path — devnet readiness report

**Prepared:** 2026-10-09 · **Network:** Solana devnet only (test funds, no real value) · **Mode:** read-only — every check below is a public RPC query or CLI read; **nothing was signed, sent, deployed, funded, minted, or initialized**. No secret or private key was read or inspected.
**Author model:** SWE-2 Max.
**Scope:** ticket 01 `.scratch/demo-happy-path-tickets/issues/01-compra-confirmada-y-calendario.md`, under the parent spec `.scratch/demo-happy-path/issues/01-compra-y-primera-cuota-devnet.md`. This file is the exclusive write scope; no app or other files were touched.

## Verdict

**The devnet environment is NOT ready for the purchase take, as observed today.** The program on-chain is the old artifact without the credit lifecycle, and no protocol state accounts currently exist (no `ProtocolConfig`, `Pool`, `Merchant`, `Guarantee`, or `Plan` is visible on-chain now). The devUSDC mint exists with supply 0. No real purchase can be observed today; all preparation items below remain future operations requiring explicit per-transaction approval.

## Verified on-chain state (2026-10-09, finalized commitment)

Queried via `https://api.devnet.solana.com` JSON-RPC (`getVersion`, `getEpochInfo`, `getAccountInfo`, `getBalance`, `getProgramAccounts`, `getSignaturesForAddress`) and `solana program dump`. RPC reported `solana-core 4.4.0-beta.0`; query slots ≈ 509,199,437–509,199,561, epoch 1178. Raw responses in the appendix.

| Item | Address / value | Observed state | Source |
|---|---|---|---|
| Program (executable) | `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` | `executable: true`, owner `BPFLoaderUpgradeab1e11111111111111111111111`, 833,120 lamports | `getAccountInfo` jsonParsed |
| ProgramData | `4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum` | 469,869 B; header decodes to last deploy slot **507,192,198** and upgrade authority `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` | `getAccountInfo` base64 header decode |
| Deployed bytecode | — | **SHA-256 `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476`**, 469,824 B — the **old** artifact | `solana program dump` + `sha256sum` |
| Protocol state accounts | — | **0 accounts are currently owned by the program** — no config, pool, merchant, guarantee, plan, or reputation account is present on-chain now. (Historical record `proyecto/handoff-demo-devnet.md` says init was never invoked; this report independently proves only the current absence.) | `getProgramAccounts` (dataSlice 0) |
| devUSDC mint | `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` | initialized, 6 decimals, **supply 0**, mint authority = deployer, no freeze authority, classic SPL Token | `getAccountInfo` jsonParsed |
| Deployer / upgrade & mint authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` | balance **0.22040056 SOL**; newest signature in fetched history is 2026-10-04 01:18:10 UTC (mint creation), so no deployer-signed transaction has landed since then | `getBalance`, `getSignaturesForAddress` (newest-first) |
| Stranded deploy buffer | `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW` | still open today, **2.38758476 SOL** recoverable rent, 469,861 B, owned by upgradeable loader | `getAccountInfo` |
| Merchant | `NEXT_PUBLIC_CUOTAS_MERCHANT` | unset in the committed `app/.env.example` (commented out); no merchant account exists on-chain today. Any real `.env.local` was not inspected (secrets are never read). | repo + `getProgramAccounts` |
| Student wallet / guarantee | — | no student wallet is designated on-chain; a `["guarantee", student]` PDA cannot exist while config is absent (the `keeper_register_guarantee` instruction requires config) | `getProgramAccounts` |
| Pool liquidity | — | none observable; no `Pool`/`vault` account exists today | `getProgramAccounts` |
| App env | `app/.env.local` | not present in this worktree; real mode would need `NEXT_PUBLIC_CUOTAS_MODE=real` plus RPC/program/mint/merchant values | `ls` (names only) |

### Deployed version vs. required version

- **Deployed (live today):** sha `8d05b07f…2476` — pre-credit-cycle binary. It has config/pool/merchant/reputation/guarantee + `admin_apply_loss`, but **no `open_plan`, `pay_installment`, `crank_mark_late`, `keeper_register_recovery`, `PayoutSchedule`, or `release_payout`**.
- **Required by the credit lifecycle (source):** the documented artifact is sha `049fa4bda295cfd15a5bb1cd2086fd8ac9f8cf26eb5a9189b3afdb5a679f7fda`, 741,992 B (`programa/TEST_REPORT.md`, `programa/UPGRADE_DEVNET.md`, rebuilt 2026-10-07). It is not deployed. The intermediate hash `751cba9d` in the Oct-6 handoff is superseded. The documented hash does not guarantee a fresh build reproduces it byte-identically: **rebuild, hash the real artifact, and get the concrete artifact approved before any deploy.**
- `admin_init_config` cannot run against the old binary: `ConfigParams` layout changed → `InvalidConfig 6010` (dry-run verified 2026-10-06, `programa/UPGRADE_DEVNET.md`). **Upgrade first, then init.**

## Blockers for the real take

1. **Upgrade pending (hard blocker):** the live devnet binary lacks the credit lifecycle. The upgrade needs the deployer keypair (`BY6ZB2…Mehf` — per `UPGRADE_DEVNET.md` it lives outside the repo in `$CUOTAS_KEYS`; this report did not look for or inspect any key material), a fresh rent re-quote for the ~742 KB artifact, and explicit approval per transaction. Fallback if the keypair is unavailable: fresh deploy under a new program ID (`UPGRADE_DEVNET.md` § Fallback).
2. **No protocol state exists today:** `getConfig`/quote/guarantee reads fail closed by design while `ProtocolConfig`/`Pool` are absent; the UI must surface the blocker, not fabricate a quote or a guarantor.
3. **devUSDC supply is 0:** no wallet can hold funds; mint-to requires the deployer keypair + approval.
4. **No merchant registered on-chain:** `merchant_register` has not produced an account; without `NEXT_PUBLIC_CUOTAS_MERCHANT` the real checkout must fail closed rather than fall back to the simulated store.
5. **No guarantee can exist yet** for any student wallet (requires config first). The guarantor is mandatory under current policy (`proyecto/06`, `10`): the 100%-of-principal-plus-interest coverage is a decided business rule. What remains open is an implementation value: `FIADOR_COVERAGE_POLICY` (cap formula A vs B, `docs/fiador-sandbox.md`) is unset, and the sandbox credentials (`DIDIT_*`, `MOBBEX_*`, `FIADOR_INVITE_SECRET`) are not provisioned — a missing env/credential state, not an undecided business policy. Registration itself is `keeper_register_guarantee` via the keeper CLI under explicit approval.
6. **Known discrepancies (documented, not fixed here):** (a) `keeper_register_recovery` and the mock still fold the late fee (punitorio) into the guarantor charge while current policy excludes it from the surety — relevant only to the arrears explanation copy in ticket 01 and registered for separate work; (b) program KNOWN-GAP: reopening a plan within the same second can accept a stale quote (missing generation discriminator); (c) the student-side invite button still mints mock links.

## Future operations to reach readiness (reviewable, NOT executed)

Order matters: each step needs its own explicit approval; dry-run/simulate before sending. Full detail in `programa/UPGRADE_DEVNET.md`.

1. Re-quote rent for the concrete ~742 KB artifact and top up the deployer via the devnet faucet (historical math showed ~2 SOL short after recovering the buffer — re-check balances and rent; those numbers are not a quote).
2. Close stranded buffer `DUgcg4Y2…ddNW` (recovers 2.38758476 SOL to the deployer).
3. Build: `cd programa && NO_DNA=1 anchor build --arch v1 --ignore-keys`; `sha256sum target/deploy/cuotas.so`; compare to `049fa4bd…f7fda` and get the concrete resulting artifact approved (do not assume byte-identical reproduction).
4. `solana program deploy` upgrade against program ID `E6pB2UER…AQJQ` with a resumable `--buffer`; then `solana program dump` + `sha256sum` must equal the approved artifact hash.
5. `app/scripts/seed.ts` dry-run, then send per-approved: `admin_init_config` (approved params: fee 7% immediate; penalty 5% one-off on the overdue installment charged to the student; grace 5 days; guarantor notice day 3; guarantor charge request day 15; tiers 30%/1,000 · 20%/1,000 · 10%/1,250 · 0%/1,500 — all at 100% coverage; plan options 3× at 0% and 6× at 3% total from 350; settlement 0d/7% · 30d/6.25% · 60d/5.75% · 90d/5.25%; installment interval 30 protocol days), `pool_init`, `merchant_register` for a dedicated demo merchant wallet, `mint-to` the student wallet (≥ 533.333333 devUSDC for down payment 300 + first installment 233.333333, plus margin), LP deposits so pool liquidity ≥ financed 700, and SOL for fees. `--seconds-per-day`: **86400** for normal due dates (Q5: no accelerated clock); a compressed value belongs to a separate arrears demo, not this take.
6. Register the guarantee for the chosen student wallet (`keeper_register_guarantee` via keeper CLI, `--approved-by` + `--yes`), once `FIADOR_COVERAGE_POLICY` is set.
7. Create `app/.env.local` (never committed): `NEXT_PUBLIC_CUOTAS_MODE=real`, `NEXT_PUBLIC_SOLANA_RPC_URL`, program ID, mint, `NEXT_PUBLIC_CUOTAS_MERCHANT`.

## Pre-take checklist (re-verify right before recording)

All read-only; if any check fails, the take is blocked — the UI must say so.

- [ ] `solana program dump E6pB2UER…AQJQ /tmp/x.so -u devnet && sha256sum /tmp/x.so` equals the approved artifact hash (expected `049fa4bd…f7fda`).
- [ ] `getProgramAccounts` on the program lists the `["config"]`, `["pool", mint]`, `["merchant", tienda]`, `["guarantee", student]`, and `["reputation", student]` PDAs.
- [ ] `ProtocolConfig` (decoded via the Codama client) matches the approved parameter table above.
- [ ] Pool vault ≥ 700 devUSDC; merchant ATA exists; `NEXT_PUBLIC_CUOTAS_MERCHANT` equals the registered merchant.
- [ ] Student wallet: devUSDC ≥ 533.333333 (down payment 300 + first installment 233.333333), a little SOL for fees, `Guarantee.active` with `coverageMax` ≥ 700 and `maxPurchase` ≥ 1,000.
- [ ] Phantom on devnet; connecting never authorizes payment; every approval is per-transaction.

## Retake checklist (repeat the take)

- [ ] Option A — **fresh wallet:** prepare a new student wallet end-to-end (reputation + guarantee + devUSDC + SOL via the authorized ops above) and record against it.
- [ ] Option B — **settle the existing plan:** pay the remaining installments through the authorized `pay_installment` flow (one explicit approval each); on full settlement the program closes the `["plan", student]` PDA and refunds its rent (`pay_installment.rs`), freeing the wallet for a new plan.
- [ ] Never present clearing browser storage as clearing on-chain debt; the plan survives and stays queryable.

## Appendix — raw public evidence (2026-10-09, devnet, finalized)

All outputs below are public RPC/CLI responses captured during this session; each is independently re-queryable.

```text
$ getVersion
{"solana-core":"4.4.0-beta.0","feature-set":1855282951}

$ getEpochInfo (finalized)
{"absoluteSlot":509199425,"blockHeight":496432273,"epoch":1178}

$ getAccountInfo E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ (jsonParsed)
executable=true  owner=BPFLoaderUpgradeab1e11111111111111111111111
lamports=833120  space=36  programData=4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum

$ getAccountInfo 4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum (base64, first 45 B)
space=469869  lamports=2387584760  header: state=ProgramData(3) slot=507192198
upgrade_authority=BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf

$ solana program dump E6pB2UER…AQJQ -u devnet | sha256sum
8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476   (469,824 bytes)

$ getAccountInfo 8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y (jsonParsed)
type=mint  program=spl-token  decimals=6  supply="0"  isInitialized=true
mintAuthority=BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf  freezeAuthority=null
owner=TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA

$ getBalance BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf
220400560 lamports (0.22040056 SOL)

$ getSignaturesForAddress BY6ZB2…Mehf (limit 8, newest first)
newest: 3Qh1s6PPH6VCKoJvZfbDvJGEVHd78MoWZ6Rv59gxWFie7NWjE7VecZncoujfQ12b8cLyCfx9nozGDNfQ6yfdzG3K
        slot 507192684 · 2026-10-04T01:18:10Z · err null   (mint creation)
oldest shown: 2F8tU3Qe… slot 507192368 · 2026-10-04T01:16:56Z · err null

$ getAccountInfo DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW
lamports=2387584760  space=469861  owner=BPFLoaderUpgradeab1e11111111111111111111111

$ getProgramAccounts E6pB2UER…AQJQ (dataSlice 0)
[] — zero accounts owned by the program
```

**Nothing in this session signed, sent, deployed, funded, or initialized anything. All state above is public and independently re-queryable.**
