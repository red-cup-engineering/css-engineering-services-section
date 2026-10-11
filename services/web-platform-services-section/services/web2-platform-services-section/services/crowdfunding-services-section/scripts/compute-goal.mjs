#!/usr/bin/env node
// Verb script: compute a campaign's funding-goal range from its task
// breakdown (and, when declared, its bill-of-materials and fulfillment
// cost lines), loaded from a JSON file on disk. Imports src and scripts only.

import { computeGoalFromTasks } from "../src/crowdfunding.mjs";
import { loadCampaignSpec } from "./load-campaign-data.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * @param {string} campaignPath
 * @returns {Promise<ReturnType<typeof computeGoalFromTasks>>}
 */
export async function computeGoal(campaignPath) {
  const campaign = await loadCampaignSpec(campaignPath);
  return computeGoalFromTasks(campaign);
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "compute-goal", description: "computeGoal — the compute-goal operation.", operation: computeGoal }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
