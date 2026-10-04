# cuotas — devnet deployment report

**Status: DEPLOYED AND VERIFIED on Solana devnet.**

The program account and the devUSDC mint exist on-chain, were independently re-verified by byte-for-byte comparison of the deployed bytecode against the reviewed artifact, and both transactions are finalized. This deployment creates no protocol state beyond the program binary and the mint: `admin_init_config`/`pool_init` were never invoked, no tokens were minted, and all business-economics decisions (cash-loss simulation vs credit write-off, proportional gain allocation) remain PROVISIONAL and pending final sign-off.

- Network: **Solana devnet only** (test network, no real value). Never mainnet.
- User approval: explicit, recorded in the run's `deployment-proposal.json` (devnet funding ≤ 8 test SOL, exact reviewed binary deployment, classic SPL 6-decimal mint; no protocol init, no mint-to, no transfers).
- All key material lives **outside this repository** in an owner-only directory (0700, files 0600). Paths below use the placeholder `$CUOTAS_KEYS`; private bytes are never committed or printed.

## On-chain addresses (verified live)

| Item | Address | Explorer (devnet) |
|---|---|---|
| Program ID (executable) | `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ` | https://explorer.solana.com/address/E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ?cluster=devnet |
| ProgramData | `4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum` | https://explorer.solana.com/address/4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum?cluster=devnet |
| devUSDC mint | `8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y` | https://explorer.solana.com/address/8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y?cluster=devnet |
| Deployer / upgrade & mint authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` | https://explorer.solana.com/address/BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf?cluster=devnet |
| Deploy buffer (stranded, see below) | `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW` | https://explorer.solana.com/address/DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW?cluster=devnet |

## Deployed artifact verification

- Program source commit: `b7833ac653d5de3872d5c58982915d9aabf61f72` (merged via `09a74d382043a666962b28288305c2a87a76c132`; integrated on `7948f9eb9348ce5a0b3cb95ffac64995be18fc3f`).
- Deployed artifact `target/deploy/cuotas.so`: **SHA-256 `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476`**, 469,824 bytes. Re-hashed immediately before deployment; not rebuilt since review.
- IDL `target/idl/cuotas.json`: SHA-256 `f0231f0a67332d698cc14d0b17b8bd9e80202e218cdd3066eee90a78b2284774`.
- On-chain check: ProgramData account is 469,869 bytes = 45-byte loader header + 469,824-byte bytecode, **zero padding**. The deployed bytecode prefix hashes to **exactly the same SHA-256 `8d05b07f…2476`** — bit-for-bit identical to the reviewed artifact.
- Local acceptance before deployment: 97/97 LiteSVM tests + 29/29 host tests on the same artifact hash; fmt/clippy clean.
- Toolchain: Anchor 1.2.0, Solana CLI 3.1.14, spl-token 5.5.0. Isolated `solana-cli.yml` pins devnet + deployer key; the global Solana config is untouched.

## On-chain acceptance criteria — all met

| Check | Result |
|---|---|
| Program account `executable` | `true` |
| Program owner | `BPFLoaderUpgradeab1e11111111111111111111111` (upgradeable loader) |
| ProgramData bound to program | `4d24CoS6PMzHVx38y9hvgMfZGpvpM68tcm4QbfM4DHum` |
| Upgrade authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` (deployer) |
| Deployed bytecode | SHA-256 `8d05b07fd749c950d87d32396470402c5ae28749e53ab3e7079710269b7b2476`, no padding |
| Mint owner | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` (classic SPL Token, **not** Token-2022) |
| Mint initialized / supply | initialized, supply 0, 82-byte account |
| Mint decimals | 6 |
| Mint authority | `BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf` (deployer) |
| Freeze authority | `null` (not set) |

An independent verification script in the run's coordination directory (`verify-deployment.py` → `root-chain-verification.json`) re-checked every row above at `finalized` commitment and returned `VERIFIED`.

## Transactions

| Action | Signature | Slot | Status | Explorer (devnet) |
|---|---|---|---|---|
| Program deploy | `4vUZVxJDGkdYVKScQ8VBtidZBAaj8FoHoyquedfxXUUKmY8gDdie72GR37G1Bp2SQJmxYLKxoWMXwzFfDqZMFeiM` | 507192198 | finalized, err null | https://explorer.solana.com/tx/4vUZVxJDGkdYVKScQ8VBtidZBAaj8FoHoyquedfxXUUKmY8gDdie72GR37G1Bp2SQJmxYLKxoWMXwzFfDqZMFeiM?cluster=devnet |
| devUSDC mint creation | `3Qh1s6PPH6VCKoJvZfbDvJGEVHd78MoWZ6Rv59gxWFie7NWjE7VecZncoujfQ12b8cLyCfx9nozGDNfQ6yfdzG3K` | 507192684 | finalized, err null | https://explorer.solana.com/tx/3Qh1s6PPH6VCKoJvZfbDvJGEVHd78MoWZ6Rv59gxWFie7NWjE7VecZncoujfQ12b8cLyCfx9nozGDNfQ6yfdzG3K?cluster=devnet |

Fee payer for every transaction: the deployer keypair. Buffer writes are many small transactions not listed individually; their effect is fully covered by the deployed-bytecode hash above.

## Funding record

Devnet SOL has no real value and comes only from the public faucet. Budget approved: ≤ 8 test SOL total received.

| # | Time (UTC) | Amount | Endpoint | Result |
|---|---|---|---|---|
| 1 | 2026-10-04 00:47:47 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 2 | 2026-10-04 00:49:07 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 3 | 2026-10-04 00:54:18 | 2 SOL | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; balance verified 0 |
| 4 | 2026-10-04 00:56:58 | 0.01 SOL (bootstrap probe) | api.devnet.solana.com CLI airdrop | Rejected: rate limit reached; coordinator authorized exactly one such probe |
| 5 | ~2026-10-04 01:07 | 5 SOL | user via official web faucet (manual) | **Received and finalized**; root verified `5,000,000,000` lamports |

- Total **received: 5 SOL** of the ≤ 8 SOL budget. No further requests were made; none are needed.
- Final deployer balance after all operations: **0.22040056 SOL**.
- Where the funds went: ProgramData rent 2.38758476 SOL (held in the program's data account) + program account rent ~0.00083 + mint rent 0.0010668 + write/deploy/mint transaction fees; plus 2.38758476 SOL re-locked in the deploy buffer account (see below).

## Deployment execution log

The exact approved `solana program deploy` argv was used with only the permitted `.so` path substitution (integration worktree, identical SHA-256). Devnet transaction congestion caused repeated send/confirm failures; each bounded invocation made incremental progress because the CLI skips buffer chunks already written:

| Attempt | Result | Buffer written after attempt |
|---|---|---|
| 1 | `Data writes to account failed: Max retries exceeded` | ~36% |
| 2 | same | ~65% |
| 3 | same | ~72% |
| 4 | same | — |
| 5 | **success**, deploy signature above | 100%, program activated |
| 6 | `Max retries exceeded` | n/a — ran before attempt 5's success was observed; re-created the buffer account |

Attempt 6 re-created buffer account `DUgcg4Y2FTujLeV1X4CQPVAogPyrgsHopZgnxP56ddNW` (partial data, owned by the upgradeable loader) holding 2.38758476 SOL of rent. Closing it to reclaim rent is **not authorized** (no buffer-close/refund transactions were approved), so the buffer is left in place harmlessly. The program account itself is unaffected.

## Commands executed (exact approved argv; `$CUOTAS_KEYS` = owner-only key dir outside the repo)

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

```sh
spl-token --config "$CUOTAS_KEYS/solana-cli.yml" --url devnet \
  --fee-payer "$CUOTAS_KEYS/deployer.json" \
  --program-id TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA \
  create-token --decimals 6 \
  --mint-authority BY6ZB2WD76wLLTNoWg2sM14RbXsgivcwkgLK4dZWMehf \
  "$CUOTAS_KEYS/devusdc-mint.json"
```

## Explicitly not done (out of authorized scope)

No `admin_init_config`/`pool_init`, no `mint-to`, no ATA creation, no LP deposits, no loans or guarantee writes, no authority changes, no buffer close/refund, no mainnet, no real funds. Protocol initialization stays out of scope because business economics are still PROVISIONAL.

## Re-verify at any time (read-only)

```sh
solana program show E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ --url devnet
solana program dump E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ /tmp/deployed.so --url devnet
sha256sum /tmp/deployed.so   # expect 8d05b07f…2476
spl-token display 8aLmRWDfWJSDUsF8a8BBqzfs4rJEZz2RbBminPVu9d9Y --url devnet
```
