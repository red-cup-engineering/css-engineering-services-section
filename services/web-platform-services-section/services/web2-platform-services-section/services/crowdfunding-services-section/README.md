# Crowdfunding Services Section

Reusable crowdfunding-campaign engineering -- campaign-spec and
reward-tier-ladder validation, task-and-bill-of-materials goal math,
readiness scoring, campaign-page generation, and pledge journaling.
Kickstarter (the platform this engine's shape is drawn from) is a web2
platform, so this section seats under `web2-platform-services-section`,
alongside the other web2 platform integrations.

## Seats checked before creating (census before creating)

- `web2-platform-services-section/services/stripe-services-section` --
  owns Stripe Checkout and verified-payment-event handling (payment
  *processing*, credentials, webhooks). A crowdfunding campaign may one day
  sit in front of Stripe for its own checkout, but campaign-spec/reward-tier
  math and readiness scoring are a different capability with no payment
  processing of its own; nothing here duplicates it.
- `web2-platform-services-section/services/buttondown-services-section` --
  owns newsletter delivery. Unrelated capability; checked because it is the
  other single-purpose platform-integration sibling already seated directly
  under `web2-platform-services-section` (no deeper taxonomy invented), the
  precedent this section's own seat follows.
- No `crowdfunding-services-section` (or synonym) existed anywhere in the
  tree or on the registry (`npm view
  @red-cup-engineering/crowdfunding-services-section` 404s) before this
  section was created.

## Provenance

This section is the generalized engine originally hardcoded inside
`561-group-enterprise-services-section/services/crowdfunded-cultural-tech-campaign-services-section`
(campaign and reward-ladder data as `CAMPAIGNS`/`REWARD_LADDERS` module
constants, one tenant only: `lakota-language-algebra`). That enterprise
section now keeps only its own campaign as data
(`content/config/campaign.json`, `content/config/reward-ladder.json`) and
calls this package, pinned exactly, for all engine logic.

## Capability

- `src/crowdfunding.mjs` -- `CampaignSpec`/`TaskEstimate`/`RewardTier`
  typedefs, `validateCampaignSpec`, `computeGoalFromTasks`,
  `campaignReadinessScore`, `validateRewardTier`, `validateTierLadder`,
  `floorPledgeCapacityUsd`. Every function takes its campaign and/or
  reward ladder as an argument -- no registry constant, no built-in
  campaign. Pure functions only; no filesystem, no network.
  - `RewardTier` accepts an optional, additive `physical` block
    (`{weightGrams, dimensionsMm:{l,w,h}, shippingEstimateUsd,
    requiresAddress:true, fulfillment:"self"|"3pl"|"print-on-demand"}`),
    validated only when present -- a digital-only tier is unaffected.
  - `computeGoalFromTasks` accepts a campaign's optional
    `billOfMaterials`, `fulfillmentCostLines`, and `expectedPhysicalUnits`
    fields and adds their per-unit cost times expected units to the
    labor-only goal -- a campaign that declares none of them gets exactly
    the prior labor-only goal.
- `src/journal.mjs` -- thin wrapper over
  `@red-cup-engineering/semiotic-eavt-services-section`.
- `scripts/load-campaign-data.mjs` -- reads a `CampaignSpec` or
  `RewardTier[]` from a JSON file on disk; the only I/O primitive the
  other scripts share.
- `scripts/validate-campaign.mjs` -- validates a campaign spec (and, when
  given, its reward ladder), loaded from JSON.
- `scripts/compute-goal.mjs` -- prints a campaign's computed funding-goal
  range.
- `scripts/render-campaign-page.mjs` -- renders the fact-derived parts of
  a campaign page (budget table, reward table, readiness, sources) as
  Markdown from a loaded campaign + reward ladder; writes to a caller-named
  output path.
- `scripts/campaign-readiness.mjs` -- journals a readiness snapshot.
- `scripts/record-pledge.mjs` -- records one backer's pledge, enforcing a
  capped tier's `quantityCap` in code (refuses once sold out).
- `apps/crowdfunding-cli.mjs` -- composes the above into one CLI
  (`validate`, `goal`, `page`, `readiness`, `pledge`, `status`).

Every script above is also importable directly by a downstream package's
own thin scripts, via subpath exports: `./load-campaign-data`,
`./validate-campaign`, `./compute-goal`, `./render-campaign-page`,
`./campaign-readiness`, `./record-pledge` (plus `.` for the pure
`src/crowdfunding.mjs` functions and `./journal` for the raw journal
wrapper) -- a consumer's own `scripts/record-pledge.mjs` calls this
package's `recordPledge`/`campaignPledgeTotal` rather than reimplementing
the quantityCap check.

## Data shape

Consumers author their own `campaign.json` (a `CampaignSpec`) and
`reward-ladder.json` (a `RewardTier[]`) as data in their own section
(e.g. `content/config/`), never inside this engine. This section carries
no campaign of its own.

## Tests

`npm test` -- `node --test test/*.test.mjs`.
