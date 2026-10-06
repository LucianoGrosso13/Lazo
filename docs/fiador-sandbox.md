# Guarantor sandbox flow (off-chain)

Devnet demo only. The guarantor (fiador) has no wallet: they open an invite
link, verify identity on a Didit-hosted page, register a test card on a
Mobbex-hosted page, and explicitly accept a surety cap. The server builds the
canonical mandate text and proposes `keeper_register_guarantee`; the keeper
key never touches HTTP — registration is sent by the keeper CLI under an
explicit approval, and the app only verifies the resulting signature
on-chain. Nothing is signed or sent without an explicit, fresh approval.

## Architecture

```text
student browser            Next.js (app/)              providers (sandbox)
    |  POST /api/fiador/invitaciones {student}                |
    |<---- HMAC token (v1.payload.sig, 72h TTL)               |
    |  WhatsApp link: /fiador/<token>                         |
    |                      guarantor browser                   |
    |                      GET invitaciones/[token] (verify)   |
    |                      POST kyc/sesiones -> Didit url -----+--> Didit hosted KYC
    |                      Didit webhook (signed) <------------+-- status.updated
    |                      POST tarjetas/sesiones -> sourceUrl +--> Mobbex hosted card entry
    |                      Mobbex webhook (unsigned, re-queried)   |
    |                      GET fianza/cotizar (server quote     |
    |                       from chain config, no free cap)     |
    |                      POST fianza/aceptar                 |
    |                      mandateHash + dry-run proposal      |
    |                      keeper CLI sends registration       |
    |                      (explicit approval, keeper key only)|
    |                      POST fianza/registrar {signature}   |
    |                      verify-only: confirms the tx on-    |
    |                      chain, never signs (no fake tx)     |

keeper/ (local loop, dry-run by default, real Codama adapter)
    polls plans -> PROPOSED -> --execute --proposal <id> --approved-by <n> --yes
    -> Mobbex execution (verified via operations API) -> registerRecovery
    guarantee --acceptance <id> --approved-by <n> --yes -> registerGuarantee
```

## Official sources (verified, not guessed)

Didit (`docs.didit.me`):

- Create session: `POST https://verification.didit.me/v3/session/` with
  `x-api-key`, body `{workflow_id, vendor_data, callback, metadata}` →
  `201 {session_id, session_token, url, status}`.
  <https://docs.didit.me/sessions-api/create-session>
- Retrieve decision: `GET /v3/session/{session_id}/decision/` → top-level
  `status` (`Not Started`, `In Progress`, `Awaiting User`, `In Review`,
  `Approved`, `Declined`, `Resubmitted`, `Expired`, `Kyc Expired`,
  `Abandoned`). Polling is a documented fallback; webhook-then-fetch is
  recommended. <https://docs.didit.me/sessions-api/retrieve-session>
- Webhooks: `X-Signature-V2` = HMAC-SHA256 over sorted, Unicode-preserved
  compact JSON (recommended); `X-Signature` = HMAC over raw bytes;
  `X-Timestamp` must be within 300s; idempotency on `event_id` or
  `session_id + status + webhook_type`; 2 retries (1m, 4m). The deprecated
  `X-Signature-Simple` is NOT accepted (it does not cover the decision).
  <https://docs.didit.me/integration/webhooks>

Mobbex (`mobbex.dev`):

- Manual subscriptions: ONE `type: "manual"` subscription holds every
  subscriber; each execution carries its own amount.
  `POST https://api.mobbex.com/p/subscriptions/`, auth via `x-api-key` +
  `x-access-token` headers. <https://mobbex.dev/ckn4-suscripciones>
- Subscriber: `POST /p/subscriptions/{id}/subscriber`
  `{customer: {name, email?, identification?}, reference}` →
  `{sourceUrl (send the user here to add their card), subscriberUrl}`.
  <https://mobbex.dev/suscriptores>
- Variable charge: `POST
  /p/subscriptions/{id}/subscriber/{sid}/execution`
  `{total, reference, description}`. `reference` must be unique per operation.
  <https://mobbex.dev/suscriptores>
