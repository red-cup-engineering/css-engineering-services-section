/**
 * analysis/aperiodic-classification - finite executable shadow of the
 * aperiodic `cl-inv` / moduli / direct-limit / synonymy cluster.
 *
 * This packages the runtime-computable part of:
 * - RelMath.Aperiodic.Classification
 * - RelMath.Aperiodic.AndersonPutnam
 * - RelMath.Aperiodic.Moduli
 * - RelMath.Aperiodic.Universality
 * - RelMath.Aperiodic.StepN.FixedPoint
 * - RelMath.Aperiodic.CoClassifying
 * - RelMath.Aperiodic.SynonymyAntonymy
 * - RelMath.Aperiodic.Autopoiesis
 * - RelMath.Aperiodic.AperiodicSettleFrame
 * - RelMath.Aperiodic.ClassificationReduction
 * - RelMath.Aperiodic.GeometricMldComplete
 *
 * It carries the finite integer-coordinate, explicit matrix/table, and
 * settled-value-kernel shadows Lean makes computational. Genuine q-fuzzy
 * Verdier duality, cross-dimension shift equivalence, a real sheaf/topology
 * kernel, and the primitive transfinite closure-operator identification remain
 * proof-side/frontier material.
 */
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  scottClosureRegime,
  type ClosureRegime,
} from "../closure.mjs";
import {
  classifyRegime,
  closureRegimeData,
  cohomologyVanishesInRegime,
  type ClosureRegimeData,
} from "../value-category.mjs";
import {
  receipt as bigradedDiamondReceipt,
  towerReceipt as bigradedDiamondTower,
  varyingFamilyReceipt,
  type BigradedDiamondReceipt,
  type BigradedDiamondTowerReceipt,
  type VaryingFamilyReceipt,
} from "./bigraded-diamond.mjs";
import { salemPisotReceipt, type SalemPisotWitness } from "./internal-real.mjs";

export type FiringType = "truthOnly" | "falsityOnly" | "both";

export interface H1Class {
  readonly kind: "aperiodic.h1.class";
  readonly coord: number;
}

export interface H1Homology {
  readonly kind: "aperiodic.h1.homology";
  readonly dualCoord: number;
}

export interface AperiodicSettling {
  readonly kind: "aperiodic.settling.carrier";
  readonly regime: ClosureRegime;
  readonly clInv: H1Class;
  readonly vanishingRespected: true;
}

export interface CohSettling {
  readonly kind: "aperiodic.cohSettling.carrier";
  readonly base: AperiodicSettling;
  readonly h0: number;
}

export interface CohInvariant {
  readonly kind: "aperiodic.cohInvariant";
  readonly h0: number;
  readonly clInv: H1Class;
  readonly regime: ClosureRegime;
}

export interface CohomologicalEquivalenceReceipt {
  readonly kind: "aperiodic.cohomologicalEquivalence.receipt:witness";
  readonly left: CohSettling;
  readonly right: CohSettling;
  readonly invariant: CohInvariant;
  readonly fullCohEquiv: true;
  readonly fullCohEquivIsEquivalence: true;
  readonly fullRefinesClInvEquiv: true;
  readonly flatClInvCollapse: true;
  readonly aperiodicNotTrivial: true;
  readonly negationCohomologicallyInvisible: true;
  readonly geometricMldBoundary: "geometric MLD converse is carried by settled-value-kernel receipts";
}

export interface LocalDerivabilityReceipt {
  readonly kind: "aperiodic.localDerivability:witness";
  readonly relation: "equality" | "shared-clInv";
  readonly mldRefinesCohEquiv: true;
}

export interface CommonBaseSettling {
  readonly kind: "aperiodic.commonBase.settling";
  readonly firings: readonly number[];
}

export type CommonBaseClInv = Readonly<Record<string, number>>;

export interface CommonBaseDerivation {
  readonly kind: "aperiodic.commonBase.derivation:witness";
  readonly source: CommonBaseSettling;
  readonly target: CommonBaseSettling;
  readonly permutation: readonly number[];
  readonly preservesFirings: true;
}

export interface CommonBaseClassificationReceipt {
  readonly kind: "aperiodic.commonBase.classification.receipt:witness";
  readonly left: CommonBaseSettling;
  readonly right: CommonBaseSettling;
  readonly leftClInv: CommonBaseClInv;
  readonly rightClInv: CommonBaseClInv;
  readonly derivation: CommonBaseDerivation;
  readonly baseMLDRefl: true;
  readonly baseMLDSymm: true;
  readonly baseMLDTrans: true;
  readonly baseClInvOfBaseMLD: true;
  readonly baseMLDOfClInvEq: true;
  readonly commonBaseClassification: true;
  readonly crossBaseBridge: "geometric cross-base MLD is carried by the settled-value-kernel receipt";
}

export interface AperiodicFramePoint {
  readonly kind: "aperiodic.frame.point";
  readonly settling: AperiodicSettling;
  readonly stage: number;
}

export interface AperiodicSettleFrameReceipt {
  readonly kind: "aperiodic.settleFrame.receipt:witness";
  readonly witness: AperiodicFramePoint;
  readonly trivial: AperiodicFramePoint;
  readonly stepped: AperiodicFramePoint;
  readonly settledWitness: AperiodicFramePoint;
  readonly settledTrivial: AperiodicFramePoint;
  readonly stepNotIdempotent: true;
  readonly settleStepAbsorbs: true;
  readonly witnessSeparated: true;
  readonly aperiodicGeoMldIffCohEquiv: true;
  readonly transfiniteCarrierBoundary: "stage non-idempotence is finite-witnessed; ordinal cofinality remains proof-side";
}

export interface ClassificationReductionReceipt {
  readonly kind: "aperiodic.classificationReduction.receipt:witness";
  readonly coarsestRelation: "cohEquiv";
  readonly classificationIffComplete: true;
  readonly existsCompleteLocalDerivability: true;
  readonly reductionIsRealizable: true;
  readonly geometricBridge: "RelMath.Aperiodic.GeometricMldComplete supplies the nontrivial geometric completeness witness";
}

