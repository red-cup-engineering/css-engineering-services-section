import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ACTOR, CONTEXT, bidForBoardOffer } from "../src/improvement-board-forager.mjs";
import { CONTRACT, forageImprovementBoards, memoryForagingLedger, planTerminalInvestmentRedecisions, planTrajectoryInformedActions } from "../src/improvement-board-forager-service.mjs";
import { decideSupplierInvestmentDemand } from "../src/supplier-investment-decision.mjs";
import { extractRmnActivity, projectRmnActivity } from "@red-cup-engineering/activitypub-services-section/rmn-activity";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { decodeRelationalValue } from "@red-cup-engineering/rmn-semantic-conformance/relational-value";
import { relationalRwilDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";

const INCITER = "urn:ame:test-inciter", BOARD = "urn:test:customer-board";
const board = { actor: BOARD, transport: "activitypub", listOperation: "list", submitOperation: "submit", activityPubActor: "https://board.example/actors/board", activityPubOutbox: "https://board.example/actors/board/outbox", activityPubInbox: "https://board.example/actors/board/inbox", a2aAgentCard: "https://board.example/.well-known/agent-card.json", supplierActivityPubActor: "https://supplier.example/actors/free-compute" };
const gapPolicy = { type: "SupplierCapabilityGapFoldbackPolicy", enabled: true, investableCapabilities: ["code-review", "repository-analysis"], founderAudience: { settlement: "561-group", office: "founder" }, investmentDecision: "separate-supplier-local-decision", protectedOracleRequired: true };
const founder = { actor: "urn:ame:561-group:founder-enterprise-formation-demand-service", activityPubActor: "https://founder.example/actors/formation-demand", activityPubInbox: "https://founder.example/actors/formation-demand/inbox", agentCard: "https://founder.example/a2a/formation-demand" };
const supplierInvestmentDemand = {
  type: "SupplierSelfInvestmentDemandPolicy", enabled: true, authoredBy: ACTOR, standingDecision: "publish-provider-neutral-proposal-lot",
  admittedOpportunityTypes: ["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity"],
  maximumProposalConsideration: { amount: 8, unit: "relative-resolution-milliquanta-v1" },
  protectedAcceptanceAssertions: ["exact opportunity", "downward route", "isolated behavioral assay", "atomic schedule rebind", "supplier-local mutation"],
  publicationAuthority: { proposalInquiryOnly: true, spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false, providerSelectionAuthorized: false },
};
const policy = { capabilityGapFoldback: gapPolicy, founderFormationDemandBoundary: founder, supplierInvestmentDemand, boards: [board] };
const record = (body) => ({ id: semanticId(relationalRwilDocument(body)), ...body });
const incitementAt = (sequence) => record({ "@context": CONTEXT, type: "Create", actor: INCITER, target: ACTOR, object: { type: "ImprovementForagerIncitement", evidence: [`urn:evidence:${sequence}`], sequence } });
const incitement = incitementAt(4);
const bytes = (value) => semanticBytes(relationalRwilDocument(value));
const value = (encoded) => { const term = decodeSemantic(encoded); return decodeRelationalValue(term[1], term[2]); };

function offer(number = 4) {
  const lot = record({ type: "SoftwareDevelopmentWorkLot", consumer: BOARD, requestedChanges: ["repair"], ownedTargetRoots: ["src"], sourceDigests: [`sha256:test:${number}`], acceptanceCommands: [{ runner: "node", argv: ["--test", "test/a.test.mjs"] }], productContract: { validationChecks: ["node --test"], prohibitedFields: [] }, boardTerms: { taskClass: "test", territory: "/tmp/customer", requiredCapabilities: ["software-engineering", "json-schema-output"], upwardEscalationAuthorized: false } });
  const quote = record({ type: "ImprovementBuyerQuote", lot: lot.id, sequence: number, consideration: { amount: 9, unit: "relative-resolution-milliquanta-v1" } });
  return record({ "@context": CONTEXT, type: "Offer", actor: BOARD, target: "https://www.w3.org/ns/activitystreams#Public", object: lot, attachment: [quote] });
}

test("only an exact provider-addressed incitement enters the sovereign supplier", async () => {
  const result = await forageImprovementBoards({ ...incitement, target: "urn:foreign" }, { policy, ledger: memoryForagingLedger(), invokeBoard: assert.fail });
  assert.equal(result.type, "Reject"); assert.equal(result.object.contract, CONTRACT);
  const wrongKind = await forageImprovementBoards(record({ ...Object.fromEntries(Object.entries(incitement).filter(([key]) => key !== "id")), object: { type: "IndependentImprovementForagerPulse" } }), { policy, ledger: memoryForagingLedger(), invokeBoard: assert.fail });
  assert.equal(wrongKind.type, "Reject"); assert.equal(wrongKind.object.reason, "exact-provider-addressed-incitement-required");
  const staleIdentity = await forageImprovementBoards({ ...incitement, published: "2026-07-22T00:00:00.000Z" }, { policy, ledger: memoryForagingLedger(), invokeBoard: assert.fail });
  assert.equal(staleIdentity.type, "Reject"); assert.equal(staleIdentity.object.reason, "exact-provider-addressed-incitement-required");
});

test("one supplier incitement bids through the customer boundary and does not replay a completed publication", async () => {
  const submitted = [], ledger = memoryForagingLedger();
  const invokeBoard = async (_board, operation, input) => operation === "list"
    ? { type: "OrderedCollection", actor: BOARD, orderedItems: [offer()] }
    : (submitted.push(input), { type: "Accept", id: "urn:receipt:bid" });
  const first = await forageImprovementBoards(incitement, { policy, ledger, invokeBoard, recordedAt: "2026-07-21T00:00:00.000Z" });
  const replay = await forageImprovementBoards(incitementAt(5), { policy, ledger, invokeBoard, recordedAt: "2026-07-21T00:01:00.000Z" });
  assert.equal(first.type, "Accept"); assert.equal(first.object.outcomes[0].status, "submitted");
  assert.equal(submitted.length, 1); assert.equal(submitted[0].actor, ACTOR); assert.equal(submitted[0].object.type, "ImprovementServiceBid");
  assert.equal(replay.object.outcomes.length, 0);
});

test("awards outrank public offers and produce only a supplier proposal or refusal", async () => {
  const publication = offer(), bid = bidForBoardOffer(publication);
  const award = record({ "@context": CONTEXT, type: "Accept", actor: BOARD, target: ACTOR, object: { type: "ImprovementProposalAward", awardedAtSequence: 4, lot: publication.object.id, quote: publication.attachment[0].id, bid: bid.id, bidSnapshot: bid } });
  const submitted = [];
  const invokeBoard = async (_board, operation, input) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [offer(), award] } : (submitted.push(input), { type: "Accept", id: "urn:receipt:proposal" });
  const refusal = { "@context": CONTEXT, id: "urn:refusal:4", type: "Reject", actor: ACTOR, target: BOARD, object: { type: "ImprovementServiceRefusal", customerMutation: false, strongerModelRequested: false } };
  const result = await forageImprovementBoards(incitement, { policy, ledger: memoryForagingLedger(), invokeBoard, fulfillAward: async () => refusal });
  assert.equal(result.object.outcomes.length, 1); assert.equal(submitted[0], refusal); assert.equal(result.object.outcomes[0].status, "submitted");
});

