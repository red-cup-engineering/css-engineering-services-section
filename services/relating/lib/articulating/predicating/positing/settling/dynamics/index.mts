/**
 * @packageDocumentation
 *
 * settling/dynamics - finite substitution-dynamics reads for aperiodic settling.
 *
 * This module exposes the executable part of the package's aperiodic-settling
 * line: finite substitution rules, finite words and orbits, exact incidence
 * matrices, characteristic-polynomial reads, primitivity judgments, localized
 * colimit data, substitution duality checks, and the step-`n` recurrence
 * hierarchy.
 *
 * It is not a general dynamical-systems package, a real eigenvalue solver, or
 * the whole aperiodic-moduli program. The runtime claim is carrier-shaped and
 * finite: callers provide substitution data, and the package returns exact
 * matrices plus witness/obstruction data for the laws it can check.
 *
 * Mathematical grounding lives in `lean/RelMath/Aperiodic/StepN/Recurrence.lean`
 * and `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean`. The content spine
 * is the step-`n` substitution-recurrence family under aperiodic settling.
 */
export * from "./substitution/index.mjs";
export * as recurrence from "./substitution/recurrence/index.mjs";
export * as mld from "./substitution/mld.mjs";
export * as hull from "./substitution/hull.mjs";
export * as tiling from "./substitution/tiling.mjs";
export * as sofic from "./substitution/sofic.mjs";
