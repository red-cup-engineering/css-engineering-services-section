import assert from "node:assert/strict";
import test from "node:test";
import { extractRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { decodeSemantic, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { createSupplierActivityPubCallbacks } from "../src/activitypub-face.mjs";
import { ACTOR, CONTEXT } from "../src/improvement-board-forager.mjs";
import { PUBLIC } from "../src/supplier-investment-decision.mjs";

const origin = "https://supplier.example/", identifier = "free-compute", agentCard = "https://supplier.example/a2a/improvement-market-supplier";
const record = (body) => Object.freeze({ id: semanticId(relationalRwilDocument(body)), ...body });
const value = (encoded) => { const term = decodeSemantic(encoded); return decodeRelationalValue(term[1], term[2]); };
function publication(source = "urn:opportunity:one") {
  const object = record({ type: "SupplierSelfImprovementWorkLot", customer: ACTOR, sourceOpportunity: source, sourceCustomer: "urn:customer", sourceCustomerLot: "urn:customer:lot", investmentClass: "capability", requestedCapabilities: ["code-review"], objective: "return one proposal", providerNeutral: true, deliveryMode: "proposal-only", openedAt: "2026-07-21T21:00:00.000Z", maximumProposalConsideration: { amount: 8, unit: "relative-resolution-milliquanta-v1" }, acceptanceOracle: record({ type: "SupplierSelfInvestmentAcceptanceOracle", governedBy: ACTOR, assertions: ["proposal-bound behavioral assay"] }), terms: { spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false, providerPreselected: false, strongerModelAuthorized: false, refinement: "model-to-smaller-model-to-script", behavioralAssayRequired: true, currentScheduleRebindingRequiredForRuntimeChange: true } });
  const quote = record({ type: "SupplierSelfImprovementProposalQuote", lot: object.id, considerationCeiling: { amount: 8, unit: "relative-resolution-milliquanta-v1" }, spendAuthorized: false });
  return record({ "@context": CONTEXT, type: "Offer", actor: ACTOR, target: PUBLIC, object, attachment: [quote], published: "2026-07-21T21:00:00.000Z" });
}

test("the supplier exposes its exact provider-neutral self-improvement lots through its own public ActivityPub outbox", async () => {
  const rows = [publication(), { type: "SupplierInvestmentDemandDecision" }, { ...publication("urn:other"), actor: "urn:foreign" }];
  const callbacks = createSupplierActivityPubCallbacks({ origin, identifier, agentCard, ledger: { read: () => rows }, pageSize: 1 });
  const page = await callbacks.listOutbox({});
  assert.equal(page.items.length, 1); assert.equal(page.nextCursor, undefined);
  const projection = extractRmnActivity(await page.items[0].toJsonLd(), { expectedActor: "https://supplier.example/actors/free-compute", expectedRecipient: PUBLIC, expectedAgentCard: agentCard });
  const activity = value(projection.objectBytes);
  assert.equal(activity.actor, ACTOR); assert.equal(activity.object.type, "SupplierSelfImprovementWorkLot"); assert.equal(activity.object.providerNeutral, true);
});

test("public discovery does not silently create an inbound provider or mutation treaty", async () => {
  const callbacks = createSupplierActivityPubCallbacks({ origin, identifier, agentCard, ledger: { read: () => [] } });
  await assert.rejects(callbacks.onActivity({ jsonLd: {} }), /no admitted provider treaty/u);
});

test("the public face does not project a semantically changed ledger row", async () => {
  const changed = { ...publication(), actor: ACTOR, published: "2026-07-21T22:00:00.000Z" };
  const callbacks = createSupplierActivityPubCallbacks({ origin, identifier, agentCard, ledger: { read: () => [changed] } });
  assert.equal((await callbacks.listOutbox({})).items.length, 0);
});
