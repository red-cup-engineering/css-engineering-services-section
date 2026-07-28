/**
 * analysis/bigraded-cohomology - finite executable shadow of
 * RelMath.Positing.BigradedCohomology.
 *
 * Lean states the aperiodic-regime trichotomy and the internal Z/2 gauge over a
 * finite cell list and valuation. This runtime surface takes the finite list of
 * FOUR charge names that results from such a valuation and returns the
 * truth/inconsistency content, regime, and gauge facts as a carrier receipt.
 */
import {
  asChargeValueName,
  chargeValue,
  chargeValueName,
  negateValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  combine,
  cochain,
  dK,
  dT,
  dTop,
  defaultCochain,
  defaultValuation,
  projT,
  projTop,
  vanishesOff,
  type ChargedCell,
  type CochainCarrier,
} from "./settling-associated-sheaf.mjs";

export type BigradedRegimeName = "trivial" | "consistent" | "paraconsistent" | "mixed";

export interface BigradedCohomologyReceipt {
  readonly kind: "bigradedCohomology.receipt:witness";
  readonly charges: readonly ChargeValueName[];
  readonly negated: readonly ChargeValueName[];
  readonly truthContent: boolean;
  readonly falseContent: boolean;
  readonly inconsistencyContent: boolean;
  readonly regime: BigradedRegimeName;
  readonly nontrivialTrichotomy: true;
  readonly truthInconsistencyDisjoint: true;
  readonly gaugeFixesInconsistency: true;
  readonly gaugeFlipsTruthToFalse: true;
  readonly paraconsistentGaugeStable: boolean;
  readonly classicalGaugeMoved: boolean;
}

export interface TruthKnowledgeSectionDecompositionReceipt {
  readonly kind: "bigradedCohomology.truthKnowledgeSectionDecomposition:witness";
  readonly valuation: readonly ChargedCell[];
  readonly knowledgeSection: CochainCarrier;
  readonly truthSection: CochainCarrier;
  readonly topSection: CochainCarrier;
  readonly merged: CochainCarrier;
  readonly knowledgeSupported: true;
  readonly truthSupported: true;
  readonly topSupported: true;
  readonly mergeSplitIdentity: true;
  readonly splitMergeIdentityOnSamples: true;
  readonly h1Vanishes: true;
  readonly hnAboveOneZero: true;
  readonly degenerateLes: true;
  readonly sampleSize: number;
  readonly frontier: "full graded LES over arbitrary cochain complexes remains proof-side";
}

export interface LocalMldClassificationReceipt {
  readonly kind: "bigradedCohomology.localMldClassification.receipt:witness";
  readonly sourceModule: "RelMath.Positing.LocalMldClassification";
  readonly theorems: readonly [
    "negate_involutive",
    "gaugeEquiv_refl",
    "gaugeEquiv_symm",
    "gaugeEquiv_trans",
    "local_mld_classification",
    "bilattice_base_mld",
  ];
  readonly gaugeOrbits: readonly (readonly ChargeValueName[])[];
  readonly localClInvFibers: readonly (readonly ChargeValueName[])[];
  readonly converseIncluded: true;
}

const freezeChargeNames = (charges: readonly ChargeValueName[]): readonly ChargeValueName[] =>
  Object.freeze([...charges]);

export const normalizeChargeNames = (charges: readonly string[]): readonly ChargeValueName[] =>
  freezeChargeNames(charges.map(asChargeValueName));

export const isTruthFiring = (charge: ChargeValueName): boolean => charge === "potential";
export const isFalseFiring = (charge: ChargeValueName): boolean => charge === "active";
export const isInconsistency = (charge: ChargeValueName): boolean => charge === "stable";

export const truthContent = (charges: readonly ChargeValueName[]): boolean => charges.some(isTruthFiring);
export const falseContent = (charges: readonly ChargeValueName[]): boolean => charges.some(isFalseFiring);
export const inconsistencyContent = (charges: readonly ChargeValueName[]): boolean => charges.some(isInconsistency);

export function regimeOf(truth: boolean, inconsistency: boolean): BigradedRegimeName {
  if (truth && inconsistency) return "mixed";
  if (truth) return "consistent";
  if (inconsistency) return "paraconsistent";
  return "trivial";
}

export const negateNames = (charges: readonly ChargeValueName[]): readonly ChargeValueName[] =>
  freezeChargeNames(charges.map((name) => chargeValueName(negateValue(chargeValue(name)))));

const paraconsistentOnly = (charges: readonly ChargeValueName[]): boolean =>
  charges.every((name) => name === "absurd" || name === "stable");

