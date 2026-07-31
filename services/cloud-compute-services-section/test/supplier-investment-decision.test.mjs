import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR } from "../src/improvement-board-forager.mjs";
import { PUBLIC, decideSupplierInvestmentDemand } from "../src/supplier-investment-decision.mjs";

const record = (body) => Object.freeze({ id: semanticId(relationalRwilDocument(body)), ...body });
const policy = {
  type: "SupplierSelfInvestmentDemandPolicy", enabled: true, authoredBy: ACTOR, standingDecision: "publish-provider-neutral-proposal-lot",
  admittedOpportunityTypes: ["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity"],
  maximumProposalConsideration: { amount: 8, unit: "relative-resolution-milliquanta-v1" },
  protectedAcceptanceAssertions: ["exact opportunity", "downward route", "isolated behavioral assay", "atomic schedule rebind", "supplier-local mutation"],
  publicationAuthority: { proposalInquiryOnly: true, spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false, providerSelectionAuthorized: false },
};

function opportunity(type = "SupplierCapabilityInvestmentOpportunity") {
  const common = {
    supplier: ACTOR, sourceActivity: "urn:activity:gap", sourceGap: "urn:gap", customer: "urn:customer", lot: "urn:customer:lot", observedAtTick: 9,
    maximumCustomerBounty: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities: ["software-engineering", "code-review"],
    missingCapabilities: type === "SupplierCapacityInvestmentOpportunity" ? [] : ["code-review"], recordedAt: "2026-07-21T21:00:00.000Z",
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false,
    protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: "separate-supplier-local-decision", providerOrModelSelected: false,
  };
  return type === "SupplierCapacityInvestmentOpportunity"
    ? record({ type, ...common, reason: "capacity", automaticCapacityIncreaseAuthorized: false })
    : record({ type, ...common, reason: "capability", investableCapabilities: ["code-review"], automaticImplementationAuthorized: false });
}

test("an exact adjacent opportunity becomes one bounded public proposal lot", () => {
  const decided = decideSupplierInvestmentDemand(opportunity(), policy);
  assert.equal(decided.decision.disposition, "published"); assert.equal(decided.publication.type, "Offer"); assert.equal(decided.publication.target, PUBLIC);
  assert.equal(decided.publication.object.type, "SupplierSelfImprovementWorkLot"); assert.deepEqual(decided.publication.object.requestedCapabilities, ["code-review"]);
  assert.equal(decided.publication.object.terms.spendAuthorized, false); assert.equal(decided.publication.object.terms.providerPreselected, false);
  assert.equal(decided.publication.object.terms.refinement, "model-to-smaller-model-to-script"); assert.equal(decided.publication.object.terms.behavioralAssayRequired, true);
});

test("capacity opportunity asks for availability without authorizing a stronger model", () => {
  const decided = decideSupplierInvestmentDemand(opportunity("SupplierCapacityInvestmentOpportunity"), policy);
  assert.deepEqual(decided.publication.object.requestedCapabilities, ["software-engineering", "code-review"]);
  assert.equal(decided.publication.object.investmentClass, "capacity"); assert.equal(decided.publication.object.terms.strongerModelAuthorized, false);
});

test("changed evidence or expanded standing authority is a typed refusal", () => {
  const source = opportunity();
  for (const [changed, changedPolicy] of [
    [{ ...source, strongerModelAuthorized: true }, policy],
    [source, { ...policy, publicationAuthority: { ...policy.publicationAuthority, spendAuthorized: true } }],
    [{ ...source, investableCapabilities: ["wafer-fabrication"] }, policy],
  ]) {
    const decided = decideSupplierInvestmentDemand(changed, changedPolicy);
    assert.equal(decided.publication, null); assert.equal(decided.decision.disposition, "refused"); assert.equal(decided.decision.spendAuthorized, false);
  }
});
