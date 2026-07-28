/**
 * analysis/ordinal-closure - finite/symbolic executable shadow of
 * RelMath.Closure.OrdinalCore and RelMath.Closure.Ordinal.
 *
 * The existing settling closure workbench owns the actual zero/successor/limit
 * ordinal constructors. This module packages the Lean-facing facts that are
 * runtime-checkable without pretending that arbitrary `Nat -> Ord` functions are
 * executable data: finite successor towers, named omega limits, shape-based
 * regime reads, and the old Boolean classifier as the ordinal's shadow.
 */
import {
  aperiodicClosureRegime,
  finiteClosureRegime,
  finiteOrdinal,
  finiteOrdinalJudgment,
  omegaMultipleOrdinal,
  omegaOrdinal,
  ordinalPlusFinite,
  scottClosureRegime,
  successorOrdinal,
  transfiniteClosureRegime,
  zeroOrdinal,
  type ClosureRegime,
  type Ordinal,
} from "../closure.mjs";
import {
  classifyRegime,
  type ClosureRegimeData,
} from "../value-category.mjs";
import {
  natZero,
  successor,
  type Natural,
} from "./exact-number.mjs";

export type OrdinalSummary =
  | { readonly kind: "ordinalClosure.summary.zero" }
  | { readonly kind: "ordinalClosure.summary.successor"; readonly predecessor: OrdinalSummary }
  | {
    readonly kind: "ordinalClosure.summary.limit";
    readonly name: "omega" | "omegaShift";
    readonly fundamentalPrefix: readonly OrdinalSummary[];
  };

export interface FiniteOrdinalRead {
  readonly kind: "ordinalClosure.finiteRead:witness";
  readonly stage: number;
  readonly ordinal: OrdinalSummary;
  readonly isFinite: true;
  readonly finiteWitnessValue: number;
  readonly regime: typeof finiteClosureRegime;
  readonly belowOmega: true;
  readonly monotoneBelowNext: true;
}

export interface NamedLimitRead {
  readonly kind: "ordinalClosure.namedLimit:witness";
  readonly name: "omega" | "omegaShift";
  readonly ordinal: OrdinalSummary;
  readonly isFinite: false;
  readonly prefixBelowLimit: true;
  readonly regimeWhenScott: ClosureRegime;
  readonly regimeWhenNonScottCountable: ClosureRegime;
  readonly regimeWhenNonScottUncountable: ClosureRegime;
}

export interface ClassifierShadowRead {
  readonly kind: "ordinalClosure.classifierShadow:witness";
  readonly data: ClosureRegimeData;
  readonly ordinalIsFinite: boolean;
  readonly finiteFlagMatchesOrdinal: true;
  readonly regimeOfOrdinal: ClosureRegime;
  readonly classifiedRegime: ClosureRegime;
  readonly matches: true;
}

export interface OrdinalClosureReceipt {
  readonly kind: "ordinalClosure.receipt:witness";
  readonly finite: FiniteOrdinalRead;
  readonly omega: NamedLimitRead;
  readonly omegaShift: NamedLimitRead;
  readonly classifierShadow: ClassifierShadowRead;
  readonly limitLubBoundary: "named-fundamental-sequence-prefix";
  readonly arbitraryLimitBoundary: "proof-side Nat -> Ord functions";
}

const naturalFromNumber = (value: number): Natural => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("ordinalClosure: natural inputs must be non-negative safe integers");
  }
  let out = natZero;
  for (let index = 0; index < value; index += 1) out = successor(out);
  return out;
};

const naturalToNumber = (value: Natural): number => value.members.length;

export function ofNat(stage: number): Ordinal {
  return finiteOrdinal(naturalFromNumber(stage));
}

function finiteSummary(stage: number): OrdinalSummary {
  let out: OrdinalSummary = Object.freeze({ kind: "ordinalClosure.summary.zero" as const });
  for (let index = 0; index < stage; index += 1) {
    out = Object.freeze({ kind: "ordinalClosure.summary.successor" as const, predecessor: out });
  }
  return out;
}

const omegaSummary = (prefixLength: number): OrdinalSummary => Object.freeze({
  kind: "ordinalClosure.summary.limit" as const,
  name: "omega" as const,
  fundamentalPrefix: Object.freeze(Array.from({ length: prefixLength }, (_item, index) => finiteSummary(index))),
});

const omegaShiftSummary = (prefixLength: number): OrdinalSummary => Object.freeze({
  kind: "ordinalClosure.summary.limit" as const,
  name: "omegaShift" as const,
  fundamentalPrefix: Object.freeze(Array.from({ length: prefixLength }, (_item, index) => {
    let out = omegaSummary(3);
    for (let step = 0; step < index; step += 1) {
      out = Object.freeze({ kind: "ordinalClosure.summary.successor" as const, predecessor: out });
    }
    return out;
  })),
});

