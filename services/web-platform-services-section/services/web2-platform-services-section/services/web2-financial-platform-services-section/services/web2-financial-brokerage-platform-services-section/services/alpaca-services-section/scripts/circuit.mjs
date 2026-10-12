const featureValues = (measurement) => Object.values(measurement.features);
const logReturn = (values, from, to) => Math.log(values[to] / values[from]);
const REQUIRED = Object.freeze(["assayAgentSectionDescent", "assayCausalPanel", "measureCausalPatchNovelty", "measureCorrelationGraph", "fitDeterministicRidge", "predictDeterministicRidge", "allocateMandatePortfolio", "selectModelCandidate", "formPurgedWalkForwardFolds", "measureReturnRiskFeatures", "measureTechnicalAnalysisFeatures", "measureSheafLaplacian", "simulateEventDrivenExecution"]);

function marketSeries(barsBySymbol) {
  return Object.fromEntries(Object.entries(barsBySymbol).map(([symbol, bars]) => [symbol, bars.map((bar) => ({
    at: bar.at,
    value: bar.close,
    auxiliary: { open: bar.open ?? bar.close, high: bar.high ?? bar.close, low: bar.low ?? bar.close, volume: bar.volume ?? 0, reference: bar.vwap ?? bar.close },
  }))]));
}

function prepareFeatures(panelAssay, benchmark, graphWindow, patchSize, providers) {
  const entities = panelAssay.entities, rows = panelAssay.panel;
  const values = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].value)]));
  const volumes = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.volume)]));
  const references = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.reference)]));
  const opens = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.open)]));
  const highs = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.high)]));
  const lows = Object.fromEntries(entities.map((entity) => [entity, rows.map((row) => row.values[entity].auxiliary.low)]));
  const cache = new Map();
  const at = (index, entity, variant) => {
    const key = `${index}:${entity}:${variant}`;
    if (cache.has(key)) return cache.get(key);
    const basic = featureValues(providers.measureReturnRiskFeatures({ entityValues: values[entity], benchmarkValues: values[benchmark], volumes: volumes[entity], referenceValues: references[entity], index }));
    if (variant === "baseline") { cache.set(key, basic); return basic; }
    const technical = featureValues(providers.measureTechnicalAnalysisFeatures({ closes: values[entity], highs: highs[entity], lows: lows[entity], volumes: volumes[entity], index }));
    if (variant === "technical") { const result = [...basic, ...technical]; cache.set(key, result); return result; }
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
    const enriched = [...basic, ...technical, laplacian.measurement[entity].laplacianResidual, laplacian.measurement[entity].degree, novelty.novelty, novelty.empiricalFrequency];
    cache.set(key, enriched); return enriched;
  };
  return Object.freeze({ at, values, opens, volumes });
}

function sectionAdjustment(agentForecasts, entity, predictedAt, horizonDays, providers) {
  // Only forecasts of the same payoff and horizon can modify this model's
  // score. A long-term bearish thesis does not refute a short-term bullish
  // forecast. Retain the evidence identities through the SignCell assay.
  const sections = agentForecasts.filter((section) => section.symbol === entity &&
      Number(section.horizonDays) === horizonDays &&
      Date.parse(section.observedAt) <= Date.parse(predictedAt))
    .map((section) => ({
      provider: section.provider, coordinate: `${entity}:${horizonDays}`,
      value: section.expectedExcessReturn, confidence: section.confidence,
      evidenceReferences: section.evidenceReferences ?? [], observedAt: section.observedAt,
    }));
  if (sections.length < 2) return Object.freeze({ multiplier: 1, uncertainty: 0, assay: null });
  const assay = providers.assayAgentSectionDescent({ sections });
  return Object.freeze({ multiplier: assay.confidenceMultiplier * (assay.contradictionHeld ? 0.5 : 1), uncertainty: assay.disagreementEnergy, assay });
}