- Verify: `GET /p/operations/{uid}` → `payment.status.code "200"` = approved.
  <https://mobbex.dev/consulta-de-operaciones-y-childs>
- Webhooks (`type: "subscription:execution"`) document NO signature, so they
  are treated as notifications only: every claimed payment is re-queried via
  the operations API before any state changes.
  <https://mobbex.dev/webhooks>
- Test cards (test mode only, expiry 12/34): Visa credit `4507983190082450`,
  Mastercard credit `5323629993121008`, among others. Test mode is enforced:
  anything but `MOBBEX_TEST_MODE=true` refuses to run.
  <https://mobbex.dev/medios-de-pago-para-pruebas>

On-chain contract (read-only here; owned by the program worker):

- `keeper_register_guarantee(max_purchase: u64, coverage_max: u64,
  mandate_hash: [u8; 32])`, keeper-signed, PDA `["guarantee", student]`,
  all args > 0, non-zero hash. Program `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`
  (devnet). See `programa/target/idl/cuotas.json` and
  `programa/programs/cuotas/src/instructions/keeper_guarantee.rs`.

## Required environment (names only; values stay in `app/.env.local`, never committed)

| Name | Used by | Notes |
|---|---|---|
| `FIADOR_INVITE_SECRET` | app routes | HMAC secret for invite tokens. No default; missing = fail closed. |
| `INVITATION_TTL_SECONDS` | app routes | Invite expiry. Default `259200` (72h). |
| `FIADOR_COVERAGE_POLICY` | app routes | `A` (initial-tier financed + penalty) or `B` (max across tiers). NO default; unset = `coverage_policy_pending` (user decision pending). |
| `FIADOR_DATA_DIR` | app routes, keeper (read) | File-store dir. Default: OS temp dir. |
| `DIDIT_API_KEY` | app routes | Secret. Missing = `didit_not_configured` (503), no fake URL. |
| `DIDIT_WORKFLOW_ID` | app routes | Published KYC workflow UUID. |
| `DIDIT_WEBHOOK_SECRET` | app webhook | Per-destination `secret_shared_key`. |
| `DIDIT_BASE_URL` | app routes | Default `https://verification.didit.me`. |
| `DIDIT_CALLBACK_BASE` | app routes | Optional public base for the hosted-flow return URL. |
| `MOBBEX_API_KEY` | app routes, keeper | Sandbox key. |
| `MOBBEX_ACCESS_TOKEN` | app routes, keeper | Sandbox token. |
| `MOBBEX_SUBSCRIPTION_ID` | app routes, keeper | UID of the ONE manual sandbox subscription. |
| `MOBBEX_BASE_URL` | app routes, keeper | Default `https://api.mobbex.com`. |
| `MOBBEX_TEST_MODE` | app routes, keeper | Must be exactly `true`; anything else refuses (`mobbex_live_refused`). |
| `MOBBEX_ARS_PER_USDC` | keeper | Demo ARS/USDC rate for sandbox charges. NO default; no charge without it. Sandbox only, no production conversion. |
| `FIADOR_ALLOW_SIMULATED_RECOVERY` | keeper | Plan C switch. Default off; when off and no gateway creds, charging fails closed. |
| `KEEPER_RPC_URL` | keeper | Default devnet. Non-devnet/non-localhost URLs are refused. |
| `KEEPER_DATA_DIR` | keeper | Journal dir. Default `keeper/data`. |
| `KEEPER_POLL_SECONDS` | keeper | Loop interval. Default `15`. |
| `KEEPER_KEYPAIR_PATH` | keeper sends | Keeper key for signing. Never logged; reads still work without it, sends refuse (`keeper_key_missing`). |
| `NEXT_PUBLIC_CUOTAS_PROGRAM_ID` | app chain reads, keeper | Program address on devnet. |

## API endpoints (all under `app/src/app/api/fiador/`)

