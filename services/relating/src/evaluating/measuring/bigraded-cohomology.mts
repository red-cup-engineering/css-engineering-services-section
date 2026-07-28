import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** RMN normalizer for finite bigraded-cohomology gauge receipts. */
export const receiptTerm: Tm = tm.lam(tm.var(0));

/** RMN normalizer for the finite truth-knowledge degree-0 LES decomposition. */
export const truthKnowledgeSectionDecompositionTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Positing.LocalMldClassification` receipt. */
export const localMldClassificationTerm: Tm = tm.lam(tm.var(0));
