import { tm, type Tm } from "../../../lib/notating/index.mjs";

/** Identity normalizer for finite pointwise closure-family receipts. */
export const pointwiseClosureFamilyReceiptTerm: Tm = tm.lam(tm.var(0));

/** Identity normalizer for finite cosettling receipts. */
export const cosettlingReceiptTerm: Tm = tm.lam(tm.var(0));

/** Identity normalizer for finite closure-monad receipts. */
export const closureMonadReceiptTerm: Tm = tm.lam(tm.var(0));

/** Identity normalizer for finite closure-2-monad KZ receipts. */
export const closure2MonadKzReceiptTerm: Tm = tm.lam(tm.var(0));
