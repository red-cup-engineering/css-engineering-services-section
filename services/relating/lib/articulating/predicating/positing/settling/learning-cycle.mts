/**
 * settling/learning-cycle — observed learning-cycle reads over closure traces.
 *
 * The content-side learning notes read learning as iteration of a monotone,
 * inflationary closure operator: the learner ascends until a fixed point, so a
 * genuine return to an earlier non-fixed state is not a cycle but an
 * obstruction to that learning reading.
 *
 * This module keeps the Node claim smaller and executable. It does not prove an
 * arbitrary JavaScript endomorphism monotone or inflationary. It reads a
 * `ClosureCarrier` already produced by the closure workbench and reports what
 * the recorded finite orbit shows: consecutive ascent, absence or presence of a
 * nontrivial return, the bounded stabilization judgment, and a learning-depth
 * read when the closure search found a regime.
 *
 * The stronger learning-cycle theorem lives in the content and Lean closure
 * ordinal material. This module is the package's executable read: it inspects
 * a finite carrier, it does not certify arbitrary closure operators.
 *
 * @example
 * ```ts
 * const closed = closeOrdinalProcess(process);
 * const cycle = learningCycleOfClosureCarrier(closed);
 *
 * cycle.ascent.kind; // "learning.cycle.observedAscent:witness"
 * cycle.nontrivialReturn.kind; // "learning.cycle.nontrivialReturn:witness"
 * ```
 *
 * @packageDocumentation
 */
import type {
  ClosureCarrier,
  ClosureOrbitPoint,
  ClosureStabilizationJudgment,
} from "./closure.mjs";
import { learningDepthOfRegime, type LearningDepth } from "./learning-depth.mjs";

/** A consecutive ascent comparison in an observed closure orbit. */
export interface ObservedLearningAscentStep<T> {
  readonly kind: "learning.cycle.observedAscentStep";
  readonly index: number;
  readonly previous: ClosureOrbitPoint<T>;
  readonly current: ClosureOrbitPoint<T>;
}

/** Witness that every recorded successor step ascends in the supplied lattice. */
export interface ObservedLearningAscentWitness<T> {
  readonly kind: "learning.cycle.observedAscent:witness";
  readonly steps: readonly ObservedLearningAscentStep<T>[];
}

/** Obstruction: one recorded successor step descends or becomes unordered. */
export interface ObservedLearningAscentObstruction<T> {
  readonly kind: "learning.cycle.observedAscent-obstruction";
  readonly failed: ObservedLearningAscentStep<T>;
}

/** Judgment for whether the recorded orbit ascends stepwise. */
export type ObservedLearningAscentJudgment<T> =
  | ObservedLearningAscentWitness<T>
  | ObservedLearningAscentObstruction<T>;

/** A later observed point equal to an earlier observed point. */
export interface ObservedLearningReturn<T> {
  readonly kind: "learning.cycle.observedReturn";
  readonly firstIndex: number;
  readonly returnIndex: number;
  readonly first: ClosureOrbitPoint<T>;
  readonly returned: ClosureOrbitPoint<T>;
}

/** Witness that the recorded orbit has no nontrivial return. */
export interface ObservedLearningNoNontrivialReturnWitness {
  readonly kind: "learning.cycle.nontrivialReturn:witness";
  readonly inspectedPoints: number;
}

/** Obstruction: the recorded orbit returns to an earlier point before closure. */
export interface ObservedLearningNontrivialReturnObstruction<T> {
  readonly kind: "learning.cycle.nontrivialReturn-obstruction";
  readonly return: ObservedLearningReturn<T>;
}

/** Judgment for whether the recorded orbit contains a nontrivial return. */
export type ObservedLearningNontrivialReturnJudgment<T> =
  | ObservedLearningNoNontrivialReturnWitness
  | ObservedLearningNontrivialReturnObstruction<T>;

/** The learning-cycle read of one closure carrier's recorded orbit. */
export interface ObservedLearningCycleRead<T> {
  readonly kind: "learning.cycle.observedClosureTrace";
  readonly closure: ClosureCarrier<T>;
  readonly ascent: ObservedLearningAscentJudgment<T>;
  readonly nontrivialReturn: ObservedLearningNontrivialReturnJudgment<T>;
  readonly stabilization: ClosureStabilizationJudgment<T>;
  readonly depth: LearningDepth | null;
}

const ascentStep = <T,>(
  index: number,
  previous: ClosureOrbitPoint<T>,
  current: ClosureOrbitPoint<T>,
): ObservedLearningAscentStep<T> => Object.freeze({
  kind: "learning.cycle.observedAscentStep" as const,
  index,
  previous,
  current,
});

const observedReturn = <T,>(
  firstIndex: number,
  returnIndex: number,
  first: ClosureOrbitPoint<T>,
  returned: ClosureOrbitPoint<T>,
): ObservedLearningReturn<T> => Object.freeze({
  kind: "learning.cycle.observedReturn" as const,
  firstIndex,
  returnIndex,
  first,
  returned,
});

/** Read consecutive ascent from the finite orbit recorded by a closure carrier. */
export function observedLearningAscent<T>(closure: ClosureCarrier<T>): ObservedLearningAscentJudgment<T> {
  const steps: ObservedLearningAscentStep<T>[] = [];
  for (let index = 1; index < closure.orbit.length; index += 1) {
    const previous = closure.orbit[index - 1]!;
    const current = closure.orbit[index]!;
    const step = ascentStep(index, previous, current);
    if (!closure.process.lattice.leq(previous.value, current.value)) {
      return Object.freeze({ kind: "learning.cycle.observedAscent-obstruction" as const, failed: step });
    }
    steps.push(step);
  }
  return Object.freeze({ kind: "learning.cycle.observedAscent:witness" as const, steps: Object.freeze(steps) });
}

/**
 * Read whether the finite orbit contains a nontrivial return.
 *
 * A return is judged over the recorded orbit only. The closure workbench stops
 * before appending the repeated fixed point, so a returned point here is a real
 * finite-cycle observation, not merely the final plateau.
 */
export function observedLearningNontrivialReturn<T>(closure: ClosureCarrier<T>): ObservedLearningNontrivialReturnJudgment<T> {
  for (let returnIndex = 1; returnIndex < closure.orbit.length; returnIndex += 1) {
    const returned = closure.orbit[returnIndex]!;
    for (let firstIndex = 0; firstIndex < returnIndex; firstIndex += 1) {
      const first = closure.orbit[firstIndex]!;
      if (closure.process.lattice.eq(first.value, returned.value)) {
        return Object.freeze({
          kind: "learning.cycle.nontrivialReturn-obstruction" as const,
          return: observedReturn(firstIndex, returnIndex, first, returned),
        });
      }
    }
  }
  return Object.freeze({
    kind: "learning.cycle.nontrivialReturn:witness" as const,
    inspectedPoints: closure.orbit.length,
  });
}

/** Read a closure carrier as the package's current observed learning cycle. */
export function learningCycleOfClosureCarrier<T>(closure: ClosureCarrier<T>): ObservedLearningCycleRead<T> {
  const depth = closure.search.kind === "ordinal.closure.stabilizationSearch:witness"
    ? learningDepthOfRegime(closure.search.regime)
    : null;
  return Object.freeze({
    kind: "learning.cycle.observedClosureTrace" as const,
    closure,
    ascent: observedLearningAscent(closure),
    nontrivialReturn: observedLearningNontrivialReturn(closure),
    stabilization: closure.stabilization,
    depth,
  });
}