test("ambiguous award fulfillment remains recoverable under exact replay", async () => {
  const publication = offer(), bid = bidForBoardOffer(publication);
  const award = { "@context": CONTEXT, id: "urn:award:terminal", type: "Accept", actor: BOARD, target: ACTOR, object: { type: "ImprovementProposalAward", awardedAtSequence: 4, lot: publication.object.id, quote: publication.attachment[0].id, bid: bid.id, bidSnapshot: bid } };
  const ledger = memoryForagingLedger();
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [award] } : ({ type: "Accept", id: "urn:receipt:recovered-proposal" });
  let calls = 0; const seen = [];
  const fulfillAward = async (seenAward, seenBid) => { calls += 1; seen.push([seenAward.id, seenBid.id]); if (calls === 1) throw new Error("implementation provider response unavailable"); return record({ "@context": CONTEXT, type: "Reject", actor: ACTOR, target: BOARD, inReplyTo: award.id, object: { type: "ImprovementServiceRefusal", customerMutation: false } }); };
  const result = await forageImprovementBoards(incitement, { policy, ledger, invokeBoard, fulfillAward });
  assert.equal(result.object.outcomes[0].status, "recovery-required");
  assert.equal(ledger.read().some((row) => row.type === "ImprovementAwardFulfillmentIntent"), true);
  const replay = await forageImprovementBoards(incitementAt(5), { policy, ledger, invokeBoard, fulfillAward });
  assert.equal(replay.object.outcomes[0].status, "submitted"); assert.equal(calls, 2); assert.deepEqual(seen[0], seen[1]);
});

