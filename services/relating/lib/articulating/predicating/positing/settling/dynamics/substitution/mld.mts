/**
 * settling/dynamics/substitution/mld - finite MLD-invariant comparisons.
 *
 * This module names the mutually-locally-derivable reading that the Node package
 * can currently execute: compare the finite cohomological invariant carried by
 * two substitution incidence matrices. The invariant is the same structure
 * returned by {@link colimStructure}: rank, determinant, Smith normal form,
 * stable determinant, and localized integer module.
 *
 * The result stays in the package's witness/obstruction idiom. Equal invariants
 * produce a `substitution.dynamics.mld:witness`; unequal invariants produce an
 * obstruction naming the first separating component. This is useful as the
 * implemented Anderson-Putnam-classifier layer. It is not an arbitrary tiling
 * equivalence solver, and it does not construct local derivation maps between
 * raw tilings.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/*`, the RelMath aperiodic import
 * spine, and the content aperiodic-regime classification notes. The public
 * authority here is the finite invariant comparison implemented below.
 *
 * @packageDocumentation
 */
import {
  abelianize,
  colimStructure,
  type ColimStructure,
  type SubstitutionCarrier,
  type SubstitutionIncidenceMatrix,
} from "./index.mjs";
import {
  intEqual,
  natEqual,
  type Integer,
} from "../../analysis/exact-number.mjs";

/** The finite classifying invariant of a substitution incidence matrix. */
export type MLDInvariant = ColimStructure;

/** The colimit invariant of a substitution incidence matrix, named in its MLD role. */
export function mldInvariant(matrix: SubstitutionIncidenceMatrix): MLDInvariant {
  return colimStructure(matrix);
}

/** Whether two finite MLD invariants agree component-by-component. */
function sameInvariant(left: MLDInvariant, right: MLDInvariant): boolean {
  return natEqual(left.rank, right.rank)
    && intEqual(left.det, right.det)
    && intEqual(left.stableDet, right.stableDet)
    && left.smith.length === right.smith.length
    && left.smith.every((factor: Integer, index: number) => intEqual(factor, right.smith[index]!))
    && natEqual(left.module.rank, right.module.rank)
    && left.module.invertedPrimes.length === right.module.invertedPrimes.length
    && left.module.invertedPrimes.every((prime: Integer, index: number) => intEqual(prime, right.module.invertedPrimes[index]!));
}

/** Two incidence matrices agree on the implemented finite MLD invariant. */
export interface MutuallyLocallyDerivableWitness {
  readonly kind: "substitution.dynamics.mld:witness";
  readonly left: MLDInvariant;
  readonly right: MLDInvariant;
}

/** Which component of the finite invariant separates two substitution matrices. */
export type MLDObstructionReason = "rank" | "determinant" | "smith-normal-form" | "localized-module";

/** Two incidence matrices differ on the implemented finite MLD invariant. */
export interface MutuallyLocallyDerivableObstruction {
  readonly kind: "substitution.dynamics.mld-obstruction";
  readonly reason: MLDObstructionReason;
  readonly left: MLDInvariant;
  readonly right: MLDInvariant;
}

/** The result of an MLD comparison. */
export type MutuallyLocallyDerivableJudgment = MutuallyLocallyDerivableWitness | MutuallyLocallyDerivableObstruction;

/** The separating component of two differing invariants, checked coarse to fine. */
function mldObstructionReason(left: MLDInvariant, right: MLDInvariant): MLDObstructionReason {
  if (!natEqual(left.rank, right.rank)) return "rank";
  if (!intEqual(left.det, right.det) || !intEqual(left.stableDet, right.stableDet)) return "determinant";
  if (left.smith.length !== right.smith.length || !left.smith.every((factor: Integer, index: number) => intEqual(factor, right.smith[index]!))) return "smith-normal-form";
  return "localized-module";
}

/** Compare two substitution incidence matrices by the finite MLD invariant. */
export function mutuallyLocallyDerivable(left: SubstitutionIncidenceMatrix, right: SubstitutionIncidenceMatrix): MutuallyLocallyDerivableJudgment {
  const leftInvariant = mldInvariant(left);
  const rightInvariant = mldInvariant(right);
  return sameInvariant(leftInvariant, rightInvariant)
    ? Object.freeze({ kind: "substitution.dynamics.mld:witness" as const, left: leftInvariant, right: rightInvariant })
    : Object.freeze({ kind: "substitution.dynamics.mld-obstruction" as const, reason: mldObstructionReason(leftInvariant, rightInvariant), left: leftInvariant, right: rightInvariant });
}

/** Compare two substitution carriers by abelianizing over their own alphabets first. */
export function carriersMutuallyLocallyDerivable(left: SubstitutionCarrier, right: SubstitutionCarrier): MutuallyLocallyDerivableJudgment {
  return mutuallyLocallyDerivable(abelianize(left.rule, left.alphabet), abelianize(right.rule, right.alphabet));
}
