/**
 * settling/closure — bounded ordinal closure as carrier data.
 *
 * This module is the Node-side workbench for processes that can be read as
 * repeated application of a monotone endomorphism on a caller-supplied lattice.
 * It does not try to be a general ordinal runtime. It gives ordinary Node code
 * an observable closure carrier: the orbit from bottom, the searched
 * stabilization stage, and a finite / Scott / transfinite regime read when the
 * bounded search finds a witness.
 *
 * Ordinals are built as zero / successor / labelled limit with a fundamental
 * sequence; a `Lattice<T>` carries bottom, leq, join, eq, and a stabilizing sup;
 * a `ClosureProcessCarrier<T>` is an endomorphism over that lattice with a
 * search horizon. `closeOrdinalProcess` iterates from bottom, recording the
 * finite orbit it actually evaluates, then probes finite and labelled limit
 * stages for stabilization. The result is a witness or obstruction, never an
 * implicit claim that all transfinite behavior has been decided.
 *
 * @example
 * ```js
 * import * as settling from "@red-cup-engineering/relating/settling";
 *
 * const eq = (left, right) => left === right;
 * const lattice = {
 *   bottom: 0,
 *   leq: (left, right) => left <= right,
 *   join: (left, right) => Math.max(left, right),
 *   eq,
 *   sup: settling.stabilizingSup({ eq }),
 * };
 *
 * const process = settling.closureProcess(lattice, (value) => Math.min(3, value + 1));
 * const closed = settling.closeOrdinalProcess(process);
 *
 * closed.search.kind; // "ordinal.closure.stabilizationSearch:witness"
 * closed.search.regime.kind; // "ordinal.closure.regime.finite"
 * ```
 *
 * @see closeOrdinalProcess
 */
import { natIsZero, natZero, predecessor, successor, type Natural } from "./analysis/exact-number.mjs";
import { mark, type Mark } from "../../../utterance.mjs";

/** The zero ordinal. */
export interface ZeroOrdinal {
  readonly kind: "ordinal.closure.ordinal.zero";
}

/** A successor ordinal. */
export interface SuccessorOrdinal {
  readonly kind: "ordinal.closure.ordinal.successor";
  readonly predecessor: Ordinal;
}

/** A label for a limit ordinal: an opaque mark, never a display string. */
export interface OrdinalLabel {
  readonly kind: "ordinal.closure.ordinalLabel";
  readonly mark: Mark;
}

/** A carrier label for canonical omega multiples. */
export interface OmegaMultipleOrdinalLabel {
  readonly kind: "ordinal.closure.omegaMultipleLabel";
  readonly multiplier: Natural;
}

/** A carrier label for omega squared. */
export interface OmegaSquaredOrdinalLabel {
  readonly kind: "ordinal.closure.omegaSquaredLabel";
}

/** A limit ordinal: a labelled ordinal with a fundamental sequence. */
export interface LimitOrdinal {
  readonly kind: "ordinal.closure.ordinal.limit";
  readonly label: OrdinalLabel;
  readonly fundamentalSequence: (n: Natural) => Ordinal;
}

/** An ordinal in the closure tower. */
export type Ordinal = ZeroOrdinal | SuccessorOrdinal | LimitOrdinal;

/** Witness that an ordinal is finite, with its natural value. */
export interface FiniteOrdinalWitness {
  readonly kind: "ordinal.closure.finiteOrdinal:witness";
  readonly ordinal: Ordinal;
  readonly value: Natural;
}

/** Obstruction to an ordinal being finite, with the non-zero residue. */
export interface FiniteOrdinalObstruction {
  readonly kind: "ordinal.closure.finiteOrdinal-obstruction";
  readonly ordinal: Ordinal;
  readonly residue: Ordinal;
}

/** The result of testing whether an ordinal is finite. */
export type FiniteOrdinalJudgment = FiniteOrdinalWitness | FiniteOrdinalObstruction;

/** The finite closure regime. */
export interface FiniteClosureRegime { readonly kind: "ordinal.closure.regime.finite"; }
/** The Scott closure regime (closure at omega). */
export interface ScottClosureRegime { readonly kind: "ordinal.closure.regime.scott"; }
/** The transfinite closure regime (beyond omega). */
export interface TransfiniteClosureRegime { readonly kind: "ordinal.closure.regime.transfinite"; }
/** The aperiodic closure regime (no countable stabilization). */
export interface AperiodicClosureRegime { readonly kind: "ordinal.closure.regime.aperiodic"; }

