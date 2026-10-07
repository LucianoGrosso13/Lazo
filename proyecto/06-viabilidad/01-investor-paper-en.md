# Lazo — Investor Paper

**Zero-interest installments for students without credit cards, backed by a family guarantor, financed by a USDC pool on Solana.**

*Prepared for investors and hackathon judges · October 6, 2026 · Status: working MVP on Solana devnet (test USDC — real transactions, fake money). Every projection below is a scenario model, not a guarantee. Verified data carries a source; assumptions are marked.*

---

## 1. The problem, in numbers

Argentina runs on installments — **~73% of e-commerce sales are paid in cuotas** (CACE 2025, ~US$24B market). But the credit card is the gatekeeper: only ~40% of adults have one (BCRA), penetration among 18-29 year-olds is the lowest of any age band, and **~2.7M university students are mostly cardless** (GOcuotas' CEO: "7 of 10 Argentines aged 20-35 have no credit card").

What do they do today? Three bad options:

1. **Mercado Pago "Cuotas sin Tarjeta"** — published CFTEA of **76% to 1,376% APR** (company disclosure, Aug-2026). A $1,000 laptop costs ~$1,290 in 3 installments in a real documented case.
2. **Borrow a relative's card** — the informal default. The family member exposes their full credit limit on every purchase, and the student builds zero credit history.
3. **Give up.** 22% of Argentine households use installments as a survival strategy (INDEC); informal workers — **45% of the workforce** — are mostly shut out of the formal credit system.

## 2. The product

Lazo formalizes the "lend me your card" behavior Argentina already has:

- **Student**: 3 monthly installments, near-zero real cost (~4% vs ~29% at Mercado Pago), no own card needed. Every plan paid on time moves them up a tier ladder — lower down payment, higher purchase cap, on-chain reputation (tier + counters only, never purchase details).
- **Guarantor** (a parent or relative): registers a credit card through a capped, written surety (fianza, art. 1578 CCyC). **Charged only if the student defaults.** Never needs to know what a wallet is: KYC via Didit, card tokenized at a licensed processor.
- **Merchant**: paid instantly in one transaction, zero default risk, ~4.9-7% fee on the financed amount — **the cheapest verified installment financing in the market** (GOcuotas charges 4.9-9.9% and pays in 22-65 business days; Cuotas MiPyME ~6.9% at 10 business days and only for certified SMEs; Mercado Libre ~8.9-12.5% for 3 interest-free installments).
- **Pool**: USDC liquidity in junior/senior tranches. Every advance, payment, recovery and loss is verifiable on-chain — the transparency no local lender offers.

**Why it works**: the guarantor converts Argentina's strongest institution — family — into credit infrastructure. 94% of US private student loans are cosigned; causal evidence shows cosigners reduce default (Klonner & Rai) by solving adverse selection. The student's portable on-chain reputation is the graduation path.

## 3. Why now

- **Cuota Simple died June 2025.** Argentina's subsidized installment program for SMEs ended; its replacement (Cuotas MiPyME) covers only certified SMEs, charges ~6.9% and pays in 10 business days. A gap opened exactly where we sit.
- **Argentina is the world's #1 stablecoin market**: 61.8% of local crypto activity is stablecoins (Chainalysis 2025), 12.4% of the population uses crypto monthly — #1 in LatAm per capita. The funding rail for a USDC credit pool exists here and nowhere else.
- **The precedent stack is proven**: GOcuotas already discounts consumer receivables under the same legal mechanism (subrogation, art. 915 CCyC); Credix already funded LatAm receivables in USDC on Solana with Solana Foundation as LP; MercadoLibre securitizes consumer credit locally through CNV-authorized financial trusts.
- **Local credit stress = our wedge**: consumer non-bank delinquency runs ~30% (BCRA); Ualá hit 43% before its write-off. Everyone is repricing subprime credit. The guarantor model prices risk differently — it's the only structure that can offer near-zero cost to the borrower and survive.

## 4. Business model — who pays what

| Actor | Pays | Gets |
|---|---|---|
| Student | ~4-7% real cost on financed amount (0-6% interest + ramp) | installments at ~1/7th the cost of Mercado Pago, credit history |
| Merchant | 7% on financed (~4.9% of price) — cheapest verified | instant cash, new customers MP rejects, zero default risk |
| Company | origination fee (2% of financed) + servicing (5%/yr) + FX spread (~1% on peso flows) | the P&L |
| Junior LP (team/sponsor) | first-loss capital | residual yield (~38%/yr modeled at d=30%) |
| Senior LP | 75-80% of pool | fixed ~8%/yr, protected by junior + reserve |

**The honest unit economics** (model in `modelo-financiero.py`; methodology extends our published pool model):

- Book yield with guarantor (recovery 80%): **+16%/yr at 30% default**, break-even at ~53% default.
- Without guarantor the book loses ~48-50%/yr — the unguaranteed tier is a capped acquisition cost (max ~$100-150/plan), funded inside the junior tranche only.
- Company margin: **~$7-14 per plan** (at $500-700 financed) before fixed costs; operating break-even ~1,100-2,100 plans/month at a lean $15k/mo opex. The junior carry on own equity is the largest early revenue line.

## 5. Market size

- **TAM**: ~US$15-20B/yr of installment-financed retail in Argentina (e-commerce US$24B × ~70% in cuotas + in-store directed credit).
- **SAM**: the no-card BNPL segment — market estimate **US$3.5B (2026)** growing ~26%/yr (PayNXT360).
- **SOM**: ~1.9M cardless students × US$150-250/yr financed ≈ **US$300-470M/yr addressable**. Year 1-2 realistic capture (student-vertical merchants, Córdoba/Tucumán/CABA): US$1.5-7M originations ≈ US$100-500K gross revenue.

## 6. Competition

| Player | Consumer cost | Merchant cost / payout | Weakness vs Lazo |
|---|---|---|---|
| Mercado Pago Cuotas sin Tarjeta | CFTEA 76-1,376% | 1.35%+VAT on QR-credit | predatory consumer pricing; student needs pre-approved line |
| Mercado Libre interest-free | 0% (merchant-subsidized) | ~8.9-12.5%, pays later | needs a credit card |
| Naranja X / Ualá | CFTEA 70-437% | varies | same consumer-price problem |
| GOcuotas | 0% (debit installments) | 4.9-9.9%, **pays in 22-65 business days** | slow merchant cash, no credit-building path, ARS only |
| Cuotas MiPyME (state) | 0% | ~6.9%, 10 business days, SMEs only | registry-gated, still slow |
| PayJoy-style | device lock | n/a | not in Argentina; locks goods |

**Moat**: guarantor-with-card underwriting (no competitor uses a family guarantor) + instant merchant payout + portable on-chain reputation + USD funding pool. Yumi Finance won Colosseum Cypherpunk with on-chain BNPL but targets web3 users' existing data, not cardless students in physical commerce.

## 7. Pool architecture — how LPs get paid

```
Pool = Junior 20-25% (team/sponsor, first loss, contractual — not a promise)
     + Senior 75-80% (fixed ~8%/yr, payment priority)
     + Loss reserve (~10% of gross fees, absorbs losses before junior)

Invariants (enforced on-chain):
- coverage ratio: senior can't grow if junior/(junior+senior) < 20%
- senior capital only funds guarantor-backed plans; unguaranteed book lives in junior
- idle capital sweeps to overcollateralized money markets (Kamino/Jupiter ~4.5-6%)
- early-amortization trigger: if cohort 30+DPD breaches threshold, new origination
  with senior funds stops; collections go to senior first
```

This is the published industry standard: Centrifuge TIN/DROP (New Silver: junior ≥15-20% issuer-funded), Goldfinch leverage model, Credix 80/20 + originator overcollateralization, Affirm ABS (~70% AAA senior + subordination + OC + excess spread).

**What Goldfinch taught us** (it's winding down in 2026): concentrated borrowers, hidden information and ad-hoc backstops kill credit pools. Our design answers: thousands of diversified micro-credits (not 15 borrowers), contractual junior (not promised), fraud controls at merchant level (KYC, per-merchant caps, holdbacks, cohort clawback).

## 8. Regulatory architecture (built-in, not bolted on)

- **Credit structure**: the merchant originates as an installment sale; the platform acquires the receivable by subrogation (art. 915 b/c CCyC) — the exact mechanism GOcuotas runs in production. Originator/servicer registers as PNFC at BCRA (~standard threshold) and reports to the Central de Deudores.
- **Pool**: treasury-funded in MVP. External funding only through (a) offshore vehicle for non-Argentine/accredited LPs (Credix pattern), or (b) private placement to ≤35 qualified investors per round (RG CNV 1016/2024 + 1088/2025), or (c) CNV-authorized financial trust — the Mercado Crédito instrument. **The pool is never offered to the Argentine public** (Ley 21.526 art. 19; CNV's Belo/ARGt precedent, Mar-2026: a yield-bearing token = security).
- **Custody**: students pay self-custody; no third-party crypto custody → PSAV not triggered by design (if custody is added: CNV registration + UIF subject + net-worth floor USD 35-150k).
- **Consumer**: CFT disclosed even at 0%; no "interest-free" marketing if merchant reprices (Res. 51/2017 anti-bait clause in merchant contract); punitorio capped and on the overdue installment only.
- **Data**: on-chain stores tier + counters (hash/commitment only); identified-wallet = personal data → AAIP registry, express consent, revocation-as-new-state for the rectification right (blockchain can't delete).

## 9. Risks — stated plainly

| Risk | Severity | Mitigation |
|---|---|---|
| Guarantor recovery `r` < modeled (chargebacks: 83-86% of Argentine card disputes resolve for the cardholder) | **critical** | express debit mandate + 3DS at onboarding + 72h pre-charge notice + written fianza as legal backstop; r is pilot KPI #1 |
| Merchant×student fraud (fake sale drains pool) | high | merchant KYC, per-merchant caps, 10% holdback until 1st installment, cohort clawback |
| Default `d` > modeled | high | tier-0 break-even needs d<53%; kill-switch per cohort; punitorio income unmodeled (upside) |
| Tier ladder assumes default falls with reputation | structural | if d stays ~30%, raise required coverage in tiers 2-3 (they lose money at constant d) — measured from first cohorts |
| Regulation shifts (USDC debt, PSAV, pool offering) | medium | counsel before mainnet; structure is deliberately conservative |
| Selection adverse (only MP rejects arrive) | medium | guarantor requirement inverts selection — the best evidence in credit (94% cosigned in US student lending) |

## 10. Roadmap

| Phase | Milestone | Gate |
|---|---|---|
| Now (hackathon) | Working product on devnet: purchase, guarantor, late-flow, recovery, pool dashboard — real transactions, test USDC | shipped ✔ |
| Pilot (Q1-27) | 2-3 merchants, ~100 plans, treasury-funded pool. Measure d, r, chargeback, CAC | r ≥ 70% and d ≤ 30% → scale |
| Growth | Offshore LP vehicle or CNV private placement; senior opens to qualified investors; Tiendanube/WooCommerce plugins | senior coverage invariant live |
| Scale | Financial trust (fideicomiso) securitizing the book in ARS; reputation API as a product | NPL curves by vintage proven |

## 11. The ask

Hackathon stage: **ecosystem LP/sponsor for the junior tranche** (Solana Foundation was LP in Credix's first pool — the precedent exists) + pilot merchants. Seed stage: equity round to fund (a) junior capital ~20-25% of pool, (b) the opex runway to ~1,500 plans/mo break-even (~US$1M financed/mo), (c) legal setup (PNFC + offshore vehicle ≈ US$50-80k).

## 12. What we verified vs. what we're betting on

**Verified**: market size and competitor pricing (CACE, official tariff pages, MELI 8-K), regulatory framework (laws cited by number), cosigner credit evidence (US student lending, causal studies), pool precedents with numbers (Centrifuge, Credix, Affirm ABS, Goldfinch post-mortem), on-chain unit costs (Solana fees, Didit pricing).

**Betting on (pilot KPIs)**: default `d` ≈ 30%, guarantor recovery `r` ≈ 80% before chargeback, default falling by tier, merchants accepting 4.9-7% for instant settlement, students paying in USDC or via a peso ramp.

**What we will never claim**: traction we don't have. This runs on devnet with test USDC; the three KPIs above are what the pilot exists to measure.

---

*Appendices: `02-flujos-de-caja.md` (complete cash flows), `03-memo-legal.md` (legal memo), `04-cambios-rentabilidad.md` (rule changes), `modelo-financiero.py` (reproducible model).*
