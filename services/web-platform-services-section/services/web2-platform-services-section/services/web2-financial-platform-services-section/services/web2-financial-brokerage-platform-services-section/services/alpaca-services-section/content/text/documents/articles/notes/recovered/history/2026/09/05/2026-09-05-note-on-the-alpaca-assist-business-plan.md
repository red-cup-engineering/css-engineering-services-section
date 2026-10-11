---
title: "The Alpaca Assist business plan"
description: "The meet-then-beat business plan for Alpaca Assist, the bootstrap product of the 561 Group Investment Services Section: the receiver and the job, the measured incumbent portfolio, the MEET contract, the BEAT hypothesis with its falsification pass run against the same measurement, the receiver-visible wedge, the money lanes and their first-cash condition, the founder's-hands items, and the risks and fences the program carries forward."
date-created: 2026-09-05
type: notes
name: 2026-09-05-note-on-the-alpaca-assist-business-plan
status: draft-for-owner-review
authors:
  - claude-fable-5.1
keywords:
  - alpaca-assist
  - meet-then-beat
  - personal-quant-platform
  - x402
  - metered-compute
  - sign-in-with-ethereum
---

# The Alpaca Assist business plan

Per the meet-then-beat skill (`.claude/skills/meet-then-beat/SKILL.md`),
this plan carries the competitive procedure for Alpaca Assist before any
app code exists: bounded arenas and receiver, a classified and measured
incumbent portfolio, the MEET contract, the BEAT hypothesis with its
falsification pass, and the receiver-visible wedge. It reads beside the
section README ([561 Group Investment Services Section](../../../../../../../../README.md)),
the incumbent measurement it summarizes
([2026-09-05-alpaca-assist-incumbent-measurement.json](../../../../../../../../data/records/2026-09-05-alpaca-assist-incumbent-measurement.json),
80 rows across five arenas, measured 2026-09-05 by the research-analyst
office), the field read in science custody
([the retail investing assistant field](../../../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/finance-science-services-section/services/investment-science-services-section/content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-the-retail-investing-assistant-field.md)),
and the capability specification in the engineering seat
([2026-09-05-alpaca-assist-specification.md](../../../../../../../../../../../../../../../../engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/web-services-section/services/web-platform-services-section/services/web2-platform-services-section/services/web2-financial-platform-services-section/services/web2-financial-brokerage-platform-services-section/services/alpaca-services-section/services/alpaca-engineering-services-section/content/text/documents/articles/specifications/2026-09-05-alpaca-assist-specification.md)).

## 1. The receiver and the job

The receiver is a retail investor who already holds, or will open, an
Alpaca brokerage account, and who holds durable situated beliefs about
the world that no institution can buy (the thesis in
[the personal quant platform](../../../../../../../../../../../../../../../../science-services-section/services/social-science-services-section/services/economics-and-business-science-services-section/services/finance-science-services-section/services/investment-science-services-section/content/text/documents/articles/notes/2026/09/05/2026-09-05-note-on-the-personal-quant-platform.md)).
The founder is the first receiver; a family member's paper account is
the second. One sentence per arena:

- **Retail investing assistants**: an investor wants to ask a question
  about their own positions and the market and get an answer that cites
  what it read, says when the data is insufficient, and never trades for
  them.
- **The Alpaca platform**: an investor who already has an Alpaca account
  wants to connect it to a tool without moving assets or handing over a
  key the tool can use beyond the grant.
- **Belief and thesis journaling**: an investor wants to write down what
  they believe, with what would prove it wrong and by when, and be told
  when that has happened.
- **Wallet login and agent payments**: an investor (or their own agent)
  wants to sign in without a password or an email, and pay for exactly
  the compute they use, with nothing else about them sold.
- **Priced measures for agents**: another agent wants one honestly labeled
  number (a mandate-bounded allocation, a cost-replayed return, a
  drawdown reading, a fired falsifier) computed from data it supplies.

## 2. The incumbent portfolio and what the rows say

Every fact below is a row in the measurement record; a fact the rows mark
"not found" is stated as not found. Classification follows meet-then-beat
step 1.

