#!/usr/bin/env node
// Verb script: read a campaign spec or reward ladder from a JSON file on
// disk. The only I/O primitive the other scripts in this section share --
// every campaign and reward ladder this engine operates on is caller data,
// never a module constant. Imports nothing but node:fs.

import { readFile } from "node:fs/promises";

/**
 * @param {string} campaignPath path to a CampaignSpec JSON file
 * @returns {Promise<import("../src/crowdfunding.mjs").CampaignSpec>}
 */
export async function loadCampaignSpec(campaignPath) {
  return JSON.parse(await readFile(campaignPath, "utf8"));
}

/**
 * @param {string} ladderPath path to a RewardTier[] JSON file
 * @returns {Promise<import("../src/crowdfunding.mjs").RewardTier[]>}
 */
export async function loadRewardLadder(ladderPath) {
  return JSON.parse(await readFile(ladderPath, "utf8"));
}
