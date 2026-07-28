/**
 * analysis/number-theory - finite executable shadows of RelMath.Order number theory.
 *
 * Lean proves factorial/Pascal/binomial, divisibility/gcd/prime, FTA, and
 * image factorization. This module keeps the Node side finite and carrier
 * shaped: concrete Nat computations and finite function tables become
 * witness/obstruction receipts without pretending to reify arbitrary functions
 * or proof terms at runtime.
 */

const assertNat = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}: expected a non-negative safe integer`);
  }
};

function safeAdd(left: number, right: number, label: string): number {
  const value = left + right;
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}: result exceeds safe integer range`);
  return value;
}

function safeMultiply(left: number, right: number, label: string): number {
  const value = left * right;
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}: result exceeds safe integer range`);
  return value;
}

function safePow(base: number, exponent: number, label: string): number {
  assertNat(`${label} base`, base);
  assertNat(`${label} exponent`, exponent);
  let value = 1;
  for (let index = 0; index < exponent; index += 1) {
    value = safeMultiply(value, base, label);
  }
  return value;
}

/** `n!`, matching `RelMath.NumberTheory.factorial`. */
export function factorial(n: number): number {
  assertNat("factorial n", n);
  let value = 1;
  for (let factor = 2; factor <= n; factor += 1) value = safeMultiply(value, factor, "factorial");
  return value;
}

/** The falling-product permutation count `P(n,k)`. */
export function permutationCount(n: number, k: number): number {
  assertNat("permutationCount n", n);
  assertNat("permutationCount k", k);
  let value = 1;
  for (let index = 0; index < k; index += 1) {
    value = safeMultiply(value, Math.max(n - index, 0), "permutationCount");
  }
  return value;
}

/** `C(n,k)`, computed by Pascal's recurrence with over-choosing equal to zero. */
export function choose(n: number, k: number): number {
  assertNat("choose n", n);
  assertNat("choose k", k);
  if (k > n) return 0;
  const width = k + 1;
  const row = Array.from({ length: width }, () => 0);
  row[0] = 1;
  for (let i = 1; i <= n; i += 1) {
    const top = Math.min(i, k);
    for (let j = top; j >= 1; j -= 1) row[j] = safeAdd(row[j] ?? 0, row[j - 1] ?? 0, "choose");
  }
  return row[k] ?? 0;
}

export interface PascalWitness {
  readonly kind: "numberTheory.pascal:witness";
  readonly n: number;
  readonly k: number;
  readonly chooseZero: 1;
  readonly chooseSelf: 1;
  readonly left: number;
  readonly right: number;
  readonly holds: true;
}

export interface PascalObstruction {
  readonly kind: "numberTheory.pascal-obstruction";
  readonly n: number;
  readonly k: number;
  readonly chooseZero: number;
  readonly chooseSelf: number;
  readonly left: number;
  readonly right: number;
  readonly holds: false;
}

export type PascalJudgment = PascalWitness | PascalObstruction;

/** Carrier receipt for `choose n 0 = 1`, `choose n n = 1`, and Pascal recurrence. */
export function pascal(n: number, k: number): PascalJudgment {
  assertNat("pascal n", n);
  assertNat("pascal k", k);
  const chooseZero = choose(n, 0);
  const chooseSelf = choose(n, n);
  const left = choose(n + 1, k + 1);
  const right = safeAdd(choose(n, k), choose(n, k + 1), "pascal");
  if (chooseZero === 1 && chooseSelf === 1 && left === right) {
    return Object.freeze({
      kind: "numberTheory.pascal:witness" as const,
      n,
      k,
      chooseZero: 1 as const,
      chooseSelf: 1 as const,
      left,
      right,
      holds: true as const,
    });
  }
  return Object.freeze({
    kind: "numberTheory.pascal-obstruction" as const,
    n,
    k,
    chooseZero,
    chooseSelf,
    left,
    right,
    holds: false as const,
  });
}

export interface BinomialWitness {
  readonly kind: "numberTheory.binomial:witness";
  readonly x: number;
  readonly y: number;
  readonly n: number;
  readonly lhs: number;
  readonly rhs: number;
  readonly terms: readonly number[];
  readonly holds: true;
}

export interface BinomialObstruction {
  readonly kind: "numberTheory.binomial-obstruction";
  readonly x: number;
  readonly y: number;
  readonly n: number;
  readonly lhs: number;
  readonly rhs: number;
  readonly terms: readonly number[];
  readonly holds: false;
}

export type BinomialJudgment = BinomialWitness | BinomialObstruction;

/** Finite Nat-semiring receipt for `(x+y)^n = Σ C(n,k)x^k y^(n-k)`. */
export function binomial(x: number, y: number, n: number): BinomialJudgment {
  assertNat("binomial x", x);
  assertNat("binomial y", y);
  assertNat("binomial n", n);
  const lhs = safePow(safeAdd(x, y, "binomial base"), n, "binomial lhs");
  const terms = Array.from({ length: n + 1 }, (_, k) => {
    const coeff = choose(n, k);
    const xPow = safePow(x, k, "binomial x");
    const yPow = safePow(y, n - k, "binomial y");
    return safeMultiply(coeff, safeMultiply(xPow, yPow, "binomial term"), "binomial term");
  });
  const rhs = terms.reduce((sum, term) => safeAdd(sum, term, "binomial sum"), 0);
  if (lhs === rhs) return Object.freeze({ kind: "numberTheory.binomial:witness" as const, x, y, n, lhs, rhs, terms, holds: true as const });
  return Object.freeze({ kind: "numberTheory.binomial-obstruction" as const, x, y, n, lhs, rhs, terms, holds: false as const });
}

export interface DivisibilityWitness {
  readonly kind: "numberTheory.divides:witness";
  readonly divisor: number;
  readonly dividend: number;
  readonly quotient: number;
  readonly product: number;
  readonly divides: true;
}

export interface DivisibilityObstruction {
  readonly kind: "numberTheory.divides-obstruction";
  readonly divisor: number;
  readonly dividend: number;
  readonly divides: false;
}

export type DivisibilityJudgment = DivisibilityWitness | DivisibilityObstruction;

/** The finite witness for `a ∣ b := ∃ c, b = a*c`. */
export function divides(divisor: number, dividend: number): DivisibilityJudgment {
  assertNat("divides divisor", divisor);
  assertNat("divides dividend", dividend);
  if (divisor === 0) {
    if (dividend === 0) return Object.freeze({ kind: "numberTheory.divides:witness" as const, divisor, dividend, quotient: 0, product: 0, divides: true as const });
    return Object.freeze({ kind: "numberTheory.divides-obstruction" as const, divisor, dividend, divides: false as const });
  }
  if (dividend % divisor === 0) {
    const quotient = dividend / divisor;
    return Object.freeze({ kind: "numberTheory.divides:witness" as const, divisor, dividend, quotient, product: dividend, divides: true as const });
  }
  return Object.freeze({ kind: "numberTheory.divides-obstruction" as const, divisor, dividend, divides: false as const });
}

/** Euclid's algorithm. */
export function gcd(a: number, b: number): number {
  assertNat("gcd a", a);
  assertNat("gcd b", b);
  let left = a;
  let right = b;
  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left;
}

export interface GcdMeetWitness {
  readonly kind: "numberTheory.gcdMeet:witness";
  readonly a: number;
  readonly b: number;
  readonly d: number;
  readonly gcd: number;
  readonly gcdDividesA: true;
  readonly gcdDividesB: true;
  readonly dDividesA: boolean;
  readonly dDividesB: boolean;
  readonly dDividesGcd: boolean;
  readonly greatestPremiseHolds: boolean;
  readonly recurrence: boolean;
  readonly holds: true;
}

export interface GcdMeetObstruction {
  readonly kind: "numberTheory.gcdMeet-obstruction";
  readonly a: number;
  readonly b: number;
  readonly d: number;
  readonly gcd: number;
  readonly gcdDividesA: boolean;
  readonly gcdDividesB: boolean;
  readonly dDividesA: boolean;
  readonly dDividesB: boolean;
  readonly dDividesGcd: boolean;
  readonly greatestPremiseHolds: boolean;
  readonly recurrence: boolean;
  readonly holds: false;
}

export type GcdMeetJudgment = GcdMeetWitness | GcdMeetObstruction;

/** Receipt for gcd dividing both arguments, greatestness for `d`, and Euclid recurrence. */
export function gcdMeet(a: number, b: number, d = 1): GcdMeetJudgment {
  assertNat("gcdMeet d", d);
  const value = gcd(a, b);
  const gcdDividesA = divides(value, a).divides;
  const gcdDividesB = divides(value, b).divides;
  const dDividesA = divides(d, a).divides;
  const dDividesB = divides(d, b).divides;
  const dDividesGcd = divides(d, value).divides;
  const greatestPremiseHolds = dDividesA && dDividesB;
  const recurrence = b === 0 ? true : gcd(b, a) === gcd(a % b, b);
  const holds = gcdDividesA && gcdDividesB && (!greatestPremiseHolds || dDividesGcd) && recurrence;
  if (holds) {
    return Object.freeze({
      kind: "numberTheory.gcdMeet:witness" as const,
      a,
      b,
      d,
      gcd: value,
      gcdDividesA: true as const,
      gcdDividesB: true as const,
      dDividesA,
      dDividesB,
      dDividesGcd,
      greatestPremiseHolds,
      recurrence,
      holds: true as const,
    });
  }
  return Object.freeze({
    kind: "numberTheory.gcdMeet-obstruction" as const,
    a,
    b,
    d,
    gcd: value,
    gcdDividesA,
    gcdDividesB,
    dDividesA,
    dDividesB,
    dDividesGcd,
    greatestPremiseHolds,
    recurrence,
    holds: false as const,
  });
}

/** Trial-division primality predicate for finite Nat receipts. */
export function isPrime(n: number): boolean {
  assertNat("isPrime n", n);
  if (n < 2) return false;
  for (let divisor = 2; divisor * divisor <= n; divisor += 1) {
    if (n % divisor === 0) return false;
  }
  return true;
}

export interface EuclidLemmaWitness {
  readonly kind: "numberTheory.euclidLemma:witness";
  readonly p: number;
  readonly a: number;
  readonly b: number;
  readonly product: number;
  readonly prime: true;
  readonly premiseHolds: true;
  readonly dividesLeft: boolean;
  readonly dividesRight: boolean;
  readonly conclusionHolds: true;
}

export interface EuclidLemmaObstruction {
  readonly kind: "numberTheory.euclidLemma-obstruction";
  readonly reason: "prime" | "premise" | "conclusion";
  readonly p: number;
  readonly a: number;
  readonly b: number;
  readonly product: number;
  readonly prime: boolean;
  readonly premiseHolds: boolean;
  readonly dividesLeft: boolean;
  readonly dividesRight: boolean;
  readonly conclusionHolds: boolean;
}

export type EuclidLemmaJudgment = EuclidLemmaWitness | EuclidLemmaObstruction;

/** Finite witness for Euclid's lemma: prime `p` dividing `a*b` divides `a` or `b`. */
export function euclidLemma(p: number, a: number, b: number): EuclidLemmaJudgment {
  assertNat("euclidLemma a", a);
  assertNat("euclidLemma b", b);
  const product = safeMultiply(a, b, "euclidLemma product");
  const prime = isPrime(p);
  const premiseHolds = divides(p, product).divides;
  const dividesLeft = divides(p, a).divides;
  const dividesRight = divides(p, b).divides;
  const conclusionHolds = dividesLeft || dividesRight;
  if (prime && premiseHolds && conclusionHolds) {
    return Object.freeze({ kind: "numberTheory.euclidLemma:witness" as const, p, a, b, product, prime: true as const, premiseHolds: true as const, dividesLeft, dividesRight, conclusionHolds: true as const });
  }
  return Object.freeze({
    kind: "numberTheory.euclidLemma-obstruction" as const,
    reason: !prime ? "prime" as const : !premiseHolds ? "premise" as const : "conclusion" as const,
    p,
    a,
    b,
    product,
    prime,
    premiseHolds,
    dividesLeft,
    dividesRight,
    conclusionHolds,
  });
}

/** Prime factors of `n`, with multiplicity, in nondecreasing order. */
export function primeFactors(n: number): readonly number[] {
  assertNat("primeFactors n", n);
  let rest = n;
  const factors: number[] = [];
  for (let divisor = 2; divisor * divisor <= rest; divisor += 1) {
    while (rest % divisor === 0) {
      factors.push(divisor);
      rest /= divisor;
    }
  }
  if (rest > 1) factors.push(rest);
  return Object.freeze(factors);
}

export interface PrimeFactorizationWitness {
  readonly kind: "numberTheory.primeFactorization:witness";
  readonly n: number;
  readonly factors: readonly number[];
  readonly product: number;
  readonly allPrime: true;
  readonly admissible: true;
}

export interface PrimeFactorizationObstruction {
  readonly kind: "numberTheory.primeFactorization-obstruction";
  readonly reason: "domain" | "product" | "prime";
  readonly n: number;
  readonly factors: readonly number[];
  readonly product: number;
  readonly allPrime: boolean;
  readonly admissible: boolean;
}

export type PrimeFactorizationJudgment = PrimeFactorizationWitness | PrimeFactorizationObstruction;

/** Existence half of FTA, computed for `n >= 2`. */
export function primeFactorization(n: number): PrimeFactorizationJudgment {
  const factors = primeFactors(n);
  const product = factors.reduce((value, factor) => safeMultiply(value, factor, "primeFactorization product"), 1);
  const allPrime = factors.every(isPrime);
  const admissible = n >= 2;
  if (admissible && product === n && allPrime) {
    return Object.freeze({ kind: "numberTheory.primeFactorization:witness" as const, n, factors, product, allPrime: true as const, admissible: true as const });
  }
  return Object.freeze({
    kind: "numberTheory.primeFactorization-obstruction" as const,
    reason: !admissible ? "domain" as const : product !== n ? "product" as const : "prime" as const,
    n,
    factors,
    product,
    allPrime,
    admissible,
  });
}

const productOf = (values: readonly number[], label: string): number =>
  values.reduce((product, value) => {
    assertNat(`${label} factor`, value);
    return safeMultiply(product, value, label);
  }, 1);

export interface PrimeFactorizationUniqueWitness {
  readonly kind: "numberTheory.primeFactorizationUnique:witness";
  readonly n: number;
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly leftProduct: number;
  readonly rightProduct: number;
  readonly leftAllPrime: true;
  readonly rightAllPrime: true;
  readonly permutation: true;
}

export interface PrimeFactorizationUniqueObstruction {
  readonly kind: "numberTheory.primeFactorizationUnique-obstruction";
  readonly reason: "left-product" | "right-product" | "left-prime" | "right-prime" | "permutation";
  readonly n: number;
  readonly left: readonly number[];
  readonly right: readonly number[];
  readonly leftProduct: number;
  readonly rightProduct: number;
  readonly leftAllPrime: boolean;
  readonly rightAllPrime: boolean;
  readonly permutation: boolean;
}

export type PrimeFactorizationUniqueJudgment = PrimeFactorizationUniqueWitness | PrimeFactorizationUniqueObstruction;

/** Uniqueness half of FTA: two prime factorizations of `n` are permutations. */
export function primeFactorizationUnique(n: number, left: readonly number[], right: readonly number[]): PrimeFactorizationUniqueJudgment {
  assertNat("primeFactorizationUnique n", n);
  const frozenLeft = Object.freeze([...left]);
  const frozenRight = Object.freeze([...right]);
  const leftProduct = productOf(frozenLeft, "primeFactorizationUnique left");
  const rightProduct = productOf(frozenRight, "primeFactorizationUnique right");
  const leftAllPrime = frozenLeft.every(isPrime);
  const rightAllPrime = frozenRight.every(isPrime);
  const permutation = JSON.stringify([...frozenLeft].sort((a, b) => a - b)) === JSON.stringify([...frozenRight].sort((a, b) => a - b));
  if (leftProduct === n && rightProduct === n && leftAllPrime && rightAllPrime && permutation) {
    return Object.freeze({
      kind: "numberTheory.primeFactorizationUnique:witness" as const,
      n,
      left: frozenLeft,
      right: frozenRight,
      leftProduct,
      rightProduct,
      leftAllPrime: true as const,
      rightAllPrime: true as const,
      permutation: true as const,
    });
  }
  return Object.freeze({
    kind: "numberTheory.primeFactorizationUnique-obstruction" as const,
    reason: leftProduct !== n ? "left-product" as const : rightProduct !== n ? "right-product" as const : !leftAllPrime ? "left-prime" as const : !rightAllPrime ? "right-prime" as const : "permutation" as const,
    n,
    left: frozenLeft,
    right: frozenRight,
    leftProduct,
    rightProduct,
    leftAllPrime,
    rightAllPrime,
    permutation,
  });
}

export interface ImageFactorizationWitness<T> {
  readonly kind: "numberTheory.imageFactorization:witness";
  readonly outputs: readonly T[];
  readonly image: readonly T[];
  readonly corestriction: readonly number[];
  readonly reconstructed: readonly T[];
  readonly surjectiveCorestriction: true;
  readonly injectiveInclusion: true;
  readonly factors: true;
}

export interface ImageFactorizationObstruction<T> {
  readonly kind: "numberTheory.imageFactorization-obstruction";
  readonly outputs: readonly T[];
  readonly image: readonly T[];
  readonly corestriction: readonly number[];
  readonly reconstructed: readonly T[];
  readonly surjectiveCorestriction: boolean;
  readonly injectiveInclusion: boolean;
  readonly factors: boolean;
}

export type ImageFactorizationJudgment<T> = ImageFactorizationWitness<T> | ImageFactorizationObstruction<T>;

/** Finite table form of image/epi-mono factorization for a total map `A -> B`. */
export function imageFactorization<T>(outputs: readonly T[]): ImageFactorizationJudgment<T> {
  const frozenOutputs = Object.freeze([...outputs]);
  const image: T[] = [];
  const corestriction = frozenOutputs.map((output) => {
    const existing = image.findIndex((value) => Object.is(value, output));
    if (existing >= 0) return existing;
    image.push(output);
    return image.length - 1;
  });
  const frozenImage = Object.freeze(image);
  const frozenCorestriction = Object.freeze(corestriction);
  const reconstructed = Object.freeze(frozenCorestriction.map((index) => frozenImage[index] as T));
  const surjectiveCorestriction = frozenImage.every((_, index) => frozenCorestriction.includes(index));
  const injectiveInclusion = new Set(frozenImage).size === frozenImage.length;
  const factors = frozenOutputs.length === reconstructed.length && frozenOutputs.every((output, index) => Object.is(output, reconstructed[index]));
  if (surjectiveCorestriction && injectiveInclusion && factors) {
    return Object.freeze({
      kind: "numberTheory.imageFactorization:witness" as const,
      outputs: frozenOutputs,
      image: frozenImage,
      corestriction: frozenCorestriction,
      reconstructed,
      surjectiveCorestriction: true as const,
      injectiveInclusion: true as const,
      factors: true as const,
    });
  }
  return Object.freeze({
    kind: "numberTheory.imageFactorization-obstruction" as const,
    outputs: frozenOutputs,
    image: frozenImage,
    corestriction: frozenCorestriction,
    reconstructed,
    surjectiveCorestriction,
    injectiveInclusion,
    factors,
  });
}

export interface NumberTheoryCombinatoricsReceipt {
  readonly kind: "numberTheory.combinatorics:witness";
  readonly sourceModule: "RelMath.Order.NumberTheoryCombinatorics";
  readonly theorems: readonly [
    "RelMath.NumberTheory.factorial_zero",
    "RelMath.NumberTheory.factorial_succ",
    "RelMath.NumberTheory.factorial_pos",
    "RelMath.NumberTheory.perm_zero",
    "RelMath.NumberTheory.perm_succ",
    "RelMath.NumberTheory.choose_zero_right",
    "RelMath.NumberTheory.choose_zero_succ",
    "RelMath.NumberTheory.choose_succ_succ",
    "RelMath.NumberTheory.choose_eq_zero_of_lt",
    "RelMath.NumberTheory.choose_self",
    "RelMath.NumberTheory.pascal_and_binomial_theorem",
    "RelMath.NumberTheory.gcd_prime_theory",
  ];
  readonly factorialZero: 1;
  readonly factorialSucc: true;
  readonly factorialPositive: true;
  readonly permutationStep: true;
  readonly pascal: PascalWitness;
  readonly binomial: BinomialWitness;
  readonly gcdPrime: {
    readonly meet: GcdMeetWitness;
    readonly euclid: EuclidLemmaWitness;
  };
}

export function numberTheoryCombinatoricsReceipt(): NumberTheoryCombinatoricsReceipt {
  const pascalReceipt = pascal(5, 2);
  const binomialReceipt = binomial(2, 3, 4);
  const meet = gcdMeet(84, 126, 14);
  const euclid = euclidLemma(7, 10, 21);
  if (
    pascalReceipt.kind !== "numberTheory.pascal:witness"
    || binomialReceipt.kind !== "numberTheory.binomial:witness"
    || meet.kind !== "numberTheory.gcdMeet:witness"
    || euclid.kind !== "numberTheory.euclidLemma:witness"
  ) {
    throw new TypeError("numberTheoryCombinatoricsReceipt: finite arithmetic laws failed");
  }
  return Object.freeze({
    kind: "numberTheory.combinatorics:witness" as const,
    sourceModule: "RelMath.Order.NumberTheoryCombinatorics" as const,
    theorems: Object.freeze([
      "RelMath.NumberTheory.factorial_zero",
      "RelMath.NumberTheory.factorial_succ",
      "RelMath.NumberTheory.factorial_pos",
      "RelMath.NumberTheory.perm_zero",
      "RelMath.NumberTheory.perm_succ",
      "RelMath.NumberTheory.choose_zero_right",
      "RelMath.NumberTheory.choose_zero_succ",
      "RelMath.NumberTheory.choose_succ_succ",
      "RelMath.NumberTheory.choose_eq_zero_of_lt",
      "RelMath.NumberTheory.choose_self",
      "RelMath.NumberTheory.pascal_and_binomial_theorem",
      "RelMath.NumberTheory.gcd_prime_theory",
    ]) as NumberTheoryCombinatoricsReceipt["theorems"],
    factorialZero: factorial(0) as 1,
    factorialSucc: (factorial(5) === 5 * factorial(4)) as true,
    factorialPositive: [0, 1, 2, 3, 4, 5].every((n) => factorial(n) > 0) as true,
    permutationStep: (permutationCount(5, 3) === (5 - 2) * permutationCount(5, 2)) as true,
    pascal: pascalReceipt,
    binomial: binomialReceipt,
    gcdPrime: Object.freeze({ meet, euclid }),
  });
}
