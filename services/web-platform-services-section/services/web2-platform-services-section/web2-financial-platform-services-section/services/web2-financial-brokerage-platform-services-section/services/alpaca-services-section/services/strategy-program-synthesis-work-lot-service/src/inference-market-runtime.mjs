import { requestInferenceWorkLot } from "@red-cup-engineering/inference-work-lot-service/client";
import { createStrategyProgramSynthesisMarket } from "./synthesis.mjs";

export function createInferenceMarketStrategyProgramSynthesis({ agentUrl }) {
  if (typeof agentUrl !== "string" || !/^https?:\/\//u.test(agentUrl)) throw new TypeError("inference-work-market-agent-card-required");
  return createStrategyProgramSynthesisMarket({
    contractInference: (request) => requestInferenceWorkLot({ agentUrl, request })
  });
}