/** A closure regime in which the bounded process has a stabilization witness. */
export type StabilizingClosureRegime = FiniteClosureRegime | ScottClosureRegime | TransfiniteClosureRegime;
/** A closure regime. */
export type ClosureRegime = StabilizingClosureRegime | AperiodicClosureRegime;

/**
 * A caller-supplied lattice over `T`.
 *
 * `closeOrdinalProcess` trusts this object as the semantic carrier for the
 * process. `bottom` is the seed, `leq` and `join` describe the order, `eq`
 * decides stabilization, and `sup` supplies the limit-stage value for the
 * process's fundamental sequences.
 */
export interface Lattice<T> {
  readonly bottom: T;
  readonly leq: (left: T, right: T) => boolean;
  readonly join: (left: T, right: T) => T;
  readonly eq: (left: T, right: T) => boolean;
  readonly sup: (sequence: (n: Natural) => T) => T;
}

/**
 * The observable result of running a bounded closure process.
 *
 * `value` is the best value found by the search. When `search.kind` is
 * `"ordinal.closure.stabilizationSearch:witness"`, it is the stabilized value.
 * When the search returns an obstruction, it is the value at the searched bound.
 */
export interface ClosureCarrier<T> {
  readonly kind: "ordinal.closure.carrier";
  readonly process: ClosureProcessCarrier<T>;
  readonly value: T;
  readonly orbit: readonly ClosureOrbitPoint<T>[];
  readonly search: ClosureStabilizationSearchJudgment<T>;
  readonly stabilization: ClosureStabilizationJudgment<T>;
}

/**
 * A closure process: a lattice, an endomorphism, and a search horizon.
 *
 * The package does not prove the endomorphism is monotone or inflationary for an
 * arbitrary JavaScript function. Supplying a lawful endomorphism is the caller's
 * contract; the returned carrier records what the bounded search observed.
 */
export interface ClosureProcessCarrier<T> {
  readonly kind: "ordinal.closure.process";
  readonly lattice: Lattice<T>;
  readonly endomorphism: (value: T) => T;
  readonly horizon: ClosureStabilizationSearchHorizon;
}

/** A point on the closure orbit. */
export interface ClosureOrbitPoint<T> {
  readonly kind: "ordinal.closure.orbitPoint";
  readonly stage: Ordinal;
  readonly value: T;
}

/** Witness that the closure stabilizes at an ordinal. */
export interface ClosureStabilizationWitness<T> {
  readonly kind: "ordinal.closure.stabilization:witness";
  readonly ordinal: Ordinal;
  readonly value: T;
  readonly successor: T;
}

/** Obstruction to closure stabilization at the searched bound. */
export interface ClosureStabilizationObstruction<T> {
  readonly kind: "ordinal.closure.stabilization-obstruction";
  readonly searchedThrough: Ordinal;
  readonly value: T;
  readonly successor: T;
}

/** The result of testing stabilization at one ordinal. */
export type ClosureStabilizationJudgment<T> = ClosureStabilizationWitness<T> | ClosureStabilizationObstruction<T>;

/** Witness that the bounded search found stabilization, with its regime. */
export interface ClosureStabilizationSearchWitness<T> {
  readonly kind: "ordinal.closure.stabilizationSearch:witness";
  readonly ordinal: Ordinal;
  readonly regime: StabilizingClosureRegime;
  readonly stabilization: ClosureStabilizationWitness<T>;
}

/** Obstruction from the bounded search (claims no regime). */
export interface ClosureStabilizationSearchObstruction<T> {
  readonly kind: "ordinal.closure.stabilizationSearch-obstruction";
  readonly searchedThrough: Ordinal;
  readonly stabilization: ClosureStabilizationObstruction<T>;
}

/** The result of the bounded stabilization search. */
export type ClosureStabilizationSearchJudgment<T> = ClosureStabilizationSearchWitness<T> | ClosureStabilizationSearchObstruction<T>;

/** The bound on the stabilization search. */
export interface ClosureStabilizationSearchHorizon {
  readonly kind: "ordinal.closure.stabilizationSearchHorizon";
  readonly finiteStages: Natural;
  readonly limitBlocks: Natural;
}

/** One block of the stabilization search. */
export interface ClosureSearchBlock {
  readonly kind: "ordinal.closure.searchBlock";
  readonly base: Ordinal;
  readonly finiteStages: Natural;
}

const naturalFromInternalBound = (bound: number): Natural => {
  let value = natZero;
  for (let index = 0; index < bound; index += 1) value = successor(value);
  return value;
};

