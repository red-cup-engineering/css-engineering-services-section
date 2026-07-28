/**
 * analysis/fca-lambek-circle - finite receipts for RelMath.Order.FCALambekCircle.
 *
 * This surface closes the executable part of the FCA -> Lambek ->
 * residuated-lattice -> settling-closure circle over finite carriers. The Wurm /
 * Pentus model-theoretic completeness edge remains a documented boundary.
 */
import {
  finiteLambekAlgebraSystem,
  laws as lambekLaws,
  type LambekLawsObstruction,
  type LambekLawsWitness,
} from "./lambek-calculus.mjs";
import {
  laws as residuatedLatticeLaws,
  type FiniteResiduatedLatticeSystem,
  type ResiduatedLatticeObstruction,
} from "./residuated-lattice.mjs";

const MAX_CONTEXT_SIZE = 16;

const uniq = (values: readonly string[]): readonly string[] => Object.freeze([...new Set(values)]);

const sameSet = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
};

const subsetOf = (left: readonly string[], right: readonly string[]): boolean => {
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
};

const intersection = (left: readonly string[], right: readonly string[]): readonly string[] => {
  const rightSet = new Set(right);
  return Object.freeze(left.filter((value) => rightSet.has(value)));
};

const union = (left: readonly string[], right: readonly string[]): readonly string[] =>
  uniq([...left, ...right]);

const subsets = (carrier: readonly string[]): readonly (readonly string[])[] => {
  if (carrier.length > MAX_CONTEXT_SIZE) {
    throw new RangeError(`fcaLambek: finite context carrier exceeds max size ${MAX_CONTEXT_SIZE}`);
  }
  const count = 2 ** carrier.length;
  return Object.freeze(Array.from({ length: count }, (_, mask) =>
    Object.freeze(carrier.filter((_, index) => (mask & (1 << index)) !== 0)),
  ));
};

export interface FcaContextCell {
  readonly subject: string;
  readonly predicate: string;
}

export interface FiniteFcaContext {
  readonly kind: "fcaLambek.finiteContext";
  readonly cells: readonly FcaContextCell[];
  readonly subjects: readonly string[];
  readonly predicates: readonly string[];
}

export function finiteFcaContext(cells: readonly FcaContextCell[]): FiniteFcaContext {
  if (cells.length === 0) throw new RangeError("finiteFcaContext: context must have at least one incidence cell");
  cells.forEach((cell, index) => {
    if (cell.subject.length === 0) throw new RangeError(`finiteFcaContext.cells[${index}].subject must be nonempty`);
    if (cell.predicate.length === 0) throw new RangeError(`finiteFcaContext.cells[${index}].predicate must be nonempty`);
  });
  const frozenCells = Object.freeze(cells.map((cell) => Object.freeze({
    subject: cell.subject,
    predicate: cell.predicate,
  })));
  return Object.freeze({
    kind: "fcaLambek.finiteContext" as const,
    cells: frozenCells,
    subjects: uniq(frozenCells.map((cell) => cell.subject)),
    predicates: uniq(frozenCells.map((cell) => cell.predicate)),
  });
}

const hasIncidence = (context: FiniteFcaContext, subject: string, predicate: string): boolean =>
  context.cells.some((cell) => cell.subject === subject && cell.predicate === predicate);

export const intentOfExtent = (context: FiniteFcaContext, extent: readonly string[]): readonly string[] =>
  Object.freeze(context.predicates.filter((predicate) =>
    extent.every((subject) => hasIncidence(context, subject, predicate)),
  ));

export const extentOfIntent = (context: FiniteFcaContext, intent: readonly string[]): readonly string[] =>
  Object.freeze(context.subjects.filter((subject) =>
    intent.every((predicate) => hasIncidence(context, subject, predicate)),
  ));

export const closeExtent = (context: FiniteFcaContext, extent: readonly string[]): readonly string[] =>
  extentOfIntent(context, intentOfExtent(context, extent));

