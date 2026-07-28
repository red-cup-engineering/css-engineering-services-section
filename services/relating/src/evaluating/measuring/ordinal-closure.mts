import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for finite/symbolic ordinal-closure receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));
