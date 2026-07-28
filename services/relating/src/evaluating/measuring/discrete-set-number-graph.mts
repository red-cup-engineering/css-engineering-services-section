/**
 * RMN normalizers for finite discrete set/number/graph receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const powersetReceiptTerm: Tm = tm.lam(tm.var(0));
export const kuratowskiPairReceiptTerm: Tm = tm.lam(tm.var(0));
export const equivalencePartitionReceiptTerm: Tm = tm.lam(tm.var(0));
export const natSemiringReceiptTerm: Tm = tm.lam(tm.var(0));
export const successorAlgebraReceiptTerm: Tm = tm.lam(tm.var(0));
export const directedHandshakeReceiptTerm: Tm = tm.lam(tm.var(0));
export const topologicalDagReceiptTerm: Tm = tm.lam(tm.var(0));
export const treeCountReceiptTerm: Tm = tm.lam(tm.var(0));
