import { semanticId } from "@red-cup-engineering/rmn-semantic-conformance";
import { relationalWitnessJournalDocument } from "@lenticule-science/witness-journal-rdf-projection-service/client";
import { ACTOR, CONTEXT } from "./improvement-board-forager.mjs";

export const PUBLIC = "https://www.w3.org/ns/activitystreams#Public";
const OPPORTUNITY_TYPES = new Set(["SupplierCapacityInvestmentOpportunity", "SupplierCapabilityInvestmentOpportunity"]);
function rmnId(value) { return semanticId(relationalWitnessJournalDocument(value)); }
function record(body) { return Object.freeze({ id: rmnId(body), ...body }); }
function exact(value) { return value?.id === rmnId(Object.fromEntries(Object.entries(value ?? {}).filter(([key]) => key !== "id"))); }
function uniqueStrings(value, minimum = 0, maximum = 64) { return Array.isArray(value) && value.length >= minimum && value.length <= maximum && new Set(value).size === value.length && value.every((item) => typeof item === "string" && item); }

function policyProblem(policy) {
  const authority = policy?.publicationAuthority;
  if (policy?.type !== "SupplierSelfInvestmentDemandPolicy" || policy.enabled !== true || policy.authoredBy !== ACTOR || policy.standingDecision !== "publish-provider-neutral-proposal-lot") return "exact-supplier-authored-investment-policy-required";
  if (!uniqueStrings(policy.admittedOpportunityTypes, 2, 2) || policy.admittedOpportunityTypes.some((type) => !OPPORTUNITY_TYPES.has(type)) || !uniqueStrings(policy.protectedAcceptanceAssertions, 1, 32)) return "supplier-investment-policy-domain-invalid";
  if (!policy.maximumProposalConsideration || !Number.isSafeInteger(policy.maximumProposalConsideration.amount) || policy.maximumProposalConsideration.amount < 0 || typeof policy.maximumProposalConsideration.unit !== "string" || !policy.maximumProposalConsideration.unit) return "supplier-investment-consideration-invalid";
  if (authority?.proposalInquiryOnly !== true || authority.spendAuthorized !== false || authority.customerMutationAuthorized !== false || authority.capacityChangeAuthorized !== false || authority.capabilityClaimAuthorized !== false || authority.providerSelectionAuthorized !== false) return "supplier-investment-policy-expands-authority";
  return null;
}

export function supplierInvestmentProblem(opportunity, policy) {
  const problem = policyProblem(policy);
  if (problem) return problem;
  if (!exact(opportunity) || !OPPORTUNITY_TYPES.has(opportunity.type) || opportunity.supplier !== ACTOR || opportunity.investmentDecisionRequired !== true || opportunity.protectedOracleRequired !== true || opportunity.strongerModelAuthorized !== false || opportunity.customerMutation !== false || opportunity.customerCreatedSupplier !== false) return "exact-supplier-investment-opportunity-required";
  if (!uniqueStrings(opportunity.requiredCapabilities, 1, 32) || !uniqueStrings(opportunity.missingCapabilities, 0, 32) || opportunity.missingCapabilities.some((capability) => !opportunity.requiredCapabilities.includes(capability))) return "supplier-investment-capability-set-invalid";
  if (opportunity.type === "SupplierCapabilityInvestmentOpportunity" && (!uniqueStrings(opportunity.investableCapabilities, 1, 32) || opportunity.investableCapabilities.some((capability) => !opportunity.missingCapabilities.includes(capability)) || opportunity.automaticImplementationAuthorized !== false)) return "supplier-capability-investment-boundary-invalid";
  if (opportunity.type === "SupplierCapacityInvestmentOpportunity" && (opportunity.missingCapabilities.length !== 0 || opportunity.automaticCapacityIncreaseAuthorized !== false)) return "supplier-capacity-investment-boundary-invalid";
  return null;
}

