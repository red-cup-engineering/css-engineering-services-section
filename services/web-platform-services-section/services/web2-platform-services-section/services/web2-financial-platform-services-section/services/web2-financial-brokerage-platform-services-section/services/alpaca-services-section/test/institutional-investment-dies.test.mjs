import assert from "node:assert/strict";
import test from "node:test";
import { createAgentSectionDescentAssay } from "../scripts/agent-section-descent-assay.mjs";
import { assayCausalPanel } from "../scripts/causal-market-panel-assay.mjs";
import { measureCausalPatchNovelty } from "../scripts/causal-tiling-novelty-measure.mjs";
import { measureCorrelationGraph } from "../scripts/correlation-graph-measure.mjs";
import { fitDeterministicRidge, predictDeterministicRidge } from "../scripts/ridge.mjs";
import { createInvestmentResearchCommittee, INVESTMENT_RESEARCH_ROLES } from "../services/investment-research-work-lot-service/src/committee.mjs";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";
import { measureSheafLaplacian } from "../scripts/sheaf-laplacian-measure.mjs";
import { replayTransactionCosts } from "@red-cup-engineering/transaction-cost-replay-service";

test("causal panel refuses future observations", () => {
  const seriesByEntity = {
    a: [{ at: "2026-07-20T00:00:00Z", value: 1 }, { at: "2026-07-23T00:00:00Z", value: 2 }],
    b: [{ at: "2026-07-20T00:00:00Z", value: 1 }, { at: "2026-07-23T00:00:00Z", value: 2 }],
  };
  assert.throws(() => assayCausalPanel({ seriesByEntity, asOf: "2026-07-22T00:00:00Z" }), /future-observation-refused/);
});

test("general metrology dies expose topology without market claims", () => {
  const graph = measureCorrelationGraph({ returnsByEntity: { a: [1, 2, 3], b: [2, 4, 6], c: [3, 2, 1] } });
  const laplacian = measureSheafLaplacian({ sections: { a: 1, b: 1.1, c: -1 }, edges: graph.edges });
  const novelty = measureCausalPatchNovelty({ tokens: ["+", "-", "+", "-", "+", "-", "+", "-", "+", "-"], patchSize: 3 });
  assert.equal(graph.causationEstablished, false);
  assert.equal(laplacian.empiricalMarketEquivalenceEstablished, false);
  assert.equal(novelty.infiniteTilingEquivalenceEstablished, false);
});

test("agent descent preserves a provider-distinct contradiction", () => {
  const assayAgentSectionDescent = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const result = assayAgentSectionDescent({ sections: [
    { provider: "urn:provider:a", coordinate: "BLK:20", value: 0.05, confidence: 0.8 },
    { provider: "urn:provider:b", coordinate: "BLK:20", value: -0.04, confidence: 0.9 },
  ] });
  assert.equal(result.contradictionHeld, true);
  assert.equal(result.forcedConsensus, false);
  assert.ok(result.disagreementEnergy > 0);
  assert.equal(result.reviewRequired, true);
  assert.equal(result.reviewCells.length, 1);
  const review = result.reviewCells[0];
  assert.equal(review.predicate, "market-forecast-conflict-requires-review");
  assert.equal(review.for.length, 1);
  assert.equal(review.against.length, 0);
  assert.equal(review.for[0].rule, "market-forecast-contestation-review");
  assert.match(review.for[0].ruleId, /^ni:\/\/\/sha-256;/u);
  assert.equal(review.for[0].from.length, 1);
});

test("deterministic fitter, folds, allocation, replay, and tournament remain separate", () => {
  const model = fitDeterministicRidge({ samples: [{ features: [0], target: 0 }, { features: [1], target: 1 }, { features: [2], target: 2 }], lambda: 0.01 });
  assert.ok(predictDeterministicRidge(model, [1.5]) > 1);
  const coordinates = Array.from({ length: 40 }, (_, index) => new Date(Date.UTC(2026, 0, 1) + index * 86_400_000).toISOString());
  const folds = formPurgedWalkForwardFolds({ coordinates, warmup: 20, horizon: 5, cadence: 5, trainingWindow: 15 });
  assert.equal(folds.purge, 5);
  const allocation = allocateMandatePortfolio({ scores: { a: 2, b: 1 }, uncertainty: { a: 0, b: 1 }, mandate: { type: "PortfolioAllocationMandate", maximumWeight: 0.7, grossLimit: 1, leverageLimit: 1, shorting: false } });
  assert.ok(allocation.weights.a > allocation.weights.b);
  const replay = replayTransactionCosts({ periods: [
    { at: coordinates[0], weights: { a: 0.5 }, realizedReturns: { a: 0.1 } },
    { at: coordinates[1], weights: { a: 0.7 }, realizedReturns: { a: -0.05 } },
  ], transactionCostBps: 10 });
  assert.ok(replay.metrics.costs > 0);
  const tournament = selectModelCandidate({
    candidates: [
      { id: "a", authorActor: "urn:actor:a", validation: { score: 2 }, holdout: { score: -10, maximumDrawdown: 0.1 } },
      { id: "b", authorActor: "urn:actor:b", validation: { score: 1 }, holdout: { score: 10, maximumDrawdown: 0.1 } },
    ],
    policy: { metric: "score", direction: "maximize", maximumHoldoutDrawdown: 0.2 },
  });
  assert.equal(tournament.selectedUsingValidationOnly, "a");
  assert.equal(tournament.promotionEstablished, false);
});

test("research committee contracts distinct providers and grants no allocation authority", async () => {
  let seat = 0;
  const committee = createInvestmentResearchCommittee({ contractInference: async (lot) => {
    const role = INVESTMENT_RESEARCH_ROLES[seat], provider = `urn:provider:${seat++}`;
    assert.deepEqual(lot.excludeProviders, Array.from({ length: seat - 1 }, (_, index) => `urn:provider:${index}`));
    return { resultNi: `urn:receipt:${seat}`, result: { outcome: "candidate-pending-customer-acceptance", provider: { actor: provider }, candidate: {
      role: role.id,
      sections: [{ symbol: "BLK", horizonDays: 20, expectedExcessReturn: 0.01, confidence: 0.6, evidenceReferences: ["ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], basisFactIds: ["fact:holdout-ir"], thesis: role.id }],
      assumptions: ["bounded"], falsifiers: ["loss"], nonClaims: ["not an order"],
    } } };
  } });
  const result = await committee({
    contextProduct: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    customerActor: "urn:ame:test",
    universe: ["BLK"],
    horizonDays: 20,
    maxTokensPerSeat: 512,
    evidenceReferences: ["ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"],
    evidenceFacts: [{ id: "fact:holdout-ir", metric: "holdoutInformationRatio", value: 0.9 }],
  });
  assert.equal(result.committeeComplete, true);
  assert.equal(result.providerDistinct, true);
  assert.equal(result.allocationEstablished, false);
  assert.equal(result.executionEstablished, false);
});
