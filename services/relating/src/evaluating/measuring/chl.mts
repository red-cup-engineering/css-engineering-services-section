/**
 * RMN normalizer for finite Curry-Howard-Lambek quartet receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const quartetIsNuclearTerm: Tm = tm.lam(tm.var(0));
