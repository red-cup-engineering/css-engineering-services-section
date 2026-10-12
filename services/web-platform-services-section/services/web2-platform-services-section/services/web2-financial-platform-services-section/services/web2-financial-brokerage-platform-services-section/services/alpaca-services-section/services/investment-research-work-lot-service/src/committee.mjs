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


// Broader strategy research is an opt-in configuration of the SAME committee,
// not a second agent arena, portfolio calculator, research schema or signer.
// The provider may decline a seat when the named source family is unavailable.
export const INVESTMENT_RESEARCH_FRONTIER_ROLES = Object.freeze([
  ...ROLES,
  Object.freeze({ id: "primary-issuer-disclosures", objective: "Read already-available 8-K, 10-Q, 10-K, S-1, 424B, 13D/G, Form 4 and issuer guidance evidence; compare newly asserted facts to the prior release. Missing filings or post-decision publication require an explicit no-candidate residue." }),
  Object.freeze({ id: "capital-structure-and-dilution", objective: "Test debt maturities, convertibles, ATM facilities, shelf registrations, warrants, lockups, insider supply, buybacks and cash runway against candidate value; distinguish stated program ceilings from recognized revenue." }),
  Object.freeze({ id: "news-claim-provenance", objective: "Evaluate event first-publication time, primary versus syndicated reporting, corrections, source independence and contradictory claim readings; require source/availability clocks and never equate a headline to a calibrated probability." }),
  Object.freeze({ id: "attention-and-narrative", objective: "Study changes in public attention, positioning narratives and discourse disagreement across independently sourced publications; distinguish persuasive rhetoric, repeated syndication and genuine new issuer information." }),
  Object.freeze({ id: "earnings-and-guidance", objective: "Compare reported results, management guidance, estimate revisions and conference-call evidence to prior dated expectations; separate an economic surprise from a price surprise and record each unsupported expectation." }),
  Object.freeze({ id: "options-and-volatility", objective: "Study properly sourced option smile/skew, implied-versus-realized distributions, term structure, open interest and plausible dealer positioning; indicative or delayed quotes are non-executable and positioning is a hypothesis." }),
  Object.freeze({ id: "order-flow-and-microstructure", objective: "Study time-stamped venue quote/trade streams, spread, depth, order imbalance, queue/fill hazards, latency, adverse selection and trade size; do not infer executable NBBO depth from IEX-only aggregates." }),
  Object.freeze({ id: "cross-venue-conditional-events", objective: "Map Kalshi/Polymarket settlement-state possibilities to issuer, sector, commodity and listed-asset consequences using exact contract rules; do not treat venue odds as independent real-world probabilities." }),
  Object.freeze({ id: "scarce-complements-and-supply-chain", objective: "Research physical bottlenecks in power, grid connections, fabrication, rare earths, compute, transport, water and regulation; locate upstream and downstream beneficiaries and falsifiers from actual contracts and capacity." }),
  Object.freeze({ id: "catalyst-to-ownership", objective: "Separately test enduring company ownership value and dated catalyst/liquidity mispricing. Reclassifying a failed catalyst as a long-term thesis without fresh evidence is not allowed." }),
  Object.freeze({ id: "flows-index-and-corporate-actions", objective: "Study index inclusion/rebalance, ETF holdings and flows, splits, tender offers, spin-offs, distributions and mechanically constrained investors; source ex/record dates and distinguish flow hypotheses from observed fills." }),
  Object.freeze({ id: "causal-counterfactuals", objective: "Construct rival causal mechanisms, regime breaks, affected parties and counterfactual nulls; quantify uncertainty rather than promote coincident market reactions into proven causes." }),
  Object.freeze({ id: "obsmetrologia-structure", objective: "Propose testable FOUR/bilattice contradiction, sheaf-Laplacian, causal-cone, holonomy, and context-refinement features only when source observations can instantiate them; state a simpler null baseline." }),
  Object.freeze({ id: "information-value-and-search", objective: "Use the shared market game's fixed actions, joint scenario distribution and calibrated signal kernel to compare the expected decision value of additional research against compute, latency and opponent repricing costs." }),
  Object.freeze({ id: "regulatory-geopolitical-transmission", objective: "Translate dated rule changes, central-bank announcements, procurement milestones, court rulings and geopolitical shocks into explicit first-, second- and third-order beneficiary/loss scenarios; preserve jurisdiction and source time." }),
  Object.freeze({ id: "data-quality-and-adversarial-audit", objective: "Attempt to invalidate every other seat using look-ahead, corporate-action backfill, survivorship, filing-time errors, model-memory leakage, source licensing, duplicated news, fees and hidden factor exposure; withhold unsupported forecasts." }),
]);

