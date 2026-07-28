/**
 * analysis/d-frame - finite executable shadow of RelMath.Cohomology.DFrame.
 *
 * Lean proves frame, d-frame, canonical bitopological d-frame, and
 * d-frame-valued settling sheaf laws. This module exposes the finite powerset
 * instance: subsets as sorted string arrays, consistency as disjointness,
 * totality as covering, and restriction as intersection with a clopen mask.
 */
import {
  chargedCell,
  type ChargedCell,
} from "./settling-associated-sheaf.mjs";

export interface FiniteSubset {
  readonly kind: "dFrame.subset";
  readonly elements: readonly string[];
}

export interface PowersetFrameReceipt {
  readonly kind: "dFrame.powersetFrame:witness";
  readonly universe: readonly string[];
  readonly subsetCount: number;
  readonly bottom: FiniteSubset;
  readonly top: FiniteSubset;
  readonly meetCommutative: true;
  readonly meetAssociative: true;
  readonly meetIdempotent: true;
  readonly unionSupLeastUpperBound: true;
  readonly meetDistributesOverFiniteSup: true;
}

export interface CanonicalDFrameReceipt {
  readonly kind: "dFrame.canonical:witness";
  readonly universe: readonly string[];
  readonly positiveFrame: PowersetFrameReceipt;
  readonly negativeFrame: PowersetFrameReceipt;
  readonly consistentExample: readonly [FiniteSubset, FiniteSubset];
  readonly totalExample: readonly [FiniteSubset, FiniteSubset];
  readonly conIsDisjointness: true;
  readonly totIsCovering: true;
  readonly conDownwardClosed: true;
  readonly totUpwardClosed: true;
}

export interface DFrameValuedSheafReceipt {
  readonly kind: "dFrame.valuedSheaf:witness";
  readonly valuation: readonly ChargedCell[];
  readonly clopen: FiniteSubset;
  readonly positiveSupport: FiniteSubset;
  readonly negativeSupport: FiniteSubset;
  readonly settledSupport: FiniteSubset;
  readonly topSharedByBothSides: true;
  readonly bottomInNeitherSide: true;
  readonly conDownwardClosed: true;
  readonly totUpwardClosed: true;
  readonly restrictionMeetPreserving: true;
  readonly restrictionTop: FiniteSubset;
  readonly restrictionMonotone: true;
  readonly restrictionPreservesCon: true;
}

export interface DFrameReceipt {
  readonly kind: "dFrame.receipt:witness";
  readonly powerset: PowersetFrameReceipt;
  readonly canonical: CanonicalDFrameReceipt;
  readonly valuedSheaf: DFrameValuedSheafReceipt;
  readonly openFrontier: readonly string[];
}

const uniqueSorted = (values: readonly string[]): readonly string[] => {
  const out: string[] = [];
  for (const value of values) {
    if (value.length === 0) throw new TypeError("dFrame: element names must be nonempty");
    if (!out.includes(value)) out.push(value);
  }
  return Object.freeze(out.sort((left, right) => left.localeCompare(right)));
};

export function subset(elements: readonly string[]): FiniteSubset {
  return Object.freeze({
    kind: "dFrame.subset" as const,
    elements: uniqueSorted(elements),
  });
}

const assertSubsetOf = (universe: readonly string[], value: FiniteSubset): void => {
  for (const element of value.elements) {
    if (!universe.includes(element)) {
      throw new TypeError(`dFrame: subset element ${JSON.stringify(element)} is outside the universe`);
    }
  }
};

export const includes = (value: FiniteSubset, element: string): boolean => value.elements.includes(element);

export const le = (left: FiniteSubset, right: FiniteSubset): boolean =>
  left.elements.every((element) => right.elements.includes(element));

export const sameSubset = (left: FiniteSubset, right: FiniteSubset): boolean =>
  le(left, right) && le(right, left);

export const meet = (left: FiniteSubset, right: FiniteSubset): FiniteSubset =>
  subset(left.elements.filter((element) => right.elements.includes(element)));

export const join = (left: FiniteSubset, right: FiniteSubset): FiniteSubset =>
  subset([...left.elements, ...right.elements]);

export const finiteSup = (family: readonly FiniteSubset[]): FiniteSubset =>
  family.reduce((accumulator, value) => join(accumulator, value), subset([]));

export const disjoint = (left: FiniteSubset, right: FiniteSubset): boolean =>
  left.elements.every((element) => !right.elements.includes(element));

export const covers = (universe: readonly string[], left: FiniteSubset, right: FiniteSubset): boolean =>
  universe.every((element) => left.elements.includes(element) || right.elements.includes(element));