export const closeIntent = (context: FiniteFcaContext, intent: readonly string[]): readonly string[] =>
  intentOfExtent(context, extentOfIntent(context, intent));

export interface FormalConceptAnalysisReceipt {
  readonly kind: "fca.formalConceptAnalysis.receipt:witness";
  readonly sourceModule: "RelMath.Order.FormalConceptAnalysis";
  readonly theorems: readonly [
    "RelMath.FCA.prime_adjunction",
    "RelMath.FCA.primeA_antitone",
    "RelMath.FCA.primeB_antitone",
    "RelMath.FCA.subA_closeA",
    "RelMath.FCA.primeA_closeA",
    "RelMath.FCA.closeA_mono",
    "RelMath.FCA.closeA_idem",
    "RelMath.FCA.derivation_galois_connection",
    "RelMath.FCA.Concept.extent_closed",
    "RelMath.FCA.familyMeet_le",
    "RelMath.FCA.familyJoin_ge",
    "RelMath.FCA.implies_iff_closeM",
    "RelMath.FCA.conceptLatticeData",
  ];
  readonly contextSubjects: readonly string[];
  readonly contextPredicates: readonly string[];
  readonly sampleExtent: readonly string[];
  readonly sampleIntent: readonly string[];
  readonly sampleClosedExtent: readonly string[];
  readonly closedExtents: readonly (readonly string[])[];
  readonly primeAdjunction: true;
  readonly primeAAntitone: true;
  readonly primeBAntitone: true;
  readonly closeAExtensive: true;
  readonly primeACancelsClosure: true;
  readonly closeAMonotone: true;
  readonly closeAIdempotent: true;
  readonly conceptExtentsClosed: true;
  readonly conceptMeetClosed: true;
  readonly conceptJoinClosed: true;
  readonly implicationCharacterization: true;
}

