/**
 * RMN normalizer for finite four-corner-cell receipts.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";

export const fourCornerCellReceiptTerm: Tm = tm.lam(tm.var(0));
