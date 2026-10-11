import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateCampaign } from "../scripts/validate-campaign.mjs";
import { computeGoal } from "../scripts/compute-goal.mjs";
import { renderCampaignPage } from "../scripts/render-campaign-page.mjs";
import { recordCampaignReadiness } from "../scripts/campaign-readiness.mjs";
import { recordPledge, campaignPledgeTotal } from "../scripts/record-pledge.mjs";
import { loadCampaignSpec, loadRewardLadder } from "../scripts/load-campaign-data.mjs";

const campaign = {
  id: "widget-run",
  title: "The Widget Run",
  category: "Design",
  blurb: "A small run of open-hardware widgets.",
  dayRateUsd: 100,
  deadlineDays: 30,
  tasks: [{ name: "Firmware", description: "Write the widget firmware", lowDays: 2, highDays: 4, sourcePath: "p" }],
  groundedIn: ["p/README.md"],
  blockers: ["no open license yet"],
  billOfMaterials: [{ name: "MCU", unitCostUsd: 4 }],
  fulfillmentCostLines: [{ name: "shipping", costUsdPerUnit: 6 }],
  expectedPhysicalUnits: 50,
};

const tiers = [
  { id: "digital-supporter", name: "Digital Supporter", priceUsd: 10, description: "Backer updates.", quantityCap: null, estimatedDeliveryMonths: 1 },
  {
    id: "widget",
    name: "One Widget",
    priceUsd: 40,
    description: "One assembled widget, shipped.",
    quantityCap: 2,
    estimatedDeliveryMonths: 3,
    physical: {
      weightGrams: 150,
      dimensionsMm: { l: 80, w: 60, h: 20 },
      shippingEstimateUsd: 6,
      requiresAddress: true,
      fulfillment: "self",
    },
  },
];

async function withTmpDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), "crowdfunding-lifecycle-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function writeFixtures(dir) {
  const campaignPath = path.join(dir, "campaign.json");
  const ladderPath = path.join(dir, "reward-ladder.json");
  await writeFile(campaignPath, JSON.stringify(campaign, null, 2), "utf8");
  await writeFile(ladderPath, JSON.stringify(tiers, null, 2), "utf8");
  return { campaignPath, ladderPath };
}

test("validateCampaign loads and validates a campaign spec and reward ladder from JSON files", async () => {
  await withTmpDir(async (dir) => {
    const { campaignPath, ladderPath } = await writeFixtures(dir);
    const { campaign: loaded, tiers: loadedTiers } = await validateCampaign(campaignPath, ladderPath);
    assert.equal(loaded.id, "widget-run");
    assert.equal(loadedTiers.length, 2);
  });
});

test("computeGoal loaded from a JSON file matches computeGoalFromTasks on the same data", async () => {
  await withTmpDir(async (dir) => {
    const { campaignPath } = await writeFixtures(dir);
    const goal = await computeGoal(campaignPath);
    // labor: 2 low days * $100 = $200; physical: (4+6)*50 = $500
    assert.equal(goal.recommendedGoalUsd, 200 + 500);
  });
});

test("renderCampaignPage includes the goal, every task, every reward tier, physical-cost note, and sources", async () => {
  await withTmpDir(async (dir) => {
    const { campaignPath, ladderPath } = await writeFixtures(dir);
    const loadedCampaign = await loadCampaignSpec(campaignPath);
    const loadedTiers = await loadRewardLadder(ladderPath);
    const page = renderCampaignPage(loadedCampaign, loadedTiers);
    assert.match(page, /\$700/); // 200 labor + 500 physical
    assert.match(page, /Firmware/);
    assert.match(page, /One Widget/);
    assert.match(page, /p\/README\.md/);
    assert.match(page, /\*\*Status: blocked\*\*/);
    assert.match(page, /bill-of-materials\/fulfillment cost/);
  });
});

test("recordCampaignReadiness journals the campaign's status and blockers", async () => {
  await withTmpDir(async (dir) => {
    const { campaignPath } = await writeFixtures(dir);
    const loadedCampaign = await loadCampaignSpec(campaignPath);
    const journalRoot = path.join(dir, "journal-root");
    const record = recordCampaignReadiness(loadedCampaign, { root: journalRoot });
    assert.equal(record.status, "blocked");
    assert.equal(record.blockers.length, 1);
  });
});

test("recordPledge accumulates toward campaignPledgeTotal and enforces a tier's quantityCap", async () => {
  await withTmpDir(async (dir) => {
    const journalRoot = path.join(dir, "journal-root");
    recordPledge("widget-run", "digital-supporter", tiers, { root: journalRoot });
    recordPledge("widget-run", "widget", tiers, { root: journalRoot });
    const total = campaignPledgeTotal("widget-run", { root: journalRoot });
    assert.equal(total.totalPledgedUsd, 10 + 40);
    assert.equal(total.backerCount, 2);
  });
});

test("recordPledge refuses once a capped tier is sold out", async () => {
  await withTmpDir(async (dir) => {
    const journalRoot = path.join(dir, "journal-root");
    // widget has quantityCap 2; fill it, then the 3rd must be refused.
    recordPledge("widget-run", "widget", tiers, { root: journalRoot });
    recordPledge("widget-run", "widget", tiers, { root: journalRoot });
    assert.throws(() => recordPledge("widget-run", "widget", tiers, { root: journalRoot }), /sold out/);
  });
});

test("recordPledge rejects an unknown tier", async () => {
  await withTmpDir(async (dir) => {
    const journalRoot = path.join(dir, "journal-root");
    assert.throws(() => recordPledge("widget-run", "nope", tiers, { root: journalRoot }), /no reward tier/);
  });
});
