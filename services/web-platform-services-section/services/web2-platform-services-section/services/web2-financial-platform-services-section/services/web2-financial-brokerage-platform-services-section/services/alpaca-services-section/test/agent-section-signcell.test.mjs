import assert from "node:assert/strict";
import test from "node:test";
import { address, knowledgeReading } from "@red-cup-engineering/signcell/cell";
import { createAgentSectionDescentAssay } from "../scripts/agent-section-descent-assay.mjs";
import { measureSheafLaplacian } from "../scripts/sheaf-laplacian-measure.mjs";

const assay = createAgentSectionDescentAssay({ measureSheafLaplacian });
const forecast = (provider, coordinate, value, confidence = 0.9, extra = {}) =>
  ({ provider, coordinate, value, confidence, ...extra });

test("genuine same-coordinate disagreement is a SignCell FOUR contradiction, not consensus", () => {
  const result = assay({ sections: [
    forecast("urn:one", "BLK:5", 0.05, 0.8, { evidenceReferences: ["ni:test:one"] }),
    forecast("urn:two", "BLK:5", -0.04, 0.9, { evidenceReferences: ["ni:test:two"] }),
  ] });
  assert.equal(result.version, 2);
  assert.equal(result.contradictionHeld, true);
  assert.equal(result.coordinateReadings["BLK:5"].charge, "stable");
  assert.equal(result.coordinateReadings["BLK:5"].sourceReferencesAttached, true);
  assert.deepEqual(result.four, { positiveEvidence: true, negativeEvidence: true });
  assert.equal(knowledgeReading(result.cells[0]), "stable");
  assert.equal(address(result.cells[0]), result.coordinateReadings["BLK:5"].address);
  assert.equal(result.cells[0].for.length, 1);
  assert.equal(result.cells[0].against.length, 1);
  assert.deepEqual(result.cells[0].for[0].evidenceReferences, ["ni:test:one"]);
  assert.equal(result.forcedConsensus, false);
  assert.equal(result.sheafGluingProven, false);
});

test("opposite forecasts for different horizons are not contradictions or sheaf-gluing proofs", () => {
  const result = assay({ sections: [
    forecast("urn:five", "BLK:5", 0.04),
    forecast("urn:sixty", "BLK:60", -0.03),
  ] });
  assert.equal(result.contradictionHeld, false);
  assert.equal(result.comparedEdgeCount, 0);
  assert.equal(result.overlapObserved, false);
  assert.equal(result.gluesWithinTolerance, false);
  assert.equal(result.disagreementEnergy, 0);
  assert.equal(result.coordinateReadings["BLK:5"].charge, "potential");
  assert.equal(result.coordinateReadings["BLK:60"].charge, "active");
  assert.notEqual(result.coordinateReadings["BLK:5"].address, result.coordinateReadings["BLK:60"].address);
});

test("the same researcher can speak on several horizons without becoming two independent observers", () => {
  const result = assay({ sections: [
    forecast("urn:one", "BLK:5", 0.03),
    forecast("urn:one", "BLK:60", -0.02),
  ] });
  assert.deepEqual(result.providers, ["urn:one"]);
  assert.equal(result.contradictionHeld, false);
  assert.throws(() => assay({ sections: [
    forecast("urn:one", "BLK:5", 0.03), forecast("urn:one", "BLK:5", -0.02),
  ] }), /duplicate-provider-coordinate-forecast/);
});

test("unwitnessed and low-confidence forecasts remain FOUR bottom, not false or confirmed", () => {
  const result = assay({ sections: [
    forecast("urn:one", "QQQ:20", 0.03, 0.2),
    forecast("urn:two", "QQQ:20", -0.02, 0.3),
  ], confidenceFloor: 0.5 });
  assert.equal(result.coordinateReadings["QQQ:20"].charge, "absurd");
  assert.equal(result.coordinateReadings["QQQ:20"].supporters, 0);
  assert.equal(result.coordinateReadings["QQQ:20"].refuters, 0);
  assert.equal(result.contradictionHeld, false);
  assert.equal(result.confidenceCalibrationEstablished, false);
});

test("coordinate-wise content addresses and FOUR readings do not depend on input ordering", () => {
  const sections = [
    forecast("urn:a", "DNN:5", -0.04, 0.7),
    forecast("urn:b", "DNN:5", 0.03, 0.8),
    forecast("urn:c", "QQQ:20", 0.02, 0.9),
  ];
  const one = assay({ sections }), two = assay({ sections: [...sections].reverse() });
  assert.deepEqual(one.coordinates, two.coordinates);
  assert.deepEqual(one.coordinateReadings, two.coordinateReadings);
  assert.equal(one.disagreementEnergy, two.disagreementEnergy);
});

test("malformed probabilities, identities, and supplied evidence references are refused", () => {
  const good = forecast("urn:one", "SPY:5", 0.01);
  for (const row of [
    { ...good, confidence: -0.1 }, { ...good, confidence: 1.01 },
    { ...good, confidence: null }, { ...good, value: NaN },
    { ...good, value: "" }, { ...good, provider: "" },
    { ...good, coordinate: " " }, { ...good, evidenceReferences: [null] },
  ]) assert.throws(() => assay({ sections: [row, forecast("urn:two", "SPY:5", 0.02)] }));
  assert.throws(() => assay({ sections: [good, forecast("urn:two", "SPY:5", 0.02)], confidenceFloor: -0.1 }), /confidence-floor-out-of-range/);
});

test("two analysis providers citing the same source are not independent observations", () => {
  const same = assay({ sections: [
    forecast("urn:research-1", "ONDS:5", 0.03, 0.9, { evidenceReferences: ["ni:source:one", "ni:source:one"] }),
    forecast("urn:research-2", "ONDS:5", 0.02, 0.8, { evidenceReferences: ["ni:source:one"] }),
  ] });
  assert.equal(same.coordinateReadings["ONDS:5"].charge, "potential");
  assert.equal(same.coordinateReadings["ONDS:5"].crossProviderSourceReuseDetected, true);
  assert.deepEqual(same.coordinateReadings["ONDS:5"].sharedSourceReferences, ["ni:source:one"]);
  assert.equal(same.coordinateReadings["ONDS:5"].sourceIndependenceEstablished, false);
  assert.equal(same.crossProviderSourceReuseDetected, true);
  assert.deepEqual(same.cells[0].for[0].evidenceReferences, ["ni:source:one"]);
  const distinct = assay({ sections: [
    forecast("urn:research-1", "ONDS:5", 0.03, 0.9, { evidenceReferences: ["ni:source:a"] }),
    forecast("urn:research-2", "ONDS:5", 0.02, 0.8, { evidenceReferences: ["ni:source:b"] }),
  ] });
  assert.equal(distinct.crossProviderSourceReuseDetected, false);
  assert.equal(distinct.coordinateReadings["ONDS:5"].sourceIndependenceEstablished, false,
    "different source IDs alone do not prove independence");
});
