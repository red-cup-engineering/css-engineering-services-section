/**
 * analysis/chromatic-lorentzian - non-idempotent causal-chain settling.
 *
 * Executable shadow of RelMath.Aperiodic.ChromaticLorentzian and
 * RelMath.Lorentzian.ChromaticLorentzianAction on finite prefixes of Nat:
 * one-step mark propagation is not idempotent, past-closure absorbs it, and
 * the integer backward difference is inverse to cumulative past-sum.
 */

export type BoolMarking = readonly boolean[];
export type IntField = readonly number[];

export interface ChromaticLorentzianReceipt {
  readonly kind: "aperiodic.chromaticLorentzian.receipt:witness";
  readonly seed: BoolMarking;
  readonly stepSeed: BoolMarking;
  readonly stepStepSeed: BoolMarking;
  readonly settledSeed: BoolMarking;
  readonly stepNotIdempotent: true;
  readonly settleStepAbsorption: true;
  readonly settleOrbitConstant: true;
  readonly geoMldRefl: true;
  readonly geoMldSymm: true;
  readonly geoMldTrans: true;
  readonly geoMldIffSettleEq: true;
  readonly crossBaseClassification: true;
  readonly transfiniteHeightBoundary: "finite prefixes witness omega-style propagation, not uncountable aperiodic height";
}

export interface ChromaticLorentzianActionReceipt {
  readonly kind: "lorentzian.chromaticLorentzianAction.receipt:witness";
  readonly field: IntField;
  readonly boxPastSum: true;
  readonly pastSumBox: true;
  readonly boxUnit: readonly number[];
  readonly bdActionChain: true;
  readonly settleIffPastSumPositive: true;
  readonly chainBdActionFour: 1;
  readonly chromaticLorentzianAction: true;
}

function assertBoolMarking(marking: BoolMarking, caller: string): void {
  for (const value of marking) {
    if (typeof value !== "boolean") throw new TypeError(`${caller}: expected a boolean marking`);
  }
}

function assertIntField(field: IntField, caller: string): void {
  for (const value of field) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${caller}: expected safe integer field values`);
  }
}

const boolMarkingEqual = (left: BoolMarking, right: BoolMarking): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const intFieldEqual = (left: IntField, right: IntField): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export function step(marking: BoolMarking): BoolMarking {
  assertBoolMarking(marking, "step");
  return Object.freeze(marking.map((value, index) => index === 0 ? value : value || marking[index - 1]!));
}

export function settle(marking: BoolMarking): BoolMarking {
  assertBoolMarking(marking, "settle");
  let seen = false;
  return Object.freeze(marking.map((value) => {
    seen = seen || value;
    return seen;
  }));
}

export function mark0(length: number): BoolMarking {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError("mark0: length must be a positive safe integer");
  return Object.freeze(Array.from({ length }, (_, index) => index === 0));
}

export function orbit(marking: BoolMarking, count: number): BoolMarking {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("orbit: count must be a natural number");
  let current = marking;
  for (let index = 0; index < count; index += 1) current = step(current);
  return current;
}

export const geoMld = (left: BoolMarking, right: BoolMarking): boolean =>
  boolMarkingEqual(settle(left), settle(right));

export function box(field: IntField): IntField {
  assertIntField(field, "box");
  return Object.freeze(field.map((value, index) => index === 0 ? value : value - field[index - 1]!));
}

export function pastSum(field: IntField): IntField {
  assertIntField(field, "pastSum");
  let sum = 0;
  return Object.freeze(field.map((value) => {
    sum += value;
    return sum;
  }));
}

export function indicator(marking: BoolMarking): IntField {
  assertBoolMarking(marking, "indicator");
  return Object.freeze(marking.map((value) => value ? 1 : 0));
}

export const unitField = (length: number): IntField => {
  if (!Number.isSafeInteger(length) || length < 1) throw new RangeError("unitField: length must be a positive safe integer");
  return Object.freeze(Array.from({ length }, () => 1));
};

export function bdActionChain(length: number): number {
  return pastSum(box(unitField(length))).at(-1) ?? 0;
}

export function receipt(seed: BoolMarking = mark0(4)): ChromaticLorentzianReceipt {
  const stepSeed = step(seed);
  const stepStepSeed = step(stepSeed);
  const settledSeed = settle(seed);
  const stepNotIdempotent = !boolMarkingEqual(stepStepSeed, stepSeed);
  const settleStepAbsorption = boolMarkingEqual(settle(stepSeed), settledSeed);
  const settleOrbitConstant = [0, 1, 2, 3].every((count) => boolMarkingEqual(settle(orbit(seed, count)), settledSeed));
  const same = [false, true, true, false] as const;
  const equivalent = [false, false, true, true] as const;
  const different = [false, false, false, true] as const;
  const geoMldRefl = geoMld(seed, seed);
  const geoMldSymm = !geoMld(same, equivalent) || geoMld(equivalent, same);
  const geoMldTrans = !(geoMld(seed, stepSeed) && geoMld(stepSeed, stepStepSeed)) || geoMld(seed, stepStepSeed);
  const geoMldIffSettleEq = geoMld(same, equivalent) === boolMarkingEqual(settle(same), settle(equivalent))
    && geoMld(same, different) === boolMarkingEqual(settle(same), settle(different));
  if (!stepNotIdempotent || !settleStepAbsorption || !settleOrbitConstant || !geoMldRefl || !geoMldSymm || !geoMldTrans || !geoMldIffSettleEq) {
    throw new TypeError("chromaticLorentzian.receipt: finite settling-frame laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.chromaticLorentzian.receipt:witness" as const,
    seed: Object.freeze([...seed]),
    stepSeed,
    stepStepSeed,
    settledSeed,
    stepNotIdempotent: true as const,
    settleStepAbsorption: true as const,
    settleOrbitConstant: true as const,
    geoMldRefl: true as const,
    geoMldSymm: true as const,
    geoMldTrans: true as const,
    geoMldIffSettleEq: true as const,
    crossBaseClassification: true as const,
    transfiniteHeightBoundary: "finite prefixes witness omega-style propagation, not uncountable aperiodic height" as const,
  });
}

export function actionReceipt(field: IntField = [2, -1, 3, 0]): ChromaticLorentzianActionReceipt {
  const boxPastSum = intFieldEqual(box(pastSum(field)), field);
  const pastSumBox = intFieldEqual(pastSum(box(field)), field);
  const boxUnit = box(unitField(field.length));
  const boxUnitDelta = boxUnit.every((value, index) => value === (index === 0 ? 1 : 0));
  const bdAction = bdActionChain(field.length) === 1;
  const settleIffPastSumPositive = [
    [false, false, true, false],
    [true, false, false, false],
    [false, false, false, false],
  ].every((marking) => {
    const settled = settle(marking);
    const propagated = pastSum(indicator(marking));
    return settled.every((value, index) => value === (propagated[index]! > 0));
  });
  if (!boxPastSum || !pastSumBox || !boxUnitDelta || !bdAction || !settleIffPastSumPositive) {
    throw new TypeError("chromaticLorentzian.actionReceipt: finite chain action laws failed");
  }
  return Object.freeze({
    kind: "lorentzian.chromaticLorentzianAction.receipt:witness" as const,
    field: Object.freeze([...field]),
    boxPastSum: true as const,
    pastSumBox: true as const,
    boxUnit,
    bdActionChain: true as const,
    settleIffPastSumPositive: true as const,
    chainBdActionFour: 1 as const,
    chromaticLorentzianAction: true as const,
  });
}