/** Finite receipt for the Boolean derivation/Galois core of `RelMath.FCA`. */
export function formalConceptAnalysisReceipt(
  context: FiniteFcaContext = workedContext,
  sampleExtent: readonly string[] = ["a", "b"],
): FormalConceptAnalysisReceipt {
  const allExtents = subsets(context.subjects);
  const allIntents = subsets(context.predicates);
  const normalizedSample = intersection(context.subjects, sampleExtent);
  const sampleIntent = intentOfExtent(context, normalizedSample);
  const sampleClosedExtent = closeExtent(context, normalizedSample);

  const primeAdjunction = allExtents.every((extent) => allIntents.every((intent) =>
    subsetOf(extent, extentOfIntent(context, intent)) === subsetOf(intent, intentOfExtent(context, extent))));
  const primeAAntitone = allExtents.every((left) => allExtents.every((right) =>
    !subsetOf(left, right) || subsetOf(intentOfExtent(context, right), intentOfExtent(context, left))));
  const primeBAntitone = allIntents.every((left) => allIntents.every((right) =>
    !subsetOf(left, right) || subsetOf(extentOfIntent(context, right), extentOfIntent(context, left))));
  const closeAExtensive = allExtents.every((extent) => subsetOf(extent, closeExtent(context, extent)));
  const primeACancelsClosure = allExtents.every((extent) =>
    sameSet(intentOfExtent(context, closeExtent(context, extent)), intentOfExtent(context, extent)));
  const closeAMonotone = allExtents.every((left) => allExtents.every((right) =>
    !subsetOf(left, right) || subsetOf(closeExtent(context, left), closeExtent(context, right))));
  const closeAIdempotent = allExtents.every((extent) => sameSet(closeExtent(context, closeExtent(context, extent)), closeExtent(context, extent)));
  const closedExtents = Object.freeze(allExtents
    .map((extent) => closeExtent(context, extent))
    .filter((extent, index, array) => array.findIndex((other) => sameSet(other, extent)) === index));
  const conceptExtentsClosed = closedExtents.every((extent) => sameSet(closeExtent(context, extent), extent));
  const conceptMeetClosed = closedExtents.every((left) => closedExtents.every((right) =>
    closedExtents.some((extent) => sameSet(extent, intersection(left, right)))));
  const conceptJoinClosed = closedExtents.every((left) => closedExtents.every((right) =>
    closedExtents.some((extent) => sameSet(extent, closeExtent(context, union(left, right))))));
  const implicationCharacterization = allIntents.every((left) => allIntents.every((right) => {
    const implies = subsetOf(extentOfIntent(context, left), extentOfIntent(context, right));
    return implies === subsetOf(right, closeIntent(context, left));
  }));

  if (
    !primeAdjunction ||
    !primeAAntitone ||
    !primeBAntitone ||
    !closeAExtensive ||
    !primeACancelsClosure ||
    !closeAMonotone ||
    !closeAIdempotent ||
    !conceptExtentsClosed ||
    !conceptMeetClosed ||
    !conceptJoinClosed ||
    !implicationCharacterization
  ) {
    throw new TypeError("formalConceptAnalysisReceipt: finite FCA derivation laws failed");
  }

  return Object.freeze({
    kind: "fca.formalConceptAnalysis.receipt:witness" as const,
    sourceModule: "RelMath.Order.FormalConceptAnalysis" as const,
    theorems: Object.freeze([
      "RelMath.FCA.prime_adjunction",
      "RelMath.FCA.primeA_antitone",
      "RelMath.FCA.primeB_antitone",
      "RelMath.FCA.subA_closeA",
      "RelMath.FCA.primeA_closeA",
      "RelMath.FCA.closeA_mono",
      "RelMath.FCA.closeA_idem",
      "RelMath.FCA.derivation_galois_connection",
      "RelMath.FCA.Concept.extent_closed",
      "RelMath.FCA.familyMeet_le",
      "RelMath.FCA.familyJoin_ge",
      "RelMath.FCA.implies_iff_closeM",
      "RelMath.FCA.conceptLatticeData",
    ]) as FormalConceptAnalysisReceipt["theorems"],
    contextSubjects: context.subjects,
    contextPredicates: context.predicates,
    sampleExtent: Object.freeze([...normalizedSample]),
    sampleIntent,
    sampleClosedExtent,
    closedExtents,
    primeAdjunction: true as const,
    primeAAntitone: true as const,
    primeBAntitone: true as const,
    closeAExtensive: true as const,
    primeACancelsClosure: true as const,
    closeAMonotone: true as const,
    closeAIdempotent: true as const,
    conceptExtentsClosed: true as const,
    conceptMeetClosed: true as const,
    conceptJoinClosed: true as const,
    implicationCharacterization: true as const,
  });
}

export interface FcaLambekCircleWitness {
  readonly kind: "fcaLambek.circle:witness";
  readonly contextSubjects: readonly string[];
  readonly contextPredicates: readonly string[];
  readonly extentsChecked: number;
  readonly closedExtentCount: number;
  readonly fcaClosureIsSettlingClosure: true;
  readonly conceptLatticeFiniteComplete: true;
  readonly residuatedAsCommutativeLambek: true;
  readonly lambek: LambekLawsWitness;
  readonly commutativeCollapse: true;
  readonly modelTheoreticClosingEdge: "documented-boundary";
}

export interface FcaLambekCircleObstruction {
  readonly kind: "fcaLambek.circle-obstruction";
  readonly reason:
    | "fca.extensive"
    | "fca.monotone"
    | "fca.idempotent"
    | "concept.meet"
    | "concept.join"
    | "residuated"
    | "lambek"
    | "commutativeCollapse";
  readonly extent?: readonly string[];
  readonly extent2?: readonly string[];
  readonly closed?: readonly string[];
  readonly residuated?: ResiduatedLatticeObstruction;
  readonly lambek?: LambekLawsObstruction;
}