export function allSubsets(universeInput: readonly string[]): readonly FiniteSubset[] {
  const universe = uniqueSorted(universeInput);
  const count = 2 ** universe.length;
  if (count > 4096) throw new TypeError("dFrame.allSubsets: universe too large for exhaustive powerset receipt");
  return Object.freeze(Array.from({ length: count }, (_, mask) =>
    subset(universe.filter((_, index) => (mask & (1 << index)) !== 0))));
}

const pairs = <T,>(items: readonly T[]): readonly (readonly [T, T])[] =>
  Object.freeze(items.flatMap((left) => items.map((right) => Object.freeze([left, right] as const))));

const triples = <T,>(items: readonly T[]): readonly (readonly [T, T, T])[] =>
  Object.freeze(items.flatMap((a) => items.flatMap((b) => items.map((c) => Object.freeze([a, b, c] as const)))));

const familiesOf = (items: readonly FiniteSubset[]): readonly (readonly FiniteSubset[])[] => {
  const count = 2 ** items.length;
  return Object.freeze(Array.from({ length: count }, (_, mask) =>
    Object.freeze(items.filter((_, index) => (mask & (1 << index)) !== 0))));
};

export function powersetFrameReceipt(universeInput: readonly string[] = ["x", "y", "z"]): PowersetFrameReceipt {
  const universe = uniqueSorted(universeInput);
  const subsets = allSubsets(universe);
  const bottom = subset([]);
  const top = subset(universe);
  const meetCommutative = pairs(subsets).every(([a, b]) => sameSubset(meet(a, b), meet(b, a)));
  const meetAssociative = triples(subsets).every(([a, b, c]) => sameSubset(meet(meet(a, b), c), meet(a, meet(b, c))));
  const meetIdempotent = subsets.every((value) => sameSubset(meet(value, value), value));
  const unionSupLeastUpperBound = familiesOf(subsets).every((family) => {
    const sup = finiteSup(family);
    return family.every((member) => le(member, sup))
      && subsets.every((candidate) => !family.every((member) => le(member, candidate)) || le(sup, candidate));
  });
  const meetDistributesOverFiniteSup = pairs(subsets).every(([a]) => familiesOf(subsets).every((family) =>
    sameSubset(meet(a, finiteSup(family)), finiteSup(family.map((member) => meet(a, member)))),
  ));

  if (!meetCommutative || !meetAssociative || !meetIdempotent || !unionSupLeastUpperBound || !meetDistributesOverFiniteSup) {
    throw new TypeError("powersetFrameReceipt: finite powerset-frame laws failed");
  }

  return Object.freeze({
    kind: "dFrame.powersetFrame:witness" as const,
    universe,
    subsetCount: subsets.length,
    bottom,
    top,
    meetCommutative: true as const,
    meetAssociative: true as const,
    meetIdempotent: true as const,
    unionSupLeastUpperBound: true as const,
    meetDistributesOverFiniteSup: true as const,
  });
}

export function canonicalDFrameReceipt(universeInput: readonly string[] = ["plus", "minus"]): CanonicalDFrameReceipt {
  const universe = uniqueSorted(universeInput);
  const subsets = allSubsets(universe);
  const conDownwardClosed = pairs(subsets).every(([a, b]) => !disjoint(a, b)
    || pairs(subsets).every(([aPrime, bPrime]) => !le(aPrime, a) || !le(bPrime, b) || disjoint(aPrime, bPrime)));
  const totUpwardClosed = pairs(subsets).every(([a, b]) => !covers(universe, a, b)
    || pairs(subsets).every(([aPrime, bPrime]) => !le(a, aPrime) || !le(b, bPrime) || covers(universe, aPrime, bPrime)));

  if (!conDownwardClosed || !totUpwardClosed) {
    throw new TypeError("canonicalDFrameReceipt: finite d-frame closure laws failed");
  }

  return Object.freeze({
    kind: "dFrame.canonical:witness" as const,
    universe,
    positiveFrame: powersetFrameReceipt(universe),
    negativeFrame: powersetFrameReceipt(universe),
    consistentExample: Object.freeze([subset([universe[0] ?? ""]), subset([universe[1] ?? ""])] as const),
    totalExample: Object.freeze([subset([universe[0] ?? ""]), subset(universe.slice(1))] as const),
    conIsDisjointness: true as const,
    totIsCovering: true as const,
    conDownwardClosed: true as const,
    totUpwardClosed: true as const,
  });
}

export const defaultValuation: readonly ChargedCell[] = Object.freeze([
  chargedCell("truth-cell", "potential"),
  chargedCell("both-cell", "stable"),
  chargedCell("false-cell", "active"),
  chargedCell("empty-cell", "absurd"),
]);