const two = naturalFromInternalBound(2);
const defaultFiniteStages = naturalFromInternalBound(64);
const defaultLimitBlocks = naturalFromInternalBound(4);

const omegaMultipleOrdinalLabel = (multiplier: Natural): OmegaMultipleOrdinalLabel => Object.freeze({ kind: "ordinal.closure.omegaMultipleLabel" as const, multiplier });
const omegaSquaredOrdinalLabel = (): OmegaSquaredOrdinalLabel => Object.freeze({ kind: "ordinal.closure.omegaSquaredLabel" as const });

/** The zero ordinal. */
export const zeroOrdinal: ZeroOrdinal = Object.freeze({ kind: "ordinal.closure.ordinal.zero" as const });
/** The successor of an ordinal. */
export const successorOrdinal = (predecessorOrdinal: Ordinal): SuccessorOrdinal => Object.freeze({ kind: "ordinal.closure.ordinal.successor" as const, predecessor: predecessorOrdinal });
/** An ordinal label wrapping a mark. */
export const ordinalLabel = (label: Mark): OrdinalLabel => Object.freeze({ kind: "ordinal.closure.ordinalLabel" as const, mark: label });
/** A limit ordinal from a label and a fundamental sequence. */
export const limitOrdinal = (label: OrdinalLabel, fundamentalSequence: (n: Natural) => Ordinal): LimitOrdinal => Object.freeze({ kind: "ordinal.closure.ordinal.limit" as const, label, fundamentalSequence });

/** The finite ordinal of value n. */
export const finiteOrdinal = (n: Natural): Ordinal => {
  let ordinal: Ordinal = zeroOrdinal;
  for (const _member of n.members) ordinal = successorOrdinal(ordinal);
  return ordinal;
};

/** The ordinal obtained by applying successor n times. */
export const ordinalPlusFinite = (ordinal: Ordinal, n: Natural): Ordinal => {
  let out = ordinal;
  for (const _member of n.members) out = successorOrdinal(out);
  return out;
};

/** Omega: the limit whose fundamental sequence enumerates the finite ordinals. */
export const omegaOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark(omegaMultipleOrdinalLabel(successor(natZero)))), (n) => finiteOrdinal(n));
/** Omega times k. */
export const omegaMultipleOrdinal = (k: Natural): Ordinal => natIsZero(k)
  ? zeroOrdinal
  : limitOrdinal(ordinalLabel(mark(omegaMultipleOrdinalLabel(k))), (n) => ordinalPlusFinite(omegaMultipleOrdinal(predecessor(k)), n));
/** Omega squared. */
export const omegaSquaredOrdinal = (): Ordinal => limitOrdinal(ordinalLabel(mark(omegaSquaredOrdinalLabel())), (n) => omegaMultipleOrdinal(n));
/** Whether an ordinal is zero. */
export const isZeroOrdinal = (ordinal: Ordinal): ordinal is ZeroOrdinal => ordinal.kind === "ordinal.closure.ordinal.zero";
/** Whether an ordinal is a successor. */
export const isSuccessorOrdinal = (ordinal: Ordinal): ordinal is SuccessorOrdinal => ordinal.kind === "ordinal.closure.ordinal.successor";
/** Whether an ordinal is a limit. */
export const isLimitOrdinal = (ordinal: Ordinal): ordinal is LimitOrdinal => ordinal.kind === "ordinal.closure.ordinal.limit";

/** The finite closure regime value. */
export const finiteClosureRegime: FiniteClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.finite" as const });
/** The Scott closure regime value. */
export const scottClosureRegime: ScottClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.scott" as const });
/** The transfinite closure regime value. */
export const transfiniteClosureRegime: TransfiniteClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.transfinite" as const });
/** The aperiodic closure regime value. */
export const aperiodicClosureRegime: AperiodicClosureRegime = Object.freeze({ kind: "ordinal.closure.regime.aperiodic" as const });

/** Construct a stabilization search horizon. */
export const closureStabilizationSearchHorizon = (finiteStages: Natural, limitBlocks: Natural): ClosureStabilizationSearchHorizon =>
  Object.freeze({ kind: "ordinal.closure.stabilizationSearchHorizon" as const, finiteStages, limitBlocks });

/**
 * Construct a closure process.
 *
 * The default horizon checks 64 finite stages and 4 labelled omega-multiple
 * limit blocks before the final omega-squared probe.
 */