export type FcaLambekCircleJudgment = FcaLambekCircleWitness | FcaLambekCircleObstruction;

const obstruction = (
  reason: FcaLambekCircleObstruction["reason"],
  detail: Omit<FcaLambekCircleObstruction, "kind" | "reason"> = {},
): FcaLambekCircleObstruction => Object.freeze({
  kind: "fcaLambek.circle-obstruction" as const,
  reason,
  ...detail,
});

const lambekFromResiduated = (system: FiniteResiduatedLatticeSystem) => finiteLambekAlgebraSystem(
  system.lattice,
  system.one,
  system.fuse,
  system.imp,
  system.lattice.labels.map((_, numerator) =>
    system.lattice.labels.map((__, denominator) => system.imp[denominator]?.[numerator] as number),
  ),
);

/** Finite receipt for the proved algebraic edges of `RelMath.Order.FCALambekCircle`. */
export function circle(
  context: FiniteFcaContext,
  residuated: FiniteResiduatedLatticeSystem,
): FcaLambekCircleJudgment {
  const allExtents = subsets(context.subjects);
  for (const extent of allExtents) {
    const closed = closeExtent(context, extent);
    if (!subsetOf(extent, closed)) return obstruction("fca.extensive", { extent, closed });
    const twice = closeExtent(context, closed);
    if (!sameSet(twice, closed)) return obstruction("fca.idempotent", { extent, closed: twice });
    for (const extent2 of allExtents) {
      if (subsetOf(extent, extent2)) {
        const closed2 = closeExtent(context, extent2);
        if (!subsetOf(closed, closed2)) return obstruction("fca.monotone", { extent, extent2, closed });
      }
    }
  }

  const closedExtents = Object.freeze(allExtents
    .map((extent) => closeExtent(context, extent))
    .filter((extent, index, array) => array.findIndex((other) => sameSet(other, extent)) === index));

  for (const left of closedExtents) {
    for (const right of closedExtents) {
      const meet = intersection(left, right);
      if (!closedExtents.some((extent) => sameSet(extent, meet))) {
        return obstruction("concept.meet", { extent: left, extent2: right, closed: meet });
      }
      const join = closeExtent(context, union(left, right));
      if (!closedExtents.some((extent) => sameSet(extent, join))) {
        return obstruction("concept.join", { extent: left, extent2: right, closed: join });
      }
    }
  }

  const residuatedReceipt = residuatedLatticeLaws(residuated);
  if (residuatedReceipt.kind !== "residuatedLattice.laws:witness") {
    return obstruction("residuated", { residuated: residuatedReceipt });
  }

  const lambekReceipt = lambekLaws(lambekFromResiduated(residuated));
  if (lambekReceipt.kind !== "lambek.laws:witness") {
    return obstruction("lambek", { lambek: lambekReceipt });
  }
  if (!lambekReceipt.commutative || !lambekReceipt.singleImplicationWhenCommutative) {
    return obstruction("commutativeCollapse");
  }

  return Object.freeze({
    kind: "fcaLambek.circle:witness" as const,
    contextSubjects: context.subjects,
    contextPredicates: context.predicates,
    extentsChecked: allExtents.length,
    closedExtentCount: closedExtents.length,
    fcaClosureIsSettlingClosure: true as const,
    conceptLatticeFiniteComplete: true as const,
    residuatedAsCommutativeLambek: true as const,
    lambek: lambekReceipt,
    commutativeCollapse: true as const,
    modelTheoreticClosingEdge: "documented-boundary" as const,
  });
}

export const workedContext: FiniteFcaContext = finiteFcaContext([
  { subject: "a", predicate: "p" },
  { subject: "a", predicate: "q" },
  { subject: "b", predicate: "p" },
  { subject: "b", predicate: "r" },
  { subject: "c", predicate: "p" },
]);
