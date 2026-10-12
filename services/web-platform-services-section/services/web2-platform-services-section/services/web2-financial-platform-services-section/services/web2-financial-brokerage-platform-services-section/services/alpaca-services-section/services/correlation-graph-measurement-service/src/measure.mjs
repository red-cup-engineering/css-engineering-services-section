// Correlation is not causation, and an unidentifiable coefficient is not zero.
// In particular, a flat/stale price tape has zero variance, not evidence that
// an asset has no relationship with the rest of the portfolio.
const admissible = (value) =>
  (typeof value === "number" || (typeof value === "string" && value.trim() !== "")) &&
  Number.isFinite(Number(value));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function correlation(left, right) {
  const lm = mean(left), rm = mean(right);
  if (!Number.isFinite(lm) || !Number.isFinite(rm))
    throw new RangeError("correlation-nonfinite-input-moments");
  let numerator = 0, ld = 0, rd = 0;
  for (let index = 0; index < left.length; index += 1) {
    const l = left[index] - lm, r = right[index] - rm;
    numerator += l * r; ld += l * l; rd += r * r;
  }
  if (!(ld > 0 && rd > 0)) throw new RangeError("correlation-unidentifiable-zero-variance");
  const denominator = Math.sqrt(ld) * Math.sqrt(rd);
  const observed = numerator / denominator;
  if (!Number.isFinite(observed)) throw new RangeError("correlation-nonfinite-moment");
  return Math.max(-1, Math.min(1, observed));
}

/**
 * Pairwise Pearson measurement from a prealigned observation panel.
 * Heterophilic edges explicitly provide signed parallel transport for the
 * downstream rank-one graph operator; the sign must never be erased simply
 * because its absolute correlation is high. No inference of causation or a
 * financially executable hedge follows from this statistic.
 */
export function measureCorrelationGraph({ returnsByEntity, positiveOnly = true, minimumAbsoluteCorrelation = 0 } = {}) {
  if (!returnsByEntity || typeof returnsByEntity !== "object" || Array.isArray(returnsByEntity))
    throw new TypeError("return-histories-required");
  if (typeof positiveOnly !== "boolean" || !Number.isFinite(minimumAbsoluteCorrelation) ||
      minimumAbsoluteCorrelation < 0 || minimumAbsoluteCorrelation > 1)
    throw new TypeError("correlation-selection-parameters-invalid");
  const entities = Object.keys(returnsByEntity).sort(), length = returnsByEntity[entities[0]]?.length;
  if (entities.length < 2 || !Number.isInteger(length) || length < 3 ||
      entities.some((entity) => !Array.isArray(returnsByEntity[entity]) ||
        returnsByEntity[entity].length !== length || returnsByEntity[entity].some((value) => !admissible(value))))
    throw new TypeError("equal-finite-return-histories-required");
  const numeric = Object.fromEntries(entities.map((entity) => [entity, returnsByEntity[entity].map(Number)]));
  const edges = [];
  for (let left = 0; left < entities.length; left += 1)
    for (let right = left + 1; right < entities.length; right += 1) {
      const observed = correlation(numeric[entities[left]], numeric[entities[right]]);
      const weight = positiveOnly ? Math.max(0, observed) : Math.abs(observed);
      if (weight >= minimumAbsoluteCorrelation && weight > 0)
        edges.push(Object.freeze({
          left: entities[left], right: entities[right], weight,
          observedCorrelation: observed,
          ...(positiveOnly ? {} : { transport: observed < 0 ? -1 : 1 }),
        }));
    }
  return Object.freeze({
    type: "CorrelationGraphMeasurement", version: 1, entities, observations: length,
    edges: Object.freeze(edges), causationEstablished: false, effect: "measurement-only",
  });
}