function evaluateVariant({ variant, folds, features, investable, benchmark, agentForecasts, ridge, mandate, horizon, execution, initialCapital, providers }) {
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
    const market = Object.fromEntries(investable.map((entity) => [entity, Object.freeze({ open: features.opens[entity][fold.prediction], price: features.values[entity][fold.prediction], volume: features.volumes[entity][fold.prediction] })]));
    periods.push(Object.freeze({ at: fold.predictedAt, outcomeAt: fold.outcomeAt, trainingThrough: fold.trainingThrough, weights: allocation.weights, realizedReturns, market: Object.freeze(market), sectionAssays: Object.freeze(sectionAssays) }));
    currentWeights = allocation.weights;
  }
  const validationCount = folds.validation.length;
  return Object.freeze({
    periods: Object.freeze(periods),
    validation: providers.simulateEventDrivenExecution({ periods: periods.slice(0, validationCount), initialCapital, execution, periodsPerYear: 252 / horizon }),
    holdout: providers.simulateEventDrivenExecution({ periods: periods.slice(validationCount), initialCapital, execution, periodsPerYear: 252 / horizon }),
    full: providers.simulateEventDrivenExecution({ periods, initialCapital, execution, periodsPerYear: 252 / horizon }),
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
    const common = { folds, features, investable, benchmark, agentForecasts, ridge: Number(config.ridge ?? 1), mandate, horizon, initialCapital: Number(config.initialCapital ?? 100_000), execution: Object.freeze({ spreadBps: Number(config.spreadBps ?? 4), impactBpsAtFullParticipation: Number(config.impactBpsAtFullParticipation ?? 25), maximumParticipationRate: Number(config.maximumParticipationRate ?? 0.1), latencyFractionOfBar: Number(config.latencyFractionOfBar ?? 0.1), minimumOrderNotional: Number(config.minimumOrderNotional ?? 1) }), providers };
    const variants = Object.freeze({ baseline: evaluateVariant({ ...common, variant: "baseline" }), technical: evaluateVariant({ ...common, variant: "technical" }), obsmetrologiaTechnical: evaluateVariant({ ...common, variant: "obsmetrologiaTechnical" }) });
    const tournament = providers.selectModelCandidate({
      candidates: [
        { id: "urn:model-candidate:return-risk-baseline", authorActor: "urn:ame:return-risk-feature-measurement-service", validation: variants.baseline.validation.metrics, holdout: variants.baseline.holdout.metrics },
        { id: "urn:model-candidate:technical-analysis", authorActor: "urn:ame:technical-analysis-feature-measurement-service", validation: variants.technical.validation.metrics, holdout: variants.technical.holdout.metrics },
        { id: "urn:model-candidate:obsmetrologia-technical", authorActor: "urn:ame:sheaf-laplacian-measurement-service", validation: variants.obsmetrologiaTechnical.validation.metrics, holdout: variants.obsmetrologiaTechnical.holdout.metrics },
      ],
      policy: { metric: "informationRatio", direction: "maximize", maximumHoldoutDrawdown: Number(config.maximumHoldoutDrawdown ?? mandate.maximumDrawdown ?? 1) },
    });
    const selectedName = tournament.selectedUsingValidationOnly.endsWith("obsmetrologia-technical") ? "obsmetrologiaTechnical"
      : tournament.selectedUsingValidationOnly.endsWith("technical-analysis") ? "technical" : "baseline";
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
      executionModel: common.execution,
      currentDecision,
      claims: Object.freeze({ artificialIntelligenceTradingCircuit: agentForecasts.length > 0, technicalAnalysisTournamented: true, alphaEstablished: false, profitabilityEstablished: false, liveReadinessEstablished: false, obsmetrologiaIncrementalEdgeObserved: variants.obsmetrologiaTechnical.holdout.metrics.informationRatio > variants.technical.holdout.metrics.informationRatio }),
      effect: "model-evaluation-and-target-weights-only",
    });
    const receipt = await recordResult({ type: "institutional-causal-portfolio-learning-completed", value: result, recordedAt: panel.asOf });
    if (!receipt?.id && !receipt?.graph && !receipt?.recordReceipt) throw new TypeError("independent-result-record-receipt-required");
    return Object.freeze({ ...result, independentRecordReceipt: receipt });
  };
}