| Product | Role | Free tier / price | The job it does | Brokerage connectivity | Monetization cell (from its own policy) |
|---|---|---|---|---|---|
| Composer (SoFi) | same-job incumbent | free build-and-backtest tier with AI trade ideas; Trading Pass $32/mo | no-code strategy builder, backtester, automated execution | requires a new account at Alpaca Securities or Apex; no outside-account path named | no-sale sentence immediately qualified by a state-law "sale/sharing" admission |
| Robinhood Cortex | same-job incumbent | bundled in Gold, $5/mo | AI research and insight layer | Robinhood is the broker of record | chat inputs train Robinhood's AI; hashed identifiers shared with advertising and card-rewards partners; "not investment advice" |
| Public.com Alpha | same-job incumbent | free to all Public investors | conversational research over filings, calls, quotes, news | not found | not found (policy page not reached) |
| Wealthfront | adjacent incumbent (robo) | 0.25% of assets per year | automated allocation, no belief or forecast interface | not found | not found (policy 404) |
| Betterment | adjacent incumbent (robo) | $5/mo under $24K, else 0.25%/yr; Premium 0.65% | automated allocation with rebalancing and tax tools | not found | no-sale sentence qualified by its own ad-targeting admission |
| Seeking Alpha Premium / Alpha Picks | same-job incumbent | not found (bot-gated) | research, ratings, stock picks | not a brokerage | not found |
| Motley Fool Stock Advisor | same-job incumbent | not found | monthly picks, research toolkit, watchlist | none; member acts in their own brokerage | not found |
| Magnifi | same-job incumbent | not found (client-rendered site) | "invest with intelligence" | not found | policy's no-sale language scoped to Google account data only |
| Fidelity, Schwab in-app assistants | same-job incumbents | not reached (403, authorization error) | | | |
| TradesViz | journaling incumbent | free Basic; Pro $14.99/mo | trade import, analytics, goals, checklists | broker import | falsifier and horizon tracking: not found |
| Edgewonk | journaling incumbent | $197 for 16 months, no free tier | journal, checklists, notebook | | falsifier and horizon tracking: not found |
| Kinfo | journaling incumbent | free; PRO $24.90; PRO+ $44.90 | broker-integrated performance tracking, leaderboard, journal | broker integration | falsifier and horizon tracking: not found |
| TraderSync, Savvy Trader | journaling incumbents | not found (403; unrendered) | | | not assessable |
| Alpaca Trading API | upstream provider | commission-free equities and options; paper trading free with real-time data | the venue | the account itself | Alpaca disclaims risk to the customer for any third-party app's access |
| Alpaca Market Data | upstream provider | Basic free (IEX only, 200 calls/min, the most recent 15 minutes of history withheld, 30 live symbols); Algo Trader Plus $99/mo | quotes, bars, news (news free in beta, 200 calls/min) | | |
| Alpaca OAuth for third-party apps | upstream provider | registration for a client id and secret | authorization-code flow with three scopes: `account:write`, `trading`, `data` | the connect path Alpaca Assist uses | |
| EIP-4361, EIP-191, ERC-1271, CAIP-122 | reference implementations (standards) | | the sign-in message, its signature format, contract-wallet validation, the chain-agnostic generalization | | |
| x402 v2, `exact` scheme | reference implementation (standard) | | a 402 response carrying `accepts[]` payment requirements; a facilitator with `/verify` and `/settle`; the payer signs an EIP-3009 `transferWithAuthorization` | | |
| Cloudflare Workers, Workers AI, D1 | upstream provider | measured in the gig-assist record, not re-measured | the compute and storage | | |

Twenty-three of the eighty rows are "not found"; the largest holes are
Magnifi (nothing reachable), Seeking Alpha (bot-gated), and the two bank
brokerages (blocked). Each carries its next evidence in the record.

## 3. The MEET contract

For every capability the receiver needs, the incumbent baseline, the
house's present evidence, and the smallest thing that meets it.

