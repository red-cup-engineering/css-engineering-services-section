/**
 * analysis/knaster-tarski - finite executable shadow of
 * RelMath.Order.KnasterTarskiStandalone.
 *
 * Lean proves the abstract complete-lattice theorem. This module carries the
 * finite table version: a finite complete lattice relation plus a monotone
 * endomap table yields least/greatest fixed-point receipts.
 */
import {
  completeLattice,
  monotoneMap,
  type CompleteLatticeObstruction,
  type FinitePreorderSystem,
  type MonotoneMapObstruction,
} from "./order-infra.mjs";

const assertIndex = (name: string, value: number, length: number): void => {
  if (!Number.isSafeInteger(value) || value < 0 || value >= length) {
    throw new RangeError(`${name}: expected an index into the carrier`);
  }
};

const leAt = (system: FinitePreorderSystem, left: number, right: number): boolean => {
  assertIndex("knasterTarski left", left, system.labels.length);
  assertIndex("knasterTarski right", right, system.labels.length);
  return system.le[left]?.[right] === true;
};

const requireEndomap = (map: readonly number[], size: number): void => {
  if (map.length !== size) throw new RangeError("finiteMonotoneEndomap: map length must match carrier size");
  map.forEach((target, index) => assertIndex(`finiteMonotoneEndomap[${index}]`, target, size));
};

export interface FiniteMonotoneEndomap {
  readonly kind: "knasterTarski.finiteMonotoneEndomap";
  readonly order: FinitePreorderSystem;
  readonly map: readonly number[];
}

export function finiteMonotoneEndomap(order: FinitePreorderSystem, map: readonly number[]): FiniteMonotoneEndomap {
  requireEndomap(map, order.labels.length);
  return Object.freeze({
    kind: "knasterTarski.finiteMonotoneEndomap" as const,
    order,
    map: Object.freeze([...map]),
  });
}

const carrierIndices = (size: number): readonly number[] => Object.freeze(Array.from({ length: size }, (_, index) => index));

const isUpperBound = (system: FinitePreorderSystem, subset: readonly number[], candidate: number): boolean =>
  subset.every((member) => leAt(system, member, candidate));

const isLowerBound = (system: FinitePreorderSystem, subset: readonly number[], candidate: number): boolean =>
  subset.every((member) => leAt(system, candidate, member));

const leastElements = (system: FinitePreorderSystem, candidates: readonly number[]): readonly number[] =>
  Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, candidate, other))));

const greatestElements = (system: FinitePreorderSystem, candidates: readonly number[]): readonly number[] =>
  Object.freeze(candidates.filter((candidate) => candidates.every((other) => leAt(system, other, candidate))));

const lub = (system: FinitePreorderSystem, subset: readonly number[]): readonly number[] => {
  const carrier = carrierIndices(system.labels.length);
  return leastElements(system, carrier.filter((candidate) => isUpperBound(system, subset, candidate)));
};

const glb = (system: FinitePreorderSystem, subset: readonly number[]): readonly number[] => {
  const carrier = carrierIndices(system.labels.length);
  return greatestElements(system, carrier.filter((candidate) => isLowerBound(system, subset, candidate)));
};

export interface KnasterTarskiWitness {
  readonly kind: "knasterTarski.fixedPoints:witness";
  readonly carrier: readonly string[];
  readonly map: readonly number[];
  readonly prefixPoints: readonly number[];
  readonly postfixPoints: readonly number[];
  readonly fixedPoints: readonly number[];
  readonly lfp: number;
  readonly lfpLabel: string;
  readonly gfp: number;
  readonly gfpLabel: string;
  readonly lfpFixed: true;
  readonly gfpFixed: true;
  readonly lfpLeast: true;
  readonly gfpGreatest: true;
  readonly lfpLeGfp: true;
}

export interface KnasterTarskiObstruction {
  readonly kind: "knasterTarski.fixedPoints-obstruction";
  readonly reason:
    | "completeLattice"
    | "monotone"
    | "lfp-infimum"
    | "gfp-supremum"
    | "lfp-fixed"
    | "gfp-fixed"
    | "lfp-least"
    | "gfp-greatest"
    | "bracket";
  readonly completeLattice?: CompleteLatticeObstruction;
  readonly monotone?: MonotoneMapObstruction;
  readonly candidates?: readonly number[];
  readonly candidateLabels?: readonly string[];
  readonly point?: number;
  readonly pointLabel?: string;
}