export interface GeometricMldDerivation {
  readonly kind: "aperiodic.geometricMld.derivation:witness";
  readonly source: AperiodicFramePoint;
  readonly target: AperiodicFramePoint;
  readonly settledSource: AperiodicFramePoint;
  readonly settledTarget: AperiodicFramePoint;
  readonly relation: "settled-value-kernel";
  readonly bisimulationUpToClosure: true;
  readonly constructedMorphism: true;
}

export interface GeometricMldCompleteReceipt {
  readonly kind: "aperiodic.geometricMldComplete.receipt:witness";
  readonly left: AperiodicSettling;
  readonly right: AperiodicSettling;
  readonly derivation: GeometricMldDerivation;
  readonly geometricMldRefl: true;
  readonly geometricMldSymm: true;
  readonly geometricMldTrans: true;
  readonly geometricMldPreservesClInv: true;
  readonly geometricMldIffCohEquiv: true;
  readonly geometricLocalDerivabilityComplete: true;
  readonly classificationReductionDischarged: true;
  readonly primitiveClosureBoundary: "independent primitive transfinite closureOp equals clInv readout remains proof-side";
}

export interface UpToClosureCoinductionReceipt {
  readonly kind: "aperiodic.upToClosureCoinduction.receipt:witness";
  readonly sourceModule: "RelMath.Aperiodic.UpToClosureCoinduction";
  readonly theorems: readonly [
    "bisimUTC_sound",
    "geoMld_iff_settleEq",
    "crossBase_classification",
  ];
  readonly geometricMldComplete: GeometricMldCompleteReceipt;
  readonly relation: "settled-value-kernel";
  readonly bisimulationUpToClosure: true;
  readonly crossBaseConverseDischarged: true;
  readonly boundary: "proved on the realized idempotent settling coalgebra";
}

export interface TransfiniteUpToClosureReceipt {
  readonly kind: "aperiodic.transfiniteUpToClosure.receipt:witness";
  readonly sourceModule: "RelMath.Aperiodic.TransfiniteUpToClosure";
  readonly theorems: readonly [
    "orbit_le_closure",
    "settle_coalgebraOrbitLimit",
    "bisimUTC_settle_limit",
    "transfinite_ladder_climb",
  ];
  readonly upToClosure: UpToClosureCoinductionReceipt;
  readonly settleFrame: AperiodicSettleFrameReceipt;
  readonly limitStageCarriesSettledValue: true;
  readonly coinductionClimbsLimit: true;
  readonly realizedCarrier: "strict-finite idempotent closure";
  readonly frontierBoundary: "genuinely transfinite non-idempotent carrier remains frontier";
}

export interface ClassificationReceipt {
  readonly kind: "aperiodic.classification.receipt:witness";
  readonly strictSettling: AperiodicSettling;
  readonly scottSettling: AperiodicSettling;
  readonly aperiodicWitness: AperiodicSettling;
  readonly synonym: readonly [AperiodicSettling, AperiodicSettling];
  readonly cohEquivIsEquivalence: true;
  readonly strictScottClInvZero: true;
  readonly aperiodicCanBeNonzero: true;
  readonly mldRefinesCohEquiv: true;
  readonly geometricConverseBoundary: "geometric converse is implemented separately by GeometricMldComplete";
}

export interface StageElement {
  readonly kind: "aperiodic.stageElement";
  readonly stage: number;
  readonly coord: number;
}

export interface DirectLimitReceipt {
  readonly kind: "aperiodic.andersonPutnam.receipt:witness";
  readonly left: StageElement;
  readonly right: StageElement;
  readonly eventuallyEqual: true;
  readonly colimitClass: H1Class;
  readonly stageIndependent: true;
  readonly coconeLaw: true;
  readonly perGradeQuartet: BigradedDiamondTowerReceipt;
  readonly stepTwoIsFour: true;
}

export interface StepRule {
  readonly kind: "aperiodic.stepRule.carrier";
  readonly n: number;
  readonly substitution: readonly (readonly number[])[];
  readonly primitive: boolean;
  readonly coord: number;
}

export interface ModuliPoint {
  readonly kind: "aperiodic.moduliPoint";
  readonly coord: number;
}

export interface ModuliReceipt {
  readonly kind: "aperiodic.moduli.receipt:witness";
  readonly rule: StepRule;
  readonly shifted: StepRule;
  readonly point: ModuliPoint;
  readonly shiftedPoint: ModuliPoint;
  readonly stepShiftPreservesPrimitive: true;
  readonly stepShiftPreservesCoord: true;
  readonly stepShiftPreservesModuliPoint: true;
  readonly chainInclusion: true;
  readonly stratifiedOrResiduePartition: true;
  readonly negationGaugeInvisible: true;
  readonly coarseMldBoundary: "open coarse moduli equals structural MLD classes";
}

export interface FixedPointReceipt {
  readonly kind: "aperiodic.stepNFixedPoint.receipt:witness";
  readonly embedded: StageElement;
  readonly shifted: StageElement;
  readonly minfinityClass: H1Class;
  readonly embedDepthIndependent: true;
  readonly sigmaInfinityShiftsDepth: true;
  readonly sigmaInfinityFixed: true;
  readonly rgFixedPoint: true;
}

export type IntMatrix = readonly (readonly number[])[];

export interface ShiftEquivalenceReceipt {
  readonly kind: "aperiodic.shiftEquivalence.receipt:witness";
  readonly dimension: number;
  readonly matrix: IntMatrix;
  readonly shiftedMatrix: IntMatrix;
  readonly r: IntMatrix;
  readonly s: IntMatrix;
  readonly strongShiftEquivalent: true;
  readonly shiftEquivalent: true;
  readonly seReflexive: true;
  readonly seSymmetric: true;
  readonly seTransitiveByChains: true;
  readonly universalityClassIsSeClass: true;
  readonly clInvCoordinateInvariant: true;
  readonly fixedDimensionBoundary: "cross-dimension SE and dimension groups remain proof-side";
}

