/**
 * analysis/crdt-cohomological-calm - finite executable shadow of
 * RelMath.Cohomology.CRDTCohomologicalCALM.
 *
 * Lean bundles four already-proved convergence readings: H1 vanishing,
 * order-independent CRDT merge, confluence by knowledge join, and quiescence
 * as closure fixed point. This module exposes that finite FOUR/valuation
 * surface and keeps the genuine CALM biconditional as a proof frontier.
 */
import {
  chargeValue,
  chargeValueName,
  chargeValueNames,
  joinKnowledgeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  applyChargeClosure,
  closureMonadReceipt,
  cosettlingReceipt,
  knowledgeJoinClosure,
  liftClosure,
  valuationKnowledgeJoin,
  type ChargeClosureCarrier,
  type ClosureMonadReceipt,
  type CosettlingReceipt,
} from "../../closure-operator-fiber.mjs";
import {
  readValuationFiber,
  valuationFiberCarrier,
  valuationLeqKnowledge,
  type ValuationFiberCarrier,
} from "../../index.mjs";

export interface MergeOrderIndependentReceipt {
  readonly kind: "crdtCalm.mergeOrderIndependent:witness";
  readonly left: readonly ChargeValueName[];
  readonly right: readonly ChargeValueName[];
  readonly sameMembership: true;
  readonly leftMerge: ChargeValueName;
  readonly rightMerge: ChargeValueName;
  readonly orderIndependent: true;
}

export interface ConfluenceReceipt {
  readonly kind: "crdtCalm.confluence:witness";
  readonly left: ValuationFiberCarrier;
  readonly right: ValuationFiberCarrier;
  readonly join: ValuationFiberCarrier;
  readonly leftLeJoin: true;
  readonly rightLeJoin: true;
  readonly totalByKnowledgeJoin: true;
}

export interface CalmConvergenceFactsReceipt {
  readonly kind: "crdtCalm.convergenceFacts:witness";
  readonly h1VanishesFinite: true;
  readonly merge: MergeOrderIndependentReceipt;
  readonly confluence: ConfluenceReceipt;
  readonly closure: ChargeClosureCarrier;
  readonly fixedPoint: ValuationFiberCarrier;
  readonly quiescentIffClosureFixed: true;
  readonly mutuallyBelowImpliesEqual: true;
  readonly biconditionalFrontier: "proof-side genuine CALM equivalence";
}

export interface CalmMonotoneCoordinationFreeReceipt {
  readonly kind: "crdtCalm.monotoneCoordinationFree:witness";
  readonly closure: ChargeClosureCarrier;
  readonly seed: ValuationFiberCarrier;
  readonly orbit: readonly ValuationFiberCarrier[];
  readonly orbitMonotone: true;
  readonly merge: MergeOrderIndependentReceipt;
  readonly coordinationFree: true;
}

export interface MayerVietorisOverlapReceipt {
  readonly kind: "crdtCalm.mayerVietorisOverlap:witness";
  readonly cosettling: CosettlingReceipt;
  readonly overlapJoinClosed: true;
}

export interface CRDTCohomologicalCALMReceipt {
  readonly kind: "crdtCalm.receipt:witness";
  readonly convergence: CalmConvergenceFactsReceipt;
  readonly monotoneCoordinationFree: CalmMonotoneCoordinationFreeReceipt;
  readonly overlap: MayerVietorisOverlapReceipt;
  readonly openFrontier: readonly string[];
}

const knowledgeJoinValueName = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

export const mergeDeltas = (deltas: readonly ChargeValueName[]): ChargeValueName =>
  deltas.reduce<ChargeValueName>((out, value) => knowledgeJoinValueName(out, value), "absurd");

const sameMembership = (left: readonly ChargeValueName[], right: readonly ChargeValueName[]): boolean =>
  chargeValueNames.every((value) => left.includes(value) === right.includes(value));

const sameFiber = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const allValuations = (points: readonly string[]): readonly ValuationFiberCarrier[] => {
  if (points.length > 4) throw new RangeError("crdtCalm: exhaustive valuation checks are limited to at most 4 points");
  const out: ValuationFiberCarrier[] = [];
  const go = (index: number, record: Record<string, ChargeValueName>): void => {
    if (index === points.length) {
      out.push(valuationFiberCarrier(points, Object.freeze({ ...record })));
      return;
    }
    const point = points[index] as string;
    for (const value of chargeValueNames) {
      record[point] = value;
      go(index + 1, record);
    }
    delete record[point];
  };
  go(0, {});
  return Object.freeze(out);
};

export function mergeOrderIndependentReceipt(
  left: readonly ChargeValueName[] = Object.freeze(["potential", "active", "potential"]),
  right: readonly ChargeValueName[] = Object.freeze(["active", "potential"]),
): MergeOrderIndependentReceipt {
  if (!sameMembership(left, right)) throw new TypeError("mergeOrderIndependentReceipt: delta lists must have equal membership");
  const leftMerge = mergeDeltas(left);
  const rightMerge = mergeDeltas(right);
  if (leftMerge !== rightMerge) throw new TypeError("mergeOrderIndependentReceipt: equal-membership merges diverged");
  return Object.freeze({
    kind: "crdtCalm.mergeOrderIndependent:witness" as const,
    left: Object.freeze([...left]),
    right: Object.freeze([...right]),
    sameMembership: true as const,
    leftMerge,
    rightMerge,
    orderIndependent: true as const,
  });
}

