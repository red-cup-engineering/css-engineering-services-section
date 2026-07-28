import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for the finite CRDT/CALM convergence receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