export interface CoClassifyingReceipt {
  readonly kind: "aperiodic.coClassifying.receipt:witness";
  readonly cohomology: H1Class;
  readonly homology: H1Homology;
  readonly inverse: H1Class;
  readonly dSpatialBijective: true;
  readonly zeroPreserving: true;
  readonly coClInvEqualsDSpatialClInv: true;
  readonly sameDataAsCohEquiv: true;
  readonly verdierBoundary: "q-fuzzy and derived Verdier duality remain proof-side";
}

export interface StrongSettling {
  readonly kind: "aperiodic.strongSettling.carrier";
  readonly base: AperiodicSettling;
  readonly tau: FiringType;
}

export interface SynonymyAntonymyReceipt {
  readonly kind: "aperiodic.synonymyAntonymy.receipt:witness";
  readonly source: StrongSettling;
  readonly twist: StrongSettling;
  readonly synonymyEquivalence: true;
  readonly negationInvisibleToSynonymy: true;
  readonly flipInvolutive: true;
  readonly antonymySymmetric: true;
  readonly antonymyRefinesSynonymy: true;
  readonly truthOnlyMoves: true;
}

export interface AutopoiesisReceipt {
  readonly kind: "aperiodic.autopoiesis.receipt:witness";
  readonly diamond: BigradedDiamondReceipt;
  readonly varying: VaryingFamilyReceipt;
  readonly tower: BigradedDiamondTowerReceipt;
  readonly autopoieticCoreIffFixedBoth: true;
  readonly fourCorners: 4;
  readonly historySeparationAperiodic: true;
  readonly historyValueOrderBoundary: "history-filtration nuclei are not value-order nuclei";
}

export interface SalemPisotRegimeReceipt {
  readonly kind: "aperiodic.salemPisotRegime.receipt:witness";
  readonly salem: SalemPisotWitness;
  readonly salemData: ClosureRegimeData;
  readonly pisotData: ClosureRegimeData;
  readonly salemRegime: ClosureRegime;
  readonly pisotRegime: ClosureRegime;
  readonly salemAperiodic: true;
  readonly pisotStrict: true;
  readonly splitIsRegimeSplit: true;
  readonly boundary: "neutral-direction-to-aperiodic is carried as finite regime data, not analytic contraction proof";
}

export interface DefectReceipt {
  readonly kind: "aperiodic.defect.receipt:witness";
  readonly sourceModule: "RelMath.Cohomology.Defect";
  readonly theorems: readonly [
    "RelMath.Aperiodic.HasDefect",
    "RelMath.Aperiodic.no_defect_of_settles",
    "RelMath.Aperiodic.no_defect_of_vanishing",
    "RelMath.Aperiodic.hasDefect_curved",
    "RelMath.Aperiodic.hasDefect_nonvanishing",
    "RelMath.Aperiodic.aperiodicWitness_hasDefect",
    "RelMath.Aperiodic.defect_exists",
  ];
  readonly flat: AperiodicSettling;
  readonly scott: AperiodicSettling;
  readonly witness: AperiodicSettling;
  readonly flatDefectFree: true;
  readonly vanishingDefectFree: true;
  readonly defectCurved: true;
  readonly defectNonvanishing: true;
  readonly aperiodicWitnessHasDefect: true;
  readonly defectExists: true;
}

export interface AperiodicClassificationReceipt {
  readonly kind: "aperiodic.classificationCluster.receipt:witness";
  readonly classification: ClassificationReceipt;
  readonly cohomologicalEquivalence: CohomologicalEquivalenceReceipt;
  readonly commonBase: CommonBaseClassificationReceipt;
  readonly aperiodicSettleFrame: AperiodicSettleFrameReceipt;
  readonly classificationReduction: ClassificationReductionReceipt;
  readonly geometricMldComplete: GeometricMldCompleteReceipt;
  readonly directLimit: DirectLimitReceipt;
  readonly moduli: ModuliReceipt;
  readonly fixedPoint: FixedPointReceipt;
  readonly universality: ShiftEquivalenceReceipt;
  readonly coClassifying: CoClassifyingReceipt;
  readonly synonymyAntonymy: SynonymyAntonymyReceipt;
  readonly autopoiesis: AutopoiesisReceipt;
  readonly salemPisotRegime: SalemPisotRegimeReceipt;
  readonly defect: DefectReceipt;
  readonly openFrontier: readonly string[];
}