export const closureProcess = <T,>(
  lattice: Lattice<T>,
  endomorphism: (value: T) => T,
  horizon: ClosureStabilizationSearchHorizon = closureStabilizationSearchHorizon(defaultFiniteStages, defaultLimitBlocks),
): ClosureProcessCarrier<T> => Object.freeze({ kind: "ordinal.closure.process" as const, lattice, endomorphism, horizon });

/** Construct a search block. */
export const closureSearchBlock = (base: Ordinal, finiteStages: Natural): ClosureSearchBlock =>
  Object.freeze({ kind: "ordinal.closure.searchBlock" as const, base, finiteStages });

/** The ordered search blocks for a horizon. */
export function closureSearchBlocks(horizon: ClosureStabilizationSearchHorizon): readonly ClosureSearchBlock[] {
  return Object.freeze([
    closureSearchBlock(zeroOrdinal, horizon.finiteStages),
    ...horizon.limitBlocks.members.map((member) => closureSearchBlock(omegaMultipleOrdinal(successor(member)), horizon.finiteStages)),
  ]);
}

/** Whether an ordinal is finite, by stripping its successor chain. */
export function finiteOrdinalJudgment(ordinal: Ordinal): FiniteOrdinalJudgment {
  let current = ordinal;
  let value = natZero;
  while (current.kind === "ordinal.closure.ordinal.successor") {
    value = successor(value);
    current = current.predecessor;
  }
  return current.kind === "ordinal.closure.ordinal.zero"
    ? Object.freeze({ kind: "ordinal.closure.finiteOrdinal:witness" as const, ordinal, value })
    : Object.freeze({ kind: "ordinal.closure.finiteOrdinal-obstruction" as const, ordinal, residue: current });
}

function approx<T>(lattice: Lattice<T>, phi: (value: T) => T, ordinal: Ordinal): T {
  switch (ordinal.kind) {
    case "ordinal.closure.ordinal.zero":
      return lattice.bottom;
    case "ordinal.closure.ordinal.successor":
      return phi(approx(lattice, phi, ordinal.predecessor));
    case "ordinal.closure.ordinal.limit":
      return lattice.sup((n) => approx(lattice, phi, ordinal.fundamentalSequence(n)));
  }
}

/** The closure approximant of a process at an ordinal stage. */
export const closureApproximant = <T,>(process: ClosureProcessCarrier<T>, ordinal: Ordinal): T => approx(process.lattice, process.endomorphism, ordinal);

const closureOrbitPoint = <T,>(stage: Ordinal, value: T): ClosureOrbitPoint<T> => Object.freeze({ kind: "ordinal.closure.orbitPoint" as const, stage, value });

function* closureOrbit<T>(lattice: Lattice<T>, phi: (value: T) => T): Generator<ClosureOrbitPoint<T>> {
  let value = lattice.bottom;
  let stage: Ordinal = zeroOrdinal;
  yield closureOrbitPoint(stage, value);
  for (;;) {
    value = phi(value);
    stage = successorOrdinal(stage);
    yield closureOrbitPoint(stage, value);
  }
}

/**
 * The finite closure orbit of a process, yielded from bottom by successor
 * iteration.
 *
 * This generator does not visit limit stages; limit-stage reads are performed by
 * `closureStabilizationAt` and `closeOrdinalProcess` through the lattice `sup`.
 */
export function* closureOrbitOfProcess<T>(process: ClosureProcessCarrier<T>): Generator<ClosureOrbitPoint<T>> {
  yield* closureOrbit(process.lattice, process.endomorphism);
}

/**
 * A bounded-friendly `sup` helper: return the first sequence value equal to its
 * predecessor.
 *
 * This is useful for finite examples whose limit approximation eventually
 * repeats. It is not a mathematical supremum for arbitrary infinite chains.
 */
export const stabilizingSup = <T,>(lattice: Pick<Lattice<T>, "eq">) => (sequence: (n: Natural) => T): T => {
  let previous = sequence(natZero);
  for (let index = successor(natZero); ; index = successor(index)) {
    const current = sequence(index);
    if (lattice.eq(current, previous)) return current;
    previous = current;
  }
};

/**
 * Classify the stabilizing regime of an ordinal recognized by this workbench.
 *
 * Finite ordinals are finite regimes; omega-like limits whose early
 * fundamental-sequence sample is finite are Scott regimes; the remaining
 * recognized limits are transfinite regimes.
 */
