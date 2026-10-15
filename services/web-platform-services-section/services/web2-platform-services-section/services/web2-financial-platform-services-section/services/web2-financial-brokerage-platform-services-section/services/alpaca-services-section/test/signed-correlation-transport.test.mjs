import assert from "node:assert/strict";
import test from "node:test";
import { measureCorrelationGraph } from "@red-cup-engineering/correlation-graph-measurement-service";
import { measureSheafLaplacian } from "@red-cup-engineering/sheaf-laplacian-measurement-service";

const opposite = { a: [1, 2, 3, 4, 5], b: [-1, -2, -3, -4, -5] };
test("opposite movements carry an explicit negative transport, not a positive neighbor weight", () => {
  const graph = measureCorrelationGraph({ returnsByEntity: opposite, positiveOnly: false });
  assert.equal(graph.causationEstablished, false);
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].observedCorrelation, -1);
  assert.equal(graph.edges[0].transport, -1);
  const result = measureSheafLaplacian({ sections: { a: 1, b: -1 }, edges: graph.edges });
  assert.equal(result.operator, "signed-rank-one-graph-laplacian");
  assert.equal(result.signedParallelTransportPresent, true);
  assert.equal(result.disagreementEnergy, 0);
  assert.equal(result.measurement.a.laplacianResidual, 0);
  assert.equal(result.measurement.b.laplacianResidual, 0);
  assert.equal(result.sheafGluingProven, false);
});

test("without signed transport, opposing sections remain in positive scalar disagreement", () => {
  const result = measureSheafLaplacian({
    sections: { a: 1, b: -1 },
    edges: [{ left: "a", right: "b", weight: 1 }],
  });
  assert.equal(result.disagreementEnergy, 4);
  assert.equal(result.signedParallelTransportPresent, false);
  assert.throws(() => measureSheafLaplacian({
    sections: { a: 1, b: -1 },
    edges: [{ left: "a", right: "b", weight: 1, observedCorrelation: -1 }],
  }), /correlation-transport-mismatch/);
});

test("zero-variance observations are unidentifiable correlation, not measured independence", () => {
  assert.throws(() => measureCorrelationGraph({
    returnsByEntity: { a: [1, 1, 1, 1], b: [1, 2, 3, 4] },
  }), /correlation-unidentifiable-zero-variance/);
  const positiveOnly = measureCorrelationGraph({ returnsByEntity: opposite });
  assert.deepEqual(positiveOnly.edges, []);
});

test("missing observations and malformed selection limits are refused", () => {
  for (const bad of [null, "", undefined, NaN, false]) {
    assert.throws(() => measureCorrelationGraph({
      returnsByEntity: { a: [1, bad, 3], b: [3, 2, 1] },
    }));
  }
  for (const config of [{ positiveOnly: "false" }, { minimumAbsoluteCorrelation: -0.1 }, { minimumAbsoluteCorrelation: 1.1 }]) {
    assert.throws(() => measureCorrelationGraph({ returnsByEntity: opposite, ...config }),
      /correlation-selection-parameters-invalid/);
  }
});

test("positive correlation retains identity transport and measured zero Dirichlet energy", () => {
  const graph = measureCorrelationGraph({
    returnsByEntity: { a: [1, 2, 3, 4, 5], b: [2, 4, 6, 8, 10] }, positiveOnly: false,
  });
  assert.equal(graph.edges[0].transport, 1);
  const result = measureSheafLaplacian({ sections: { a: 1, b: 1 }, edges: graph.edges });
  assert.equal(result.disagreementEnergy, 0);
  assert.equal(result.sheafGluingProven, false);
});
