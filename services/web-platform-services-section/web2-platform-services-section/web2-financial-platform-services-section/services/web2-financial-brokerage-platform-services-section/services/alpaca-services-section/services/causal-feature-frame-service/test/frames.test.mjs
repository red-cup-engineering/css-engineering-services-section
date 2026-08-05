import assert from "node:assert/strict";
import test from "node:test";
import { createCausalFeatureFrameService } from "../src/frames.mjs";
import { assayCausalPanel } from "../../causal-market-panel-assay-service/src/assay.mjs";
import { measureReturnRiskFeatures } from "../../return-risk-feature-measurement-service/src/measure.mjs";
import { measureCorrelationGraph } from "../../correlation-graph-measurement-service/src/measure.mjs";
import { measureSheafLaplacian } from "../../sheaf-laplacian-measurement-service/src/measure.mjs";
import { measureCausalPatchNovelty } from "../../causal-tiling-novelty-measurement-service/src/measure.mjs";

test("forms label-free causal frames with Obsmetrologia measurements", () => {
  const barsBySymbol = Object.fromEntries(["AAA", "BBB", "SPY"].map((symbol, offset) => [symbol, Array.from({ length: 200 }, (_, index) => ({ at: new Date(Date.UTC(2025, 0, index + 1)).toISOString(), close: 100 + index * (1 + offset / 10), volume: 1000 + index, vwap: 100 + index * (1 + offset / 10) }))]));
  const form = createCausalFeatureFrameService({ providers: { assayCausalPanel, measureReturnRiskFeatures, measureCorrelationGraph, measureSheafLaplacian, measureCausalPatchNovelty } });
  const result = form({ barsBySymbol, benchmark: "SPY", asOf: barsBySymbol.SPY.at(-1).at });
  assert.ok(result.frames.length > 100);
  assert.equal(result.frames.at(-1).labelsPresent, false);
  assert.ok(Number.isFinite(result.frames.at(-1).input.features.AAA.sheafEnergy));
});