export function closureRegimeOfOrdinal(ordinal: Ordinal): StabilizingClosureRegime {
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind === "ordinal.closure.finiteOrdinal:witness") return finiteClosureRegime;
  if (
    ordinal.kind === "ordinal.closure.ordinal.limit"
    && finiteOrdinalJudgment(ordinal.fundamentalSequence(two)).kind === "ordinal.closure.finiteOrdinal:witness"
  ) return scottClosureRegime;
  return transfiniteClosureRegime;
}

/** Whether a process stabilizes at an ordinal (approximant equals its successor). */
export function closureStabilizationAt<T>(process: ClosureProcessCarrier<T>, ordinal: Ordinal): ClosureStabilizationJudgment<T> {
  const value = closureApproximant(process, ordinal);
  const successorValue = closureApproximant(process, successorOrdinal(ordinal));
  return process.lattice.eq(successorValue, value)
    ? Object.freeze({ kind: "ordinal.closure.stabilization:witness" as const, ordinal, value, successor: successorValue })
    : Object.freeze({ kind: "ordinal.closure.stabilization-obstruction" as const, searchedThrough: ordinal, value, successor: successorValue });
}

/**
 * Run the bounded stabilization search over a process.
 *
 * The function records the finite successor orbit it evaluates, then checks the
 * configured finite and limit blocks for a stabilization witness. A returned
 * obstruction means "not found within this horizon", not "no fixed point
 * exists".
 */
export function closeOrdinalProcess<T>(process: ClosureProcessCarrier<T>): ClosureCarrier<T> {
  const at = (ordinal: Ordinal): T => closureApproximant(process, ordinal);
  const orbit: ClosureOrbitPoint<T>[] = [];

  const closeAt = (stabilization: ClosureStabilizationWitness<T>): ClosureCarrier<T> => {
    const regime = closureRegimeOfOrdinal(stabilization.ordinal);
    const search: ClosureStabilizationSearchWitness<T> = Object.freeze({
      kind: "ordinal.closure.stabilizationSearch:witness" as const,
      ordinal: stabilization.ordinal,
      regime,
      stabilization,
    });
    return Object.freeze({ kind: "ordinal.closure.carrier" as const, process, value: stabilization.value, orbit: Object.freeze(orbit), search, stabilization });
  };
  const closeWitness = (stabilization: ClosureStabilizationJudgment<T>): ClosureCarrier<T> | undefined => {
    switch (stabilization.kind) {
      case "ordinal.closure.stabilization:witness":
        return closeAt(stabilization);
    }
  };

  {
    let value = process.lattice.bottom;
    let ordinal: Ordinal = zeroOrdinal;
    orbit.push(closureOrbitPoint(ordinal, value));
    for (const _stage of process.horizon.finiteStages.members) {
      const successorValue = process.endomorphism(value);
      if (process.lattice.eq(successorValue, value)) {
        return closeAt(Object.freeze({ kind: "ordinal.closure.stabilization:witness" as const, ordinal, value, successor: successorValue }));
      }
      ordinal = successorOrdinal(ordinal);
      value = successorValue;
      orbit.push(closureOrbitPoint(ordinal, value));
    }
  }

  for (const block of closureSearchBlocks(process.horizon)) {
    const base = block.base;
    switch (base.kind) {
      case "ordinal.closure.ordinal.zero":
        continue;
      case "ordinal.closure.ordinal.limit": {
        const closed = closeWitness(closureStabilizationAt(process, base));
        if (closed) return closed;
        break;
      }
    }
    for (const member of block.finiteStages.members) {
      const closed = closeWitness(closureStabilizationAt(process, ordinalPlusFinite(base, member)));
      if (closed) return closed;
    }
  }
  const omegaSquare = omegaSquaredOrdinal();
  const omegaSquareClosure = closeWitness(closureStabilizationAt(process, omegaSquare));
  if (omegaSquareClosure) return omegaSquareClosure;
  const searchedThrough = omegaMultipleOrdinal(successor(process.horizon.limitBlocks));
  const value = at(searchedThrough);
  const stabilization: ClosureStabilizationObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilization-obstruction" as const,
    searchedThrough,
    value,
    successor: at(successorOrdinal(searchedThrough)),
  });
  const search: ClosureStabilizationSearchObstruction<T> = Object.freeze({
    kind: "ordinal.closure.stabilizationSearch-obstruction" as const,
    searchedThrough,
    stabilization,
  });
  return Object.freeze({ kind: "ordinal.closure.carrier" as const, process, value, orbit: Object.freeze(orbit), search, stabilization });
}
