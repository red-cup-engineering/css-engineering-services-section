const featureValues = (measurement) => Object.values(measurement.features);
const logReturn = (values, from, to) => Math.log(values[to] / values[from]);
const REQUIRED = Object.freeze(["assayAgentSectionDescent", "assayCausalPanel", "measureCausalPatchNovelty", "measureCorrelationGraph", "fitDeterministicRidge", "predictDeterministicRidge", "allocateMandatePortfolio", "selectModelCandidate", "formPurgedWalkForwardFolds", "measureReturnRiskFeatures", "measureSheafLaplacian", "replayTransactionCosts"]);

function marketSeries(barsBySymbol) {
  return Object.fromEntries(Object.entries(barsBySymbol).map(([symbol, bars]) => [symbol, bars.map((bar) => ({
    at: bar.at,
    value: bar.close,
    auxiliary: { volume: bar.volume ?? 0, reference: bar.vwap ?? bar.close },
  }))]));
}

function prepareFeatures(panelAssay, benchmark, graphWindow, patchSize, providers) {
  const entities = panelAssay.entities, rows = panelAssay.panel;
  const values = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].value)]));
  const volumes = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.volume)]));
  const references = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.reference)]));
  const cache = new Map();
  const at = (index, entity, variant) => {
    const key = `${index}:${entity}:${variant}`;
    if (cache.has(key)) return cache.get(key);
    const basic = featureValues(providers.measureReturnRiskFeatures({ entityValues: values[entity], benchmarkValues: values[benchmark], volumes: volumes[entity], referenceValues: references[entity], index }));
    if (variant === "baseline") { cache.set(key, basic); return basic; }
    const start = Math.max(1, index - graphWindow + 1);
    const histories = Object.fromEntries(entities.map((name) => [name, Array.from({ length: index - start + 1 }, (_, offset) => logReturn(values[name], start + offset - 1, start + offset))]));
    const graph = providers.measureCorrelationGraph({ returnsByEntity: histories });
    const sections = Object.fromEntries(entities.map((name) => [name, logReturn(values[name], index - 20, index)]));
    const laplacian = providers.measureSheafLaplacian({ sections, edges: graph.edges });
    const tokens = Array.from({ length: index }, (_, cursor) => {
      const movement = logReturn(values[benchmark], cursor, cursor + 1);
      return movement > 0.002 ? "positive" : movement < -0.002 ? "negative" : "flat";
    });
    const novelty = providers.measureCausalPatchNovelty({ tokens, patchSize });
    const enriched = [...basic, laplacian.measurement[entity].laplacianResidual, laplacian.measurement[entity].degree, novelty.novelty, novelty.empiricalFrequency];
    cache.set(key, enriched); return enriched;
  };
  return Object.freeze({ at, values });
}

function sectionAdjustment(agentForecasts, entity, predictedAt, horizonDays, providers) {
  // Restrict each prediction to its own horizon and source-availability clock.
  // Overlapping claims at different horizons are not contradictions in FOUR.
  const sections = agentForecasts.filter((section) => section.symbol === entity &&
      Number(section.horizonDays) === horizonDays &&
      Number.isFinite(Date.parse(section.observedAt)) &&
      Date.parse(section.observedAt) <= Date.parse(predictedAt))
    .map((section) => ({
      provider: section.provider,
      coordinate: `${entity}:${horizonDays}`,
      value: section.expectedExcessReturn, confidence: section.confidence,
      evidenceReferences: section.evidenceReferences ?? [],
      observedAt: section.observedAt,
    }));
  if (sections.length < 2) return Object.freeze({
    multiplier: 1, uncertainty: 0, assay: null, qualitativeSizingCalibrated: false,
  });
  const assay = providers.assayAgentSectionDescent({ sections });
  // FOUR says which sides are told; the sheaf coboundary measures local
  // disagreement energy. Neither furnishes an empirical probability, a
  // position-size penalty or a likelihood ratio. The earlier arbitrary
  // 1/(1+100E) * 0.5 rule applied a NEVER-CALIBRATED qualitative opinion
  // directly to an otherwise historically scored model. Crucially, modern
  // research agents are observed only at the current clock, so such a
  // multiplier bypasses every earlier walk-forward validation fold.
  // Retain the full SignCell/SignChain/SignGraph record for independent study
  // but do not alter trades until a separately evaluated as-of-calibration
  // provider earns inclusion in the predeclared feature/decision model.
  return Object.freeze({
    multiplier: 1, uncertainty: 0, assay, qualitativeSizingCalibrated: false,
    uncalibratedForecastEvidenceQuarantined: true,
  });
}

