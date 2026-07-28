/**
 * analysis/negative-paraconsistent-sheaf - finite executable shadow of
 * RelMath.Cohomology.NegativeParaconsistentSheaf.
 *
 * Lean proves that the negative paraconsistent sheaf is the bilattice-negation
 * mirror of the positive settling-associated sheaf. This module exposes the
 * finite mask/cochain content: dNeg = dF, dFonly, negation mirror laws, the
 * shared top seam, and the negative split into f-only plus top parts.
 */
import {
  asChargeValueName,
  chargeValue,
  chargeValueName,
  negateValue,
  type ChargeValueName,
} from "../../bilattice-charge.mjs";
import {
  chargedCell,
  cochain,
  combine,
  dK,
  dT,
  dTop,
  defaultCochain,
  defaultValuation,
  mask,
  restrict,
  vanishesOff,
  type ChargedCell,
  type CochainCarrier,
  type CochainEntry,
  type MaskCarrier,
} from "./settling-associated-sheaf.mjs";
import { dF as dFrameFalseMask } from "./d-frame.mjs";

export interface NegationMirrorReceipt {
  readonly kind: "negativeParaconsistentSheaf.negationMirror:witness";
  readonly valuation: readonly ChargedCell[];
  readonly negatedValuation: readonly ChargedCell[];
  readonly dNeg: MaskCarrier;
  readonly dKOfNegated: MaskCarrier;
  readonly dFonly: MaskCarrier;
  readonly dTOfNegated: MaskCarrier;
  readonly dTop: MaskCarrier;
  readonly dTopOfNegated: MaskCarrier;
  readonly dNegEqualsDkOfNegation: true;
  readonly dFonlyEqualsDtOfNegation: true;
  readonly topSeamFixed: true;
  readonly negationInvolutive: true;
  readonly chargeMirrorTable: Readonly<Record<ChargeValueName, ChargeValueName>>;
}

export interface NegativeSplitReceipt {
  readonly kind: "negativeParaconsistentSheaf.split:witness";
  readonly valuation: readonly ChargedCell[];
  readonly dNeg: MaskCarrier;
  readonly dFonly: MaskCarrier;
  readonly dTop: MaskCarrier;
  readonly cochain: CochainCarrier;
  readonly fPart: CochainCarrier;
  readonly topPart: CochainCarrier;
  readonly reconstructed: CochainCarrier;
  readonly dFonlyDisjointDTop: true;
  readonly dNegEqualsUnion: true;
  readonly dFonlyIncludedInDNeg: true;
  readonly dTopIncludedInDNeg: true;
  readonly dTopIncludedInDK: true;
  readonly splitReconstructs: true;
  readonly splitUniqueOnSample: true;
  readonly sampleSize: number;
}

export interface NegativeRestrictionReceipt {
  readonly kind: "negativeParaconsistentSheaf.restriction:witness";
  readonly valuation: readonly ChargedCell[];
  readonly cochain: CochainCarrier;
  readonly dNeg: MaskCarrier;
  readonly restricted: CochainCarrier;
  readonly restrictedVanishesOffDNeg: true;
  readonly fullRestrictionIdentity: true;
  readonly restrictionComposesByMeet: true;
}

export interface NegativeParaconsistentSheafReceipt {
  readonly kind: "negativeParaconsistentSheaf.receipt:witness";
  readonly mirror: NegationMirrorReceipt;
  readonly split: NegativeSplitReceipt;
  readonly restriction: NegativeRestrictionReceipt;
  readonly supportReading: Readonly<Record<ChargeValueName, {
    readonly dNeg: boolean;
    readonly dFonly: boolean;
    readonly dTop: boolean;
  }>>;
  readonly openFrontier: readonly string[];
}

const sorted = (cells: readonly string[]): readonly string[] =>
  Object.freeze([...new Set(cells)].sort((left, right) => left.localeCompare(right)));

const asCustomMask = (cells: readonly string[]): MaskCarrier => mask("custom", sorted(cells));

const subset = (left: MaskCarrier, right: MaskCarrier): boolean =>
  left.cells.every((cell) => right.cells.includes(cell));

const sameMask = (left: MaskCarrier, right: MaskCarrier): boolean =>
  subset(left, right) && subset(right, left);

const meetMask = (left: MaskCarrier, right: MaskCarrier): MaskCarrier =>
  asCustomMask(left.cells.filter((cell) => right.cells.includes(cell)));

const unionMask = (left: MaskCarrier, right: MaskCarrier): MaskCarrier =>
  asCustomMask([...left.cells, ...right.cells]);

const coefficientAt = (value: CochainCarrier, cell: string): number =>
  value.coefficients.find((entry) => entry.cell === cell)?.coefficient ?? 0;