test("an ambiguous ActivityPub submission reuses the exact outbound object", async () => {
  const ledger = memoryForagingLedger(), submitted = []; let attempt = 0;
  const invokeBoard = async (_board, operation, input) => {
    if (operation === "list") return { type: "OrderedCollection", actor: BOARD, orderedItems: [offer()] };
    submitted.push(input); attempt += 1; if (attempt === 1) throw new Error("delivery response unavailable");
    return { type: "Accept", id: "urn:receipt:reconciled-bid" };
  };
  const first = await forageImprovementBoards(incitement, { policy, ledger, invokeBoard });
  assert.equal(first.object.outcomes[0].status, "recovery-required");
  const second = await forageImprovementBoards(incitementAt(5), { policy, ledger, invokeBoard });
  assert.equal(second.object.outcomes[0].status, "submitted"); assert.equal(submitted.length, 2); assert.equal(submitted[0].id, submitted[1].id); assert.deepEqual(submitted[0], submitted[1]);
  assert.equal(ledger.read().filter((row) => row.type === "ImprovementForagingOutboundIntent").length, 1);
});

test("the foraging lock admits one overlapping award fulfillment", async () => {
  const publication = offer(), bid = bidForBoardOffer(publication);
  const award = { "@context": CONTEXT, id: "urn:award:overlap", type: "Accept", actor: BOARD, target: ACTOR, object: { type: "ImprovementProposalAward", awardedAtSequence: 4, lot: publication.object.id, quote: publication.attachment[0].id, bid: bid.id, bidSnapshot: bid } };
  const ledger = memoryForagingLedger(); let fulfillCalls = 0, release, started;
  const waiting = new Promise((accept) => { release = accept; }), entered = new Promise((accept) => { started = accept; });
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [award] } : ({ type: "Accept", id: "urn:receipt:overlap" });
  const options = { policy, ledger, invokeBoard, foragingLockPath: join(mkdtempSync(join(tmpdir(), "foraging-lock-test-")), "foraging.lock"), fulfillAward: async () => { fulfillCalls += 1; started(); await waiting; return record({ "@context": CONTEXT, type: "Reject", actor: ACTOR, target: BOARD, inReplyTo: award.id, object: { type: "ImprovementServiceRefusal", customerMutation: false } }); } };
  const first = forageImprovementBoards(incitement, options); await entered;
  const second = await forageImprovementBoards(incitementAt(5), options);
  assert.equal(second.type, "Reject"); assert.equal(second.object.reason, "supplier-foraging-admission-busy");
  release(); assert.equal((await first).type, "Accept"); assert.equal(fulfillCalls, 1);
});

test("customer acceptance foldback trains supplier trajectory memory without a new bid", async () => {
  const decision = { "@context": CONTEXT, id: "urn:decision-activity:4", type: "Accept", actor: BOARD, target: ACTOR, object: { id: "urn:decision:4", type: "ImprovementCustomerDecision", accepted: true, decidedAtSequence: 4 } };
  const ledger = memoryForagingLedger(), admitted = [];
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [decision] } : assert.fail("foldback does not cross customer ingress again");
  const admitFoldback = async (activity, options) => { admitted.push({ activity, options }); return { status: "admitted", record: { id: "urn:trajectory-foldback:4" } }; };
  const first = await forageImprovementBoards(incitement, { policy, ledger, invokeBoard, admitFoldback });
  const replay = await forageImprovementBoards(incitementAt(5), { policy, ledger, invokeBoard, admitFoldback });
  assert.equal(first.object.outcomes[0].status, "foldback-admitted"); assert.equal(admitted.length, 1); assert.equal(admitted[0].options.expectedCustomer, BOARD);
  assert.equal(replay.object.outcomes.length, 0);
});

