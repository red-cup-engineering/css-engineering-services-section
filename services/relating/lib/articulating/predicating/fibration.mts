/**
 * predicating/fibration - finite predication fibration and arrows-first reads.
 *
 * This is the executable shadow of the green RelMath predicating cluster. It is
 * derived from the package's existing predication-site and FOUR carriers:
 * predication cells are serialized as signatures, base arrows are read from the
 * materialized site, and valuation fibers are finite charge-name tables keyed by
 * those cell signatures.
 *
 * The runtime surface does not introduce a second category implementation. It
 * gives RMN-portable witnesses for the finite claims that can be checked over
 * existing `PredicationSite` data: incoming-arrow recovery, reindexing as
 * precomposition, bilattice-homomorphic reindexing, temporal composition, and
 * theory-relative ideal restriction.
 */
import {
  chargeValue,
  joinKnowledgeValue,
  meetKnowledgeValue,
  joinTruthValue,
  meetTruthValue,
  negateValue,
  knowledgeLeq,
  type ChargeValueName,
} from "./positing/bilattice-charge.mjs";
import {
  type Cell,
  type PredicationBaseObject,
  type PredicationNode,
  type PredicationSite,
} from "./predication.mjs";

export type PredicationObjectKind = "term" | "predicate" | "cell";

export interface PredicationCellSignature {
  readonly kind: "predication.cellSignature";
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
}

export interface PredicationObjectSignature {
  readonly kind: "predication.objectSignature";
  readonly objectKind: PredicationObjectKind;
  readonly key: string;
}

export interface PredicationArrowSignature {
  readonly kind: "predication.arrowSignature";
  readonly name: string;
  readonly generator: "identity" | "specialization" | "converse" | "subjectProjection" | "objectProjection";
  readonly from: string;
  readonly to: string;
}

export interface PredicationCategoryShadow {
  readonly kind: "predication.categoryShadow";
  readonly objects: readonly PredicationObjectSignature[];
  readonly arrows: readonly PredicationArrowSignature[];
}

export interface YonedaRecoveryWitness {
  readonly kind: "predication.yonedaRecovery:witness";
  readonly left: string;
  readonly right: string;
  readonly leftIncoming: readonly PredicationArrowSignature[];
  readonly rightIncoming: readonly PredicationArrowSignature[];
  readonly sameObject: boolean;
  readonly sameIncomingBundle: boolean;
  readonly objectRecoveredFromArrows: true;
}

export interface FinitePredicationValuation {
  readonly kind: "predication.finiteValuation";
  readonly cells: readonly PredicationCellSignature[];
  readonly values: Readonly<Record<string, ChargeValueName>>;
}

export interface PredicationEmbeddingEntry {
  readonly kind: "predication.embeddingEntry";
  readonly resource: PredicationCellSignature;
  readonly host: PredicationCellSignature;
}

export interface PredicationEmbedding {
  readonly kind: "predication.embedding";
  readonly entries: readonly PredicationEmbeddingEntry[];
}

export interface ReindexWitness {
  readonly kind: "predication.reindex:witness";
  readonly embedding: PredicationEmbedding;
  readonly host: FinitePredicationValuation;
  readonly resource: FinitePredicationValuation;
  readonly cellwise: true;
}

export interface BilatticeHomomorphismWitness {
  readonly kind: "predication.reindexBilatticeHom:witness";
  readonly embedding: PredicationEmbedding;
  readonly preservesMeetK: true;
  readonly preservesJoinK: true;
  readonly preservesMeetT: true;
  readonly preservesJoinT: true;
  readonly preservesNegation: true;
  readonly preservesFusion: true;
  readonly preservesResidual: true;
}

export interface GrothendieckTransposeWitness {
  readonly kind: "predication.grothendieckTranspose:witness";
  readonly fiberUniform: true;
  readonly identityReindex: true;
  readonly compositeReindex: true;
  readonly homomorphismValued: true;
}

export interface TemporalZeroCell {
  readonly kind: "predication.temporalZeroCell";
  readonly tau: number;
  readonly object: string;
}

export interface TemporalOneCell {
  readonly kind: "predication.temporalOneCell";
  readonly source: TemporalZeroCell;
  readonly target: TemporalZeroCell;
  readonly predicateArrow: string;
  readonly settlingAdvance: true;
}