const sameCochain = (cells: readonly string[], left: CochainCarrier, right: CochainCarrier): boolean =>
  cells.every((cell) => coefficientAt(left, cell) === coefficientAt(right, cell));

const zeroCochain = cochain([]);

const cellsOf = (valuation: readonly ChargedCell[]): readonly string[] =>
  Object.freeze(valuation.map((entry) => entry.cell));

const normalizeValueName = (charge: string): ChargeValueName => asChargeValueName(charge);

export function negateChargeName(value: ChargeValueName): ChargeValueName {
  return chargeValueName(negateValue(chargeValue(value)));
}

export function negateValuation(valuation: readonly ChargedCell[]): readonly ChargedCell[] {
  return Object.freeze(valuation.map((entry) =>
    chargedCell(entry.cell, negateChargeName(normalizeValueName(entry.charge)))));
}

/** Negative-designated mask: dNeg = DFrame.dF = {f, top}. */
export function dNeg(valuation: readonly ChargedCell[]): MaskCarrier {
  return asCustomMask(dFrameFalseMask(valuation).elements);
}

/** F-only mask: cells whose settled charge is f. */
export function dFonly(valuation: readonly ChargedCell[]): MaskCarrier {
  return asCustomMask(valuation
    .filter((entry) => entry.charge === "active")
    .map((entry) => entry.cell));
}

export const restrictNeg = (valuation: readonly ChargedCell[], value: CochainCarrier): CochainCarrier =>
  restrict(dNeg(valuation), value);

export const projF = (valuation: readonly ChargedCell[], value: CochainCarrier): CochainCarrier =>
  restrict(dFonly(valuation), value);

export const projTopNeg = (valuation: readonly ChargedCell[], value: CochainCarrier): CochainCarrier =>
  restrict(dTop(valuation), value);

export const isSection = (valuation: readonly ChargedCell[], value: CochainCarrier): boolean =>
  vanishesOff(dNeg(valuation), value, cellsOf(valuation));

const sampleCochains = (cells: readonly string[]): readonly CochainCarrier[] => {
  const values = [-1, 0, 1] as const;
  let samples: readonly CochainCarrier[] = Object.freeze([cochain([])]);
  for (const cell of cells) {
    samples = Object.freeze(samples.flatMap((existing) =>
      values.map((coefficient) => cochain([...existing.coefficients, { cell, coefficient } satisfies CochainEntry]))));
  }
  return samples;
};

export function negationMirrorReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
): NegationMirrorReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const negatedValuation = negateValuation(valuation);
  const negativeMask = dNeg(valuation);
  const positiveMaskOfNegated = dK(negatedValuation);
  const falseOnly = dFonly(valuation);
  const truthOnlyOfNegated = dT(negatedValuation);
  const top = dTop(valuation);
  const topOfNegated = dTop(negatedValuation);
  const roundTrip = negateValuation(negatedValuation);
  const dNegEqualsDkOfNegation = sameMask(negativeMask, positiveMaskOfNegated);
  const dFonlyEqualsDtOfNegation = sameMask(falseOnly, truthOnlyOfNegated);
  const topSeamFixed = sameMask(top, topOfNegated);
  const negationInvolutive = valuation.every((entry) =>
    roundTrip.some((candidate) => candidate.cell === entry.cell && candidate.charge === entry.charge));

  if (!dNegEqualsDkOfNegation || !dFonlyEqualsDtOfNegation || !topSeamFixed || !negationInvolutive) {
    throw new TypeError("negationMirrorReceipt: negative sheaf mirror laws failed");
  }

  return Object.freeze({
    kind: "negativeParaconsistentSheaf.negationMirror:witness" as const,
    valuation,
    negatedValuation,
    dNeg: negativeMask,
    dKOfNegated: positiveMaskOfNegated,
    dFonly: falseOnly,
    dTOfNegated: truthOnlyOfNegated,
    dTop: top,
    dTopOfNegated: topOfNegated,
    dNegEqualsDkOfNegation: true as const,
    dFonlyEqualsDtOfNegation: true as const,
    topSeamFixed: true as const,
    negationInvolutive: true as const,
    chargeMirrorTable: Object.freeze({
      absurd: negateChargeName("absurd"),
      potential: negateChargeName("potential"),
      active: negateChargeName("active"),
      stable: negateChargeName("stable"),
    }),
  });
}

