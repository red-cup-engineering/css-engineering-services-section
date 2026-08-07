import { requestInferenceWorkLot } from "@red-cup-engineering/inference-work-lot-service/client";
import { createInvestmentResearchCommittee } from "./committee.mjs";

export function createInferenceMarketInvestmentResearchCommittee({ agentUrl }) {
  if (typeof agentUrl !== "string" || !/^https?:\/\//u.test(agentUrl)) throw new TypeError("inference-work-market-agent-card-required");
  return createInvestmentResearchCommittee({
    contractInference: (request) => requestInferenceWorkLot({ agentUrl, request }),
  });
}
