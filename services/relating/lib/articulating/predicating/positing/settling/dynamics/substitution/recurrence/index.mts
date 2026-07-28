/**
 * @packageDocumentation
 *
 * settling/dynamics/substitution/recurrence - step-`n` hierarchy witnesses.
 *
 * This submodule reads the single natural parameter `n >= 2` that locks four
 * quantities of a canonical step-`n` rule together:
 *
 * 1. matrix dimension: the incidence matrix is `n x n`;
 * 2. recurrence depth: the rule is an `n`-term recurrence;
 * 3. alphabet size: the rule has `n` letters;
 * 4. cohomological rank: the step-`n` classifying invariant has rank `n`.
 *
 * A `+1` in the parameter is therefore visible as `+1` in all four carrier
 * fields. For Fibonacci (`n = 2`) and Padovan (`n = 3`), the module derives the
 * exact integer characteristic polynomial from the actual incidence matrix and
 * checks it against the declared polynomial. It does not compute real
 * Perron-Frobenius eigenvalues.
 *
 * Grounding: `lean/RelMath/Aperiodic/StepN/Recurrence.lean`,
 * `lean/RelMath/Aperiodic/StepN/SubstitutionMatrix.lean`, and the content node
 * `content/.../settling/content/aperiodic-settling/content/step-n-substitution-recurrence/`.
 */
import {
  abelianize,
  charPolyOver,
  primitiveMatrix,
  stepNInvariant,
  substitutionRule,
  substitutionRuleEntry,
  substitutionSymbol,
  transposeSubstitutionMatrix,
  type PrimitiveMatrixWitness,
  type StepNInvariant,
  type SubstitutionIncidenceMatrix,
  type SubstitutionRule,
  type SubstitutionSymbol,
} from "../index.mjs";
import {
  count,
  fromNatural,
  intEqual,
  intNegate,
  intOne,
  intZero,
  isNegative,
  isPositive,
  matmul,
  natEqual,
  natOne,
  natZero,
  successor,
  type Integer,
  type Matrix,
  type Natural,
} from "../../../analysis/exact-number.mjs";
import { chargeValues } from "../../../../bilattice-charge.mjs";
import { mark } from "../../../../../../utterance.mjs";

/* ──────────────────────────────────────────────────────────────────────────
 * (1) The co-incrementing bundle `StepNData`
 * ────────────────────────────────────────────────────────────────────────── */

/** The **co-incrementing data** of a step-`n` substitution rule: the four exact
 * `Natural` quantities the single parameter `n` controls. For the canonical step-`n`
 * rule ({@link mkStepN}) all four equal `n`, so a `+1` in the parameter is a `+1`
 * in every field at once. */
export interface StepNData {
  readonly kind: "substitution.dynamics.recurrence.stepNData";
  /** The dimension of the `n × n` incidence matrix `M`. */
  readonly matrixDim: Natural;
  /** The recurrence depth — the rule is an `n`-term recurrence. */
  readonly recurrenceDepth: Natural;
  /** The alphabet size — the rule has `n` letters. */
  readonly alphabetSize: Natural;
  /** The cohomological rank — `cl-inv⁽ⁿ⁾ ∈ ℤⁿ`. */
  readonly cohRank: Natural;
}

/** The **canonical step-`n` bundle**: every controlled quantity equals the single
 * parameter `n`. The construction witnessing the co-incrementing hierarchy — there
 * is *one* `n`, and matrix dimension, recurrence depth, alphabet size, and
 * cohomological rank are all that one `n`. */
export function mkStepN(n: Natural): StepNData {
  return Object.freeze({
    kind: "substitution.dynamics.recurrence.stepNData" as const,
    matrixDim: n,
    recurrenceDepth: n,
    alphabetSize: n,
    cohRank: n,
  });
}