test("an ambiguous trajectory foldback remains recoverable under one intent", async () => {
  const decision = { "@context": CONTEXT, id: "urn:decision-activity:ambiguous", type: "Accept", actor: BOARD, target: ACTOR, object: { id: "urn:decision:ambiguous", type: "ImprovementCustomerDecision", accepted: true, decidedAtSequence: 4 } };
  const ledger = memoryForagingLedger(), seen = []; let calls = 0;
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [decision] } : assert.fail("foldback does not use the submission face");
  const admitFoldback = async (input) => { seen.push(input.id); calls += 1; if (calls === 1) throw new Error("foldback response unavailable"); return { status: "admitted", record: { id: "urn:trajectory-foldback:ambiguous" } }; };
  const first = await forageImprovementBoards(incitement, { policy, ledger, invokeBoard, admitFoldback });
  const second = await forageImprovementBoards(incitementAt(5), { policy, ledger, invokeBoard, admitFoldback });
  assert.equal(first.object.outcomes[0].status, "recovery-required"); assert.equal(second.object.outcomes[0].status, "foldback-admitted");
  assert.deepEqual(seen, [decision.id, decision.id]); assert.equal(ledger.read().filter((row) => row.type === "CustomerTrajectoryFoldbackIntent").length, 1);
});

test("a public customer capability gap induces one provider-neutral supplier investment lot", async () => {
  const object = record({ type: "ImprovementMarketCapabilityGap", contract: `ni:///sha-256;${"A".repeat(43)}`, customer: BOARD, lot: "urn:lot:gap", observedAtSequence: 9, considerationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities: ["software-engineering", "repository-analysis"], disposition: "publish-gap-and-keep-lot-open", strongerModelAuthorized: false });
  const gap = record({ "@context": CONTEXT, type: "Create", actor: BOARD, target: "https://www.w3.org/ns/activitystreams#Public", inReplyTo: "urn:pulse", object });
  const ledger = memoryForagingLedger();
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [gap] } : assert.fail("gap foldback remains supplier-local");
  const result = await forageImprovementBoards(incitementAt(9), { policy, ledger, invokeBoard, recordedAt: "2026-07-21T21:00:00.000Z" });
  assert.equal(result.object.outcomes[0].status, "supplier-investment-published");
  assert.equal(result.object.outcomes[0].detail.signalType, "SupplierCapabilityInvestmentOpportunity");
  assert.equal(ledger.read().some((row) => row.type === "SupplierCapabilityInvestmentOpportunity"), true);
  const publication = ledger.read().find((row) => row.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot");
  assert.equal(publication.actor, ACTOR); assert.equal(publication.object.providerNeutral, true); assert.equal(publication.object.terms.strongerModelAuthorized, false);
  assert.equal(ledger.read().filter((row) => row.type === "SupplierInvestmentDemandDecision").length, 1);
});

