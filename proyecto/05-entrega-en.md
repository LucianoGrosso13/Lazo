# Lazo — submission texts (Colosseum / Superteam Argentina)

Ready to paste into the Colosseum and Superteam Earn forms. Source of every number: `.scratch/producto-final/spec.md` (team decisions, 2026-10-07). Before submitting, resolve every `[A CONFIRMAR]` and delete this header.

---

## Project name

Lazo

## Tagline

Installments without a credit card: backed by family, settled on Solana.

## Short description

Lazo lets students without a credit card buy in installments, backed by a family member who signs as guarantor and is only charged if the student stops paying. Students choose 3 interest-free installments or 6 at a 3% total charge; merchants choose to get paid today or in guaranteed monthly tranches. Every paid plan raises the student's Tier, recorded on Solana. Runs on Solana devnet.

## Long description

**The problem.** In Argentina, installments are how people buy anything that matters, from a laptop to a phone. Interest-free installments live on credit cards, and a student without their own card is left out. Today they borrow a parent's card, pay a much higher financial cost for no-card installments, or don't buy at all. In none of these cases do they build a payment history of their own.

**What Lazo does.** Lazo turns "lend me your card" into a guarantee. The family member doesn't lend the card: they sign a capped guarantee and register a card that is only charged if the student misses a payment. The student pays their own installments in USDC, a dollar-pegged stablecoin (on devnet we use devUSDC, our own test token with no value).

- **Installments:** 3 with no interest, or 6 with a 3% total interest on the financed amount, for purchases from US$ 350.
- **No guarantor, no plan.** The guarantor covers 100% of what is left to pay (principal plus interest), never late fees.
- **Tiers:** Tier 1 · Starter (30% down, up to US$ 1,000), Tier 2 · Steady (20%, US$ 1,000), Tier 3 · Trusted (10%, US$ 1,250), Tier 4 · Full (0%, US$ 1,500). Paying off a plan on time moves the student up one Tier; a guarantor charge moves them down one.
- **Late payments, in the open:** 5 days of grace with no surcharge, guarantor notified on day 3, 5% surcharge on day 6, guarantor charged on day 15.
- **Merchants choose when to get paid.** The down payment is paid at purchase. The financed amount is paid today for a 7% fee, or in equal monthly tranches: 30 days (6.25%), 60 days (5.75%) or 90 days (5.25%). Lazo guarantees each tranche on its date, whether or not the student pays. No new plan opens unless the pool has free liquidity for today's disbursement plus every committed tranche.
- **In-store sales:** the cashier enters an amount and shows a QR; the student scans it and confirms on their phone with their existing guarantee.

**Example.** A US$ 1,000 purchase at Tier 1: US$ 300 down, US$ 700 financed. With 3 installments the student pays US$ 1,000 in total; with 6, US$ 1,021. If the merchant picks 90 days, it receives US$ 300 today and three tranches of about US$ 221 on days 30, 60 and 90 (US$ 963.25 in total).

**Why Solana.** The plan, the pool and the merchant's payout schedule are public accounts that anyone can audit, so a merchant can verify the guarantee behind its future tranches. The student's Tier and payment counters (never the details of each purchase) live onchain and can be read by any merchant. Identity checks, card charges and peso conversion stay offchain with regulated providers.

**Business model.** Revenue comes from the merchant fee (5.25%–7% of the financed amount, depending on when it gets paid) and the 6-installment interest. The pool has a junior tranche that absorbs first losses and a senior tranche with an 8% target yield (a target, not a result). For this hackathon the pool is the team's own treasury on devnet; third-party capital would require a regulated structure.

**Model assumptions (not measured metrics):** 30% down payment, 8% default, 80% recovery from the guarantor, 12% annual cost of capital. Under these assumptions, 6 installments at 3% cover their cost from about US$ 217 for a new customer, which is why the minimum is US$ 350.

**Evidence so far.** A small table test with 3 people from our circle: two bought with their parents' credit card and ruled out the no-card alternative because of its cost; the third didn't buy. It is a small, mostly internal sample. We have no merchants signed, no wallet partnership and no users yet. Next step: a small pilot with students, guarantors and merchants in Tucumán.

