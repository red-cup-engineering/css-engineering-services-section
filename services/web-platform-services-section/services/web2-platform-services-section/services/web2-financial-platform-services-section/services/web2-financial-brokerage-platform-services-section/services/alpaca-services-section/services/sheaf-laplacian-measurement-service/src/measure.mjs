/**
 * Scalar market-research projections of SignGraph's actual cellular-sheaf
 * coboundary and Laplacian. The weighted signed restriction maps constitute
 * a rank-one local model, not empirical proof of financial dependence or
 * global sheaf gluing. Missing observations must not be read as zero.
 */
import { cellularSheaf, completeCochain, coboundary, apply, applyLaplacian } from "@red-cup-engineering/signgraph/cellular-sheaf";

const finite = (value, label) => {
  const number = Number(value);
  if (!((typeof value === "number") || (typeof value === "string" && value.trim() !== "")) ||
      !Number.isFinite(number) || Object.is(number, -0))
    throw new TypeError(`${label}-invalid`);
  return number;
};

export function measureSheafLaplacian({ sections, edges } = {}) {
  if (!sections || typeof sections !== "object" || Array.isArray(sections) || !Array.isArray(edges))
    throw new TypeError("finite-sections-and-edges-required");
  const entities = Object.keys(sections).sort();
  const values = Object.fromEntries(entities.map((entity) => [entity, finite(sections[entity], `section-${entity}`)]));
  const degrees = Object.fromEntries(entities.map((entity) => [entity, 0]));
  const comparedPairs = new Set(), incidences = [];
  let signedParallelTransportPresent = false;
  for (const edge of edges) {
    if (!Object.hasOwn(values, edge?.left) || !Object.hasOwn(values, edge?.right) || edge.left === edge.right)
      throw new TypeError("laplacian-edge-invalid");
    const pair = JSON.stringify([edge.left, edge.right].sort());
    if (comparedPairs.has(pair)) throw new TypeError("duplicate-undirected-laplacian-edge");
    comparedPairs.add(pair);
    const weight = finite(edge.weight, "edge-weight");
    if (weight < 0) throw new RangeError("negative-edge-weight-refused");
    const transport = edge.transport === undefined ? 1 : edge.transport;
    if (transport !== 1 && transport !== -1) throw new TypeError("rank-one-transport-invalid");
    if (edge.observedCorrelation !== undefined &&
        (!Number.isFinite(edge.observedCorrelation) || Math.abs(edge.observedCorrelation) > 1 ||
         (edge.observedCorrelation < 0 ? transport !== -1 : transport !== 1)))
      throw new TypeError("correlation-transport-mismatch");
    if (transport < 0) signedParallelTransportPresent = true;
    degrees[edge.left] += weight;
    degrees[edge.right] += weight;
    const amplitude = Math.sqrt(weight);
    // δx = √weight (transport·x_right - x_left).
    // Hence ||δx||² is the weighted signed disagreement energy and
    // L = δᵀδ is SignGraph's positive-semidefinite sheaf Laplacian.
    incidences.push({
      id: ["rank-one-restriction", edge.left, edge.right],
      from: edge.left, to: edge.right, dim: 1,
      restrict: { from: [[amplitude]], to: [[transport * amplitude]] },
    });
  }
  if (Object.values(degrees).some((degree) => !Number.isFinite(degree)))
    throw new RangeError("laplacian-degree-overflow");
  const sheaf = cellularSheaf({
    vertices: entities.map((id) => ({ id, dim: 1 })),
    edges: incidences,
  });
  const section = completeCochain(sheaf, entities.map((vertex) => ({ vertex, value: values[vertex] })));
  const residuals = apply(coboundary(sheaf), section);
  const gradients = applyLaplacian(sheaf, section);
  const disagreementEnergy = residuals.reduce((sum, value) => sum + value * value, 0);
  if (!Number.isFinite(disagreementEnergy) || !residuals.every(Number.isFinite) || !gradients.every(Number.isFinite))
    throw new RangeError("laplacian-disagreement-overflow");
  const measurement = Object.fromEntries(entities.map((entity, index) => {
    const degree = degrees[entity];
    const residual = degree > 0 ? gradients[index] / degree : 0;
    const smooth = values[entity] - residual;
    if (![smooth, residual].every(Number.isFinite))
      throw new RangeError("laplacian-nonfinite-measurement");
    return [entity, Object.freeze({ section: values[entity], degree, smooth, laplacianResidual: residual })];
  }));
  return Object.freeze({
    type: "SheafLaplacianMeasurement", version: 1,
    operator: signedParallelTransportPresent ? "signed-rank-one-graph-laplacian" : "weighted-scalar-graph-laplacian",
    restrictionModel: "modeled-weighted-rank-one-cellular-sheaf",
    signedParallelTransportPresent,
    sheafRestrictionMapsProvided: true, sheafGluingProven: false,
    measurement: Object.freeze(measurement),
    disagreementEnergy, edgeCount: edges.length,
    empiricalMarketEquivalenceEstablished: false, effect: "measurement-only",
  });
}