test("repeated trajectory residue autonomously publishes one knowledge-versioned successor lot", async () => {
  const executionPolicy = {
    type: "SupplierSelfImprovementExecutionPolicy", enabled: true,
    recipes: { "code-review": { type: "SupplierCapabilityImplementationRecipe" } },
  };
  const trajectoryPolicy = { ...policy, supplierSelfImprovementExecution: executionPolicy };
  const opportunity = record({
    type: "SupplierCapabilityInvestmentOpportunity", supplier: ACTOR, sourceActivity: "urn:activity:trajectory-gap", sourceGap: "urn:gap:trajectory",
    customer: BOARD, lot: "urn:lot:trajectory-customer", observedAtSequence: 9, customerConsiderationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" },
    requiredCapabilities: ["code-review"], missingCapabilities: ["code-review"], recordedAt: "2026-07-21T21:00:00.000Z",
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false, reason: "missing adjacent capability",
    protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: "separate-supplier-local-decision",
    investableCapabilities: ["code-review"], automaticImplementationAuthorized: false, providerOrModelSelected: false,
  });
  const predecessor = decideSupplierInvestmentDemand(opportunity, supplierInvestmentDemand);
  const attempt = record({
    type: "SupplierSelfImprovementAttemptResidue", supplier: ACTOR, lot: predecessor.publication.object.id, publication: predecessor.publication.id,
    attemptedAtSequence: 10, attemptedAt: "2026-07-21T21:01:00.000Z", disposition: "terminal", reason: "candidate-refused-by-schema-assay",
    strongerModelRequested: false, customerMutation: false,
  });
  const knowledge = {
    type: "SoftwareTrajectoryResidueKnowledge", objective: predecessor.publication.object.objective,
    dominantRefusal: "candidate-refused-by-schema-assay", occurrences: 7, providers: ["urn:provider:cheap"],
    schemaAssays: ["ni:///sha-256;assay"], problems: [], reasons: [], witnesses: ["urn:trajectory:1", "urn:trajectory:2"],
    strategy: "induce-deterministic-validator-or-translator", requiredCapability: "deterministic-inference-carrier-projection", modelEscalationAllowed: false,
    capabilityFormationRequired: true, nextAct: "advertise-capability-formation-demand",
  };
  const rows = [opportunity, predecessor.publication, predecessor.decision, attempt];
  const recalled = new Map([["supplier-capability-code-review", [knowledge]]]);
  const planned = planTrajectoryInformedActions(rows, recalled, trajectoryPolicy, "2026-07-21T21:02:00.000Z");
  assert.equal(planned.length, 1);
  assert.equal(planned[0].kind, "formation");
  assert.deepEqual(planned[0].signal.missingCapabilities, ["deterministic-inference-carrier-projection"]);
  assert.equal(planned[0].signal.receiverNecessityClaimed, false);
  assert.equal(planned[0].signal.formationProviderPreselected, false);

  const ledger = memoryForagingLedger(rows);
  const invokeBoard = async () => ({ type: "OrderedCollection", actor: BOARD, orderedItems: [] });
  const foragingLockPath = join(mkdtempSync(join(tmpdir(), "trajectory-foraging-lock-test-")), "foraging.lock");
  const first = await forageImprovementBoards(incitementAt(11), {
    policy: trajectoryPolicy, ledger, invokeBoard,
    recallTrajectories: async (objective, taskClass) => {
      assert.equal(objective, predecessor.publication.object.objective);
      assert.equal(taskClass, "supplier-capability-code-review");
      return [knowledge];
    },
    settleSelfImprovement: async () => null,
    deliverFounderLead: async (_boundary, signal) => ({ activity: { id: `${signal.id}:activity` }, receipt: { id: `${signal.id}:receipt` } }),
    foragingLockPath,
    recordedAt: "2026-07-21T21:02:00.000Z",
  });
  assert.equal(first.object.outcomes[0].status, "trajectory-informed-founder-lead-delivered");
  const second = await forageImprovementBoards(incitementAt(12), {
    policy: trajectoryPolicy, ledger, invokeBoard,
    recallTrajectories: async () => [knowledge],
    settleSelfImprovement: async () => null,
    deliverFounderLead: async () => assert.fail("unchanged trajectory knowledge is not redelivered"),
    foragingLockPath,
    recordedAt: "2026-07-21T21:03:00.000Z",
  });
  assert.equal(second.object.outcomes.some((outcome) => outcome.status.startsWith("trajectory-informed-")), false);
  const revisedKnowledge = { ...knowledge, occurrences: knowledge.occurrences + 1, witnesses: [...knowledge.witnesses, "urn:trajectory:3"] };
  assert.equal(
    planTrajectoryInformedActions(ledger.read(), new Map([["supplier-capability-code-review", [revisedKnowledge]]]), trajectoryPolicy, "2026-07-21T21:04:00.000Z").length,
    0,
    "a mutable occurrence revision does not reincarnate an already delivered capability-formation demand",
  );
  const laterAttempt = record({ ...Object.fromEntries(Object.entries(attempt).filter(([key]) => key !== "id")), attemptedAtSequence: 13, attemptedAt: "2026-07-21T21:04:30.000Z" });
  assert.equal(
    planTrajectoryInformedActions([...ledger.read(), laterAttempt], new Map([["supplier-capability-code-review", [revisedKnowledge]]]), trajectoryPolicy, "2026-07-21T21:05:00.000Z").length,
    0,
    "another terminal attempt is another witness for the existing capability demand, not a new product demand",
  );
  assert.equal(ledger.read().filter((row) => row?.type === "FounderEnterpriseFormationMarketLead" && row.sourceTrajectoryKnowledge).length, 1);
  assert.equal(ledger.read().filter((row) => row?.type === "SupplierTrajectoryFormationLeadDelivery").length, 1);
});

