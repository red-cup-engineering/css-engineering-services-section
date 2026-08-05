const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const correlation = (left, right) => {
  const lm = mean(left), rm = mean(right);
  let numerator = 0, ld = 0, rd = 0;
  for (let index = 0; index < left.length; index += 1) {
    const l = left[index] - lm, r = right[index] - rm;
    numerator += l * r; ld += l * l; rd += r * r;
  }
  return ld > 0 && rd > 0 ? Math.max(-1, Math.min(1, numerator / Math.sqrt(ld * rd))) : 0;
};

export function measureCorrelationGraph({ returnsByEntity, positiveOnly = true, minimumAbsoluteCorrelation = 0 } = {}) {
  if (!returnsByEntity || typeof returnsByEntity !== "object" || Array.isArray(returnsByEntity)) throw new TypeError("return-histories-required");
  const entities = Object.keys(returnsByEntity).sort(), length = returnsByEntity[entities[0]]?.length;
  if (entities.length < 2 || !Number.isInteger(length) || length < 3 || entities.some((entity) => !Array.isArray(returnsByEntity[entity]) || returnsByEntity[entity].length !== length || returnsByEntity[entity].some((value) => !Number.isFinite(Number(value))))) throw new TypeError("equal-finite-return-histories-required");
  const edges = [];
  for (let left = 0; left < entities.length; left += 1) for (let right = left + 1; right < entities.length; right += 1) {
    const observed = correlation(returnsByEntity[entities[left]].map(Number), returnsByEntity[entities[right]].map(Number));
    const weight = positiveOnly ? Math.max(0, observed) : Math.abs(observed);
    if (weight >= minimumAbsoluteCorrelation && weight > 0) edges.push(Object.freeze({ left: entities[left], right: entities[right], weight, observedCorrelation: observed }));
  }
  return Object.freeze({ type: "CorrelationGraphMeasurement", version: 1, entities, observations: length, edges: Object.freeze(edges), causationEstablished: false, effect: "measurement-only" });
}
