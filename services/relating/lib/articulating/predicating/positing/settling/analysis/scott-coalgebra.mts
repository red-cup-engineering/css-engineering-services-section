/**
 * analysis/scott-coalgebra - finite executable shadow of
 * RelMath.Closure.ScottContinuousClosure and SettlingCoalgebra.
 *
 * Lean proves the corpus Scott equation over the finite FOUR charge lattice by
 * showing every finite directed family attains its knowledge join. It also
 * packages the settling coalgebra as the unfolding dual of the closure algebra.
 * This module keeps exactly that runtime boundary: finite charge families,
 * explicit pointwise closure tables, finite valuation orbits, and honest
 * proof-side markers for arbitrary dcpos and genuine 2-categorical data.
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
  chargeClosureCarrier,
  closureMonadReceipt,
  knowledgeJoinClosure,
  liftClosure,
  valuationKnowledgeJoin,
  type ChargeClosureCarrier,
  type ClosureMonadReceipt,
} from "../../closure-operator-fiber.mjs";
import {
  readValuationFiber,
  valuationFiberCarrier,
  valuationLeqKnowledge,
  type ValuationFiberCarrier,
} from "../../index.mjs";

export interface DirectedChargeFamily {
  readonly kind: "scottCoalgebra.directedFamily.carrier";
  readonly elems: readonly ChargeValueName[];
  readonly sup: ChargeValueName;
  readonly nonempty: true;
  readonly directed: true;
  readonly supAttained: true;
}

export interface ScottContinuityReceipt {
  readonly kind: "scottCoalgebra.scottContinuity:witness";
  readonly closure: ChargeClosureCarrier;
  readonly family: DirectedChargeFamily;
  readonly left: ChargeValueName;
  readonly right: ChargeValueName;
  readonly commutesWithDirectedJoin: true;
  readonly finiteCarrierForcesAttainment: true;
  readonly finiteChargeClosureStrict: true;
}

export interface FiniteAntecedentScottReceipt {
  readonly kind: "scottCoalgebra.finiteAntecedent:witness";
  readonly antecedent: ChargeValueName;
  readonly conclusion: ChargeValueName;
  readonly family: DirectedChargeFamily;
  readonly firesOnJoinIffFiresOnMember: true;
  readonly left: ChargeValueName;
  readonly right: ChargeValueName;
  readonly commutesWithDirectedJoin: true;
}

export interface CoalgebraLimitReceipt {
  readonly kind: "scottCoalgebra.orbitLimit:witness";
  readonly limit: ValuationFiberCarrier;
  readonly dominatesPriorOrbit: true;
  readonly leastUpperBound: true;
}

export interface SettlingCoalgebraReceipt {
  readonly kind: "scottCoalgebra.settlingCoalgebra:witness";
  readonly closure: ChargeClosureCarrier;
  readonly carrier: ValuationFiberCarrier;
  readonly increment: ValuationFiberCarrier;
  readonly target: ValuationFiberCarrier;
  readonly orbit: readonly ValuationFiberCarrier[];
  readonly orbitLimit: CoalgebraLimitReceipt;
  readonly coalgebraMapInflationary: true;
  readonly settlingEndofunctorMonotone: true;
  readonly zeroIncrementRecoversClosure: true;
  readonly orbitMonotone: true;
  readonly algebraCoalgebraDualDirections: true;
  readonly quiescenceIsoAtZeroIncrement: true;
  readonly cclosedIffClosureAlgebra: true;
  readonly finiteKzShadow: ClosureMonadReceipt;
  readonly higherCategoricalBoundary: "proof-side 2-categorical KZ/cofree coalgebra data";
}

export interface ScottCoalgebraReceipt {
  readonly kind: "scottCoalgebra.receipt:witness";
  readonly scott: ScottContinuityReceipt;
  readonly finiteAntecedent: FiniteAntecedentScottReceipt;
  readonly coalgebra: SettlingCoalgebraReceipt;
  readonly dcpoBoundary: "proof-side arbitrary directed-complete joins";
}

const knowledgeLeqValue = (left: ChargeValueName, right: ChargeValueName): boolean =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right))) === right;

const knowledgeJoinValueName = (left: ChargeValueName, right: ChargeValueName): ChargeValueName =>
  chargeValueName(joinKnowledgeValue(chargeValue(left), chargeValue(right)));

const knowledgeSup = (values: readonly ChargeValueName[]): ChargeValueName =>
  values.reduce<ChargeValueName>((out, value) => knowledgeJoinValueName(out, value), "absurd");

const sameFiber = (left: ValuationFiberCarrier, right: ValuationFiberCarrier): boolean =>
  left.points.length === right.points.length
  && left.points.every((point, index) => point === right.points[index] && readValuationFiber(left, point) === readValuationFiber(right, point));

const zeroIncrement = (points: readonly string[]): ValuationFiberCarrier =>
  valuationFiberCarrier(points, Object.fromEntries(points.map((point) => [point, "absurd"])));

function requireCharge(value: ChargeValueName, caller: string): void {
  if (!chargeValueNames.includes(value)) throw new TypeError(`${caller}: ${value} is not a FOUR charge value`);
}

function allValuations(points: readonly string[]): readonly ValuationFiberCarrier[] {
  if (points.length > 4) {
    throw new RangeError("scottCoalgebra: exhaustive valuation checks are limited to at most 4 points");
  }
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
}

export function directedFamily(elems: readonly ChargeValueName[]): DirectedChargeFamily {
  if (elems.length === 0) throw new RangeError("directedFamily: directed charge families must be nonempty");
  for (const value of elems) requireCharge(value, "directedFamily");
  const sup = knowledgeSup(elems);
  const directed = elems.every((left) => elems.every((right) =>
    elems.some((upper) => knowledgeLeqValue(left, upper) && knowledgeLeqValue(right, upper)),
  ));
  const supAttained = elems.includes(sup);
  if (!directed || !supAttained) {
    throw new TypeError("directedFamily: finite knowledge-directed families must attain their join");
  }
  return Object.freeze({
    kind: "scottCoalgebra.directedFamily.carrier" as const,
    elems: Object.freeze([...elems]),
    sup,
    nonempty: true as const,
    directed: true as const,
    supAttained: true as const,
  });
}

export function scottContinuityReceipt(
  closure: ChargeClosureCarrier,
  family: DirectedChargeFamily,
): ScottContinuityReceipt {
  const left = applyChargeClosure(closure, family.sup);
  const right = knowledgeSup(family.elems.map((value) => applyChargeClosure(closure, value)));
  if (left !== right) throw new TypeError("scottContinuityReceipt: closure did not commute with directed join");
  return Object.freeze({
    kind: "scottCoalgebra.scottContinuity:witness" as const,
    closure,
    family,
    left,
    right,
    commutesWithDirectedJoin: true as const,
    finiteCarrierForcesAttainment: true as const,
    finiteChargeClosureStrict: true as const,
  });
}

export function finiteAntecedentFire(
  antecedent: ChargeValueName,
  conclusion: ChargeValueName,
  value: ChargeValueName,
): ChargeValueName {
  requireCharge(antecedent, "finiteAntecedentFire");
  requireCharge(conclusion, "finiteAntecedentFire");
  requireCharge(value, "finiteAntecedentFire");
  return knowledgeLeqValue(antecedent, value) ? knowledgeJoinValueName(value, conclusion) : value;
}

export function finiteAntecedentScottReceipt(
  antecedent: ChargeValueName,
  conclusion: ChargeValueName,
  family: DirectedChargeFamily,
): FiniteAntecedentScottReceipt {
  const firesOnJoin = knowledgeLeqValue(antecedent, family.sup);
  const firesOnMember = family.elems.some((value) => knowledgeLeqValue(antecedent, value));
  const left = finiteAntecedentFire(antecedent, conclusion, family.sup);
  const right = knowledgeSup(family.elems.map((value) => finiteAntecedentFire(antecedent, conclusion, value)));
  if (firesOnJoin !== firesOnMember || left !== right) {
    throw new TypeError("finiteAntecedentScottReceipt: finite antecedent did not commute with directed join");
  }
  return Object.freeze({
    kind: "scottCoalgebra.finiteAntecedent:witness" as const,
    antecedent,
    conclusion,
    family,
    firesOnJoinIffFiresOnMember: true as const,
    left,
    right,
    commutesWithDirectedJoin: true as const,
  });
}

export function settlingEndofunctor(
  closure: ChargeClosureCarrier,
  increment: ValuationFiberCarrier,
  carrier: ValuationFiberCarrier,
): ValuationFiberCarrier {
  return valuationKnowledgeJoin(liftClosure(closure, carrier), increment);
}

export function coalgebraOrbit(
  closure: ChargeClosureCarrier,
  seed: ValuationFiberCarrier,
  steps: number,
): readonly ValuationFiberCarrier[] {
  const out: ValuationFiberCarrier[] = [seed];
  for (let step = 0; step < steps; step += 1) out.push(liftClosure(closure, out[out.length - 1] as ValuationFiberCarrier));
  return Object.freeze(out);
}

export function coalgebraOrbitLimit(orbit: readonly ValuationFiberCarrier[]): CoalgebraLimitReceipt {
  if (orbit.length === 0) throw new RangeError("coalgebraOrbitLimit: orbit must be nonempty");
  const points = orbit[0]!.points;
  let limit = zeroIncrement(points);
  for (const stage of orbit) limit = valuationKnowledgeJoin(limit, stage);
  const dominatesPriorOrbit = orbit.every((stage) => valuationLeqKnowledge(stage, limit));
  const leastUpperBound = allValuations(points).every((candidate) =>
    !orbit.every((stage) => valuationLeqKnowledge(stage, candidate)) || valuationLeqKnowledge(limit, candidate),
  );
  if (!dominatesPriorOrbit || !leastUpperBound) {
    throw new TypeError("coalgebraOrbitLimit: finite orbit limit failed join laws");
  }
  return Object.freeze({
    kind: "scottCoalgebra.orbitLimit:witness" as const,
    limit,
    dominatesPriorOrbit: true as const,
    leastUpperBound: true as const,
  });
}

export function settlingCoalgebraReceipt(
  closure: ChargeClosureCarrier,
  carrier: ValuationFiberCarrier,
  increment: ValuationFiberCarrier,
): SettlingCoalgebraReceipt {
  const target = settlingEndofunctor(closure, increment, carrier);
  const zeroTarget = settlingEndofunctor(closure, zeroIncrement(carrier.points), carrier);
  const closed = liftClosure(closure, carrier);
  const orbit = coalgebraOrbit(closure, carrier, 4);
  const orbitLimit = coalgebraOrbitLimit(orbit);
  const all = allValuations(carrier.points);
  const coalgebraMapInflationary = valuationLeqKnowledge(carrier, target);
  const settlingEndofunctorMonotone = all.every((left) => all.every((right) =>
    !valuationLeqKnowledge(left, right)
    || valuationLeqKnowledge(settlingEndofunctor(closure, increment, left), settlingEndofunctor(closure, increment, right)),
  ));
  const zeroIncrementRecoversClosure = sameFiber(zeroTarget, closed);
  const orbitMonotone = orbit.every((left, leftIndex) => orbit.every((right, rightIndex) =>
    leftIndex > rightIndex || valuationLeqKnowledge(left, right),
  ));
  const fixed = orbit[orbit.length - 1] as ValuationFiberCarrier;
  const quiescenceIsoAtZeroIncrement = sameFiber(liftClosure(closure, fixed), fixed)
    && sameFiber(settlingEndofunctor(closure, zeroIncrement(fixed.points), fixed), fixed);
  if (!coalgebraMapInflationary || !settlingEndofunctorMonotone || !zeroIncrementRecoversClosure || !orbitMonotone || !quiescenceIsoAtZeroIncrement) {
    throw new TypeError("settlingCoalgebraReceipt: finite settling-coalgebra laws failed");
  }
  return Object.freeze({
    kind: "scottCoalgebra.settlingCoalgebra:witness" as const,
    closure,
    carrier,
    increment,
    target,
    orbit,
    orbitLimit,
    coalgebraMapInflationary: true as const,
    settlingEndofunctorMonotone: true as const,
    zeroIncrementRecoversClosure: true as const,
    orbitMonotone: true as const,
    algebraCoalgebraDualDirections: true as const,
    quiescenceIsoAtZeroIncrement: true as const,
    cclosedIffClosureAlgebra: true as const,
    finiteKzShadow: closureMonadReceipt(closure, readValuationFiber(increment, increment.points[0] as string), readValuationFiber(carrier, carrier.points[0] as string)),
    higherCategoricalBoundary: "proof-side 2-categorical KZ/cofree coalgebra data" as const,
  });
}

export function receipt(): ScottCoalgebraReceipt {
  const closure = knowledgeJoinClosure("potential");
  const family = directedFamily(["absurd", "potential", "stable"]);
  const cells = Object.freeze(["p", "q"]);
  const carrier = valuationFiberCarrier(cells, { p: "absurd", q: "active" });
  const increment = valuationFiberCarrier(cells, { p: "potential", q: "absurd" });
  return Object.freeze({
    kind: "scottCoalgebra.receipt:witness" as const,
    scott: scottContinuityReceipt(closure, family),
    finiteAntecedent: finiteAntecedentScottReceipt("potential", "stable", family),
    coalgebra: settlingCoalgebraReceipt(closure, carrier, increment),
    dcpoBoundary: "proof-side arbitrary directed-complete joins" as const,
  });
}

export function invalidNonDirectedFamily(): readonly ChargeValueName[] {
  return Object.freeze(["potential", "active"]);
}
