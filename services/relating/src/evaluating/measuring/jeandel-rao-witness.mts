import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for finite Jeandel-Rao AP cohomology witness receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for the transcribed marker-domino pullback receipt. */
export const substitutionPullbackTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for the finite substitution-tower persistence receipt. */
export const substitutionTowerTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for the finite Jeandel-Rao persistence reduction receipt. */
export const persistenceTerm: Tm = tm.lam(tm.var(0));
