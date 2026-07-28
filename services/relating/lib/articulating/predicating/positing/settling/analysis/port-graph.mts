/**
 * analysis/port-graph - finite lenticule port-graph and condensate receipts.
 *
 * Executable shadow of RelMath.Aperiodic.PortGraph and
 * RelMath.Aperiodic.CondensateMatter: a legal one-hole pass alternates sides,
 * occupancy 0/1/2+ reads as FOUR bottom/truth/top, and material rigidity is the
 * count of over-occupied condensed lenticules.
 */
import {
  chargeValue,
  negateValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  fromInts,
  intAdd,
  matEqual,
  matmul,
  toInt,
  type Matrix,
} from "./exact-number.mjs";

export interface ThreadPassCarrier {
  readonly kind: "aperiodic.portGraph.threadPass";
  readonly lenticule: string;
  readonly inSide: boolean;
  readonly outSide: boolean;
}

export interface PortGraphReceipt {
  readonly kind: "aperiodic.portGraph.receipt:witness";
  readonly thread: readonly ThreadPassCarrier[];
  readonly legal: boolean;
  readonly holeTransitionEqualsWarpAlt: true;
  readonly legalIffDistinct: true;
  readonly threadLegalNil: true;
  readonly condensateZero: "absurd";
  readonly condensateOne: "potential";
  readonly condensateOver: "stable";
  readonly emptyConsistent: true;
  readonly singleConsistent: true;
  readonly overOccupationInconsistency: true;
  readonly mirrorFixesEmpty: true;
  readonly mirrorFixesCondensatePole: true;
  readonly mirrorFixesCondensate: true;
}

export interface CondensateMatterReceipt {
  readonly kind: "aperiodic.condensateMatter.receipt:witness";
  readonly material: readonly number[];
  readonly rigidity: number;
  readonly overOccupied: readonly number[];
  readonly condensateInconsistencyIff: true;
  readonly rigidIffOveroccupied: true;
  readonly floppyOfAllLeOne: boolean;
}

export interface PortGrowthReceipt {
  readonly kind: "aperiodic.portGrowth.receipt:witness";
  readonly matrix: Matrix;
  readonly a: number;
  readonly b: number;
  readonly growthA: Matrix;
  readonly growthB: Matrix;
  readonly growthSum: Matrix;
  readonly composed: Matrix;
  readonly portGrowthZero: true;
  readonly portGrowthSucc: true;
  readonly matPowAdd: true;
  readonly portGrowthTelescopes: true;
  readonly padovanMatrix: Matrix;
  readonly padovanGrowth3: Matrix;
  readonly padovanRenormalized: Matrix;
  readonly portGrowthRenormPadovan: true;
  readonly padovanChuIncidence: readonly (readonly ChargeValueName[])[];
  readonly portGrowthEdgesChu: true;
}

export interface PortGrowthTimeReceipt {
  readonly kind: "aperiodic.portGrowthTime.receipt:witness";
  readonly levels: readonly number[];
  readonly timeSection: Readonly<Record<string, number>>;
  readonly levelPrecTransitive: true;
  readonly levelPrecIrreflexive: true;
  readonly portGrowthTimeStrictMono: true;
  readonly chainTimeSectionEqLevel: true;
}

export interface PortVershikReceipt {
  readonly kind: "aperiodic.portVershik.receipt:witness";
  readonly path: readonly boolean[];
  readonly successor: readonly boolean[];
  readonly serialIndex: number;
  readonly successorIndex: number;
  readonly successorIncrements: boolean;
  readonly lengthPreserved: true;
  readonly vershikSuccWhenNotMaximal: true;
  readonly maximalWraps: true;
  readonly twoCycle: true;
}

export function threadPass(lenticule: string, inSide: boolean, outSide: boolean): ThreadPassCarrier {
  return Object.freeze({
    kind: "aperiodic.portGraph.threadPass" as const,
    lenticule,
    inSide,
    outSide,
  });
}

function assertBoolPath(path: readonly boolean[], caller: string): void {
  if (!path.every((bit) => typeof bit === "boolean")) throw new TypeError(`${caller}: path must contain booleans`);
}

export function vershik(path: readonly boolean[]): readonly boolean[] {
  assertBoolPath(path, "vershik");
  if (path.length === 0) return Object.freeze([]);
  const [head, ...rest] = path;
  if (!head) return Object.freeze([true, ...rest]);
  return Object.freeze([false, ...vershik(rest)]);
}

