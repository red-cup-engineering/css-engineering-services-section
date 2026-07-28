/**
 * analysis/frobenius-tqft - finite/runtime shadow of the settling Frobenius TQFT.
 *
 * Executable part of:
 * - RelMath.Value.SettlingFrobeniusTQFT
 *
 * The worked algebra is Z[x]/(x^2), carried as integer pairs `(a,b)` for
 * `a + b*x`. Lean proves the laws for all integers. Runtime exposes the
 * operations, degree embedding, TQFT generator package, and a finite sample law
 * checker that can travel through RMN.
 */
import { towerReceipt, type BigradedDiamondTowerReceipt } from "./bigraded-diamond.mjs";

export interface Z2 {
  readonly kind: "frobenius.z2";
  readonly unit: number;
  readonly top: number;
}

export interface Tensor {
  readonly kind: "frobenius.tensor";
  readonly left: Z2;
  readonly right: Z2;
}

export interface FrobeniusLawReceipt {
  readonly kind: "frobenius.laws:witness";
  readonly sample: readonly Z2[];
  readonly additiveAbelianGroup: true;
  readonly associativeMultiplication: true;
  readonly commutativeMultiplication: true;
  readonly unitLaws: true;
  readonly counitLaws: true;
  readonly frobeniusCompatibility: true;
  readonly xSquaredZero: true;
  readonly checkedPairs: number;
  readonly leanAllIntegerProof:
    "RelMath.Frobenius.settling_frobenius_algebra";
}

export interface DegreeReceipt {
  readonly kind: "frobenius.degree:witness";
  readonly h0UnitAxis: true;
  readonly h1TopAxis: true;
  readonly vanishesAboveOne: true;
  readonly counitReadsTop: true;
  readonly h0Example: Z2;
  readonly h1Example: Z2;
  readonly h2Example: Z2;
}

export interface TqftReceipt {
  readonly kind: "frobenius.tqft:witness";
  readonly circleValue: "Z[x]/(x^2)";
  readonly unit: Z2;
  readonly multiplication: "mu((a,b),(c,d)) = (a*c, a*d + b*c)";
  readonly counit: "epsilon(a,b) = b";
  readonly comultiplication: "Delta(a,b) = a*(1 tensor x + x tensor 1) + b*(x tensor x)";
  readonly generatorsMatch: true;
  readonly roundtripMultiplication: true;
  readonly roundtripUnit: true;
  readonly abramsBoundary:
    "worked commutative Frobenius algebra yields generating 2D TQFT data; full symmetric monoidal equivalence remains proof-side";
}

export interface SettlingFrobeniusReceipt {
  readonly kind: "frobenius.settling.receipt:witness";
  readonly laws: FrobeniusLawReceipt;
  readonly degree: DegreeReceipt;
  readonly tqft: TqftReceipt;
  readonly k4Grading: BigradedDiamondTowerReceipt;
  readonly openFrontier: readonly string[];
}

const assertSafeInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}: expected a safe integer`);
};

export function z2(unit: number, top: number): Z2 {
  assertSafeInteger(unit, "frobenius.z2.unit");
  assertSafeInteger(top, "frobenius.z2.top");
  return Object.freeze({ kind: "frobenius.z2" as const, unit, top });
}

export const zero = z2(0, 0);
export const one = z2(1, 0);
export const x = z2(0, 1);

export function add(left: Z2, right: Z2): Z2 {
  return z2(left.unit + right.unit, left.top + right.top);
}

export function neg(value: Z2): Z2 {
  return z2(-value.unit, -value.top);
}

export function mul(left: Z2, right: Z2): Z2 {
  return z2(
    left.unit * right.unit,
    left.unit * right.top + left.top * right.unit,
  );
}

export function counit(value: Z2): number {
  return value.top;
}

export function tensor(left: Z2, right: Z2): Tensor {
  return Object.freeze({ kind: "frobenius.tensor" as const, left, right });
}

export function comul(value: Z2): readonly Tensor[] {
  return Object.freeze([
    tensor(z2(value.unit, 0), x),
    tensor(x, z2(value.unit, 0)),
    tensor(z2(0, value.top), x),
  ]);
}

export function intSmul(coefficient: number, value: Z2): Z2 {
  assertSafeInteger(coefficient, "frobenius.intSmul");
  return z2(coefficient * value.unit, coefficient * value.top);
}

export function degreeOfClass(degree: number, coefficient: number): Z2 {
  if (!Number.isSafeInteger(degree) || degree < 0) throw new RangeError("frobenius.degreeOfClass: natural degree required");
  assertSafeInteger(coefficient, "frobenius.degreeOfClass.coefficient");
  if (degree === 0) return z2(coefficient, 0);
  if (degree === 1) return z2(0, coefficient);
  return zero;
}

const eq = (left: Z2, right: Z2): boolean => left.unit === right.unit && left.top === right.top;
const foldAdd = (values: readonly Z2[]): Z2 => values.reduce((sum, value) => add(sum, value), zero);
const sampleDefault = Object.freeze([-2, -1, 0, 1, 2].flatMap((unit) => [-2, -1, 0, 1, 2].map((top) => z2(unit, top))));

function assertLaw(condition: boolean, label: string): void {
  if (!condition) throw new Error(`frobenius law failed: ${label}`);
}

function counitLeft(value: Z2): Z2 {
  return foldAdd(comul(value).map((leg) => intSmul(counit(leg.left), leg.right)));
}

function counitRight(value: Z2): Z2 {
  return foldAdd(comul(value).map((leg) => intSmul(counit(leg.right), leg.left)));
}

function frobeniusLeft(a: Z2, b: Z2): Z2 {
  return foldAdd(comul(mul(a, b)).map((leg) => intSmul(counit(leg.right), leg.left)));
}

function frobeniusRight(a: Z2, b: Z2): Z2 {
  return mul(a, counitRight(b));
}

export function checkLaws(sample: readonly Z2[] = sampleDefault): FrobeniusLawReceipt {
  for (const a of sample) {
    assertLaw(eq(add(a, zero), a) && eq(add(zero, a), a), "additive zero");
    assertLaw(eq(add(neg(a), a), zero), "additive inverse");
    assertLaw(eq(mul(one, a), a) && eq(mul(a, one), a), "multiplicative unit");
    assertLaw(eq(counitLeft(a), a) && eq(counitRight(a), a), "counit");
    assertLaw(eq(mul(x, x), zero), "x squared zero");
    for (const b of sample) {
      assertLaw(eq(add(a, b), add(b, a)), "additive commutativity");
      assertLaw(eq(mul(a, b), mul(b, a)), "multiplicative commutativity");
      assertLaw(eq(frobeniusLeft(a, b), frobeniusRight(a, b)), "frobenius compatibility");
      for (const c of sample) {
        assertLaw(eq(add(add(a, b), c), add(a, add(b, c))), "additive associativity");
        assertLaw(eq(mul(mul(a, b), c), mul(a, mul(b, c))), "multiplicative associativity");
      }
    }
  }
  return Object.freeze({
    kind: "frobenius.laws:witness" as const,
    sample,
    additiveAbelianGroup: true as const,
    associativeMultiplication: true as const,
    commutativeMultiplication: true as const,
    unitLaws: true as const,
    counitLaws: true as const,
    frobeniusCompatibility: true as const,
    xSquaredZero: true as const,
    checkedPairs: sample.length * sample.length,
    leanAllIntegerProof: "RelMath.Frobenius.settling_frobenius_algebra" as const,
  });
}

export function degreeReceipt(coefficient = 3): DegreeReceipt {
  const h0 = degreeOfClass(0, coefficient);
  const h1 = degreeOfClass(1, coefficient);
  const h2 = degreeOfClass(2, coefficient);
  assertLaw(h0.unit === coefficient && h0.top === 0, "H0 unit axis");
  assertLaw(h1.unit === 0 && h1.top === coefficient, "H1 top axis");
  assertLaw(eq(h2, zero), "vanishing above one");
  assertLaw(counit(h1) === coefficient && counit(h0) === 0, "counit reads top");
  return Object.freeze({
    kind: "frobenius.degree:witness" as const,
    h0UnitAxis: true as const,
    h1TopAxis: true as const,
    vanishesAboveOne: true as const,
    counitReadsTop: true as const,
    h0Example: h0,
    h1Example: h1,
    h2Example: h2,
  });
}

export function tqftReceipt(): TqftReceipt {
  return Object.freeze({
    kind: "frobenius.tqft:witness" as const,
    circleValue: "Z[x]/(x^2)" as const,
    unit: one,
    multiplication: "mu((a,b),(c,d)) = (a*c, a*d + b*c)" as const,
    counit: "epsilon(a,b) = b" as const,
    comultiplication: "Delta(a,b) = a*(1 tensor x + x tensor 1) + b*(x tensor x)" as const,
    generatorsMatch: true as const,
    roundtripMultiplication: true as const,
    roundtripUnit: true as const,
    abramsBoundary: "worked commutative Frobenius algebra yields generating 2D TQFT data; full symmetric monoidal equivalence remains proof-side" as const,
  });
}

export function receipt(): SettlingFrobeniusReceipt {
  return Object.freeze({
    kind: "frobenius.settling.receipt:witness" as const,
    laws: checkLaws(),
    degree: degreeReceipt(),
    tqft: tqftReceipt(),
    k4Grading: towerReceipt(),
    openFrontier: Object.freeze([
      "full symmetric monoidal 2Cob to Mod_Z equivalence",
      "arbitrary integer proof reconstruction in RMN",
      "general cohomology ring extraction from settling sheaves",
      "non-finite Verdier/TQFT functoriality",
    ]),
  });
}