test("a changed supplier policy issues one new lot after terminal evidence without retrying the old lot", async () => {
  const opportunity = record({
    type: "SupplierCapabilityInvestmentOpportunity", supplier: ACTOR, sourceActivity: "urn:activity:terminal-gap", sourceGap: "urn:gap:terminal",
    customer: BOARD, lot: "urn:lot:customer", observedAtSequence: 9, customerConsiderationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" },
    requiredCapabilities: ["software-engineering", "code-review"], missingCapabilities: ["code-review"], recordedAt: "2026-07-21T21:00:00.000Z",
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false,
    reason: "missing adjacent capability", protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: "separate-supplier-local-decision",
    investableCapabilities: ["code-review"], automaticImplementationAuthorized: false, providerOrModelSelected: false,
  });
  const old = decideSupplierInvestmentDemand(opportunity, supplierInvestmentDemand);
  const attempt = record({ type: "SupplierSelfImprovementAttemptResidue", supplier: ACTOR, lot: old.publication.object.id, publication: old.publication.id, attemptedAtSequence: 10, attemptedAt: "2026-07-21T21:01:00.000Z", disposition: "terminal", reason: "provider refused", strongerModelRequested: false, customerMutation: false });
  const changed = { ...supplierInvestmentDemand, maximumProposalConsideration: { amount: 31, unit: "relative-resolution-milliquanta-v1" } };
  const rows = [opportunity, old.decision, old.publication, attempt];
  const planned = planTerminalInvestmentRedecisions(rows, changed, "2026-07-21T21:02:00.000Z");
  assert.equal(planned.length, 1); assert.notEqual(planned[0].publication.object.id, old.publication.object.id);
  assert.equal(planned[0].publication.object.maximumProposalConsideration.amount, 31); assert.equal(planned[0].publication.object.openedAt, old.decision.decidedAt);
  assert.equal(planned[0].evidence.predecessorLot, old.publication.object.id); assert.equal(planned[0].evidence.exactLotRetried, false);
  const afterPublicationCrash = planTerminalInvestmentRedecisions([...rows, planned[0].publication], changed, "2026-07-21T21:03:00.000Z");
  assert.equal(afterPublicationCrash.length, 1); assert.equal(afterPublicationCrash[0].publication.id, planned[0].publication.id); assert.equal(afterPublicationCrash[0].publication.object.id, planned[0].publication.object.id);
  const afterDecisionCrash = planTerminalInvestmentRedecisions([...rows, planned[0].publication, planned[0].decision], changed, "2026-07-21T21:03:30.000Z");
  assert.equal(afterDecisionCrash.length, 1); assert.equal(afterDecisionCrash[0].evidence.id, planned[0].evidence.id); assert.equal(afterDecisionCrash[0].decision.id, planned[0].decision.id);
  assert.deepEqual(planTerminalInvestmentRedecisions([...rows, planned[0].publication, planned[0].decision, planned[0].evidence], changed, "2026-07-21T21:03:00.000Z"), []);
  const thirdPolicy = { ...supplierInvestmentDemand, maximumProposalConsideration: { amount: 30, unit: "relative-resolution-milliquanta-v1" } };
  assert.deepEqual(planTerminalInvestmentRedecisions([...rows, planned[0].publication, planned[0].decision, planned[0].evidence], thirdPolicy, "2026-07-21T21:03:30.000Z"), []);
  assert.deepEqual(planTerminalInvestmentRedecisions(rows, supplierInvestmentDemand, "2026-07-21T21:03:00.000Z"), []);
  const settlement = record({ type: "SupplierSelfImprovementSettlement", supplier: ACTOR, lot: old.publication.object.id });
  assert.deepEqual(planTerminalInvestmentRedecisions([...rows, settlement], changed, "2026-07-21T21:03:00.000Z"), []);

  const ledger = memoryForagingLedger([...rows, planned[0].publication]), changedPolicy = { ...policy, supplierInvestmentDemand: changed };
  const invokeBoard = async () => ({ type: "OrderedCollection", actor: BOARD, orderedItems: [] });
  const first = await forageImprovementBoards(incitementAt(13), { policy: changedPolicy, ledger, invokeBoard, recordedAt: "2026-07-21T21:04:00.000Z" });
  assert.equal(first.object.outcomes[0].status, "supplier-investment-reissued-after-terminal-policy-change");
  const second = await forageImprovementBoards(incitementAt(14), { policy: changedPolicy, ledger, invokeBoard, recordedAt: "2026-07-21T21:05:00.000Z" });
  assert.equal(second.object.outcomes.some((outcome) => outcome.status === "supplier-investment-reissued-after-terminal-policy-change"), false);
  assert.equal(ledger.read().filter((row) => row.id === planned[0].publication.id).length, 1);
  assert.equal(ledger.read().filter((row) => row.type === "SupplierInvestmentPolicyRedecision").length, 1);
  assert.equal(ledger.read().filter((row) => row.type === "ImprovementForagingDisposition").every((row) => row.id === record(Object.fromEntries(Object.entries(row).filter(([key]) => key !== "id"))).id), true);
});