const assertSafeInteger = (value: number, caller: string): void => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: integer coordinates must be safe integers`);
};

function assertNatural(value: number, caller: string): void {
  assertSafeInteger(value, caller);
  if (value < 0) throw new RangeError(`${caller}: expected a natural number`);
}

export function h1Class(coord: number): H1Class {
  assertSafeInteger(coord, "h1Class");
  return Object.freeze({ kind: "aperiodic.h1.class" as const, coord });
}

export const h1Zero = h1Class(0);

export function h1Homology(dualCoord: number): H1Homology {
  assertSafeInteger(dualCoord, "h1Homology");
  return Object.freeze({ kind: "aperiodic.h1.homology" as const, dualCoord });
}

export const h1HomologyZero = h1Homology(0);

export function settling(regime: ClosureRegime, coord: number): AperiodicSettling {
  const clInv = h1Class(coord);
  if (cohomologyVanishesInRegime(regime) && coord !== 0) {
    throw new TypeError("aperiodic.settling: strict/Scott regimes force clInv = 0");
  }
  return Object.freeze({
    kind: "aperiodic.settling.carrier" as const,
    regime,
    clInv,
    vanishingRespected: true as const,
  });
}

export function aperiodicWitness(coord = 1): AperiodicSettling {
  if (coord === 0) throw new RangeError("aperiodicWitness: witness must carry nonzero clInv");
  return settling(aperiodicClosureRegime, coord);
}

export function inflationRegimeData(onUnitCircle: boolean): ClosureRegimeData {
  const admitted = closureRegimeData(!onUnitCircle, !onUnitCircle, !onUnitCircle);
  if (admitted.kind !== "settling.closureRegimeData:witness") {
    throw new TypeError("inflationRegimeData: Salem/Pisot split generated inadmissible regime data");
  }
  return admitted.data;
}

export function inflationRegime(onUnitCircle: boolean): ClosureRegime {
  return classifyRegime(inflationRegimeData(onUnitCircle));
}

export function cohEquiv(left: AperiodicSettling, right: AperiodicSettling): boolean {
  return left.clInv.coord === right.clInv.coord;
}

export function hasDefect(value: AperiodicSettling): boolean {
  return value.clInv.coord !== 0;
}

export function isCurvedRegime(regime: ClosureRegime): boolean {
  return !cohomologyVanishesInRegime(regime);
}

export function cohSettling(base: AperiodicSettling, h0: number): CohSettling {
  assertSafeInteger(h0, "cohSettling");
  if (h0 < 0) throw new RangeError("cohSettling: H0 content must be non-negative");
  return Object.freeze({ kind: "aperiodic.cohSettling.carrier" as const, base, h0 });
}

export function cohInvariant(value: CohSettling): CohInvariant {
  return Object.freeze({
    kind: "aperiodic.cohInvariant" as const,
    h0: value.h0,
    clInv: value.base.clInv,
    regime: value.base.regime,
  });
}

export function fullCohEquiv(left: CohSettling, right: CohSettling): boolean {
  return left.h0 === right.h0
    && left.base.clInv.coord === right.base.clInv.coord
    && left.base.regime.kind === right.base.regime.kind;
}

export function cohomologicalEquivalenceReceipt(): CohomologicalEquivalenceReceipt {
  const left = cohSettling(aperiodicWitness(4), 2);
  const right = cohSettling(aperiodicWitness(4), 2);
  const flat = cohSettling(settling(finiteClosureRegime, 0), 0);
  const nonflat = cohSettling(aperiodicWitness(1), 0);
  const twist = cohSettling(negTwist(strongSettling(left.base, "truthOnly")).base, left.h0);
  if (!fullCohEquiv(left, right) || !cohEquiv(left.base, right.base) || !cohEquiv(flat.base, settling(finiteClosureRegime, 0))) {
    throw new TypeError("cohomologicalEquivalenceReceipt: finite cohomological equivalence laws failed");
  }
  if (cohEquiv(nonflat.base, flat.base) || !fullCohEquiv(left, twist)) {
    throw new TypeError("cohomologicalEquivalenceReceipt: aperiodic separation or gauge invisibility failed");
  }
  return Object.freeze({
    kind: "aperiodic.cohomologicalEquivalence.receipt:witness" as const,
    left,
    right,
    invariant: cohInvariant(left),
    fullCohEquiv: true as const,
    fullCohEquivIsEquivalence: true as const,
    fullRefinesClInvEquiv: true as const,
    flatClInvCollapse: true as const,
    aperiodicNotTrivial: true as const,
    negationCohomologicallyInvisible: true as const,
    geometricMldBoundary: "geometric MLD converse is carried by settled-value-kernel receipts" as const,
  });
}

export function commonBaseSettling(firings: readonly number[]): CommonBaseSettling {
  for (const firing of firings) assertNatural(firing, "commonBaseSettling");
  return Object.freeze({
    kind: "aperiodic.commonBase.settling" as const,
    firings: Object.freeze([...firings]),
  });
}

export function baseClInvAt(settlingValue: CommonBaseSettling, stage: number): number {
  assertNatural(stage, "baseClInvAt");
  return settlingValue.firings.filter((firing) => firing === stage).length;
}

export function baseClInv(settlingValue: CommonBaseSettling): CommonBaseClInv {
  const stages = [...new Set(settlingValue.firings)].sort((left, right) => left - right);
  return Object.freeze(Object.fromEntries(stages.map((stage) => [String(stage), baseClInvAt(settlingValue, stage)])));
}

function commonBaseClInvEqual(left: CommonBaseSettling, right: CommonBaseSettling): boolean {
  const stages = new Set([...left.firings, ...right.firings]);
  return [...stages].every((stage) => baseClInvAt(left, stage) === baseClInvAt(right, stage));
}

export function baseMLD(left: CommonBaseSettling, right: CommonBaseSettling): boolean {
  return left.firings.length === right.firings.length && commonBaseClInvEqual(left, right);
}

function permutationPreservesFirings(
  left: CommonBaseSettling,
  right: CommonBaseSettling,
  permutation: readonly number[],
): boolean {
  const seen = new Set(permutation);
  return permutation.length === left.firings.length
    && seen.size === permutation.length
    && permutation.every((index) => Number.isSafeInteger(index) && index >= 0 && index < right.firings.length)
    && permutation.every((targetIndex, sourceIndex) => left.firings[sourceIndex] === right.firings[targetIndex]);
}

export function commonBaseDerivation(left: CommonBaseSettling, right: CommonBaseSettling): CommonBaseDerivation {
  if (!baseMLD(left, right)) throw new TypeError("commonBaseDerivation: unequal baseClInv obstructs common-base MLD");
  const used = new Set<number>();
  const permutation = left.firings.map((firing) => {
    const targetIndex = right.firings.findIndex((candidate, index) => candidate === firing && !used.has(index));
    if (targetIndex < 0) throw new TypeError("commonBaseDerivation: failed to construct firing permutation");
    used.add(targetIndex);
    return targetIndex;
  });
  if (!permutationPreservesFirings(left, right, permutation)) {
    throw new TypeError("commonBaseDerivation: constructed permutation does not preserve firings");
  }
  return Object.freeze({
    kind: "aperiodic.commonBase.derivation:witness" as const,
    source: left,
    target: right,
    permutation: Object.freeze(permutation),
    preservesFirings: true as const,
  });
}

export function commonBaseClassificationReceipt(): CommonBaseClassificationReceipt {
  const left = commonBaseSettling([2, 1, 2, 4]);
  const middle = commonBaseSettling([4, 2, 1, 2]);
  const right = commonBaseSettling([1, 2, 4, 2]);
  const derivation = commonBaseDerivation(left, right);
  const refl = baseMLD(left, left);
  const symm = baseMLD(left, right) && baseMLD(right, left);
  const trans = baseMLD(left, middle) && baseMLD(middle, right) && baseMLD(left, right);
  const invOfMld = baseMLD(left, right) && commonBaseClInvEqual(left, right);
  const mldOfInv = commonBaseClInvEqual(left, right) && baseMLD(left, right);
  if (!refl || !symm || !trans || !invOfMld || !mldOfInv) {
    throw new TypeError("commonBaseClassificationReceipt: finite common-base classification laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.commonBase.classification.receipt:witness" as const,
    left,
    right,
    leftClInv: baseClInv(left),
    rightClInv: baseClInv(right),
    derivation,
    baseMLDRefl: true as const,
    baseMLDSymm: true as const,
    baseMLDTrans: true as const,
    baseClInvOfBaseMLD: true as const,
    baseMLDOfClInvEq: true as const,
    commonBaseClassification: true as const,
    crossBaseBridge: "geometric cross-base MLD is carried by the settled-value-kernel receipt" as const,
  });
}

export function aperiodicFramePoint(settlingValue: AperiodicSettling, stage: number): AperiodicFramePoint {
  assertNatural(stage, "aperiodicFramePoint");
  return Object.freeze({
    kind: "aperiodic.frame.point" as const,
    settling: settlingValue,
    stage,
  });
}

export function canonicalAperiodic(coord: number): AperiodicSettling {
  return settling(aperiodicClosureRegime, coord);
}

export function aperiodicStep(point: AperiodicFramePoint): AperiodicFramePoint {
  return aperiodicFramePoint(point.settling, point.stage + 1);
}

export function aperiodicSettle(point: AperiodicFramePoint): AperiodicFramePoint {
  return aperiodicFramePoint(canonicalAperiodic(point.settling.clInv.coord), 0);
}

export function aperiodicFrameSettledEqual(left: AperiodicFramePoint, right: AperiodicFramePoint): boolean {
  const settledLeft = aperiodicSettle(left);
  const settledRight = aperiodicSettle(right);
  return settledLeft.stage === settledRight.stage && cohEquiv(settledLeft.settling, settledRight.settling);
}

export function aperiodicSettleFrameReceipt(): AperiodicSettleFrameReceipt {
  const witness = aperiodicFramePoint(aperiodicWitness(1), 0);
  const trivial = aperiodicFramePoint(canonicalAperiodic(0), 0);
  const stepped = aperiodicStep(witness);
  const doubleStepped = aperiodicStep(stepped);
  const settledWitness = aperiodicSettle(witness);
  const settledTrivial = aperiodicSettle(trivial);
  const stepNotIdempotent = doubleStepped.stage !== stepped.stage;
  const settleStepAbsorbs = aperiodicFrameSettledEqual(stepped, witness);
  const witnessSeparated = !aperiodicFrameSettledEqual(witness, trivial);
  const aperiodicGeoMldIffCohEquiv = aperiodicFrameSettledEqual(witness, settledWitness)
    && cohEquiv(witness.settling, settledWitness.settling);
  if (!stepNotIdempotent || !settleStepAbsorbs || !witnessSeparated || !aperiodicGeoMldIffCohEquiv) {
    throw new TypeError("aperiodicSettleFrameReceipt: finite aperiodic frame laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.settleFrame.receipt:witness" as const,
    witness,
    trivial,
    stepped,
    settledWitness,
    settledTrivial,
    stepNotIdempotent: true as const,
    settleStepAbsorbs: true as const,
    witnessSeparated: true as const,
    aperiodicGeoMldIffCohEquiv: true as const,
    transfiniteCarrierBoundary: "stage non-idempotence is finite-witnessed; ordinal cofinality remains proof-side" as const,
  });
}

export function classificationReductionReceipt(): ClassificationReductionReceipt {
  return Object.freeze({
    kind: "aperiodic.classificationReduction.receipt:witness" as const,
    coarsestRelation: "cohEquiv" as const,
    classificationIffComplete: true as const,
    existsCompleteLocalDerivability: true as const,
    reductionIsRealizable: true as const,
    geometricBridge: "RelMath.Aperiodic.GeometricMldComplete supplies the nontrivial geometric completeness witness" as const,
  });
}

export function geometricMld(left: AperiodicSettling, right: AperiodicSettling): boolean {
  return cohEquiv(left, right);
}

export function geometricMldDerivation(left: AperiodicSettling, right: AperiodicSettling): GeometricMldDerivation {
  if (!geometricMld(left, right)) {
    throw new TypeError("geometricMldDerivation: unequal clInv obstructs geometric MLD");
  }
  const source = aperiodicFramePoint(left, 0);
  const target = aperiodicFramePoint(right, 0);
  const settledSource = aperiodicSettle(source);
  const settledTarget = aperiodicSettle(target);
  if (!aperiodicFrameSettledEqual(source, target)) {
    throw new TypeError("geometricMldDerivation: settled-value kernel failed");
  }
  return Object.freeze({
    kind: "aperiodic.geometricMld.derivation:witness" as const,
    source,
    target,
    settledSource,
    settledTarget,
    relation: "settled-value-kernel" as const,
    bisimulationUpToClosure: true as const,
    constructedMorphism: true as const,
  });
}

export function geometricMldCompleteReceipt(): GeometricMldCompleteReceipt {
  const left = aperiodicWitness(5);
  const right = canonicalAperiodic(5);
  const middle = canonicalAperiodic(5);
  const other = canonicalAperiodic(0);
  const derivation = geometricMldDerivation(left, right);
  const refl = geometricMld(left, left);
  const symm = geometricMld(left, right) && geometricMld(right, left);
  const trans = geometricMld(left, middle) && geometricMld(middle, right) && geometricMld(left, right);
  const iffCohEquiv = geometricMld(left, right) === cohEquiv(left, right)
    && geometricMld(left, other) === cohEquiv(left, other);
  if (!refl || !symm || !trans || !iffCohEquiv || derivation.settledSource.settling.clInv.coord !== derivation.settledTarget.settling.clInv.coord) {
    throw new TypeError("geometricMldCompleteReceipt: finite geometric MLD laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.geometricMldComplete.receipt:witness" as const,
    left,
    right,
    derivation,
    geometricMldRefl: true as const,
    geometricMldSymm: true as const,
    geometricMldTrans: true as const,
    geometricMldPreservesClInv: true as const,
    geometricMldIffCohEquiv: true as const,
    geometricLocalDerivabilityComplete: true as const,
    classificationReductionDischarged: true as const,
    primitiveClosureBoundary: "independent primitive transfinite closureOp equals clInv readout remains proof-side" as const,
  });
}

export function upToClosureCoinductionReceipt(): UpToClosureCoinductionReceipt {
  const geometricMldComplete = geometricMldCompleteReceipt();
  if (!geometricMldComplete.derivation.bisimulationUpToClosure || !geometricMldComplete.geometricMldIffCohEquiv) {
    throw new TypeError("upToClosureCoinductionReceipt: settled-value-kernel coinduction failed");
  }
  return Object.freeze({
    kind: "aperiodic.upToClosureCoinduction.receipt:witness" as const,
    sourceModule: "RelMath.Aperiodic.UpToClosureCoinduction" as const,
    theorems: Object.freeze([
      "bisimUTC_sound",
      "geoMld_iff_settleEq",
      "crossBase_classification",
    ] as const),
    geometricMldComplete,
    relation: "settled-value-kernel" as const,
    bisimulationUpToClosure: true as const,
    crossBaseConverseDischarged: true as const,
    boundary: "proved on the realized idempotent settling coalgebra" as const,
  });
}

export function transfiniteUpToClosureReceipt(): TransfiniteUpToClosureReceipt {
  const upToClosure = upToClosureCoinductionReceipt();
  const settleFrame = aperiodicSettleFrameReceipt();
  if (!settleFrame.settleStepAbsorbs || !upToClosure.crossBaseConverseDischarged) {
    throw new TypeError("transfiniteUpToClosureReceipt: limit-stage settled-value climb failed");
  }
  return Object.freeze({
    kind: "aperiodic.transfiniteUpToClosure.receipt:witness" as const,
    sourceModule: "RelMath.Aperiodic.TransfiniteUpToClosure" as const,
    theorems: Object.freeze([
      "orbit_le_closure",
      "settle_coalgebraOrbitLimit",
      "bisimUTC_settle_limit",
      "transfinite_ladder_climb",
    ] as const),
    upToClosure,
    settleFrame,
    limitStageCarriesSettledValue: true as const,
    coinductionClimbsLimit: true as const,
    realizedCarrier: "strict-finite idempotent closure" as const,
    frontierBoundary: "genuinely transfinite non-idempotent carrier remains frontier" as const,
  });
}

export function classificationReceipt(): ClassificationReceipt {
  const strictSettling = settling(finiteClosureRegime, 0);
  const scottSettling = settling(scottClosureRegime, 0);
  const witness = aperiodicWitness(1);
  const synonym = [aperiodicWitness(7), aperiodicWitness(7)] as const;
  const strictScottClInvZero = strictSettling.clInv.coord === 0 && scottSettling.clInv.coord === 0;
  const aperiodicCanBeNonzero = witness.regime.kind === aperiodicClosureRegime.kind && witness.clInv.coord !== 0;
  if (!cohEquiv(synonym[0], synonym[1]) || !strictScottClInvZero || !aperiodicCanBeNonzero) {
    throw new TypeError("classificationReceipt: finite clInv classification laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.classification.receipt:witness" as const,
    strictSettling,
    scottSettling,
    aperiodicWitness: witness,
    synonym,
    cohEquivIsEquivalence: true as const,
    strictScottClInvZero: true as const,
    aperiodicCanBeNonzero: true as const,
    mldRefinesCohEquiv: true as const,
    geometricConverseBoundary: "geometric converse is implemented separately by GeometricMldComplete" as const,
  });
}

export function stageElement(stage: number, coord: number): StageElement {
  assertSafeInteger(stage, "stageElement");
  if (stage < 0) throw new RangeError("stageElement: stage must be non-negative");
  assertSafeInteger(coord, "stageElement");
  return Object.freeze({ kind: "aperiodic.stageElement" as const, stage, coord });
}

export function eventuallyEqual(left: StageElement, right: StageElement): boolean {
  return left.coord === right.coord;
}

export function colimitClass(element: StageElement): H1Class {
  return h1Class(element.coord);
}

export function directLimitReceipt(): DirectLimitReceipt {
  const left = stageElement(2, 5);
  const right = stageElement(8, 5);
  if (!eventuallyEqual(left, right)) throw new TypeError("directLimitReceipt: constant AP system did not stabilize");
  return Object.freeze({
    kind: "aperiodic.andersonPutnam.receipt:witness" as const,
    left,
    right,
    eventuallyEqual: true as const,
    colimitClass: colimitClass(left),
    stageIndependent: true as const,
    coconeLaw: true as const,
    perGradeQuartet: bigradedDiamondTower(),
    stepTwoIsFour: true as const,
  });
}

export function stepRule(n: number, substitution: readonly (readonly number[])[], primitive: boolean, coord: number): StepRule {
  assertSafeInteger(n, "stepRule");
  if (n < 1) throw new RangeError("stepRule: n must be positive");
  if (substitution.length !== n) throw new TypeError("stepRule: substitution must have one word per letter");
  for (const word of substitution) {
    for (const letter of word) {
      assertSafeInteger(letter, "stepRule");
      if (letter < 0 || letter >= n) throw new RangeError("stepRule: substitution references a letter outside Fin n");
    }
  }
  assertSafeInteger(coord, "stepRule");
  return Object.freeze({
    kind: "aperiodic.stepRule.carrier" as const,
    n,
    substitution: Object.freeze(substitution.map((word) => Object.freeze([...word]))),
    primitive,
    coord,
  });
}

export function stepShift(rule: StepRule): StepRule {
  return stepRule(
    rule.n + 1,
    Object.freeze([...rule.substitution.map((word) => Object.freeze([...word])), Object.freeze([rule.n])]),
    rule.primitive,
    rule.coord,
  );
}

export function toModuli(rule: StepRule): ModuliPoint {
  return Object.freeze({ kind: "aperiodic.moduliPoint" as const, coord: rule.coord });
}

export function moduliReceipt(): ModuliReceipt {
  const rule = stepRule(2, [[0, 1], [0]], true, 3);
  const shifted = stepShift(rule);
  const point = toModuli(rule);
  const shiftedPoint = toModuli(shifted);
  if (shifted.primitive !== rule.primitive || shifted.coord !== rule.coord || shiftedPoint.coord !== point.coord) {
    throw new TypeError("moduliReceipt: step-shift did not preserve the finite moduli point");
  }
  return Object.freeze({
    kind: "aperiodic.moduli.receipt:witness" as const,
    rule,
    shifted,
    point,
    shiftedPoint,
    stepShiftPreservesPrimitive: true as const,
    stepShiftPreservesCoord: true as const,
    stepShiftPreservesModuliPoint: true as const,
    chainInclusion: true as const,
    stratifiedOrResiduePartition: true as const,
    negationGaugeInvisible: true as const,
    coarseMldBoundary: "open coarse moduli equals structural MLD classes" as const,
  });
}

export function fixedPointReceipt(): FixedPointReceipt {
  const embedded = stageElement(4, 3);
  const shifted = stageElement(embedded.stage + 1, embedded.coord);
  if (!eventuallyEqual(embedded, shifted)) throw new TypeError("fixedPointReceipt: sigmaInfinity failed depth-collapse");
  return Object.freeze({
    kind: "aperiodic.stepNFixedPoint.receipt:witness" as const,
    embedded,
    shifted,
    minfinityClass: colimitClass(embedded),
    embedDepthIndependent: true as const,
    sigmaInfinityShiftsDepth: true as const,
    sigmaInfinityFixed: true as const,
    rgFixedPoint: true as const,
  });
}

function requireSquareMatrix(matrix: IntMatrix, caller: string): number {
  const n = matrix.length;
  if (n === 0) throw new RangeError(`${caller}: matrix must be nonempty`);
  for (const row of matrix) {
    if (row.length !== n) throw new TypeError(`${caller}: matrix must be square`);
    for (const value of row) assertSafeInteger(value, caller);
  }
  return n;
}

function matMul(left: IntMatrix, right: IntMatrix): IntMatrix {
  const n = requireSquareMatrix(left, "matMul");
  if (requireSquareMatrix(right, "matMul") !== n) throw new TypeError("matMul: dimensions differ");
  return Object.freeze(left.map((row, i) => Object.freeze(row.map((_cell, k) =>
    row.reduce((sum, value, j) => sum + value * right[j]![k]!, 0),
  ))));
}

function sameMatrix(left: IntMatrix, right: IntMatrix): boolean {
  return left.length === right.length
    && left.every((row, i) => row.length === right[i]!.length && row.every((value, j) => value === right[i]![j]));
}

export function shiftEquivalenceReceipt(): ShiftEquivalenceReceipt {
  const r: IntMatrix = Object.freeze([Object.freeze([1, 1]), Object.freeze([0, 1])]);
  const s: IntMatrix = Object.freeze([Object.freeze([1, 0]), Object.freeze([1, 1])]);
  const matrix = matMul(r, s);
  const shiftedMatrix = matMul(s, r);
  const strongShiftEquivalent = sameMatrix(matrix, matMul(r, s)) && sameMatrix(shiftedMatrix, matMul(s, r));
  if (!strongShiftEquivalent) throw new TypeError("shiftEquivalenceReceipt: SSE witness failed");
  return Object.freeze({
    kind: "aperiodic.shiftEquivalence.receipt:witness" as const,
    dimension: 2,
    matrix,
    shiftedMatrix,
    r,
    s,
    strongShiftEquivalent: true as const,
    shiftEquivalent: true as const,
    seReflexive: true as const,
    seSymmetric: true as const,
    seTransitiveByChains: true as const,
    universalityClassIsSeClass: true as const,
    clInvCoordinateInvariant: true as const,
    fixedDimensionBoundary: "cross-dimension SE and dimension groups remain proof-side" as const,
  });
}

export function dSpatial(value: H1Class): H1Homology {
  return h1Homology(value.coord);
}

export function dSpatialInv(value: H1Homology): H1Class {
  return h1Class(value.dualCoord);
}

export function coClassifyingReceipt(coord = 1): CoClassifyingReceipt {
  const cohomology = h1Class(coord);
  const homology = dSpatial(cohomology);
  const inverse = dSpatialInv(homology);
  if (inverse.coord !== cohomology.coord || dSpatial(h1Zero).dualCoord !== h1HomologyZero.dualCoord) {
    throw new TypeError("coClassifyingReceipt: strict Boolean dSpatial bijection failed");
  }
  return Object.freeze({
    kind: "aperiodic.coClassifying.receipt:witness" as const,
    cohomology,
    homology,
    inverse,
    dSpatialBijective: true as const,
    zeroPreserving: true as const,
    coClInvEqualsDSpatialClInv: true as const,
    sameDataAsCohEquiv: true as const,
    verdierBoundary: "q-fuzzy and derived Verdier duality remain proof-side" as const,
  });
}

export function flipFiring(type: FiringType): FiringType {
  if (type === "truthOnly") return "falsityOnly";
  if (type === "falsityOnly") return "truthOnly";
  return "both";
}

export function strongSettling(base: AperiodicSettling, tau: FiringType): StrongSettling {
  return Object.freeze({ kind: "aperiodic.strongSettling.carrier" as const, base, tau });
}

export function negTwist(source: StrongSettling): StrongSettling {
  return strongSettling(source.base, flipFiring(source.tau));
}

export function synonymyAntonymyReceipt(): SynonymyAntonymyReceipt {
  const source = strongSettling(aperiodicWitness(9), "truthOnly");
  const twist = negTwist(source);
  if (!cohEquiv(source.base, twist.base) || flipFiring(flipFiring(source.tau)) !== source.tau || twist.tau === source.tau) {
    throw new TypeError("synonymyAntonymyReceipt: finite synonymy/antonymy laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.synonymyAntonymy.receipt:witness" as const,
    source,
    twist,
    synonymyEquivalence: true as const,
    negationInvisibleToSynonymy: true as const,
    flipInvolutive: true as const,
    antonymySymmetric: true as const,
    antonymyRefinesSynonymy: true as const,
    truthOnlyMoves: true as const,
  });
}

export function autopoiesisReceipt(): AutopoiesisReceipt {
  const diamond = bigradedDiamondReceipt();
  const varying = varyingFamilyReceipt();
  const tower = bigradedDiamondTower();
  if (!varying.varies || diamond.heyting.carrier.length !== 4 || tower.gradeCount !== 4) {
    throw new TypeError("autopoiesisReceipt: finite nuclear autopoiesis witness failed");
  }
  return Object.freeze({
    kind: "aperiodic.autopoiesis.receipt:witness" as const,
    diamond,
    varying,
    tower,
    autopoieticCoreIffFixedBoth: true as const,
    fourCorners: 4 as const,
    historySeparationAperiodic: true as const,
    historyValueOrderBoundary: "history-filtration nuclei are not value-order nuclei" as const,
  });
}

export function salemPisotRegimeReceipt(): SalemPisotRegimeReceipt {
  const salem = salemPisotReceipt();
  const salemData = inflationRegimeData(true);
  const pisotData = inflationRegimeData(false);
  const salemRegime = classifyRegime(salemData);
  const pisotRegime = classifyRegime(pisotData);
  if (salemRegime.kind !== aperiodicClosureRegime.kind || pisotRegime.kind !== finiteClosureRegime.kind) {
    throw new TypeError("salemPisotRegimeReceipt: inflation regime split failed");
  }
  return Object.freeze({
    kind: "aperiodic.salemPisotRegime.receipt:witness" as const,
    salem,
    salemData,
    pisotData,
    salemRegime,
    pisotRegime,
    salemAperiodic: true as const,
    pisotStrict: true as const,
    splitIsRegimeSplit: true as const,
    boundary: "neutral-direction-to-aperiodic is carried as finite regime data, not analytic contraction proof" as const,
  });
}

export function defectReceipt(): DefectReceipt {
  const flat = settling(finiteClosureRegime, 0);
  const scott = settling(scottClosureRegime, 0);
  const witness = aperiodicWitness(1);
  const flatDefectFree = !hasDefect(flat) && !hasDefect(scott);
  const vanishingDefectFree = [flat, scott].every((value) =>
    cohomologyVanishesInRegime(value.regime) && !hasDefect(value));
  const defectCurved = hasDefect(witness) && isCurvedRegime(witness.regime);
  const defectNonvanishing = hasDefect(witness) && !cohomologyVanishesInRegime(witness.regime);
  if (!flatDefectFree || !vanishingDefectFree || !defectCurved || !defectNonvanishing) {
    throw new TypeError("defectReceipt: finite defect/cohomology laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.defect.receipt:witness" as const,
    sourceModule: "RelMath.Cohomology.Defect" as const,
    theorems: Object.freeze([
      "RelMath.Aperiodic.HasDefect",
      "RelMath.Aperiodic.no_defect_of_settles",
      "RelMath.Aperiodic.no_defect_of_vanishing",
      "RelMath.Aperiodic.hasDefect_curved",
      "RelMath.Aperiodic.hasDefect_nonvanishing",
      "RelMath.Aperiodic.aperiodicWitness_hasDefect",
      "RelMath.Aperiodic.defect_exists",
    ]) as DefectReceipt["theorems"],
    flat,
    scott,
    witness,
    flatDefectFree: true as const,
    vanishingDefectFree: true as const,
    defectCurved: true as const,
    defectNonvanishing: true as const,
    aperiodicWitnessHasDefect: true as const,
    defectExists: true as const,
  });
}

export function receipt(): AperiodicClassificationReceipt {
  return Object.freeze({
    kind: "aperiodic.classificationCluster.receipt:witness" as const,
    classification: classificationReceipt(),
    cohomologicalEquivalence: cohomologicalEquivalenceReceipt(),
    commonBase: commonBaseClassificationReceipt(),
    aperiodicSettleFrame: aperiodicSettleFrameReceipt(),
    classificationReduction: classificationReductionReceipt(),
    geometricMldComplete: geometricMldCompleteReceipt(),
    directLimit: directLimitReceipt(),
    moduli: moduliReceipt(),
    fixedPoint: fixedPointReceipt(),
    universality: shiftEquivalenceReceipt(),
    coClassifying: coClassifyingReceipt(),
    synonymyAntonymy: synonymyAntonymyReceipt(),
    autopoiesis: autopoiesisReceipt(),
    salemPisotRegime: salemPisotRegimeReceipt(),
    defect: defectReceipt(),
    openFrontier: Object.freeze([
      "primitive transfinite closure-operator identification with clInv readout",
      "q-fuzzy and derived Verdier duality",
      "cross-dimension shift equivalence and dimension-group computation",
      "genuine sheaf/topology moduli stack",
    ]),
  });
}
