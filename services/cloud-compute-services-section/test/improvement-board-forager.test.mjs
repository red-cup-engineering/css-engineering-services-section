import test from "node:test";
import assert from "node:assert/strict";
import { bidForBoardOffer, deliveryFromResult, fulfillBoardAward, fulfillGameDesignAward, missionForAward } from "../src/improvement-board-forager.mjs";

const quote = { id: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", type: "ImprovementBuyerQuote", lot: "urn:sha256:lot", consideration: { amount: 12, unit: "relative-resolution-milliquanta-v1" } };
const lot = { id: "urn:sha256:lot", type: "SoftwareDevelopmentWorkLot", consumer: "urn:ame:customer", requestedChanges: ["replace recurring inference"], productContract: { validationChecks: ["node-replay"] }, ownedTargetRoots: ["src/route.mjs"], acceptanceCommands: [{ runner: "node", argv: ["--test", "test/route.test.mjs"] }], boardTerms: { requiredCapabilities: ["software-engineering", "json-schema-output", "code-review"], territory: "/customer", taskClass: "route", upwardEscalationAuthorized: false } };
const offer = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:offer:implementation", type: "Offer", actor: lot.consumer, object: lot, attachment: [quote] };
const bidFor = (activity) => bidForBoardOffer(activity);

test("forager watches a customer offer and authors its own bounded competing bid", () => {
  const bid = bidFor(offer);
  assert.equal(bid.actor, "urn:ame:cloud-compute-services-section");
  assert.equal(bid.object.consideration.amount, 8);
  assert.equal(bid.object.customerMutation, false);
  assert.equal(bid.object.upwardEscalationAuthorized, false);
  assert.ok(bid.object.capabilities.includes("code-review"));
  assert.equal(bid.object.resourceObservation.state, "provider-will-queue-or-refuse-from-observed-load");
});

test("a qualified lot is priced without inventing a fixed supplier capacity", () => {
  const bid = bidForBoardOffer(offer);
  assert.equal(bid.object.resourceObservation.provider, "urn:ame:cloud-compute-services-section");
});

test("an exact award becomes a proposal-only downward mission", () => {
  const bid = bidFor(offer);
  const award = { id: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", type: "Accept", actor: lot.consumer, target: bid.actor, object: { type: "ImprovementProposalAward", lot: lot.id, bid: bid.id, customerMutationAuthorized: false } };
  const mission = missionForAward(award, bid);
  assert.equal(mission.apply, false);
  assert.equal(Object.hasOwn(mission, "maxTokens"), false);
  assert.equal(mission.considerationPolicy.acceptableAlternatives[0].obligations[0].maximumAmount, 31);
  assert.equal(Object.hasOwn(mission, "maximumConsideration"), false);
  assert.equal(mission.testVectors[0].id, "board-lot-route");
  assert.deepEqual(mission.testVectors[0].then, ["node-replay"]);
  assert.equal(mission.verifyCommand, "node --test test/route.test.mjs");
});

test("verified mission egress is exact proposal bytes plus a proposal-bound behavioral review", () => {
  const bid = bidFor(offer);
  const award = { id: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", type: "Accept", actor: lot.consumer, target: bid.actor, object: { type: "ImprovementProposalAward", lot: lot.id, bid: bid.id, customerMutationAuthorized: false } };
  const result = { id: "urn:trajectory:test", executionProvider: "urn:ame:software-mission-execution-service", executionReceipt: { inputNi: "ni:///sha-256;input", outputNi: "ni:///sha-256;output", agentCard: { name: "mission die" } }, outcome: { verified: true, proposal: { proposalOnly: true, customerMutation: false, authorProviders: ["urn:ame:author"], changes: [{ path: "src/route.mjs", beforeExisted: true, beforeDigest: `sha256:${"1".repeat(64)}`, afterDigest: `sha256:${"2".repeat(64)}`, afterBytesBase64: "eA==" }], trajectoryFingerprint: "shape", trajectoryRecipeFingerprint: "exact", deterministicResolver: null }, semanticReview: { reviews: [{ accepted: true, provider: "urn:ame:author", reason: "protected behavior passes" }] } }, metrics: { inferenceAttempts: 4, usefulCompletions: 2, directInteractiveModelCalls: 0, expectedConsideration: [] } };
  const delivery = deliveryFromResult(award, bid, result, "2026-07-21T00:00:00.000Z");
  assert.equal(delivery.object.type, "SoftwareChangeProposal");
  assert.equal(delivery.object.route.frontierInferenceCalls, 0);
  assert.equal(delivery.object.route.executionProvider, "urn:ame:software-mission-execution-service");
  assert.equal(delivery.object.route.executionReceipt.inputNi, "ni:///sha-256;input");
  assert.equal(delivery.attachment[0].actor, "urn:ame:author");
  assert.equal(delivery.attachment[0].candidate, delivery.object.id);
});

test("an unresolved awarded proof wave settles as supplier-authored residue", async () => {
  const bid = bidFor(offer);
  const award = { id: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", type: "Accept", actor: lot.consumer, target: bid.actor, object: { type: "ImprovementProposalAward", lot: lot.id, bid: bid.id, customerMutationAuthorized: false } };
  const refusal = await fulfillBoardAward(award, bid, { executeSoftwareMission: async () => ({ outcome: { verified: false, classification: "unresolved", summary: "cheap proof waves exhausted" }, metrics: { inferenceAttempts: 7, usefulCompletions: 2, directInteractiveModelCalls: 0 }, phases: [{}, {}] }), recordedAt: "2026-07-21T00:00:00.000Z" });
  assert.equal(refusal.type, "Reject");
  assert.equal(refusal.object.type, "ImprovementServiceRefusal");
  assert.equal(refusal.object.resources.inferenceAttempts, 7);
  assert.equal(refusal.object.strongerModelRequested, false);
});

test("supplier refusal accounts every downward phase instead of only the final wave", async () => {
  const bid = bidFor(offer);
  const award = { id: "ni:///sha-256;BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB", type: "Accept", actor: lot.consumer, target: bid.actor, object: { type: "ImprovementProposalAward", lot: lot.id, bid: bid.id, customerMutationAuthorized: false } };
  const refusal = await fulfillBoardAward(award, bid, { executeSoftwareMission: async () => ({
    outcome: { verified: false, classification: "unresolved", summary: "bounded residue" },
    phases: [
      { result: { metrics: { inferenceAttempts: 5, usefulCompletions: 2, directInteractiveModelCalls: 0, expectedConsideration: [{ amount: 8, unit: "u" }] } } },
      { result: { metrics: { inferenceAttempts: 9, usefulCompletions: 1, directInteractiveModelCalls: 0, expectedConsideration: [] } } },
    ],
  }) });
  assert.deepEqual(refusal.object.resources, { inferenceAttempts: 14, usefulCompletions: 3, directInteractiveModelCalls: 0, consideration: [{ amount: 8, unit: "u" }] });
});

const gameQuote = { id: "urn:quote:game", type: "ImprovementGameBuyerQuote", lot: "urn:lot:game", consideration: { amount: 12, unit: "relative-resolution-milliquanta-v1" } };
const gameLot = { id: "urn:lot:game", type: "ImprovementGameDesignWorkLot", consumer: "urn:ame:customer", objective: "derive a customer-assayable game", sourceObservation: { id: "urn:opportunity", summary: "measured expensive route" }, productContract: { type: "ImprovementGameProposal" }, gameTerms: { requiredCapabilities: ["software-engineering", "json-schema-output"], territory: "/customer", taskClass: "game", upwardEscalationAuthorized: false, customerMutationAuthorized: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false } };
const gameOffer = { "@context": "https://www.w3.org/ns/activitystreams", id: "urn:offer:game", type: "Offer", actor: gameLot.consumer, object: gameLot, attachment: [gameQuote] };

test("game-design lots induce analysis-only bids distinct from implementation bids", () => {
  const bid = bidFor(gameOffer);
  assert.equal(bid.object.type, "ImprovementGameDesignBid");
  assert.equal(bid.object.deliveryMode, "game-proposal-only");
  assert.equal(bid.object.implementationAuthorized, false);
  assert.equal(bid.object.oracleAuthorshipAuthorized, false);
});

test("a game proposal retains author provenance and awaits the customer's behavioral assay", async () => {
  const bid = bidFor(gameOffer);
  const award = { id: "urn:award:game", type: "Accept", actor: gameLot.consumer, target: bid.actor, object: { type: "ImprovementGameDesignAward", lot: gameLot.id, bid: bid.id, customerMutationAuthorized: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false } };
  const calls = [];
  const contractInferenceWork = async (input) => {
    calls.push(input);
    return { outcome: "candidate-pending-customer-acceptance", provider: "urn:provider:author", evidence: { selectedOffer: "urn:offer:author" }, candidate: { verdict: "propose-game", reason: "existing oracle found", proposedResidue: { type: "ImprovementResidue", customer: gameLot.consumer } } };
  };
  const delivery = await fulfillGameDesignAward(award, bid, { contractInferenceWork, recordedAt: "2026-07-21T00:00:00.000Z" });
  assert.equal(delivery.type, "Create"); assert.equal(delivery.object.type, "ImprovementGameProposal");
  assert.deepEqual(delivery.attachment, []); assert.equal(delivery.object.resources.author, "urn:provider:author");
  assert.equal(calls.length, 1);
});

test("finite opportunity context that exposes no oracle becomes typed residue without escalation", async () => {
  const bid = bidFor(gameOffer);
  const award = { id: "urn:award:game", type: "Accept", actor: gameLot.consumer, target: bid.actor, object: { type: "ImprovementGameDesignAward", lot: gameLot.id, bid: bid.id, customerMutationAuthorized: false, implementationAuthorized: false, oracleAuthorshipAuthorized: false } };
  const refusal = await fulfillGameDesignAward(award, bid, { contractInferenceWork: async () => ({ outcome: "candidate-pending-customer-acceptance", provider: "urn:provider:author", candidate: { verdict: "insufficient-evidence", reason: "no protected oracle", proposedResidue: null } }) });
  assert.equal(refusal.type, "Reject"); assert.equal(refusal.object.type, "ImprovementGameDesignRefusal"); assert.equal(refusal.object.strongerModelRequested, false);
});