test("policy redecisions do not impose a fixed activity allowance on independent customer work", async () => {
  const opportunity = (suffix) => record({
    type: "SupplierCapabilityInvestmentOpportunity", supplier: ACTOR, sourceActivity: `urn:activity:${suffix}`, sourceGap: `urn:gap:${suffix}`, customer: BOARD, lot: `urn:lot:${suffix}`,
    observedAtSequence: 9, customerConsiderationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities: ["software-engineering", "code-review"], missingCapabilities: ["code-review"], recordedAt: `2026-07-21T21:0${suffix}:00.000Z`,
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false, reason: "missing adjacent capability", protectedOracleRequired: true, investmentDecisionRequired: true,
    investmentDecision: "separate-supplier-local-decision", investableCapabilities: ["code-review"], automaticImplementationAuthorized: false, providerOrModelSelected: false,
  });
  const firstOpportunity = opportunity(1), secondOpportunity = opportunity(2);
  const first = decideSupplierInvestmentDemand(firstOpportunity, supplierInvestmentDemand), second = decideSupplierInvestmentDemand(secondOpportunity, supplierInvestmentDemand);
  const attempt = (decided, suffix) => record({ type: "SupplierSelfImprovementAttemptResidue", supplier: ACTOR, lot: decided.publication.object.id, publication: decided.publication.id, attemptedAtSequence: 10, attemptedAt: `2026-07-21T21:1${suffix}:00.000Z`, disposition: "terminal", reason: "provider refused", strongerModelRequested: false, customerMutation: false });
  const rows = [firstOpportunity, first.decision, first.publication, attempt(first, 1), secondOpportunity, second.decision, second.publication, attempt(second, 2)];
  const secondOffer = offer(5);
  const changed = { ...supplierInvestmentDemand, maximumProposalConsideration: { amount: 31, unit: "relative-resolution-milliquanta-v1" } };
  const changedPolicy = { ...policy, supplierInvestmentDemand: changed };
  const submitted = [];
  const invokeBoard = async (_board, operation, input) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [offer(), secondOffer] } : (submitted.push(input), { type: "Accept", id: `urn:receipt:${submitted.length}` });
  const result = await forageImprovementBoards(incitementAt(15), { policy: changedPolicy, ledger: memoryForagingLedger(rows), invokeBoard, recordedAt: "2026-07-21T21:15:00.000Z" });
  assert.equal(result.object.outcomes.filter((outcome) => outcome.status === "supplier-investment-reissued-after-terminal-policy-change").length, 2);
  assert.equal(result.object.outcomes.filter((outcome) => outcome.board === BOARD && outcome.status === "submitted").length, 2);
  assert.equal(submitted.length, 2);
});

test("a non-adjacent capability gap crosses the explicit founder treaty and remains only a market lead", async () => {
  const object = record({ type: "ImprovementMarketCapabilityGap", contract: `ni:///sha-256;${"A".repeat(43)}`, customer: BOARD, lot: "urn:lot:founder-gap", observedAtSequence: 10, considerationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities: ["wafer-fabrication"], disposition: "publish-gap-and-keep-lot-open", strongerModelAuthorized: false });
  const gap = record({ "@context": CONTEXT, type: "Create", actor: BOARD, target: "https://www.w3.org/ns/activitystreams#Public", object });
  const ledger = memoryForagingLedger(), delivered = [];
  const invokeBoard = async (_board, operation) => operation === "list" ? { type: "OrderedCollection", actor: BOARD, orderedItems: [gap] } : assert.fail("founder lead does not return through customer ingress");
  const result = await forageImprovementBoards(incitementAt(10), { policy, ledger, invokeBoard, deliverFounderLead: async (boundary, signal) => { delivered.push({ boundary, signal }); return { activity: { id: "urn:activity:founder-lead" }, receipt: { id: "urn:receipt:founder" } }; }, recordedAt: "2026-07-21T21:10:00.000Z" });
  assert.equal(result.object.outcomes[0].status, "founder-lead-delivered"); assert.equal(delivered.length, 1); assert.equal(delivered[0].boundary, founder);
  assert.equal(delivered[0].signal.type, "FounderEnterpriseFormationMarketLead"); assert.equal(delivered[0].signal.enterpriseFormationAuthorized, false); assert.equal(delivered[0].signal.receiverNecessityClaimed, false);
});

