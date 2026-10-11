#!/usr/bin/env node
// Verb script: validate a campaign spec, and its reward ladder when given
// one, loaded from JSON files on disk. Imports src and scripts only.

import { validateCampaignSpec, validateTierLadder } from "../src/crowdfunding.mjs";
import { loadCampaignSpec, loadRewardLadder } from "./load-campaign-data.mjs";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

/**
 * @param {string} campaignPath
 * @param {string} [ladderPath]
 * @returns {Promise<{campaign: import("../src/crowdfunding.mjs").CampaignSpec, tiers?: import("../src/crowdfunding.mjs").RewardTier[]}>}
 */
export async function validateCampaign(campaignPath, ladderPath) {
  const campaign = await loadCampaignSpec(campaignPath);
  validateCampaignSpec(campaign);
  if (!ladderPath) return { campaign };
  const tiers = await loadRewardLadder(ladderPath);
  validateTierLadder(tiers);
  return { campaign, tiers };
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "validate-campaign", description: "validateCampaign — the validate-campaign operation.", operation: validateCampaign }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
