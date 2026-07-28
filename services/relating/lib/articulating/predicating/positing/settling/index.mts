/**
 * settling — finite settlement outcomes.
 *
 *   potential-scott-continuous-posit-cell --settling--> finite-settlement-cell
 *
 * The settlement filtration, the ordinal closure engine, the knowledge closure
 * and `settle`, the composed descent `induceRelation`, the predication cohomology,
 * and the settlement-filtration reads.
 */
export { induceRelation, relateRelations } from "./topology.mjs";
export { settleUtterances, fixedPointReadingsOfUtterances } from "./utterance-reading.mjs";

export {
  settle,
  freeSettlementFiltration,
  knowledgeValuationClosure,
  knowledgeClosureTrace,
  knowledgeClosureSheaf,
  knowledgeClosureCells,
  truthValuationClosure,
  sameValuation,
  sameMeme,
  lastValuation,
  transportValuationAlongPredicationGenerators,
  possibilizeKnowledge,
  utteranceKnowledgeClosureCohomology,
  predicationValuationClosureFiniteStageJudgment,
  settlingStageOrdinalOfPredicationValuationClosureStage,
  valuationClosureLattice,
  knowledgeValuationClosureLattice,
  truthValuationClosureLattice,
} from "./valuation-closure.mjs";
export type {
  PredicationValuationClosureTraceCarrier,
  PredicationValuationClosureCarrier,
  PredicationValuationClosureFiniteStageJudgment,
} from "./valuation-closure.mjs";

export {
  zeroOrdinal, successorOrdinal, limitOrdinal, ordinalLabel, finiteOrdinal, ordinalPlusFinite,
  omegaOrdinal, omegaMultipleOrdinal, omegaSquaredOrdinal, isZeroOrdinal, isSuccessorOrdinal, isLimitOrdinal,
  finiteOrdinalJudgment, finiteClosureRegime, scottClosureRegime, transfiniteClosureRegime, aperiodicClosureRegime,
  closureRegimeOfOrdinal, closureProcess, closeOrdinalProcess, closureOrbitOfProcess, closureSearchBlocks,
  closureStabilizationAt, closureStabilizationSearchHorizon, stabilizingSup,
} from "./closure.mjs";
export type { Ordinal, Lattice, ClosureRegime, ClosureCarrier } from "./closure.mjs";

export {
  settlingStageOrdinal, initialSettlingStageOrdinal, successorSettlingStageOrdinal, limitSettlingStageOrdinal,
  judgeFinitudeOfSettlingStage, countableSettlingCofinality, uncountableSettlingCofinality,
} from "./ordinal.mjs";
export {
  initialSettlingStageInput, successorSettlingStageInput, limitSettlingStageInput, settlingStageInput,
  readShapeOfSettlingStageOrdinal, settlingStageDesignatedCellSet,
} from "./stage.mjs";
export { readDesignatedCellsOfValuation } from "./designation.mjs";
export { settlementFiltration } from "./filtration.mjs";
export {
  cohomologyOfValuation, cohomology, cohomologyOfCells, cohomologyLaplacian, cohomologyLaplacianOfCells,
  rankVanishing, rankIdentity, rankComparison,
} from "./cohomology.mjs";
export type { CohomologyCarrier, FirstCohomologyCarrier, RankVanishingJudgment } from "./cohomology.mjs";

export { bigradedCohomology, bigradedCohomologyOfCharges, bigradedRow, bigradingCollapse } from "./bigraded-cohomology.mjs";
export type { BigradedCohomologyCarrier, FourCensus, BigradingCollapseJudgment } from "./bigraded-cohomology.mjs";