function evaluateVariant({ variant, folds, features, investable, benchmark, agentForecasts, ridge, mandate, horizon, transactionCostBps, providers }) {
  const periods = [];
  let currentWeights = Object.fromEntries(investable.map((entity) => [entity, 0]));
  for (const fold of folds.folds) {
    const samples = [];
    for (let origin = Math.max(60, fold.trainStart); origin <= fold.trainEnd; origin += 1) for (const entity of investable) {
      samples.push({ features: features.at(origin, entity, variant), target: logReturn(features.values[entity], origin, origin + horizon) - logReturn(features.values[benchmark], origin, origin + horizon) });
    }
    const model = providers.fitDeterministicRidge({ samples, lambda: ridge }), scores = {}, uncertainty = {}, sectionAssays = {};
    for (const entity of investable) {
      const adjustment = sectionAdjustment(agentForecasts, entity, fold.predictedAt, horizon, providers);
      scores[entity] = providers.predictDeterministicRidge(model, features.at(fold.prediction, entity, variant)) * adjustment.multiplier;
      uncertainty[entity] = adjustment.uncertainty;
      if (adjustment.assay) sectionAssays[entity] = adjustment.assay;
    }
    const allocation = providers.allocateMandatePortfolio({ scores, uncertainty, currentWeights, mandate });
    const realizedReturns = Object.fromEntries(investable.map((entity) => [entity, features.values[entity][fold.outcome] / features.values[entity][fold.prediction] - 1]));
    periods.push(Object.freeze({ at: fold.predictedAt, outcomeAt: fold.outcomeAt, trainingThrough: fold.trainingThrough, weights: allocation.weights, realizedReturns, sectionAssays: Object.freeze(sectionAssays) }));
    currentWeights = allocation.weights;
  }
  const validationCount = folds.validation.length;
  return Object.freeze({
    periods: Object.freeze(periods),
    validation: providers.replayTransactionCosts({ periods: periods.slice(0, validationCount), transactionCostBps }),
    holdout: providers.replayTransactionCosts({ periods: periods.slice(validationCount), transactionCostBps }),
    full: providers.replayTransactionCosts({ periods, transactionCostBps }),
  });
}

function formCurrentDecision({ variant, features, investable, benchmark, agentForecasts, ridge, mandate, horizon, trainingWindow, observationCount, currentWeights, providers, asOf }) {
  const prediction = observationCount - 1, trainEnd = prediction - horizon, samples = [];
  for (let origin = Math.max(60, trainEnd - trainingWindow + 1); origin <= trainEnd; origin += 1) for (const entity of investable) {
    samples.push({ features: features.at(origin, entity, variant), target: logReturn(features.values[entity], origin, origin + horizon) - logReturn(features.values[benchmark], origin, origin + horizon) });
  }
  const model = providers.fitDeterministicRidge({ samples, lambda: ridge }), scores = {}, uncertainty = {}, sectionAssays = {};
  for (const entity of investable) {
    const adjustment = sectionAdjustment(agentForecasts, entity, asOf, horizon, providers);
    scores[entity] = providers.predictDeterministicRidge(model, features.at(prediction, entity, variant)) * adjustment.multiplier;
    uncertainty[entity] = adjustment.uncertainty;
    if (adjustment.assay) sectionAssays[entity] = adjustment.assay;
  }
  const allocation = providers.allocateMandatePortfolio({ scores, uncertainty, currentWeights, mandate });
  return Object.freeze({
    type: "CurrentUnresolvedPortfolioDecision",
    version: 1,
    predictedAt: asOf,
    trainingThroughIndex: trainEnd,
    horizonDays: horizon,
    scores: Object.freeze(scores),
    uncertainty: Object.freeze(uncertainty),
    targetWeights: allocation.weights,
    cashWeight: allocation.cashWeight,
    turnover: allocation.turnover,
    sectionAssays: Object.freeze(sectionAssays),
    model: Object.freeze({ type: model.type, version: model.version, width: model.width, lambda: model.lambda, centers: model.centers, scales: model.scales, coefficients: model.coefficients }),
    outcomeResolved: false,
    effect: "target-weights-only",
  });
}

