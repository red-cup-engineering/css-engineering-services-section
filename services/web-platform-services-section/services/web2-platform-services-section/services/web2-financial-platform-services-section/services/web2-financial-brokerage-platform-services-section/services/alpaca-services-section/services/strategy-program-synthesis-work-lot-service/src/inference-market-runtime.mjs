import { semanticId } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { requestInferenceWorkLot } from "@red-cup-engineering/computer-inference-engine/dispatch/client";
import { assayStrategyProgram } from "./strategy-program-candidate-assay.mjs";
import { validateStrategyProgramSynthesisResult } from "./schemas.mjs";
import { createStrategyProgramSynthesisMarket, validateStrategyProgramSynthesisRequest } from "./synthesis.mjs";

const DEFAULT_AGENT_URL = "http://127.0.0.1:8796/.well-known/agent-card.json";

export function createInferenceMarketStrategyProgramSynthesis({ agentUrl }) {
  if (typeof agentUrl !== "string" || !/^https?:\/\//u.test(agentUrl)) throw new TypeError("inference-work-market-agent-card-required");
  return createStrategyProgramSynthesisMarket({
    contractInference: (request) => requestInferenceWorkLot({ agentUrl, request })
  });
}

/** Refuse a malformed request, or one over the public budget: three candidates, 2048 tokens each, three minutes. */
export function validateBoundedStrategySynthesisRequest(request) {
  validateStrategyProgramSynthesisRequest(request);
  if (request.populationSize > 3 || request.maxTokensPerCandidate > 2048 || request.maximumWallClockMs > 180_000) throw new RangeError("public-strategy-synthesis-budget-exceeded");
  return request;
}

/**
 * Synthesize one bounded, provider-distinct candidate population through the
 * inference work-lot market named by `env.INFERENCE_WORK_LOT_AGENT_CARD_URL`,
 * statically assay every candidate, and identify the assayed result.
 */
export async function synthesizeBoundedStrategyProgram(request, env = process.env, { synthesize } = {}) {
  const market = synthesize ?? createInferenceMarketStrategyProgramSynthesis({ agentUrl: env.INFERENCE_WORK_LOT_AGENT_CARD_URL || DEFAULT_AGENT_URL });
  const output = await market(validateBoundedStrategySynthesisRequest(request));
  const verdict = validateStrategyProgramSynthesisResult(output);
  if (!verdict.ok) throw new TypeError(`strategy-program-synthesis-result-invalid:${verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",")}`);
  const candidates = Object.freeze(output.candidates.map((candidate) => {
    const staticAssay = assayStrategyProgram({ source: candidate.candidate.strategySource, authorActor: candidate.provider });
    if (!staticAssay.admitted) throw new TypeError(`strategy-program-static-assay-refused:${staticAssay.problems?.join(",") ?? staticAssay.reason}`);
    return Object.freeze({ ...candidate, staticAssay });
  }));
  const assayed = Object.freeze({ ...output, candidates });
  return Object.freeze({ id: semanticId(assayed), ...assayed });
}