| Capability | Incumbent baseline | House evidence today | Smallest meet |
|---|---|---|---|
| Ask about my positions and the market, with citations | Public.com Alpha (free, GPT-4, cites filings and news); Robinhood Cortex ($5/mo) | the EVE Assist analyst loop (provenance on every tool result, "insufficient data" allowed), being moved upstream | the loop over the Alpaca read tools (`read_account`, `list_positions`, `read_market_bars`, `read_news`) with observations carrying endpoint, timestamp, request id |
| Connect the account I already have | Composer requires a new account; Robinhood and Public are the broker; the journals import from brokers | none; the CLI holds a house-issued grant for one family paper account | Alpaca OAuth for third-party apps, three scopes, the grant sealed at rest and revocable from settings |
| Backtest or evaluate a strategy | Composer's free backtester | `strategy-evaluation-services-section`: purged walk-forward folds, transaction-cost replay, tournaments (published) | `run_strategy_tournament` and `replay_costs` as tools over the user's beliefs and the point-in-time universe |
| Automated allocation under my rules | Wealthfront and Betterment (0.25% of assets); Composer executes symphonies | `mandate-portfolio-allocation-service`, the envelope in `validateAlpacaAppConfiguration`, the kill switch (published, CLI-composed) | `propose_allocation` labeled a proposal; `place_order_intent` only inside the envelope and grant, paper or bounded-live |
| Journal what I believe | TradesViz, Edgewonk, Kinfo (post-trade journals) | `trading-belief-service` (the falsifier-bearing belief record, published) | `record_belief`, `revise_belief`, `list_beliefs` |
| Real-time data | Alpaca Basic: IEX only, recent 15 minutes withheld | `alpaca-market-data-read-service` (published) | show the feed and its limits on every bar; never claim consolidated real-time on Basic |
| Sign in | email and password everywhere measured | Hive Keychain lane on the ops gateway; `verify-evm-signed-message-service` 0.1.0 (published 2026-09-05) | `/login/evm` on the gateway and in the app's Worker |
| Export my data | not found for any assistant; journals export trades | EVE Assist exports a Beancount ledger | full JSON export of beliefs, positions, fills, reconciliation; Beancount export of the books |
| Let my own agent use it | none of the assistants measured expose themselves as tools to the user's agent; Alpaca's API is agent-facing | EVE Assist's remote MCP server over the tool registry | the same MCP endpoint over the Alpaca tool set, per-user token |

## 4. The BEAT hypothesis and its falsification pass

Five hypotheses, each stated so the same measurement can falsify it.

1. **The belief record with a falsifier and a horizon is absent from every
   measured tool.** Measured: TradesViz, Edgewonk, and Kinfo describe
   goals, checklists, and notebooks, none framed as a falsifiable belief
   with a horizon; TraderSync and Savvy Trader were not assessable.
   *Falsified if* TraderSync's or Composer's help center documents a
   thesis field with an invalidation condition and a date (next evidence
   named in the rows).
2. **The user keeps their own brokerage.** Measured: Composer requires a
   new account; Robinhood and Public are the broker; the robo-advisors
   hold the assets. Alpaca's own OAuth for third-party apps is the connect
   path and it disclaims liability to the customer for the app's access,
   so the app's grant custody is the whole of the user's protection.
   *Falsified if* Public.com Alpha or Magnifi connects an outside brokerage
   (both "not found", next evidence in the rows).
3. **Every number carries its witness.** No measured assistant shows a
   position beside the venue statement it reconciles against or a
   four-way reconciliation reading; the house books law does. *Falsified
   if* a bank brokerage's in-app assistant (Fidelity, Schwab, both
   unreached) does this; a live account is the next evidence.