export function vershikToNat(path: readonly boolean[]): number {
  assertBoolPath(path, "vershikToNat");
  if (path.length > 52) throw new RangeError("vershikToNat: path is too long for a safe JavaScript integer");
  return path.reduce((total, bit, index) => total + (bit ? 2 ** index : 0), 0);
}

function boolPaths(length: number): readonly (readonly boolean[])[] {
  if (length === 0) return Object.freeze([Object.freeze([])]);
  const tails = boolPaths(length - 1);
  return Object.freeze(tails.flatMap((tail) => [
    Object.freeze([false, ...tail]),
    Object.freeze([true, ...tail]),
  ]));
}

function iterateVershik(path: readonly boolean[], count: number): readonly boolean[] {
  let current = path;
  for (let index = 0; index < count; index += 1) current = vershik(current);
  return current;
}

const pathEquals = (left: readonly boolean[], right: readonly boolean[]): boolean =>
  left.length === right.length && left.every((bit, index) => bit === right[index]);

export function portVershikReceipt(path: readonly boolean[] = [false, false]): PortVershikReceipt {
  assertBoolPath(path, "portVershikReceipt");
  const successor = vershik(path);
  const serialIndex = vershikToNat(path);
  const successorIndex = vershikToNat(successor);
  const lengthPreserved = path.length === successor.length;
  const successorIncrements = !path.includes(false) || successorIndex === serialIndex + 1;
  const succWhenNotMaximal = [0, 1, 2, 3, 4, 5].every((length) =>
    boolPaths(length).every((candidate) => !candidate.includes(false) ||
      vershikToNat(vershik(candidate)) === vershikToNat(candidate) + 1));
  const maximalWraps = [0, 1, 2, 3, 4, 5].every((length) =>
    pathEquals(vershik(Array.from({ length }, () => true)), Array.from({ length }, () => false)));
  const twoCycle = boolPairs.every((candidate) => pathEquals(iterateVershik(candidate, 4), candidate));
  if (!lengthPreserved || !successorIncrements || !succWhenNotMaximal || !maximalWraps || !twoCycle) {
    throw new TypeError("portVershikReceipt: finite Vershik laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.portVershik.receipt:witness" as const,
    path: Object.freeze([...path]),
    successor,
    serialIndex,
    successorIndex,
    successorIncrements,
    lengthPreserved: true as const,
    vershikSuccWhenNotMaximal: true as const,
    maximalWraps: true as const,
    twoCycle: true as const,
  });
}

export const warpAlt = (left: boolean, right: boolean): boolean => left !== right;
export const holeTransition = (inSide: boolean, outSide: boolean): boolean => warpAlt(inSide, outSide);
export const legalThreadPass = (pass: ThreadPassCarrier): boolean => holeTransition(pass.inSide, pass.outSide);
export const threadLegal = (thread: readonly ThreadPassCarrier[]): boolean => thread.every(legalThreadPass);

export function condensate(occupation: number): ChargeValueName {
  if (!Number.isSafeInteger(occupation) || occupation < 0) {
    throw new RangeError("condensate: occupation must be a natural number");
  }
  if (occupation === 0) return "absurd";
  if (occupation === 1) return "potential";
  return "stable";
}

export const condensateInconsistency = (occupation: number): boolean => condensate(occupation) === "stable";

const boolPairs: readonly (readonly [boolean, boolean])[] = Object.freeze([
  Object.freeze([false, false] as const),
  Object.freeze([false, true] as const),
  Object.freeze([true, false] as const),
  Object.freeze([true, true] as const),
]);

