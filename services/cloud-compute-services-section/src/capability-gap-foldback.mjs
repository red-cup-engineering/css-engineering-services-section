import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, CONTEXT } from "./improvement-board-forager.mjs";

const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
const GAP_TYPES = Object.freeze({
  ImprovementMarketCapabilityGap: "publish-gap-and-keep-lot-open",
  ImprovementGameCapabilityGap: "publish-gap-and-preserve-opportunity",
});
const NI = /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
function rmnId(value) { return semanticId(relationalWitnessJournalDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
function samePublic(value) { return [PUBLIC, "as:Public"].includes(value); }

export function capabilityGapProblem(activity, boardActor) {
  const gap = activity?.object, expectedDisposition = GAP_TYPES[gap?.type];
  if (activity?.["@context"] !== CONTEXT || activity.type !== "Create" || activity.actor !== boardActor || !samePublic(activity.target) || !exact(activity) || !exact(gap)) return "exact-public-customer-capability-gap-required";
  if (!expectedDisposition || gap.customer !== boardActor || !NI.test(gap.contract ?? "") || typeof gap.lot !== "string" || !gap.lot || !Number.isSafeInteger(gap.observedAtSequence) || gap.observedAtSequence < 0 || gap.disposition !== expectedDisposition || gap.strongerModelAuthorized !== false) return "malformed-customer-capability-gap";
  if (!Array.isArray(gap.requiredCapabilities) || gap.requiredCapabilities.length < 1 || new Set(gap.requiredCapabilities).size !== gap.requiredCapabilities.length || gap.requiredCapabilities.some((value) => typeof value !== "string" || !value)) return "malformed-customer-capability-set";
  if (!gap.considerationCeiling || !Number.isSafeInteger(gap.considerationCeiling.amount) || gap.considerationCeiling.amount < 0 || typeof gap.considerationCeiling.unit !== "string" || !gap.considerationCeiling.unit) return "malformed-customer-gap-consideration";
  return null;
}

function policyProblem(policy) {
  if (policy?.type !== "SupplierCapabilityGapFoldbackPolicy" || policy.enabled !== true || !Array.isArray(policy.investableCapabilities) || new Set(policy.investableCapabilities).size !== policy.investableCapabilities.length || policy.investableCapabilities.some((value) => typeof value !== "string" || !value)) return "explicit-supplier-gap-foldback-policy-required";
  if (policy.founderAudience?.settlement !== "561-group" || policy.founderAudience?.office !== "founder") return "exact-founder-audience-required";
  if (policy.investmentDecision !== "separate-supplier-local-decision" || policy.protectedOracleRequired !== true) return "supplier-investment-authority-must-remain-separate";
  return null;
}

export function foldCapabilityGap(activity, { boardActor, supplierCapabilities, policy, recordedAt }) {
  const gapProblem = capabilityGapProblem(activity, boardActor), localPolicyProblem = policyProblem(policy);
  if (gapProblem || localPolicyProblem) return record({ type: "SupplierCapabilityGapFoldbackRefusal", supplier: ACTOR, sourceActivity: activity?.id ?? null, board: boardActor, reason: gapProblem ?? localPolicyProblem, strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false });
  if (!Array.isArray(supplierCapabilities) || supplierCapabilities.some((value) => typeof value !== "string" || !value) || typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt))) return record({ type: "SupplierCapabilityGapFoldbackRefusal", supplier: ACTOR, sourceActivity: activity.id, board: boardActor, reason: "exact-supplier-capabilities-and-instant-required", strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false });
  const supplied = new Set(supplierCapabilities), missing = activity.object.requiredCapabilities.filter((capability) => !supplied.has(capability));
  const common = {
    supplier: ACTOR, sourceActivity: activity.id, sourceGap: activity.object.id, customer: activity.object.customer, lot: activity.object.lot,
    observedAtSequence: activity.object.observedAtSequence, customerConsiderationCeiling: activity.object.considerationCeiling,
    requiredCapabilities: activity.object.requiredCapabilities, missingCapabilities: missing, recordedAt,
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false,
  };
  if (missing.length === 0) return record({
    type: "SupplierCapacityInvestmentOpportunity", ...common,
    reason: "the supplier already claims every required capability, so the unanswered lot is capacity or availability evidence rather than authority to escalate inference",
    protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: policy.investmentDecision,
    automaticCapacityIncreaseAuthorized: false, providerOrModelSelected: false,
  });
  if (missing.every((capability) => policy.investableCapabilities.includes(capability))) return record({
    type: "SupplierCapabilityInvestmentOpportunity", ...common,
    reason: "every missing capability lies inside this supplier's explicit investable adjacency set",
    investableCapabilities: missing, protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: policy.investmentDecision,
    automaticImplementationAuthorized: false, providerOrModelSelected: false,
  });
  return record({
    type: "FounderEnterpriseFormationMarketLead", ...common,
    reason: "at least one missing capability lies outside this supplier's admitted investment adjacency",
    founderAudience: policy.founderAudience, receiverNecessityClaimed: false, founderDecisionRequired: true,
    enterpriseFormationAuthorized: false, enterpriseFormed: false, formationProviderPreselected: false,
    nextBoundary: "founder-authored-enterprise-formation-demand-or-refusal",
  });
}

