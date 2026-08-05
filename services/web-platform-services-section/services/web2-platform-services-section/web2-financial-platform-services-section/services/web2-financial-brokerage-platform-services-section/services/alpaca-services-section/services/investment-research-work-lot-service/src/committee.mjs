import {
  INVESTMENT_RESEARCH_RESULT_CARRIER,
  requireValidCarrier,
  validateInvestmentResearchCandidate,
  validateInvestmentResearchRequest,
  validateInvestmentResearchResult,
} from "./schemas.mjs";

const ROLES = Object.freeze([
  Object.freeze({ id: "macro-regime", objective: "Estimate the stated horizon's market regime and cross-asset transmission risks from only the supplied observations." }),
  Object.freeze({ id: "issuer-fundamental", objective: "Form issuer-specific return and impairment hypotheses, with dated evidence references and falsifiers." }),
  Object.freeze({ id: "quantitative-structure", objective: "Propose falsifiable quantitative relationships, including where causal, graph, sheaf, or tiling measurements may add incremental predictive value." }),
  Object.freeze({ id: "adversarial-risk", objective: "Challenge the other plausible theses by identifying hidden exposures, nonstationarity, liquidity, model, legal, and operational failure modes." }),
]);

const OUTPUT_SCHEMA = Object.freeze(INVESTMENT_RESEARCH_RESULT_CARRIER.schema.$defs.candidate);

function validateRequest(request) {
  requireValidCarrier(request, "investment-research-request", validateInvestmentResearchRequest);
}

function actorOf(result) {
  return result?.provider?.actor ?? result?.provider ?? result?.result?.provider ?? null;
}

export function createInvestmentResearchCommittee({ contractInference }) {
  if (typeof contractInference !== "function") throw new TypeError("inference-market-contract-provider-required");
  return async function contractCommittee(request) {
    validateRequest(request);
    const excludedProviders = [], seats = [], residues = [];
    for (const role of ROLES) {
      const lot = Object.freeze({
        workLotId: `urn:union:investment-research:${request.contextProduct.split(";")[1]}:${role.id}`,
        customer: request.customerActor,
        workType: "inquiry",
        routingProfile: request.routingProfile ?? "bounded",
        ...((request.routingProfile ?? "bounded") === "extended" ? { extendedRoutingRationale: "Institutional investment research requires a provider-distinct adversarial committee; each individual seat remains a bounded schema-constrained work lot." } : {}),
        difficulty: request.difficulty ?? 0.4,
        maxTokens: request.maxTokensPerSeat,
        maximumWallClockMs: request.maximumWallClockMs ?? 120_000,
        excludeProviders: [...excludedProviders],
        objective: `${role.objective} Return research sections only; do not allocate capital or emit orders.`,
        context: JSON.stringify({ contextProduct: request.contextProduct, universe: request.universe, horizonDays: request.horizonDays, evidenceReferences: request.evidenceReferences, evidenceFacts: request.evidenceFacts, role: role.id, rule: "Every numeric forecast is a model judgment, not an observed fact. basisFactIds must name only supplied evidenceFacts." }),
        desiredUse: "Untrusted local sections for independent descent, empirical model training, and adversarial evaluation; no customer acceptance or execution authority.",
        outputSchema: OUTPUT_SCHEMA,
      });
      let exchange;
      try { exchange = await contractInference(lot); } catch (error) { residues.push(Object.freeze({ role: role.id, disposition: "transport-refusal", reason: error.message })); continue; }
      const result = exchange?.result ?? exchange;
      const actor = actorOf(result);
      const candidate = result?.candidate ?? (result?.outcome?.startsWith?.("candidate-pending") ? result.candidate : null);
      if (!actor || !candidate) {
        residues.push(Object.freeze({ role: role.id, disposition: result?.disposition ?? result?.outcome ?? "no-candidate", evidence: result }));
        continue;
      }
      requireValidCarrier(candidate, "investment-research-candidate", validateInvestmentResearchCandidate);
      if (excludedProviders.includes(actor)) throw new TypeError("repeated-provider-committee-refused");
      excludedProviders.push(actor);
      const symbols = candidate.sections?.map(({ symbol }) => symbol);
      if (candidate.role !== role.id || !Array.isArray(candidate.sections) || candidate.sections.length !== request.universe.length || new Set(symbols).size !== request.universe.length || request.universe.some((symbol) => !symbols.includes(symbol)) || candidate.sections.some((section) => section.horizonDays !== request.horizonDays || section.evidenceReferences.some((reference) => !request.evidenceReferences.includes(reference)) || section.basisFactIds.some((id) => !request.evidenceFacts.some((fact) => fact.id === id)))) throw new TypeError("committee-seat-schema-binding-invalid");
      seats.push(Object.freeze({ role: role.id, provider: actor, candidate, receipt: exchange?.resultNi ?? result?.evidence?.receipt ?? null }));
    }
    const committeeResult = {
      type: "InvestmentResearchCommitteeResult",
      version: 1,
      contextProduct: request.contextProduct,
      seats: Object.freeze(seats),
      residues: Object.freeze(residues),
      providerDistinct: new Set(seats.map(({ provider }) => provider)).size === seats.length,
      committeeComplete: seats.length === ROLES.length,
      customerAcceptanceEstablished: false,
      allocationEstablished: false,
      executionEstablished: false,
      effect: "untrusted-research-sections-only",
    };
    requireValidCarrier(committeeResult, "investment-research-result", validateInvestmentResearchResult);
    return Object.freeze(committeeResult);
  };
}

export { OUTPUT_SCHEMA as INVESTMENT_RESEARCH_SECTION_SCHEMA, ROLES as INVESTMENT_RESEARCH_ROLES };