export function portGraphReceipt(thread: readonly ThreadPassCarrier[] = []): PortGraphReceipt {
  const legalIffDistinct = boolPairs.every(([i, j]) => legalThreadPass(threadPass("law", i, j)) === (i !== j));
  const mirrorFixesEmpty = negateValue(chargeValue(condensate(0))).name === condensate(0);
  const mirrorFixesCondensatePole = [2, 3, 4].every((n) => negateValue(chargeValue(condensate(n))).name === condensate(n));
  const mirrorFixesCondensate = [0, 1, 2, 3, 4].every((n) =>
    condensateInconsistencyForCharge(negateValue(chargeValue(condensate(n))).name) === condensateInconsistency(n),
  );
  if (!legalIffDistinct || !threadLegal([]) || !mirrorFixesEmpty || !mirrorFixesCondensatePole || !mirrorFixesCondensate) {
    throw new TypeError("portGraphReceipt: finite port-graph laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.portGraph.receipt:witness" as const,
    thread: Object.freeze([...thread]),
    legal: threadLegal(thread),
    holeTransitionEqualsWarpAlt: true as const,
    legalIffDistinct: true as const,
    threadLegalNil: true as const,
    condensateZero: condensate(0) as "absurd",
    condensateOne: condensate(1) as "potential",
    condensateOver: condensate(2) as "stable",
    emptyConsistent: !condensateInconsistency(0) as true,
    singleConsistent: !condensateInconsistency(1) as true,
    overOccupationInconsistency: condensateInconsistency(2) as true,
    mirrorFixesEmpty: true as const,
    mirrorFixesCondensatePole: true as const,
    mirrorFixesCondensate: true as const,
  });
}

function condensateInconsistencyForCharge(value: ChargeValueName): boolean {
  return value === "stable";
}

export function rigidity(material: readonly number[]): number {
  return material.filter(condensateInconsistency).length;
}

export function condensateMatterReceipt(material: readonly number[]): CondensateMatterReceipt {
  for (const occupation of material) condensate(occupation);
  const overOccupied = Object.freeze(material.filter((occupation) => occupation >= 2));
  const finiteCheck = material.every((occupation) => condensateInconsistency(occupation) === (occupation >= 2));
  const materialRigidity = rigidity(material);
  const rigidIffOveroccupied = (materialRigidity > 0) === (overOccupied.length > 0);
  const allLeOne = material.every((occupation) => occupation <= 1);
  const floppyOfAllLeOne = !allLeOne || materialRigidity === 0;
  if (!finiteCheck || !rigidIffOveroccupied || !floppyOfAllLeOne) {
    throw new TypeError("condensateMatterReceipt: finite condensate matter laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.condensateMatter.receipt:witness" as const,
    material: Object.freeze([...material]),
    rigidity: materialRigidity,
    overOccupied,
    condensateInconsistencyIff: true as const,
    rigidIffOveroccupied: true as const,
    floppyOfAllLeOne,
  });
}

function assertSquareMatrix(matrix: Matrix, caller: string): void {
  if (matrix.length === 0) throw new TypeError(`${caller}: matrix must be non-empty`);
  const columns = matrix[0]!.length;
  if (columns !== matrix.length || matrix.some((row) => row.length !== columns)) {
    throw new TypeError(`${caller}: expected a square matrix`);
  }
}

export function matrixIdentity(size: number): Matrix {
  if (!Number.isSafeInteger(size) || size < 1) throw new RangeError("matrixIdentity: size must be a positive integer");
  return fromInts(Array.from({ length: size }, (_, row) => Array.from({ length: size }, (__, column) => row === column ? 1 : 0)));
}

export function matrixAdd(left: Matrix, right: Matrix): Matrix {
  if (left.length !== right.length || left.some((row, index) => row.length !== right[index]!.length)) {
    throw new TypeError("matrixAdd: matrices must have the same shape");
  }
  return Object.freeze(left.map((row, rowIndex) =>
    Object.freeze(row.map((value, columnIndex) => intAdd(value, right[rowIndex]![columnIndex]!)))));
}

export function matrixPower(matrix: Matrix, exponent: number): Matrix {
  assertSquareMatrix(matrix, "matrixPower");
  if (!Number.isSafeInteger(exponent) || exponent < 0) throw new RangeError("matrixPower: exponent must be a natural number");
  let result = matrixIdentity(matrix.length);
  for (let index = 0; index < exponent; index += 1) result = matmul(result, matrix);
  return result;
}

export const portGrowth = matrixPower;

export function substitutionMatrix(substitution: readonly (readonly number[])[], alphabetSize = substitution.length): Matrix {
  if (!Number.isSafeInteger(alphabetSize) || alphabetSize < 1) throw new RangeError("substitutionMatrix: alphabet size must be positive");
  const rows = substitution.map((word) =>
    Array.from({ length: alphabetSize }, (_, letter) => word.filter((item) => item === letter).length));
  return fromInts(rows);
}

export const padovanSubstitution: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([1]),
  Object.freeze([2]),
  Object.freeze([0, 1]),
] as const);

export const fibonacciSubstitution: readonly (readonly number[])[] = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([0]),
] as const);

