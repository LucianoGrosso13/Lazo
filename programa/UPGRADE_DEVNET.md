# Fase A3 runbook — devnet upgrade + protocol init

**Status: prepared, blocked on the deployer keypair and explicit approval.**

Every transaction below needs the deployer signature and the operator's
explicit approval. Nothing here sends anything. Devnet only — test funds,
no real value. Key material lives outside this repo (`$CUOTAS_KEYS`,
dir 0700 / files 0600); it is never committed or printed.

## What this does

Devnet runs the old binary today (sha `8d05b07f`, 469,824 bytes — no credit
lifecycle). The current locally rebuilt artifact (`target/deploy/cuotas.so`, sha
`ae370c733d8caa24630cfbcd291ae115ee9bb982cf31e48f037ebc1efbad9c19`,
668,592 bytes; rebuilt with `anchor build --arch v1 --ignore-keys` on 2026-10-09) adds 3/6-installment plans with mandatory guarantor coverage of principal + interest, configurable 3/6 plan options, four merchant settlement options, `PayoutSchedule` commitments, and permissionless `release_payout`, alongside `open_plan`, `pay_installment`, `crank_mark_late` and `keeper_register_recovery`. `admin_init_config` **cannot run against the old binary**: the
`ConfigParams` layout changed, so init with the new client fails with
`InvalidConfig 6010` (verified by dry-run simulation on 2026-10-06).
Upgrade first, then init.

## Verified on-chain state (2026-10-06)

| item | value |
|---|---|
| Program | `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` (deployed bytecode sha `8d05b07f…`) |
| ProgramData | `4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum` (469,869 B currently; after previous extension 610,365 B; the account keeps its address) |
| Deployer / upgrade authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` — balance **0.2204 SOL** |
| Stranded buffer (from the interrupted first deploy) | `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW` — **2.38758476 SOL**, 469,861 B. Too small for the new artifact; closing recovers the SOL. |
| devUSDC mint | `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` (supply 0, mint authority = deployer) |

## Funding estimate — refresh before approving any transaction

The figures below are historical estimates for the earlier 668,592-byte
artifact. The freshly rebuilt artifact is 668,592 bytes, so these amounts
are not a current funding quote. Re-query devnet rent and account balances
before the upgrade. The 2026-10-09 refresh in `../docs/demo-happy-path-readiness.md` records a 1.79904168 SOL shortfall before fees after closing the buffer; refresh again before execution. Do not use the historical top-up as approval to send.

### Historical math (observed ~5,081 lamports/byte rent-exempt)

- New buffer: 37-byte header + 668,592 B program → 668,629 B ≈ **3.40 SOL** upfront at the observed ~5,081 lamports/byte.
- ProgramData is currently 610,365 B; auto-extend is about +58,264 B ≈ **+0.30 SOL** (permanent).
- After the upgrade lands, the buffer is closed and its ~3.40 SOL returns to
  the fee payer — net cost ≈ 0.30 SOL + fees, but ~**3.40 SOL must be
  available at buffer creation**.
- Available: 0.22 (deployer) + 2.39 (closing the stranded buffer) = 2.61 →
  **~0.79 SOL short** → faucet top-up of **2 SOL** (margin for retries).

## Step 0 — faucet top-up (2 SOL)

Send ~2 devnet SOL to `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` via the
official faucet (the CLI airdrop was rate-limited during the first deploy;
the web faucet worked). Verify: `solana balance BY6ZB2…Mehf -u devnet` ≥ 2.2.

## Step 1 — close the stranded buffer (+2.39 SOL)

```sh
solana program close DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW \
  -k "$CUOTAS_KEYS/deployer.json" -u devnet
```

## Step 2 — resumable buffer keypair

```sh
solana-keygen new -o "$CUOTAS_KEYS/upgrade-buffer.json" --no-bip39-passphrase -s
```

Passing `--buffer` lets an interrupted deploy resume instead of stranding a
second buffer (devnet congestion caused 3 retries last time).

## Step 3 — verify the artifact, then upgrade

```sh
sha256sum programa/target/deploy/cuotas.so
# must print ae370c733d8caa24630cfbcd291ae115ee9bb982cf31e48f037ebc1efbad9c19
# if rebuilding this checkout: cd programa && NO_DNA=1 anchor build --arch v1 --ignore-keys

solana program deploy programa/target/deploy/cuotas.so \
  --program-id E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ \
  --buffer "$CUOTAS_KEYS/upgrade-buffer.json" \
  -k "$CUOTAS_KEYS/deployer.json" -u devnet \
  --use-rpc --max-sign-attempts 50