**What's next:** Argentine wallets as a distribution and peso-conversion channel (under research, no agreements), and an own-treasury DeFi module, simulated and kept separate from the pool.

Lazo runs on Solana devnet. No real money is used anywhere.

## How to test it in 2 minutes

Open [https://lazo-cuotas.vercel.app](https://lazo-cuotas.vercel.app) [A CONFIRMAR: URL points to the final build]. No wallet or card needed: the web app includes a built-in simulator. Lazo runs on Solana devnet; all money is test money.

1. Go to **/tienda** and pick a product priced at US$ 350 or more.
2. At checkout, choose **6 installments**. Check the 3% total interest, the down payment for your Tier and what the guarantor covers. Confirm.
3. Open the **demo clock** (floating button). Advance 30 days, then pay an installment or let it go overdue to see grace, guarantor notice, surcharge and the day-15 guarantor charge.
4. Go to **/app/comercio**: the merchant's tranches are released on their dates, even if the student is late.
5. Go to **/app/comercio/mostrador**: enter an amount, generate a QR and open it on your phone (or click "Open as customer") to complete an in-store sale.

The "What runs on chain and what runs in the simulator" section on the home page lists exactly which parts are onchain.

## Team

- **Luciano Grosso** (22) — Product Owner.
- **Ignacio Albarracín** (22) — Full Stack Developer.

Both are Computer Engineering students at Universidad del Norte Santo Tomás de Aquino (UNSTA) in Tucumán, Argentina, graduating in December 2026, and long-time friends.

Individual contributions: [A CONFIRMAR].

**Use of AI:** we built Lazo with AI coding agents (Claude Code as coordinator, plus Devin and GPT workers on isolated branches), with every change reviewed and merged by the team.

## Tech and architecture

- **Onchain program:** Anchor 1.2 program `cuotas` on Solana devnet. Program ID `E6pB2UER6PoXXQeuokWoVg4qd7WELMJxByhePcL6AQJQ`. Junior/senior USDC pool, plan origination (down payment to the merchant plus pool advance in one transaction), installment payments, late-payment crank, guarantor recovery registration, reputation (Tier and counters) and a guarantee registry (hash of the signed guarantee). All business numbers live in an onchain `ProtocolConfig`. Tested with LiteSVM.
- **Frontend:** Next.js App Router, TypeScript and Tailwind, with `@solana/kit`, `@solana/kit-plugin-wallet` and `@solana/react`. A TypeScript client generated with Codama from the program IDL. The UI talks to the chain through a single interface with two implementations: a real devnet client (devnet genesis-hash guard, simulate before signing) and a browser simulator.
- **Offchain services:** Didit for identity checks and Mobbex for the guarantor's card, both in sandbox mode, called from Next.js route handlers. A Node keeper that proposes late-payment and recovery actions in dry-run mode and only executes with explicit approval.
- **Token:** devUSDC, our own 6-decimal test mint on devnet, with no value.

Repository: [https://github.com/LucianoGrosso13/Lazo](https://github.com/LucianoGrosso13/Lazo)

## What's onchain vs simulated

**Onchain (Solana devnet):**
- The `cuotas` program: pool with junior and senior tranches, plan opening, installment payments, late marking, guarantor recovery registration, Tier and counters, guarantee registry.
- 3 and 6 installments, mandatory guarantor, and guarantor coverage of principal plus interest, implemented in the program. Deployed to devnet: [A CONFIRMAR: program upgrade and config init done on devnet].
- Merchant payout tranches (`PayoutSchedule`, `release_payout`, pool liquidity check): [A CONFIRMAR: onchain if ticket 03 merged; otherwise move this line to "Simulated"].

**Simulated (browser simulator used by the public web app):**
- The full walkthrough for judges, with no wallet or card required.
- The demo clock that moves time forward.
- In-store sales with QR.
- Identity checks and guarantor card charges (Didit and Mobbex integrations are built for sandbox mode; live sandbox credentials are pending).
- Marketplace merchants, which are sample merchants.

**Known difference:** the simulator lets a student hold several plans within their Tier limit; the program currently allows one active plan per student.

Lazo runs on Solana devnet. Never mainnet, no real money.