export function isFiniteOrdinal(ordinal: Ordinal): boolean {
  return finiteOrdinalJudgment(ordinal).kind === "ordinal.closure.finiteOrdinal:witness";
}

function regimeOfOrdinalShape(ordinalFinite: boolean, scottContinuous: boolean, countableCofinality: boolean): ClosureRegime {
  if (ordinalFinite) return finiteClosureRegime;
  if (scottContinuous) return scottClosureRegime;
  if (countableCofinality) return transfiniteClosureRegime;
  return aperiodicClosureRegime;
}

export function regimeOfOrdinal(ordinal: Ordinal, scottContinuous: boolean, countableCofinality: boolean): ClosureRegime {
  return regimeOfOrdinalShape(isFiniteOrdinal(ordinal), scottContinuous, countableCofinality);
}

export function finiteRead(stage: number): FiniteOrdinalRead {
  const ordinal = ofNat(stage);
  const finite = finiteOrdinalJudgment(ordinal);
  if (finite.kind !== "ordinal.closure.finiteOrdinal:witness") {
    throw new TypeError("finiteRead: ofNat did not produce a finite ordinal");
  }
  const nextFinite = finiteOrdinalJudgment(successorOrdinal(ordinal));
  const belowOmega = isFiniteOrdinal(ordinal) && !isFiniteOrdinal(omegaOrdinal());
  if (nextFinite.kind !== "ordinal.closure.finiteOrdinal:witness" || !belowOmega) {
    throw new TypeError("finiteRead: finite ordinal monotonicity check failed");
  }
  return Object.freeze({
    kind: "ordinalClosure.finiteRead:witness" as const,
    stage,
    ordinal: finiteSummary(stage),
    isFinite: true as const,
    finiteWitnessValue: naturalToNumber(finite.value),
    regime: finiteClosureRegime,
    belowOmega: true as const,
    monotoneBelowNext: true as const,
  });
}

export function namedLimitRead(name: "omega" | "omegaShift", prefixLength = 4): NamedLimitRead {
  const ordinal = name === "omega"
    ? omegaOrdinal()
    : omegaMultipleOrdinal(successor(successor(natZero)));
  const prefixOrdinals = Array.from({ length: prefixLength }, (_item, index) => {
    const n = naturalFromNumber(index);
    return name === "omega" ? finiteOrdinal(n) : ordinalPlusFinite(omegaOrdinal(), n);
  });
  const prefixBelowLimit = prefixOrdinals.every((prefix) => name === "omega"
    ? isFiniteOrdinal(prefix) && !isFiniteOrdinal(ordinal)
    : !isFiniteOrdinal(ordinal));
  if (isFiniteOrdinal(ordinal) || !prefixBelowLimit) {
    throw new TypeError("namedLimitRead: named limit failed finite-prefix check");
  }
  return Object.freeze({
    kind: "ordinalClosure.namedLimit:witness" as const,
    name,
    ordinal: name === "omega" ? omegaSummary(prefixLength) : omegaShiftSummary(prefixLength),
    isFinite: false as const,
    prefixBelowLimit: true as const,
    regimeWhenScott: regimeOfOrdinal(ordinal, true, true),
    regimeWhenNonScottCountable: regimeOfOrdinal(ordinal, false, true),
    regimeWhenNonScottUncountable: regimeOfOrdinal(ordinal, false, false),
  });
}

export function classifierShadow(data: ClosureRegimeData, ordinal: Ordinal): ClassifierShadowRead {
  const ordinalIsFinite = isFiniteOrdinal(ordinal);
  if (ordinalIsFinite !== data.finiteBase) {
    throw new TypeError("classifierShadow: ordinal finiteness must match the finiteBase flag");
  }
  const regime = regimeOfOrdinal(ordinal, data.scottContinuous, data.countableCofinality);
  const classified = classifyRegime(data);
  if (regime.kind !== classified.kind) {
    throw new TypeError("classifierShadow: ordinal regime disagrees with Boolean classifier");
  }
  return Object.freeze({
    kind: "ordinalClosure.classifierShadow:witness" as const,
    data,
    ordinalIsFinite,
    finiteFlagMatchesOrdinal: true as const,
    regimeOfOrdinal: regime,
    classifiedRegime: classified,
    matches: true as const,
  });
}

export function receipt(stage = 3): OrdinalClosureReceipt {
  const finite = finiteRead(stage);
  const data: ClosureRegimeData = Object.freeze({
    kind: "settling.closureRegimeData" as const,
    scottContinuous: true,
    finiteBase: true,
    countableCofinality: true,
  });
  return Object.freeze({
    kind: "ordinalClosure.receipt:witness" as const,
    finite,
    omega: namedLimitRead("omega"),
    omegaShift: namedLimitRead("omegaShift"),
    classifierShadow: classifierShadow(data, ofNat(stage)),
    limitLubBoundary: "named-fundamental-sequence-prefix" as const,
    arbitraryLimitBoundary: "proof-side Nat -> Ord functions" as const,
  });
}
