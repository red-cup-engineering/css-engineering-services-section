const numeric = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || Object.is(number, -0)) throw new TypeError(`${label}-invalid`);
  return number;
};

export function assayCausalPanel({ seriesByEntity, asOf, minimumEntities = 2, minimumObservations = 3 } = {}) {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff) || !seriesByEntity || typeof seriesByEntity !== "object" || Array.isArray(seriesByEntity)) throw new TypeError("causal-panel-input-invalid");
  const entities = Object.keys(seriesByEntity).sort();
  if (entities.length < minimumEntities) throw new RangeError("causal-panel-entities-insufficient");
  const indexed = new Map();
  for (const entity of entities) {
    const observations = seriesByEntity[entity];
    if (typeof entity !== "string" || !entity || !Array.isArray(observations)) throw new TypeError("causal-panel-series-invalid");
    const map = new Map();
    for (const observation of observations) {
      const at = Date.parse(observation?.at);
      if (!Number.isFinite(at) || at > cutoff || map.has(at)) throw new TypeError(at > cutoff ? "future-observation-refused" : "causal-coordinate-invalid");
      map.set(at, Object.freeze({
        at: new Date(at).toISOString(),
        value: numeric(observation.value, "observation-value"),
        auxiliary: Object.freeze(Object.fromEntries(Object.entries(observation.auxiliary ?? {}).map(([key, value]) => [key, numeric(value, `auxiliary-${key}`)]))),
      }));
    }
    indexed.set(entity, map);
  }
  const coordinates = [...indexed.get(entities[0]).keys()].filter((at) => entities.every((entity) => indexed.get(entity).has(at))).sort((left, right) => left - right);
  if (coordinates.length < minimumObservations) throw new RangeError("causal-panel-observations-insufficient");
  const panel = coordinates.map((at) => Object.freeze({
    at: new Date(at).toISOString(),
    values: Object.freeze(Object.fromEntries(entities.map((entity) => [entity, indexed.get(entity).get(at)]))),
  }));
  return Object.freeze({ type: "CausalPanelAssay", version: 1, asOf: new Date(cutoff).toISOString(), entities, panel: Object.freeze(panel), leakageDetected: false, effect: "assay-only" });
}