export { readIncrementsOfSettlementFiltration, readFiringsOfSettlementFiltration } from "./increment.mjs";
export { readLimitStagesOfSettlementFiltration, readNonScottFiringsOfSettlementFiltration } from "./limit.mjs";
export { readFirstCohomologyOfSettlementFiltration } from "./first-cohomology.mjs";
export { readClosureInvariantOfSettlementFiltration, readClosureEquivalenceOfSettlementFiltration } from "./invariant.mjs";
export { readGradedGapOfSettlementFiltration, readGradedGapFirstCohomologyRankIdentityOfSettlementFiltration } from "./gap.mjs";
export { readClassificationOfSettlementFiltration, readDepthOfSettlementFiltration, readDepthFiniteStageJudgmentOfSettlementFiltration } from "./classification.mjs";
export { monotonicityCertificateOfFederatedCover, federatedCoverStatementSchema } from "./monotonicity-certificate.mjs";
export type { FederatedCoverStatement, MonotonicityCertificate, CoordinationObstructionClass } from "./monotonicity-certificate.mjs";

export { fixedPoints } from "./fixed-point.mjs";
export type { FixedPointCarrier, FixedPointExtremum, FixedPointJudgment, BoundName } from "./fixed-point.mjs";
export { fixedPointGap, fixedPointGapInput } from "./fixed-point-gap.mjs";
export { fixedPointReading, fixedPointReadings, readCharge, informationOfSheaf } from "./fixed-point-reading.mjs";
export type { MemeTopologyFixedPointReading, MemeTopologyFixedPointReadings, MemeTopologyInformation } from "./fixed-point-reading.mjs";
export { documentAddressKey, documentOfFixedPoint, html_is_carrier_not_document } from "./document.mjs";
export type {
  Document,
  DocumentAddress,
  DocumentFixedPointObstruction,
  DocumentJudgment,
  DocumentOrder,
  DocumentReference,
  DocumentValuationSite,
  HtmlIsCarrierNotDocumentWitness,
} from "./document.mjs";
export { valuationConsistency } from "./valuation-consistency.mjs";
export type { PredicationValuationConsistencyCarrier } from "./valuation-consistency.mjs";
export { sectionOf, predicationsFor, subjectsFor, chargeAtValues, partitionSection, topologyVitals } from "./section.mjs";
export type { SectionCarrier, SectionEntry, SectionPartitionCarrier, TopologyVitalsCarrier } from "./section.mjs";

export {
  classifyFiring, classifyFiringOrbit, firingGrade, firingGrades, firingGenerator, negateFiringGenerator,
  firingFirstCohomology, firingGradeShadow, firingGradeCohomology, firingIndependence, firingSelfDuality,
  firingTypeMultiplicities, valuedFiringsOfSettlementFiltration,
} from "./firing.mjs";
export type { FiringGrade, FiringGenerator, FiringFirstCohomology, FiringOrbitClassification, FiringSelfDuality, ValuedFiring } from "./firing.mjs";

export { commutate, presheaf, presheafFromValuation, sheafFromValuation } from "./sheaf.mjs";
export type { PositPresheaf, PresheafTrace, SheafCarrier, CommutationCarrier } from "./sheaf.mjs";
export type { SettlementFiltrationGenerators } from "./valuation-closure.mjs";

export type {
  SettlementFiltration, SettlingStage, SettlingStageOrdinalCarrier, SettlingIncrement,
  SettlingClassification, SettlingFirstCohomology, GradedGapCarrier, SettlingClosureInvariant,
  SettlingCofinalityCarrier, SettlingFiniteStageJudgment, SettlingClosureEquivalenceJudgment,
} from "./object.mjs";

export {
  valueCategory,
  partialOrderOver,
  vClosure,
  closureOver,
  settleOverValue,
  settleFixedPoint,
  settleLeast,
  closureRegimeData,
  classifyRegime,
  fourRegimeDichotomy,
  regimeOfValueSettling,
  fourRegimeValueIndependent,
  cohomologyVanishesInRegime,
  chargeValueCategory,
  chargeSample,
  chargeJoinVClosure,
  booleanValueCategory,
  booleanSample,
  booleanJoinVClosure,
  spineRecovery,
  support,
  divides,
  magnitudeWitness,
  countingDequantizationReceipt,
  magnitudeWitnessReceipt,
} from "./value-category.mjs";
export type {
  ValueCategory,
  PartialOrderJudgment,
  VClosure,
  ClosureLawJudgment,
  SettleFixedPointJudgment,
  SettleLeastJudgment,
  ClosureRegimeData,
  ClosureRegimeDataJudgment,
  FourRegimeDichotomy,
  ValueIndependentRegimeWitness,
  SpineRecoveryWitness,
  CountingDequantizationReceipt,
  MagnitudeWitnessReceipt,
} from "./value-category.mjs";