test("an ambiguous founder delivery replays the exact formation lead", async () => {
  const object = record({ type: "ImprovementMarketCapabilityGap", contract: `ni:///sha-256;${"A".repeat(43)}`, customer: BOARD, lot: "urn:lot:retry-founder-gap", observedAtSequence: 11, considerationCeiling: { amount: 31, unit: "relative-resolution-milliquanta-v1" }, requiredCapabilities: ["chip-packaging"], disposition: "publish-gap-and-keep-lot-open", strongerModelAuthorized: false });
  const gap = record({ "@context": CONTEXT, type: "Create", actor: BOARD, target: "https://www.w3.org/ns/activitystreams#Public", object });
  const ledger = memoryForagingLedger(), ids = [], invokeBoard = async () => ({ type: "OrderedCollection", actor: BOARD, orderedItems: [gap] }); let attempt = 0;
  const deliverFounderLead = async (_boundary, signal) => { ids.push(signal.id); attempt += 1; if (attempt === 1) throw new Error("founder unavailable"); return { activity: { id: "urn:activity:retry" }, receipt: { id: "urn:receipt:retry" } }; };
  const first = await forageImprovementBoards(incitementAt(11), { policy, ledger, invokeBoard, deliverFounderLead, recordedAt: "2026-07-21T21:11:00.000Z" });
  const second = await forageImprovementBoards(incitementAt(12), { policy, ledger, invokeBoard, deliverFounderLead, recordedAt: "2026-07-21T21:12:00.000Z" });
  assert.equal(first.object.outcomes[0].status, "recovery-required"); assert.equal(second.object.outcomes[0].status, "founder-lead-delivered"); assert.equal(ids.length, 2); assert.equal(ids[0], ids[1]);
  assert.equal(ledger.read().filter((row) => row.type === "FounderEnterpriseFormationMarketLead").length, 1);
  assert.equal(ledger.read().filter((row) => row.type === "FounderFormationLeadOutboundIntent").length, 1);
});

test("one incitement discovers and bids through the configured ActivityPub treaty", async () => {
  const sender = { actor: ACTOR, origin: "https://supplier.example/", identifier: "free-compute", agentCard: "https://supplier.example/.well-known/agent-card.json", keyPath: "/injected" };
  const envelope = projectRmnActivity({ type: offer().type, objectBytes: bytes(offer()), agentCard: board.a2aAgentCard, origin: "https://board.example/", identifier: "board", recipient: "https://www.w3.org/ns/activitystreams#Public" });
  const fetcher = async (url) => ({ ok: true, json: async () => url === board.activityPubOutbox ? { type: "OrderedCollection", first: `${url}?page=true` } : { type: "OrderedCollectionPage", orderedItems: [envelope] } });
  const delivered = [];
  const result = await forageImprovementBoards(incitement, { policy, ledger: memoryForagingLedger(), activityPub: { sender, fetcher, deliver: async (activity) => (delivered.push(activity), { type: "Accept", object: { type: "ActivityPubDeliveryReceipt" } }) } });
  assert.equal(result.object.outcomes[0].status, "submitted"); assert.equal(delivered.length, 1);
  const projection = extractRmnActivity(delivered[0], { expectedActor: "https://supplier.example/actors/free-compute", expectedRecipient: board.activityPubActor, expectedAgentCard: sender.agentCard });
  const bid = value(projection.objectBytes);
  assert.equal(bid.object.type, "ImprovementServiceBid"); assert.equal(bid.object.resourceObservation.type, "SupplierResourcePressureObservation");
});

test("a customer package import cannot masquerade as an inter-enterprise treaty", async () => {
  const legacy = { ...board, packageRoot: "/customer", nodeId: "board", contract: "board/v1" };
  await assert.rejects(forageImprovementBoards(incitement, { policy: { ...policy, boards: [legacy] }, ledger: memoryForagingLedger(), invokeBoard: assert.fail }), /cannot import a customer package boundary/u);
});
