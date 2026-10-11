#!/usr/bin/env node
// Composed face: dispatches to this section's scripts by subcommand,
// operating on campaign/reward-ladder JSON files a caller names on the
// command line. Apps may import scripts and src.

import { validateCampaign } from "../scripts/validate-campaign.mjs";
import { computeGoal } from "../scripts/compute-goal.mjs";
import { renderCampaignPage } from "../scripts/render-campaign-page.mjs";
import { recordCampaignReadiness } from "../scripts/campaign-readiness.mjs";
import { recordPledge, campaignPledgeTotal } from "../scripts/record-pledge.mjs";
import { loadCampaignSpec, loadRewardLadder } from "../scripts/load-campaign-data.mjs";

function usage() {
  console.log(
    [
      "usage: crowdfunding-cli.mjs <command> [args]",
      "  validate <campaign.json> [reward-ladder.json]    validate a campaign spec (and reward ladder)",
      "  goal <campaign.json>                             print the computed funding-goal range",
      "  page <campaign.json> <reward-ladder.json>         print the generated campaign page Markdown",
      "  readiness <campaign.json> <root>                 journal and print the campaign's readiness",
      "  pledge <campaign.json> <reward-ladder.json> <tier-id> <root>  record a backer pledge",
      "  status <campaign.json> <root>                    print total pledged vs. goal",
    ].join("\n")
  );
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "validate": {
      const { campaign, tiers } = await validateCampaign(args[0], args[1]);
      console.log(`campaign "${campaign.id}" is valid${tiers ? ` (${tiers.length} reward tier(s) valid)` : ""}`);
      return;
    }
    case "goal": {
      const goal = await computeGoal(args[0]);
      console.log(JSON.stringify(goal, null, 2));
      return;
    }
    case "page": {
      const campaign = await loadCampaignSpec(args[0]);
      const tiers = await loadRewardLadder(args[1]);
      console.log(renderCampaignPage(campaign, tiers));
      return;
    }
    case "readiness": {
      const campaign = await loadCampaignSpec(args[0]);
      const record = recordCampaignReadiness(campaign, { root: args[1] });
      console.log(`${campaign.id}: ${record.status} (${record.blockers.length} blocker(s))`);
      return;
    }
    case "pledge": {
      const campaign = await loadCampaignSpec(args[0]);
      const tiers = await loadRewardLadder(args[1]);
      const pledge = recordPledge(campaign.id, args[2], tiers, { root: args[3] });
      console.log(`recorded $${pledge.priceUsd} pledge to ${campaign.id} tier "${args[2]}"`);
      return;
    }
    case "status": {
      const campaign = await loadCampaignSpec(args[0]);
      const total = campaignPledgeTotal(campaign.id, { root: args[1] });
      const goal = await computeGoal(args[0]);
      console.log(`${campaign.id}: $${total.totalPledgedUsd} pledged by ${total.backerCount} backer(s) of a $${goal.recommendedGoalUsd} goal`);
      return;
    }
    default:
      usage();
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