export type KnasterTarskiJudgment = KnasterTarskiWitness | KnasterTarskiObstruction;

/** Finite Knaster-Tarski receipt: monotone endomap on a finite complete lattice. */
export function fixedPoints(endomap: FiniteMonotoneEndomap): KnasterTarskiJudgment {
  const { order, map } = endomap;
  const complete = completeLattice(order);
  if (complete.kind !== "orderInfra.completeLattice:witness") {
    return Object.freeze({
      kind: "knasterTarski.fixedPoints-obstruction" as const,
      reason: "completeLattice" as const,
      completeLattice: complete,
    });
  }
  const monotone = monotoneMap(order, order, map);
  if (monotone.kind !== "orderInfra.monotoneMap:witness") {
    return Object.freeze({
      kind: "knasterTarski.fixedPoints-obstruction" as const,
      reason: "monotone" as const,
      monotone,
    });
  }

  const carrier = carrierIndices(order.labels.length);
  const prefixPoints = carrier.filter((point) => leAt(order, map[point] as number, point));
  const postfixPoints = carrier.filter((point) => leAt(order, point, map[point] as number));
  const fixedPointSet = carrier.filter((point) => map[point] === point);
  const lfpCandidates = glb(order, prefixPoints);
  const gfpCandidates = lub(order, postfixPoints);
  if (lfpCandidates.length !== 1) {
    return Object.freeze({
      kind: "knasterTarski.fixedPoints-obstruction" as const,
      reason: "lfp-infimum" as const,
      candidates: lfpCandidates,
      candidateLabels: Object.freeze(lfpCandidates.map((index) => order.labels[index] as string)),
    });
  }
  if (gfpCandidates.length !== 1) {
    return Object.freeze({
      kind: "knasterTarski.fixedPoints-obstruction" as const,
      reason: "gfp-supremum" as const,
      candidates: gfpCandidates,
      candidateLabels: Object.freeze(gfpCandidates.map((index) => order.labels[index] as string)),
    });
  }

  const lfp = lfpCandidates[0] as number;
  const gfp = gfpCandidates[0] as number;
  if (map[lfp] !== lfp) {
    return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction" as const, reason: "lfp-fixed" as const, point: lfp, pointLabel: order.labels[lfp] as string });
  }
  if (map[gfp] !== gfp) {
    return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction" as const, reason: "gfp-fixed" as const, point: gfp, pointLabel: order.labels[gfp] as string });
  }
  const leastFailure = fixedPointSet.find((point) => !leAt(order, lfp, point));
  if (leastFailure !== undefined) {
    return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction" as const, reason: "lfp-least" as const, point: leastFailure, pointLabel: order.labels[leastFailure] as string });
  }
  const greatestFailure = fixedPointSet.find((point) => !leAt(order, point, gfp));
  if (greatestFailure !== undefined) {
    return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction" as const, reason: "gfp-greatest" as const, point: greatestFailure, pointLabel: order.labels[greatestFailure] as string });
  }
  if (!leAt(order, lfp, gfp)) {
    return Object.freeze({ kind: "knasterTarski.fixedPoints-obstruction" as const, reason: "bracket" as const, point: lfp, pointLabel: order.labels[lfp] as string });
  }

  return Object.freeze({
    kind: "knasterTarski.fixedPoints:witness" as const,
    carrier: order.labels,
    map: Object.freeze([...map]),
    prefixPoints: Object.freeze(prefixPoints),
    postfixPoints: Object.freeze(postfixPoints),
    fixedPoints: Object.freeze(fixedPointSet),
    lfp,
    lfpLabel: order.labels[lfp] as string,
    gfp,
    gfpLabel: order.labels[gfp] as string,
    lfpFixed: true as const,
    gfpFixed: true as const,
    lfpLeast: true as const,
    gfpGreatest: true as const,
    lfpLeGfp: true as const,
  });
}