export function createCausalPortfolioLearningCircuit({ recordResult, providers }) {
  if (typeof recordResult !== "function" || !providers || REQUIRED.some((name) => typeof providers[name] !== "function")) throw new TypeError("explicit-child-providers-and-independent-recorder-required");
  return async function run({ barsBySymbol, benchmark = "SPY", asOf, agentForecasts = [], currentWeights = {}, mandate, config = {} } = {}) {
    if (!mandate || mandate.type !== "PortfolioAllocationMandate") throw new TypeError("allocation-mandate-required");
    const panel = providers.assayCausalPanel({ seriesByEntity: marketSeries(barsBySymbol), asOf, minimumEntities: 3, minimumObservations: 180 });
    if (!panel.entities.includes(benchmark)) throw new TypeError("benchmark-absent");
    const horizon = Number(config.horizon ?? 5), investable = panel.entities.filter((entity) => entity !== benchmark);
    const folds = providers.formPurgedWalkForwardFolds({ coordinates: panel.panel.map(({ at }) => at), warmup: Number(config.warmup ?? 252), horizon, cadence: Number(config.cadence ?? horizon), trainingWindow: Number(config.trainingWindow ?? 504), validationFraction: Number(config.validationFraction ?? 0.5) });
    const features = prepareFeatures(panel, benchmark, Number(config.graphWindow ?? 60), Number(config.patchSize ?? 5), providers);
    const common = { folds, features, investable, benchmark, agentForecasts, ridge: Number(config.ridge ?? 1), mandate, horizon, transactionCostBps: Number(config.transactionCostBps ?? 10), providers };
    const variants = Object.freeze({ baseline: evaluateVariant({ ...common, variant: "baseline" }), obsmetrologia: evaluateVariant({ ...common, variant: "obsmetrologia" }) });
    const tournament = providers.selectModelCandidate({
      candidates: [
        { id: "urn:model-candidate:return-risk-baseline", authorActor: "urn:ame:return-risk-feature-measurement-service", validation: variants.baseline.validation.metrics, holdout: variants.baseline.holdout.metrics },
        { id: "urn:model-candidate:obsmetrologia-enriched", authorActor: "urn:ame:sheaf-laplacian-measurement-service", validation: variants.obsmetrologia.validation.metrics, holdout: variants.obsmetrologia.holdout.metrics },
      ],
      policy: { metric: "informationRatio", direction: "maximize", maximumHoldoutDrawdown: Number(config.maximumHoldoutDrawdown ?? mandate.maximumDrawdown ?? 1) },
    });
    const selectedName = tournament.selectedUsingValidationOnly.endsWith("obsmetrologia-enriched") ? "obsmetrologia" : "baseline";
    const currentDecision = formCurrentDecision({ variant: selectedName, features, investable, benchmark, agentForecasts, ridge: common.ridge, mandate, horizon, trainingWindow: Number(config.trainingWindow ?? 504), observationCount: panel.panel.length, currentWeights, providers, asOf: panel.asOf });
    const result = Object.freeze({
      type: "InstitutionalCausalPortfolioLearningResult",
      version: 1,
      asOf: panel.asOf,
      benchmark,
      entities: panel.entities,
      panelAssay: Object.freeze({ leakageDetected: panel.leakageDetected, observations: panel.panel.length }),
      folds: Object.freeze({ purge: folds.purge, count: folds.folds.length, validationCount: folds.validation.length, holdoutCount: folds.holdout.length }),
      tournament,
      evaluations: Object.freeze(Object.fromEntries(Object.entries(variants).map(([name, value]) => [name, Object.freeze({ validation: value.validation.metrics, holdout: value.holdout.metrics, full: value.full.metrics })]))),
      currentDecision,
      claims: Object.freeze({ artificialIntelligenceTradingCircuit: agentForecasts.length > 0, alphaEstablished: false, profitabilityEstablished: false, liveReadinessEstablished: false, obsmetrologiaIncrementalEdgeObserved: variants.obsmetrologia.holdout.metrics.informationRatio > variants.baseline.holdout.metrics.informationRatio }),
      effect: "model-evaluation-and-target-weights-only",
    });
    const receipt = await recordResult({ type: "institutional-causal-portfolio-learning-completed", value: result, recordedAt: panel.asOf });
    if (!receipt?.id && !receipt?.graph && !receipt?.recordReceipt) throw new TypeError("independent-result-record-receipt-required");
    return Object.freeze({ ...result, independentRecordReceipt: receipt });
  };
}
