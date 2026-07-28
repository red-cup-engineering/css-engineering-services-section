import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for finite verification-tournament certificate receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
