import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeGoalFromTasks,
  validateCampaignSpec,
  campaignReadinessScore,
  validateRewardTier,
  validateTierLadder,
  floorPledgeCapacityUsd,
} from "../src/crowdfunding.mjs";

const laborOnlyCampaign = {
  id: "labor-only",
  title: "Labor-only campaign",
  category: "Technology",
  blurb: "b",
  dayRateUsd: 100,
  deadlineDays: 30,
  tasks: [
    { name: "a", description: "d", lowDays: 2, highDays: 4, sourcePath: "p" },
    { name: "b", description: "d", lowDays: 3, highDays: 5, sourcePath: "p" },
  ],
  groundedIn: ["p"],
  blockers: [],
};

const physicalCampaign = {
  id: "physical-goods",
  title: "Physical-goods campaign",
  category: "Design",
  blurb: "b",
  dayRateUsd: 100,
  deadlineDays: 30,
  tasks: [{ name: "a", description: "d", lowDays: 1, highDays: 2, sourcePath: "p" }],
  groundedIn: ["p"],
  blockers: [],
  billOfMaterials: [
    { name: "enclosure", unitCostUsd: 12 },
    { name: "pcb", unitCostUsd: 8 },
  ],
  fulfillmentCostLines: [{ name: "packaging + pick/pack", costUsdPerUnit: 5 }],
  expectedPhysicalUnits: 100,
};

test("computeGoalFromTasks sums the low/high end of every task at the day rate", () => {
  const goal = computeGoalFromTasks(laborOnlyCampaign);
  assert.equal(goal.lowUsd, 500);
  assert.equal(goal.highUsd, 900);
  assert.equal(goal.recommendedGoalUsd, 500);
  assert.equal(goal.physicalGoalUsd, 0);
});

test("computeGoalFromTasks adds bill-of-materials and fulfillment cost times expected units for a physical campaign", () => {
  const goal = computeGoalFromTasks(physicalCampaign);
  // labor: 1 low day * $100 = $100; physical unit cost: 12+8+5=25 * 100 units = $2500
  assert.equal(goal.physicalUnitCostUsd, 25);
  assert.equal(goal.physicalGoalUsd, 2500);
  assert.equal(goal.lowUsd, 100 + 2500);
  assert.equal(goal.recommendedGoalUsd, 100 + 2500);
});

test("computeGoalFromTasks on a campaign with no physical fields matches the labor-only path exactly", () => {
  const goal = computeGoalFromTasks(laborOnlyCampaign);
  assert.equal(goal.physicalGoalUsd, 0);
  assert.equal(goal.recommendedGoalUsd, goal.lowUsd);
});

test("validateCampaignSpec rejects a spec missing a required field", () => {
  assert.throws(() => validateCampaignSpec({ id: "x" }), /missing required field/);
});

test("validateCampaignSpec rejects a spec with no tasks", () => {
  assert.throws(
    () => validateCampaignSpec({ id: "x", title: "t", category: "c", blurb: "b", dayRateUsd: 1, deadlineDays: 1, tasks: [], groundedIn: ["p"] }),
    /at least one task/
  );
});

test("validateCampaignSpec accepts the physical-goods fixture", () => {
  assert.deepEqual(validateCampaignSpec(physicalCampaign), physicalCampaign);
});

test("validateCampaignSpec rejects physical cost lines with no expectedPhysicalUnits", () => {
  const bad = { ...physicalCampaign, expectedPhysicalUnits: undefined };
  assert.throws(() => validateCampaignSpec(bad), /expectedPhysicalUnits/);
});

test("campaignReadinessScore is blocked while any blocker is open", () => {
  const readiness = campaignReadinessScore({ blockers: ["no open license yet"] });
  assert.equal(readiness.status, "blocked");
  assert.equal(readiness.blockers.length, 1);
});

test("campaignReadinessScore reports ready once no blockers remain", () => {
  const readiness = campaignReadinessScore({ blockers: [] });
  assert.equal(readiness.status, "ready");
});

