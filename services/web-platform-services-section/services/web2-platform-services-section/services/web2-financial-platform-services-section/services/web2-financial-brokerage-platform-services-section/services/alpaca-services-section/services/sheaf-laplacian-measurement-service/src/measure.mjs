const finite = (value, label) => {
  const number = Number(value);
  if (!((typeof value === "number") || (typeof value === "string" && value.trim() !== "")) ||
      !Number.isFinite(number) || Object.is(number, -0))
    throw new TypeError(`${label}-invalid`);
  return number;
};

export function measureSheafLaplacian({ sections, edges } = {}) {
  if (!sections || typeof sections !== "object" || Array.isArray(sections) || !Array.isArray(edges)) throw new TypeError("finite-sections-and-edges-required");
  const entities = Object.keys(sections).sort();
  const values = Object.fromEntries(entities.map((entity) => [entity, finite(sections[entity], `section-${entity}`)]));
  const adjacency = Object.fromEntries(entities.map((entity) => [entity, []]));
  let disagreementEnergy = 0, signedParallelTransportPresent = false;
  const comparedPairs = new Set();
  for (const edge of edges) {
    if (!entities.includes(edge?.left) || !entities.includes(edge?.right) || edge.left === edge.right) throw new TypeError("laplacian-edge-invalid");
    const pair = JSON.stringify([edge.left, edge.right].sort());
    if (comparedPairs.has(pair)) throw new TypeError("duplicate-undirected-laplacian-edge");
    comparedPairs.add(pair);
    const weight = finite(edge.weight, "edge-weight");
    if (weight < 0) throw new RangeError("negative-edge-weight-refused");
    const transport = edge.transport === undefined ? 1 : edge.transport;
    if (transport !== 1 && transport !== -1) throw new TypeError("rank-one-transport-invalid");
    if (edge.observedCorrelation !== undefined &&
        (!Number.isFinite(edge.observedCorrelation) ||
         Math.abs(edge.observedCorrelation) > 1 ||
         (edge.observedCorrelation < 0 ? transport !== -1 : transport !== 1)))
      throw new TypeError("correlation-transport-mismatch");
    if (transport < 0) signedParallelTransportPresent = true;
    adjacency[edge.left].push([edge.right, weight, transport]);
    adjacency[edge.right].push([edge.left, weight, transport]);
    disagreementEnergy += weight * (values[edge.left] - transport * values[edge.right]) ** 2;
  }
  if (!Number.isFinite(disagreementEnergy)) throw new RangeError("laplacian-disagreement-overflow");
  const measurement = Object.fromEntries(entities.map((entity) => {
    const degree = adjacency[entity].reduce((sum, [, weight]) => sum + weight, 0);
    const smooth = degree > 0 ? adjacency[entity].reduce(
      (sum, [other, weight, transport]) => sum + weight * transport * values[other], 0
    ) / degree : values[entity];
    const residual = values[entity] - smooth;
    if (![degree, smooth, residual].every(Number.isFinite))
      throw new RangeError("laplacian-nonfinite-measurement");
    return [entity, Object.freeze({ section: values[entity], degree, smooth, laplacianResidual: residual })];
  }));
  // This is the Dirichlet energy of a scalar graph with identity transport.
  // It is not a general sheaf Laplacian: no stalks, restriction maps or
  // compatibility cocycle were supplied. Preserve the legacy type for callers.
  return Object.freeze({ type: "SheafLaplacianMeasurement", version: 1,
    operator: signedParallelTransportPresent ? "signed-rank-one-graph-laplacian" : "weighted-scalar-graph-laplacian",
    signedParallelTransportPresent,
    sheafRestrictionMapsProvided: false, sheafGluingProven: false,
    measurement: Object.freeze(measurement), disagreementEnergy, edgeCount: edges.length,
    empiricalMarketEquivalenceEstablished: false, effect: "measurement-only" });
}