export { learningDepthNames, learningDepthOfRegime, learningDepthOfRegimeData } from "./learning-depth.mjs";
export type { LearningDepthName, LearningDepth } from "./learning-depth.mjs";
export {
  observedLearningAscent,
  observedLearningNontrivialReturn,
  learningCycleOfClosureCarrier,
} from "./learning-cycle.mjs";
export type {
  ObservedLearningAscentStep,
  ObservedLearningAscentWitness,
  ObservedLearningAscentObstruction,
  ObservedLearningAscentJudgment,
  ObservedLearningReturn,
  ObservedLearningNoNontrivialReturnWitness,
  ObservedLearningNontrivialReturnObstruction,
  ObservedLearningNontrivialReturnJudgment,
  ObservedLearningCycleRead,
} from "./learning-cycle.mjs";

export {
  optimizationProblem,
  ofSettling,
  optimum,
  locallyOptimal,
  optimumReachable,
  optimumIsFixedPoint,
  settlingIsOptimization,
  settlingOptimizationReceipt,
  metricOptimumIsMinFixedPoint,
} from "./optimization.mjs";
export type { OptimizationProblem, SettlingIsOptimizationWitness, SettlingOptimizationReceipt } from "./optimization.mjs";

export {
  stochSemiring,
  natStochSemiring,
  ratStochSemiring,
  markovKernel,
  kernelSum,
  advance,
  stochClosure,
  isStationary,
  rowsSumToOne,
  detailedBalance,
  detailedBalanceImpliesStationary,
  markovStationaryIsClosureFixpoint,
  stochVC,
  stochVClosure,
  witnessKernel,
  uniformWitness,
  uniformWitnessStationary,
  poissonKernel,
  poissonPi,
  poissonDetailedBalance,
  poissonSettlingReceipt,
  stochasticIsValueSettling,
} from "./stochastic.mjs";
export type {
  StochSemiring,
  MarkovKernel,
  DetailedBalanceStationaryWitness,
  PoissonSettlingWitness,
  StationaryFixpointWitness,
  StochasticIsValueSettlingWitness,
} from "./stochastic.mjs";

export {
  sampleSpace,
  emptyEvent,
  univEvent,
  interEvent,
  unionEvent,
  complEvent,
  subsetEvent,
  disjointEvent,
  measure,
  total,
  expectation,
  expectationAdditive,
  expectationHomogeneous,
  expectationIndicator,
  expectationLaws,
  measureEmpty,
  measureUniv,
  additivityOnDisjoint,
  monotonicity,
  complementLaw,
  measureIsValuation,
  condMeasure,
  reindexEvent,
  conditioningIsReindex,
  conditionalViaFiberAdjoint,
  realUnitIntervalValueCategory,
} from "./probability.mjs";
export type {
  ProbabilityEvent,
  SampleSpace,
  ExpectationLawsWitness,
  MeasureIsValuationWitness,
  ConditionalWitness,
  RealUnitIntervalValueCategoryReceipt,
} from "./probability.mjs";

export * as analysis from "./analysis/index.mjs";
export * as geometry from "./geometry/index.mjs";
export * as dynamics from "./dynamics/index.mjs";
export {
  readFiringEventsOfSettlementFiltration,
  readCausalOrderOfSettlementFiltration,
  causalSeparation,
  causalCone,
  orderingFraction,
} from "./geometry/temporal.mjs";
export type {
  FiringEvent,
  CausalOrderCarrier,
  TimelikeSeparation,
  SpacelikeSeparation,
  CausalSeparationObstruction,
  CausalSeparation,
  CausalConeCarrier,
  CausalConeObstruction,
  CausalConeJudgment,
  OrderingFractionCarrier,
  OrderingFractionObstruction,
  OrderingFractionJudgment,
} from "./geometry/temporal.mjs";