| Method + path | Purpose |
|---|---|
| `POST invitaciones` `{student}` | Mint an HMAC invite (201). |
| `GET invitaciones/[token]` | Verify + completion state (404 invalid, 410 expired). |
| `POST kyc/sesiones` `{token}` | Create Didit hosted session (201 `{sessionId, url}`). |
| `GET kyc/sesiones/[id]?token=` | Live status from the decision API (status only, no PII). |
| `POST kyc/webhook` | Signed Didit destination; webhook-then-fetch confirm. |
| `POST tarjetas/sesiones` `{token, name, ...}` | Create Mobbex subscriber; returns hosted `sourceUrl`. Refuses any PAN/CVV-shaped field (`card_data_refused`). |
| `GET tarjetas/estado?token=` | Saved-card state (masked label only). |
| `POST mobbex/webhook` | Notification-only; re-verifies via operations API. |
| `GET fianza/cotizar?token=&maxPurchase=` | Server-side quote: tiers + penalty read from the on-chain config, coverage from the explicit policy. |
| `POST fianza/aceptar` | Explicit acceptance → mandate hash + dry-run proposal. Recomputes the cap server-side; client figures are never trusted. |
| `POST fianza/registrar` `{acceptanceId, signature}` | Verify-only: confirms the keeper-submitted registration tx on-chain (dedupe by signature). Never signs. |

## Trust model

- Invite tokens are stateless HMAC-SHA256 (`v1.<payload>.<sig>`), bound to one
  student, 72h TTL, constant-time comparison. The store keeps only token
  hashes.
- Didit webhooks require `X-Signature-V2` (or raw `X-Signature`) plus the 300s
  window; deliveries dedupe by event key; `Approved` is trusted only after the
  decision API confirms it. Only statuses are stored — never documents,
  biometrics, or decision payloads.
- Mobbex webhooks are unsigned: they never change state directly. Charges and
  webhooks resolve through `GET /p/operations` first.
- Card data is entered on Mobbex-hosted pages only. The server refuses
  PAN/CVV-shaped input, persists only masked labels (`Visa •••• 0010`), and
  refuses to store anything shaped like a full PAN.
- Coverage cap: the guarantor picks a purchase cap on a server-computed quote
  (`cotizar` reads tiers + `penaltyBps` from the on-chain config); the server
  recomputes the coverage maximum from the explicit `FIADOR_COVERAGE_POLICY`
  (`A`: initial-tier financed + penalty; `B`: max across tiers) and refuses
  when the policy is unset (`coverage_policy_pending` — the user decision is
  still pending). Client-attested figures are never trusted; the on-chain
  program enforces the real rules at `open_plan`.
- Every transaction needs explicit approval: the loop and the accept endpoint
  only produce dry-run proposals. Registration is sent by the keeper CLI
  (`guarantee --acceptance <id> --approved-by <name> --yes`); `fianza/registrar`
  only verifies the resulting signature on-chain. The keeper loop needs
  `--execute --proposal <id> --approved-by <name> --yes` per effect.

## Keeper

```sh
cd keeper
npx tsx src/run.ts once --adapter codama      # evaluate, propose, print (dry-run)
npx tsx src/run.ts loop --adapter codama      # repeat every KEEPER_POLL_SECONDS
node src/run.ts proposals                     # list open proposals
npx tsx src/run.ts --execute --proposal <id> --approved-by <name> --yes --adapter codama
npx tsx src/run.ts guarantee --acceptance <id> --approved-by <name> --yes
npm test                    # unit suite (46 tests, zero network)
npm run test:e2e            # scripted-RPC e2e (9 tests, real codecs)
npm run typecheck           # tsc via the app's toolchain
```

The chain adapter is the real `CodamaAdapter` (`keeper/src/codama.ts`): it
reads config + plans through the generated Codama client, guards every call
with a devnet-genesis check, and sends via simulate → send → confirm. Chain
commands run under tsx (the generated client is TypeScript); note the keeper
imports generated PDA helpers per-file because the `pdas` barrel loses its
named exports when loaded as CJS under tsx.