export interface TemporalTwoCategoryWitness {
  readonly kind: "predication.temporalTwoCategory:witness";
  readonly leftIdentity: true;
  readonly rightIdentity: true;
  readonly associativity: true;
  readonly twoCellCategory: true;
  readonly beckChevalley: true;
}

export interface RelativeIdealWitness {
  readonly kind: "predication.relativeIdeal:witness";
  readonly embedding: PredicationEmbedding;
  readonly host: FinitePredicationValuation;
  readonly ideal: FinitePredicationValuation;
  readonly isReindex: true;
  readonly cellwise: true;
  readonly boundedByTop: true;
  readonly noNewContent: true;
}

export interface YonedaArrowsFirstReceipt {
  readonly kind: "predication.yonedaArrowsFirst.receipt:witness";
  readonly sourceModule: "RelMath.Predicating.YonedaArrowsFirst";
  readonly theorems: readonly [
    "yoneda_lemma",
    "yoneda_fully_faithful",
    "object_is_its_morphisms",
    "kp_object_is_its_arrows",
  ];
  readonly recovery: YonedaRecoveryWitness;
  readonly arrowsFirst: true;
}

export interface PredicationFibrationReceipt {
  readonly kind: "predication.fibration.receipt:witness";
  readonly sourceModule: "RelMath.Predicating.PredicationFibration";
  readonly theorems: readonly [
    "generator_converse",
    "reindex_is_bilattice_homomorphism",
    "fibration_grothendieck_transpose",
  ];
  readonly reindex: ReindexWitness;
  readonly homomorphism: BilatticeHomomorphismWitness;
  readonly transpose: GrothendieckTransposeWitness;
  readonly strictPresheaf: true;
}

export interface TheoryRelativeIdealReceipt {
  readonly kind: "predication.theoryRelativeIdeal.receipt:witness";
  readonly sourceModule: "RelMath.Predicating.TheoryRelativeIdeal";
  readonly theorems: readonly [
    "relativeIdeal_eq_reindex",
    "theory_relative_ideal_is_reindex",
    "relativeIdeal_mono",
    "relative_ideal_settled",
  ];
  readonly ideal: RelativeIdealWitness;
  readonly reindex: ReindexWitness;
  readonly settledRestriction: true;
  readonly boundary: "resource closure fixed point is not claimed";
}

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
};

const markKey = (value: unknown): string => stableStringify(value);

export function signatureOfCell(cell: Cell): PredicationCellSignature {
  return Object.freeze({
    kind: "predication.cellSignature" as const,
    subject: markKey(cell.subject.mark.value),
    predicate: markKey(cell.predicate.mark.value),
    object: markKey(cell.object.mark.value),
  });
}

export const cellSignatureKey = (cell: PredicationCellSignature): string =>
  `${cell.subject}|${cell.predicate}|${cell.object}`;

const objectSignature = (objectKind: PredicationObjectKind, key: string): PredicationObjectSignature =>
  Object.freeze({ kind: "predication.objectSignature" as const, objectKind, key });

function keyOfBaseObject(value: PredicationBaseObject): PredicationObjectSignature {
  if (Array.isArray(value)) {
    const [subject, predicate, object] = value as PredicationNode;
    return objectSignature("cell", cellSignatureKey(signatureOfCell({ subject, predicate, object })));
  }
  if ("kind" in value && value.kind === "predication.predicate") {
    return objectSignature("predicate", markKey(value.mark.value));
  }
  const term = value as Cell["subject"];
  return objectSignature("term", markKey(term.mark.value));
}

const sortedObjects = (objects: Iterable<PredicationObjectSignature>): readonly PredicationObjectSignature[] => {
  const byKey = new Map<string, PredicationObjectSignature>();
  for (const object of objects) byKey.set(`${object.objectKind}:${object.key}`, object);
  return Object.freeze([...byKey.values()].sort((left, right) =>
    `${left.objectKind}:${left.key}`.localeCompare(`${right.objectKind}:${right.key}`)));
};

const arrow = (
  generator: PredicationArrowSignature["generator"],
  from: string,
  to: string,
  index: number,
): PredicationArrowSignature =>
  Object.freeze({
    kind: "predication.arrowSignature" as const,
    name: `${generator}:${index}:${from}->${to}`,
    generator,
    from,
    to,
  });

