import assert from "node:assert/strict";
import test from "node:test";
import { createCausalPortfolioLearningCircuit } from "../scripts/circuit.mjs";
import { createAgentSectionDescentAssay } from "../scripts/agent-section-descent-assay.mjs";
import { assayCausalPanel } from "../scripts/causal-market-panel-assay.mjs";
import { measureCausalPatchNovelty } from "../scripts/causal-tiling-novelty-measure.mjs";
import { measureCorrelationGraph } from "../scripts/correlation-graph-measure.mjs";
import { fitDeterministicRidge, predictDeterministicRidge } from "../scripts/ridge.mjs";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";
import { measureReturnRiskFeatures } from "../scripts/return-risk-feature-measure.mjs";
import { measureTechnicalAnalysisFeatures } from "../scripts/technical-analysis-feature-measure.mjs";
import { measureSheafLaplacian } from "../scripts/sheaf-laplacian-measure.mjs";
import { simulateEventDrivenExecution } from "../scripts/simulate.mjs";

function panel(length = 260) {
  const symbols = ["BLK", "QQQ", "SPY", "TLT"], bars = Object.fromEntries(symbols.map((symbol) => [symbol, []])), prices = Object.fromEntries(symbols.map((symbol) => [symbol, 100]));
  for (let index = 0; index < length; index += 1) {
    const market = 0.0002 + 0.006 * Math.sin(index / 11);
    prices.SPY *= Math.exp(market); prices.QQQ *= Math.exp(1.2 * market + 0.001 * Math.sin(index / 5)); prices.TLT *= Math.exp(-0.3 * market + 0.001 * Math.cos(index / 7)); prices.BLK *= Math.exp(0.85 * market + 0.0015 * Math.sin((index - 3) / 11));
    const at = new Date(Date.UTC(2025, 0, 2) + index * 86_400_000).toISOString();
    for (const symbol of symbols) bars[symbol].push({ at, open: prices[symbol] * 0.999, high: prices[symbol] * 1.002, low: prices[symbol] * 0.998, close: prices[symbol], volume: 1_000_000 + index, vwap: prices[symbol] * 0.9999 });
  }
  return bars;
}

test("composes atomic dies into recorded, non-executing walk-forward target weights", async () => {
  const barsBySymbol = panel();
  const assayAgentSectionDescent = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const providers = { assayAgentSectionDescent, assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph, fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio, selectModelCandidate, formPurgedWalkForwardFolds, measureReturnRiskFeatures, measureTechnicalAnalysisFeatures, measureSheafLaplacian, simulateEventDrivenExecution };
  const run = createCausalPortfolioLearningCircuit({ providers, recordResult: async () => ({ id: "urn:witnessJournal:receipt:1" }) });
  const result = await run({
    barsBySymbol,
    asOf: barsBySymbol.SPY.at(-1).at,
    mandate: { type: "PortfolioAllocationMandate", id: "urn:mandate:test", maximumWeight: 0.6, grossLimit: 1, leverageLimit: 1, shorting: false, maximumDrawdown: 0.5 },
    config: { warmup: 140, trainingWindow: 100, graphWindow: 40, transactionCostBps: 10 },
  });
  assert.equal(result.panelAssay.leakageDetected, false);
  assert.equal(result.effect, "model-evaluation-and-target-weights-only");
  assert.equal(result.claims.alphaEstablished, false);
  assert.equal(result.claims.technicalAnalysisTournamented, true);
  assert.deepEqual(Object.keys(result.evaluations), ["baseline", "technical", "obsmetrologiaTechnical"]);
  assert.ok(Object.values(result.evaluations).every((evaluation) => Number.isFinite(evaluation.holdout.fillRate)));
  assert.equal(result.executionModel.maximumParticipationRate, 0.1);
  assert.ok(result.folds.validationCount > 0 && result.folds.holdoutCount > 0);
  assert.equal(result.currentDecision.predictedAt, barsBySymbol.SPY.at(-1).at);
  assert.equal(result.currentDecision.outcomeResolved, false);
  assert.ok(Object.values(result.currentDecision.targetWeights).every((weight) => weight >= 0 && weight <= 0.6 + 1e-9));
  assert.equal(result.independentRecordReceipt.id, "urn:witnessJournal:receipt:1");
});

