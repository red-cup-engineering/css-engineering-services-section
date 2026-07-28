/**
 * analysis/linear-algebra - finite exact matrix receipts.
 *
 * This is the executable shadow of the RelMath LinearAlgebra spine: finite
 * integer matrices, Smith factors, rank, nullity, determinant, and
 * characteristic polynomial. The abstract field/vector-space proof remains in
 * Lean; this module records the computable finite matrix evidence.
 */
import {
  charPoly,
  count,
  determinant,
  monus,
  natAdd,
  natEqual,
  rank,
  smithNormalForm,
  type Integer,
  type Matrix,
  type Natural,
} from "./exact-number.mjs";

export interface MatrixShapeCarrier {
  readonly kind: "linearAlgebra.matrix.shape";
  readonly rows: Natural;
  readonly columns: Natural;
  readonly square: boolean;
}

export interface SquareMatrixInvariantsCarrier {
  readonly kind: "linearAlgebra.matrix.squareInvariants";
  readonly matrix: Matrix;
  readonly shape: MatrixShapeCarrier;
  readonly determinant: Integer;
  readonly characteristicPolynomial: readonly Integer[];
  readonly rank: Natural;
  readonly smithNormalForm: readonly Integer[];
}

export interface RankNullityCarrier {
  readonly kind: "linearAlgebra.rankNullity";
  readonly sourceModule: "RelMath.LinearAlgebra.RankNullity";
  readonly matrix: Matrix;
  readonly shape: MatrixShapeCarrier;
  readonly rank: Natural;
  readonly nullity: Natural;
  readonly rankPlusNullity: Natural;
  readonly domainDimension: Natural;
  readonly rankNullityHolds: boolean;
  readonly smithNormalForm: readonly Integer[];
}

export type F2Vector = readonly boolean[];

export interface BoolWorkedRankNullityReceipt {
  readonly kind: "linearAlgebra.boolWorkedRankNullity.receipt:witness";
  readonly sourceModule: "RelMath.LinearAlgebra.Basic";
  readonly theorems: readonly [
    "RelMath.LinearAlgebra.dimension_well_defined",
    "RelMath.LinearAlgebra.dim_Fn",
    "RelMath.LinearAlgebra.steinitz_bound",
    "RelMath.LinearAlgebra.rank_nullity",
    "RelMath.LinearAlgebra.BoolWorked.rank_nullity_boolWorked",
  ];
  readonly domainDimension: 2;
  readonly codomainDimension: 1;
  readonly kernelBasis: readonly F2Vector[];
  readonly imageBasis: readonly F2Vector[];
  readonly kernelElements: readonly F2Vector[];
  readonly imageElements: readonly F2Vector[];
  readonly kernelBasisIndependent: true;
  readonly kernelBasisSpansKernel: true;
  readonly imageBasisIndependent: true;
  readonly imageBasisSpansImage: true;
  readonly rank: 1;
  readonly nullity: 1;
  readonly rankPlusNullity: 2;
  readonly dimensionWellDefined: true;
  readonly steinitzBoundWitnessed: true;
  readonly rankNullityHolds: true;
}

const assertRectangular = (matrix: Matrix): void => {
  if (matrix.length === 0) return;
  const columns = matrix[0]!.length;
  if (!matrix.every((row) => row.length === columns)) {
    throw new TypeError("linear algebra matrix rows must have equal length");
  }
};

/** Finite matrix shape as exact naturals. */
export function matrixShape(matrix: Matrix): MatrixShapeCarrier {
  assertRectangular(matrix);
  const rows = count(matrix);
  const columns = count(matrix[0] ?? []);
  return Object.freeze({
    kind: "linearAlgebra.matrix.shape" as const,
    rows,
    columns,
    square: natEqual(rows, columns),
  });
}

/** Square-matrix determinant, characteristic polynomial, rank, and Smith factors. */
export function squareMatrixInvariants(matrix: Matrix): SquareMatrixInvariantsCarrier {
  const shape = matrixShape(matrix);
  if (!shape.square) throw new TypeError("squareMatrixInvariants expects a square matrix");
  const smith = smithNormalForm(matrix);
  return Object.freeze({
    kind: "linearAlgebra.matrix.squareInvariants" as const,
    matrix,
    shape,
    determinant: determinant(matrix),
    characteristicPolynomial: charPoly(matrix),
    rank: rank(matrix),
    smithNormalForm: smith,
  });
}

/** Rank-nullity receipt for a finite integer matrix read as a map Z^n -> Z^m. */
export function rankNullity(matrix: Matrix): RankNullityCarrier {
  const shape = matrixShape(matrix);
  const matrixRank = rank(matrix);
  const nullity = monus(shape.columns, matrixRank);
  const rankPlusNullity = natAdd(matrixRank, nullity);
  return Object.freeze({
    kind: "linearAlgebra.rankNullity" as const,
    sourceModule: "RelMath.LinearAlgebra.RankNullity" as const,
    matrix,
    shape,
    rank: matrixRank,
    nullity,
    rankPlusNullity,
    domainDimension: shape.columns,
    rankNullityHolds: natEqual(rankPlusNullity, shape.columns),
    smithNormalForm: smithNormalForm(matrix),
  });
}

