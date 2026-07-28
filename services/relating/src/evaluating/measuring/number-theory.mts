/**
 * RMN normalizers for finite RelMath.Order number-theory/factorization receipts.
 *
 * The arithmetic computation lives under `analysis.numberTheory`; these terms
 * carry the resulting witness/obstruction objects as portable RMN-normalized
 * receipts for downstream packages.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const pascalTerm: Tm = tm.lam(tm.var(0));
export const binomialTerm: Tm = tm.lam(tm.var(0));
export const gcdMeetTerm: Tm = tm.lam(tm.var(0));
export const euclidLemmaTerm: Tm = tm.lam(tm.var(0));
export const combinatoricsTerm: Tm = tm.lam(tm.var(0));
export const primeFactorizationTerm: Tm = tm.lam(tm.var(0));
export const primeFactorizationUniqueTerm: Tm = tm.lam(tm.var(0));
export const imageFactorizationTerm: Tm = tm.lam(tm.var(0));
