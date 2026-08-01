import assert from "node:assert/strict";
import test from "node:test";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { resolutionCreditPolicy } from "@harmonious-union/inference-work-lot-service/consideration";
import { ACTOR } from "../src/improvement-board-forager.mjs";
import { executeSupplierSelfImprovement, pendingSupplierSelfImprovement, settleNextSupplierSelfImprovement } from "../src/supplier-self-improvement.mjs";

const record = (body) => Object.freeze({ id: semanticId(relationalWitnessJournalDocument(body)), ...body });
const recipe = Object.freeze({ type: "SupplierCapabilityImplementationRecipe", capability: "code-review", objective: "gain code review", focusPaths: ["src/route.mjs"], writablePaths: ["src/route.mjs"], acceptanceArtifactPath: "union-acceptance/code-review.test.mjs", testVectors: ["review"], given: ["missing review"], when: "a lot arrives", then: ["return a proposal"], forbidden: ["host mutation"], constraints: ["proposal only"] });
const policy = Object.freeze({ type: "SupplierSelfImprovementExecutionPolicy", enabled: true, customer: ACTOR, spendAuthorized: true, refusalDisposition: "terminal", acceptanceConsiderationPolicy: resolutionCreditPolicy(8), implementationConsiderationPolicy: resolutionCreditPolicy(23), capacityInvestmentDisposition: "typed-residue-until-distinct-capacity-oracle", recipes: { "code-review": recipe } });
const contract = `ni:///sha-256;${"C".repeat(43)}`;

function publication(investmentClass = "capability") {
  const lot = record({ type: "SupplierSelfImprovementWorkLot", customer: ACTOR, sourceOpportunity: "urn:opportunity", investmentClass, requestedCapabilities: ["code-review"], objective: "gain review", providerNeutral: true, deliveryMode: "proposal-only", openedAt: "2026-07-21T00:00:00.000Z", maximumProposalConsideration: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, acceptanceOracle: record({ type: "SupplierSelfInvestmentAcceptanceOracle", governedBy: ACTOR, assertions: ["protected"] }), terms: { spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false, providerPreselected: false, strongerModelAuthorized: false, refinement: "model-to-smaller-model-to-script", behavioralAssayRequired: true } });
  return record({ "@context": "https://www.w3.org/ns/activitystreams", type: "Offer", actor: ACTOR, object: lot, published: lot.openedAt });
}

const capsule = { digest: `ni:///sha-256;${"B".repeat(43)}`, command: "node --test union-acceptance/code-review.test.mjs" };
const result = { outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["urn:provider:implementation"], changes: [{ path: "src/route.mjs", beforeExisted: true, beforeDigest: "sha256:before", afterDigest: "sha256:after", afterBytesBase64: "eA==" }] } } };

test("a terminal lot is not selected again", () => {
  const offered = publication();
  assert.equal(pendingSupplierSelfImprovement([offered], { policy }), offered);
  assert.equal(pendingSupplierSelfImprovement([offered, record({ type: "SupplierSelfImprovementAttemptResidue", lot: offered.object.id })], { policy }), null);
});

test("the repair actuator emits an inert clopen patch manifest", async () => {
  const calls = [];
  const manifest = await executeSupplierSelfImprovement(publication(), {
    contract, policy, territory: "ni:///sha-256;territory", sequence: 7, at: "2026-07-21T00:07:00.000Z",
    procure: async (request) => (calls.push(["procure", request]), { supplier: { provider: "urn:provider:oracle" }, capsule }),
    execute: async (mission) => (calls.push(["execute", mission]), result),
  });
  assert.equal(manifest.type, "SupplierSelfImprovementPatchManifest");
  assert.equal(manifest.disposition, "proposal-awaiting-js-mark-admission");
  assert.equal(manifest.customerMutation, false);
  assert.deepEqual(manifest.changes, result.outcome.proposal.changes);
  assert.equal(calls[1][1].apply, false);
  assert.match(calls[1][1].constraints.at(-1), /JS Mark admission boundary/u);
});

test("the settlement ledger records border intents and the manifest, never a filesystem application", async () => {
  const rows = [publication()];
  const ledger = { read: () => [...rows], append: async (value) => (rows.push(value), value) };
  const settled = await settleNextSupplierSelfImprovement({ rows, ledger, contract, policy, territory: "ni:///sha-256;territory", sequence: 8, at: "2026-07-21T00:08:00.000Z", procure: async () => ({ supplier: { provider: "urn:provider:oracle" }, capsule }), execute: async () => result });
  assert.equal(settled.type, "SupplierSelfImprovementPatchManifest");
  assert.deepEqual(rows.slice(1).map((row) => row.type), ["SupplierSelfImprovementProcurementIntent", "SupplierSelfImprovementMissionIntent", "SupplierSelfImprovementPatchManifest"]);
});

test("capacity remains typed residue instead of an implicit local change", async () => {
  const settled = await settleNextSupplierSelfImprovement({ rows: [], ledger: { read: () => [publication("capacity")], append: async (value) => value }, contract, policy, territory: "ni:///sha-256;territory", sequence: 9, at: "2026-07-21T00:09:00.000Z", procure: async () => null, execute: async () => null });
  assert.equal(settled.type, "SupplierSelfImprovementAttemptResidue");
  assert.equal(settled.reason, "typed-residue-until-distinct-capacity-oracle");
});
