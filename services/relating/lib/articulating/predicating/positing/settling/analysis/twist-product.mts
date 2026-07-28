/**
 * analysis/twist-product - finite executable shadow of
 * RelMath.Order.TwistProductResiduation.
 *
 * Lean proves `FOUR = Two^twist` and the truth-order residuation of the twist
 * product. This module exhausts the finite Boolean-pair carrier and checks that
 * it is exactly the existing charge/FOUR algebra and linear-logic operations.
 */
import {
  chargeValue,
  chargeValues,
  joinKnowledgeValue,
  joinTruthValue,
  meetKnowledgeValue,
  meetTruthValue,
  negateValue,
  sameChargeValue,
  type ChargeValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  linearFusionValue,
  linearMultiplicativeUnit,
  linearResiduumValue,
} from "../../logic/bilattice-linear-logic.mjs";

export interface BooleanTwistPoint {
  readonly kind: "twistProduct.booleanPoint";
  readonly positive: boolean;
  readonly negative: boolean;
  readonly label: string;
}

const booleanPoint = (positive: boolean, negative: boolean): BooleanTwistPoint => Object.freeze({
  kind: "twistProduct.booleanPoint" as const,
  positive,
  negative,
  label: `${positive ? "1" : "0"}${negative ? "1" : "0"}`,
});

export const booleanTwistPoints: readonly BooleanTwistPoint[] = Object.freeze([
  booleanPoint(false, false),
  booleanPoint(true, false),
  booleanPoint(false, true),
  booleanPoint(true, true),
]);

const boolLe = (left: boolean, right: boolean): boolean => !left || right;
const boolMeet = (left: boolean, right: boolean): boolean => left && right;
const boolJoin = (left: boolean, right: boolean): boolean => left || right;

export function chargeOfBooleanPoint(point: BooleanTwistPoint): ChargeValue {
  if (point.positive && point.negative) return chargeValue("stable");
  if (point.positive) return chargeValue("potential");
  if (point.negative) return chargeValue("active");
  return chargeValue("absurd");
}

export function booleanPointOfCharge(value: ChargeValue): BooleanTwistPoint {
  switch (value.name) {
    case "absurd": return booleanPoint(false, false);
    case "potential": return booleanPoint(true, false);
    case "active": return booleanPoint(false, true);
    case "stable": return booleanPoint(true, true);
  }
}

const samePoint = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  left.positive === right.positive && left.negative === right.negative;

const leK = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  boolLe(left.positive, right.positive) && boolLe(left.negative, right.negative);

const leT = (left: BooleanTwistPoint, right: BooleanTwistPoint): boolean =>
  boolLe(left.positive, right.positive) && boolLe(right.negative, left.negative);

const meetK = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolMeet(left.positive, right.positive), boolMeet(left.negative, right.negative));

const joinK = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolJoin(left.positive, right.positive), boolJoin(left.negative, right.negative));

const meetT = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolMeet(left.positive, right.positive), boolJoin(left.negative, right.negative));