```

If it is interrupted: rerun the exact same command — written chunks are
skipped. The upgrade extends ProgramData in place (same address), copies the
buffer bytes into it, then closes the buffer: its rent-exempt balance returns to the
deployer.

## Step 4 — verify the deployed bytes

`solana program dump` writes the on-chain bytecode to a file — hash it
directly:

```sh
solana program dump E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ /tmp/deployed-cuotas.so -u devnet
sha256sum /tmp/deployed-cuotas.so
# must equal ae370c733d8caa24630cfbcd291ae115ee9bb982cf31e48f037ebc1efbad9c19
```

(`solana program show E6pB2UER… -u devnet` should report a refreshed deploy
slot and a ProgramData length sufficient for the verified artifact; authority `BY6ZB2…Mehf`.)

## Step 5 — seed: init + funding proposals

`admin_init_config` is initialized with the product-final values from
`app/scripts/seed.ts`:

| Parameter | Value |
|---|---|
| Base merchant fee | 7% (immediate option; each settlement option has its own configured fee) |
| Grace / notice / guarantor charge | 5 / day 3 / day 15 |
| Guarantor coverage | 100% of financed principal + interest at every tier |
| Tier down payment / max purchase | 30% / 1,000; 20% / 1,000; 10% / 1,250; 0% / 1,500 USDC |
| Plan options | 3 installments: 0 bps, no minimum; 6 installments: 300 bps total, minimum 350 USDC |
| Settlement options | 0 days / 0 tranches / 700 bps; 30 / 1 / 625; 60 / 2 / 575; 90 / 3 / 525 |
| Installment interval | 30 protocol days |

The seed remains dry-run unless `--send` is supplied and every proposal is
approved explicitly. Do not approve or run it as part of this runbook review.

Dry-run first (no signature; simulates each tx against the live program):

```sh
cd app
NEXT_PUBLIC_CUOTAS_PROGRAM_ID=E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ \
NEXT_PUBLIC_CUOTAS_USDC_MINT=8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y \
npx tsx scripts/seed.ts --fee-payer BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf \
  --seconds-per-day 86400 \
  --merchant <TIENDA_ADDR> \
  --mint-to <ESTUDIANTE_ADDR>:2000 --mint-to BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf:10000 \
  --lp junior:3000 --lp senior:7000
```

Every proposal must simulate `ok: true`. Then send, approving each one:

```sh
… same args, replacing --fee-payer with --keypair "$CUOTAS_KEYS/deployer.json" --send
```

Notes:

- The agreed purchase/first-installment take uses `--seconds-per-day 86400`
  (normal 30/60/90-day dates; see `proyecto/12-demo-happy-path.md`, Q5).
  `--seconds-per-day 1` is only for a separately prepared arrears demo
  (installment due at +30 s, late mark at +36 s, guarantor charge at +45 s).
  It must not be used for this recording. The value is a config field,
  changeable later via an explicitly authorized `admin_update_config`.
- `<TIENDA_ADDR>` should be a dedicated demo merchant wallet (any devnet
  address; its devUSDC ATA is created inline). Point
  `NEXT_PUBLIC_CUOTAS_MERCHANT` at it afterwards so the real checkout fails
  open only for that store.
- Steps are idempotent: already-initialized config/pool/merchant are skipped;
  re-running after a partial failure is safe.
- Keeper/ treasury default to the fee payer; pass `--keeper`/`--treasury` for
  dedicated keys (recommended: a separate keeper keypair in `$CUOTAS_KEYS`,
  funded with a little SOL — existing approved effects include `crank_mark_late`
  and `keeper_register_recovery`). The ticket 04 payout crank discovers overdue
  `PayoutSchedule` tranches and records dry-run `release_payout` proposals; it
  does not sign or send payout transactions.

## Step 6 — smoke test

- Front: `cd app && NEXT_PUBLIC_CUOTAS_MODE=real npm run dev` → connect Phantom
  (devnet) → `getConfig`/`getPool` read live values; the compra flow signs a
  real `open_plan` visible in Explorer.
- Keeper: `cd keeper && KEEPER_KEYPAIR_PATH=$CUOTAS_KEYS/keeper.json npx tsx src/run.ts once --adapter codama` — dry-run proposals only.

## Fallback — fresh deploy if the deployer keypair is gone

Nothing recoverable without `BY6ZB2…Mehf` (no upgrade, no mint-to). Then:

1. New deployer keypair in `$CUOTAS_KEYS`, faucet ~4.5 SOL (program data
   ~3.10 + program account + mint + txes).
2. New program ID: update `declare_id!` (`programs/cuotas/src/lib.rs`),
   `Anchor.toml` (`programs.cuotas`, devnet + localnet entries), and every
   reference to `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`
   (`grep -r E6pB2UER` covers `app/.env.example`, `docs/fiador-sandbox.md`,
   tests, and this file). Rebuild, re-run the suite, then
   `cd app && npm run generate` to re-bind the Codama client.
3. New devUSDC mint (classic SPL, 6 decimals, freeze `None`) → update
   `NEXT_PUBLIC_CUOTAS_USDC_MINT` and docs.
4. Deploy with `solana program deploy` (new program keypair as
   `--program-id`), then continue from Step 5.

The old program/mint stay on devnet as dead state — harmless, but the demo
must never reference them.
