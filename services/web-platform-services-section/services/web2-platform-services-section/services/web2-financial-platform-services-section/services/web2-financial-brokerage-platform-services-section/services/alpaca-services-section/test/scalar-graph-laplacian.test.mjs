import assert from "node:assert/strict";
import test from "node:test";
import { measureSheafLaplacian } from "@red-cup-engineering/sheaf-laplacian-measurement-service";

test("the existing Laplacian computes undirected scalar Dirichlet energy", () => {
  const result = measureSheafLaplacian({
    sections: { a: 1, b: -1 },
    edges: [{ left: "a", right: "b", weight: 0.5 }],
  });
  assert.equal(result.operator, "weighted-scalar-graph-laplacian");
  assert.equal(result.sheafRestrictionMapsProvided, false);
  assert.equal(result.sheafGluingProven, false);
  assert.equal(result.empiricalMarketEquivalenceEstablished, false);
  assert.equal(result.disagreementEnergy, 2);
  assert.equal(result.measurement.a.laplacianResidual, 2);
  assert.equal(result.measurement.b.laplacianResidual, -2);
  assert.equal(result.measurement.a.degree, 0.5);
});

test("unconnected forecasts carry no observed disagreement, not a proven sheaf", () => {
  const result = measureSheafLaplacian({ sections: { a: 1, b: -1 }, edges: [] });
  assert.equal(result.edgeCount, 0);
  assert.equal(result.disagreementEnergy, 0);
  assert.equal(result.sheafGluingProven, false);
  assert.equal(result.measurement.a.laplacianResidual, 0);
});

test("duplicate undirected edges must not multiply disagreement energy", () => {
  const request = { sections: { a: 1, b: -1 }, edges: [
    { left: "a", right: "b", weight: 0.4 },
    { left: "b", right: "a", weight: 0.4 },
  ] };
  assert.throws(() => measureSheafLaplacian(request), /duplicate-undirected-laplacian-edge/);
});

test("missing, negative, nonfinite or invalid weights do not become evidence", () => {
  for (const weight of [undefined, null, "", -1, NaN, Infinity, false]) {
    assert.throws(() => measureSheafLaplacian({
      sections: { a: 1, b: -1 }, edges: [{ left: "a", right: "b", weight }],
    }));
  }
  assert.throws(() => measureSheafLaplacian({
    sections: { a: 1, b: 1e308 }, edges: [{ left: "a", right: "b", weight: 1e308 }],
  }), /laplacian-disagreement-overflow/);
});

test("missing and ambiguous numerical sections cannot be interpreted as zero", () => {
  for (const value of [null, "", undefined, false, NaN, Infinity]) {
    assert.throws(() => measureSheafLaplacian({
      sections: { a: value, b: 1 }, edges: [{ left: "a", right: "b", weight: 1 }],
    }));
  }
});
