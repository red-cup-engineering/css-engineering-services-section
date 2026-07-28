import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for the finite coordination-cohomology receipt. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for the finite Landauer-as-H1 entropy receipt. */
export const landauerEntropyTerm: Tm = tm.lam(tm.var(0));
