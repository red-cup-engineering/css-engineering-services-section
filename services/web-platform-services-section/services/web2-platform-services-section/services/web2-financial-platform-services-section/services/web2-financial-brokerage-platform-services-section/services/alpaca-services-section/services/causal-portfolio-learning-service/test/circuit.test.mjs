import assert from "node:assert/strict";
import test from "node:test";
import { createCausalPortfolioLearningCircuit } from "../src/circuit.mjs";
import { createAgentSectionDescentAssay } from "../../agent-section-descent-assay-service/src/assay.mjs";
import { assayCausalPanel } from "../../causal-market-panel-assay-service/src/assay.mjs";
import { measureCausalPatchNovelty } from "../../causal-tiling-novelty-measurement-service/src/measure.mjs";
import { measureCorrelationGraph } from "../../correlation-graph-measurement-service/src/measure.mjs";
import { fitDeterministicRidge, predictDeterministicRidge } from "../../deterministic-ridge-fit-service/src/ridge.mjs";
import { allocateMandatePortfolio } from "@red-cup-engineering/mandate-portfolio-allocation-service";
import { selectModelCandidate } from "@red-cup-engineering/model-tournament-service";
import { formPurgedWalkForwardFolds } from "@red-cup-engineering/purged-walk-forward-fold-service";
import { measureReturnRiskFeatures } from "../../return-risk-feature-measurement-service/src/measure.mjs";
import { measureSheafLaplacian } from "../../sheaf-laplacian-measurement-service/src/measure.mjs";
import { replayTransactionCosts } from "@red-cup-engineering/transaction-cost-replay-service";

function panel(length = 260) {
  const symbols = ["BLK", "QQQ", "SPY", "TLT"], bars = Object.fromEntries(symbols.map((symbol) => [symbol, []])), prices = Object.fromEntries(symbols.map((symbol) => [symbol, 100]));
  for (let index = 0; index < length; index += 1) {
    const market = 0.0002 + 0.006 * Math.sin(index / 11);
    prices.SPY *= Math.exp(market); prices.QQQ *= Math.exp(1.2 * market + 0.001 * Math.sin(index / 5)); prices.TLT *= Math.exp(-0.3 * market + 0.001 * Math.cos(index / 7)); prices.BLK *= Math.exp(0.85 * market + 0.0015 * Math.sin((index - 3) / 11));
    const at = new Date(Date.UTC(2025, 0, 2) + index * 86_400_000).toISOString();
    for (const symbol of symbols) bars[symbol].push({ at, close: prices[symbol], volume: 1_000_000 + index, vwap: prices[symbol] * 0.9999 });
  }
  return bars;
}

test("composes atomic dies into recorded, non-executing walk-forward target weights", async () => {
  const barsBySymbol = panel();
  const assayAgentSectionDescent = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const providers = { assayAgentSectionDescent, assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph, fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio, selectModelCandidate, formPurgedWalkForwardFolds, measureReturnRiskFeatures, measureSheafLaplacian, replayTransactionCosts };
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
  assert.ok(result.folds.validationCount > 0 && result.folds.holdoutCount > 0);
  assert.equal(result.currentDecision.predictedAt, barsBySymbol.SPY.at(-1).at);
  assert.equal(result.currentDecision.outcomeResolved, false);
  assert.ok(Object.values(result.currentDecision.targetWeights).every((weight) => weight >= 0 && weight <= 0.6 + 1e-9));
  assert.equal(result.independentRecordReceipt.id, "urn:witnessJournal:receipt:1");
});

test("one causal horizon admits only the same-horizon research witnesses", async () => {
  const barsBySymbol = panel(), asOf = barsBySymbol.SPY.at(-1).at;
  const probes = [], actualAssay = createAgentSectionDescentAssay({ measureSheafLaplacian });
  const providers = {
    assayAgentSectionDescent: ({ sections }) => { probes.push(sections); return actualAssay({ sections }); },
    assayCausalPanel, measureCausalPatchNovelty, measureCorrelationGraph,
    fitDeterministicRidge, predictDeterministicRidge, allocateMandatePortfolio,
    selectModelCandidate, formPurgedWalkForwardFolds, measureReturnRiskFeatures,
    measureSheafLaplacian, replayTransactionCosts,
  };
  const run = createCausalPortfolioLearningCircuit({
    providers, recordResult: async () => ({ id: "urn:witness:synthetic-horizon" }),
  });
  const forecast = (provider, horizonDays, expectedExcessReturn) => ({
    symbol: "BLK", provider, horizonDays, observedAt: asOf,
    expectedExcessReturn, confidence: 0.8, evidenceReferences: [`urn:evidence:${provider}`],
  });
  const outcome = await run({
    barsBySymbol, asOf, agentForecasts: [
      forecast("five-a", 5, 0.03),
      forecast("five-b", 5, 0.02),
      forecast("sixty-negative", 60, -0.04),
    ],
    mandate: { type: "PortfolioAllocationMandate", id: "urn:mandate:synthetic-horizon",
      maximumWeight: 0.6, grossLimit: 1, leverageLimit: 1, shorting: false, maximumDrawdown: 0.5 },
    config: { warmup: 140, trainingWindow: 100, graphWindow: 40, horizon: 5 },
  });
  assert.ok(probes.length >= 1);
  assert.ok(probes.every((sections) => sections.length === 2 &&
    sections.every((section) => section.coordinate === "BLK:5" && section.provider !== "sixty-negative")));
  const assay = outcome.currentDecision.sectionAssays.BLK;
  assert.equal(assay.contradictionHeld, false);
  assert.equal(assay.coordinateReadings["BLK:5"].charge, "potential");
  assert.equal(assay.coordinateReadings["BLK:5"].sourceReferencesAttached, true);
  assert.equal(assay.cells[0].for.length, 2);
  assert.equal(outcome.claims.alphaEstablished, false);
});
