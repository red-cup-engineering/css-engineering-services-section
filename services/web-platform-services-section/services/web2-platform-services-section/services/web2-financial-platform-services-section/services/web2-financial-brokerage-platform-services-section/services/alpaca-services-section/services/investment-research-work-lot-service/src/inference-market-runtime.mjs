import { requestInferenceWorkLot } from "@red-cup-engineering/computer-inference-engine/dispatch/client";
import { createInvestmentResearchCommittee } from "@red-cup-engineering/investment-research-work-lot-service";

export function createInferenceMarketInvestmentResearchCommittee({ agentUrl }) {
  if (typeof agentUrl !== "string" || !/^https?:\/\//u.test(agentUrl)) throw new TypeError("inference-work-market-agent-card-required");
  return createInvestmentResearchCommittee({
    contractInference: (request) => requestInferenceWorkLot({ agentUrl, request }),
  });
}
