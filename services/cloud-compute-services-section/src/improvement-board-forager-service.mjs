import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { compileRmlLaw } from "@red-cup-engineering/rmn-semantic-conformance/law";
import { createSettlementStore, querySettlementRecords, relationalRwilDocument } from "@lenticule-science/rwil-rdf-projection-service/client";
import { ACTOR, CONTEXT, DEFAULT_FORAGER_POLICY, bidForBoardOffer, fulfillBoardAward, qualifiedBoardOfferKind } from "./improvement-board-forager.mjs";
import { admitCustomerTrajectoryFoldback, recallSoftwareTrajectories } from "@red-cup-engineering/software-trajectory-memory-service/client";
import { invokeActivityPubBoardOperation } from "./activitypub-board-client.mjs";
import { foldCapabilityGap, foldTrajectoryKnowledge } from "./capability-gap-foldback.mjs";
import { deliverFounderFormationLead } from "./activitypub-founder-client.mjs";
import { decideSupplierInvestmentDemand } from "./supplier-investment-decision.mjs";
import { settleNextSupplierSelfImprovement } from "./supplier-self-improvement.mjs";
import { withSupplierSettlementLock } from "./supplier-settlement-lock.mjs";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const FORAGING_LAW = compileRmlLaw(readFileSync(new URL("../content/contracts/improvement-board-foraging.rml", import.meta.url), "utf8"));
export const CONTRACT = FORAGING_LAW.id;
export const CATEGORY = "cloud-compute-services-section.improvement-board-foraging";
const INVESTMENT_OPPORTUNITIES = new Set(["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity"]);
const SELF_IMPROVEMENT_TERMINALS = new Set(["SupplierSelfImprovementAttemptResidue", "SupplierSelfImprovementSettlement"]);
function rmnId(value) { return semanticId(relationalRwilDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }

export function planTerminalInvestmentRedecisions(rows, currentPolicy, decidedAt) {
  if (!Array.isArray(rows) || typeof decidedAt !== "string" || !Number.isFinite(Date.parse(decidedAt))) throw new Error("terminal investment re-decision requires exact rows and instant");
  const currentPolicyId = rmnId(currentPolicy);
  const decisions = rows.filter((row) => row?.type === "SupplierInvestmentDemandDecision" && row.disposition === "published");
  const publications = new Map(rows.filter((row) => row?.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot").map((row) => [row.id, row]));
  const attempts = new Set(rows.filter((row) => row?.type === "SupplierSelfImprovementAttemptResidue").map((row) => row.lot));
  const settlements = new Set(rows.filter((row) => row?.type === "SupplierSelfImprovementSettlement").map((row) => row.lot));
  const terminalLots = new Set(rows.filter((row) => SELF_IMPROVEMENT_TERMINALS.has(row?.type)).map((row) => row.lot));
  const planned = [];
  const opportunities = rows.filter((row) => INVESTMENT_OPPORTUNITIES.has(row?.type)).sort((left, right) => left.id.localeCompare(right.id));
  for (const opportunity of opportunities) {
    const prior = decisions.filter((decision) => decision.sourceOpportunity === opportunity.id)
      .filter((decision) => publications.get(decision.publication)?.object?.id === decision.lot)
      .sort((left, right) => String(left.decidedAt).localeCompare(String(right.decidedAt)) || left.id.localeCompare(right.id));
    if (prior.length === 0 || prior.some((decision) => settlements.has(decision.lot))) continue;
    const currentDecision = prior.findLast((decision) => decision.policy === currentPolicyId);
    if (currentDecision) {
      const publication = publications.get(currentDecision.publication);
      const predecessor = prior.find((decision) => decision.id === publication.object.predecessorDecision);
      if (!predecessor || !attempts.has(predecessor.lot)) continue;
      const evidence = record({
        type: "SupplierInvestmentPolicyRedecision", supplier: ACTOR, sourceOpportunity: opportunity.id,
        predecessorDecision: predecessor.id, predecessorLot: predecessor.lot,
        successorDecision: currentDecision.id, successorLot: publication.object.id,
        policy: currentPolicyId, decidedAt: currentDecision.decidedAt, exactLotRetried: false, customerMutation: false,
      });
      if (!rows.some((row) => row?.id === evidence.id)) planned.push(Object.freeze({ opportunity, predecessor, publication, decision: currentDecision, evidence }));
      continue;
    }
    const predecessor = prior.at(-1);
    if (!attempts.has(predecessor.lot)) continue;
    const decided = decideSupplierInvestmentDemand(opportunity, currentPolicy, decidedAt, { identityOpenedAt: predecessor.decidedAt, predecessorDecision: predecessor.id });
    if (!decided.publication || decided.decision.disposition !== "published" || terminalLots.has(decided.publication.object.id)) continue;
    const evidence = record({
      type: "SupplierInvestmentPolicyRedecision", supplier: ACTOR, sourceOpportunity: opportunity.id,
      predecessorDecision: predecessor.id, predecessorLot: predecessor.lot,
      successorDecision: decided.decision.id, successorLot: decided.publication.object.id,
      policy: currentPolicyId, decidedAt, exactLotRetried: false, customerMutation: false,
    });
    planned.push(Object.freeze({ opportunity, predecessor, ...decided, evidence }));
  }
  return Object.freeze(planned);
}

export function planTrajectoryInformedActions(rows, recalledByTaskClass, policy, recordedAt) {
  if (!Array.isArray(rows) || !(recalledByTaskClass instanceof Map) || typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))) throw new Error("trajectory-informed investment planning requires exact rows, recalls, and instant");
  const recipes = policy?.supplierSelfImprovementExecution?.recipes;
  if (policy?.supplierSelfImprovementExecution?.enabled !== true || !recipes || Object.getPrototypeOf(recipes) !== Object.prototype) return [];
  const publications = new Map(rows.filter((row) => row?.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot").map((row) => [row.id, row]));
  const signals = rows.filter((row) => ["SupplierCapabilityInvestmentOpportunity", "FounderEnterpriseFormationMarketLead"].includes(row?.type) && typeof row.sourceTrajectoryKnowledge === "string");
  const stableFormationKey = (capabilities) => [...new Set(capabilities)].sort().join("\u0000");
  const existingKnowledge = new Map(signals.map((row) => [stableFormationKey(row.missingCapabilities), row]));
  const signalsById = new Map(signals.map((row) => [row.id, row]));
  const deliveredFormationKeys = new Set(rows
    .filter((row) => row?.type === "SupplierTrajectoryFormationLeadDelivery")
    .map((row) => signalsById.get(row.signal))
    .filter(Boolean)
    .map((row) => stableFormationKey(row.missingCapabilities)));
  const attempts = rows.filter((row) => row?.type === "SupplierSelfImprovementAttemptResidue" && row.disposition === "terminal")
    .sort((left, right) => String(left.attemptedAt).localeCompare(String(right.attemptedAt)) || left.id.localeCompare(right.id));
  const planned = [];
  for (const attempt of attempts) {
    const publication = publications.get(attempt.publication);
    const capabilities = publication?.object?.requestedCapabilities;
    if (!Array.isArray(capabilities) || capabilities.length < 1 || capabilities.some((capability) => !recipes[capability])) continue;
    const taskClasses = capabilities.map((capability) => `supplier-capability-${capability}`);
    for (const taskClass of taskClasses) {
      const recalled = recalledByTaskClass.get(taskClass);
      if (!Array.isArray(recalled)) continue;
      for (const knowledge of recalled.filter((item) => item?.type === "SoftwareTrajectoryResidueKnowledge" && item.capabilityFormationRequired === true && item.nextAct === "advertise-capability-formation-demand")) {
        const key = stableFormationKey([knowledge.requiredCapability]);
        const prior = existingKnowledge.get(key);
        if (prior) {
          if (prior.type === "FounderEnterpriseFormationMarketLead" && !deliveredFormationKeys.has(key)) planned.push(Object.freeze({ kind: "formation", attempt, knowledge, signal: prior, isNew: false }));
          continue;
        }
        const signal = foldTrajectoryKnowledge(attempt, publication, knowledge, {
          policy: policy.capabilityGapFoldback, investmentPolicy: policy.supplierInvestmentDemand,
          recipes, recordedAt,
        });
        if (signal.type === "SupplierCapabilityInvestmentOpportunity") {
          const decided = decideSupplierInvestmentDemand(signal, policy.supplierInvestmentDemand, recordedAt);
          if (decided.publication) planned.push(Object.freeze({ kind: "investment", attempt, knowledge, signal, isNew: true, ...decided }));
        } else if (signal.type === "FounderEnterpriseFormationMarketLead") planned.push(Object.freeze({ kind: "formation", attempt, knowledge, signal, isNew: true }));
        existingKnowledge.set(key, signal);
      }
    }
  }
  return Object.freeze(planned);
}

function validateForagingPolicy(policy) {
  if (!policy || !Array.isArray(policy.boards) || policy.boards.length < 1) throw new Error("foraging policy requires at least one explicit customer treaty");
  for (const board of policy.boards) {
    const required = ["actor", "activityPubActor", "activityPubOutbox", "activityPubInbox", "a2aAgentCard", "supplierActivityPubActor", "listOperation", "submitOperation"];
    if (board?.transport !== "activitypub" || required.some((field) => typeof board[field] !== "string" || !board[field])) throw new Error("every improvement-board treaty must use the standard ActivityPub face and name its A2A Agent Card");
    if (["packageRoot", "nodeId", "contract"].some((field) => Object.hasOwn(board, field))) throw new Error("an inter-enterprise treaty cannot import a customer package boundary");
  }
  const founder = policy.founderFormationDemandBoundary;
  const validHttps = (value) => { try { return new URL(value).protocol === "https:"; } catch { return false; } };
  if (typeof founder?.actor !== "string" || !founder.actor || !validHttps(founder.activityPubActor) || typeof founder.activityPubInbox !== "string" || !founder.activityPubInbox || !validHttps(founder.agentCard)) throw new Error("foraging policy must name one founder-owned semantic actor, HTTPS ActivityPub actor, inbox, and Agent Card");
  return policy;
}
export function loadForagingPolicy(path = new URL("../content/policies/improvement-board-foraging.json", import.meta.url)) { return validateForagingPolicy(JSON.parse(readFileSync(path, "utf8"))); }

function incitementProblem(activity) {
  if (!exact(activity) || activity?.["@context"] !== CONTEXT || activity.type !== "Create" || typeof activity.actor !== "string" || activity.target !== ACTOR || activity.object?.type !== "ImprovementForagerIncitement") return "exact-provider-addressed-incitement-required";
  return null;
}

export async function foragingReadLedger(options = {}) {
  const dataRoot = resolve(options.dataRoot ?? process.env.CLOUD_COMPUTE_DATA_ROOT ?? new URL("../data", import.meta.url).pathname);
  const rows = await querySettlementRecords(CATEGORY);
  return Object.freeze({ read: () => [...rows] });
}

export function foragingLedger(options = {}) {
  const dataRoot = resolve(options.dataRoot ?? process.env.CLOUD_COMPUTE_DATA_ROOT ?? new URL("../data", import.meta.url).pathname);
  const rows = foragingReadLedger({ dataRoot }).read();
  const settlement = createSettlementStore({
    settlementRoot: ROOT,
    agentUrl: options.rwilAgentUrl ?? process.env.RWIL_RDF_AGENT,
    caip2: options.caip2 ?? process.env.SETTLEMENT_CAIP2,
  });
  return Object.freeze({
    read: () => [...rows],
    append: async (value, at) => {
      const recorded = await settlement.record({ category: CATEGORY, recordedAt: at, record: value, signal: options.signal });
      if (!rows.some((row) => row?.id === value?.id)) rows.push(value);
      return recorded;
    },
  });
}

export function memoryForagingLedger(seed = []) {
  const rows = [...seed];
  return Object.freeze({ read: () => [...rows], append: async (value) => { rows.push(value); return value; } });
}

function completed(rows, boardActor, activityId) { return rows.some((row) => row.board === boardActor && row.activity === activityId && ["submitted", "customer-rejected", "foldback-admitted", "foldback-refused", "capability-gap-foldback", "capability-gap-refused", "supplier-investment-published", "founder-lead-delivered", "terminal-skip", "terminal-residue"].includes(row.status)); }
function activitySequence(activity) { return activity?.object?.awardedAtSequence ?? activity?.object?.decidedAtSequence ?? activity?.object?.observedAtSequence ?? activity.attachment?.find((item) => ["ImprovementBuyerQuote", "ImprovementGameBuyerQuote"].includes(item?.type))?.sequence ?? -1; }
function terminalRecord(board, activity, status, detail, at) { return record({ type: "ImprovementForagingDisposition", board: board.actor, activity: activity.id, status, detail, recordedAt: at, customerTerritoryMutation: false }); }
async function forageImprovementBoardsUnlocked(activity, options = {}) {
  const policy = validateForagingPolicy(options.policy ?? loadForagingPolicy()), at = options.recordedAt ?? new Date().toISOString();
  const problem = incitementProblem(activity);
  if (problem) return { "@context": CONTEXT, type: "Reject", actor: ACTOR, target: activity?.actor ?? null, inReplyTo: activity?.id ?? null, object: { type: "ImprovementForagerIncitementRefusal", contract: CONTRACT, reason: problem, customerTerritoryMutation: false } };
  const ledger = options.ledger ?? foragingLedger(options), invokeBoard = options.invokeBoard ?? ((board, operation, input) => invokeActivityPubBoardOperation(board, operation, input, options.activityPub ?? {})), fulfill = options.fulfillAward ?? fulfillBoardAward;
  const sequence = ledger.read().length, bidPolicy = options.bidPolicy ?? DEFAULT_FORAGER_POLICY;
  const admitFoldback = options.admitFoldback ?? ((decision, { expectedCustomer }) => admitCustomerTrajectoryFoldback(decision, expectedCustomer, ACTOR, options.trajectoryMemory ?? {}));
  const deliverFounderLead = options.deliverFounderLead ?? ((founder, signal) => deliverFounderFormationLead(founder, signal, { ...(options.activityPub ?? {}), deliver: options.activityPub?.deliver }));
  const resourceObservation = Object.freeze({
    type: "SupplierResourcePressureObservation",
    provider: ACTOR,
    unsettledRecoveries: ledger.read().filter((row) => row?.disposition === "recovery-required").length,
    basis: "append-only supplier trajectory",
  });
  const outcomes = [];
  const executionPolicy = policy.supplierSelfImprovementExecution;
  if (executionPolicy?.enabled === true && executionPolicy.recipes && Object.getPrototypeOf(executionPolicy.recipes) === Object.prototype) {
    const recall = options.recallTrajectories ?? ((objective, taskClass) => recallSoftwareTrajectories(objective, { taskClass, ...(options.trajectoryMemory ?? {}) }));
    const taskClasses = new Map();
    for (const publication of ledger.read().filter((row) => row?.type === "Offer" && row.object?.type === "SupplierSelfImprovementWorkLot")) {
      if (!ledger.read().some((row) => row?.type === "SupplierSelfImprovementAttemptResidue" && row.publication === publication.id && row.disposition === "terminal")) continue;
      for (const capability of publication.object.requestedCapabilities ?? []) {
        if (executionPolicy.recipes[capability]) taskClasses.set(`supplier-capability-${capability}`, publication.object.objective);
      }
    }
    const recalled = new Map();
    for (const [taskClass, objective] of taskClasses) {
      try { recalled.set(taskClass, await recall(objective, taskClass)); }
      catch (error) { outcomes.push({ board: ACTOR, status: "trajectory-recall-residue", reason: error.message, detail: { taskClass } }); }
    }
    for (const planned of planTrajectoryInformedActions(ledger.read(), recalled, policy, at)) {
      if (planned.isNew) await ledger.append(planned.signal, at);
      if (planned.kind === "investment") {
        await ledger.append(planned.publication, at); await ledger.append(planned.decision, at);
        outcomes.push({ board: ACTOR, activity: planned.publication.id, status: "trajectory-informed-supplier-investment-published", detail: { opportunity: planned.signal.id, predecessorAttempt: planned.attempt.id, trajectoryKnowledge: planned.signal.sourceTrajectoryKnowledge, lot: planned.publication.object.id } });
        continue;
      }
      const priorIntent = ledger.read().find((row) => row?.type === "FounderFormationLeadOutboundIntent" && row.signalIdentity === planned.signal.id);
      const intent = priorIntent ?? record({ type: "FounderFormationLeadOutboundIntent", supplier: ACTOR, founder: policy.founderFormationDemandBoundary.actor, sourceActivity: planned.attempt.id, signal: planned.signal, signalIdentity: planned.signal.id, admittedAtSequence: sequence, admittedAt: at, customerMutation: false });
      if (!priorIntent) await ledger.append(intent, at);
      try {
        const delivered = await deliverFounderLead(policy.founderFormationDemandBoundary, planned.signal);
        const delivery = record({ type: "SupplierTrajectoryFormationLeadDelivery", supplier: ACTOR, signal: planned.signal.id, intent: intent.id, activity: delivered.activity?.id ?? null, receipt: delivered.receipt?.id ?? null, deliveredAt: at, customerMutation: false });
        await ledger.append(delivery, at);
        outcomes.push({ board: ACTOR, activity: delivered.activity?.id ?? planned.signal.id, status: "trajectory-informed-founder-lead-delivered", detail: { signal: planned.signal.id, missingCapabilities: planned.signal.missingCapabilities, trajectoryKnowledge: planned.signal.sourceTrajectoryKnowledge, receipt: delivered.receipt?.id ?? null } });
      } catch (error) {
        outcomes.push({ board: ACTOR, activity: planned.signal.id, status: "trajectory-informed-founder-lead-recovery-required", reason: error.message, detail: { intent: intent.id } });
      }
    }
  }
  for (const redecision of planTerminalInvestmentRedecisions(ledger.read(), policy.supplierInvestmentDemand, at)) {
    if (!ledger.read().some((row) => row?.id === redecision.publication.id)) await ledger.append(redecision.publication, at);
    if (!ledger.read().some((row) => row?.id === redecision.decision.id)) await ledger.append(redecision.decision, at);
    if (!ledger.read().some((row) => row?.id === redecision.evidence.id)) await ledger.append(redecision.evidence, at);
    outcomes.push({ board: ACTOR, activity: redecision.publication.id, status: "supplier-investment-reissued-after-terminal-policy-change", detail: { evidence: redecision.evidence.id, opportunity: redecision.opportunity.id, predecessorDecision: redecision.predecessor.id, predecessorLot: redecision.predecessor.lot, successorDecision: redecision.decision.id, successorLot: redecision.publication.object.id } });
  }
  for (const board of policy.boards) {
    let collection;
    try { collection = await invokeBoard(board, board.listOperation, null); }
    catch (error) { outcomes.push({ board: board.actor, status: "transport-residue", reason: error.message }); continue; }
    if (collection?.type !== "OrderedCollection" || collection.actor !== board.actor || !Array.isArray(collection.orderedItems)) { outcomes.push({ board: board.actor, status: "foreign-outbox" }); continue; }
    const awardedQuotes = new Set(collection.orderedItems.filter((item) => item?.type === "Accept" && ["ImprovementProposalAward", "ImprovementGameDesignAward"].includes(item.object?.type)).map((item) => item.object.quote));
    const candidates = collection.orderedItems.filter((item) => item?.id && !completed(ledger.read(), board.actor, item.id))
      .filter((item) => item.type !== "Offer" || !awardedQuotes.has(item.attachment?.find((part) => ["ImprovementBuyerQuote", "ImprovementGameBuyerQuote"].includes(part?.type))?.id))
      .sort((left, right) => Number(right.type === "Accept") - Number(left.type === "Accept") || activitySequence(right) - activitySequence(left) || left.id.localeCompare(right.id));
    for (const publication of candidates) {
      let authored, awarded = false, borderIntent = null;
      try {
        if (publication.type === "Create" && ["ImprovementMarketCapabilityGap", "ImprovementGameCapabilityGap"].includes(publication.object?.type)) {
          const priorSignal = ledger.read().find((row) => ["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity", "FounderEnterpriseFormationMarketLead", "SupplierCapabilityGapFoldbackRefusal"].includes(row?.type) && row.sourceActivity === publication.id);
          const signal = priorSignal ?? foldCapabilityGap(publication, { boardActor: board.actor, supplierCapabilities: bidPolicy.capabilities, policy: policy.capabilityGapFoldback, recordedAt: at });
          if (!priorSignal) await ledger.append(signal, at);
          if (signal.type === "FounderEnterpriseFormationMarketLead") {
            const existingLeadIntent = ledger.read().find((row) => row?.type === "FounderFormationLeadOutboundIntent" && row.sourceActivity === publication.id);
            const leadIntent = existingLeadIntent ?? record({ type: "FounderFormationLeadOutboundIntent", supplier: ACTOR, founder: policy.founderFormationDemandBoundary.actor, sourceActivity: publication.id, signal, signalIdentity: signal.id, admittedAtSequence: sequence, admittedAt: at, customerMutation: false });
            if (!exact(leadIntent) || !exact(leadIntent.signal) || leadIntent.signalIdentity !== signal.id) throw new Error("stored founder lead outbound intent is invalid");
            if (!existingLeadIntent) await ledger.append(leadIntent, at); borderIntent = leadIntent;
            const delivered = await deliverFounderLead(policy.founderFormationDemandBoundary, signal);
            const disposition = terminalRecord(board, publication, "founder-lead-delivered", { signal: signal.id, signalType: signal.type, activity: delivered.activity?.id ?? null, receipt: delivered.receipt?.id ?? null, founder: policy.founderFormationDemandBoundary.actor }, at);
            await ledger.append(disposition, at); outcomes.push(disposition); continue;
          }
          if (["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity"].includes(signal.type)) {
            const priorDecision = ledger.read().find((row) => row?.type === "SupplierInvestmentDemandDecision" && row.sourceOpportunity === signal.id);
            const decided = priorDecision
              ? { decision: priorDecision, publication: ledger.read().find((row) => row?.id === priorDecision.publication) ?? null }
              : decideSupplierInvestmentDemand(signal, policy.supplierInvestmentDemand);
            if (decided.publication && !ledger.read().some((row) => row?.id === decided.publication.id)) await ledger.append(decided.publication, decided.publication.published);
            if (!priorDecision) await ledger.append(decided.decision, decided.decision.decidedAt ?? at);
            const status = decided.publication ? "supplier-investment-published" : "capability-gap-refused";
            const disposition = terminalRecord(board, publication, status, { signal: signal.id, signalType: signal.type, decision: decided.decision.id, publication: decided.publication?.id ?? null, lot: decided.publication?.object?.id ?? null }, at);
            await ledger.append(disposition, at); outcomes.push(disposition); continue;
          }
          const status = signal.type === "SupplierCapabilityGapFoldbackRefusal" ? "capability-gap-refused" : "capability-gap-foldback";
          const disposition = terminalRecord(board, publication, status, { signal: signal.id, signalType: signal.type, missingCapabilities: signal.missingCapabilities ?? [] }, at);
          await ledger.append(disposition, at); outcomes.push(disposition); continue;
        }
        if (["Accept", "Reject"].includes(publication.type) && publication.target === ACTOR && publication.object?.type === "ImprovementCustomerDecision") {
          if (publication.type !== "Accept" || publication.object.accepted !== true) {
            const refused = terminalRecord(board, publication, "foldback-refused", publication.object?.classification ?? "customer-rejected-candidate", at); await ledger.append(refused, at); outcomes.push(refused); continue;
          }
          const existingFoldbackIntent = ledger.read().find((row) => row?.type === "CustomerTrajectoryFoldbackIntent" && row.board === board.actor && row.activity === publication.id);
          const foldbackIntent = existingFoldbackIntent ?? record({ type: "CustomerTrajectoryFoldbackIntent", supplier: ACTOR, board: board.actor, activity: publication.id, decision: publication, expectedCustomer: board.actor, admittedAtSequence: sequence, admittedAt: at, customerMutation: false });
          if (!exact(foldbackIntent) || foldbackIntent.expectedCustomer !== board.actor || foldbackIntent.decision.id !== publication.id) throw new Error("stored customer trajectory foldback intent is invalid");
          if (!existingFoldbackIntent) await ledger.append(foldbackIntent, at); borderIntent = foldbackIntent;
          const admitted = await admitFoldback(publication, { expectedCustomer: board.actor });
          const disposition = terminalRecord(board, publication, "foldback-admitted", { trajectoryFoldback: admitted.record.id, disposition: admitted.status }, at); await ledger.append(disposition, at); outcomes.push(disposition); continue;
        }
        awarded = publication.type === "Accept" && publication.target === ACTOR && ["ImprovementProposalAward", "ImprovementGameDesignAward"].includes(publication.object?.type);
        const existingOutbound = ledger.read().find((row) => row?.type === "ImprovementForagingOutboundIntent" && row.board === board.actor && row.activity === publication.id);
        if (existingOutbound) {
          if (!exact(existingOutbound) || !exact(existingOutbound.authored) || existingOutbound.operation !== board.submitOperation) throw new Error("stored foraging outbound intent is invalid");
          borderIntent = existingOutbound; authored = existingOutbound.authored;
        } else if (awarded) {
          const existingFulfillment = ledger.read().find((row) => row?.type === "ImprovementAwardFulfillmentIntent" && row.board === board.actor && row.activity === publication.id);
          const fulfillmentIntent = existingFulfillment ?? record({ type: "ImprovementAwardFulfillmentIntent", supplier: ACTOR, board: board.actor, activity: publication.id, award: publication, bid: publication.object.bidSnapshot, requestIdentity: rmnId({ award: publication.id, bid: publication.object.bidSnapshot.id }), admittedAtSequence: sequence, admittedAt: at, customerMutation: false });
          if (!exact(fulfillmentIntent) || fulfillmentIntent.requestIdentity !== rmnId({ award: publication.id, bid: publication.object.bidSnapshot.id })) throw new Error("stored award fulfillment intent is invalid");
          if (!existingFulfillment) await ledger.append(fulfillmentIntent, at);
          borderIntent = fulfillmentIntent; authored = await fulfill(fulfillmentIntent.award, fulfillmentIntent.bid);
        } else {
          if (!qualifiedBoardOfferKind(publication, bidPolicy)) { const skipped = terminalRecord(board, publication, "terminal-skip", "outside-current-supplier-qualification", at); await ledger.append(skipped, at); outcomes.push(skipped); continue; }
          authored = bidForBoardOffer(publication, bidPolicy, { resourceObservation });
        }
        if (!authored) { const skipped = terminalRecord(board, publication, "terminal-skip", "outside-current-supplier-qualification", at); await ledger.append(skipped, at); outcomes.push(skipped); continue; }
        if (!existingOutbound) {
          borderIntent = record({ type: "ImprovementForagingOutboundIntent", supplier: ACTOR, board: board.actor, activity: publication.id, operation: board.submitOperation, authored, authoredDigest: authored.id, admittedAtSequence: sequence, admittedAt: at, customerMutation: false });
          await ledger.append(borderIntent, at);
        }
        const receipt = await invokeBoard(board, board.submitOperation, authored);
        const status = receipt?.type === "Accept" ? "submitted" : "customer-rejected";
        const disposition = terminalRecord(board, publication, status, { authored: authored.id, receipt: receipt?.id ?? null, authoredType: authored.type, objectType: authored.object?.type }, at);
        await ledger.append(disposition, at); outcomes.push(disposition);
      } catch (error) {
        if (borderIntent) {
          const residue = record({ type: "ImprovementForagingRecoveryResidue", supplier: ACTOR, board: board.actor, activity: publication.id, intent: borderIntent.id, attemptedAtSequence: sequence, attemptedAt: at, disposition: "recovery-required", reason: error.message, customerMutation: false });
          await ledger.append(residue, at); outcomes.push({ board: board.actor, activity: publication.id, status: "recovery-required", detail: { intent: borderIntent.id, residue: residue.id } });
        } else {
          const residue = terminalRecord(board, publication, "terminal-residue", error.message, at); await ledger.append(residue, at); outcomes.push(residue);
        }
      }
    }
  }
  if (policy.supplierSelfImprovementExecution) {
    const settleSelfImprovement = options.settleSelfImprovement ?? settleNextSupplierSelfImprovement;
    const selfImprovement = await settleSelfImprovement({ rows: ledger.read(), ledger, activity, contract: CONTRACT, policy: policy.supplierSelfImprovementExecution, root: ROOT, sequence, at });
    if (selfImprovement) outcomes.push({ board: ACTOR, activity: selfImprovement.publication, status: selfImprovement.type === "SupplierSelfImprovementSettlement" ? "supplier-self-improvement-settled" : "supplier-self-improvement-residue", detail: { record: selfImprovement.id, lot: selfImprovement.lot, capability: selfImprovement.capability ?? null, reason: selfImprovement.reason ?? null, successorSchedule: selfImprovement.successorSchedule ?? null } });
  }
  return { "@context": CONTEXT, type: "Accept", actor: ACTOR, target: activity.actor, inReplyTo: activity.id, object: { type: "ImprovementForagerIncitementReceipt", contract: CONTRACT, incitementId: activity.id, resourceObservation, outcomes, customerTerritoryMutation: false } };
}

export async function forageImprovementBoards(activity, options = {}) {
  const lock = options.withForagingLock ?? withSupplierSettlementLock, lockPath = options.foragingLockPath ?? join(resolve(options.root ?? ROOT), "data/locks/improvement-board-foraging.lock");
  try { return await lock(lockPath, () => forageImprovementBoardsUnlocked(activity, options), { label: "supplier foraging admission" }); }
  catch (error) {
    if (error?.code !== "supplier-settlement-lock-held") throw error;
    return { "@context": CONTEXT, type: "Reject", actor: ACTOR, target: activity?.actor ?? null, inReplyTo: activity?.id ?? null, object: { type: "ImprovementForagerIncitementRefusal", contract: CONTRACT, reason: "supplier-foraging-admission-busy", recoveryRequired: true, customerTerritoryMutation: false } };
  }
}