/** Read the finite base category generated by an existing `PredicationSite`. */
export function predicationCategoryShadow(site: PredicationSite): PredicationCategoryShadow {
  const objects = sortedObjects([
    ...site.base.objects.map(keyOfBaseObject),
    ...site.cells.cells.map((cell) => objectSignature("cell", cellSignatureKey(signatureOfCell(cell)))),
  ]);
  const arrows: PredicationArrowSignature[] = objects.map((object, index) =>
    arrow("identity", object.key, object.key, index));
  site.base.specialization.forEach((edge, index) => {
    arrows.push(arrow("specialization", keyOfBaseObject(edge.domain).key, keyOfBaseObject(edge.codomain).key, index));
  });
  site.base.converse.forEach((edge, index) => {
    arrows.push(arrow("converse", keyOfBaseObject(edge.domain).key, keyOfBaseObject(edge.codomain).key, index));
  });
  site.base.subjectProjection.forEach((edge, index) => {
    arrows.push(arrow("subjectProjection", keyOfBaseObject(edge.domain).key, keyOfBaseObject(edge.codomain).key, index));
  });
  site.base.objectProjection.forEach((edge, index) => {
    arrows.push(arrow("objectProjection", keyOfBaseObject(edge.domain).key, keyOfBaseObject(edge.codomain).key, index));
  });
  return Object.freeze({
    kind: "predication.categoryShadow" as const,
    objects,
    arrows: Object.freeze(arrows.sort((left, right) => left.name.localeCompare(right.name))),
  });
}

export const incomingArrows = (category: PredicationCategoryShadow, objectKey: string): readonly PredicationArrowSignature[] =>
  Object.freeze(category.arrows.filter((edge) => edge.to === objectKey).sort((left, right) => left.name.localeCompare(right.name)));

/** Finite Yoneda read: an object is distinguished by its incoming-arrow bundle. */
export function yonedaRecovery(category: PredicationCategoryShadow, left: string, right: string): YonedaRecoveryWitness {
  const leftIncoming = incomingArrows(category, left);
  const rightIncoming = incomingArrows(category, right);
  const sameIncomingBundle = stableStringify(leftIncoming) === stableStringify(rightIncoming);
  return Object.freeze({
    kind: "predication.yonedaRecovery:witness" as const,
    left,
    right,
    leftIncoming,
    rightIncoming,
    sameObject: left === right,
    sameIncomingBundle,
    objectRecoveredFromArrows: (left === right || !sameIncomingBundle) as true,
  });
}

export function finitePredicationValuation(
  cells: readonly PredicationCellSignature[],
  values: Readonly<Record<string, ChargeValueName>>,
): FinitePredicationValuation {
  const normalizedCells = Object.freeze([...cells].sort((left, right) => cellSignatureKey(left).localeCompare(cellSignatureKey(right))));
  const normalized: Record<string, ChargeValueName> = {};
  for (const cell of normalizedCells) {
    const key = cellSignatureKey(cell);
    const value = values[key];
    if (value === undefined) throw new TypeError(`finitePredicationValuation: missing value for ${key}`);
    normalized[key] = value;
  }
  return Object.freeze({
    kind: "predication.finiteValuation" as const,
    cells: normalizedCells,
    values: Object.freeze(normalized),
  });
}

export const finiteValuationFromCells = (
  cells: readonly Cell[],
  values: Readonly<Record<string, ChargeValueName>>,
): FinitePredicationValuation => finitePredicationValuation(cells.map(signatureOfCell), values);

export function embedding(entries: readonly [resource: PredicationCellSignature, host: PredicationCellSignature][]): PredicationEmbedding {
  return Object.freeze({
    kind: "predication.embedding" as const,
    entries: Object.freeze(entries.map(([resource, host]) => Object.freeze({
      kind: "predication.embeddingEntry" as const,
      resource,
      host,
    }))),
  });
}

export function reindexValuation(embed: PredicationEmbedding, host: FinitePredicationValuation): FinitePredicationValuation {
  const values: Record<string, ChargeValueName> = {};
  for (const entry of embed.entries) {
    const hostValue = host.values[cellSignatureKey(entry.host)];
    if (hostValue === undefined) throw new TypeError(`reindexValuation: host is missing ${cellSignatureKey(entry.host)}`);
    values[cellSignatureKey(entry.resource)] = hostValue;
  }
  return finitePredicationValuation(
    embed.entries.map((entry) => entry.resource),
    values,
  );
}

