/**
 * settling/dynamics/substitution/hull - finite inverse-system hull helpers.
 *
 * The `mld` module reads a substitution through its finite colimit invariant.
 * This module exposes the geometric dual shape the Node package can execute:
 * finite inverse systems, finite coherent-thread checks, a canonical binary
 * odometer system at finite depth, and a seam from a substitution matrix back to
 * the same finite invariant.
 *
 * These helpers are deliberately bounded. They model the inverse-limit shape by
 * checking finite families of projections; they do not materialize an
 * uncountable Cantor hull, classify arbitrary tiling spaces, or prove
 * unbounded inverse-limit completeness. The useful product surface is the
 * carrier and judgment vocabulary: stage, restriction, thread witness, thread
 * obstruction, finite-cylinder separation, and hull-to-invariant seam.
 *
 * Grounding: `lean/RelMath/Aperiodic/InverseHull.lean` and the surrounding
 * Anderson-Putnam/aperiodic RelMath spine. The public authority here is the
 * finite inverse-system behavior implemented below.
 *
 * @packageDocumentation
 */
import { mldInvariant, type MLDInvariant } from "./mld.mjs";
import { type SubstitutionIncidenceMatrix } from "./index.mjs";

/** An inverse system of finite-stage data with bonding/restriction maps. */
export interface InverseSystem<S> {
  readonly kind: "substitution.dynamics.hull.inverseSystem";
  readonly stage: (level: number) => readonly S[];
  readonly restrict: (lower: number, upper: number, value: S) => S;
}

/** A coherent finite family, read as a thread witness. */
export interface ThreadWitness<S> {
  readonly kind: "substitution.dynamics.hull.thread:witness";
  readonly values: readonly S[];
}
/** A finite family that breaks coherence at some stage. */
export interface ThreadObstruction<S> {
  readonly kind: "substitution.dynamics.hull.thread-obstruction";
  readonly atStage: number;
  readonly expected: S;
  readonly found: S;
}
/** The result of testing a candidate thread. */
export type ThreadJudgment<S> = ThreadWitness<S> | ThreadObstruction<S>;

/** Whether a finite family is coherent under each consecutive restriction. */
export function coherentThread<S>(
  system: InverseSystem<S>,
  values: readonly S[],
  equal: (left: S, right: S) => boolean,
): ThreadJudgment<S> {
  for (let level = 0; level + 1 < values.length; level += 1) {
    const restricted = system.restrict(level, level + 1, values[level + 1]!);
    if (!equal(restricted, values[level]!)) {
      return Object.freeze({ kind: "substitution.dynamics.hull.thread-obstruction" as const, atStage: level, expected: restricted, found: values[level]! });
    }
  }
  return Object.freeze({ kind: "substitution.dynamics.hull.thread:witness" as const, values: Object.freeze([...values]) });
}

/** Whether two finite threads agree at every visible projection. */
export function threadsSeparated<S>(left: readonly S[], right: readonly S[], equal: (l: S, r: S) => boolean): boolean {
  return left.length === right.length && left.every((value, level) => equal(value, right[level]!));
}

/** A finite-depth binary odometer inverse system using prefix restriction. */
export function odometerHull(): InverseSystem<string> {
  const words = (length: number): readonly string[] => {
    if (length === 0) return [""];
    const shorter = words(length - 1);
    return Object.freeze(shorter.flatMap((word) => [`${word}0`, `${word}1`]));
  };
  return Object.freeze({
    kind: "substitution.dynamics.hull.inverseSystem" as const,
    stage: (level: number) => words(level),
    restrict: (lower: number, _upper: number, value: string) => value.slice(0, lower),
  });
}

/** A constant inverse system whose every stage carries the same finite invariant. */
export function constantHull(invariant: MLDInvariant): InverseSystem<MLDInvariant> {
  return Object.freeze({
    kind: "substitution.dynamics.hull.inverseSystem" as const,
    stage: () => Object.freeze([invariant]),
    restrict: (_lower: number, _upper: number, value: MLDInvariant) => value,
  });
}

/** Read the finite invariant exposed at the hull/colimit seam for a matrix. */
export function hullSeam(matrix: SubstitutionIncidenceMatrix): MLDInvariant {
  return mldInvariant(matrix);
}
