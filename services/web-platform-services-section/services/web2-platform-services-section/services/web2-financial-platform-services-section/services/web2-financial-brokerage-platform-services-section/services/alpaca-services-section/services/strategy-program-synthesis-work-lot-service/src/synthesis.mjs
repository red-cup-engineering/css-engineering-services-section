import {
  STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER,
  requireStrategyCarrier,
  validateStrategyProgramCandidate,
  validateStrategyProgramSynthesisRequestCarrier,
  validateStrategyProgramSynthesisResult,
} from "./schemas.mjs";

const OUTPUT_SCHEMA = Object.freeze(STRATEGY_PROGRAM_SYNTHESIS_RESULT_CARRIER.schema.$defs.candidate);

function containsCredential(value, seen = new Set()) {
  if (!value || typeof value !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  return Object.entries(value).some(([key, child]) => /^(?:secret|password|private[_-]?key|api[_-]?key|authorization|credential|access[_-]?token|bearer[_-]?token)$/iu.test(key) || containsCredential(child, seen));
}
function actorOf(result) { return result?.provider?.actor ?? result?.provider ?? result?.result?.provider ?? null; }
export function validateStrategyProgramSynthesisRequest(request) {
  requireStrategyCarrier(request, "strategy-program-synthesis-request", validateStrategyProgramSynthesisRequestCarrier);
  if (containsCredential(request)) throw new TypeError("credential-bearing-synthesis-context-refused");
}
function validateCandidate(candidate, request) {
  requireStrategyCarrier(candidate, "strategy-program-candidate", validateStrategyProgramCandidate);
}

export function createStrategyProgramSynthesisMarket({ contractInference }) {
  if (typeof contractInference !== "function") throw new TypeError("inference-market-contract-provider-required");
  return async function synthesizePopulation(request) {
    validateStrategyProgramSynthesisRequest(request);
    const candidates = [], residues = [], excludedProviders = [];
    for (let index = 0; index < request.populationSize; index += 1) {
      const lot = Object.freeze({
        workLotId: `urn:union:strategy-program-synthesis:${request.contextProduct.split(";")[1]}:${index}`,
        customer: request.customerActor,
        workType: "software-engineering",
        routingProfile: request.routingProfile ?? "bounded",
        ...((request.routingProfile ?? "bounded") === "extended" ? {
          extendedRoutingRationale: "Executable strategy synthesis needs enough bounded output for source, tests, assumptions, and falsifiers; every candidate remains untrusted and independently sandboxed."
        } : {}),
        difficulty: request.difficulty ?? 0.6,
        maxTokens: request.maxTokensPerCandidate,
        maximumWallClockMs: request.maximumWallClockMs ?? 180_000,
        excludeProviders: [...excludedProviders],
        objective: "Generate one novel pure ECMAScript strategy decision module and at least two falsifiers. The module must literally export synchronous function decide(input), may use only supplied input, deterministic Number/Object/Array operations, and deterministic Math functions, and must emit scores or weights. Never use Math.random or Date. Do not import, fetch, trade, allocate custody, claim profitability, or access ambient state.",
        context: JSON.stringify({
          contextProduct: request.contextProduct,
          incumbentProgram: request.incumbentProgram,
          acceptanceSuite: request.acceptanceSuite,
          abi: request.abi,
          evidenceFacts: request.evidenceFacts,
          allowedFeatureDependencies: request.allowedFeatureDependencies,
          failureHistory: request.failureHistory,
          generation: request.generation,
          diversityInstruction: `population-member-${index}: seek a materially distinct causal hypothesis and implementation`,
          exactOutput: "Return only strategySource and falsifiers. Deterministic assays derive tests, dependencies, effects, and fitness downstream."
        }),
        desiredUse: "Untrusted candidate source for static assay, deterministic sandbox replay, purged multi-regime tournament, and digest-bound fresh-process review.",
        outputSchema: OUTPUT_SCHEMA,
        enforceProviderSchema: true,
      });
      let exchange;
      try { exchange = await contractInference(lot); } catch (error) { residues.push(Object.freeze({ index, disposition: "transport-refusal", reason: error.message })); continue; }
      const result = exchange?.result ?? exchange, provider = actorOf(result);
      const candidate = result?.candidate ?? (result?.outcome?.startsWith?.("candidate-pending") ? result.candidate : null);
      if (!provider || !candidate) {
        residues.push(Object.freeze({
          index,
          disposition: result?.disposition ?? result?.outcome ?? "no-candidate",
          ...(provider ? { provider } : {}),
          ...(Array.isArray(result?.settlementResidues) && result.settlementResidues.length > 0
            ? { settlementResidues: Object.freeze(result.settlementResidues.map((residue) => Object.freeze({ ...residue }))) }
            : {}),
        }));
        continue;
      }
      if (excludedProviders.includes(provider)) throw new TypeError("repeated-strategy-author-refused");
      validateCandidate(candidate, request);
      excludedProviders.push(provider);
      candidates.push(Object.freeze({ index, provider, candidate: Object.freeze(candidate), receipt: exchange?.resultNi ?? result?.evidence?.receipt ?? null }));
    }
    const population = {
      type: "StrategyProgramPopulation",
      version: 1,
      contextProduct: request.contextProduct,
      incumbentProgram: request.incumbentProgram,
      generation: request.generation,
      candidates: Object.freeze(candidates),
      residues: Object.freeze(residues),
      providerDistinct: new Set(candidates.map(({ provider }) => provider)).size === candidates.length,
      executionEstablished: false,
      promotionEstablished: false,
      effect: "untrusted-generated-programs-only"
    };
    requireStrategyCarrier(population, "strategy-program-synthesis-result", validateStrategyProgramSynthesisResult);
    return Object.freeze(population);
  };
}

export { OUTPUT_SCHEMA as STRATEGY_PROGRAM_CANDIDATE_SCHEMA };
