import assert from "node:assert/strict";
import test from "node:test";
import { createCausalFeatureFrameService } from "../scripts/frames.mjs";
import { assayCausalPanel } from "@red-cup-engineering/causal-market-panel-assay-service";
import { measureReturnRiskFeatures } from "@red-cup-engineering/return-risk-feature-measurement-service";
import { measureTechnicalAnalysisFeatures } from "../scripts/technical-analysis-feature-measure.mjs";
import { measureCorrelationGraph } from "@red-cup-engineering/correlation-graph-measurement-service";
import { measureSheafLaplacian } from "@red-cup-engineering/sheaf-laplacian-measurement-service";
import { measureCausalPatchNovelty } from "@red-cup-engineering/causal-tiling-novelty-measurement-service";

test("forms label-free causal frames with Obsmetrologia measurements", () => {
  const barsBySymbol = Object.fromEntries(["AAA", "BBB", "SPY"].map((symbol, offset) => [symbol, Array.from({ length: 200 }, (_, index) => { const close = 100 + index * (1 + offset / 10); return { at: new Date(Date.UTC(2025, 0, index + 1)).toISOString(), high: close + 1, low: close - 1, close, volume: 1000 + index, vwap: close }; })]));
  const form = createCausalFeatureFrameService({ providers: { assayCausalPanel, measureReturnRiskFeatures, measureTechnicalAnalysisFeatures, measureCorrelationGraph, measureSheafLaplacian, measureCausalPatchNovelty } });
  const result = form({ barsBySymbol, benchmark: "SPY", asOf: barsBySymbol.SPY.at(-1).at });
  assert.ok(result.frames.length > 100);
  assert.equal(result.frames.at(-1).labelsPresent, false);
  assert.ok(Number.isFinite(result.frames.at(-1).input.features.AAA.sheafEnergy));
  assert.ok(Number.isFinite(result.frames.at(-1).input.features.AAA.rsi14Centered));
});
