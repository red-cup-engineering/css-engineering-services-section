/**
 * @packageDocumentation
 *
 * predicating — the predication category over the articulation base.
 *
 * `predicate` consumes an articulation cell and materializes the predication site
 * Φ = E × Π × E that positing consumes. Cells, sets, the base category, coherence,
 * and specialization closure live here. Coincidence is structural (boundary-first).
 *
 * The same surface also exposes finite FOUR-valued relation matrices: sparse
 * point×state cells whose duplicate coordinates join in the knowledge order,
 * whose rows and columns can be read as point/state profiles, and whose
 * `transpose`, `dual`, and checked transforms mirror the Chu-space vocabulary
 * used by RelMath. This is the executable relation-carrier layer, not a graph
 * database adapter and not the full Lean Chu category runtime.
 *
 * @example
 * ```ts
 * import {
 *   chargeValue,
 *   relationFromMatrix,
 *   relationMatrix,
 *   stateExtension,
 * } from "@red-cup-engineering/relating";
 *
 * const same = (left: string, right: string) => left === right;
 * const matrix = relationMatrix(
 *   { kind: "predication.entitySet", entities: ["alpha", "beta"] },
 *   { kind: "predication.predicateSet", predicates: ["warm"] },
 *   [
 *     ["alpha", "warm", chargeValue("potential")],
 *     ["alpha", "warm", chargeValue("active")],
 *   ],
 *   { samePoint: same, sameState: same },
 * );
 *
 * const carrier = relationFromMatrix(matrix);
 * stateExtension(carrier, "warm").points.entities; // ["alpha"]
 * ```
 */
export {
  Predicate,
  predicate,
  predicateOfClaim,
  predicationSeed,
  predicatingCell,
  cell,
  converseCell,
  subjectProjectionCell,
  objectProjectionCell,
  specializePredicateCell,
  converseCellInvolution,
  converseSeed,
  converseCellDistinctWhenOriented,
  subjectProjectionCellIdempotent,
  objectProjectionCellIdempotent,
  specializePredicateCellIdentity,
  cellSet,
  entitySet,
  predicateSet,
  generatedPredicationCellSet,
  generatePredicationCategory,
  transfinitePredicationCategory,
  materializePredicationCategory,
  predicationSite,
  presentPredicationSite,
  freePredicationSite,
  specializationMorphism,
  isCell,
  isSpecializationMorphism,
  closeSpecialization,
  cohere,
  unrelatedPairs,
  termCoincides,
  predicateCoincides,
  cellCoincides,
  nodeCoincides,
  baseObjectCoincides,
  predicationTermIdentity,
  predicationPredicateIdentity,
  cellIdentity,
  predicationNodeIdentity,
} from "./predication.mjs";
export type {
  PredicationTerm,
  PredicationPredicate,
  PredicationNode,
  PredicationBaseObject,
  PredicationDatum,
  Cell,
  Edge,
  SpecializationMorphism,
  EntitySet,
  PredicateSet,
  CellSet,
  GeneratedPredicationCellSet,
  BaseCategory,
  PredicationSite,
  PredicationSiteGenerators,
  PredicationFiberFunctorCarrier,
  TransfinitePredicationCategory,
  CoherenceCarrier,
  UnrelatedPairsCarrier,
  Judgment,
} from "./predication.mjs";

export {
  relation,
  relationRead,
  relationReadAbsence,
  relationMatrix,
  matrixEntryReading,
  relationFromMatrix,
  isRelationCarrier,
  pointProfile,
  stateProfile,
  stateExtension,
  transpose,
  dual,
  settleStateProfile,
  settlePointProfile,
  checkRelationTransform,
  relationTransform,
  isRelationTransform,
  idTransform,
  composeTransforms,
  dualTransform,
} from "./bilattice-relation.mjs";
export type {
  RelationSameness,
  RelationReadJudgment,
  RelationCarrier,
  RelationMatrixCarrier,
  RelationMatrixEntry,
  PointProfileCarrier,
  StateProfileCarrier,
  StateExtensionCarrier,
  RelationTransform,
  RelationTransformJudgment,
} from "./bilattice-relation.mjs";

export {
  signatureOfCell,
  cellSignatureKey,
  predicationCategoryShadow,
  incomingArrows,
  yonedaRecovery,
  finitePredicationValuation,
  finiteValuationFromCells,
  embedding,
  reindexValuation,
  reindexWitness,
  reindexBilatticeHomomorphism,
  grothendieckTranspose,
  temporalZeroCell,
  temporalOneCell,
  temporalTwoCategory,
  relativeIdeal,
  yonedaArrowsFirstReceipt,
  predicationFibrationReceipt,
  theoryRelativeIdealReceipt,
} from "./fibration.mjs";
export type {
  PredicationObjectKind,
  PredicationCellSignature,
  PredicationObjectSignature,
  PredicationArrowSignature,
  PredicationCategoryShadow,
  YonedaRecoveryWitness,
  FinitePredicationValuation,
  PredicationEmbeddingEntry,
  PredicationEmbedding,
  ReindexWitness,
  BilatticeHomomorphismWitness,
  GrothendieckTransposeWitness,
  TemporalZeroCell,
  TemporalOneCell,
  TemporalTwoCategoryWitness,
  RelativeIdealWitness,
  YonedaArrowsFirstReceipt,
  PredicationFibrationReceipt,
  TheoryRelativeIdealReceipt,
} from "./fibration.mjs";

export {
  truthJoinList,
  truthMeetList,
  knowledgeJoinList,
  diagonalFiber,
  classicalEq,
  paraconsistentEq,
  equalityCell,
  predicatingEqualityReceipt,
  finiteFibration,
  truthQuantifierReceipt,
} from "./equality.mjs";
export type {
  EqualityCell,
  PredicatingEqualityReceipt,
  FiniteFibrationCarrier,
  FibrationQuantifierReceipt,
} from "./equality.mjs";

export {
  finitePredicatingFibration,
  chargeListJoin,
  chargeListMeet,
  existsF,
  forallF,
  reindexF,
  swapValuation,
  predicatingQuantifyingReceipt,
  finiteConverseFibration,
  predicatingHyperdoctrineReceipt,
  predicatingDualHyperdoctrineReceipt,
} from "./quantifying.mjs";
export type {
  FiniteValuation,
  PredicatingFiniteFibration,
  PredicatingQuantifyingReceipt,
  PredicatingHyperdoctrineReceipt,
  PredicatingDualHyperdoctrineReceipt,
} from "./quantifying.mjs";

export * as positing from "./positing/index.mjs";
export * as typedTheory from "./typed-theory/index.mjs";
export * as geometry from "./geometry/index.mjs";