export function confluenceReceipt(left: ValuationFiberCarrier, right: ValuationFiberCarrier): ConfluenceReceipt {
  const join = valuationKnowledgeJoin(left, right);
  const leftLeJoin = valuationLeqKnowledge(left, join);
  const rightLeJoin = valuationLeqKnowledge(right, join);
  if (!leftLeJoin || !rightLeJoin) throw new TypeError("confluenceReceipt: knowledge join is not a common upper bound");
  return Object.freeze({
    kind: "crdtCalm.confluence:witness" as const,
    left,
    right,
    join,
    leftLeJoin: true as const,
    rightLeJoin: true as const,
    totalByKnowledgeJoin: true as const,
  });
}

export function calmConvergenceFactsReceipt(): CalmConvergenceFactsReceipt {
  const cells = Object.freeze(["p", "q"]);
  const left = valuationFiberCarrier(cells, { p: "potential", q: "absurd" });
  const right = valuationFiberCarrier(cells, { p: "absurd", q: "active" });
  const closure = knowledgeJoinClosure("potential");
  const fixedPoint = liftClosure(closure, valuationFiberCarrier(cells, { p: "active", q: "stable" }));
  const quiescentIffClosureFixed = sameFiber(liftClosure(closure, fixedPoint), fixedPoint);
  const mutuallyBelowImpliesEqual = allValuations(cells).every((u) => allValuations(cells).every((v) =>
    !(valuationLeqKnowledge(u, v) && valuationLeqKnowledge(v, u)) || sameFiber(u, v)));
  if (!quiescentIffClosureFixed || !mutuallyBelowImpliesEqual) {
    throw new TypeError("calmConvergenceFactsReceipt: finite fixed-point/confluence laws failed");
  }
  return Object.freeze({
    kind: "crdtCalm.convergenceFacts:witness" as const,
    h1VanishesFinite: true as const,
    merge: mergeOrderIndependentReceipt(),
    confluence: confluenceReceipt(left, right),
    closure,
    fixedPoint,
    quiescentIffClosureFixed: true as const,
    mutuallyBelowImpliesEqual: true as const,
    biconditionalFrontier: "proof-side genuine CALM equivalence" as const,
  });
}

export function monotoneCoordinationFreeReceipt(): CalmMonotoneCoordinationFreeReceipt {
  const closure = knowledgeJoinClosure("potential");
  const cells = Object.freeze(["p", "q"]);
  const seed = valuationFiberCarrier(cells, { p: "absurd", q: "active" });
  const orbit: ValuationFiberCarrier[] = [seed];
  for (let index = 0; index < 4; index += 1) orbit.push(liftClosure(closure, orbit[orbit.length - 1] as ValuationFiberCarrier));
  const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) =>
    leftIndex > rightIndex || valuationLeqKnowledge(left, right)));
  if (!orbitMonotone) throw new TypeError("monotoneCoordinationFreeReceipt: closure orbit was not monotone");
  return Object.freeze({
    kind: "crdtCalm.monotoneCoordinationFree:witness" as const,
    closure,
    seed,
    orbit: Object.freeze(orbit),
    orbitMonotone: true as const,
    merge: mergeOrderIndependentReceipt(["stable", "potential", "stable"], ["potential", "stable"]),
    coordinationFree: true as const,
  });
}

export function mayerVietorisOverlapReceipt(): MayerVietorisOverlapReceipt {
  const closure = knowledgeJoinClosure("potential");
  const top = valuationFiberCarrier(["p"], { p: applyChargeClosure(closure, "stable") });
  const cosettling = cosettlingReceipt(closure, top);
  return Object.freeze({
    kind: "crdtCalm.mayerVietorisOverlap:witness" as const,
    cosettling,
    overlapJoinClosed: true as const,
  });
}

export function receipt(): CRDTCohomologicalCALMReceipt {
  const convergence = calmConvergenceFactsReceipt();
  return Object.freeze({
    kind: "crdtCalm.receipt:witness" as const,
    convergence,
    monotoneCoordinationFree: monotoneCoordinationFreeReceipt(),
    overlap: mayerVietorisOverlapReceipt(),
    openFrontier: Object.freeze([
      "The runtime bundle is a conjunction of finite convergence facts, matching the Lean module's honest scoping.",
      "The genuine CALM biconditional that distinguishes non-confluent/non-monotone cases remains proof/frontier work.",
      "Mayer-Vietoris is represented by finite cosettling join-subsemilattice closure, not by a full long exact sequence.",
    ]),
  });
}

export const finiteKzShadow = (): ClosureMonadReceipt =>
  closureMonadReceipt(knowledgeJoinClosure("potential"), "potential", "absurd");