export function decideSupplierInvestmentDemand(opportunity, policy, decidedAt = opportunity?.recordedAt, lineage = {}) {
  const problem = supplierInvestmentProblem(opportunity, policy);
  if (problem) return Object.freeze({ publication: null, decision: record({ type: "SupplierInvestmentDemandDecision", supplier: ACTOR, sourceOpportunity: opportunity?.id ?? null, disposition: "refused", reason: problem, spendAuthorized: false, customerMutation: false }) });
  if (typeof decidedAt !== "string" || !Number.isFinite(Date.parse(decidedAt))) return Object.freeze({ publication: null, decision: record({ type: "SupplierInvestmentDemandDecision", supplier: ACTOR, sourceOpportunity: opportunity.id, disposition: "refused", reason: "exact-supplier-investment-decision-instant-required", spendAuthorized: false, customerMutation: false }) });
  const identityOpenedAt = lineage.identityOpenedAt ?? decidedAt;
  if (typeof identityOpenedAt !== "string" || !Number.isFinite(Date.parse(identityOpenedAt)) || (lineage.predecessorDecision !== undefined && typeof lineage.predecessorDecision !== "string")) return Object.freeze({ publication: null, decision: record({ type: "SupplierInvestmentDemandDecision", supplier: ACTOR, sourceOpportunity: opportunity.id, disposition: "refused", reason: "exact-supplier-investment-lineage-required", spendAuthorized: false, customerMutation: false }) });
  const requestedCapabilities = opportunity.type === "SupplierCapabilityInvestmentOpportunity" ? opportunity.investableCapabilities : opportunity.requiredCapabilities;
  const lot = record({
    type: "SupplierSelfImprovementWorkLot", customer: ACTOR, sourceOpportunity: opportunity.id, sourceCustomer: opportunity.customer, sourceCustomerLot: opportunity.lot,
    decisionPolicy: rmnId(policy), ...(lineage.predecessorDecision === undefined ? {} : { predecessorDecision: lineage.predecessorDecision }),
    investmentClass: opportunity.type === "SupplierCapabilityInvestmentOpportunity" ? "capability" : "capacity", requestedCapabilities,
    objective: opportunity.type === "SupplierCapabilityInvestmentOpportunity"
      ? opportunity.trajectoryRemediation
        ? `Return a proposal for this supplier to gain ${requestedCapabilities.join(", ")}. Repair the recurring ${opportunity.trajectoryRemediation.dominantRefusal} transition using ${opportunity.trajectoryRemediation.strategy}; bind the proposal to witnesses ${opportunity.trajectoryRemediation.witnesses.join(", ")}. Use the cheapest sufficient route and a deterministic carrier whenever possible.`
        : `Return a proposal for this supplier to gain ${requestedCapabilities.join(", ")} using the cheapest sufficient route and a deterministic carrier whenever possible.`
      : `Return a proposal for this supplier to increase available ${requestedCapabilities.join(", ")} capacity without increasing model strength by default.`,
    providerNeutral: true, deliveryMode: "proposal-only", openedAt: identityOpenedAt,
    maximumProposalConsideration: policy.maximumProposalConsideration,
    acceptanceOracle: record({ type: "SupplierSelfInvestmentAcceptanceOracle", governedBy: ACTOR, assertions: policy.protectedAcceptanceAssertions }),
    terms: {
      spendAuthorized: false, customerMutationAuthorized: false, capacityChangeAuthorized: false, capabilityClaimAuthorized: false,
      providerPreselected: false, strongerModelAuthorized: false, refinement: "model-to-smaller-model-to-script",
      behavioralAssayRequired: true,
    },
  });
  const quote = record({ type: "SupplierSelfImprovementProposalQuote", lot: lot.id, considerationCeiling: policy.maximumProposalConsideration, spendAuthorized: false });
  const publication = record({ "@context": CONTEXT, type: "Offer", actor: ACTOR, target: PUBLIC, object: lot, attachment: [quote], published: identityOpenedAt });
  const decision = record({ type: "SupplierInvestmentDemandDecision", supplier: ACTOR, sourceOpportunity: opportunity.id, sourceActivity: opportunity.sourceActivity, disposition: "published", publication: publication.id, lot: lot.id, policy: rmnId(policy), decidedAt, providerSelected: false, spendAuthorized: false, customerMutation: false });
  return Object.freeze({ publication, decision });
}