const f2Add = (left: boolean, right: boolean): boolean => left !== right;
const f2Mul = (left: boolean, right: boolean): boolean => left && right;

const sameF2Vector = (left: F2Vector, right: F2Vector): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const f2Scale = (scalar: boolean, vector: F2Vector): F2Vector =>
  Object.freeze(vector.map((value) => f2Mul(scalar, value)));

const f2LinearCombination = (coefficients: readonly boolean[], basis: readonly F2Vector[], dimension: number): F2Vector => {
  const out = Array.from({ length: dimension }, () => false);
  coefficients.forEach((coefficient, basisIndex) => {
    const vector = basis[basisIndex];
    if (vector === undefined) return;
    for (let coordinate = 0; coordinate < dimension; coordinate += 1) {
      out[coordinate] = f2Add(out[coordinate]!, f2Mul(coefficient, vector[coordinate] ?? false));
    }
  });
  return Object.freeze(out);
};

const allF2Vectors = (dimension: number): readonly F2Vector[] =>
  Object.freeze(Array.from({ length: 2 ** dimension }, (_, mask) =>
    Object.freeze(Array.from({ length: dimension }, (_ignored, index) => ((mask >> index) & 1) === 1))));

const f2Span = (basis: readonly F2Vector[], dimension: number): readonly F2Vector[] => {
  const coefficients = allF2Vectors(basis.length);
  const seen = new Map<string, F2Vector>();
  for (const row of coefficients) {
    const value = f2LinearCombination(row, basis, dimension);
    seen.set(JSON.stringify(value), value);
  }
  return Object.freeze([...seen.values()]);
};

const f2Independent = (basis: readonly F2Vector[], dimension: number): boolean =>
  allF2Vectors(basis.length).every((coefficients) => {
    if (!coefficients.some(Boolean)) return true;
    return !sameF2Vector(f2LinearCombination(coefficients, basis, dimension), f2LinearCombination([], [], dimension));
  });

/** The worked Lean map `T : F2^2 -> F2`, `T(a,b) = a + b`. */
export function boolWorkedLinearMap(vector: F2Vector): F2Vector {
  if (vector.length !== 2) throw new RangeError("boolWorkedLinearMap: expected a vector in F2^2");
  return Object.freeze([f2Add(vector[0]!, vector[1]!)]);
}

/** Finite executable carrier for `RelMath.LinearAlgebra.rank_nullity` over the worked F2 map. */
export function boolWorkedRankNullityReceipt(): BoolWorkedRankNullityReceipt {
  const zero2 = Object.freeze([false, false]) as F2Vector;
  const zero1 = Object.freeze([false]) as F2Vector;
  const kernelBasis = Object.freeze([Object.freeze([true, true]) as F2Vector]);
  const imageBasis = Object.freeze([Object.freeze([true]) as F2Vector]);
  const kernelElements = Object.freeze(allF2Vectors(2).filter((vector) => sameF2Vector(boolWorkedLinearMap(vector), zero1)));
  const imageElements = Object.freeze(allF2Vectors(2).map(boolWorkedLinearMap).filter((value, index, values) =>
    values.findIndex((candidate) => sameF2Vector(candidate, value)) === index));
  const kernelSpan = f2Span(kernelBasis, 2);
  const imageSpan = f2Span(imageBasis, 1);
  const kernelBasisIndependent = f2Independent(kernelBasis, 2);
  const imageBasisIndependent = f2Independent(imageBasis, 1);
  const kernelBasisSpansKernel = kernelElements.every((value) => kernelSpan.some((candidate) => sameF2Vector(candidate, value)));
  const imageBasisSpansImage = imageElements.every((value) => imageSpan.some((candidate) => sameF2Vector(candidate, value)));
  if (!sameF2Vector(f2Scale(false, kernelBasis[0]!), zero2) || !kernelBasisIndependent || !imageBasisIndependent || !kernelBasisSpansKernel || !imageBasisSpansImage) {
    throw new TypeError("boolWorkedRankNullityReceipt: finite F2 vector-space laws failed");
  }
  return Object.freeze({
    kind: "linearAlgebra.boolWorkedRankNullity.receipt:witness" as const,
    sourceModule: "RelMath.LinearAlgebra.Basic" as const,
    theorems: Object.freeze([
      "RelMath.LinearAlgebra.dimension_well_defined",
      "RelMath.LinearAlgebra.dim_Fn",
      "RelMath.LinearAlgebra.steinitz_bound",
      "RelMath.LinearAlgebra.rank_nullity",
      "RelMath.LinearAlgebra.BoolWorked.rank_nullity_boolWorked",
    ] as const),
    domainDimension: 2 as const,
    codomainDimension: 1 as const,
    kernelBasis,
    imageBasis,
    kernelElements,
    imageElements,
    kernelBasisIndependent: true as const,
    kernelBasisSpansKernel: true as const,
    imageBasisIndependent: true as const,
    imageBasisSpansImage: true as const,
    rank: 1 as const,
    nullity: 1 as const,
    rankPlusNullity: 2 as const,
    dimensionWellDefined: true as const,
    steinitzBoundWitnessed: true as const,
    rankNullityHolds: true as const,
  });
}
