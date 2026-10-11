const REQUIRED = ["assayCausalPanel", "measureReturnRiskFeatures", "measureCorrelationGraph", "measureSheafLaplacian", "measureCausalPatchNovelty"];
const logReturn = (values, from, to) => Math.log(values[to] / values[from]);
function marketSeries(barsBySymbol) {
  return Object.fromEntries(Object.entries(barsBySymbol).map(([symbol, bars]) => [symbol, bars.map((bar) => ({
    at: bar.at, value: bar.close, auxiliary: { volume: bar.volume ?? 0, reference: bar.vwap ?? bar.close }
  }))]));
}

export function createCausalFeatureFrameService({ providers }) {
  if (!providers || REQUIRED.some((name) => typeof providers[name] !== "function")) throw new TypeError("explicit-feature-measurement-providers-required");
  return function formFrames({ barsBySymbol, benchmark = "SPY", asOf, graphWindow = 60, patchSize = 5 } = {}) {
    if (!Number.isInteger(graphWindow) || graphWindow < 20 || !Number.isInteger(patchSize) || patchSize < 1) throw new TypeError("feature-frame-bounds-invalid");
    const panel = providers.assayCausalPanel({ seriesByEntity: marketSeries(barsBySymbol), asOf, minimumEntities: 3, minimumObservations: Math.max(180, graphWindow + 61) });
    if (!panel.entities.includes(benchmark)) throw new TypeError("feature-frame-benchmark-absent");
    const values = Object.fromEntries(panel.entities.map((entity) => [entity, panel.panel.map((row) => row.values[entity].value)]));
    const volumes = Object.fromEntries(panel.entities.map((entity) => [entity, panel.panel.map((row) => row.values[entity].auxiliary.volume)]));
    const references = Object.fromEntries(panel.entities.map((entity) => [entity, panel.panel.map((row) => row.values[entity].auxiliary.reference)]));
    const frames = [];
    for (let index = Math.max(60, patchSize * 2); index < panel.panel.length; index += 1) {
      const start = Math.max(1, index - graphWindow + 1);
      const histories = Object.fromEntries(panel.entities.map((entity) => [entity, Array.from({ length: index - start + 1 }, (_, offset) => logReturn(values[entity], start + offset - 1, start + offset))]));
      const graph = providers.measureCorrelationGraph({ returnsByEntity: histories });
      const sections = Object.fromEntries(panel.entities.map((entity) => [entity, logReturn(values[entity], index - 20, index)]));
      const laplacian = providers.measureSheafLaplacian({ sections, edges: graph.edges });
      const tokens = Array.from({ length: index }, (_, cursor) => {
        const movement = logReturn(values[benchmark], cursor, cursor + 1);
        return movement > 0.002 ? "positive" : movement < -0.002 ? "negative" : "flat";
      });
      const novelty = providers.measureCausalPatchNovelty({ tokens, patchSize });
      const features = Object.fromEntries(panel.entities.filter((entity) => entity !== benchmark).map((entity) => {
        const basic = providers.measureReturnRiskFeatures({ entityValues: values[entity], benchmarkValues: values[benchmark], volumes: volumes[entity], referenceValues: references[entity], index }).features;
        const local = laplacian.measurement[entity];
        return [entity, Object.freeze({
          ...basic,
          momentum: basic.relativeReturn20,
          volatility: basic.volatility20Annualized,
          graphCentrality: local.degree,
          sheafEnergy: Math.abs(local.laplacianResidual),
          sheafLaplacianResidual: local.laplacianResidual,
          causalNovelty: novelty.novelty,
          causalPatchFrequency: novelty.empiricalFrequency
        })];
      }));
      frames.push(Object.freeze({
        type: "CausalFeatureFrame", version: 1, at: panel.panel[index].at, index,
        input: Object.freeze({ symbols: Object.freeze(Object.keys(features).sort()), features: Object.freeze(features) }),
        labelsPresent: false, futureObservationsPresent: false
      }));
    }
    return Object.freeze({
      type: "CausalFeatureFrameSequence", version: 1, asOf: panel.asOf, benchmark,
      entities: panel.entities, coordinates: Object.freeze(panel.panel.map(({ at }) => at)),
      pricesBySymbol: Object.freeze(values), frames: Object.freeze(frames),
      leakageDetected: false, allocationEstablished: false, effect: "feature-material-only"
    });
  };
}
