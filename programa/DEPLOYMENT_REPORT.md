# cuotas — devnet deployment report

**Status: PREPARED — not executed. Deployment is blocked on devnet faucet funding.**

Neither the program account nor the devUSDC mint exists on-chain yet. Every statement below describes a *prepared and approved* operation, verified public metadata, or a recorded funding attempt. Nothing in this document claims a successful deployment, and no business-economics decision is settled by it (loss/gain policies remain PROVISIONAL and pending final sign-off).

- Network: **Solana devnet only** (test network, no real value). Never mainnet.
- User approval: explicit, recorded in the run's `deployment-proposal.json` (devnet funding ≤ 8 test SOL, exact reviewed binary deployment, classic SPL 6-decimal mint; no protocol init, no mint-to, no transfers).
- All key material lives **outside this repository** in an owner-only directory (0700 files 0600). Paths below use the placeholder `$CUOTAS_KEYS`; private bytes are never committed or printed.

## Public metadata (verified, not yet on-chain)

| Item | Address | Explorer (devnet) |
|---|---|---|
| Program ID | `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` | https://explorer.solana.com/address/E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ?cluster=devnet |
| devUSDC mint | `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` | https://explorer.solana.com/address/8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y?cluster=devnet |
| Deploy buffer | `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW` | https://explorer.solana.com/address/DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW?cluster=devnet |
| Deployer / upgrade & mint authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` | https://explorer.solana.com/address/BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf?cluster=devnet |

The keypairs for these addresses were verified to derive exactly these public keys (`solana-keygen pubkey`, public output only). RPC `getMultipleAccounts` on devnet returned `[null, null, null]` for program/mint/buffer — none exist.

## Reviewed artifact

- Program source commit: `b7833ac653d5de3872d5c58982915d9aabf61f72` (merged via `09a74d382043a666962b28288305c2a87a76c132`; integrated on `7948f9eb9348ce5a0b3cb95ffac64995be18fc3f`).
- SBF artifact `target/deploy/cuotas.so`: **SHA-256 `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476`**, 469,824 bytes. Re-hashed immediately before deployment was attempted; not rebuilt since review.
- IDL `target/idl/cuotas.json`: SHA-256 `f0231f0a67332d698cc14d0b17b8bd9e80202e218cdd3066eee90a78b2284774`.
- Local acceptance before this task: 97/97 LiteSVM tests + 29/29 host tests on the same artifact hash; fmt/clippy clean.
- Toolchain: Anchor 1.2.0, Solana CLI 3.1.14, spl-token 5.5.0. Isolated `solana-cli.yml` pins devnet + deployer key; the global Solana config is untouched.

## Funding status — BLOCKED

Devnet SOL has no real value and comes only from the public faucet. All attempts were bounded, logged and individually capped under 60 s.

| # | Time (UTC) | Amount | Endpoint | Result |
|---|---|---|---|---|
| 1 | 2026-10-04 00:47:47 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 2 | 2026-10-04 00:49:07 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 3 | 2026-10-04 00:54:18 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 4 | 2026-10-04 00:56:58 | 0.01 SOL (bootstrap probe) | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; coordinator authorized exactly one such probe |

- Total **received: 0 SOL** (budget ≤ 8 test SOL actually received; rejected requests consumed none).
- Documented alternatives without credentials were probed and are not viable: Ankr devnet RPC requires an API key, publicnode/allthatnode devnet endpoints did not respond, web faucets (faucet.solana.com, solfaucet, DevnetFaucet.org) require manual CAPTCHA/GitHub login and are out of scope. The `devnet-pow` faucet crate internally requests 1 SOL from the same rate-limited RPC when the payer balance is zero, so it is not a zero-balance bootstrap; it was not installed for mining.
- Manual step in flight: the coordinator asked the user to fund **4 test SOL** to the deployer address via the official web faucet. This report will be updated if funds arrive.

## Approved deployment command (prepared, not executed)

Resumable: the explicit `--buffer` keypair lets a failed write phase resume without printing a recovery mnemonic. Estimated cost ~2.4 SOL rent (buffer/programdata ~2.39) + write-transaction fees + ~0.001 SOL program account.

```sh
solana --config "$CUOTAS_KEYS/solana-cli.yml" --url devnet \
  --keypair "$CUOTAS_KEYS/deployer.json" \
  program deploy /path/to/programa/target/deploy/cuotas.so \
  --program-id "$CUOTAS_KEYS/program-id.json" \
  --buffer "$CUOTAS_KEYS/program-buffer.json" \
  --upgrade-authority "$CUOTAS_KEYS/deployer.json" \
  --fee-payer "$CUOTAS_KEYS/deployer.json" \
  --use-rpc --max-sign-attempts 1
```

`$CUOTAS_KEYS` is the owner-only key directory outside the repository; `solana-cli.yml` inside it pins devnet and the deployer keypair. The `.so` must hash to the artifact SHA-256 above — verify with `sha256sum` before running; do not rebuild.

## Approved mint command (prepared, not executed)

```sh
spl-token --config "$CUOTAS_KEYS/solana-cli.yml" --url devnet \
  --fee-payer "$CUOTAS_KEYS/deployer.json" \
  --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA \
  create-token --decimals 6 \
  --mint-authority BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf \
  "$CUOTAS_KEYS/devusdc-mint.json"
```

Classic SPL Token (Tokenkeg), 6 decimals, mint authority = deployer, **no freeze authority**. This is a team devUSDC for testing — it is not real USDC and must never be presented as such.

## Post-deployment verification plan

Read-only checks to run immediately after execution, before claiming success:

1. `solana program show E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ --url devnet` — program `executable: true`, ProgramData bound, upgrade authority = deployer.
2. `solana program dump E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ /tmp/deployed.so --url devnet` — deployed bytecode prefix must equal the approved 469,824-byte `.so` (loader allocation padding may follow); record hash.
3. `spl-token display 8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y --url devnet` — owner Tokenkeg, initialized, decimals 6, mintAuthority = deployer, freezeAuthority = null.
4. Record finalized transaction signatures, slots, fee payer and remaining balance here and in the run's shared deployment report.

## Explicitly not authorized / not done

No `admin_init_config`/`pool_init`, no `mint-to`, no ATA creation, no LP deposits, no loans or guarantee writes, no authority changes, no buffer close/refund, no mainnet, no real funds. Protocol initialization stays out of scope because business economics are still PROVISIONAL.

## Current outcome

- **Program: NOT DEPLOYED.** **Mint: NOT CREATED.** Blocker: devnet faucet rate limiting; awaiting manual web-faucet funding (4 test SOL requested from the user) or an authorized alternative.
- To resume: verify deployer balance > ~2.5 SOL, re-hash the `.so`, run the two approved commands, run the verification plan, then update this report and `README.md` with signatures and slots.
