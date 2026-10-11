// Domain semantics: crowdfunding campaigns -- reward-tier ladders and
// task/bill-of-materials budget math for a campaign funded by many
// individuals instead of one grant committee or investor. Pure functions
// only -- no filesystem, no network. Every campaign and reward ladder is
// an ARGUMENT loaded by the caller from its own data (typically JSON on
// disk); this module holds no campaign registry of its own.

// TaskEstimate: one funded labor work item, with a day-estimate range.
/** @typedef {{name:string,description:string,lowDays:number,highDays:number,sourcePath:string}} TaskEstimate */

// BillOfMaterialsLine: one physical-goods input's per-unit cost.
/** @typedef {{name:string,unitCostUsd:number}} BillOfMaterialsLine */

// FulfillmentCostLine: one per-unit fulfillment cost (packaging, pick/pack,
// a 3PL fee, print-on-demand markup, ...) distinct from shipping itself.
/** @typedef {{name:string,costUsdPerUnit:number}} FulfillmentCostLine */

// CampaignSpec: one named campaign for one public project. billOfMaterials,
// fulfillmentCostLines, and expectedPhysicalUnits are optional and additive
// -- a campaign with none of them behaves exactly as a labor-only campaign.
/** @typedef {{
 *   id:string,title:string,category:string,blurb:string,dayRateUsd:number,
 *   deadlineDays:number,tasks:TaskEstimate[],groundedIn:string[],blockers:string[],
 *   billOfMaterials?:BillOfMaterialsLine[],fulfillmentCostLines?:FulfillmentCostLine[],
 *   expectedPhysicalUnits?:number
 * }} CampaignSpec */

// PhysicalRewardDetails: a reward tier that ships a physical object.
// requiresAddress is always exactly `true` for a physical tier -- shipping
// a real object always requires a shipping address -- so validation
// enforces the literal value, not merely its type.
/** @typedef {{
 *   weightGrams:number,dimensionsMm:{l:number,w:number,h:number},
 *   shippingEstimateUsd:number,requiresAddress:true,
 *   fulfillment:"self"|"3pl"|"print-on-demand"
 * }} PhysicalRewardDetails */

// RewardTier: one backer-facing pledge level. `physical` is optional and
// additive -- a digital-only tier omits it entirely.
/** @typedef {{
 *   id:string,name:string,priceUsd:number,description:string,
 *   quantityCap:number|null,estimatedDeliveryMonths:number,
 *   physical?:PhysicalRewardDetails
 * }} RewardTier */

const FULFILLMENT_KINDS = new Set(["self", "3pl", "print-on-demand"]);

/**
 * Sum a campaign's own task estimates into a labor-goal range at its
 * declared day rate, plus (when the campaign declares them) the per-unit
 * cost of its bill-of-materials and fulfillment lines times its expected
 * physical-unit count. A campaign with no physical fields gets exactly the
 * labor-only goal.
 * @param {CampaignSpec} campaign
 * @returns {{lowUsd:number, highUsd:number, recommendedGoalUsd:number, physicalUnitCostUsd:number, physicalGoalUsd:number}}
 */
export function computeGoalFromTasks(campaign) {
  const laborLowUsd = campaign.tasks.reduce((sum, t) => sum + t.lowDays, 0) * campaign.dayRateUsd;
  const laborHighUsd = campaign.tasks.reduce((sum, t) => sum + t.highDays, 0) * campaign.dayRateUsd;

  const billOfMaterials = campaign.billOfMaterials ?? [];
  const fulfillmentCostLines = campaign.fulfillmentCostLines ?? [];
  const expectedPhysicalUnits = campaign.expectedPhysicalUnits ?? 0;
  const physicalUnitCostUsd =
    billOfMaterials.reduce((sum, line) => sum + line.unitCostUsd, 0) +
    fulfillmentCostLines.reduce((sum, line) => sum + line.costUsdPerUnit, 0);
  const physicalGoalUsd = physicalUnitCostUsd * expectedPhysicalUnits;

  return {
    lowUsd: laborLowUsd + physicalGoalUsd,
    highUsd: laborHighUsd + physicalGoalUsd,
    recommendedGoalUsd: laborLowUsd + physicalGoalUsd,
    physicalUnitCostUsd,
    physicalGoalUsd,
  };
}

/**
 * Validate a campaign spec carries every field a campaign page needs.
 * @param {CampaignSpec} campaign
 * @returns {CampaignSpec}
 */