test("validateRewardTier rejects a non-positive price", () => {
  assert.throws(
    () => validateRewardTier({ id: "x", name: "X", priceUsd: 0, description: "d", estimatedDeliveryMonths: 1 }),
    /positive priceUsd/
  );
});

test("validateRewardTier accepts a digital-only tier with no physical block", () => {
  const tier = { id: "x", name: "X", priceUsd: 10, description: "d", quantityCap: null, estimatedDeliveryMonths: 1 };
  assert.deepEqual(validateRewardTier(tier), tier);
});

test("validateRewardTier accepts a well-formed physical tier", () => {
  const tier = {
    id: "shirt",
    name: "T-shirt",
    priceUsd: 30,
    description: "d",
    quantityCap: null,
    estimatedDeliveryMonths: 3,
    physical: {
      weightGrams: 200,
      dimensionsMm: { l: 300, w: 250, h: 20 },
      shippingEstimateUsd: 8,
      requiresAddress: true,
      fulfillment: "3pl",
    },
  };
  assert.deepEqual(validateRewardTier(tier), tier);
});

test("validateRewardTier rejects a physical tier with a non-positive weight", () => {
  const tier = {
    id: "x",
    name: "X",
    priceUsd: 10,
    description: "d",
    estimatedDeliveryMonths: 1,
    physical: { weightGrams: 0, dimensionsMm: { l: 1, w: 1, h: 1 }, shippingEstimateUsd: 1, requiresAddress: true, fulfillment: "self" },
  };
  assert.throws(() => validateRewardTier(tier), /weightGrams/);
});

test("validateRewardTier rejects a physical tier with missing or non-positive dimensions", () => {
  const tier = {
    id: "x",
    name: "X",
    priceUsd: 10,
    description: "d",
    estimatedDeliveryMonths: 1,
    physical: { weightGrams: 10, dimensionsMm: { l: 0, w: 1, h: 1 }, shippingEstimateUsd: 1, requiresAddress: true, fulfillment: "self" },
  };
  assert.throws(() => validateRewardTier(tier), /dimensionsMm/);
});

test("validateRewardTier rejects a physical tier whose requiresAddress is not exactly true", () => {
  const tier = {
    id: "x",
    name: "X",
    priceUsd: 10,
    description: "d",
    estimatedDeliveryMonths: 1,
    physical: { weightGrams: 10, dimensionsMm: { l: 1, w: 1, h: 1 }, shippingEstimateUsd: 1, requiresAddress: false, fulfillment: "self" },
  };
  assert.throws(() => validateRewardTier(tier), /requiresAddress/);
});

test("validateRewardTier rejects a physical tier with an unknown fulfillment kind", () => {
  const tier = {
    id: "x",
    name: "X",
    priceUsd: 10,
    description: "d",
    estimatedDeliveryMonths: 1,
    physical: { weightGrams: 10, dimensionsMm: { l: 1, w: 1, h: 1 }, shippingEstimateUsd: 1, requiresAddress: true, fulfillment: "drone" },
  };
  assert.throws(() => validateRewardTier(tier), /fulfillment/);
});

test("validateTierLadder rejects duplicate ids and non-ascending price", () => {
  const dup = [
    { id: "a", name: "A", priceUsd: 10, description: "d", estimatedDeliveryMonths: 1 },
    { id: "a", name: "A2", priceUsd: 20, description: "d", estimatedDeliveryMonths: 1 },
  ];
  assert.throws(() => validateTierLadder(dup), /duplicate tier ids/);

  const outOfOrder = [
    { id: "a", name: "A", priceUsd: 20, description: "d", estimatedDeliveryMonths: 1 },
    { id: "b", name: "B", priceUsd: 10, description: "d", estimatedDeliveryMonths: 1 },
  ];
  assert.throws(() => validateTierLadder(outOfOrder), /strictly ascending/);
});

test("floorPledgeCapacityUsd sums capped tiers at their cap and uncapped tiers as one backer", () => {
  const tiers = [
    { priceUsd: 10, quantityCap: null },
    { priceUsd: 100, quantityCap: 5 },
  ];
  assert.equal(floorPledgeCapacityUsd(tiers), 10 * 1 + 100 * 5);
});