export function negativeSplitReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: CochainCarrier = cochain([
    { cell: "truth-cell", coefficient: 0 },
    { cell: "both-cell", coefficient: 5 },
    { cell: "false-cell", coefficient: -2 },
    { cell: "empty-cell", coefficient: 0 },
  ]),
): NegativeSplitReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = cellsOf(valuation);
  const negativeMask = dNeg(valuation);
  const falseOnly = dFonly(valuation);
  const top = dTop(valuation);
  const positiveMask = dK(valuation);
  const fPart = projF(valuation, value);
  const topPart = projTopNeg(valuation, value);
  const reconstructed = combine(fPart, topPart);
  const samples = sampleCochains(cells);
  const supportedSamples = samples.filter((sample) => vanishesOff(negativeMask, sample, cells));

  const dFonlyDisjointDTop = falseOnly.cells.every((cell) => !top.cells.includes(cell));
  const dNegEqualsUnion = sameMask(negativeMask, unionMask(falseOnly, top));
  const dFonlyIncludedInDNeg = subset(falseOnly, negativeMask);
  const dTopIncludedInDNeg = subset(top, negativeMask);
  const dTopIncludedInDK = subset(top, positiveMask);
  const splitReconstructs = supportedSamples.every((sample) =>
    sameCochain(cells, combine(projF(valuation, sample), projTopNeg(valuation, sample)), sample));
  const splitUniqueOnSample = supportedSamples.every((left) => supportedSamples.every((right) => {
    const sameParts = sameCochain(cells, projF(valuation, left), projF(valuation, right))
      && sameCochain(cells, projTopNeg(valuation, left), projTopNeg(valuation, right));
    return !sameParts || sameCochain(cells, left, right);
  }));

  if (!dFonlyDisjointDTop || !dNegEqualsUnion || !dFonlyIncludedInDNeg || !dTopIncludedInDNeg
    || !dTopIncludedInDK || !splitReconstructs || !splitUniqueOnSample) {
    throw new TypeError("negativeSplitReceipt: negative split laws failed");
  }

  return Object.freeze({
    kind: "negativeParaconsistentSheaf.split:witness" as const,
    valuation,
    dNeg: negativeMask,
    dFonly: falseOnly,
    dTop: top,
    cochain: value,
    fPart,
    topPart,
    reconstructed,
    dFonlyDisjointDTop: true as const,
    dNegEqualsUnion: true as const,
    dFonlyIncludedInDNeg: true as const,
    dTopIncludedInDNeg: true as const,
    dTopIncludedInDK: true as const,
    splitReconstructs: true as const,
    splitUniqueOnSample: true as const,
    sampleSize: supportedSamples.length,
  });
}

export function negativeRestrictionReceipt(
  valuationInput: readonly ChargedCell[] = defaultValuation,
  value: CochainCarrier = defaultCochain,
): NegativeRestrictionReceipt {
  const valuation = Object.freeze([...valuationInput]);
  const cells = cellsOf(valuation);
  const negativeMask = dNeg(valuation);
  const restricted = restrictNeg(valuation, value);
  const fullMask = asCustomMask(cells);
  const fullRestrictionIdentity = sameCochain(cells, restrict(fullMask, value), value);
  const restrictedVanishesOffDNeg = vanishesOff(negativeMask, restricted, cells);
  const restrictionComposesByMeet = sameCochain(
    cells,
    restrict(dTop(valuation), restrict(negativeMask, value)),
    restrict(meetMask(dTop(valuation), negativeMask), value),
  );

  if (!restrictedVanishesOffDNeg || !fullRestrictionIdentity || !restrictionComposesByMeet) {
    throw new TypeError("negativeRestrictionReceipt: negative restriction laws failed");
  }

  return Object.freeze({
    kind: "negativeParaconsistentSheaf.restriction:witness" as const,
    valuation,
    cochain: value,
    dNeg: negativeMask,
    restricted,
    restrictedVanishesOffDNeg: true as const,
    fullRestrictionIdentity: true as const,
    restrictionComposesByMeet: true as const,
  });
}

export function receipt(): NegativeParaconsistentSheafReceipt {
  const valuation = defaultValuation;
  return Object.freeze({
    kind: "negativeParaconsistentSheaf.receipt:witness" as const,
    mirror: negationMirrorReceipt(valuation),
    split: negativeSplitReceipt(valuation),
    restriction: negativeRestrictionReceipt(valuation),
    supportReading: Object.freeze({
      absurd: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
      potential: Object.freeze({ dNeg: false, dFonly: false, dTop: false }),
      active: Object.freeze({ dNeg: true, dFonly: true, dTop: false }),
      stable: Object.freeze({ dNeg: true, dFonly: false, dTop: true }),
    }),
    openFrontier: Object.freeze([
      "The runtime receipt models finite negative masks and bounded cochain sample laws; Lean proves the mask equalities and split generally.",
      "Negation mirror parity is charge-name and finite-cell parity, not arbitrary sheaf equivalence over every cover.",
      "General Cech gluing, CALM equivalence, and non-finite paraconsistent sheaf cohomology remain proof/kernel obligations.",
    ]),
  });
}

export { zeroCochain };
