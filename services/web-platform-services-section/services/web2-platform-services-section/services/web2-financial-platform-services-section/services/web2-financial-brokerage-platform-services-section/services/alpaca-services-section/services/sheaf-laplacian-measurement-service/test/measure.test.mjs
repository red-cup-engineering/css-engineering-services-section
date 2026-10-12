import test from "node:test";
import assert from "node:assert/strict";
import { measureSheafLaplacian } from "../src/measure.mjs";

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} versus ${expected}`);

test("market-local disagreement is computed by SignGraph delta and Laplacian", () => {
  const m = measureSheafLaplacian({
    sections: { a: 0.1, b: 0.2 },
    edges: [{ left: "a", right: "b", weight: 4 }],
  });
  near(m.disagreementEnergy, 0.04);
  near(m.measurement.a.laplacianResidual, -0.1);
  near(m.measurement.b.laplacianResidual, 0.1);
  near(m.measurement.a.smooth, 0.2);
  assert.equal(m.sheafRestrictionMapsProvided, true);
  assert.equal(m.sheafGluingProven, false);
  assert.equal(m.empiricalMarketEquivalenceEstablished, false);
});

test("negative correlation changes transport but not evidence into prediction", () => {
  const edges = [{ left: "a", right: "b", weight: 9, transport: -1, observedCorrelation: -0.5 }];
  const compatible = measureSheafLaplacian({ sections: { a: 1, b: -1 }, edges });
  near(compatible.disagreementEnergy, 0);
  const opposed = measureSheafLaplacian({ sections: { a: 1, b: 1 }, edges });
  near(opposed.disagreementEnergy, 36);
  near(opposed.measurement.a.laplacianResidual, 2);
  assert.equal(opposed.operator, "signed-rank-one-graph-laplacian");
  assert.equal(opposed.sheafGluingProven, false);
});

test("modeled triangle can remain frustrated without forced global agreement", () => {
  const edges = [
    { left: "a", right: "b", weight: 1, transport: -1 },
    { left: "b", right: "c", weight: 1, transport: -1 },
    { left: "c", right: "a", weight: 1, transport: -1 },
  ];
  const m = measureSheafLaplacian({ sections: { a: 1, b: 1, c: 1 }, edges });
  near(m.disagreementEnergy, 12);
  assert.equal(m.edgeCount, 3);
  assert.equal(m.sheafGluingProven, false);
});

test("missing or malformed measured sections are not converted to zero stalks", () => {
  assert.throws(() => measureSheafLaplacian({ sections: { a: 1, b: null }, edges: [] }));
  assert.throws(() => measureSheafLaplacian({ sections: { a: 1 }, edges: [{ left: "a", right: "b", weight: 1 }] }));
  assert.throws(() => measureSheafLaplacian({ sections: { a: 1, b: 2 },
    edges: [{ left: "a", right: "b", weight: -1 }] }), /negative-edge-weight/);
});