4. **Nothing about the user is sold, and the user pays only for compute.**
   Measured: Robinhood trains on chat inputs and shares hashed
   identifiers with advertising partners; Composer and Betterment hedge
   their no-sale sentences with state-law sale admissions; Magnifi scopes
   no-sale to Google data. The house cell is metered compute under a
   wallet grant plus priced measures, with a bring-your-own-key path
   (EVE Assist's precedent) that costs the house nothing. *Falsified if*
   the metered-compute price a user will pay per turn is below the
   house's compute cost per turn; unmeasured, and the first month of
   receipts is the evidence.
5. **The app is a toolbelt for the user's own agent.** No measured
   assistant exposes MCP; Alpaca's API is agent-facing but is the venue,
   not an assistant. *Falsified if* Public.com or Robinhood ships an MCP
   or equivalent agent face; their developer pages are the next evidence.

The pass does not falsify any hypothesis on today's rows, and three of the
five rest partly on "not found" rows. That is the honest state: the beat
is plausible and unproven, and the holes named above are the research
analyst's next commission.

## 5. The receiver-visible wedge

The smallest thing a receiver can see that only this program does: the
founder signs in to alpaca-assist.561.group with a registered wallet (no
compute quote, because the wallet registry marks it house), connects a
paper account through Alpaca OAuth, sees positions and fills beside their
venue statement with the reconciliation reading, records one belief with
a falsifier and a horizon, and asks the assistant one question whose
answer cites the observations it read and names the data feed's limits.
That is rungs 1 through 4 of the section README's bootstrap; a second
wallet that sees a compute quote on its first turn is rung 5.

## 6. Money lanes and the first-cash condition

Per the roadmap law (align-to-roadmap, owner-ruled 2026-09-05): where cash
lands and when. All lanes settle to the house Base USDC address the pacing
gateway already uses, through the x402 boundary (`exact` scheme, EIP-3009
`transferWithAuthorization`, facilitator `/verify` and `/settle`).

- **Lane 1, priced measures for agents.** Pure functions already
  published, sold by the call: `propose_allocation` (mandate-bounded
  target weights from supplied beliefs, prices, and an envelope),
  `replay_costs` (net return of supplied weights under an explicit cost
  model), `read_risk` (drawdown and daily-loss reading for a supplied
  equity series), `check_falsifiers` (which supplied beliefs' falsifiers
  have fired against supplied observations). Proposed prices, to be set
  by the pacing gateway's live per-call anchor and revised on receipts:
  a few cents of USDC per call, `replay_costs` highest because it does the
  most compute. First cash is the day the first measure is listed and an
  agent pays for it; the expected buyer is the house's own agents first
  (the org buys its compute from itself), then the x402 bazaar.
- **Lane 2, metered compute per account.** A signed-in wallet that is not
  registered as founder or org sets a wallet grant (asset, network,
  per-request and total budgets); each model turn and priced tool call is
  quoted and settled through `metered-compute-payment-service`. The
  bring-your-own-key path (the user's own model key, sealed at rest) is
  free and costs the house nothing. This lane earns only after users
  exist; it is built now because lane 1 settles through the same
  primitive.
- **Lane 3, the app, free, then a fair price after quality.** The standing
  fence holds: thin products are not sold. The paper venue is free; a paid
  tier follows product quality and never gates the belief record, the
  export, or the reconciliation reading.
- **What never earns:** order-flow sale, data sale, lead generation to
  brokers or lenders, affiliate placement inside the ledger, gamified
  trading prompts. These are the measured incumbents' cells.

Expected cash per hour of founder hands: the founder's only hands items
are below and take under an hour in total; the machine does the rest.
Expected cash per token of machine work: unmeasured until the first
listing; the token cost of this cut is in the session's usage row.

## 7. The founder's hands

Asks for hands, never for permission:

1. **Register Alpaca Assist as an Alpaca OAuth app** (client id and
   secret, callback `https://alpaca-assist.561.group/auth/callback`) at
   Alpaca's developer surface; the secret goes to `wrangler secret put`,
   never the tree.
2. **Sign in once with a registered wallet** on ops.561.group when
   `/login/evm` ships, and once on alpaca-assist.561.group when the Worker
   ships; both are identity acts.
3. **Confirm which of the registered founder wallets are for sign-in**
   (the registry marks owner and role; none carries a label yet).

## 8. Risks and fences

- **The advice line.** Public.com and Robinhood both label their AI "not
  investment advice" and "not the basis for any investment decision"; the
  field note's regulatory section carries the Investment Advisers Act
  reading (Lowe v. SEC's publisher's exclusion, Regulation Best Interest's
  scope, FINRA's 2016 digital-advice report). The app publishes
  information and the user's own analysis over the user's own records and
  never recommends a security to a person; its copy is read against the
  field note before each release, and the question of where a per-user
  belief-conditioned allocation proposal sits on that line is for counsel,
  not for this plan.
- **Third-party liability.** Alpaca disclaims risk to the customer for any
  third-party app's access. The grant is sealed, revocable, scoped to the
  three OAuth scopes, and never used outside the user's envelope; the
  independent witness and kill switch are the app's own protection of the
  user.
- **Data limits.** Alpaca Basic is IEX-only, withholds the most recent
  fifteen minutes of history, and caps live subscriptions at thirty
  symbols; every bar and quote carries its feed and its limit, and the app
  never says "real-time" of Basic data without saying "IEX".
- **Pattern-day-trader and margin rules** are venue facts the app shows
  from the account, never computes around.
- **Compute economics.** Hypothesis 4 fails if users will not pay per
  turn; the bring-your-own-key path bounds the house's loss at zero, and
  the Workers AI free lane bounds the cost of the free paper tier.
- **The unmeasured incumbents.** Magnifi, Seeking Alpha, Fidelity, and
  Schwab are holes; a beat claimed against them is a claim against
  nothing. The research analyst's next commission is those four, by a
  live account where a fetch is blocked.