/** Finite bigraded-cohomology and gauge receipt over a list of FOUR charge names. */
export function receipt(chargesInput: readonly string[]): BigradedCohomologyReceipt {
  const charges = normalizeChargeNames(chargesInput);
  const negated = negateNames(charges);
  const truth = truthContent(charges);
  const falsity = falseContent(charges);
  const inconsistency = inconsistencyContent(charges);
  const negatedTruth = truthContent(negated);
  const negatedInconsistency = inconsistencyContent(negated);
  const paraconsistentGaugeStable = paraconsistentOnly(charges)
    ? negated.every((name, index) => name === charges[index])
    : false;
  const classicalGaugeMoved = charges.some((name, index) => isTruthFiring(name) && negated[index] !== name);

  if (negatedInconsistency !== inconsistency) {
    throw new Error("bigradedCohomology: negation failed to preserve inconsistency content");
  }
  if (negatedTruth !== falsity) {
    throw new Error("bigradedCohomology: negation failed to flip truth content to false content");
  }

  return Object.freeze({
    kind: "bigradedCohomology.receipt:witness" as const,
    charges,
    negated,
    truthContent: truth,
    falseContent: falsity,
    inconsistencyContent: inconsistency,
    regime: regimeOf(truth, inconsistency),
    nontrivialTrichotomy: true as const,
    truthInconsistencyDisjoint: true as const,
    gaugeFixesInconsistency: true as const,
    gaugeFlipsTruthToFalse: true as const,
    paraconsistentGaugeStable,
    classicalGaugeMoved,
  });
}

const coefficientAt = (value: CochainCarrier, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochain = (cells: readonly string[], left: CochainCarrier, right: CochainCarrier): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const canonicalCells = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const sampleKnowledgeSections = (valuation: readonly ChargedCell[]): readonly CochainCarrier[] => {
  const knowledgeCells = dK(valuation).cells;
  const values = [-1, 0, 1] as const;
  let samples: readonly CochainCarrier[] = Object.freeze([cochain([])]);
  for (const cell of knowledgeCells) {
    samples = Object.freeze(samples.flatMap((existing) =>
      values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient }]))));
  }
  return samples;
};

/**
 * Finite degree-0 carrier for `RelMath.Cohomology.BigradedTruthKnowledgeLES`.
 *
 * Knowledge-supported sections split into truth-supported and top-supported
 * sections, and those two parts merge back uniquely over the sampled finite
 * cochain carrier. The full long exact sequence is recorded only at the
 * degenerate degree-0/H1-vanishing boundary.
 */
export function truthKnowledgeSectionDecompositionReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  knowledgeSectionInput: CochainCarrier = defaultCochain,
): TruthKnowledgeSectionDecompositionReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = canonicalCells(valuation);
  const knowledgeMask = dK(valuation);
  const truthMask = dT(valuation);
  const topMask = dTop(valuation);
  const knowledgeSection = knowledgeSectionInput;
  const truthSection = projT(valuation, knowledgeSection);
  const topSection = projTop(valuation, knowledgeSection);
  const merged = combine(truthSection, topSection);
  const samples = sampleKnowledgeSections(valuation);

  const knowledgeSupported = vanishesOff(knowledgeMask, knowledgeSection, cells);
  const truthSupported = vanishesOff(truthMask, truthSection, cells);
  const topSupported = vanishesOff(topMask, topSection, cells);
  const mergeSplitIdentity = sameCochain(cells, merged, knowledgeSection);
  const splitMergeIdentityOnSamples = samples.every((sample) => {
    const truthPart = projT(valuation, sample);
    const topPart = projTop(valuation, sample);
    const recombined = combine(truthPart, topPart);
    return sameCochain(cells, recombined, sample)
      && sameCochain(cells, projT(valuation, recombined), truthPart)
      && sameCochain(cells, projTop(valuation, recombined), topPart);
  });

  if (!knowledgeSupported || !truthSupported || !topSupported || !mergeSplitIdentity || !splitMergeIdentityOnSamples) {
    throw new TypeError("truthKnowledgeSectionDecompositionReceipt: finite truth/knowledge direct-sum laws failed");
  }

  return Object.freeze({
    kind: "bigradedCohomology.truthKnowledgeSectionDecomposition:witness" as const,
    valuation,
    knowledgeSection,
    truthSection,
    topSection,
    merged,
    knowledgeSupported: true as const,
    truthSupported: true as const,
    topSupported: true as const,
    mergeSplitIdentity: true as const,
    splitMergeIdentityOnSamples: true as const,
    h1Vanishes: true as const,
    hnAboveOneZero: true as const,
    degenerateLes: true as const,
    sampleSize: samples.length,
    frontier: "full graded LES over arbitrary cochain complexes remains proof-side" as const,
  });
}

export const workedMixedCharges: readonly ChargeValueName[] = Object.freeze([
  "potential",
  "stable",
  "absurd",
]);

export const workedParaconsistentCharges: readonly ChargeValueName[] = Object.freeze([
  "stable",
  "absurd",
]);

export function localMldClassificationReceipt(): LocalMldClassificationReceipt {
  const gaugeOrbits = Object.freeze([
    Object.freeze(["absurd"] as const),
    Object.freeze(["potential", "active"] as const),
    Object.freeze(["stable"] as const),
  ]);
  return Object.freeze({
    kind: "bigradedCohomology.localMldClassification.receipt:witness" as const,
    sourceModule: "RelMath.Positing.LocalMldClassification" as const,
    theorems: Object.freeze([
      "negate_involutive",
      "gaugeEquiv_refl",
      "gaugeEquiv_symm",
      "gaugeEquiv_trans",
      "local_mld_classification",
      "bilattice_base_mld",
    ] as const),
    gaugeOrbits,
    localClInvFibers: gaugeOrbits,
    converseIncluded: true as const,
  });
}
