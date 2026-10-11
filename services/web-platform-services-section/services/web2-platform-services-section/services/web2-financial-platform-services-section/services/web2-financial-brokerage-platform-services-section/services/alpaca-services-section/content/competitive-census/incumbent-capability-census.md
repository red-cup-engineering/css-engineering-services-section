# Incumbent capability census: the personal quant / AI-trading platform

Written 2026-08-31, following `.claude/skills/meet-then-beat/SKILL.md`
(specified 2026-09-01, generalized from "meet then beat should legit
be a skill some duties entail"). This carrier sits beside
[`PERSONAL-QUANT-PLATFORM-THEORY.md`](../../PERSONAL-QUANT-PLATFORM-THEORY.md)
— the house theory this product realizes — so the trading enterprise's
meet-gap roadmap derives from measured incumbents instead of vibes.
Named incumbents: Composer.trade, QuantConnect, TradingView (the
strategy/bot ecosystem around it), Alpaca's own AI-agent offerings, and
Horizon.Trade as the currently-prominent AI-native agentic entrant. Every
capability row is measured from the incumbent's own current material
(WebSearch/WebFetch, dated 2026-08-31) or a primary regulatory filing;
where a search returned only third-party review-site aggregation the
claim is kept but marked as such rather than presented as primary.

Current house state measured against: a direct listing of every
`services/*/package.json` under this section (53 service packages) and
a direct read of `@red-cup-engineering/coinbase-x402-bazaar-border`'s
source and test run, both performed 2026-08-31.

## VISION: pay-per-call trading from user beliefs

The product charges USDC per API call for trades based on a user's Alpaca
account and submitted beliefs. This vision covers the full capability even
where it cannot be earned immediately. It names three separable capabilities,
each with its own earn-gate. Each remains in scope ahead of implementation or
legal clearance, with the conditions between the current state and delivery
identified.

**Ring 0 — pay-per-call belief evaluation (earnable now, no brokerage
account touched).** A user submits typed beliefs (the belief-ledger
primitive the theory's "user's beliefs are first-class data" section
specifies, reported in progress in this same custody as of tonight but
not yet present in this section's own 53-package census); the engine
returns a belief-edge computation, bilattice evidence fusion, and a
calibration receipt — impersonal math over the user's own submitted
inputs, never touching a brokerage credential. This is not a green-field
build: `@red-cup-engineering/coinbase-x402-bazaar-border` (v0.1.5, this
section, `services/coinbase-x402-bazaar-border/`) already implements
almost exactly this shape — see "the house already has this, unwired"
below. The regulatory gate is the publisher's exclusion (Advisers Act
§202(a)(11)(D)): impersonal, non-tailored analysis of general and
regular circulation is excluded from "investment adviser" status
outright (Supreme Court, *Lowe v. SEC*, 472 U.S. 181 (1985); see the
regulatory-posture rows below). The border server's own
`assertNoCommercialCredentials` refusal is exactly the boundary this
exclusion needs held.

**Ring 1 — the user's own paper keys, non-discretionary execution.** The
user connects their own Alpaca paper-trading keys; the engine executes
their belief-derived strategy non-discretionarily, with a witnessed
receipt for every order intent. `brokerage-authority-custody-service`
and `principal-brokerage-interface` are the built shape for
principal-scoped credential custody; the still-unbuilt organ is a
multi-account custody actuator that can hold many customers' scoped
grants at once rather than the single hardcoded Esther-only path the
two live paper loops currently run (see the house census below). The
earn-gate here is engineering, not legal: paper trading needs no
registration at all, so this ring is blocked only on the actuator, not
on a regulator.

**Ring 2 — live execution, USDC-metered, per the user's beliefs (the
full sentence).** This is the regulated end-state and is kept in the
carrier rather than deleted, with its gate named plainly: live,
personalized, tailored trading decisions made *for* a customer are
squarely what the Advisers Act regulates once "vibes" become
account-specific advice rather than impersonal publication (the
publisher's exclusion `Lowe` protects does not survive personalization
or a person-to-person advisory relationship). Two lawful paths exist and
neither is fiction: (a) register as an investment adviser, the path
Composer Technologies Inc. took (SEC IARD #311289, RIA, with a
FINRA/SIPC broker-dealer subsidiary, Composer Securities, for
execution — see below); or (b) hold the tool strictly non-discretionary
and impersonal enough that the user's own account action, not the
platform's, remains the proximate trading decision, the posture
QuantConnect and TradingView both currently hold ("technology vendor,"
"does not constitute investment advice," no RIA or broker-dealer
registration in either's own materials, cited below). Ring 2 is not
buildable by engineering alone; its gate is a registration or
tool-design decision this carrier hands to the founder, not a reason to
strike the ring.

## Per-incumbent capability surface

### Composer.trade

Sources: `adviserinfo.sec.gov/firm/summary/311289` and
`reports.adviserinfo.sec.gov/crs/crs_311289.pdf` (Composer Technologies
Inc.'s own SEC Form CRS/IAPD filing, primary); pricing and product
description from aggregator review coverage (opentools.ai, anygen.io,
aicloudbase.com), fetched 2026-08-31 — flagged as secondary since
Composer's own pricing page was not the source WebFetch reached.

| Capability | Surface |
| --- | --- |
| Strategy authoring | No-code visual "symphony" builder: modular logic blocks, conditional triggers on market data, scheduled rebalancing instructions, AI-conversational strategy description in plain English. |
| Belief/thesis input | None found. A symphony's conditional triggers are rule logic, not a typed proposition with confidence, horizon, and falsifiers — closer to the theory's rejected "single score" than to a belief record. |
| Backtesting | Built in; strategies backtest against historical data before automated execution. |
| Paper/live execution | Live only, automatic, at market close each trading day; no distinct paper-account mode surfaced in the sources read. |
| Brokerage integration | Vertically integrated: Composer Securities Inc., its own FINRA/SIPC broker-dealer, executes directly — not a third-party adapter. |
| Regulatory posture | Registered investment adviser (Composer Technologies Inc., SEC IARD #311289) *and* a registered broker-dealer subsidiary for execution — the dual-registration path. |
| Monetization rail | Subscription SaaS. Two conflicting figures found and both kept rather than silently resolved: aggregator coverage reports a "Trading Pass" at $40/mo ($384/yr, ≈$32/mo annualized), while a separate aggregator reports $30/mo or $288/yr for the advisory subscription itself. Per-transaction adds: $0.65/options contract, $25 outbound wire, $100 ACATS transfer. No per-call or crypto-metered pricing found anywhere in Composer's own or aggregator material. |

### QuantConnect

Source: aggregator review coverage (newyorkcityservers.com,
quantvps.com, findmymoat.com) cross-checked against QuantConnect's own
`quantconnect.com/terms/` disclaimer language, fetched 2026-08-31.

| Capability | Surface |
| --- | --- |
| Strategy authoring | Code-only: Python or C# against the open-source LEAN engine, Cloud IDE or local LEAN CLI. No no-code or AI-conversational authoring surfaced. |
| Belief/thesis input | None — a LEAN algorithm is executable code, not a typed belief object. |
| Backtesting | Unlimited, free, on every asset class; GPU-enabled backtesting nodes on paid tiers; tick-to-daily historical data. |
| Paper/live execution | Live trading gated behind a paid tier (from $60/mo); notifications via email/SMS/Telegram/webhook. |
| Brokerage integration | Broad: Interactive Brokers, Schwab, TradeStation, Tastytrade, **Alpaca**, OANDA, Binance, Coinbase, Kraken, Bybit, Bloomberg EMSX. |
| Regulatory posture | Explicitly tool-only in its own terms: "not an investment advisory service, nor a registered investment advisor or broker-dealer"; does not custody assets or give tailored recommendations. |
| Monetization rail | Tiered subscription SaaS, $60/mo (Researcher) to $1,080/mo (Institution, on-prem + AES-256). Separately, the **Alpha Streams marketplace**: quants license algorithms to funds via flat monthly subscription (not classic profit-share); QuantConnect takes a flat 30% hosting/review fee off licensing revenue, the rest passes to the strategy author. No per-call or crypto-metered pricing found. |

### TradingView (and its strategy/bot ecosystem)

Sources: TradingView's own pricing/plan pages (via aggregator
cross-check: stockbrokers.com, chartwisehub.com, supa.is) and its own
`tradingview.com/disclaimer/`, plus the bot-bridge ecosystem
(TradersPost via blog.traderspost.io), fetched 2026-08-31.

| Capability | Surface |
| --- | --- |
| Strategy authoring | Pine Script (code) for strategies/indicators; 2026 additions include an AI "Chart Copilot" for pattern analysis (free, beta) and third-party Pine-generation copilots (Pineify, LuxAlgo Quant) claiming ~85% natural-language-to-code success. |
| Belief/thesis input | None — signals are technical/indicator-derived, not typed propositions about the world. |
| Backtesting | Native Pine Script strategy tester; deep history reserved for Premium+ tiers. |
| Paper/live execution | No native broker execution. Alerts/webhooks must be bridged out (TradersPost and similar) to reach a broker or exchange API. |
| Brokerage integration | Indirect only, via webhook bridges; TradersPost is the dominant bridge turning any TradingView alert into a live order at a connected broker. |
| Regulatory posture | Explicitly educational/entertainment in its own disclaimer: "do not constitute investment advice"; not an RIA or broker-dealer. |
| Monetization rail | Tiered subscription SaaS on the charting product itself: Essential $14.95/mo, Plus $29.95/mo, Premium $59.95/mo, Ultimate $239.95/mo (annual discounts on each). The execution layer (TradersPost) is a separate subscription product outside TradingView proper. No per-call or crypto-metered pricing found on either. |

### Alpaca's own AI-agent offerings

Sources: Alpaca's own blog (`alpaca.markets/blog/`), specifically the
2026-06-17 Skills Library launch, the 2026-07-16 $135M raise
announcement, and the 2026-08-10/07-20 MCP Server posts, fetched
2026-08-31.

| Capability | Surface |
| --- | --- |
| Strategy authoring | Not itself an authoring UX — Alpaca ships the substrate for agents to author against: a Trading MCP Server (natural-language API access, public beta for broker partners since 2026-07-20, doc-access added 2026-08-10), a Trading CLI, and an open-source Skills Library (`SKILL.md` files an AI coding assistant like Claude Code, Codex, or Cursor loads) whose first release (2026-06-17) is a Backtesting Skill plus a Paper Trading Skill. |
| Belief/thesis input | None found — the skills guide an agent through strategy formalization and reporting, not through recording a typed belief with confidence/horizon/falsifiers. |
| Backtesting | The Backtesting Skill: guided strategy formalization, historical data retrieval, benchmark comparison, assumption tracking, reproducible reporting — a documented *procedure* for an AI agent to follow, not a hosted backtesting product. |
| Paper/live execution | Both, natively, as the broker itself — the Paper Trading Skill and live trading share the same underlying brokerage API. |
| Brokerage integration | Is the brokerage — Alpaca Securities LLC (FINRA/SIPC broker-dealer) for equities/options, Alpaca Crypto LLC (FinCEN-registered MSB) for crypto. |
| Regulatory posture | Broker-dealer + crypto MSB, explicitly **not** framed as an RIA anywhere in the sources read — Alpaca positions itself as infrastructure for agents that make their own trading decisions, not as the decision-maker. |
| Monetization rail | Standard broker-dealer revenue (commissions/spread on executed trades, not disclosed as per-API-call pricing in any source read); the AI tooling itself (MCP Server, CLI, Skills Library) is free and open-source. Growth is measured in API usage (~4x QoQ heading into Q1 2026) and a 2026-07-16 $135M raise (led by Peak XV) explicitly earmarked to scale "agent-first brokerage infrastructure." **No x402, USDC, or any crypto-metered per-call pricing found anywhere in Alpaca's own material** — its AI surface is free access to a commission-based broker, not a metered product. |

### Horizon.Trade (currently-prominent AI-native entrant)

Sources: Horizon's own `horizon.trade/pricing` and `horizon.trade/`
pages (via aggregator/press cross-check: prnewswire.com,
fintech.global, capterra.com), fetched 2026-08-31.

| Capability | Surface |
| --- | --- |
| Strategy authoring | Plain-English strategy description converted to executable rules via NLP — "the first agentic trading platform" per its own launch language (2026-07-16). |
| Belief/thesis input | None found distinct from the strategy description itself — closer to Composer's symphonies and TradingView's copilots than to a typed, revisable belief record with confidence and falsifiers. |
| Backtesting | Built into the same one-click flow: idea → backtest → connect broker → deploy live. |
| Paper/live execution | Both, in the same flow; the marketing language ("deploy it live in one click") does not distinguish a separate paper-only mode. |
| Brokerage integration | Alpaca, Binance, Kraken, Coinbase, E*TRADE. |
| Regulatory posture | **Unverified** — no RIA, broker-dealer, or explicit tool-only disclaimer surfaced in the sources read; this is a genuine gap in this pass's research, not a claim either way. |
| Monetization rail | Subscription SaaS starting at $99/mo, marketed against the cost of assembling tick data, colocation, backtesting, and broker APIs separately (framed by Horizon itself at "over $8,400/month" unbundled). 23,000+ waitlist signups and Entrée Capital seed backing reported at 2026-07-16 launch. No per-call or crypto-metered pricing found. |

## The x402 / agent-payable trading-intelligence landscape: a dedicated finding

The founder's hypothesis going in: the retail AI-trading field still
sells subscriptions like 2019, and nobody is agent-payable. This pass
measured it directly rather than assuming either way.

**The general x402 Bazaar catalog carries no trading category with real
listings.** Two direct fetches against the Coinbase CDP discovery
endpoint (`api.cdp.coinbase.com/platform/v2/x402/discovery/resources`,
2026-08-31) — one scoped to `category=trading`, one an unscoped 100-row
pull — returned zero trading-signal, strategy-evaluation,
order-execution, or portfolio-analysis resources in either sample. What
came back matches the shape the house's own 2026-08-27 first-hand
catalog read already established (see
[`2026-08-27-x402-bazaar-undercounts-settlement-by-an-order-of-magnitude.md`](../../../../../../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/economics-science-services-section/content/text/documents/articles/notes/2026/08/27/2026-08-27-x402-bazaar-undercounts-settlement-by-an-order-of-magnitude.md),
which found the catalog's 30-day demand skewed to chain-data lookups
(17,988 unique payers), search (5,589), market/price (5,356),
identity/security (2,998), math/compute (1,920), ai/inference (1,493),
and geo/time (769) — no distinct trading/execution tally at all. One
piece of press coverage (Autheo, an SEO/aggregator source, not primary)
describes a seven-category Bazaar taxonomy that names "trading" as one
of the seven; the two direct catalog samples taken here did not surface
it, so that category name is kept as reported but unconfirmed by direct
observation.

**The only x402-metered trading-signal services found anywhere are
hobbyist-grade, not incumbents.** A GitHub project (`kraken-crypto-signals`)
advertises pay-per-call crypto market-state data over x402 on Base, no
accounts or API keys, ECDSA-signed responses — its own repository could
not be independently re-verified in this pass (404 on direct fetch). A
dev.to tutorial post ("I Built a Pay-Per-Call Trading Signal API for AI
Agents") is more fully verified: equities-only, Yahoo Finance-derived
BUY/SELL/HOLD signals with a composite momentum score, priced
$0.005-$0.25 per endpoint on Base/USDC via the x402 SDK — but its own
author frames it explicitly as **"a template for developers,"** i.e. a
demonstration project, not a live service with a customer base. It has
no brokerage integration for execution and accepts no typed belief input
beyond ticker selection — a one-way signal feed, not the belief-to-capital
pipeline the house theory specifies. Neither project is discoverable
through the Bazaar catalog itself.

**Conclusion on the founder's hypothesis: confirmed, with one load-bearing
qualification.** None of the five named incumbents (Composer, QuantConnect,
TradingView, Alpaca, Horizon.Trade) offer any per-call or crypto-metered
pricing for anything — all five monetize as subscription SaaS,
commission/spread, or a flat-fee licensing marketplace (QuantConnect's
Alpha Streams). The only x402-trading activity found anywhere in the
open market is two hobbyist/tutorial projects, neither production, both
one-way signal feeds with no typed belief input and no receipts. The
qualification: **the absence is not purely a market gap the house has yet
to fill — the house has already built, and not yet wired, a service that
fills exactly this gap.**

### The house already has this, unwired

`@red-cup-engineering/coinbase-x402-bazaar-border` (v0.1.5, this
section, `services/coinbase-x402-bazaar-border/`) is a real Express
server (`src/server.mjs`) implementing the x402 `exact` payment scheme
against the CDP facilitator on Base (`eip155:8453`, USDC), with six
priced products declared in `PRODUCT_OFFERS`/`ROUTES`:

| Route | Product | Price |
| --- | --- | --- |
| `/v1/issuer-evidence` | Dated source-grounded issuer evidence packet | $0.25 |
| `/v1/aggressive-alpha` | Evidence/falsifier/liquidity/execution-aware alpha packet | $1.00 |
| `/v1/paper-intent` | Mandate-bound paper portfolio and typed order intent | $2.00 |
| `/v1/reconcile` | Customer-supplied Alpaca statement normalization | $0.50 |
| `/v1/strategies/blk-topological-accumulation` | BLK-vs-SPY topological accumulation intent | $3.00 |
| `/v1/strategies/synthesize` | Provider-distinct, statically assayed strategy program candidates | $15.00 |

Its border (`http-border.mjs`) hard-refuses any request carrying a
credential-shaped field (`assertNoCommercialCredentials` — regex-tests
every key for `authorization`, `api-key`, `secret`, `token`, `password`,
etc., recursively, and throws before any provider runs) — exactly the
"never touches a brokerage credential" boundary Ring 0's publisher's-
exclusion framing needs held structurally, not just by policy. Every
completed settlement and every product delivery is witnessed through
`@red-cup-engineering/semantic-record-journal-service`
(`settlement-witness.mjs`'s `createBrokerageX402SettlementWitness` and
`createBrokerageOutcomeWitnessRecorder`) — receipts on both the payment
and the output, not merely the payment.

**This is not deployed.** No `systemd-user` unit references it (checked
against this section's own `content/deployment/systemd-user/`), no
`wrangler.toml` exists for it, and it is not registered in the Bazaar
catalog (consistent with the direct catalog scan above finding zero
trading resources). Its own test suite, run directly 2026-08-31
(`npm test` inside the package): **3 passing, 1 failing** —
`test/border-authority.test.mjs` fails because `server.mjs` imports
`CDP_FACILITATOR_URL` from `@red-cup-engineering/x402-services-section/server`
at its pinned version (1.3.3), which the currently-installed copy of
that package does not export — a version-drift bug in a dependency pin,
not a design defect in this package. This is a wiring debt, not a
build debt: the highest-value single move in this whole census is
**deploy this server, fix the one drifted pin, and register it in the
Bazaar** — not design a new Ring-0 product from scratch.

## House capability census (the alpaca section, measured 2026-08-31)

53 service packages under `alpaca-services-section/services/`,
surveyed directly by `package.json` description
(`market-funded-strategy-improvement-service`, `strategy-evaluation-service`,
and `alpaca-paper-account-read-service` carry no description and were
not further inspected in this pass). Grouped by what the theory
document asks for:

- **Paper-only guards, live.** `alpaca-account-kill-switch-service`
  (drawdown/daily-loss trip, disables every loop timer on trip),
  `alpaca-paper-trading-guards-service` (hardcoded paper-host + live-
  credential refusal, shared), `alpaca-alert-watch-service` (Discord-
  posted watch over both loops' decision journals and kill-switch
  trips) — each is `--now`-disabling and hard-refuses on any
  `*_LIVE_*` credential, deployed via `content/deployment/systemd-user/`
  to the `cold-red-gate` VPS (confirmed: the unit files exist there and
  nowhere run on this laptop, per the checkout-is-not-a-runtime law).
- **Two live paper loops, one worked instance.** `alpaca-esther-paper-trading-loop`
  (BLK/SPY accumulation signal from the obsmetrologia strategy,
  journaled decisions) and `alpaca-esther-paper-redistributor-loop`
  (target-weight basket rebalance, capped daily turnover, cash
  bootstrap) — this is Esther's worked instance from the theory
  document, actually running, hardcoded to one account.
- **Point-in-time-aware research/backtest stack.** `point-in-time-asset-universe-service`,
  `purged-walk-forward-fold-service`, `causal-market-panel-assay-service`
  (refuses leakage/duplicate time/malformed measures),
  `causal-feature-frame-service`, `technical-analysis-feature-measurement-service`,
  `return-risk-feature-measurement-service`, `correlation-graph-measurement-service`,
  `sheaf-laplacian-measurement-service`, `deterministic-ridge-fit-service`,
  `causal-tiling-novelty-measurement-service`, `event-driven-execution-simulation-service`
  (latency/spread/impact/partial-fill simulation), `transaction-cost-replay-service`.
  This is a real leakage-refusing, bitemporal backtesting substrate —
  none of the five named incumbents document anything with an explicit
  survivorship/leakage refusal at this granularity.
- **AI-generated-strategy pipeline, proof-gated.** `strategy-program-synthesis-work-lot-service`
  (contracts provider-distinct inference workers for candidate
  programs), `strategy-program-candidate-assay-service` (static ABI
  assay before sandbox), `bubblewrap-strategy-replay-service`
  (networkless sandboxed execution, hard wall-clock bound),
  `generated-strategy-fold-replay-service`, `model-tournament-service`
  (holdout-only selection, no self-promotion),
  `recursive-strategy-program-improvement-service` (bounded generate-
  assay-replay-tournament-review loop), `obsmetrologia-alpha-selection-proof-service`.
  No named incumbent has anything resembling sandboxed, statically-
  assayed, proof-gated strategy promotion.
- **Mandate/portfolio.** `mandate-portfolio-allocation-service`
  (mandate-bounded target weights from supplied scores/risk) —
  partially realizes the theory's "sleeves" concept but with no
  visible harvest-rule, tax-lot, or standing-accumulation-sleeve
  primitive found by name anywhere in this section.
- **Brokerage boundary, real but thin descriptions.** `brokerage-authority-custody-service`,
  `principal-brokerage-interface`, `pluggable-venue-adapter-service`,
  `brokerage-execution-transport-service`, `brokerage-independent-witness-and-books`,
  `account-evidence-reconciliation-service`, `alpaca-principal-account-read-service`,
  `union-brokerage-products-market-border`, `virtuals-brokerage-products-border`
  — these carry real source (verified for a sample: `brokerage-authority-custody-service`,
  `principal-brokerage-interface`, `pluggable-venue-adapter-service` each
  have working `src/`), but their `package.json` descriptions are a
  boilerplate placeholder ("`<name> sovereign enterprise`") rather than
  a stated capability — a documentation debt worth recording, not a
  missing-capability finding.
- **Not found anywhere in this section:** a belief ledger with
  confidence/horizon/falsifier/revision-history fields; a tax-lot- or
  cost-basis-aware harvest engine; a multi-account custody actuator
  (the brokerage-authority/principal-interface packages custody one
  principal's grant at a time, matching the two loops' single-Esther
  pattern, not a many-customer actuator); any end-user-facing
  strategy-authoring UI (no `apps/` directory exists anywhere under
  this section — every one of the 53 packages is a service, not a
  product surface).

## MEET: ranked gap list

Ranked by how directly each blocks the founder's stated vision (the
three rings above), not by generic engineering tidiness.

| Rank | Gap | Incumbent(s) that have it | Why it matters now |
| --- | --- | --- | --- |
| 1 | **Wire, don't build, Ring 0.** `coinbase-x402-bazaar-border` exists, is tested (3/4 green), and is unwired: no deploy unit, no Bazaar registration, one drifted dependency pin blocking the 4th test. | The two hobbyist x402 projects found in this census are less complete than what the house already has and unwired. | This is literally the founder's sentence, already built, sitting idle — the single highest-value move in this whole census. |
| 2 | No belief ledger (typed proposition, confidence, horizon, falsifiers, revision history) exists in this section's own 53-package census. | No incumbent has this either — but the house's own theory names it as requirement #1 and the coordinator reports one is being built tonight elsewhere in this custody. | Ring 0 and Ring 1 both need typed beliefs as the actual input, not a ticker and a rule; today the closest thing running is a hardcoded BLK-accumulation signal, not a belief record. |
| 3 | No end-user strategy-authoring UX (no-code, plain-English, or visual) — no `apps/` surface exists anywhere in this section. | Composer (visual/AI-conversational), Horizon (plain-English), TradingView (Pine Script + AI copilots) all have one. | Even a belief-ledger backend needs a face; today every one of the 53 packages is service-layer only. |
| 4 | Multi-account custody actuator — the brokerage-authority/principal-interface packages custody one principal's grant at a time. | Composer, QuantConnect, TradingView, Alpaca, Horizon all onboard arbitrary customers as a matter of course. | Ring 1 explicitly needs this; today only Esther's account is wired end to end. |
| 5 | No tax-lot- or cost-basis-aware harvest engine found by name. | None of the five incumbents document this explicitly either (it is closer to a private-wealth feature), but the house's own theory names it as requirement #6. | Named in the theory as non-negotiable for the "sell decision," and absent from the census — a gap against the house's own stated bar, not against a competitor. |

Lower-priority, recorded not ranked: `deterministic-report-graphic-service`
already exists as a package (seen as an optional peer dependency of the
x402 border) but is not wired into `daily-trading-context-service`'s
output — the theory's "reports, decks, infographics" requirement is a
wiring gap, not a build gap, once that connection is made; placeholder
`package.json` descriptions across the thin-but-real brokerage-boundary
packages are a documentation debt, not a capability gap.

## BEAT: differentiators, checked against the measured surface

Per the skill's step 4: a capability present in any named incumbent's
own docs, even in beta, is a MEET item, not a BEAT claim. Each of the
following was checked against all five incumbent rows above before
being kept here.

**Belief-as-typed-input (the fiber algebra).** None of Composer's
symphonies, QuantConnect's LEAN code, TradingView's Pine Script/AI
copilots, Alpaca's Skills Library, or Horizon's plain-English rules
persist a belief as a typed, revisable object carrying confidence,
horizon, and falsifiers distinct from the strategy logic itself — every
one of the five collapses "what I believe" and "what to do about it"
into one artifact (a symphony, an algorithm, a script, a rule). This
is theory, not yet built in this section either (see MEET #2) — the
differentiator is genuine but not yet shipped.

**Sandboxed, statically-assayed, proof-gated strategy promotion.** No
incumbent documents anything resembling `strategy-program-candidate-assay-service`'s
static ABI assay before `bubblewrap-strategy-replay-service`'s
networkless sandboxed execution before `model-tournament-service`'s
holdout-only, no-self-promotion selection. This is built and running in
this section today — a shipped differentiator, not aspirational.

**Witnessed receipts for every decision.** Composer, QuantConnect,
TradingView, Alpaca, and Horizon each log activity for their own
operational purposes, but none document a settlement-and-delivery
witness comparable to `coinbase-x402-bazaar-border`'s
`settlement-witness.mjs` (a content-addressed record for both the
payment and the output) or the paper loops' NDJSON decision journals
that `alpaca-alert-watch-service` reads. Built, running for the paper
loops; built, un-deployed for the x402 border.

**Paper-first-by-construction guards.** `alpaca-paper-trading-guards-service`
hard-refuses (nonzero exit) on any `*_LIVE_*` credential and re-checks
the outbound host against `paper-api.alpaca.markets` before every run —
a structural refusal, not a settings toggle. No incumbent's own material
documents an equivalent hard refusal; each instead documents "paper
mode" as a UI setting a user (or the platform) can simply switch.
Built and running today.

## FIVE-CUSTODY THREAD

Naming this capability's thread across the five custodies, per
`org-layering.md`'s section shape:

- **Science:** the finance/economics TA program (this section's own
  [`PERSONAL-QUANT-PLATFORM-THEORY.md`](../../PERSONAL-QUANT-PLATFORM-THEORY.md))
  and the bilattice/paraconsistent-evidence mathematics in
  `@red-cup-engineering/metrologic` (`/bilattice`), which is what "belief
  fusion" and "calibration" cash out to mathematically once the belief
  ledger exists.
- **Engineering:** this section, `alpaca-services-section`, and its 53
  service packages — the causal/ridge/backtest stack, the strategy-
  synthesis-and-proof pipeline, the paper-only guards, and the unwired
  `coinbase-x402-bazaar-border`.
- **Operations:** the VPS deployment pattern already proven for the two
  Esther paper loops — `content/deployment/systemd-user/` units running
  on `cold-red-gate`, never on this laptop (`bare-cedar-fog` is
  checkout, not runtime, per working-discipline.md's standing law) —
  the same pattern Ring 0's border server needs once wired.
- **561 Group:** the two revived paper loops are the org's own live
  operation in this space today — real money-shaped decisions (paper,
  for now), journaled, alerted on, kill-switched — the concrete
  instance the org runs on itself before selling anything.
- **Public:** the future product face — Ring 0 as the first public
  surface (pay-per-call belief evaluation, no account risk), Ring 1 once
  the multi-account actuator exists, Ring 2 once a registration or
  tool-design decision is made — none of which exist as a public
  property yet; this carrier is the roadmap input for that face, not
  the face itself.