export const padovanMatrix: Matrix = substitutionMatrix(padovanSubstitution, 3);
export const fibonacciMatrix: Matrix = substitutionMatrix(fibonacciSubstitution, 2);

const matrixPositiveIncidence = (matrix: Matrix): readonly (readonly ChargeValueName[])[] =>
  Object.freeze(matrix.map((row) => Object.freeze(row.map((value) => toInt(value) > 0 ? "potential" as const : "absurd" as const))));

export function portGrowthReceipt(matrix: Matrix = padovanMatrix, a = 1, b = 2): PortGrowthReceipt {
  assertSquareMatrix(matrix, "portGrowthReceipt");
  if (!Number.isSafeInteger(a) || a < 0 || !Number.isSafeInteger(b) || b < 0) {
    throw new RangeError("portGrowthReceipt: a and b must be natural numbers");
  }
  const growthA = portGrowth(matrix, a);
  const growthB = portGrowth(matrix, b);
  const growthSum = portGrowth(matrix, a + b);
  const composed = matmul(growthA, growthB);
  const portGrowthZero = matEqual(portGrowth(matrix, 0), matrixIdentity(matrix.length));
  const portGrowthSucc = matEqual(portGrowth(matrix, a + 1), matmul(portGrowth(matrix, a), matrix));
  const telescopes = matEqual(growthSum, composed);
  const padovanGrowth3 = portGrowth(padovanMatrix, 3);
  const padovanRenormalized = matrixAdd(padovanMatrix, matrixIdentity(3));
  const padovanCubic = matEqual(padovanGrowth3, padovanRenormalized);
  const padovanIncidence = matrixPositiveIncidence(padovanMatrix);
  const edgesChu = padovanMatrix.every((row, rowIndex) => row.every((value, columnIndex) =>
    toInt(value) === (padovanIncidence[rowIndex]![columnIndex] === "potential" ? 1 : 0),
  ));
  if (!portGrowthZero || !portGrowthSucc || !telescopes || !padovanCubic || !edgesChu) {
    throw new TypeError("portGrowthReceipt: finite port-growth laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.portGrowth.receipt:witness" as const,
    matrix,
    a,
    b,
    growthA,
    growthB,
    growthSum,
    composed,
    portGrowthZero: true as const,
    portGrowthSucc: true as const,
    matPowAdd: true as const,
    portGrowthTelescopes: true as const,
    padovanMatrix,
    padovanGrowth3,
    padovanRenormalized,
    portGrowthRenormPadovan: true as const,
    padovanChuIncidence: padovanIncidence,
    portGrowthEdgesChu: true as const,
  });
}

export const levelPrec = (a: number, b: number): boolean => a < b;

export function timeSection(levels: readonly number[], level: number): number {
  return levels.filter((candidate) => levelPrec(candidate, level)).length;
}

export function portGrowthTimeReceipt(levels: readonly number[] = [0, 1, 2, 3]): PortGrowthTimeReceipt {
  if (!levels.every((level) => Number.isSafeInteger(level) && level >= 0)) {
    throw new RangeError("portGrowthTimeReceipt: levels must be natural numbers");
  }
  const uniqueLevels = Object.freeze([...new Set(levels)].sort((a, b) => a - b));
  const transitive = uniqueLevels.every((a) => uniqueLevels.every((b) => uniqueLevels.every((c) =>
    !(levelPrec(a, b) && levelPrec(b, c)) || levelPrec(a, c),
  )));
  const irreflexive = uniqueLevels.every((level) => !levelPrec(level, level));
  const strictMono = uniqueLevels.every((x) => uniqueLevels.every((y) =>
    !levelPrec(x, y) || timeSection(uniqueLevels, x) < timeSection(uniqueLevels, y),
  ));
  const chain = [0, 1, 2, 3] as const;
  const chainTime = chain.every((level) => timeSection(chain, level) === level);
  if (!transitive || !irreflexive || !strictMono || !chainTime) {
    throw new TypeError("portGrowthTimeReceipt: finite port-growth time laws failed");
  }
  return Object.freeze({
    kind: "aperiodic.portGrowthTime.receipt:witness" as const,
    levels: uniqueLevels,
    timeSection: Object.freeze(Object.fromEntries(uniqueLevels.map((level) => [String(level), timeSection(uniqueLevels, level)]))),
    levelPrecTransitive: true as const,
    levelPrecIrreflexive: true as const,
    portGrowthTimeStrictMono: true as const,
    chainTimeSectionEqLevel: true as const,
  });
}