const joinT = (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
  booleanPoint(boolJoin(left.positive, right.positive), boolMeet(left.negative, right.negative));

const neg = (point: BooleanTwistPoint): BooleanTwistPoint => booleanPoint(point.negative, point.positive);

const fromChargeOp = (op: (left: ChargeValue, right: ChargeValue) => ChargeValue) =>
  (left: BooleanTwistPoint, right: BooleanTwistPoint): BooleanTwistPoint =>
    booleanPointOfCharge(op(chargeOfBooleanPoint(left), chargeOfBooleanPoint(right)));

const fuse = fromChargeOp(linearFusionValue);
const imp = fromChargeOp(linearResiduumValue);

const chargeLeK = (left: ChargeValue, right: ChargeValue): boolean =>
  sameChargeValue(joinKnowledgeValue(left, right), right);

const chargeLeT = (left: ChargeValue, right: ChargeValue): boolean =>
  sameChargeValue(joinTruthValue(left, right), right);

export interface TwistProductFourElement {
  readonly point: BooleanTwistPoint;
  readonly charge: ChargeValueName;
}

export interface TwistProductFourWitness {
  readonly kind: "twistProduct.four:witness";
  readonly elements: readonly TwistProductFourElement[];
  readonly knowledgeBottom: ChargeValueName;
  readonly knowledgeTop: ChargeValueName;
  readonly truthBottom: ChargeValueName;
  readonly truthTop: ChargeValueName;
  readonly fusionUnit: ChargeValueName;
  readonly consistentFragment: readonly ChargeValueName[];
  readonly bijection: true;
  readonly knowledgeOrderMatches: true;
  readonly truthOrderMatches: true;
  readonly negationMatches: true;
  readonly knowledgeLatticeMatches: true;
  readonly truthLatticeMatches: true;
  readonly truthResiduation: true;
  readonly fusionCommutative: true;
  readonly fusionUnitLaw: true;
  readonly unitNonIntegral: true;
}

export interface TwistProductFourObstruction {
  readonly kind: "twistProduct.four-obstruction";
  readonly reason:
    | "bijection"
    | "knowledgeOrder"
    | "truthOrder"
    | "negation"
    | "knowledgeLattice"
    | "truthLattice"
    | "truthResiduation"
    | "fusionCommutative"
    | "fusionUnit"
    | "unitNonIntegral";
  readonly left?: ChargeValueName | undefined;
  readonly right?: ChargeValueName | undefined;
  readonly bound?: ChargeValueName | undefined;
  readonly observed?: ChargeValueName | undefined;
  readonly expected?: ChargeValueName | undefined;
}

export type TwistProductFourJudgment = TwistProductFourWitness | TwistProductFourObstruction;

const names = Object.freeze(booleanTwistPoints.map((point) => chargeOfBooleanPoint(point).name));

const obstruct = (
  reason: TwistProductFourObstruction["reason"],
  left?: ChargeValueName,
  right?: ChargeValueName,
  bound?: ChargeValueName,
  observed?: ChargeValueName,
  expected?: ChargeValueName,
): TwistProductFourObstruction => Object.freeze({
  kind: "twistProduct.four-obstruction" as const,
  reason,
  left,
  right,
  bound,
  observed,
  expected,
});

/** Exhaustive finite receipt for `FOUR = Two^twist` and truth-order residuation. */
export function fourTwistProduct(): TwistProductFourJudgment {
  for (const point of booleanTwistPoints) {
    const charge = chargeOfBooleanPoint(point);
    if (!samePoint(booleanPointOfCharge(charge), point)) return obstruct("bijection", charge.name);
  }
  for (const charge of chargeValues) {
    if (!sameChargeValue(chargeOfBooleanPoint(booleanPointOfCharge(charge)), charge)) return obstruct("bijection", charge.name);
  }

  for (const left of booleanTwistPoints) {
    for (const right of booleanTwistPoints) {
      const leftCharge = chargeOfBooleanPoint(left);
      const rightCharge = chargeOfBooleanPoint(right);
      if (leK(left, right) !== chargeLeK(leftCharge, rightCharge)) return obstruct("knowledgeOrder", leftCharge.name, rightCharge.name);
      if (leT(left, right) !== chargeLeT(leftCharge, rightCharge)) return obstruct("truthOrder", leftCharge.name, rightCharge.name);
      if (!sameChargeValue(chargeOfBooleanPoint(neg(left)), negateValue(leftCharge))) return obstruct("negation", leftCharge.name);

      const knowledgeOps = [
        [chargeOfBooleanPoint(meetK(left, right)), meetKnowledgeValue(leftCharge, rightCharge)] as const,
        [chargeOfBooleanPoint(joinK(left, right)), joinKnowledgeValue(leftCharge, rightCharge)] as const,
      ];
      for (const [observed, expected] of knowledgeOps) {
        if (!sameChargeValue(observed, expected)) return obstruct("knowledgeLattice", leftCharge.name, rightCharge.name, undefined, observed.name, expected.name);
      }

      const truthOps = [
        [chargeOfBooleanPoint(meetT(left, right)), meetTruthValue(leftCharge, rightCharge)] as const,
        [chargeOfBooleanPoint(joinT(left, right)), joinTruthValue(leftCharge, rightCharge)] as const,
      ];
      for (const [observed, expected] of truthOps) {
        if (!sameChargeValue(observed, expected)) return obstruct("truthLattice", leftCharge.name, rightCharge.name, undefined, observed.name, expected.name);
      }

      if (!samePoint(fuse(left, right), fuse(right, left))) return obstruct("fusionCommutative", leftCharge.name, rightCharge.name);
      const unit = booleanPointOfCharge(linearMultiplicativeUnit);
      if (!samePoint(fuse(left, unit), left) || !samePoint(fuse(unit, left), left)) return obstruct("fusionUnit", leftCharge.name);

      for (const bound of booleanTwistPoints) {
        const boundCharge = chargeOfBooleanPoint(bound);
        if (leT(fuse(left, right), bound) !== leT(left, imp(right, bound))) {
          return obstruct("truthResiduation", leftCharge.name, rightCharge.name, boundCharge.name);
        }
      }
    }
  }

  const unit = linearMultiplicativeUnit;
  const truthTop = chargeValue("potential");
  if (sameChargeValue(unit, truthTop)) return obstruct("unitNonIntegral", unit.name, truthTop.name);

  return Object.freeze({
    kind: "twistProduct.four:witness" as const,
    elements: Object.freeze(booleanTwistPoints.map((point) => Object.freeze({
      point,
      charge: chargeOfBooleanPoint(point).name,
    }))),
    knowledgeBottom: "absurd" as const,
    knowledgeTop: "stable" as const,
    truthBottom: "active" as const,
    truthTop: "potential" as const,
    fusionUnit: unit.name,
    consistentFragment: Object.freeze(["absurd", "potential", "active"] as const),
    bijection: true as const,
    knowledgeOrderMatches: true as const,
    truthOrderMatches: true as const,
    negationMatches: true as const,
    knowledgeLatticeMatches: true as const,
    truthLatticeMatches: true as const,
    truthResiduation: true as const,
    fusionCommutative: true as const,
    fusionUnitLaw: true as const,
    unitNonIntegral: true as const,
  });
}
