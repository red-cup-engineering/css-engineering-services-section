#!/usr/bin/env node
import { computeGoalFromTasks, campaignReadinessScore } from "../src/crowdfunding.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * @param {import("../src/crowdfunding.mjs").CampaignSpec} campaign
 * @param {import("../src/crowdfunding.mjs").RewardTier[]} tiers
 * @returns {string} Markdown
 */
export function renderCampaignPage(campaign, tiers) {
  const goal = computeGoalFromTasks(campaign);
  const readiness = campaignReadinessScore(campaign);

  const taskRows = campaign.tasks
    .map((t) => `| ${t.name} | ${t.description} | ${t.lowDays}-${t.highDays} days |`)
    .join("\n");
  const tierRows = tiers
    .map((t) => `| $${t.priceUsd} | ${t.name} | ${t.description} | ${t.quantityCap ?? "unlimited"} |`)
    .join("\n");
  const blockerLines = readiness.blockers.map((b) => `- ${b}`).join("\n");

  const lines = [
    `# ${campaign.title}`,
    "",
    `**Category**: ${campaign.category} | **Goal**: $${goal.recommendedGoalUsd} | **Deadline**: ${campaign.deadlineDays} days`,
    "",
    campaign.blurb,
    "",
    "## Budget",
    "",
    "| Task | What it does | Estimated effort |",
    "|---|---|---|",
    taskRows,
    "",
    `Recommended goal (low end of every task's range at $${campaign.dayRateUsd}/day` +
      (goal.physicalGoalUsd > 0 ? " plus physical-goods cost" : "") +
      `): **$${goal.recommendedGoalUsd}**. Full-scope ceiling: $${goal.highUsd}.`,
  ];
  if (goal.physicalGoalUsd > 0) {
    lines.push(
      `Includes $${goal.physicalGoalUsd} of bill-of-materials/fulfillment cost across ${campaign.expectedPhysicalUnits} expected unit(s).`
    );
  }
  lines.push(
    "",
    "## Reward tiers",
    "",
    "| Pledge | Name | What you get | Slots |",
    "|---|---|---|---|",
    tierRows,
    "",
    "## Readiness",
    "",
    `**Status: ${readiness.status}**`,
    readiness.blockers.length > 0 ? blockerLines : "No open blockers on record.",
    "",
    "## Sources",
    "",
    ...campaign.groundedIn.map((p) => `- ${p}`),
    ""
  );
  return lines.join("\n");
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "render-campaign-page", description: "renderCampaignPage — the render-campaign-page operation.", operation: renderCampaignPage }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