/** A witness that all four controlled quantities of a bundle coincide. */
export interface StepNAllEqualWitness {
  readonly kind: "substitution.dynamics.recurrence.allEqual:witness";
  readonly data: StepNData;
  readonly value: Natural;
}

/** An obstruction: a bundle whose four controlled quantities are not all equal. */
export interface StepNAllEqualObstruction {
  readonly kind: "substitution.dynamics.recurrence.allEqual-obstruction";
  readonly data: StepNData;
}

/** The result of checking the four controlled quantities coincide. */
export type StepNAllEqualJudgment = StepNAllEqualWitness | StepNAllEqualObstruction;

/** **The four controlled quantities of a bundle are equal.** Witnesses that matrix
 * dimension, recurrence depth, alphabet size, and cohomological rank are the single
 * parameter `n` viewed four ways — the locking that makes the hierarchy
 * co-increment. */
export function stepNDataAllEqual(data: StepNData): StepNAllEqualJudgment {
  const allEqual =
    natEqual(data.matrixDim, data.recurrenceDepth)
    && natEqual(data.recurrenceDepth, data.alphabetSize)
    && natEqual(data.alphabetSize, data.cohRank);
  return allEqual
    ? Object.freeze({ kind: "substitution.dynamics.recurrence.allEqual:witness" as const, data, value: data.matrixDim })
    : Object.freeze({ kind: "substitution.dynamics.recurrence.allEqual-obstruction" as const, data });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (2) The characteristic polynomial as a degree-`n` monic integer polynomial
 *
 * The growth rate of a primitive step-`n` rule is the dominant Perron–Frobenius
 * eigenvalue of its `n × n` incidence matrix — a degree-`n` algebraic number. The
 * degree-`n` content is carried by the monic integer characteristic polynomial
 * (ascending-degree coefficients, `coeffs[k]` the coefficient of `xᵏ`).
 * ────────────────────────────────────────────────────────────────────────── */

/** A characteristic polynomial: ascending-degree exact-integer coefficients. */
export type CharacteristicPolynomial = readonly Integer[];

/** **Degree-`n` predicate**: an `n × n` matrix's characteristic polynomial has
 * degree exactly `n`, i.e. its ascending coefficient list has length `n + 1`. */
export const degreeN = (cp: CharacteristicPolynomial, n: Natural): boolean =>
  natEqual(count(cp), successor(n));

/** **Monic predicate** (ascending degree): the leading (last) coefficient is `1`.
 * The characteristic polynomial of an integer matrix is always monic. */
export const monic = (cp: CharacteristicPolynomial): boolean => {
  const leading = cp[cp.length - 1];
  return leading !== undefined && intEqual(leading, intOne);
};

/** Equality of characteristic polynomials, coefficientwise. */
export const samePolynomial = (left: CharacteristicPolynomial, right: CharacteristicPolynomial): boolean =>
  left.length === right.length && left.every((coefficient, index) => intEqual(coefficient, right[index]!));

const negOne: Integer = intNegate(intOne);

/** Small canonical naturals (`2`, `3`, `4`) the step-`n` instances are stated over. */
const two: Natural = successor(natOne);
const three: Natural = successor(two);
const four: Natural = successor(three);
const five: Natural = successor(four);

/** **The golden ratio's minimal polynomial** `x² − x − 1`, ascending coefficients
 * `[-1, -1, 1]` — the Perron–Frobenius growth rate of the Fibonacci substitution
 * (the dominant eigenvalue of `[[1,1],[1,0]]`). Monic of degree `2`. */
export const goldenRatioMinimalPolynomial: CharacteristicPolynomial = Object.freeze([negOne, negOne, intOne]);

/** **The plastic number's minimal polynomial** `x³ − x − 1`, ascending coefficients
 * `[-1, -1, 0, 1]` — the Perron–Frobenius growth rate of the Padovan substitution
 * (the smallest Pisot number). Monic of degree `3`. */
export const plasticNumberMinimalPolynomial: CharacteristicPolynomial = Object.freeze([negOne, negOne, intZero, intOne]);

/* ──────────────────────────────────────────────────────────────────────────
 * (3) The canonical Fibonacci (n=2) and Padovan (n=3) rules, derived
 *
 * Each rule is a genuine substitution; its incidence matrix is `abelianize`d and
 * its characteristic polynomial DERIVED through `charPolyOver` (the parent module's
 * exact `charPoly`), then matched against the declared minimal polynomial.
 * ────────────────────────────────────────────────────────────────────────── */

const a: SubstitutionSymbol = substitutionSymbol(mark("a"));
const b: SubstitutionSymbol = substitutionSymbol(mark("b"));
const c: SubstitutionSymbol = substitutionSymbol(mark("c"));

/** The **Fibonacci substitution** `a ↦ ab`, `b ↦ a` over the 2-letter alphabet
 * `{a, b}` — the canonical step-2 rule. */
export const fibonacciSubstitution: SubstitutionRule = substitutionRule([
  substitutionRuleEntry(a, [a, b]),
  substitutionRuleEntry(b, [a]),
]);

/** The **Padovan substitution** `a ↦ b`, `b ↦ c`, `c ↦ ab` over the 3-letter
 * alphabet `{a, b, c}` — the canonical step-3 rule (recurrence `P(k) = P(k−2) +
 * P(k−3)`). */
export const padovanSubstitution: SubstitutionRule = substitutionRule([
  substitutionRuleEntry(a, [b]),
  substitutionRuleEntry(b, [c]),
  substitutionRuleEntry(c, [a, b]),
]);

/** The Fibonacci incidence matrix `[[1,1],[1,0]]`, derived by abelianization. */
export const fibonacciIncidence: SubstitutionIncidenceMatrix = abelianize(fibonacciSubstitution, [a, b]);

/** The Padovan incidence matrix `[[0,0,1],[1,0,1],[0,1,0]]`, derived by abelianization. */
export const padovanIncidence: SubstitutionIncidenceMatrix = abelianize(padovanSubstitution, [a, b, c]);

/** The Lean/corpus orientation `[[0,1,0],[0,0,1],[1,1,0]]`: entry `i,j` counts `j` in `subst(i)`. */
export const padovanCorpusIncidence: SubstitutionIncidenceMatrix = transposeSubstitutionMatrix(padovanIncidence);

/* ──────────────────────────────────────────────────────────────────────────
 * (3b) The METALLIC-MEAN family `a ↦ aⁿb, b ↦ a` — the step-2 family parameterized by `n`
 *
 * For `n ≥ 1`, `a ↦ aⁿb, b ↦ a` has incidence matrix `[[n,1],[1,0]]`, characteristic polynomial
 * `x² − nx − 1`, and Perron eigenvalue the n-th METALLIC MEAN `(n + √(n²+4))/2` — a quadratic
 * irrational in `ℚ(√(n²+4))`: golden (`n=1`, = Fibonacci), silver (`n=2`, Pell, `1+√2`), bronze
 * (`n=3`). The inflation factor of Labbé's metallic-mean Wang tiles; `n=1` recovers Fibonacci.
 * ────────────────────────────────────────────────────────────────────────── */

/** The n-th **metallic-mean substitution** `a ↦ aⁿb, b ↦ a` over `{a, b}` (`n ≥ 1`). */
export function metallicMeanSubstitution(n: Natural): SubstitutionRule {
  const aCopies: SubstitutionSymbol[] = n.members.map(() => a);
  return substitutionRule([
    substitutionRuleEntry(a, [...aCopies, b]),
    substitutionRuleEntry(b, [a]),
  ]);
}

/** The n-th metallic mean's minimal polynomial `x² − nx − 1`, ascending coeffs `[−1, −n, 1]`; the
 *  Perron eigenvalue `(n + √(n²+4))/2` is its larger root. */
export function metallicMeanMinimalPolynomial(n: Natural): CharacteristicPolynomial {
  return Object.freeze([negOne, intNegate(fromNatural(n)), intOne]);
}

/** The n-th metallic mean's incidence matrix `[[n,1],[1,0]]`, derived by abelianization. */
export function metallicMeanIncidence(n: Natural): SubstitutionIncidenceMatrix {
  return abelianize(metallicMeanSubstitution(n), [a, b]);
}

/** A witness that the n-th metallic-mean rule's growth rate is the n-th metallic mean: its derived
 *  incidence characteristic polynomial is monic of degree 2 and equals the declared `x² − nx − 1`. */
export function metallicMeanGrowthDegree(n: Natural): GrowthDegreeJudgment {
  return growthDegree(metallicMeanIncidence(n), successor(natOne), metallicMeanMinimalPolynomial(n));
}

/** The Fibonacci characteristic polynomial, derived from its incidence matrix. */
export const fibonacciCharacteristicPolynomial: CharacteristicPolynomial = charPolyOver(fibonacciIncidence);

/** The Padovan characteristic polynomial, derived from its incidence matrix. */
export const padovanCharacteristicPolynomial: CharacteristicPolynomial = charPolyOver(padovanIncidence);

const identityMatrix = (n: number): Matrix =>
  Object.freeze(Array.from({ length: n }, (_, row) =>
    Object.freeze(Array.from({ length: n }, (_, column) => row === column ? intOne : intZero))));

export function matrixPower(matrix: Matrix, exponent: Natural): Matrix {
  let power = identityMatrix(matrix.length);
  for (const _member of exponent.members) power = matmul(power, matrix);
  return power;
}

export const nonnegativeMatrix = (matrix: Matrix): boolean =>
  matrix.every((row) => row.every((entry) => !isNegative(entry)));

export const positiveMatrix = (matrix: Matrix): boolean =>
  matrix.every((row) => row.every(isPositive));

export interface MatrixPrimitivityWitness {
  readonly kind: "substitution.dynamics.recurrence.matrixPrimitivity:witness";
  readonly matrix: Matrix;
  readonly nonnegative: true;
  readonly primitive: PrimitiveMatrixWitness;
  readonly positiveExponent: Natural;
  readonly positivePower: Matrix;
  readonly positiveImpliesNonnegative: true;
}

export interface SubstitutionPrimitivityReceipt {
  readonly kind: "substitution.dynamics.recurrence.substitutionPrimitivity:witness";
  readonly sourceModule: "RelMath.Aperiodic.SubstitutionPrimitivity";
  readonly theorems: readonly [
    "RelMath.Aperiodic.StepN.NonnegativeMatrix",
    "RelMath.Aperiodic.StepN.PositiveMatrix",
    "RelMath.Aperiodic.StepN.Primitive",
    "RelMath.Aperiodic.StepN.PositiveMatrix.nonneg",
    "RelMath.Aperiodic.StepN.fibonacciMatrix_nonnegative",
    "RelMath.Aperiodic.StepN.padovanMatrix_nonnegative",
    "RelMath.Aperiodic.StepN.fibonacciMatrix_pow2_positive",
    "RelMath.Aperiodic.StepN.fibonacciMatrix_primitive",
    "RelMath.Aperiodic.StepN.padovanMatrix_pow5_positive",
    "RelMath.Aperiodic.StepN.padovanMatrix_primitive",
  ];
  readonly fibonacci: MatrixPrimitivityWitness;
  readonly padovan: MatrixPrimitivityWitness;
}

const requirePrimitiveAt = (matrix: Matrix, exponent: Natural): MatrixPrimitivityWitness => {
  const primitive = primitiveMatrix(matrix);
  const positivePower = matrixPower(matrix, exponent);
  if (
    primitive.kind !== "substitution.dynamics.primitiveMatrix:witness"
    || !natEqual(primitive.exponent, exponent)
    || !nonnegativeMatrix(matrix)
    || !positiveMatrix(positivePower)
  ) {
    throw new TypeError("requirePrimitiveAt: expected a nonnegative primitive matrix at the requested exponent");
  }
  return Object.freeze({
    kind: "substitution.dynamics.recurrence.matrixPrimitivity:witness" as const,
    matrix,
    nonnegative: true as const,
    primitive,
    positiveExponent: exponent,
    positivePower,
    positiveImpliesNonnegative: nonnegativeMatrix(positivePower) as true,
  });
};

/** Finite carrier for `RelMath.Aperiodic.SubstitutionPrimitivity`. */
export function substitutionPrimitivityReceipt(): SubstitutionPrimitivityReceipt {
  return Object.freeze({
    kind: "substitution.dynamics.recurrence.substitutionPrimitivity:witness" as const,
    sourceModule: "RelMath.Aperiodic.SubstitutionPrimitivity" as const,
    theorems: Object.freeze([
      "RelMath.Aperiodic.StepN.NonnegativeMatrix",
      "RelMath.Aperiodic.StepN.PositiveMatrix",
      "RelMath.Aperiodic.StepN.Primitive",
      "RelMath.Aperiodic.StepN.PositiveMatrix.nonneg",
      "RelMath.Aperiodic.StepN.fibonacciMatrix_nonnegative",
      "RelMath.Aperiodic.StepN.padovanMatrix_nonnegative",
      "RelMath.Aperiodic.StepN.fibonacciMatrix_pow2_positive",
      "RelMath.Aperiodic.StepN.fibonacciMatrix_primitive",
      "RelMath.Aperiodic.StepN.padovanMatrix_pow5_positive",
      "RelMath.Aperiodic.StepN.padovanMatrix_primitive",
    ]) as SubstitutionPrimitivityReceipt["theorems"],
    fibonacci: requirePrimitiveAt(fibonacciIncidence, two),
    padovan: requirePrimitiveAt(padovanCorpusIncidence, five),
  });
}

/** The **Fibonacci** step-2 bundle: 2-term recurrence, 2 letters, `2 × 2` matrix,
 * rank-2 cohomology — all `= 2`. */
export const fibonacciStepN: StepNData = mkStepN(two);

/** The **Padovan** step-3 bundle: 3-term recurrence, 3 letters, `3 × 3` matrix,
 * rank-3 cohomology — all `= 3`. */
export const padovanStepN: StepNData = mkStepN(three);

/* ──────────────────────────────────────────────────────────────────────────
 * (4) The growth-degree witness: derived char poly = declared minimal polynomial
 * ────────────────────────────────────────────────────────────────────────── */

/** A witness that a rule's growth rate is a degree-`n` algebraic number: its
 * incidence matrix's characteristic polynomial is monic of degree `n` and equals
 * the declared minimal polynomial of the growth rate. */
export interface GrowthDegreeWitness {
  readonly kind: "substitution.dynamics.recurrence.growthDegree:witness";
  readonly degree: Natural;
  readonly derived: CharacteristicPolynomial;
  readonly declared: CharacteristicPolynomial;
}

/** An obstruction: the derived characteristic polynomial fails monicity, the
 * expected degree, or agreement with the declared minimal polynomial. */
export interface GrowthDegreeObstruction {
  readonly kind: "substitution.dynamics.recurrence.growthDegree-obstruction";
  readonly reason: "not-monic" | "wrong-degree" | "declared-mismatch";
  readonly degree: Natural;
  readonly derived: CharacteristicPolynomial;
  readonly declared: CharacteristicPolynomial;
}

/** The result of checking a rule's growth degree. */
export type GrowthDegreeJudgment = GrowthDegreeWitness | GrowthDegreeObstruction;

/** **The substitution growth rate has degree exactly `n`.** Derives the incidence
 * matrix's characteristic polynomial and witnesses it is monic, of degree `n`, and
 * identical to the declared minimal polynomial of the growth rate — refusing the
 * witness when any of the three fails. */
export function growthDegree(
  incidence: SubstitutionIncidenceMatrix,
  n: Natural,
  declared: CharacteristicPolynomial,
): GrowthDegreeJudgment {
  const derived = charPolyOver(incidence);
  if (!monic(derived)) {
    return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction" as const, reason: "not-monic", degree: n, derived, declared });
  }
  if (!degreeN(derived, n)) {
    return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction" as const, reason: "wrong-degree", degree: n, derived, declared });
  }
  if (!samePolynomial(derived, declared)) {
    return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree-obstruction" as const, reason: "declared-mismatch", degree: n, derived, declared });
  }
  return Object.freeze({ kind: "substitution.dynamics.recurrence.growthDegree:witness" as const, degree: n, derived, declared });
}

/* ──────────────────────────────────────────────────────────────────────────
 * (5) The co-incrementing hierarchy (headline)
 * ────────────────────────────────────────────────────────────────────────── */

/** The full **step-`n` co-incrementing hierarchy** carrier: the parameter `n`, the
 * canonical bundle and its `+1` successor with their all-equal witnesses, the worked
 * Fibonacci / Padovan growth-degree witnesses, and the `n = 2 ↔ FOUR` alignment. */
export interface StepNHierarchyCarrier {
  readonly kind: "substitution.dynamics.recurrence.hierarchy";
  readonly parameter: Natural;
  /** All four controlled quantities of `mkStepN n` equal `n`. */
  readonly atParameter: StepNAllEqualJudgment;
  /** The `+1`-propagation: all four of `mkStepN (n+1)` equal `n + 1`. */
  readonly atSuccessor: StepNAllEqualJudgment;
  /** Fibonacci (`n = 2`): growth rate the golden ratio, degree 2. */
  readonly fibonacci: GrowthDegreeJudgment;
  /** Padovan (`n = 3`): growth rate the plastic number, degree 3. */
  readonly padovan: GrowthDegreeJudgment;
  /** The `n = 2 ↔ FOUR` corner alignment: the bilattice has `4 = 2²` corners. */
  readonly fourCornerAlignment: boolean;
  /** The step-2 colimit invariant (`Aperiodic.stepNInvariant`) of the Fibonacci matrix. */
  readonly fibonacciStepNInvariant: StepNInvariant;
}

/** **The step-`n` co-incrementing hierarchy.** For the canonical step-`n` rule the
 * matrix dimension, recurrence depth, alphabet size, and cohomological rank are the
 * single parameter `n` (all-equal witness), the `(n+1)`-bundle has all four equal to
 * `n + 1` (the `+1`-propagation), and the growth rate is a degree-`n` algebraic
 * number — exhibited concretely by Fibonacci (`n = 2`, golden ratio, `x² − x − 1`)
 * and Padovan (`n = 3`, plastic number, `x³ − x − 1`), each derived through the
 * parent module's `abelianize` ∘ `charPolyOver`. At `n = 2` the bilattice's
 * `4 = 2²` corners realize FOUR. */
export function stepNHierarchy(n: Natural): StepNHierarchyCarrier {
  return Object.freeze({
    kind: "substitution.dynamics.recurrence.hierarchy" as const,
    parameter: n,
    atParameter: stepNDataAllEqual(mkStepN(n)),
    atSuccessor: stepNDataAllEqual(mkStepN(successor(n))),
    fibonacci: growthDegree(fibonacciIncidence, two, goldenRatioMinimalPolynomial),
    padovan: growthDegree(padovanIncidence, three, plasticNumberMinimalPolynomial),
    fourCornerAlignment: natEqual(count(chargeValues), four),
    fibonacciStepNInvariant: stepNInvariant(fibonacciIncidence),
  });
}