function admittedRoles(roles) {
  if (!Array.isArray(roles) || roles.length < 1 || roles.length > 24)
    throw new TypeError("bounded-research-roles-required");
  const ids = new Set();
  for (const role of roles) {
    if (!role || typeof role !== "object" || typeof role.id !== "string"
        || !/^[a-z][a-z0-9-]{0,63}$/u.test(role.id)
        || ids.has(role.id) || typeof role.objective !== "string"
        || !role.objective.trim() || role.objective.length > 900)
      throw new TypeError("unique-trusted-research-role-required");
    ids.add(role.id);
  }
  return Object.freeze(roles.map((role) => Object.freeze({ id: role.id, objective: role.objective })));
}

const OUTPUT_SCHEMA = Object.freeze(INVESTMENT_RESEARCH_RESULT_CARRIER.schema.$defs.candidate);

function validateRequest(request) {
  requireValidCarrier(request, "investment-research-request", validateInvestmentResearchRequest);
  // Legacy numeric facts retain their prior entrance. Bounded narrative facts
  // require source identity and the clock at which a trader could have seen
  // them; a model's interpretation is not an original filing or news source.
  const hasAsOf = request.asOf !== undefined;
  const at = hasAsOf ? Date.parse(request.asOf) : NaN;
  if (hasAsOf && !Number.isFinite(at)) throw new TypeError("research-as-of-time-invalid");
  const ids = new Set();
  for (const fact of request.evidenceFacts) {
    if (ids.has(fact.id)) throw new TypeError("duplicate-research-fact-id");
    ids.add(fact.id);
    const narrative = typeof fact.value === "string";
    const sourced = fact.sourceEvidenceId !== undefined || fact.sourceUrl !== undefined ||
      fact.availableAt !== undefined || fact.observedAt !== undefined ||
      fact.assertionForce !== undefined || fact.evidenceStatus !== undefined;
    if (narrative && (!fact.value.trim() || fact.value.length > 1200))
      throw new TypeError("bounded-qualitative-evidence-required");
    if (narrative && (!fact.assertionForce || !fact.evidenceStatus))
      throw new TypeError("narrative-assertion-force-and-status-required");
    if (narrative || sourced) {
      if (!hasAsOf || !fact.sourceEvidenceId ||
          !request.evidenceReferences.includes(fact.sourceEvidenceId) ||
          typeof fact.availableAt !== "string" ||
          !Number.isFinite(Date.parse(fact.availableAt)) ||
          Date.parse(fact.availableAt) > at)
        throw new TypeError("research-fact-point-in-time-source-required");
      if (fact.observedAt !== undefined &&
          (!Number.isFinite(Date.parse(fact.observedAt)) ||
           Date.parse(fact.observedAt) < Date.parse(fact.availableAt) ||
           Date.parse(fact.observedAt) > at))
        throw new TypeError("research-fact-observation-time-invalid");
      if (fact.sourceUrl !== undefined) {
        let origin;
        try { origin = new URL(fact.sourceUrl); } catch { throw new TypeError("research-fact-source-url-invalid"); }
        if (origin.protocol !== "https:" || origin.username || origin.password || origin.hash)
          throw new TypeError("research-fact-source-url-invalid");
      }
    }
  }
}

function actorOf(result) {
  return result?.provider?.actor ?? result?.provider ?? result?.result?.provider ?? null;
}

export function createInvestmentResearchCommittee({ contractInference, roles = ROLES } = {}) {
  if (typeof contractInference !== "function") throw new TypeError("inference-market-contract-provider-required");
  const trustedRoles = admittedRoles(roles);
  return async function contractCommittee(request) {
    validateRequest(request);
    const factsById = new Map(request.evidenceFacts.map(fact => [fact.id, fact]));
    const excludedProviders = [], seats = [], residues = [];
    for (const role of trustedRoles) {
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
      if (candidate.role !== role.id || !Array.isArray(candidate.sections) || candidate.sections.length !== request.universe.length || new Set(symbols).size !== request.universe.length || request.universe.some((symbol) => !symbols.includes(symbol)) || candidate.sections.some((section) => section.horizonDays !== request.horizonDays || section.evidenceReferences.some((reference) => !request.evidenceReferences.includes(reference)) || section.basisFactIds.some((id) => !factsById.has(id) ||
        (factsById.get(id).sourceEvidenceId &&
          !section.evidenceReferences.includes(factsById.get(id).sourceEvidenceId))))) throw new TypeError("committee-seat-schema-binding-invalid");
      seats.push(Object.freeze({ role: role.id, provider: actor, candidate, receipt: exchange?.resultNi ?? result?.evidence?.receipt ?? null }));
    }
    const committeeResult = {
      type: "InvestmentResearchCommitteeResult",
      version: 1,
      contextProduct: request.contextProduct,
      seats: Object.freeze(seats),
      residues: Object.freeze(residues),
      providerDistinct: new Set(seats.map(({ provider }) => provider)).size === seats.length,
      committeeComplete: seats.length === trustedRoles.length,
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
