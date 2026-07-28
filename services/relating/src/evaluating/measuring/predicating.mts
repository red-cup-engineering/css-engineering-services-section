/**
 * evaluating/measuring/predicating — RMN normalizers for finite predication
 * fibration/Yoneda/temporal/relative-ideal witnesses.
 */
import { tm, type Tm } from "../../../lib/notating/index.mjs";
import { objectTerm, stringTerm } from "../projecting/index.mjs";

const field = (key: string): Tm => tm.field(key, tm.var(0));

/** Normalize finite Yoneda incoming-arrow recovery witnesses. */
export const yonedaRecoveryTerm: Tm = tm.lam(objectTerm([
  ["kind", stringTerm("predication.yonedaRecovery:witness")],
  ["left", field("left")],
  ["leftIncoming", field("leftIncoming")],
  ["objectRecoveredFromArrows", field("objectRecoveredFromArrows")],
  ["right", field("right")],
  ["rightIncoming", field("rightIncoming")],
  ["sameIncomingBundle", field("sameIncomingBundle")],
  ["sameObject", field("sameObject")],
]));

/** Normalize finite reindex/precomposition witnesses. */
export const reindexTerm: Tm = tm.lam(objectTerm([
  ["cellwise", field("cellwise")],
  ["embedding", field("embedding")],
  ["host", field("host")],
  ["kind", stringTerm("predication.reindex:witness")],
  ["resource", field("resource")],
]));

/** Normalize finite bilattice-homomorphic reindex witnesses. */
export const reindexBilatticeHomomorphismTerm: Tm = tm.lam(objectTerm([
  ["embedding", field("embedding")],
  ["kind", stringTerm("predication.reindexBilatticeHom:witness")],
  ["preservesFusion", field("preservesFusion")],
  ["preservesJoinK", field("preservesJoinK")],
  ["preservesJoinT", field("preservesJoinT")],
  ["preservesMeetK", field("preservesMeetK")],
  ["preservesMeetT", field("preservesMeetT")],
  ["preservesNegation", field("preservesNegation")],
  ["preservesResidual", field("preservesResidual")],
]));

/** Normalize finite Grothendieck-transpose witnesses. */
export const grothendieckTransposeTerm: Tm = tm.lam(objectTerm([
  ["compositeReindex", field("compositeReindex")],
  ["fiberUniform", field("fiberUniform")],
  ["homomorphismValued", field("homomorphismValued")],
  ["identityReindex", field("identityReindex")],
  ["kind", stringTerm("predication.grothendieckTranspose:witness")],
]));

/** Normalize finite temporal two-category witnesses. */
export const temporalTwoCategoryTerm: Tm = tm.lam(objectTerm([
  ["associativity", field("associativity")],
  ["beckChevalley", field("beckChevalley")],
  ["kind", stringTerm("predication.temporalTwoCategory:witness")],
  ["leftIdentity", field("leftIdentity")],
  ["rightIdentity", field("rightIdentity")],
  ["twoCellCategory", field("twoCellCategory")],
]));

/** Normalize finite theory-relative ideal witnesses. */
export const relativeIdealTerm: Tm = tm.lam(objectTerm([
  ["boundedByTop", field("boundedByTop")],
  ["cellwise", field("cellwise")],
  ["embedding", field("embedding")],
  ["host", field("host")],
  ["ideal", field("ideal")],
  ["isReindex", field("isReindex")],
  ["kind", stringTerm("predication.relativeIdeal:witness")],
  ["noNewContent", field("noNewContent")],
]));

/** Normalize the bundled `RelMath.Predicating.YonedaArrowsFirst` receipt. */
export const yonedaArrowsFirstReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Predicating.PredicationFibration` receipt. */
export const predicationFibrationReceiptTerm: Tm = tm.lam(tm.var(0));

/** Normalize the bundled `RelMath.Predicating.TheoryRelativeIdeal` receipt. */
export const theoryRelativeIdealReceiptTerm: Tm = tm.lam(tm.var(0));
