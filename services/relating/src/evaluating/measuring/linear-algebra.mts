/**
 * evaluating/measuring/linear-algebra - RMN normalizers for finite exact
 * matrix receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize finite matrix-shape carriers. */
export const matrixShapeTerm: Tm = tm.lam(objectTerm([
  ["columns", field("columns")],
  ["kind", stringTerm("linearAlgebra.matrix.shape")],
  ["rows", field("rows")],
  ["square", field("square")],
]));

/** Normalize square-matrix determinant/rank/Smith/characteristic receipts. */
export const squareMatrixInvariantsTerm: Tm = tm.lam(objectTerm([
  ["characteristicPolynomial", field("characteristicPolynomial")],
  ["determinant", field("determinant")],
  ["kind", stringTerm("linearAlgebra.matrix.squareInvariants")],
  ["matrix", field("matrix")],
  ["rank", field("rank")],
  ["shape", field("shape")],
  ["smithNormalForm", field("smithNormalForm")],
]));

/** Normalize finite rank-nullity receipts. */
export const rankNullityTerm: Tm = tm.lam(objectTerm([
  ["domainDimension", field("domainDimension")],
  ["kind", stringTerm("linearAlgebra.rankNullity")],
  ["matrix", field("matrix")],
  ["nullity", field("nullity")],
  ["rank", field("rank")],
  ["rankNullityHolds", field("rankNullityHolds")],
  ["rankPlusNullity", field("rankPlusNullity")],
  ["shape", field("shape")],
  ["smithNormalForm", field("smithNormalForm")],
  ["sourceModule", field("sourceModule")],
]));

/** Normalize the finite Boolean-field vector-space rank-nullity receipt. */
export const boolWorkedRankNullityTerm: Tm = tm.lam(tm.var(0));
