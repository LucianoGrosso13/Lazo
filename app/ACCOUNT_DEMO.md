# Lazo account demo

Lazo is a student installment demo on Solana **devnet**, the test network. Its devUSDC token has no monetary value. The current account flows use an explicitly labelled browser mock; they do not submit blockchain transactions or charge cards.

## Run locally

Use Node.js 24.13 or newer supported by the dependencies.

```sh
npm ci
npx playwright install chromium
npm run dev
```

`NEXT_PUBLIC_CUOTAS_MODE=mock` is the default. The account entry is `/app`; `/panel` remains a student-panel alias. Public merchant and pool views are `/comercio` and `/pool`.

## Model and boundaries

The checkout, plans, installments, merchant balance, pool and demo clock share the same `getCuotas()` client and persisted financial state. `getAccountCuotas()` adds account roles and invitation metadata and delegates guarantee mutations to that same client. It does not create a second ledger. Terms come from `ProtocolConfig`, including zero student interest and the merchant fee applied to the financed amount.

The guarantor enters through an invitation URL without a wallet. Mock invitation associations are stored in the same browser; a link opened on another device does not share the association or financial history. Identity verification, credit-card selection, mandate acceptance and recovery receipts are simulated. Do not enter real card data. Mock evidence never links to Solana Explorer. Purchase eligibility coverage, current unpaid balance and the contractual guarantee maximum are separate amounts.

`NEXT_PUBLIC_CUOTAS_MODE=real` does not enable a complete production flow. The deployed program/IDL, generated transaction client, real token-backed invitations, Didit and Mobbex integrations remain pending. Unsupported operations must fail explicitly. A real wallet connection has not been verified by these browser tests. Any signed or sent transaction requires the user's explicit approval. Mainnet and real funds are outside this hackathon demo.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Account acceptance is based on user-visible public browser routes. Internal adapter tests are not acceptance evidence. Detailed results and screenshots will be recorded after integration in `.scratch/app-cuentas/verification.md`; the current record lists pending checks.