export function foldTrajectoryKnowledge(attempt, publication, knowledge, { policy, investmentPolicy, recipes, recordedAt }) {
  const refusal = (reason) => record({
    type: "SupplierCapabilityGapFoldbackRefusal", supplier: ACTOR, sourceActivity: attempt?.id ?? null,
    board: ACTOR, reason, strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false,
  });
  if (attempt?.type !== "SupplierSelfImprovementAttemptResidue" || attempt.disposition !== "terminal" || publication?.type !== "Offer" || publication.object?.type !== "SupplierSelfImprovementWorkLot") return refusal("exact-terminal-supplier-trajectory-required");
  if (knowledge?.type !== "SoftwareTrajectoryResidueKnowledge" || knowledge.capabilityFormationRequired !== true || knowledge.nextAct !== "advertise-capability-formation-demand" || typeof knowledge.requiredCapability !== "string" || !knowledge.requiredCapability) return refusal("exact-capability-forming-trajectory-knowledge-required");
  if (policyProblem(policy) || typeof recordedAt !== "string" || !Number.isFinite(Date.parse(recordedAt)) || !investmentPolicy?.maximumProposalConsideration) return refusal("exact-supplier-formation-routing-policy-required");
  const missing = knowledge.requiredCapability, sourceKnowledge = rmnId(knowledge);
  const common = {
    supplier: ACTOR, sourceActivity: attempt.id, sourceGap: sourceKnowledge, sourceTrajectoryKnowledge: sourceKnowledge,
    customer: ACTOR, lot: publication.object.id, observedAtSequence: attempt.attemptedAtSequence,
    customerConsiderationCeiling: investmentPolicy.maximumProposalConsideration,
    requiredCapabilities: [missing], missingCapabilities: [missing], recordedAt,
    strongerModelAuthorized: false, inferenceCalls: 0, customerMutation: false, customerCreatedSupplier: false,
    trajectoryRemediation: { dominantRefusal: knowledge.dominantRefusal, occurrences: knowledge.occurrences, strategy: knowledge.strategy, witnesses: knowledge.witnesses ?? [], modelEscalationAllowed: false },
  };
  if (policy.investableCapabilities.includes(missing) && recipes?.[missing]) return record({
    type: "SupplierCapabilityInvestmentOpportunity", ...common,
    reason: "trajectory memory identified a missing capability inside this supplier's admitted investment adjacency and implementation recipes",
    protectedOracleRequired: true, investmentDecisionRequired: true, investmentDecision: policy.investmentDecision,
    investableCapabilities: [missing], automaticImplementationAuthorized: false, providerOrModelSelected: false,
    customerNecessityClaimed: false,
  });
  return record({
    type: "FounderEnterpriseFormationMarketLead", ...common,
    reason: "trajectory memory identified a missing capability outside this supplier's admitted implementation adjacency",
    founderAudience: policy.founderAudience, receiverNecessityClaimed: false, founderDecisionRequired: true,
    enterpriseFormationAuthorized: false, enterpriseFormed: false, formationProviderPreselected: false,
    nextBoundary: "founder-authored-enterprise-formation-demand-or-refusal",
  });
}