export const dK = (valuation: readonly ChargedCell[]): FiniteSubset =>
  subset(valuation.filter((entry) => entry.charge === "potential" || entry.charge === "stable").map((entry) => entry.cell));

export const dF = (valuation: readonly ChargedCell[]): FiniteSubset =>
  subset(valuation.filter((entry) => entry.charge === "active" || entry.charge === "stable").map((entry) => entry.cell));

export const settledMask = (valuation: readonly ChargedCell[], clopen: FiniteSubset): FiniteSubset =>
  subset(valuation
    .filter((entry) => entry.charge !== "absurd" && clopen.elements.includes(entry.cell))
    .map((entry) => entry.cell));

export const restrictSub = (clopen: FiniteSubset, value: FiniteSubset): FiniteSubset => meet(clopen, value);

export function valuedSheafReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  clopenInput: FiniteSubset = subset(defaultValuation.map((entry) => entry.cell)),
): DFrameValuedSheafReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const universe = uniqueSorted(valuation.map((entry) => entry.cell));
  assertSubsetOf(universe, clopenInput);
  const subsets = allSubsets(universe);
  const positiveSupport = meet(dK(valuation), clopenInput);
  const negativeSupport = meet(dF(valuation), clopenInput);
  const settledSupport = settledMask(valuation, clopenInput);
  const con = (a: FiniteSubset, b: FiniteSubset): boolean => disjoint(a, b);
  const tot = (a: FiniteSubset, b: FiniteSubset): boolean => settledSupport.elements.every((cell) => includes(a, cell) || includes(b, cell));
  const conDownwardClosed = pairs(subsets).every(([a, b]) => !con(a, b)
    || pairs(subsets).every(([aPrime, bPrime]) => !le(aPrime, a) || !le(bPrime, b) || con(aPrime, bPrime)));
  const totUpwardClosed = pairs(subsets).every(([a, b]) => !tot(a, b)
    || pairs(subsets).every(([aPrime, bPrime]) => !le(a, aPrime) || !le(b, bPrime) || tot(aPrime, bPrime)));
  const topSharedByBothSides = valuation
    .filter((entry) => entry.charge === "stable" && clopenInput.elements.includes(entry.cell))
    .every((entry) => includes(positiveSupport, entry.cell) && includes(negativeSupport, entry.cell));
  const bottomInNeitherSide = valuation
    .filter((entry) => entry.charge === "absurd")
    .every((entry) => !includes(positiveSupport, entry.cell) && !includes(negativeSupport, entry.cell));
  const subClopen = subset(clopenInput.elements.filter((_, index) => index % 2 === 0));
  const restrictionMeetPreserving = pairs(subsets).every(([a, b]) =>
    sameSubset(restrictSub(subClopen, meet(a, b)), meet(restrictSub(subClopen, a), restrictSub(subClopen, b))),
  );
  const restrictionTop = restrictSub(subClopen, subset(universe));
  const restrictionMonotone = pairs(subsets).every(([a, b]) => !le(a, b) || le(restrictSub(subClopen, a), restrictSub(subClopen, b)));
  const restrictionPreservesCon = pairs(subsets).every(([a, b]) => !con(a, b) || con(restrictSub(subClopen, a), restrictSub(subClopen, b)));

  if (!conDownwardClosed || !totUpwardClosed || !topSharedByBothSides || !bottomInNeitherSide
    || !restrictionMeetPreserving || !restrictionMonotone || !restrictionPreservesCon) {
    throw new TypeError("valuedSheafReceipt: finite d-frame-valued sheaf laws failed");
  }

  return Object.freeze({
    kind: "dFrame.valuedSheaf:witness" as const,
    valuation,
    clopen: clopenInput,
    positiveSupport,
    negativeSupport,
    settledSupport,
    topSharedByBothSides: true as const,
    bottomInNeitherSide: true as const,
    conDownwardClosed: true as const,
    totUpwardClosed: true as const,
    restrictionMeetPreserving: true as const,
    restrictionTop,
    restrictionMonotone: true as const,
    restrictionPreservesCon: true as const,
  });
}

export function receipt(): DFrameReceipt {
  return Object.freeze({
    kind: "dFrame.receipt:witness" as const,
    powerset: powersetFrameReceipt(),
    canonical: canonicalDFrameReceipt(),
    valuedSheaf: valuedSheafReceipt(),
    openFrontier: Object.freeze([
      "The runtime receipt checks finite powerset-frame laws; arbitrary Prop-valued frames and infinitary suprema remain Lean-side.",
      "The d-frame-valued sheaf is modeled over finite charged cells and masks, not arbitrary bitopological sites or all clopen covers.",
      "General d-frame morphism categories and non-finite frame-valued sheaf cohomology remain proof/kernel obligations.",
    ]),
  });
}
