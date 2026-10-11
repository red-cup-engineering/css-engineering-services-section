import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { assayStrategyProgram } from "@red-cup-engineering/strategy-program-candidate-assay-service";
import { validateStrategyProgramSynthesisRequest } from "@red-cup-engineering/strategy-program-synthesis-work-lot-service";
import { validateStrategyProgramSynthesisResult } from "@red-cup-engineering/strategy-program-synthesis-work-lot-service/schemas";

const semanticId = (value) => identifyJsonSemanticContent({ objectKind: "brokerage-control.strategy-synthesis-record", value, witnessRoot: EMPTY_WITNESS_ROOT }).token;

export function createStrategySynthesisProvider(env = process.env, dependencies = {}) {
  let market = dependencies.strategySynthesis;
  const resolveMarket = async () => {
    if (market) return market;
    const { createInferenceMarketStrategyProgramSynthesis } = await import("@red-cup-engineering/strategy-program-synthesis-work-lot-service/inference-market-runtime");
    market = createInferenceMarketStrategyProgramSynthesis({ agentUrl: env.INFERENCE_WORK_LOT_AGENT_CARD_URL || "http://127.0.0.1:8796/.well-known/agent-card.json" });
    return market;
  };
  const bounded = (request) => {
    validateStrategyProgramSynthesisRequest(request);
    if (request.populationSize > 3 || request.maxTokensPerCandidate > 2048 || request.maximumWallClockMs > 180_000) throw new RangeError("public-strategy-synthesis-budget-exceeded");
    return request;
  };
  const provider = async (request) => {
    const output = await (await resolveMarket())(bounded(request));
    const verdict = validateStrategyProgramSynthesisResult(output);
    if (!verdict.ok) throw new TypeError(`strategy-program-synthesis-result-invalid:${verdict.errors.map(({ pointer, keyword }) => `${pointer || "/"}:${keyword}`).join(",")}`);
    const candidates = Object.freeze(output.candidates.map((candidate) => {
      const staticAssay = assayStrategyProgram({ source: candidate.candidate.strategySource, authorActor: candidate.provider });
      if (!staticAssay.admitted) throw new TypeError(`strategy-program-static-assay-refused:${staticAssay.problems?.join(",") ?? staticAssay.reason}`);
      return Object.freeze({ ...candidate, staticAssay });
    }));
    const assayed = Object.freeze({ ...output, candidates });
    return Object.freeze({ id: semanticId(assayed), ...assayed });
  };
  provider.originatingActor = "urn:ame:strategy-program-synthesis-work-lot-service";
  provider.preflight = async (request) => { bounded(request); };
  provider.externalEvidence = (_request, output) => output.candidates.flatMap((candidate) => [
    { uri: `urn:brokerage:strategy-author:${encodeURIComponent(candidate.provider)}`, digest: candidate.receipt ?? candidate.staticAssay.source },
    { uri: `urn:brokerage:strategy-static-assay:${encodeURIComponent(candidate.provider)}`, digest: candidate.staticAssay.source },
  ]);
  return provider;
}