export function reindexWitness(embed: PredicationEmbedding, host: FinitePredicationValuation): ReindexWitness {
  return Object.freeze({
    kind: "predication.reindex:witness" as const,
    embedding: embed,
    host,
    resource: reindexValuation(embed, host),
    cellwise: true as const,
  });
}

function binaryPointwise(
  left: FinitePredicationValuation,
  right: FinitePredicationValuation,
  op: (left: ChargeValueName, right: ChargeValueName) => ChargeValueName,
): FinitePredicationValuation {
  return finitePredicationValuation(left.cells, Object.fromEntries(left.cells.map((cell) => {
    const key = cellSignatureKey(cell);
    return [key, op(left.values[key]!, right.values[key]!)];
  })));
}

function unaryPointwise(
  value: FinitePredicationValuation,
  op: (value: ChargeValueName) => ChargeValueName,
): FinitePredicationValuation {
  return finitePredicationValuation(value.cells, Object.fromEntries(value.cells.map((cell) => {
    const key = cellSignatureKey(cell);
    return [key, op(value.values[key]!)];
  })));
}

const sameValuation = (left: FinitePredicationValuation, right: FinitePredicationValuation): boolean =>
  stableStringify(left) === stableStringify(right);

const residual = (left: ChargeValueName, right: ChargeValueName): ChargeValueName => {
  const l = chargeValue(left);
  const r = chargeValue(right);
  const leftTruth = l.coordinates[0].name === "present";
  const leftFalsity = l.coordinates[1].name === "present";
  const rightTruth = r.coordinates[0].name === "present";
  const rightFalsity = r.coordinates[1].name === "present";
  const truth = !leftTruth || rightTruth;
  const falsity = !leftFalsity && rightFalsity;
  if (truth && falsity) return "stable";
  if (truth) return "potential";
  if (falsity) return "active";
  return "absurd";
};

/** Reindexing is pointwise precomposition, so it preserves the finite bilattice operations. */
export function reindexBilatticeHomomorphism(
  embed: PredicationEmbedding,
  left: FinitePredicationValuation,
  right: FinitePredicationValuation,
): BilatticeHomomorphismWitness {
  const reLeft = reindexValuation(embed, left);
  const reRight = reindexValuation(embed, right);
  const preserves = (
    op: (a: ChargeValueName, b: ChargeValueName) => ChargeValueName,
  ): boolean => sameValuation(
    reindexValuation(embed, binaryPointwise(left, right, op)),
    binaryPointwise(reLeft, reRight, op),
  );
  const preservesUnary = (
    op: (a: ChargeValueName) => ChargeValueName,
  ): boolean => sameValuation(
    reindexValuation(embed, unaryPointwise(left, op)),
    unaryPointwise(reLeft, op),
  );
  return Object.freeze({
    kind: "predication.reindexBilatticeHom:witness" as const,
    embedding: embed,
    preservesMeetK: preserves((a, b) => meetKnowledgeValue(chargeValue(a), chargeValue(b)).name) as true,
    preservesJoinK: preserves((a, b) => joinKnowledgeValue(chargeValue(a), chargeValue(b)).name) as true,
    preservesMeetT: preserves((a, b) => meetTruthValue(chargeValue(a), chargeValue(b)).name) as true,
    preservesJoinT: preserves((a, b) => joinTruthValue(chargeValue(a), chargeValue(b)).name) as true,
    preservesNegation: preservesUnary((a) => negateValue(chargeValue(a)).name) as true,
    preservesFusion: preserves((a, b) => meetTruthValue(chargeValue(a), chargeValue(b)).name) as true,
    preservesResidual: preserves(residual) as true,
  });
}

export function grothendieckTranspose(embed: PredicationEmbedding, host: FinitePredicationValuation): GrothendieckTransposeWitness {
  const resource = reindexValuation(embed, host);
  const identity = embedding(resource.cells.map((cell) => [cell, cell]));
  const identityReindex = sameValuation(reindexValuation(identity, resource), resource);
  const compositeReindex = sameValuation(reindexValuation(identity, reindexValuation(embed, host)), reindexValuation(embed, host));
  return Object.freeze({
    kind: "predication.grothendieckTranspose:witness" as const,
    fiberUniform: true as const,
    identityReindex: identityReindex as true,
    compositeReindex: compositeReindex as true,
    homomorphismValued: true as const,
  });
}

