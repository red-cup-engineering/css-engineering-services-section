const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};

export function measureSheafLaplacian({ sections, edges } = {}) {
  if (!sections || typeof sections !== "object" || Array.isArray(sections) || !Array.isArray(edges)) throw new TypeError("finite-sections-and-edges-required");
  const entities = Object.keys(sections).sort();
  const values = Object.fromEntries(entities.map((entity) => [entity, finite(sections[entity], `section-${entity}`)]));
  const adjacency = Object.fromEntries(entities.map((entity) => [entity, []]));
  let disagreementEnergy = 0;
  for (const edge of edges) {
    if (!entities.includes(edge?.left) || !entities.includes(edge?.right) || edge.left === edge.right) throw new TypeError("laplacian-edge-invalid");
    const weight = finite(edge.weight, "edge-weight");
    if (weight < 0) throw new RangeError("negative-edge-weight-refused");
    adjacency[edge.left].push([edge.right, weight]);
    adjacency[edge.right].push([edge.left, weight]);
    disagreementEnergy += weight * (values[edge.left] - values[edge.right]) ** 2;
  }
  const measurement = Object.fromEntries(entities.map((entity) => {
    const degree = adjacency[entity].reduce((sum, [, weight]) => sum + weight, 0);
    const smooth = degree > 0 ? adjacency[entity].reduce((sum, [other, weight]) => sum + weight * values[other], 0) / degree : values[entity];
    return [entity, Object.freeze({ section: values[entity], degree, smooth, laplacianResidual: values[entity] - smooth })];
  }));
  return Object.freeze({ type: "SheafLaplacianMeasurement", version: 1, measurement: Object.freeze(measurement), disagreementEnergy, edgeCount: edges.length, empiricalMarketEquivalenceEstablished: false, effect: "measurement-only" });
}
