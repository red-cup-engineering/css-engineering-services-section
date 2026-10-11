#!/usr/bin/env node
// Verb script: record one backer's pledge against a campaign's reward
// ladder, enforcing a capped tier's quantityCap by refusing once sold out.
// Imports src and scripts only.

import { recordJournal, journalRecords } from "../src/journal.mjs";
import { loadCampaignSpec, loadRewardLadder } from "./load-campaign-data.mjs";

/**
 * @param {string} campaignId
 * @param {string} tierId
 * @param {import("../src/crowdfunding.mjs").RewardTier[]} tiers the campaign's reward ladder
 * @param {{root:string, backerNote?:string, now?:()=>string}} opts
 * @returns {{campaignId:string, tierId:string, priceUsd:number, backerNote:string, pledgedAt:string}}
 */
export function recordPledge(campaignId, tierId, tiers, { root, backerNote = "", now = () => new Date().toISOString() }) {
  const tier = tiers.find((t) => t.id === tierId);
  if (!tier) throw new Error(`no reward tier "${tierId}" in campaign "${campaignId}"`);

  if (tier.quantityCap !== null && tier.quantityCap !== undefined) {
    const claimed = journalRecords(root, "pledge").filter((p) => p.campaignId === campaignId && p.tierId === tierId).length;
    if (claimed >= tier.quantityCap) {
      throw new Error(`reward tier "${tierId}" is sold out (cap ${tier.quantityCap})`);
    }
  }

  const pledgedAt = now();
  const pledge = { campaignId, tierId, priceUsd: tier.priceUsd, backerNote, pledgedAt };
  recordJournal(root, "pledge", pledgedAt, pledge);
  return pledge;
}

/**
 * @param {string} campaignId
 * @param {{root:string}} opts
 * @returns {{campaignId:string, totalPledgedUsd:number, backerCount:number}}
 */
export function campaignPledgeTotal(campaignId, { root }) {
  const pledges = journalRecords(root, "pledge").filter((p) => p.campaignId === campaignId);
  return {
    campaignId,
    totalPledgedUsd: pledges.reduce((sum, p) => sum + p.priceUsd, 0),
    backerCount: pledges.length,
  };
}

async function main() {
  const [campaignPath, ladderPath, tierId, root, backerNote] = process.argv.slice(2);
  if (!campaignPath || !ladderPath || !tierId || !root) {
    console.error("usage: record-pledge.mjs <campaign.json> <reward-ladder.json> <tier-id> <root> [backerNote]");
    process.exitCode = 1;
    return;
  }
  const campaign = await loadCampaignSpec(campaignPath);
  const tiers = await loadRewardLadder(ladderPath);
  const pledge = recordPledge(campaign.id, tierId, tiers, { root, backerNote });
  console.log(`recorded $${pledge.priceUsd} pledge to ${campaign.id} tier "${tierId}"`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
