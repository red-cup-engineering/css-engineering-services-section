import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for the finite d-frame receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