Policy (Q2 timeline, protocol days): day 3 notify, day 6 mark late, day 15
charge the card + register recovery, 2nd charge accelerates. Amounts come from
the plan view; the keeper computes no business math. The append-only journal
(`keeper/data/keeper-journal.jsonl`) makes every effect idempotent across
restarts: journal keys include the plan `openedAt` generation so a recycled
PDA can never collide with a closed plan; terminal keys are never
re-executed; unknown gateway outcomes retry with the same reference
(gateway-side dedupe); verified declines propose a loss (`admin_apply_loss`,
junior first) instead of retrying blindly. Recovery registration is guarded
to the first unpaid index (the program accepts no other), cumulative charges
per plan generation never exceed the accepted `coverageMax`, and a keeper
USDC balance pre-check refuses the on-chain transfer before attempting it.
`ReceiptAlreadyUsed` from simulation syncs as already-registered instead of
failing.

## Sandbox live checks (pending credentials)

None of these have run yet — no provider credentials exist in this workspace:

1. Didit: create a session (`POST kyc/sesiones`), complete it on a phone,
   confirm `Approved` via webhook + decision read.
2. Didit: dashboard delivery log shows 2xx for the webhook destination.
3. Mobbex: create a subscriber, open `sourceUrl`, register test card
   `4507983190082450` (Visa credit, exp 12/34, doc 12123123).
4. Mobbex: `GET tarjetas/estado` reports the masked label (confirms the
   GET-subscriber response shape, currently handled defensively).
5. Mobbex: execute a variable charge for a known ARS figure, verify `code
   200` via `GET /p/operations`.
6. Mobbex: webhook `subscription:execution` arrives and resolves through the
   re-query path.
7. Keeper: `--mock-adapter` loop proposes; a sandbox `--execute` charges and
   journals the verified receipt (devnet + sandbox only).
8. Quote: `GET fianza/cotizar` against devnet returns tiers + penalty from
   the live config and the policy-selected coverage.
9. Guarantee: `guarantee --acceptance <id>` simulates + sends
   `keeper_register_guarantee` on devnet; `POST fianza/registrar` with the
   resulting signature verifies it on-chain (dedupe on re-submit).
10. Keeper e2e on a validator: `once --adapter codama` discovers a real
    overdue plan, proposes, and a sandbox `--execute` charges + registers
    the recovery end to end (the scripted-RPC e2e in
    `keeper/src/e2e/codama.test.ts` covers this path with real codecs and
    no network until then).

## Student-side wiring (for the client worker)

`app/src/components/cuenta/invitar-fiador.tsx` is outside this worker's
ownership, so the student invite button still mints local mock links. To mint
server links it should call:

```ts
const res = await fetch("/api/fiador/invitaciones", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ student }),
});
const { token, path } = (await res.json()) as { token: string; path: string };
// share `${location.origin}${path}` — works cross-browser for 72h
```

## Tests

- App (`cd app && npx vitest run src/lib/server/ src/app/api/`): 72 tests —
  token round-trip/tamper/expiry/wrong-secret, Didit V2 signature + timestamp
  window + replay keys, gateway failure mapping (no fake success), coverage
  policy math + pending refusal, server-side quote from chain config,
  registration signature verification, store persistence + locking,
  approval gate, plus route-level invite lifecycle and fail-closed checks.
- Keeper (`cd keeper && npm test`): 46 tests — journal restart recovery
  (torn journal fails closed), policy day boundaries, first-unpaid /
  stale-guard / acceleration / crank rules, duplicate-execution refusal,
  failed-funding loss path (no registration, no receipt),
  retry-same-reference, cap-bound partial charges, simulated plan C,
  mainnet refusal.
- Keeper e2e (`cd keeper && npm run test:e2e`): 9 tests — the real
  `CodamaAdapter` against a scripted RPC transport serving real
  codec-encoded accounts: overdue discovery + charge proposal, mark-late
  simulate+send, charge → verified funding → recovery registration,
  stale-index refusal, `ReceiptAlreadyUsed` sync, guarantee
  register-once + sync, keeper USDC balance read, keyless fail-closed
  sends, unreachable-RPC not-ready mapping.