export function validateCampaignSpec(campaign) {
  const required = ["id", "title", "category", "blurb", "dayRateUsd", "deadlineDays", "tasks", "groundedIn"];
  for (const field of required) {
    if (campaign[field] === undefined || campaign[field] === null) {
      throw new Error(`campaign "${campaign.id ?? "(no id)"}" missing required field: ${field}`);
    }
  }
  if (!Array.isArray(campaign.tasks) || campaign.tasks.length === 0) {
    throw new Error(`campaign "${campaign.id}" must declare at least one task`);
  }
  if (!Array.isArray(campaign.groundedIn) || campaign.groundedIn.length === 0) {
    throw new Error(`campaign "${campaign.id}" must cite at least one groundedIn source path`);
  }
  if (campaign.billOfMaterials !== undefined || campaign.fulfillmentCostLines !== undefined) {
    if (!campaign.expectedPhysicalUnits || campaign.expectedPhysicalUnits <= 0) {
      throw new Error(`campaign "${campaign.id}" declares physical cost lines but no positive expectedPhysicalUnits`);
    }
  }
  return campaign;
}

/**
 * Readiness is a fact about the campaign, not a vibe: a campaign with any
 * open blocker is "blocked", never "ready", regardless of how complete its
 * copy is. Blocked stays blocked until every disclosed blocker clears.
 * @param {CampaignSpec} campaign
 * @returns {{status: "ready"|"blocked", blockers: string[]}}
 */
export function campaignReadinessScore(campaign) {
  const blockers = campaign.blockers ?? [];
  return { status: blockers.length === 0 ? "ready" : "blocked", blockers };
}

/**
 * Validate one reward tier's own fields, including its optional physical
 * block when present.
 * @param {RewardTier} tier
 * @returns {RewardTier}
 */
export function validateRewardTier(tier) {
  const required = ["id", "name", "priceUsd", "description", "estimatedDeliveryMonths"];
  for (const field of required) {
    if (tier[field] === undefined || tier[field] === null) {
      throw new Error(`reward tier "${tier.id ?? "(no id)"}" missing required field: ${field}`);
    }
  }
  if (tier.priceUsd <= 0) throw new Error(`reward tier "${tier.id}" must have a positive priceUsd`);
  if (tier.physical !== undefined) validatePhysicalRewardDetails(tier.id, tier.physical);
  return tier;
}

/**
 * @param {string} tierId
 * @param {PhysicalRewardDetails} physical
 */
function validatePhysicalRewardDetails(tierId, physical) {
  if (!(physical.weightGrams > 0)) {
    throw new Error(`reward tier "${tierId}" physical.weightGrams must be a positive number`);
  }
  const dims = physical.dimensionsMm;
  if (!dims || !(dims.l > 0) || !(dims.w > 0) || !(dims.h > 0)) {
    throw new Error(`reward tier "${tierId}" physical.dimensionsMm must have positive l, w, h`);
  }
  if (!(physical.shippingEstimateUsd >= 0)) {
    throw new Error(`reward tier "${tierId}" physical.shippingEstimateUsd must be a non-negative number`);
  }
  if (physical.requiresAddress !== true) {
    throw new Error(`reward tier "${tierId}" physical.requiresAddress must be true`);
  }
  if (!FULFILLMENT_KINDS.has(physical.fulfillment)) {
    throw new Error(`reward tier "${tierId}" physical.fulfillment must be one of self, 3pl, print-on-demand`);
  }
}

/**
 * Validate a whole ladder: unique ids, strictly ascending price.
 * @param {RewardTier[]} tiers
 * @returns {RewardTier[]}
 */
export function validateTierLadder(tiers) {
  if (!Array.isArray(tiers) || tiers.length === 0) throw new Error("reward ladder must have at least one tier");
  tiers.forEach(validateRewardTier);
  const ids = new Set(tiers.map((t) => t.id));
  if (ids.size !== tiers.length) throw new Error("reward ladder has duplicate tier ids");
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].priceUsd <= tiers[i - 1].priceUsd) {
      throw new Error(`reward ladder is not strictly ascending in price at tier "${tiers[i].id}"`);
    }
  }
  return tiers;
}

/**
 * Total pledge capacity if every capped tier sells out and every uncapped
 * tier gets exactly one backer -- a floor estimate, not a forecast.
 * @param {RewardTier[]} tiers
 * @returns {number}
 */
export function floorPledgeCapacityUsd(tiers) {
  return tiers.reduce((sum, t) => sum + t.priceUsd * (t.quantityCap ?? 1), 0);
}