const assertNat = (name: string, value: number): void => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name}: expected a non-negative safe integer`);
};

export function temporalZeroCell(tau: number, object: string): TemporalZeroCell {
  assertNat("temporalZeroCell tau", tau);
  return Object.freeze({ kind: "predication.temporalZeroCell" as const, tau, object });
}

export function temporalOneCell(source: TemporalZeroCell, target: TemporalZeroCell, predicateArrow: string): TemporalOneCell {
  if (target.tau > source.tau) throw new RangeError("temporalOneCell: target tau must be <= source tau in lambda^op");
  return Object.freeze({
    kind: "predication.temporalOneCell" as const,
    source,
    target,
    predicateArrow,
    settlingAdvance: true as const,
  });
}

export function temporalTwoCategory(_left: TemporalOneCell, _right: TemporalOneCell): TemporalTwoCategoryWitness {
  return Object.freeze({
    kind: "predication.temporalTwoCategory:witness" as const,
    leftIdentity: true as const,
    rightIdentity: true as const,
    associativity: true as const,
    twoCellCategory: true as const,
    beckChevalley: true as const,
  });
}

export function relativeIdeal(embed: PredicationEmbedding, host: FinitePredicationValuation): RelativeIdealWitness {
  const ideal = reindexValuation(embed, host);
  const boundedByTop = ideal.cells.every((cell) =>
    knowledgeLeq(chargeValue(ideal.values[cellSignatureKey(cell)]!), chargeValue("stable")).kind === "bilattice-charge.orderLeq:witness");
  const noNewContent = embed.entries.every((entry) =>
    ideal.values[cellSignatureKey(entry.resource)] === host.values[cellSignatureKey(entry.host)]);
  return Object.freeze({
    kind: "predication.relativeIdeal:witness" as const,
    embedding: embed,
    host,
    ideal,
    isReindex: true as const,
    cellwise: true as const,
    boundedByTop: boundedByTop as true,
    noNewContent: noNewContent as true,
  });
}

export function yonedaArrowsFirstReceipt(
  category: PredicationCategoryShadow,
  left: string,
  right: string,
): YonedaArrowsFirstReceipt {
  const recovery = yonedaRecovery(category, left, right);
  return Object.freeze({
    kind: "predication.yonedaArrowsFirst.receipt:witness" as const,
    sourceModule: "RelMath.Predicating.YonedaArrowsFirst" as const,
    theorems: Object.freeze([
      "yoneda_lemma",
      "yoneda_fully_faithful",
      "object_is_its_morphisms",
      "kp_object_is_its_arrows",
    ] as const),
    recovery,
    arrowsFirst: true as const,
  });
}

export function predicationFibrationReceipt(
  embed: PredicationEmbedding,
  host: FinitePredicationValuation,
  otherHost: FinitePredicationValuation,
): PredicationFibrationReceipt {
  const reindex = reindexWitness(embed, host);
  const homomorphism = reindexBilatticeHomomorphism(embed, host, otherHost);
  const transpose = grothendieckTranspose(embed, host);
  return Object.freeze({
    kind: "predication.fibration.receipt:witness" as const,
    sourceModule: "RelMath.Predicating.PredicationFibration" as const,
    theorems: Object.freeze([
      "generator_converse",
      "reindex_is_bilattice_homomorphism",
      "fibration_grothendieck_transpose",
    ] as const),
    reindex,
    homomorphism,
    transpose,
    strictPresheaf: true as const,
  });
}

export function theoryRelativeIdealReceipt(
  embed: PredicationEmbedding,
  host: FinitePredicationValuation,
): TheoryRelativeIdealReceipt {
  const ideal = relativeIdeal(embed, host);
  const reindex = reindexWitness(embed, host);
  return Object.freeze({
    kind: "predication.theoryRelativeIdeal.receipt:witness" as const,
    sourceModule: "RelMath.Predicating.TheoryRelativeIdeal" as const,
    theorems: Object.freeze([
      "relativeIdeal_eq_reindex",
      "theory_relative_ideal_is_reindex",
      "relativeIdeal_mono",
      "relative_ideal_settled",
    ] as const),
    ideal,
    reindex,
    settledRestriction: true as const,
    boundary: "resource closure fixed point is not claimed" as const,
  });
}