test("a five-day decision uses only same-horizon SignCell forecasts and retains their evidence", async () => {
  const barsBySymbol = panel();
  const asOf = barsBySymbol.SPY.at(-1).at;
  const captured = [];
  const actual = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const providers = {
    assayAgentSectionDescent: ({ sections }) => { captured.push(sections); return actual({ sections }); },
    assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph,
    fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio,
    selectModelCandidate, formPurgedWalkForwardFolds, measureReturnRiskFeatures,
    measureTechnicalAnalysisFeatures, measureSheafLaplacian, simulateEventDrivenExecution,
  };
  const run = createCausalPortfolioLearningCircuit({
    providers, recordResult: async () => ({ id: "urn:receipt:synthetic-horizon-test" }),
  });
  const make = (provider, horizonDays, expectedExcessReturn) => ({
    provider, symbol: "BLK", horizonDays, expectedExcessReturn,
    observedAt: asOf, confidence: 0.9, evidenceReferences: [`ni:test:${provider}`],
  });
  const result = await run({
    barsBySymbol, asOf,
    agentForecasts: [
      make("bull-five-1", 5, 0.03),
      make("bull-five-2", 5, 0.02),
      make("bear-sixty", 60, -0.04),
    ],
    mandate: { type: "PortfolioAllocationMandate", id: "urn:mandate:synthetic-horizon-test",
      maximumWeight: 0.6, grossLimit: 1, leverageLimit: 1, shorting: false, maximumDrawdown: 0.5 },
    config: { warmup: 140, trainingWindow: 100, graphWindow: 40, horizon: 5 },
  });
  assert.ok(captured.length > 0);
  assert.ok(captured.every((sections) => sections.length === 2 &&
    sections.every((row) => row.coordinate === "BLK:5" && row.provider !== "bear-sixty")));
  const scope = result.currentDecision.sectionAssays.BLK;
  assert.equal(scope.contradictionHeld, false);
  assert.equal(scope.coordinateReadings["BLK:5"].charge, "potential");
  assert.equal(scope.coordinateReadings["BLK:5"].sourceReferencesAttached, true);
  assert.equal(scope.cells[0].for.length, 2);
});

test("signed rank-one graph transport is a preregisterable separate challenger, not silent incumbent math", async () => {
  const barsBySymbol = panel(), asOf = barsBySymbol.SPY.at(-1).at;
  const providers = {
    assayAgentSectionDescent: createAgentSectionDescentAssay({ measureSheafLaplacian }),
    assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph,
    fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio,
    selectModelCandidate, formPurgedWalkForwardFolds,
    measureReturnRiskFeatures, measureTechnicalAnalysisFeatures,
    measureSheafLaplacian, simulateEventDrivenExecution,
  };
  let written = 0;
  const run = createCausalPortfolioLearningCircuit({
    providers, recordResult: async () => ({ id: `urn:record:graph-transport-${++written}` }),
  });
  const request = {
    barsBySymbol, asOf,
    mandate: { type: "PortfolioAllocationMandate", id: "urn:mandate:signed-graph",
      maximumWeight: 0.6, grossLimit: 1, leverageLimit: 1, shorting: false,
      maximumDrawdown: 0.5 },
    config: { warmup: 140, trainingWindow: 100, graphWindow: 40, horizon: 5,
      compareSignedTransport: true },
  };
  const withSigned = await run(request);
  assert.deepEqual(Object.keys(withSigned.evaluations),
    ["baseline", "technical", "obsmetrologiaTechnical", "obsmetrologiaSigned"]);
  assert.equal(withSigned.claims.signedRankOneTransportEvaluated, true);
  assert.equal(typeof withSigned.claims.signedRankOneTransportHoldoutBetterThanUnsigned, "boolean");
  assert.equal(withSigned.claims.alphaEstablished, false);
  assert.equal(withSigned.claims.liveReadinessEstablished, false);
  assert.ok(["baseline", "technical", "obsmetrologiaTechnical", "obsmetrologiaSigned"].includes(
    withSigned.tournament.selectedUsingValidationOnly.endsWith("obsmetrologia-signed-transport")
      ? "obsmetrologiaSigned"
      : withSigned.tournament.selectedUsingValidationOnly.endsWith("obsmetrologia-technical")
      ? "obsmetrologiaTechnical"
      : withSigned.tournament.selectedUsingValidationOnly.endsWith("technical-analysis")
      ? "technical" : "baseline"));
  const incumbent = await run({ ...request, config: { ...request.config, compareSignedTransport: false } });
  assert.deepEqual(Object.keys(incumbent.evaluations),
    ["baseline", "technical", "obsmetrologiaTechnical"]);
  assert.equal(incumbent.claims.signedRankOneTransportEvaluated, false);
  assert.equal(incumbent.claims.signedRankOneTransportHoldoutBetterThanUnsigned, null);
  assert.equal(written, 2);
});
